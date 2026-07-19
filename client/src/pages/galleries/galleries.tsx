import { useState, useEffect, useCallback, useMemo } from 'react';
import Taro, { useShareTimeline, useShareAppMessage, usePullDownRefresh, stopPullDownRefresh, vibrateShort } from '@tarojs/taro';
import { View, Text, Image } from '@tarojs/components';
import { getPosts } from '@/apis/api';
import { IPostItem } from '@/types/post';
import LiteLoading from '@/components/lite-loading';
import config from '../../../config.json';
import { setStorageSync, getStorageSync } from '@/utils/storage';
import './galleries.scss';

const DEFAULT_SHARE_IMAGE = 'https://pic3.zhimg.com/80/v2-5f7cb7e900b9dcf5354c3d4d2c5cc3c2_1440w.webp';

const LOCAL_COVERS = [
  'https://pic3.zhimg.com/80/v2-5f7cb7e900b9dcf5354c3d4d2c5cc3c2_1440w.webp',
    'https://p3.music.126.net/bQ0yDljE0g32N7AvAs3P_A==/109951170542138279.jpg?param=300y300',
    'https://caozhaoqi.github.io/medias/logo.png',
    'https://cdn.jsdelivr.net/gh/fghrsh/live2d_api/model/Potion-Maker/Pio/textures/default-costume.png',
    'https://img10.360buyimg.com/ddimg/jfs/t1/166587/8/21344/72069/6088c24fEda5fdeb6/f9730ab637b7ca47.png',
    'https://picx.zhimg.com/80/v2-85c31120acff76826ab53ea8934ef4bb_1440w.webp',
    'https://pic3.zhimg.com/80/v2-e5c15010b8ba4608a1974403a02a2da0_1440w.webp',
    'https://pica.zhimg.com/80/v2-61f99f8dcf899f54cad2a1aa28b21e44_1440w.webp',
    'https://pic1.zhimg.com/80/v2-03a22891ccba9bccf6424dfd7cbf4be7_1440w.webp',
    'https://pic3.zhimg.com/80/v2-5f7cb7e900b9dcf5354c3d4d2c5cc3c2_1440w.webp',
    'https://pic4.zhimg.com/80/v2-e434e3a2888fb4efb1844845b8791d1f_1440w.webp',
    'https://pic3.zhimg.com/80/v2-e5c15010b8ba4608a1974403a02a2da0_1440w.webp',
    'https://pic2.zhimg.com/80/v2-29e78b52051ce542adf6d786d61fbd19_1440w.webp',
];

const TIMELINE_CACHE_KEY = 'timeline_cache';
const TIMELINE_CACHE_EXPIRE = 30 * 60 * 1000;

interface GroupedPosts {
  date: string;
  posts: IPostItem[];
}

interface TimelineCacheData {
  groupedPosts: GroupedPosts[];
  timestamp: number;
}

