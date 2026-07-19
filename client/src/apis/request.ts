import Taro from '@tarojs/taro';
import { HTTP_STATUS } from '@/constants/index';
import { sources as configSources, requestTimeout as configTimeout } from '../../config.json';
import { setStorageSync, getStorageSync } from '@/utils/storage';

type Method =
  | 'OPTIONS'
  | 'HEAD'
  | 'GET'
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
  /**
   * SWR 模式（默认 true，仅对 GET + cache=true 生效）：
   * - 缓存未过期：直接返回缓存
   * - 缓存已过期：**立即返回旧缓存** + 后台静默刷新
   * - 无缓存：正常请求
   * 关闭后退化为「过期就重新请求，用户等待」。
   */
  swr?: boolean;
  /** 静默刷新时不触发 loading 态（由调用方判断） */
  background?: boolean;
}

const DEFAULT_CACHE_EXPIRE = 60 * 60 * 1000;
const DEFAULT_TIMEOUT = configTimeout || 5000;
const MAX_STORAGE_SIZE = 800 * 1024;

const pendingRequests = new Map<string, Promise<any>>();

/** 自定义数据源存储 key */
const CUSTOM_SOURCES_KEY = 'custom_sources';

// ===== L1 内存缓存 =====
// 进程内 Map，读取零延迟。storage 读取在小程序中约 5-20ms，内存缓存约 0.01ms。
// 命中 L1 时直接返回，无需任何异步操作。
interface L1Entry {
  data: any;
  timestamp: number;
  expire: number;
}
const L1_CACHE = new Map<string, L1Entry>();

// ===== 源健康度跟踪 =====
// 记录每个源最近 N 次请求的响应时间与失败次数，用于智能排序
interface SourceStats {
  name: string;
  url: string;
  samples: number[]; // 最近 5 次响应时间
  failures: number; // 连续失败次数
  lastUsed: number; // 上次使用时间戳
}
const sourceStatsMap = new Map<string, SourceStats>();
const SAMPLE_WINDOW = 5;
const FAILURE_PENALTY = 5000; // 失败一次等价于 +5s 响应时间

const recordSourceStat = (name: string, url: string, durationMs: number, success: boolean) => {
  let stats = sourceStatsMap.get(name);
  if (!stats) {
    stats = { name, url, samples: [], failures: 0, lastUsed: 0 };
    sourceStatsMap.set(name, stats);
  }
  stats.lastUsed = Date.now();
  if (success) {
    stats.failures = 0;
    stats.samples.push(durationMs);
    if (stats.samples.length > SAMPLE_WINDOW) stats.samples.shift();
  } else {
    stats.failures += 1;
  }
};

const getSourceScore = (name: string): number => {
  const stats = sourceStatsMap.get(name);
  if (!stats || stats.samples.length === 0) {
    // 无历史数据，给中等优先级（让新源有机会被测试）
    return 500;
  }
  // P50 + 失败惩罚
  const sorted = [...stats.samples].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length / 2)];
  return p50 + stats.failures * FAILURE_PENALTY;
};

/**
 * 构建 API 数据源列表
 * 优先级：用户手动配置 > config.json sources > 硬编码兜底
 */
const buildSources = (): { name: string; url: string }[] => {
  try {
    const customSources = getStorageSync(CUSTOM_SOURCES_KEY);
    if (customSources && Array.isArray(customSources) && customSources.length > 0) {
      const valid = customSources
        .filter((s: any) => s && s.url && typeof s.url === 'string' && s.url.trim())
        .map((s: any) => ({ name: s.name || '自定义', url: s.url.trim() }));
      if (valid.length > 0) return valid;
    }
  } catch (e) {
    // storage 读取失败，降级
  }

  if (configSources && Array.isArray(configSources) && configSources.length > 0) {
    return configSources
      .filter((s: any) => s && s.url)
      .map((s: any) => ({ name: s.name, url: s.url }));
  }

  return [
    { name: 'github-pages', url: 'https://caozhaoqi.github.io/api' },
    { name: 'jsdelivr', url: 'https://cdn.jsdelivr.net/gh/caozhaoqi/caozhaoqi.github.io/api' },
    { name: 'github-raw', url: 'https://raw.githubusercontent.com/caozhaoqi/caozhaoqi.github.io/master/api' },
  ];
};

const getSources = (): { name: string; url: string }[] => buildSources();

/**
 * 按健康度排序数据源（最快的在前）
 * 首次请求时所有源都无历史数据，保持原顺序（即 config 中的优先顺序）。
 */
const getSortedSources = (): { name: string; url: string }[] => {
  const sources = getSources();
  // 若任一源无统计，保持原顺序（让首次请求覆盖所有源以收集数据）
  if ([...sourceStatsMap.values()].length < sources.length) return sources;
  // 全部都有统计后，按 score 升序排序
  return [...sources].sort((a, b) => getSourceScore(a.name) - getSourceScore(b.name));
};

