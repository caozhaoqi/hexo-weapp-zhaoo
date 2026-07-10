import React, { useState, useEffect, useMemo } from 'react';
import Taro from '@tarojs/taro';
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

let imageIdCounter = 0;

const DEFAULT_FALLBACK = '/assets/images/logo.png';

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
  const [visible, setVisible] = useState(immediate);
  const [loaded, setLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [retryAttempts, setRetryAttempts] = useState(0);
  const imageId = useMemo(() => `lazy-image-${++imageIdCounter}`, []);

  useEffect(() => {
    if (immediate) {
      setVisible(true);
      return;
    }

    const observer = Taro.createIntersectionObserver({
      thresholds: [0.1],
    });

    observer
      .relativeToViewport({ bottom: 100 })
      .observe(`#${imageId}`, (res) => {
        if (res.intersectionRatio > 0) {
          setVisible(true);
          observer.disconnect();
        }
      });

    return () => {
      observer.disconnect();
    };
  }, [imageId, immediate]);

  useEffect(() => {
    if (!immediate && !visible) {
      setTimeout(() => {
        setVisible(true);
      }, 2000);
    }
  }, [immediate, visible]);

  const handleLoad = () => {
    setLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    if (retryAttempts < retryCount) {
      setRetryAttempts(retryAttempts + 1);
      setTimeout(() => {
        setCurrentSrc(src);
      }, 1000 * Math.pow(2, retryAttempts));
    } else {
      setCurrentSrc(fallback);
    }
  };

  return (
    <View className={`${styles.lazyImage} ${className}`} id={imageId}>
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
        src={visible ? currentSrc : ''}
        mode={mode}
        lazyLoad
        onLoad={handleLoad}
        onError={handleError}
      />
    </View>
  );
};

export default LazyImage;
