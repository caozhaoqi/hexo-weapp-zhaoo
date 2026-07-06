import { useState, useEffect } from 'react';
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
import Comment from '@/components/comment';
import Donate from '@/components/donate';
import ImmersiveTitlebar from '@/components/immersive-titlebar';
import Fab from '@/components/fab';
import { IPostItem } from '@/types/post';
import config from '../../../config.json';
import './post.scss';

const DEFAULT_COVER = '/assets/images/logo.png';

const Post = () => {
  const [post, setPost] = useState<IPostItem>({} as IPostItem);
  const [status, setStatus] = useState<string>('loading');
  const [images, setImages] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [content, setContent] = useState<string>('');
  const [slug] = useState<string>(
    getCurrentInstance().router?.params.slug || ''
  );

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

  const fetchPost = async () => {
    const data = await getPostBySlug(slug);
    if (data) {
      const { more, title } = data;
      Taro.setNavigationBarTitle({ title });
      const { processedHtml, imagesArray } = processHtml(more);
      data.more = more;
      setImages(imagesArray);
      setContent(processedHtml);
      setPost(data);
      setStatus('ready');
      setHistoryStorage(data);
    }
  };

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
    return baseHost + decodedSrc;
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

    html = html.replace(
      /<figure\s+class="highlight\s+([^"]*)">[\s\S]*?<td\s+class="code">[\s\S]*?<pre>([\s\S]*?)<\/pre>[\s\S]*?<\/figure>/gi,
      (match, lang, codeContent) => {
        const cleanCode = codeContent
          .replace(/<span\s+class="line">/gi, '')
          .replace(/<\/span>/gi, '')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&');
        return `<pre><code class="language-${lang}">${cleanCode}</code></pre>`;
      }
    );

    return { processedHtml: html, imagesArray };
  };

  const setHistoryStorage = (data) => {
    const key = 'history';
    const arr = getStorageSync(key) || [];
    arr.forEach((item, index) => {
      if (data.slug === item.slug) {
        arr.splice(index, 1);
      }
    });
    arr.push(data);
    setStorageSync(key, arr);
  };

  const handleLinkTap = (e) => {
    const href = e.detail.src;
    if (href) {
      Taro.setClipboardData({
        data: href,
      });
      Taro.showToast({
        title: '链接已复制',
        icon: 'none',
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
              src={getImageUrl(post.cover)}
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
              copy-link={true}
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
                code: 'background: #f4f4f4; padding: 4rpx 8rpx; border-radius: 4rpx; font-family: monospace;',
                pre: 'background: #1e1e1e; padding: 24rpx; border-radius: 8rpx; margin-bottom: 16rpx; overflow-x: auto;',
              }}
              onLinkTap={handleLinkTap}
            />
          </View>
          {post.realPath ? <Comment url={post.realPath} /> : null}
          <Fab post={post} />
        </View>
      ) : null}
      <Donate visible={modalVisible} setVisible={setModalVisible} />
    </>
  );
};

export default Post;