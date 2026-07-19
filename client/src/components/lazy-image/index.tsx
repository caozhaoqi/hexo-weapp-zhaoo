import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Image, View } from '@tarojs/components';
import styles from './lazy-image.module.scss';

interface LazyImageProps {
  src: string;
  mode?: 'aspectFit' | 'aspectFill' | 'widthFix' | 'heightFix' | 'top' | 'bottom' | 'center' | 'left' | 'right' | 'scaleToFill';
  className?: string;
  placeholder?: string;
  fallback?: string;
  onLoad?: () => void;
  immediate?: boolean;
  retryCount?: number;
}

const DEFAULT_FALLBACK = '/assets/images/logo.png';

/**
 * LazyImage —— 依赖微信原生 <Image lazyLoad> 实现懒加载。
 *
 * 设计说明：
 * 微信小程序的 IntersectionObserver.observe() 每个实例只能调用一次（与 Web 标准不同），
 * 因此无法用「共享 observer 池」观察多个元素；若每个 LazyImage 各建一个 observer，
 * 长列表下 observer 实例数等于图片数，开销同样很大。
 *
 * 而微信原生 <Image lazyLoad> 属性已经能在图片进入可视区时才发起图片请求，
 * 完全满足懒加载需求。因此本组件移除了 IntersectionObserver 逻辑，
 * 只保留：
 *   1. 加载完成前显示骨架屏占位（视觉体验）
 *   2. 失败重试 + fallback 兜底（健壮性）
 *   3. retry timer 的正确清理（修复内存泄漏）
 */
const LazyImage: React.FC<LazyImageProps> = ({
  src,
  mode = 'aspectFill',
  className = '',
  placeholder = '',
  fallback = DEFAULT_FALLBACK,
  onLoad,
  immediate = false,
  retryCount = 2,
}) => {
  const [loaded, setLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [retryAttempts, setRetryAttempts] = useState(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // src 变化时重置状态
  useEffect(() => {
    setCurrentSrc(src);
    setLoaded(false);
    setRetryAttempts(0);
  }, [src]);

  // 组件卸载时清理 retry 定时器，避免内存泄漏与「卸载后 setState」警告
  useEffect(() => {
    return () => {
      if (retryTimer.current) {
        clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }
    };
  }, []);

  const handleLoad = useCallback(() => {
    setLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    if (retryAttempts < retryCount) {
      const nextAttempt = retryAttempts + 1;
      setRetryAttempts(nextAttempt);
      // 清理上一次的重试定时器，避免内存泄漏
      if (retryTimer.current) clearTimeout(retryTimer.current);
      retryTimer.current = setTimeout(() => {
        setCurrentSrc(src);
      }, 1000 * Math.pow(2, retryAttempts));
    } else {
      setCurrentSrc(fallback);
    }
  }, [retryAttempts, retryCount, src, fallback]);

  // immediate 仅控制是否立即开始加载（语义保留），实际懒加载交给 <Image lazyLoad>
  void immediate;

  return (
    <View className={`${styles.lazyImage} ${className}`}>
      {!loaded && (
        <View className={styles.placeholder}>
          {placeholder ? (
            <Image src={placeholder} mode={mode} className={styles.placeholderImage} />
          ) : (
            <View className={styles.skeleton} />
          )}
        </View>
      )}
      <Image
        className={`${styles.image} ${loaded ? styles.visible : styles.hidden}`}
        src={currentSrc}
        mode={mode}
        lazyLoad
        onLoad={handleLoad}
        onError={handleError}
      />
    </View>
  );
};

// 使用 React.memo 避免不必要的重渲染
export default React.memo(LazyImage);
