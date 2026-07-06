import Taro from '@tarojs/taro';
import { setStorageSync, getStorageSync } from '@/utils/storage';

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
    console.log('[授权] getUserProfile失败:', e);
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
      console.log('[授权] getUserInfo也失败，使用默认用户信息:', e2);
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