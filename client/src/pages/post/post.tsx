import { useState, useEffect, useMemo, useCallback, useContext, useRef } from 'react';
import Taro, {
  getCurrentInstance,
  useShareTimeline,
  useShareAppMessage,
} from '@tarojs/taro';
import { View, Image, Text, ScrollView } from '@tarojs/components';
import { formateDate } from '@/utils/index';
import { getPostBySlug } from '@/apis/api';
import { prefetch } from '@/apis/request';
import { getStorageSync, setStorageSync } from '@/utils/storage';
import Icon from '@/components/icon';
import Loading from '@/components/loading';
import Leancloud from '@/components/leancloud';
import Donate from '@/components/donate';
import ImmersiveTitlebar from '@/components/immersive-titlebar';
import Fab from '@/components/fab';
import { IPostItem } from '@/types/post';
import { useTheme } from '@/contexts/theme';
import config from '../../../config.json';
import './post.scss';

const DEFAULT_COVER = '/assets/images/logo.png';

const getImageUrl = (src: string): string => {
  if (!src) return DEFAULT_COVER;
  const decodedSrc = decodeURIComponent(src);
  if (decodedSrc.startsWith('http://') || decodedSrc.startsWith('https://')) {
    if (decodedSrc.includes('czq-blog.oss-cn-beijing.aliyuncs.com')) {
      const cleanUrl = decodedSrc.split('?')[0];
      return cleanUrl;
    }
    return decodedSrc;
  }
  const baseHost = config.baseUrl.replace('/api', '');
  const normalizedSrc = decodedSrc.startsWith('/') ? decodedSrc : `/${decodedSrc}`;
  return baseHost + normalizedSrc;
};

const IMG_TAG_REGEX = /<img([^>]*)src="([^"]*)"([^>]*)>/gim;
const A_TAG_REGEX = /<a([^>]*)href="([^"]*)"([^>]*)>/gim;
const DANGEROUS_TAGS_REGEXES = [
  /<iframe[^>]*>[\s\S]*?<\/iframe>/gi,
  /<script[^>]*>[\s\S]*?<\/script>/gi,
  /<style[^>]*>[\s\S]*?<\/style>/gi,
  /<svg[^>]*>[\s\S]*?<\/svg>/gi,
  /<canvas[^>]*>[\s\S]*?<\/canvas>/gi,
];
const FIGURE_REGEX = /<figure\s+class="highlight[^"]*">[\s\S]*?<\/figure>/gi;
const SPAN_REGEX = /<\/?span[^>]*>/gi;
const BR_REGEX = /<br\s*\/?>/gi;

const decodeHtmlEntities = (str: string): string => {
  return str.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
};

const cleanCodeContent = (content: string): string => {
  return decodeHtmlEntities(content.replace(SPAN_REGEX, '').replace(BR_REGEX, '\n'));
};

const processHtml = (data: string): { processedHtml: string; imagesArray: string[] } => {
  if (!data) return { processedHtml: '', imagesArray: [] };

  const imagesArray: string[] = [];
  let html = data;

  html = html.replace(IMG_TAG_REGEX, (_, attrBegin, src: string, attrEnd) => {
    const fullUrl = getImageUrl(src);
    imagesArray.push(fullUrl);
    return `<img ${attrBegin} src='${fullUrl}' mode='widthFix' lazy-load ${attrEnd}>`;
  });

  html = html.replace(A_TAG_REGEX, (_, attrBegin, href: string, attrEnd) => {
    return `<a ${attrBegin} href='${href}' ${attrEnd}>`;
  });

  for (const regex of DANGEROUS_TAGS_REGEXES) {
    html = html.replace(regex, '');
  }

  html = html.replace(FIGURE_REGEX, (match) => {
    const langMatch = match.match(/class="highlight\s+(\w+)"/);
    const lang = langMatch ? langMatch[1] : 'text';
    
    const codeMatch = match.match(/<td\s+class="code">[\s\S]*?<pre>([\s\S]*?)<\/pre>[\s\S]*?<\/td>/i);
    if (codeMatch && codeMatch[1]) {
      return `<pre><code class="language-${lang}">${cleanCodeContent(codeMatch[1])}</code></pre>`;
    }
    
    const preMatch = match.match(/<pre>([\s\S]*?)<\/pre>/i);
    if (preMatch && preMatch[1]) {
      return `<pre><code class="language-${lang}">${cleanCodeContent(preMatch[1])}</code></pre>`;
    }
    
    return match;
  });

  return { processedHtml: html, imagesArray };
};

