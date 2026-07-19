import { FC, ReactNode, memo, useMemo } from 'react';
import Taro from '@tarojs/taro';
import { View, Image, Text } from '@tarojs/components';
import Icon from '@/components/icon';
import { getImageUrl, getDefaultCover, formateDate } from '@/utils/index';
import styles from './index.module.scss';

interface IPostListProps {
  slug: string;
  cover: string;
  title: string;
  excerpt: string;
  infoList?: ReactNode;
  date?: string;
  index?: number;
}

const PostList: FC<IPostListProps> = ({
  slug,
  cover,
  title,
  excerpt,
  infoList,
  date,
  index = 0,
}) => {
  const coverUrl = useMemo(
    () => getImageUrl(cover, getDefaultCover(index)),
    [cover, index]
  );

  return (
    <View
      className={styles.postList}
      onClick={() => {
        Taro.navigateTo({ url: `/pages/post/post?slug=${slug}` });
      }}
    >
      <Image className={styles.cover} src={coverUrl} lazyLoad mode='aspectFill' />
      <View className={styles.content}>
        <Text className={styles.title}>{title}</Text>
        <View className={styles.excerpt}>
          <Text>{excerpt}</Text>
        </View>
        <View className={styles.info}>
          {infoList || (date && (
            <View className={styles.infoItem}>
              <Icon name='icontime-circle' style={{ marginRight: 2 }} />
              <Text>{formateDate(date)}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

export default memo(PostList);
