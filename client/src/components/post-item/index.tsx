import { FC, useMemo } from 'react';
import Taro from '@tarojs/taro';
import { View, Text } from '@tarojs/components';
import { IPostItem } from '@/types/post';
import { baseUrl } from '../../../config.json';
import LazyImage from '@/components/lazy-image';
import styles from './index.module.scss';

const DEFAULT_COVERS = [
  'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=800&h=400&fit=crop',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&h=400&fit=crop',
  'https://images.unsplash.com/photo-1467232004584-aec21b5b7c61?w=800&h=400&fit=crop',
  'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&h=400&fit=crop',
  'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&h=400&fit=crop',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=400&fit=crop',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=400&fit=crop',
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&h=400&fit=crop',
];

const getDefaultCover = (index: number): string => {
  return DEFAULT_COVERS[index % DEFAULT_COVERS.length];
};

const getImageUrl = (src: string, index: number): string => {
  if (!src) return getDefaultCover(index);
  const decodedSrc = decodeURIComponent(src);
  if (decodedSrc.startsWith('http://') || decodedSrc.startsWith('https://')) {
    if (decodedSrc.includes('czq-blog.oss-cn-beijing.aliyuncs.com')) {
      const cleanUrl = decodedSrc.split('?')[0];
      return cleanUrl;
    }
    return decodedSrc;
  }
  const baseHost = baseUrl.replace('/api', '');
  return baseHost + decodedSrc;
};

interface IPostItemProps {
  data: IPostItem;
  index?: number;
}

const PostItem: FC<IPostItemProps> = ({ data, index = 0 }) => {
  const { title = '', cover, excerpt = '', slug, top } = data;
  const coverUrl = useMemo(() => getImageUrl(cover, index), [cover, index]);
  
  return (
    <View
      className={styles.postItem}
      onClick={() => Taro.navigateTo({ url: `/pages/post/post?slug=${slug}` })}
    >
      {top ? <View className={styles.top} /> : null}
      <LazyImage
        className={styles.cover}
        src={coverUrl}
        mode='aspectFill'
      />
      <View className={styles.content}>
        <Text className={styles.title}>{title}</Text>
        <Text className={styles.excerpt}>{excerpt}</Text>
      </View>
    </View>
  );
};

export default PostItem;