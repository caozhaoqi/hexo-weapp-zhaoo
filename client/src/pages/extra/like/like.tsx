import { useEffect, useState } from 'react';
import { useReachBottom, showToast, useShareAppMessage, useShareTimeline } from '@tarojs/taro';
import { View, Text, Button } from '@tarojs/components';
import LiteLoading from '@/components/lite-loading';
import PostList from '@/components/post-list';
import { getUserInfo, requestUserProfile, getLikes, ILikeData } from '@/utils/index';
import styles from './like.module.scss';

const DEFAULT_SHARE_IMAGE = 'https://pic3.zhimg.com/80/v2-5f7cb7e900b9dcf5354c3d4d2c5cc3c2_1440w.webp';

interface ILikeItem {
  cover: string;
  title: string;
  slug: string;
  excerpt: string;
  createdAt: string;
}

const Like = () => {
  const [list, setList] = useState<ILikeItem[]>([]);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [hasUserInfo, setHasUserInfo] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    checkUserInfo();
  }, []);

  useReachBottom(() => {
    if (!hasMore || !hasUserInfo) return;
  });

  useShareTimeline(() => {
    return {
      title: '我的收藏',
      imageUrl: DEFAULT_SHARE_IMAGE,
    };
  });

  useShareAppMessage(() => {
    return {
      title: '我的收藏',
      path: '/pages/extra/like/like',
      imageUrl: DEFAULT_SHARE_IMAGE,
      webpageUrl: '',
      userName: '',
      imagePath: '',
      withShareTicket: false,
      miniprogramType: 0,
      scene: 0,
    };
  });

  const checkUserInfo = async () => {
    const userInfo = await getUserInfo();
    if (userInfo) {
      setHasUserInfo(true);
      fetchData(userInfo.nickName);
    } else {
      setHasUserInfo(false);
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      const userInfo = await requestUserProfile();
      // setNickName(userInfo.nickName);
      // setAvatarUrl(userInfo.avatarUrl);
      setHasUserInfo(true);
      fetchData(userInfo.nickName);
      showToast({
        icon: 'success',
        title: '登录成功',
        duration: 2000,
      });
    } catch (e) {
      showToast({
        icon: 'none',
        title: '请授权登录',
        duration: 2000,
      });
    }
  };

  const fetchData = async (userNickName: string) => {
    const likes: ILikeData[] = getLikes();
    const userLikes = likes.filter((like) => like.nickName === userNickName);
    const sortedLikes = userLikes.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    setList(sortedLikes.map((item) => ({
      cover: item.cover,
      title: item.title,
      slug: item.slug,
      excerpt: item.excerpt,
      createdAt: item.createdAt,
    })));
    setHasMore(false);
    setLoading(false);
  };

  return (
    <View className={styles.like}>
      {!hasUserInfo ? (
        <View className={styles.loginWrapper}>
          <Button className={styles.loginButton} onClick={() => handleLogin()}>
            登录查看我的收藏
          </Button>
        </View>
      ) : list.length > 0 ? (
        list.map((item, index) => (
          <PostList
            key={item.slug}
            index={index}
            cover={item.cover}
            title={item.title}
            slug={item.slug}
            excerpt={item.excerpt}
            date={item.createdAt}
          />
        ))
      ) : (
        <View className={styles.emptyWrapper}>
          <Text className={styles.emptyIcon}>📭</Text>
          <Text className={styles.emptyText}>还没有收藏文章</Text>
          <Text className={styles.emptyHint}>浏览文章时点击❤️即可收藏</Text>
        </View>
      )}
      {hasUserInfo && (
        hasMore ? (
          loading && <LiteLoading text='正在加载...' icon='jingyu' />
        ) : list.length > 0 && (
          <LiteLoading text='忍把浮名去了，换作浅斟低唱' />
        )
      )}
    </View>
  );
};

export default Like;