const setHistoryStorage = (data: IPostItem) => {
  const key = 'history';
  const arr = getStorageSync(key) || [];
  const filteredArr = arr.filter((item: IPostItem) => item.slug !== data.slug);
  filteredArr.push(data);
  setStorageSync(key, filteredArr);
};

interface TocItem {
  id: string;
  text: string;
  level: number;
}

const generateToc = (html: string): TocItem[] => {
  const toc: TocItem[] = [];
  const headingRegex = /<h([1-6])[^>]*>([^<]+)<\/h[1-6]>/gi;
  let match;
  let index = 0;
  
  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1]);
    const text = match[2].trim();
    const id = `heading-${index++}`;
    
    toc.push({ id, text, level });
  }
  
  return toc;
};

const processHtmlWithToc = (html: string, toc: TocItem[]): string => {
  let result = html;
  const headingRegex = /<h([1-6])([^>]*)>([^<]+)<\/h[1-6]>/gi;
  let index = 0;
  
  result = result.replace(headingRegex, (match, level, attrs, text) => {
    if (index < toc.length) {
      const id = toc[index].id;
      index++;
      return `<h${level}${attrs} id="${id}">${text}</h${level}>`;
    }
    return match;
  });
  
  return result;
};

const countWords = (html: string): number => {
  const text = html.replace(/<[^>]+>/g, '').replace(/\s+/g, '');
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
  return chineseChars + englishWords;
};

const estimateReadingTime = (wordCount: number): number => {
  const wordsPerMinute = 400;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
};

