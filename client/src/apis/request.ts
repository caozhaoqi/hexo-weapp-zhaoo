import Taro from '@tarojs/taro';
import { HTTP_STATUS } from '@/constants/index';
import { baseUrl } from '../../config.json';
import { setStorageSync, getStorageSync } from '@/utils/storage';

type Method =
  | 'OPTIONS'
  | 'GET'
  | 'HEAD'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'TRACE'
  | 'CONNECT';

interface RequestConfig {
  url: string;
  data?: any;
  method?: Method;
  headers?: any;
  base?: boolean;
  cache?: boolean;
  cacheKey?: string;
  cacheExpire?: number;
}

const DEFAULT_CACHE_EXPIRE = 5 * 60 * 1000;

export const request = async (config: RequestConfig) => {
  const { url, data, method = 'GET', headers = {}, base = true, cache = false, cacheKey, cacheExpire = DEFAULT_CACHE_EXPIRE } = config;
  
  const fullUrl = base ? baseUrl + url : url;
  const requestKey = cacheKey || url + JSON.stringify(data);
  
  console.log('[API] 请求开始, 方法:', method, ', URL:', fullUrl, ', 缓存:', cache ? '开启' : '关闭');
  
  if (cache && method === 'GET') {
    const cached = getStorageSync(requestKey);
    if (cached) {
      const now = Date.now();
      if (now - cached.timestamp < cacheExpire) {
        console.log('[API] 命中缓存, Key:', requestKey, ', 缓存时间:', new Date(cached.timestamp).toLocaleString());
        return cached.data;
      } else {
        console.log('[API] 缓存已过期, Key:', requestKey);
      }
    }
  }
  
  const option = {
    url: fullUrl,
    data,
    method,
    header: {
      'content-type': 'application/json;charset=utf-8',
      ...headers,
    },
  };
  
  return Taro.request(option)
    .then(({ statusCode, data: responseData }) => {
      console.log('[API] 请求成功, 状态码:', statusCode, ', URL:', fullUrl);
      
      if (statusCode === HTTP_STATUS.SUCCESS) {
        if (cache && method === 'GET') {
          setStorageSync(requestKey, {
            data: responseData,
            timestamp: Date.now(),
          });
          console.log('[API] 缓存已保存, Key:', requestKey);
        }
        return responseData;
      }
      const msg = `Error: code ${statusCode}`;
      console.error('[API] 请求失败, 状态码:', statusCode, ', URL:', fullUrl);
      throw new Error(msg);
    })
    .catch((error) => {
      console.error('[API] 请求异常, URL:', fullUrl, ', 错误:', error);
      return;
    });
};

export const get = (url: string, data = {}, headers = {}, base = true, cache = false, cacheKey?: string) => {
  return request({ url, data, method: 'GET', headers, base, cache, cacheKey });
};

export const post = (url: string, data = {}, headers = {}, base = true) => {
  return request({ url, data, method: 'POST', headers, base });
};
