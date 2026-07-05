import { useEffect, useState } from 'react';
import { useReachBottom, showToast } from '@tarojs/taro';
import { View, Text, Button } from '@tarojs/components';
import LiteLoading from '@/components/lite-loading';
import PostList from '@/components/post-list';
import Icon from '@/components/icon';
import { getUserInfo, requestUserProfile } from '@/utils/index';
import AV from 'leancloud-storage/dist/av-weapp.js';
import { leancloud } from '../../../config.json';
import { formateDate } from '@/utils/index';
import styles from './like.module.scss';

const { appId, appKey, serverURLs } = leancloud;
AV.init({ appId, appKey, serverURLs });
const pageSize = 20;

interface ILikeItem {
  cover: string;
  title: string;
  slug: string;
  excerpt: string;
  createdAt: string;
}

const Like = () => {
  const [list, setList] = useState<ILikeItem[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [count, setCount] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [hasUserInfo, setHasUserInfo] = useState<boolean>(false);
  const [nickName, setNickName] = useState<string>('');

  useEffect(() => {
    checkUserInfo();
  }, []);

  useReachBottom(() => {
    if (!hasMore || !hasUserInfo) return;
    setCurrentPage(currentPage + 1);
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
    AV.Query.doCloudQuery(
      `select count(*), * from Like where nickName = '${userNickName}' limit ${
        currentPage * pageSize
      },${pageSize} order by createdAt desc`
    )
      .then(({ results, count }) => {
        setList(
          list.concat(
            results.map((item) => {
              const temp = item.attributes;
              temp.createdAt = item.createdAt;
              return temp;
            })
          )
        );
        setCount(count);
        if (count <= (currentPage + 1) * pageSize) {
          setHasMore(false);
        }
      })
      .catch();
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
