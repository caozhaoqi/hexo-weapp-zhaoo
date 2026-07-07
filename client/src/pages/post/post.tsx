import { useState, useEffect, useMemo, useCallback, useContext } from 'react';
import Taro, {
  getCurrentInstance,
  useShareTimeline,
  useShareAppMessage,
} from '@tarojs/taro';
import { View, Image, Text } from '@tarojs/components';
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

const processHtml = (data: string): { processedHtml: string; imagesArray: string[] } => {
  if (!data) return { processedHtml: '', imagesArray: [] };

  const imagesArray: string[] = [];
  let html = data;

  html = html.replace(
    /<img([^>]*)src="([^"]*)"([^>]*)>/gim,
    (match, attrBegin, src: string, attrEnd) => {
      const fullUrl = getImageUrl(src);
      imagesArray.push(fullUrl);
      return `<img ${attrBegin} src='${fullUrl}' mode='widthFix' lazy-load ${attrEnd}>`;
    }
  );

  html = html.replace(
    /<a([^>]*)href="([^"]*)"([^>]*)>/gim,
    (match, attrBegin, href: string, attrEnd) => {
      return `<a ${attrBegin} href='${href}' ${attrEnd}>`;
    }
  );

  html = html.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '');
  html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  html = html.replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '');
  html = html.replace(/<canvas[^>]*>[\s\S]*?<\/canvas>/gi, '');

  const figureRegex = /<figure\s+class="highlight[^"]*">[\s\S]*?<\/figure>/gi;
  html = html.replace(figureRegex, (match) => {
    const langMatch = match.match(/class="highlight\s+(\w+)"/);
    const lang = langMatch ? langMatch[1] : 'text';
    
    const codeMatch = match.match(/<td\s+class="code">[\s\S]*?<pre>([\s\S]*?)<\/pre>[\s\S]*?<\/td>/i);
    if (codeMatch && codeMatch[1]) {
      let codeContent = codeMatch[1];
      codeContent = codeContent
        .replace(/<span[^>]*>/gi, '')
        .replace(/<\/span>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
      return `<pre><code class="language-${lang}">${codeContent}</code></pre>`;
    }
    
    const preMatch = match.match(/<pre>([\s\S]*?)<\/pre>/i);
    if (preMatch && preMatch[1]) {
      let codeContent = preMatch[1];
      codeContent = codeContent
        .replace(/<span[^>]*>/gi, '')
        .replace(/<\/span>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
      return `<pre><code class="language-${lang}">${codeContent}</code></pre>`;
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

const Post = () => {
  const [post, setPost] = useState<IPostItem>({} as IPostItem);
  const [status, setStatus] = useState<string>('loading');
  const [images, setImages] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [content, setContent] = useState<string>('');
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
    const data = await getPostBySlug(slug);
    if (data) {
      const { more, title } = data;
      Taro.setNavigationBarTitle({ title });
      const { processedHtml, imagesArray } = processHtml(more);
      data.more = processedHtml;
      setImages(imagesArray);
      setContent(processedHtml);
      setPost(data);
      setStatus('ready');
      setHistoryStorage(data);
    }
  }, [slug]);

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
              </View>
            </View>
          </View>
          <View className='content'>
            <mp-html
              content={content}
              preview-img={true}
              selectable={true}
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
        </View>
      ) : null}
      <Donate visible={modalVisible} setVisible={setModalVisible} />
    </>
  );
};

export default Post;