const saveCache = (key: string, data: any, expire: number) => {
  try {
    const jsonString = JSON.stringify(data);
    if (jsonString.length > MAX_STORAGE_SIZE) return;
    // L2: storage 持久化
    setStorageSync(key, { data, timestamp: Date.now(), expire });
    // L1: 内存缓存
    L1_CACHE.set(key, { data, timestamp: Date.now(), expire });
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
        const errorMsg = error?.message || JSON.stringify(error) || '未知网络错误';
        console.error(`[API] 请求异常: ${method} ${url} (错误: ${errorMsg})`);
        reject(error);
      });
  });
};

/**
 * 单源请求 + 健康度记录
 */
const trySource = async (
  sourceName: string,
  sourceBaseUrl: string,
  path: string,
  base: boolean,
  data: any,
  method: Method,
  headers: any,
  timeout: number
): Promise<any> => {
  const fullUrl = base ? sourceBaseUrl + path : path;
  const startTime = Date.now();
  try {
    const result = await makeRequest(fullUrl, data, method, headers, timeout);
    const duration = Date.now() - startTime;
    recordSourceStat(sourceName, sourceBaseUrl, duration, true);
    console.log(`[API] 源 ${sourceName} 成功: ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    recordSourceStat(sourceName, sourceBaseUrl, duration, false);
    console.warn(`[API] 源 ${sourceName} 失败 (${duration}ms): ${(error as Error)?.message}`);
    throw error;
  }
};

/**
 * 智能请求：按健康度排序，逐个尝试，失败降级
 * - 首次请求（无统计）：竞速模式，让最快的源胜出并收集所有源的数据
 * - 后续请求：单源模式，用最快的源，失败才降级到下一个
 */
const attemptRequest = async (
  path: string,
  data: any,
  method: Method,
  headers: any,
  base: boolean,
  timeout: number,
  cacheOptions: { cache: boolean; requestKey: string; cacheExpire: number }
): Promise<any> => {
  const sources = getSources();
  const { cache, requestKey, cacheExpire } = cacheOptions;

  // 判断是否有足够的统计数据
  const hasStats = [...sourceStatsMap.values()].filter(s => s.samples.length > 0).length >= Math.min(2, sources.length);

  if (!hasStats || sources.length === 1) {
    // 首次/数据不足：竞速模式（Promise.any），让最快源胜出 + 收集所有源数据
    const requestPromises = sources.map(({ name, url }) =>
      trySource(name, url, path, base, data, method, headers, timeout)
    );
    try {
      const result = await Promise.any(requestPromises);
      if (cache && method === 'GET') saveCache(requestKey, result, cacheExpire);
      return result;
    } catch (aggregateError) {
      // 全部失败，串行重试一次
      console.warn('[API] 并发请求全部失败，降级串行重试');
      for (const { name, url } of sources) {
        try {
          const result = await trySource(name, url, path, base, data, method, headers, timeout);
          if (cache && method === 'GET') saveCache(requestKey, result, cacheExpire);
          return result;
        } catch (e) {
          continue;
        }
      }
      console.error(`[API] 所有源均失败: ${path}`);
      return null;
    }
  }

  // 有统计：智能单源模式，按健康度排序逐个尝试
  const sortedSources = getSortedSources();
  for (const { name, url } of sortedSources) {
    try {
      const result = await trySource(name, url, path, base, data, method, headers, timeout);
      if (cache && method === 'GET') saveCache(requestKey, result, cacheExpire);
      return result;
    } catch (e) {
      // 失败则降级到下一个源
      continue;
    }
  }
  console.error(`[API] 所有源均失败: ${path}`);
  return null;
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
    timeout = DEFAULT_TIMEOUT,
    swr = true,
    background = false,
  } = config;

  const requestKey = cacheKey || url + JSON.stringify(data);
  const now = Date.now();

  // ===== 缓存读取（L1 → L2）=====
  if (cache && method === 'GET') {
    // L1 内存缓存
    const l1 = L1_CACHE.get(requestKey);
    if (l1) {
      const age = now - l1.timestamp;
      if (age < l1.expire) {
        console.log(`[API] L1 命中(新鲜): ${url} (${Math.floor(age / 1000)}s)`);
        return l1.data;
      }
      // L1 过期：进入 SWR 流程（见下）
      if (swr) {
        console.log(`[API] L1 过期，SWR 立即返回旧值 + 后台刷新: ${url}`);
        // 后台静默刷新（不阻塞当前请求）
        if (!background && !pendingRequests.has(`bg:${requestKey}`)) {
          const bgPromise = attemptRequest(url, data, method, headers, base, timeout, {
            cache,
            requestKey,
            cacheExpire,
          })
            .then(() => {
              pendingRequests.delete(`bg:${requestKey}`);
            })
            .catch(() => {
              pendingRequests.delete(`bg:${requestKey}`);
            });
          pendingRequests.set(`bg:${requestKey}`, bgPromise);
        }
        return l1.data; // 立即返回旧值
      }
    } else {
      // L1 未命中，查 L2 storage
      const l2 = getStorageSync(requestKey);
      if (l2 && l2.timestamp) {
        const age = now - l2.timestamp;
        const expire = l2.expire || cacheExpire;
        if (age < expire) {
          // L2 新鲜：回填 L1 并返回
          console.log(`[API] L2 命中(新鲜): ${url} (${Math.floor(age / 1000)}s)`);
          L1_CACHE.set(requestKey, { data: l2.data, timestamp: l2.timestamp, expire });
          return l2.data;
        }
        // L2 过期：SWR 立即返回旧值 + 后台刷新
        if (swr) {
          console.log(`[API] L2 过期，SWR 立即返回旧值 + 后台刷新: ${url}`);
          L1_CACHE.set(requestKey, { data: l2.data, timestamp: l2.timestamp, expire }); // 回填 L1
          if (!background && !pendingRequests.has(`bg:${requestKey}`)) {
            const bgPromise = attemptRequest(url, data, method, headers, base, timeout, {
              cache,
              requestKey,
              cacheExpire,
            })
              .then(() => pendingRequests.delete(`bg:${requestKey}`))
              .catch(() => pendingRequests.delete(`bg:${requestKey}`));
            pendingRequests.set(`bg:${requestKey}`, bgPromise);
          }
          return l2.data;
        }
      }
    }
  }

  // ===== 正常请求（无缓存或非 GET）=====
  const requestSignature = `${method}:${url}:${JSON.stringify(data)}`;

  // 请求去重：同 URL 并发请求合并
  if (pendingRequests.has(requestSignature)) {
    return pendingRequests.get(requestSignature);
  }

  const requestPromise = attemptRequest(url, data, method, headers, base, timeout, {
    cache,
    requestKey,
    cacheExpire,
  });

  pendingRequests.set(requestSignature, requestPromise);
  requestPromise.finally(() => {
    pendingRequests.delete(requestSignature);
  });

  return requestPromise;
};

export const get = (
  url: string,
  data = {},
  headers = {},
  base = true,
  cache = false,
  cacheKey?: string,
  swr?: boolean
) => {
  return request({ url, data, method: 'GET', headers, base, cache, cacheKey, swr });
};

export const post = (url: string, data = {}, headers = {}, base = true) => {
  return request({ url, data, method: 'POST', headers, base });
};

/**
 * 预取：与 get 相同，但标记为 background，不触发 SWR 的后台刷新嵌套
 */
export const prefetch = (
  url: string,
  cacheKey: string,
  cacheExpire: number = DEFAULT_CACHE_EXPIRE
): Promise<any> => {
  // 预取前先检查 L1/L2，已有新鲜缓存则跳过
  const now = Date.now();
  const l1 = L1_CACHE.get(cacheKey);
  if (l1 && now - l1.timestamp < l1.expire) return Promise.resolve(l1.data);

  return request({
    url,
    method: 'GET',
    cache: true,
    cacheKey,
    cacheExpire,
    swr: false, // 预取本身不需要 SWR（避免嵌套后台请求）
    background: true,
  });
};

/**
 * 预热：App 启动时对最快的源发一个最小请求，建立 TCP+TLS 连接
 * 微信小程序 wx.request 底层维护连接池，预热后后续请求可复用连接，省去 ~400ms 握手。
 */
export const warmup = async (): Promise<void> => {
  try {
    const sources = getSources();
    // 对所有源都发一个超轻量请求（posts/1.json 只有 4.5KB），收集健康度
    // 用 Promise.any 让最快的胜出，同时所有源的连接都被预热
    await Promise.any(
      sources.map(({ name, url }) =>
        trySource(name, url, '/posts/1.json', true, {}, 'GET' as Method, {}, 3000)
          .then((result) => {
            // 顺便填充首页缓存（如果还没缓存的话）
            if (result) {
              saveCache('posts_1_cache', result, DEFAULT_CACHE_EXPIRE);
            }
          })
          .catch(() => {
            // 预热失败不影响启动
          })
      )
    );
    console.log('[API] 预热完成');
  } catch (e) {
    console.warn('[API] 预热失败（不影响功能）:', (e as Error)?.message);
  }
};

/**
 * 清空 L1 内存缓存（开发者页面用）
 */
export const clearL1Cache = (): void => {
  L1_CACHE.clear();
};

/**
 * 获取源健康度统计（开发者页面/调试用）
 */
export const getSourceHealth = () => {
  const result: any[] = [];
  sourceStatsMap.forEach((stats) => {
    const avg = stats.samples.length > 0
      ? Math.round(stats.samples.reduce((a, b) => a + b, 0) / stats.samples.length)
      : null;
    result.push({
      name: stats.name,
      samples: stats.samples,
      avgResponseMs: avg,
      failures: stats.failures,
      score: Math.round(getSourceScore(stats.name)),
    });
  });
  return result.sort((a, b) => (a.score || 0) - (b.score || 0));
};
