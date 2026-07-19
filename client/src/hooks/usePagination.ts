import { useState, useEffect, useMemo, useRef } from 'react';
import {
  useReachBottom,
  usePullDownRefresh,
  vibrateShort,
  stopPullDownRefresh,
} from '@tarojs/taro';
import { getPosts } from '@/apis/api';
import { prefetch } from '@/apis/request';
import { IPostItem } from '@/types/post';
import { setStorageSync, getStorageSync } from '@/utils/storage';

interface IUsePagination {
  (): [
    IPostItem[],
    boolean,
    boolean,
    {
      allTags: string[];
      sortBy: 'latest' | 'earliest';
      setSortBy: (sort: 'latest' | 'earliest') => void;
      selectedTag: string;
      setSelectedTag: (tag: string) => void;
      searchKeyword: string;
      setSearchKeyword: (keyword: string) => void;
      refresh: () => void;
    }
  ];
}

const CACHE_KEY = 'posts_cache';
const CACHE_EXPIRE = 60 * 60 * 1000;

const parseTags = (tags: any): string[] => {
  if (!tags) return [];
  
  if (Array.isArray(tags)) {
    return tags.map((t: any) => (typeof t === 'object' ? t.name : String(t))).filter((t: string) => t);
  }
  
  if (typeof tags === 'string') {
    try {
      const parsed = JSON.parse(tags);
      if (Array.isArray(parsed)) {
        return parsed.map((t: any) => (typeof t === 'object' ? t.name : String(t))).filter((t: string) => t);
      }
    } catch {
      return tags.split(',').map((t: string) => t.trim()).filter((t: string) => t);
    }
  }
  
  return [];
};

