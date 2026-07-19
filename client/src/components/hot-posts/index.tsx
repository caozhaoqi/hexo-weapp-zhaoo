import { FC, memo, useMemo } from 'react';
import Taro from '@tarojs/taro';
import { View, Text } from '@tarojs/components';
import { IPostItem } from '@/types/post';
import { baseUrl } from '../../../config.json';
import styles from './index.module.scss';

const getImageUrl = (src: string): string => {
  if (!src) return '';
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

interface IHotPostsProps {
  posts: IPostItem[];
  limit?: number;
}

const HotPosts: FC<IHotPostsProps> = ({ posts, limit = 5 }) => {
  const hotPosts = useMemo(() => {
    return posts
      .filter((post) => post.top)
      .sort((a, b) => (b.top || 0) - (a.top || 0))
      .slice(0, limit);
  }, [posts, limit]);

  const handleClick = (slug: string) => {
    Taro.navigateTo({ url: `/pages/post/post?slug=${slug}` });
  };

  if (hotPosts.length === 0) return null;

  return (
    <View className={styles.hotPosts}>
      <View className={styles.header}>
        <View className={styles.titleWrapper}>
          <Text className={styles.icon}>🔥</Text>
          <Text className={styles.title}>热门文章</Text>
        </View>
      </View>
      <View className={styles.list}>
        {hotPosts.map((post, index) => {
          const coverUrl = getImageUrl(post.cover);
          return (
            <View
              key={post.slug || index}
              className={styles.item}
              onClick={() => handleClick(post.slug)}
            >
              <View className={styles.rank}>
                <Text className={`${styles.rankText} ${index < 3 ? styles.topThree : ''}`}>
                  {index + 1}
                </Text>
              </View>
              <View className={styles.info}>
                <Text className={styles.postTitle}>{post.title}</Text>
                <Text className={styles.postExcerpt}>{post.excerpt}</Text>
              </View>
              {coverUrl && (
                <View className={styles.coverWrapper}>
                  {/* <Image className={styles.cover} src={coverUrl} mode='aspectFill' lazyLoad /> */}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default memo(HotPosts);