const Post = () => {
  const [post, setPost] = useState<IPostItem>({} as IPostItem);
  const [status, setStatus] = useState<string>('loading');
  const [images, setImages] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [content, setContent] = useState<string>('');
  const [toc, setToc] = useState<TocItem[]>([]);
  const [showToc, setShowToc] = useState<boolean>(false);
  const [wordCount, setWordCount] = useState<number>(0);
  const [readingTime, setReadingTime] = useState<number>(0);
  const [slug] = useState<string>(
    getCurrentInstance().router?.params.slug || ''
  );
  const { theme } = useTheme();
  useEffect(() => {
    fetchPost();
  }, []);

  useShareTimeline(() => {
    return {
      title: post.title || '文章分享',
      imageUrl: post.cover || DEFAULT_COVER,
    };
  });

  useShareAppMessage(() => {
    return {
      title: post.title || '文章分享',
      path: `/pages/post/post?slug=${slug}`,
      imageUrl: post.cover || DEFAULT_COVER,
      webpageUrl: '',
      userName: '',
      imagePath: '',
      withShareTicket: false,
      miniprogramType: 0,
      scene: 0,
    };
  });

  const fetchPost = useCallback(async () => {
    if (!slug) return;
    try {
      const data = await getPostBySlug(slug);
      if (data) {
        const { more, title } = data;
        Taro.setNavigationBarTitle({ title });
        const { processedHtml, imagesArray } = processHtml(more);
        const generatedToc = generateToc(processedHtml);
        const htmlWithToc = processHtmlWithToc(processedHtml, generatedToc);
        const words = countWords(htmlWithToc);

        data.more = htmlWithToc;
        setImages(imagesArray);
        setContent(htmlWithToc);
        setToc(generatedToc);
        setWordCount(words);
        setReadingTime(estimateReadingTime(words));
        setPost(data);
        setStatus('ready');
        setHistoryStorage(data);

        // ===== 预取相关文章 =====
        // 从浏览历史中找下一篇未读文章预取，用户读完当前文章后可秒开下一篇
        try {
          const history = getStorageSync('history') || [];
          // 找出与当前文章不同、且 slug 不同于已缓存的文章
          const nextPost = history.find((item: IPostItem) => item.slug && item.slug !== slug);
          if (nextPost && nextPost.slug) {
            prefetch(`/articles/${nextPost.slug}.json`, `post_${nextPost.slug}_cache`, 60 * 60 * 1000).catch(() => {});
          }
        } catch {
          // 预取失败不影响当前文章
        }
      } else {
        setStatus('error');
      }
    } catch (e) {
      console.error('[文章] 获取失败:', e);
      setStatus('error');
    }
  }, [slug]);

  const handleTocClick = (id: string) => {
    setShowToc(false);
    fallbackScrollTo(id);
  };
  
  const fallbackScrollTo = (id: string) => {
    Taro.pageScrollTo({
      selector: `#${id}`,
      duration: 300,
    });
  };

  const coverUrl = useMemo(() => getImageUrl(post.cover), [post.cover]);

  // 缓存 tag-style 对象，避免每次渲染都创建新对象
  const tagStyle = useMemo(() => ({
    p: 'margin-bottom: 16rpx; line-height: 1.8;',
    h1: 'font-size: 36rpx; font-weight: bold; margin-top: 32rpx; margin-bottom: 16rpx;',
    h2: 'font-size: 32rpx; font-weight: bold; margin-top: 28rpx; margin-bottom: 14rpx;',
    h3: 'font-size: 28rpx; font-weight: bold; margin-top: 24rpx; margin-bottom: 12rpx;',
    ul: 'margin-bottom: 16rpx; padding-left: 32rpx;',
    ol: 'margin-bottom: 16rpx; padding-left: 32rpx;',
    li: 'line-height: 1.8; margin-bottom: 8rpx;',
    blockquote: 'border-left: 6rpx solid #ff3b00; padding-left: 20rpx; margin-bottom: 16rpx; color: #666;',
    code: theme === 'dark' ? 'background: #333; padding: 4rpx 8rpx; border-radius: 4rpx; font-family: monospace; color: #ccc;' : 'background: #f4f4f4; padding: 4rpx 8rpx; border-radius: 4rpx; font-family: monospace;',
    pre: theme === 'dark' ? 'background: #2d2d2d; padding: 24rpx; border-radius: 8rpx; margin-bottom: 16rpx; overflow-x: auto; color: #ccc; font-family: monospace;' : 'background: #f8f8f8; padding: 24rpx; border-radius: 8rpx; margin-bottom: 16rpx; overflow-x: auto; font-family: monospace;',
  }), [theme]);

  // 缓存 plugins 数组
  const plugins = useMemo(() => ['highlight'], []);

  // 稳定的链接点击回调，避免每次渲染重建导致 mp-html 内部更新
  const handleLinkTap = useCallback((e) => {
    const href = e.detail.src;
    if (href) {
      Taro.navigateTo({
        url: `/pages/extra/webview/webview?url=${encodeURIComponent(href)}`,
      });
    }
  }, []);

  // 稳定的错误重试回调
  const handleRetry = useCallback(() => {
    setStatus('loading');
    fetchPost();
  }, [fetchPost]);

  return (
    <>
      {status === 'loading' ? <Loading /> : null}
      {status === 'error' ? (
        <View className='post-error'>
          <Text className='error-icon'>😿</Text>
          <Text className='error-text'>文章加载失败</Text>
          <Text className='error-hint'>请检查网络后重试</Text>
          <View className='error-retry' onClick={handleRetry}>
            <Text>重新加载</Text>
          </View>
        </View>
      ) : null}
      {status === 'ready' ? (
        <View className='post'>
          <ImmersiveTitlebar title={post.title || ''} />
          <View className='head'>
            <Image
              src={coverUrl}
              lazyLoad
              className='cover'
              mode='aspectFill'
            />
            <View className='mask'>
              <Text className='title'>{post.title}</Text>
              <View className='info'>
                <View className='info-item'>
                  <Icon name='iconcalendar' style={{ marginRight: 5 }} />
                  <Text>{formateDate(post.date)}</Text>
                </View>
                <View className='info-item'>
                  <Icon name='iconeye' style={{ marginRight: 5 }} />
                  {post.realPath ? (
                    <Leancloud path={post.realPath} model='Counter' />
                  ) : null}
                </View>
                <View className='info-item'>
                  <Icon name='iconmessage' style={{ marginRight: 5 }} />
                  {post.realPath ? (
                    <Leancloud
                      path={post.realPath}
                      model='Comment'
                      exp={false}
                      field='url'
                    />
                  ) : null}
                </View>
                <View className='info-item'>
                  <Icon name='iconheart' style={{ marginRight: 5 }} />
                  {post.realPath ? (
                    <Leancloud
                      path={post.realPath}
                      model='Like'
                      field='path'
                      exp={false}
                    />
                  ) : null}
                </View>
                <View className='info-item'>
                  <Icon name='iconeye' style={{ marginRight: 5 }} />
                  <Text>{wordCount}字</Text>
                </View>
                <View className='info-item'>
                  <Icon name='icontime' style={{ marginRight: 5 }} />
                  <Text>{readingTime}分钟阅读</Text>
                </View>
              </View>
            </View>
          </View>
          <View className='content'>
            <mp-html
              content={content}
              preview-img={true}
              selectable={true}
              use-anchor={100}
              tag-style={tagStyle}
              plugins={plugins}
              onLinkTap={handleLinkTap}
            />
          </View>
          <Fab post={post} />
         
        </View>
      ) : null}
    </>
  );
};

export default Post;