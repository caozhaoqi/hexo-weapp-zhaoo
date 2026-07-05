import { useState, useEffect } from 'react';
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
  (): [IPostItem[], boolean, boolean];
}

const CACHE_KEY = 'posts_cache';
const CACHE_EXPIRE = 5 * 60 * 1000;

const usePagination: IUsePagination = () => {
  const [currentData, setCurrentData] = useState<IPostItem[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  useEffect(() => {
    initData();
  }, []);

  useEffect(() => {
    if (!hasMore || currentPage === 0 || !isInitialized) return;
    setIsLoading(true);
    fetchData();
  }, [currentPage, isInitialized]);

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

  useReachBottom(() => {
    if (isLoading || !hasMore) return;
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
        const newData = currentPage === 1 ? data : currentData.concat(data);
        setCurrentData(newData);
        
        const hasMoreData = currentPage < pageCount;
        setHasMore(hasMoreData);
        console.log('[分页] 更新数据, 当前页码:', currentPage, ', 总页数:', pageCount, ', 是否还有更多:', hasMoreData, ', 总数据量:', newData.length);
        
        saveCache(newData, currentPage, pageCount);
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
    try {
      setStorageSync(CACHE_KEY, null);
    } catch (e) {
      console.warn('[分页] 清除缓存失败:', e);
    }
  };

  return [currentData, hasMore, isLoading];
};

export default usePagination;