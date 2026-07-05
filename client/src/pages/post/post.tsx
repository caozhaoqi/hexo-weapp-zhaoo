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

const Post = () => {
  const [post, setPost] = useState<IPostItem>({} as IPostItem);
  const [status, setStatus] = useState<string>('loading');
  const [images, setImages] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [htmlChunks, setHtmlChunks] = useState<string[]>([]);
  const [slug] = useState<string>(
    getCurrentInstance().router?.params.slug || ''
  );
  const CHUNK_SIZE = 5000;

  useEffect(() => {
    fetchPost();
  }, []);

  useShareTimeline(() => {
    return {
      title: post.title || '文章分享',
      imageUrl: post.cover || '',
    };
  });

  useShareAppMessage(() => {
    return {
      title: post.title || '文章分享',
      imageUrl: post.cover || '',
    };
  });

  const fetchPost = async () => {
    const data = await getPostBySlug(slug);
    if (data) {
      const { more, title } = data;
      Taro.setNavigationBarTitle({ title });
      const { html, imagesArray } = replaceHTML(more);
      data.more = html;
      setImages(imagesArray);
      setPost(data);
      setStatus('ready');
      setHistoryStorage(data);
      splitHtmlIntoChunks(html);
    }
  };

  const splitHtmlIntoChunks = (html: string) => {
    if (!html) return;
    const chunks: string[] = [];
    for (let i = 0; i < html.length; i += CHUNK_SIZE) {
      let end = i + CHUNK_SIZE;
      if (end < html.length) {
        const lastTagStart = html.lastIndexOf('<', end);
        const lastTagEnd = html.lastIndexOf('>', end);
        if (lastTagStart > lastTagEnd) {
          end = html.indexOf('>', lastTagStart) + 1;
        }
      }
      chunks.push(html.slice(i, end));
      i = end - 1;
    }
    console.log('[post] HTML分段完成, 共', chunks.length, '段');
    setHtmlChunks(chunks);
  };

  const getImageUrl = (src: string): string => {
    if (!src) return '';
    const decodedSrc = decodeURIComponent(src);
    if (decodedSrc.startsWith('http://') || decodedSrc.startsWith('https://')) {
      if (decodedSrc.includes('czq-blog.oss-cn-beijing.aliyuncs.com')) {
        const cleanUrl = decodedSrc.split('?')[0];
        console.log('[post] OSS签名URL已清理:', cleanUrl);
        return cleanUrl;
      }
      return decodedSrc;
    }
    const baseHost = config.baseUrl.replace('/api', '');
    return baseHost + decodedSrc;
  };

  const replaceHTML = (data: string): { html: string; imagesArray: string[] } => {
    if (!data) return { html: '', imagesArray: [] };
    
    console.log('[post] 开始处理HTML内容, 原始长度:', data.length);
    
    const imagesArray: string[] = [];
    
    let html = data.replace(
      /<img([^>]*)src="([^"]*)"([^>]*)>/gim,
      (match, attrBegin, src: string, attrEnd) => {
        const fullUrl = getImageUrl(src);
        imagesArray.push(fullUrl);
        return `<img ${attrBegin} src='${fullUrl}' mode='widthFix' id='image_${fullUrl}' lazy-load ${attrEnd}>`;
      }
    );
    
    html = html.replace(
      /<a([^>]*)href="([^"]*)"([^>]*)>/gim,
      (match, attrBegin, href: string, attrEnd) => {
        return `<a ${attrBegin} id='link_${href}' ${attrEnd}>`;
      }
    );
    
    html = html.replace(
      /<figure class="highlight ([^"]*)">([\s\S]*?)<\/figure>/gim,
      (match, lang, content) => {
        const cleanContent = content
          .replace(/<td class="gutter">[\s\S]*?<\/td>/gi, '')
          .replace(/<table[^>]*>/gi, '')
          .replace(/<\/table>/gi, '')
          .replace(/<tr[^>]*>/gi, '')
          .replace(/<\/tr>/gi, '')
          .replace(/<td class="code">/gi, '')
          .replace(/<\/td>/gi, '')
          .replace(/<span class="line">/gi, '')
          .replace(/<\/span>/gi, '')
          .trim();
        
        return `<pre class="language-${lang || 'plain'}">${cleanContent}</pre>`;
      }
    );
    
    html = html.replace(/<br\s*\/?>/gi, '\n');
    
    console.log('[post] HTML处理完成, 图片数量:', imagesArray.length);
    
    return { html, imagesArray };
  };

  // 存储历史文章
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

  const handleClick = (e) => {
    // 图片模态框
    const imageMatch = e.target.id.match(/(?<=image_).*/gi);
    const linkMatch = e.target.id.match(/(?<=link_).*/gi);
    if (imageMatch) {
      Taro.previewImage({
        current: imageMatch[0],
        urls: images,
      });
    } else if (linkMatch) {
      Taro.setClipboardData({
        data: linkMatch[0],
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
            {post.cover ? (
              <Image
                src={getImageUrl(post.cover)}
                lazyLoad
                className='cover'
                mode='aspectFill'
              />
            ) : null}
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
          {htmlChunks.length > 0 ? (
            <View className='content'>
              {htmlChunks.map((chunk, index) => (
                <View
                  key={index}
                  dangerouslySetInnerHTML={{ __html: chunk }}
                  onClick={(e) => handleClick(e)}
                />
              ))}
            </View>
          ) : null}
          {post.realPath ? <Comment url={post.realPath} /> : null}
          <Fab post={post} />
        </View>
      ) : null}
      <Donate visible={modalVisible} setVisible={setModalVisible} />
    </>
  );
};

export default Post;
