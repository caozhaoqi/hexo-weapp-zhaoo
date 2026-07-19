import { useEffect, useState, useMemo } from 'react';
import { useShareAppMessage, useShareTimeline } from '@tarojs/taro';
import { View, Text } from '@tarojs/components';
import LiteLoading from '@/components/lite-loading';
import PostList from '@/components/post-list';
import { getStorageSync } from '@/utils/storage';
import styles from './history.module.scss';

const DEFAULT_SHARE_IMAGE = 'https://pic3.zhimg.com/80/v2-5f7cb7e900b9dcf5354c3d4d2c5cc3c2_1440w.webp';

interface IHistoryItem {
  cover: string;
  title: string;
  slug: string;
  excerpt: string;
  updated: string;
}

const History = () => {
  const [histories, setHistories] = useState<IHistoryItem[]>([]);

  useEffect(() => {
    setHistories(getStorageSync('history'));
  }, []);

  useShareTimeline(() => {
    return {
      title: '浏览历史',
      imageUrl: DEFAULT_SHARE_IMAGE,
    };
  });

  useShareAppMessage(() => {
    return {
      title: '浏览历史',
      path: '/pages/extra/history/history',
      imageUrl: DEFAULT_SHARE_IMAGE,
      webpageUrl: '',
      userName: '',
      imagePath: '',
      withShareTicket: false,
      miniprogramType: 0,
      scene: 0,
    };
  });

  const sortedHistories = useMemo(() => {
    if (!histories || histories.length === 0) return [];
    return [...histories].reverse();
  }, [histories]);

  return (
    <View className={styles.history}>
      {sortedHistories.length > 0
        ? sortedHistories.map((item, index) => (
              <PostList
                key={item.slug}
                index={index}
                cover={item.cover}
                title={item.title}
                slug={item.slug}
                excerpt={item.excerpt}
                date={item.updated}
              />
            ))
        : (
          <View className={styles.emptyWrapper}>
            <Text className={styles.emptyIcon}>📖</Text>
            <Text className={styles.emptyText}>暂无浏览记录</Text>
            <Text className={styles.emptyHint}>浏览过的文章会出现在这里</Text>
          </View>
        )}
      {sortedHistories.length > 0 && <LiteLoading text='~' />}
    </View>
  );
};

export default History;