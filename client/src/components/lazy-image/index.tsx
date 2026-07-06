import React, { useState, useEffect, useMemo } from 'react';
import Taro from '@tarojs/taro';
import { Image, View } from '@tarojs/components';
import styles from './lazy-image.module.scss';

interface LazyImageProps {
  src: string;
  mode?: 'aspectFit' | 'aspectFill' | 'widthFix' | 'heightFix' | 'top' | 'bottom' | 'center' | 'left' | 'right' | 'scaleToFill';
  className?: string;
  placeholder?: string;
  onLoad?: () => void;
  immediate?: boolean;
}

let imageIdCounter = 0;

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  mode = 'aspectFill',
  className = '',
  placeholder = '',
  onLoad,
  immediate = false,
}) => {
  const [visible, setVisible] = useState(immediate);
  const [loaded, setLoaded] = useState(false);
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
        src={visible ? src : ''}
        mode={mode}
        lazyLoad
        onLoad={handleLoad}
      />
    </View>
  );
};

export default LazyImage;
