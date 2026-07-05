import { useState, useEffect } from 'react';
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
  const [renderItems, setRenderItems] = useState<{ type: 'text' | 'code'; content: string; lang?: string; lines?: { text: string; spans: { text: string; color?: string }[] }[] }[]>([]);
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
      const { items, imagesArray } = parseHTML(more);
      data.more = more;
      setImages(imagesArray);
      setPost(data);
      setStatus('ready');
      setHistoryStorage(data);
      setRenderItems(items);
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

  const decodeHtmlEntities = (str: string): string => {
    let result = str;
    result = result.replace(/&#123;/g, '{');
    result = result.replace(/&#125;/g, '}');
    result = result.replace(/&#61;/g, '=');
    result = result.replace(/&#38;/g, '&');
    result = result.replace(/&#39;/g, "'");
    result = result.replace(/&#34;/g, '"');
    result = result.replace(/&#60;/g, '<');
    result = result.replace(/&#62;/g, '>');
    result = result.replace(/&#47;/g, '/');
    result = result.replace(/&#96;/g, '`');
    result = result.replace(/&#x27;/gi, "'");
    result = result.replace(/&#x3D;/gi, '=');
    result = result.replace(/&#x2F;/gi, '/');
    result = result.replace(/&#x60;/gi, '`');
    result = result.replace(/&#x3C;/gi, '<');
    result = result.replace(/&#x3E;/gi, '>');
    result = result.replace(/&lt;/gi, '<');
    result = result.replace(/&gt;/gi, '>');
    result = result.replace(/&nbsp;/gi, ' ');
    result = result.replace(/&amp;/gi, '&');
    result = result.replace(/&quot;/gi, '"');
    return result;
  };

  const parseHTML = (data: string): { items: { type: 'text' | 'code'; content: string; lang?: string; lines?: { text: string; spans: { text: string; color?: string }[] }[] }[]; imagesArray: string[] } => {
    if (!data) return { items: [], imagesArray: [] };
    
    const imagesArray: string[] = [];
    const items: { type: 'text' | 'code'; content: string; lang?: string; lines?: { text: string; spans: { text: string; color?: string }[] }[] }[] = [];
    
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
    
    html = html.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '');
    html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    html = html.replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '');
    html = html.replace(/<canvas[^>]*>[\s\S]*?<\/canvas>/gi, '');
    
    const codeBlockRegex = /<figure class="highlight ([^"]*)">([\s\S]*?)<\/figure>/gim;
    let lastIndex = 0;
    let match;
    
    while ((match = codeBlockRegex.exec(html)) !== null) {
      if (match.index > lastIndex) {
        const textContent = html.slice(lastIndex, match.index);
        const cleanedText = textContent
          .replace(/<br\s*\/?>/gi, '\n')
          .trim();
        if (cleanedText) {
          items.push({ type: 'text', content: cleanedText });
        }
      }
      
      const lang = match[1];
      let codeContent = match[2]
        .replace(/<td class="gutter">[\s\S]*?<\/td>/gi, '')
        .replace(/<table[^>]*>/gi, '')
        .replace(/<\/table>/gi, '')
        .replace(/<tr[^>]*>/gi, '')
        .replace(/<\/tr>/gi, '')
        .replace(/<td class="code">/gi, '')
        .replace(/<\/td>/gi, '')
        .trim();
      
      codeContent = decodeHtmlEntities(codeContent);
      
      codeContent = codeContent.replace(/<pre[^>]*>/gi, '').replace(/<\/pre>/gi, '');
      
      const lineRegex = /<span class="line">([\s\S]*?)<\/span>/gi;
      const parsedLines: { text: string; spans: { text: string; color?: string }[] }[] = [];
      let lineMatch;
      
      while ((lineMatch = lineRegex.exec(codeContent)) !== null) {
        const lineContent = lineMatch[1].trim();
        if (!lineContent) continue;
        
        const spans: { text: string; color?: string }[] = [];
        const spanRegex = /<span class="([^"]+)">([^<]*)<\/span>/gi;
        let spanMatch;
        let lastSpanIndex = 0;
        
        while ((spanMatch = spanRegex.exec(lineContent)) !== null) {
          if (spanMatch.index > lastSpanIndex) {
            spans.push({ text: lineContent.slice(lastSpanIndex, spanMatch.index) });
          }
          
          const className = spanMatch[1];
          let color = '#d4d4d4';
          if (className.match(/keyword|selector-tag|built_in|name|tag/)) color = '#569cd6';
          else if (className.match(/string|title|section|attribute|literal|template-tag|template-variable|type|addition/)) color = '#ce9178';
          else if (className.match(/comment|quote|deletion|meta/)) color = '#6a9955';
          else if (className.match(/number|regexp|link/)) color = '#b5cea8';
          else if (className.match(/params|attr/)) color = '#9cdcfe';
          else if (className.match(/title/)) color = '#dcdcaa';
          
          spans.push({ text: spanMatch[2], color });
          lastSpanIndex = spanRegex.lastIndex;
        }
        
        if (lastSpanIndex < lineContent.length) {
          spans.push({ text: lineContent.slice(lastSpanIndex) });
        }
        
        parsedLines.push({ text: lineContent.replace(/<[^>]*>/g, ''), spans });
      }
      
      items.push({ type: 'code', content: codeContent.replace(/<[^>]*>/g, ''), lang, lines: parsedLines });
      lastIndex = codeBlockRegex.lastIndex;
    }
    
    if (lastIndex < html.length) {
      const textContent = html.slice(lastIndex);
      const cleanedText = textContent
        .replace(/<br\s*\/?>/gi, '\n')
        .trim();
      if (cleanedText) {
        items.push({ type: 'text', content: cleanedText });
      }
    }
    
    return { items, imagesArray };
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

  const handleClick = (e) => {
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
          {renderItems.length > 0 ? (
            <View className='content'>
              {renderItems.map((item, index) => (
                item.type === 'code' ? (
                  <View key={index} className='code-block'>
                    <View className='code-header'>
                      <Text className='code-lang'>{item.lang || 'code'}</Text>
                    </View>
                    <ScrollView scrollX className='code-scroll'>
                      <View className='code-lines'>
                        {item.lines?.map((line, lineIndex) => (
                          <View key={lineIndex} className='code-line'>
                            {line.spans.map((span, spanIndex) => (
                              <Text
                                key={spanIndex}
                                style={span.color ? { color: span.color } : {}}
                              >{span.text}</Text>
                            ))}
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                ) : (
                  <View
                    key={index}
                    dangerouslySetInnerHTML={{ __html: item.content }}
                    onClick={(e) => handleClick(e)}
                    className='text-content'
                  />
                )
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