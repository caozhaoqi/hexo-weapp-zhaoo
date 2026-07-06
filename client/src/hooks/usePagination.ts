import { useState, useEffect, useMemo } from 'react';
import {
  useReachBottom,
  usePullDownRefresh,
  vibrateShort,
  stopPullDownRefresh,
} from '@tarojs/taro';
import { getPosts } from '@/apis/api';
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
const CACHE_EXPIRE = 5 * 60 * 1000;

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

  const [sortBy, setSortBy] = useState<'latest' | 'earliest'>('latest');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  useEffect(() => {
    initData();
  }, []);

  useEffect(() => {
    if (!hasMore || currentPage === 0 || !isInitialized || allDataLoaded) return;
    setIsLoading(true);
    fetchData();
  }, [currentPage, isInitialized]);

  useEffect(() => {
    if (isInitialized && !allDataLoaded && totalPages > 0 && (sortBy !== 'latest' || selectedTag)) {
      loadAllData();
    }
  }, [sortBy, selectedTag, totalPages]);

  const initData = () => {
    const cached = getStorageSync(CACHE_KEY);
    if (cached) {
      const now = Date.now();
      if (now - cached.timestamp < CACHE_EXPIRE) {
        console.log('[分页] 从缓存加载数据, 共', cached.data.length, '条');
        setCurrentData(cached.data);
        setCurrentPage(cached.currentPage);
        setTotalPages(cached.totalPages);
        setHasMore(cached.currentPage < cached.totalPages);
        setIsInitialized(true);
        if (cached.currentPage >= cached.totalPages) {
          setAllDataLoaded(true);
          console.log('[分页] 缓存数据已完整，跳过后续加载');
        }
        return;
      } else {
        console.log('[分页] 缓存已过期，重新加载');
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
      console.log('[分页] 缓存已更新, 当前页数:', page, '/', total, ', 数据量:', data.length);
    } catch (e) {
      console.warn('[分页] 缓存保存失败:', e);
    }
  };

  const loadAllData = async () => {
    if (allDataLoaded || isLoading) return;
    console.log('[分页] 开始加载全量数据');
    setIsLoading(true);

    try {
      let allPosts: IPostItem[] = [];
      let nextPage = 1;

      while (nextPage <= totalPages) {
        const result = await getPosts(nextPage);
        if (result && result.data && result.data.length > 0) {
          allPosts = allPosts.concat(result.data);
          nextPage++;
        } else {
          break;
        }
      }

      const uniquePosts = allPosts.filter((post, index, self) =>
        index === self.findIndex((p) => p.slug === post.slug)
      );

      setCurrentData(uniquePosts);
      setAllDataLoaded(true);
      setHasMore(false);
      saveCache(uniquePosts, totalPages, totalPages);
      console.log('[分页] 全量数据加载完成, 共', uniquePosts.length, '条');
    } catch (error) {
      console.error('[分页] 全量数据加载失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useReachBottom(() => {
    if (isLoading || !hasMore || allDataLoaded) return;
    console.log('[分页] 触底加载更多, 当前页码:', currentPage, ', 是否还有更多:', hasMore);
    getMoreData();
    try {
      vibrateShort();
    } catch (e) {
      console.warn('vibrateShort not supported');
    }
  });

  usePullDownRefresh(() => {
    console.log('[分页] 下拉刷新');
    refresh();
    try {
      vibrateShort();
    } catch (e) {
      console.warn('vibrateShort not supported');
    }
  });

  const fetchData = async () => {
    console.log('[分页] 开始请求数据, 页码:', currentPage);
    try {
      const result = await getPosts(currentPage);
      if (!result) {
        console.log('[分页] 请求返回为空');
        setHasMore(false);
        return;
      }

      const { data, pageCount } = result;
      console.log('[分页] 请求返回, 页码:', currentPage, ', 数据:', data?.length || 0, ', 总页数:', pageCount);

      if (!data || !pageCount || data.length === 0) {
        console.log('[分页] 无数据或请求失败, 停止加载');
        setHasMore(false);
      } else {
        setTotalPages(pageCount);
        let newData = currentPage === 1 ? data : currentData.concat(data);
        
        const uniqueData = newData.filter((post, index, self) =>
          index === self.findIndex((p) => p.slug === post.slug)
        );
        
        setCurrentData(uniqueData);

        const hasMoreData = currentPage < pageCount;
        setHasMore(hasMoreData);
        console.log('[分页] 更新数据, 当前页码:', currentPage, ', 总页数:', pageCount, ', 是否还有更多:', hasMoreData, ', 总数据量:', uniqueData.length);

        saveCache(uniqueData, currentPage, pageCount);
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
