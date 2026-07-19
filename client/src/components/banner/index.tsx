import React, { useEffect, useState, memo } from 'react';
import { View, Image, Text } from '@tarojs/components';
import { banners } from '../../config/banners';
import styles from './banner.module.scss';

const Banner: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * banners.length);
    setCurrentIndex(randomIndex);
  }, []);

  const currentBanner = banners[currentIndex];

  return (
    <View className={styles.banner}>
      <Image
        className={styles.bannerImage}
        src={currentBanner.image}
        mode='aspectFill'
        lazyLoad
      />
      <View className={styles.bannerOverlay} />
      <View className={styles.bannerContent}>
        <Text className={styles.bannerTitle}>{currentBanner.title}</Text>
        <Text className={styles.bannerDesc}>{currentBanner.desc}</Text>
      </View>
      <View className={styles.bannerDots}>
        {banners.map((_, index) => (
          <View
            key={index}
            className={`${styles.dot} ${index === currentIndex ? styles.active : ''}`}
          />
        ))}
      </View>
    </View>
  );
};

export default memo(Banner);
