import { FC } from 'react';
import Taro from '@tarojs/taro';
import { View, Image, Text } from '@tarojs/components';
import { IPostItem } from '@/types/post';
import { baseUrl } from '../../../config.json';
import styles from './index.module.scss';

const DEFAULT_COVER = '/assets/images/logo.png';

const getImageUrl = (src: string): string => {
  if (!src) return DEFAULT_COVER;
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
}

const PostItem: FC<IPostItemProps> = ({ data }) => {
  const { title = '', cover, excerpt = '', slug, top } = data;
  const coverUrl = getImageUrl(cover);
  
  return (
    <View
      className={styles.postItem}
      onClick={() => Taro.navigateTo({ url: `/pages/post/post?slug=${slug}` })}
    >
      {top ? <View className={styles.top} /> : null}
      <Image
        className={styles.cover}
        src={coverUrl}
        lazyLoad
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