const usePagination: IUsePagination = () => {
  const [currentData, setCurrentData] = useState<IPostItem[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [allDataLoaded, setAllDataLoaded] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const [sortBy, setSortBy] = useState<'latest' | 'earliest'>('latest');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  // 预取防重复标记：每页生命周期内只预取一次文章详情
  const prefetchedPostsRef = useRef<boolean>(false);

  useEffect(() => {
    initData();
  }, []);

  useEffect(() => {
    if (!hasMore || currentPage === 0 || !isInitialized || allDataLoaded) return;
    setIsLoading(true);
    fetchData();
  }, [currentPage, isInitialized]);

  useEffect(() => {
    if (refreshTrigger > 0 && !isLoading) {
      setIsLoading(true);
      fetchData();
    }
  }, [refreshTrigger]);

  useEffect(() => {
    if (isInitialized && !allDataLoaded && totalPages > 0 && (sortBy !== 'latest' || selectedTag)) {
      loadAllData();
    }
  }, [sortBy, selectedTag, totalPages, allDataLoaded]);

  const initData = () => {
    const cached = getStorageSync(CACHE_KEY);
    if (cached) {
      const now = Date.now();
      if (now - cached.timestamp < CACHE_EXPIRE) {
        setCurrentData(cached.data);
        setCurrentPage(cached.currentPage);
        setTotalPages(cached.totalPages);
        setHasMore(cached.currentPage < cached.totalPages);
        setIsInitialized(true);
        if (cached.currentPage >= cached.totalPages) {
          setAllDataLoaded(true);
        }
        return;
      }
    }
    setIsInitialized(true);
    setCurrentPage(1);
  };

  const saveCache = (data: IPostItem[], page: number, total: number) => {
    try {
      setStorageSync(CACHE_KEY, {
        data,
        currentPage: page,
        totalPages: total,
        timestamp: Date.now(),
      });
    } catch (e) {
      console.warn('[分页] 缓存保存失败:', e);
    }
  };

  const loadAllData = async () => {
    if (allDataLoaded || isLoading) return;
    setIsLoading(true);

    try {
      // 并行加载所有页面（分批控制并发数）
      const BATCH_SIZE = 5;
      const allPages = Array.from({ length: totalPages }, (_, i) => i + 1);
      let allPosts: IPostItem[] = [];

      for (let i = 0; i < allPages.length; i += BATCH_SIZE) {
        const batch = allPages.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(batch.map((p) => getPosts(p).catch(() => null)));
        results.forEach((result) => {
          if (result && result.data && result.data.length > 0) {
            allPosts = allPosts.concat(result.data);
          }
        });
      }

      const slugMap = new Map<string, IPostItem>();
      for (const post of allPosts) {
        if (post.slug && !slugMap.has(post.slug)) {
          slugMap.set(post.slug, post);
        }
      }
      const uniquePosts = Array.from(slugMap.values());

      setCurrentData(uniquePosts);
      setAllDataLoaded(true);
      setHasMore(false);
      saveCache(uniquePosts, totalPages, totalPages);
    } catch (error) {
      console.error('[分页] 全量数据加载失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useReachBottom(() => {
    if (isLoading || !hasMore || allDataLoaded) return;
    getMoreData();
    try {
      vibrateShort();
    } catch (e) {
      console.warn('vibrateShort not supported');
    }
  });

  usePullDownRefresh(() => {
    refresh();
    try {
      vibrateShort();
    } catch (e) {
      console.warn('vibrateShort not supported');
    }
  });

  const fetchData = async () => {
    try {
      const result = await getPosts(currentPage);
      if (!result) {
        setHasMore(false);
        return;
      }

      const { data, pageCount } = result;

      if (!data || !pageCount || data.length === 0) {
        setHasMore(false);
      } else {
        setTotalPages(pageCount);
        let newData = currentPage === 1 ? data : currentData.concat(data);

        const slugMap = new Map<string, IPostItem>();
        for (const post of newData) {
          if (post.slug && !slugMap.has(post.slug)) {
            slugMap.set(post.slug, post);
          }
        }
        const uniqueData = Array.from(slugMap.values());

        setCurrentData(uniqueData);

        const hasMoreData = currentPage < pageCount;
        setHasMore(hasMoreData);

        saveCache(uniqueData, currentPage, pageCount);

        // ===== 数据预取 =====
        // 1. 首页加载第一页后，预取第二页（用户大概率下滑）
        if (currentPage === 1 && hasMoreData) {
          prefetch(`/posts/2.json`, `posts_2_cache`, CACHE_EXPIRE).catch(() => {});
        }
        // 2. 预取前 3 篇文章的详情（用户最可能点这几篇）
        //    只在首页且未预取过时触发一次
        if (currentPage === 1 && !prefetchedPostsRef.current) {
          prefetchedPostsRef.current = true;
          data.slice(0, 3).forEach((post: IPostItem) => {
            if (post.slug) {
              prefetch(`/articles/${post.slug}.json`, `post_${post.slug}_cache`, CACHE_EXPIRE).catch(() => {});
            }
          });
        }
      }
    } catch (error) {
      console.error('[分页] 请求异常:', error);
      setHasMore(false);
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
      if (isRefreshing) {
        stopPullDownRefresh();
        setIsRefreshing(false);
      }
    }
  };

  const getMoreData = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    } else {
      setHasMore(false);
    }
  };

  const refresh = () => {
    setIsRefreshing(true);
    setCurrentData([]);
    setHasMore(true);
    setCurrentPage(1);
    setTotalPages(0);
    setIsInitialized(true);
    setAllDataLoaded(false);
    try {
      setStorageSync(CACHE_KEY, null);
    } catch (e) {
      console.warn('[分页] 清除缓存失败:', e);
    }
    setRefreshTrigger((prev) => prev + 1);
  };

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    currentData.forEach((post) => {
      const tags = parseTags(post.tags);
      tags.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [currentData]);

  const processedPosts = useMemo(() => {
    let posts = [...currentData];

    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      posts = posts.filter((post) => {
        const titleMatch = post.title?.toLowerCase().includes(keyword);
        const excerptMatch = post.excerpt?.toLowerCase().includes(keyword);
        const tags = parseTags(post.tags);
        const tagMatch = tags.some((tag) => tag.toLowerCase().includes(keyword));
        return titleMatch || excerptMatch || tagMatch;
      });
    }

    if (selectedTag) {
      posts = posts.filter((post) => {
        const tags = parseTags(post.tags);
        return tags.includes(selectedTag);
      });
    }

    posts.sort((a, b) => {
      const topA = a.top || 0;
      const topB = b.top || 0;

      if (topA !== topB) {
        return topB - topA;
      }

      const dateA = Date.parse(a.date);
      const dateB = Date.parse(b.date);

      if (sortBy === 'latest') {
        return dateB - dateA;
      } else {
        return dateA - dateB;
      }
    });

    return posts;
  }, [currentData, sortBy, selectedTag, searchKeyword]);

  return [
    processedPosts,
    hasMore,
    isLoading,
    {
      allTags,
      sortBy,
      setSortBy,
      selectedTag,
      setSelectedTag,
      searchKeyword,
      setSearchKeyword,
      refresh,
    },
  ];
};

export default usePagination;
