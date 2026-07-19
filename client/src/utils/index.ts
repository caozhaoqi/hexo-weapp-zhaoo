import Taro from '@tarojs/taro';
import { setStorageSync, getStorageSync } from '@/utils/storage';
import config from '../../config.json';

const { baseUrl } = config;
const baseHost = baseUrl.replace('/api', '');

/**
 * 统一的图片 URL 处理函数
 * - 绝对 URL（http/https）直接返回
 * - 相对路径补全为完整 URL
 * - 空值返回默认占位图
 */
export const getImageUrl = (src: string, defaultCover?: string): string => {
  if (!src) {
    return defaultCover || '/assets/images/logo.png';
  }
  const decodedSrc = decodeURIComponent(src);
  if (decodedSrc.startsWith('http://') || decodedSrc.startsWith('https://')) {
    if (decodedSrc.includes('czq-blog.oss-cn-beijing.aliyuncs.com')) {
      return decodedSrc.split('?')[0];
    }
    return decodedSrc;
  }
  const normalizedSrc = decodedSrc.startsWith('/') ? decodedSrc : `/${decodedSrc}`;
  return baseHost + normalizedSrc;
};

/** 默认封面图轮换（Unsplash） */
const DEFAULT_COVERS = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400',
  'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=400',
  'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=400',
  'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=400',
];

/** 获取按索引轮换的默认封面 */
export const getDefaultCover = (index: number): string => DEFAULT_COVERS[index % DEFAULT_COVERS.length];

interface IFormateDate {
  (rawDate: string): string;
}

export const formateDate: IFormateDate = (rawDate) => {
  const arr = new Date(rawDate).toString().split(' ');
  const m = arr[1];
  const d = arr[2];
  const y = arr[3];
  return `${m} ${d}, ${y}`;
};

export interface IUserInfo {
  avatarUrl: string;
  nickName: string;
  city: string;
  country: string;
  gender: number;
  language: string;
  province: string;
}

export const getUserInfo = async (): Promise<IUserInfo | null> => {
  const storage = getStorageSync('userinfo');
  if (storage) {
    return storage;
  } else {
    return null;
  }
};

export const requestUserProfile = async (): Promise<IUserInfo> => {
  const storage = getStorageSync('userinfo');
  if (storage && storage.nickName) {
    return storage;
  }

  try {
    const res = await Taro.getUserProfile({
      desc: '用户信息将用于存储社交状态',
    });
    const { userInfo } = res;
    setStorageSync('userinfo', userInfo);
    return {
      avatarUrl: userInfo.avatarUrl || '',
      nickName: userInfo.nickName || '',
      city: userInfo.city || '',
      country: userInfo.country || '',
      gender: userInfo.gender ?? 0,
      language: userInfo.language || '',
      province: userInfo.province || '',
    };
  } catch (e) {
    try {
      const res = await Taro.getUserInfo({});
      const { userInfo } = res;
      setStorageSync('userinfo', userInfo);
      return {
        avatarUrl: userInfo.avatarUrl || '',
        nickName: userInfo.nickName || '',
        city: userInfo.city || '',
        country: userInfo.country || '',
        gender: userInfo.gender ?? 0,
        language: userInfo.language || '',
        province: userInfo.province || '',
      };
    } catch (e2) {
      const defaultUser: IUserInfo = {
        avatarUrl: '',
        nickName: '访客',
        city: '',
        country: '',
        gender: 0,
        language: '',
        province: '',
      };
      setStorageSync('userinfo', defaultUser);
      return defaultUser;
    }
  }
};

export const setUserProfile = (userInfo: IUserInfo): void => {
  setStorageSync('userinfo', userInfo);
};

export const filterHtml = (str) => {
  var re = /<[^>]+>/gi;
  return str.replace(re, '');
};

export interface ILikeData {
  nickName: string;
  avatarUrl: string;
  slug: string;
  path: string;
  title: string;
  excerpt: string;
  cover: string;
  createdAt: string;
}

export const getLikes = (path?: string): ILikeData[] => {
  const likes = getStorageSync('likes') || [];
  if (path) {
    return likes.filter((like: ILikeData) => like.path === path);
  }
  return likes;
};

export const addLike = (like: ILikeData): boolean => {
  const likes = getLikes();
  const exists = likes.some((l: ILikeData) => l.path === like.path && l.nickName === like.nickName);
  if (exists) return false;
  like.createdAt = new Date().toISOString();
  likes.push(like);
  setStorageSync('likes', likes);
  return true;
};

export const removeLike = (path: string, nickName: string): boolean => {
  const likes = getLikes();
  const index = likes.findIndex((l: ILikeData) => l.path === path && l.nickName === nickName);
  if (index > -1) {
    likes.splice(index, 1);
    setStorageSync('likes', likes);
    return true;
  }
  return false;
};

export const isLiked = (path: string, nickName: string): boolean => {
  const likes = getLikes(path);
  return likes.some((l: ILikeData) => l.nickName === nickName);
};

export interface ICommentData {
  url: string;
  comment: string;
  nick: string;
  mail?: string;
  weappAvatar: string;
  createdAt: string;
  updatedAt: string;
}

export const getComments = (url?: string): ICommentData[] => {
  const comments = getStorageSync('comments') || [];
  if (url) {
    return comments.filter((c: ICommentData) => c.url === url);
  }
  return comments;
};

export const addComment = (comment: ICommentData): boolean => {
  const comments = getComments();
  const now = new Date().toISOString();
  comment.createdAt = now;
  comment.updatedAt = now;
  comments.unshift(comment);
  setStorageSync('comments', comments);
  return true;
};

export interface ICounterData {
  words: string;
  count: number;
}

export const getCounter = (words: string): number => {
  const counters = getStorageSync('counters') || [];
  const counter = counters.find((c: ICounterData) => c.words === words);
  return counter ? counter.count : 0;
};

export const incrementCounter = (words: string): void => {
  const counters = getStorageSync('counters') || [];
  const index = counters.findIndex((c: ICounterData) => c.words === words);
  if (index > -1) {
    counters[index].count += 1;
  } else {
    counters.push({ words, count: 1 });
  }
  setStorageSync('counters', counters);
};

export const getSearchHistory = (): string[] => {
  return getStorageSync('search_history') || [];
};

export const addSearchHistory = (keyword: string): void => {
  if (!keyword.trim()) return;
  const history = getSearchHistory();
  const filtered = history.filter((k) => k !== keyword.trim());
  filtered.unshift(keyword.trim());
  const limited = filtered.slice(0, 10);
  setStorageSync('search_history', limited);
};

export const clearSearchHistory = (): void => {
  setStorageSync('search_history', []);
};

export const HOT_SEARCH_KEYWORDS = ['React', 'TypeScript', '前端', 'JavaScript', '小程序'];