import { FC, memo } from 'react';
import { View, Text } from '@tarojs/components';
import Icon from '@/components/icon';
import styles from './index.module.scss';

interface ILiteLoading {
  text?: string;
  icon?: string;
  loading?: boolean;
}

const LiteLoading: FC<ILiteLoading> = ({ text, icon, loading = false }) => {
  return (
    <View className={styles.liteLoad}>
      {loading ? (
        <View className={styles.dots}>
          <View className={styles.dot} />
          <View className={styles.dot} />
          <View className={styles.dot} />
        </View>
      ) : icon ? (
        <Icon type='image' name={icon} size={18} />
      ) : null}
      <Text className={styles.text}>{text || '加载中...'}</Text>
    </View>
  );
};

export default memo(LiteLoading);