const getImageUrl = (src: string): string => {
  if (!src) return DEFAULT_SHARE_IMAGE;
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

const Galleries = () => {
  const [groupedPosts, setGroupedPosts] = useState<GroupedPosts[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadTimelineData();
  }, []);

  usePullDownRefresh(() => {
    refresh();
    try {
      vibrateShort();
    } catch (e) {
      console.warn('vibrateShort not supported');
    }
  });

  const loadTimelineData = useCallback(async () => {
    const cached = getStorageSync(TIMELINE_CACHE_KEY) as TimelineCacheData | null;
    if (cached && cached.groupedPosts) {
      const now = Date.now();
      if (now - cached.timestamp < TIMELINE_CACHE_EXPIRE) {
        setGroupedPosts(cached.groupedPosts);
        setIsLoading(false);
        return;
      }
    }
    await fetchTimelineData();
  }, []);

  const saveTimelineCache = (data: GroupedPosts[]) => {
    try {
      setStorageSync(TIMELINE_CACHE_KEY, {
        groupedPosts: data,
        timestamp: Date.now(),
      });
    } catch (e) {
      console.warn('[时间轴] 缓存保存失败:', e);
    }
  };

  const fetchTimelineData = async () => {
    try {
      // 先获取第一页，拿到总页数后并行加载剩余页面
      const firstRes = await getPosts(1);
      if (!firstRes || (!firstRes.data && !firstRes.length)) {
        console.warn('[时间轴] 未获取到任何文章数据');
        setGroupedPosts([]);
        return;
      }

      const allPosts: IPostItem[] = [];
      let totalPages = 0;

      if (firstRes.data && firstRes.data.length > 0) {
        allPosts.push(...firstRes.data);
        totalPages = firstRes.pageCount || 1;
      } else if (firstRes.length > 0) {
        allPosts.push(...firstRes);
      }

      // 并行加载剩余页面（限制并发数避免请求过多）
      if (totalPages > 1) {
        const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
        const BATCH_SIZE = 5;
        for (let i = 0; i < remainingPages.length; i += BATCH_SIZE) {
          const batch = remainingPages.slice(i, i + BATCH_SIZE);
          const results = await Promise.all(batch.map((p) => getPosts(p).catch(() => null)));
          results.forEach((res) => {
            if (res) {
              if (res.data && res.data.length > 0) {
                allPosts.push(...res.data);
              } else if (res.length > 0) {
                allPosts.push(...res);
              }
            }
          });
        }
      }

      console.log('[时间轴] 总共获取到', allPosts.length, '篇文章');

      if (allPosts.length === 0) {
        setGroupedPosts([]);
        return;
      }

      allPosts.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

      const groups: GroupedPosts[] = [];
      let currentDate = '';

      allPosts.forEach((post) => {
        const date = post.date ? new Date(post.date) : new Date();
        const dateStr = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;

        if (dateStr !== currentDate) {
          currentDate = dateStr;
          groups.push({ date: dateStr, posts: [] });
        }
        groups[groups.length - 1].posts.push(post);
      });

      setGroupedPosts(groups);
      saveTimelineCache(groups);
    } catch (e) {
      console.error('[时间轴] 请求异常:', e);
    } finally {
      setIsLoading(false);
      if (isRefreshing) {
        stopPullDownRefresh();
        setIsRefreshing(false);
      }
    }
  };

  const refresh = () => {
    setIsRefreshing(true);
    setFailedImages(new Set());
    try {
      setStorageSync(TIMELINE_CACHE_KEY, null);
    } catch (e) {
      console.warn('[时间轴] 清除缓存失败:', e);
    }
    fetchTimelineData();
  };

  const handleImageError = useCallback((url: string) => {
    setFailedImages((prev) => {
      if (prev.has(url)) return prev; // 已存在则返回原引用，避免不必要重渲染
      const next = new Set(prev);
      next.add(url);
      return next;
    });
  }, []);

  // 预计算每篇文章的全局索引和封面 URL，避免 render 过程中可变状态
  // 之前用 `let globalIndex = 0` 在 render 中累加，是反模式且容易因重渲染出错
  const flattenedItems = useMemo(() => {
    let cursor = 0;
    return groupedPosts.map((group) => ({
      ...group,
      items: group.posts.map((post) => {
        const index = cursor++;
        const originalUrl = post.cover ? getImageUrl(post.cover) : '';
        const coverUrl = originalUrl && failedImages.has(originalUrl)
          ? LOCAL_COVERS[index % LOCAL_COVERS.length]
          : (originalUrl || LOCAL_COVERS[index % LOCAL_COVERS.length]);
        return { post, index, coverUrl };
      }),
    }));
  }, [groupedPosts, failedImages]);

  const handlePostClick = useCallback((slug: string) => {
    Taro.navigateTo({
      url: `/pages/post/post?slug=${slug}`,
    });
  }, []);

  useShareTimeline(() => {
    return {
      title: '时间轴',
      imageUrl: DEFAULT_SHARE_IMAGE,
    };
  });

  useShareAppMessage(() => {
    return {
      title: '时间轴',
      path: '/pages/galleries/galleries',
      imageUrl: DEFAULT_SHARE_IMAGE,
      webpageUrl: '',
      userName: '',
      imagePath: '',
      withShareTicket: false,
      miniprogramType: 0,
      scene: 0,
    };
  });

  return (
    <View className='galleries'>

      {isLoading ? (
        <View className='loading'>
          <LiteLoading loading text='正在加载时间轴...' />
        </View>
      ) : groupedPosts.length > 0 ? (
        flattenedItems.map((group, groupIndex) => (
          <View key={group.date || groupIndex} className='timeline-group'>
            <View className='date-divider'>
              <View className='date-line date-line-left' />
              <View className='date-dot' />
              <Text className='date-text'>{group.date}</Text>
              <View className='date-dot' />
              <View className='date-line date-line-right' />
            </View>
            <View className='post-list'>
              {group.items.map(({ post, index, coverUrl }) => (
                <View
                  key={post.slug || index}
                  className='timeline-item'
                  onClick={() => handlePostClick(post.slug)}
                >
                  <View className='item-content'>
                    <Text className='item-title'>{post.title}</Text>
                    <Text className='item-excerpt'>{post.excerpt}</Text>
                  </View>
                  <View className='item-cover-wrapper'>
                    <Image
                      className='item-cover'
                      src={coverUrl}
                      lazyLoad
                      mode='aspectFill'
                      onError={() => handleImageError(coverUrl)}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))
      ) : (
        <View className='empty'>
          <Text className='empty-icon'>📭</Text>
          <Text className='empty-text'>还没有文章</Text>
          <Text className='empty-hint'>下拉刷新试试看</Text>
        </View>
      )}
    </View>
  );
};

export default Galleries;
