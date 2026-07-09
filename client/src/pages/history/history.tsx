import { useEffect, useState } from 'react';
import { useShareAppMessage, useShareTimeline } from '@tarojs/taro';
import { View, Text } from '@tarojs/components';
import LiteLoading from '@/components/lite-loading';
import PostList from '@/components/post-list';
import Icon from '@/components/icon';
import { getStorageSync } from '@/utils/storage';
import { formateDate } from '@/utils/index';
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
      path: '/pages/history/history',
      imageUrl: DEFAULT_SHARE_IMAGE,
      webpageUrl: '',
      userName: '',
      imagePath: '',
      withShareTicket: false,
      miniprogramType: 0,
      scene: 0,
    };
  });

  const renderInfoList = (item: IHistoryItem) => {
    return (
      <>
        <View className={styles.infoItem}>
          <Icon name='icontime-circle' style={{ marginRight: 2 }} />
          <Text>{formateDate(item.updated)}</Text>
        </View>
      </>
    );
  };

  return (
    <View className={styles}>
      {histories.length > 0
        ? histories
            .reverse()
            .map((item) => (
              <PostList
                key={item.slug}
                cover={item.cover}
                title={item.title}
                slug={item.slug}
                excerpt={item.excerpt}
                infoList={renderInfoList(item)}
              />
            ))
        : null}
      <LiteLoading text='~' />
    </View>
  );
};

export default History;