import { useEffect, useState } from 'react';
import { useReachBottom, showToast, useShareAppMessage, useShareTimeline } from '@tarojs/taro';
import { View, Text, Button } from '@tarojs/components';
import LiteLoading from '@/components/lite-loading';
import PostList from '@/components/post-list';
import Icon from '@/components/icon';
import { getUserInfo, requestUserProfile, getLikes, ILikeData } from '@/utils/index';
import { formateDate } from '@/utils/index';
import styles from './like.module.scss';

const DEFAULT_SHARE_IMAGE = '/assets/images/logo.png';

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
  const [nickName, setNickName] = useState<string>('');

  useEffect(() => {
    // checkUserInfo();
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
      path: '/pages/like/like',
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
      setNickName(userInfo.nickName);
      setHasUserInfo(true);
      fetchData(userInfo.nickName);
    }
  };

  const handleLogin = async () => {
    try {
      const userInfo = await requestUserProfile();
      setNickName(userInfo.nickName);
      setHasUserInfo(true);
      fetchData(userInfo.nickName);
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
  };

  const renderInfoList = (item: ILikeItem) => {
    return (
      <>
        <View className={styles.infoItem}>
          <Icon name='icontime-circle' style={{ marginRight: 2 }} />
          <Text>{formateDate(item.createdAt)}</Text>
        </View>
      </>
    );
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
        list.map((item) => (
          <PostList
            key={item.slug}
            cover={item.cover}
            title={item.title}
            slug={item.slug}
            excerpt={item.excerpt}
            infoList={renderInfoList(item)}
          />
        ))
      ) : null}
      {hasUserInfo && (hasMore ? (
        <LiteLoading text='正在加载...' icon='jingyu' />
      ) : (
        <LiteLoading text='忍把浮名去了，换作浅斟低唱' />
      ))}
    </View>
  );
};

export default Like;