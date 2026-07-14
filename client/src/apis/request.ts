import Taro from '@tarojs/taro';
import { HTTP_STATUS } from '@/constants/index';
import { baseUrl, cdnUrl } from '../../config.json';
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
  timeout?: number;
}

const DEFAULT_CACHE_EXPIRE = 60 * 60 * 1000;
const DEFAULT_TIMEOUT = 10000;
const MAX_STORAGE_SIZE = 800 * 1024;

const pendingRequests = new Map<string, Promise<any>>();

const sources: { name: string; url: string }[] = [
  { name: 'cdn', url: cdnUrl },
  { name: 'gh-proxy', url: 'https://gh-proxy.com/https://raw.githubusercontent.com/caozhaoqi/caozhaoqi.github.io/master/api' },
  { name: 'github', url: baseUrl },
];

const saveCache = (key: string, data: any) => {
  try {
    const jsonString = JSON.stringify(data);
    if (jsonString.length > MAX_STORAGE_SIZE) {
      return;
    }
    setStorageSync(key, {
      data,
      timestamp: Date.now(),
    });
  } catch (e) {
    console.warn('[API] 缓存保存失败:', e);
  }
};

const makeRequest = async (
  url: string,
  data: any,
  method: Method,
  headers: any,
  timeout: number
): Promise<any> => {
  const startTime = Date.now();
  
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const duration = Date.now() - startTime;
      console.error(`[API] 请求超时: ${method} ${url} (耗时: ${duration}ms)`);
      reject(new Error('Request timeout'));
    }, timeout);
    
    Taro.request({
      url,
      data,
      method,
      timeout,
      header: {
        'content-type': 'application/json;charset=utf-8',
        ...headers,
      },
    })
      .then(({ statusCode, data: responseData }) => {
        clearTimeout(timer);
        if (statusCode === HTTP_STATUS.SUCCESS) {
          resolve(responseData);
        } else {
          console.error(`[API] 请求失败: ${method} ${url} (状态码: ${statusCode})`);
          reject(new Error(`Error: code ${statusCode}`));
        }
      })
      .catch((error) => {
        clearTimeout(timer);
        console.error(`[API] 请求异常: ${method} ${url} (错误: ${error.message})`);
        reject(error);
      });
  });
};

export const request = async (config: RequestConfig) => {
  const { 
    url, 
    data, 
    method = 'GET', 
    headers = {}, 
    base = true, 
    cache = false, 
    cacheKey, 
    cacheExpire = DEFAULT_CACHE_EXPIRE,
    timeout = DEFAULT_TIMEOUT
  } = config;
  
  const requestKey = cacheKey || url + JSON.stringify(data);
  
  if (cache && method === 'GET') {
    const cached = getStorageSync(requestKey);
    if (cached) {
      const now = Date.now();
      if (now - cached.timestamp < cacheExpire) {
        const cacheAge = Math.floor((now - cached.timestamp) / 1000);
        console.log(`[API] 缓存命中: ${url} (缓存时间: ${cacheAge}秒前)`);
        return cached.data;
      } else {
        console.log(`[API] 缓存过期: ${url}`);
      }
    }
  }
  
  const requestSignature = `${method}:${url}:${JSON.stringify(data)}`;
  
  if (pendingRequests.has(requestSignature)) {
    return pendingRequests.get(requestSignature);
  }
  
  const attemptRequest = async (): Promise<any> => {
    let lastError: Error | null = null;
    
    for (let i = 0; i < sources.length; i++) {
      const { name, url: sourceBaseUrl } = sources[i];
      const fullUrl = base ? sourceBaseUrl + url : url;
      
      try {
        const result = await makeRequest(fullUrl, data, method, headers, timeout);
        
        if (cache && method === 'GET') {
          saveCache(requestKey, result);
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        if (url.includes('/galleries/') || url.includes('/galleries.json')) {
          return null;
        }
        
        continue;
      }
    }
    
    console.error(`[API] 所有源均失败: ${url}`);
    return null;
  };
  
  const requestPromise = attemptRequest();
  
  pendingRequests.set(requestSignature, requestPromise);
  
  requestPromise.finally(() => {
    pendingRequests.delete(requestSignature);
  });
  
  return requestPromise;
};

export const get = (url: string, data = {}, headers = {}, base = true, cache = false, cacheKey?: string) => {
  return request({ url, data, method: 'GET', headers, base, cache, cacheKey });
};

export const post = (url: string, data = {}, headers = {}, base = true) => {
  return request({ url, data, method: 'POST', headers, base });
};
