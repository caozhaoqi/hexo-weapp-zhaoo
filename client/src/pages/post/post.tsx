import { useState, useEffect, useMemo, useCallback, useContext, useRef } from 'react';
import Taro, {
  getCurrentInstance,
  useShareTimeline,
  useShareAppMessage,
} from '@tarojs/taro';
import { View, Image, Text, ScrollView } from '@tarojs/components';
import { formateDate } from '@/utils/index';
import { getPostBySlug } from '@/apis/api';
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
  const htmlRef = useRef<{ navigateTo: (id: string, offset?: number) => Promise<void> } | null>(null);

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
    }
  }, [slug]);

  const handleTocClick = (id: string) => {
    setShowToc(false);
    console.log('[目录] 点击目录项:', id);
    
    if (htmlRef.current) {
      htmlRef.current.navigateTo(id, 100).then(() => {
        console.log('[目录] 滚动成功');
      }).catch((err) => {
        console.warn('[目录] mp-html滚动失败:', err);
        fallbackScrollTo(id);
      });
    } else {
      fallbackScrollTo(id);
    }
  };
  
  const fallbackScrollTo = (id: string) => {
    Taro.pageScrollTo({
      selector: `#${id}`,
      duration: 300,
    });
  };

  const coverUrl = useMemo(() => getImageUrl(post.cover), [post.cover]);

  const handleLinkTap = (e) => {
    const href = e.detail.src;
    if (href) {
      Taro.navigateTo({
        url: `/pages/webview/webview?url=${encodeURIComponent(href)}`,
      });
    }
  };

  return (
    <>
      {status === 'loading' ? <Loading /> : null}
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
              // ref={htmlRef}
              content={content}
              preview-img={true}
              selectable={true}
              use-anchor={100}
              tag-style={{
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
              }}
              plugins={['highlight']}
              onLinkTap={handleLinkTap}
            />
          </View>
          <Fab post={post} />
          {/* {toc.length > 0 && (
            <View className='toc-btn' onClick={() => setShowToc(true)}>
              <Icon name='iconlist' size={24} />
            </View>
          )} */}
        </View>
      ) : null}
      {/* <Donate visible={modalVisible} setVisible={setModalVisible} /> */}
      
      {/* {showToc && (
        <View className='toc-modal'>
          <View className='toc-modal-mask' onClick={() => setShowToc(false)} />
          <View className='toc-content'>
            <View className='toc-header'>
              <Text className='toc-title'>文章目录</Text>
              <View className='toc-close' onClick={() => setShowToc(false)}>
                <Icon name='iconclose' size={24} />
              </View>
            </View>
            <ScrollView className='toc-list' scrollY>
              <View className='toc-list-inner'>
                {toc.map((item, index) => (
                  <View
                    key={index}
                    className={`toc-item level-${item.level}`}
                    onClick={() => handleTocClick(item.id)}
                  >
                    <Text>{item.text}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      )} */}
    </>
  );
};

export default Post;