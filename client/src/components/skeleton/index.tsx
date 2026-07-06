import React from 'react';
import styles from './skeleton.module.scss';
import { View, Text } from '@tarojs/components';
interface SkeletonProps {
  loading?: boolean;
  children?: React.ReactNode;
}

const Skeleton: React.FC<SkeletonProps> = ({ loading, children }) => {
  if (!loading) {
    return <>{children}</>;
  }

  return (
    <View className={styles.skeleton}>
      {[1, 2, 3].map((index) => (
        <View key={index} className={styles.card}>
          <View className={styles.image} />
          <View className={styles.content}>
            <View className={styles.title} />
            <View className={styles.line} />
            <View className={styles.line} />
          </View>
        </View>
      ))}
    </View>
  );
};

export const SkeletonCard: React.FC = () => (
  <View className={styles.card}>
    <View className={styles.image} />
    <View className={styles.content}>
      <View className={styles.title} />
      <View className={styles.line} />
      <View className={styles.line} />
    </View>
  </View>
);

export const SkeletonText: React.FC<{ lines?: number }> = ({ lines = 3 }) => (
  <View className={styles.textSkeleton}>
    {Array.from({ length: lines }).map((_, index) => (
      <View key={index} className={styles.line} />
    ))}
  </View>
);

export const SkeletonAvatar: React.FC = () => (
  <View className={styles.avatar} />
);

export default Skeleton;
