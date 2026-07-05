import { useEffect, useState, FC } from 'react';
import Taro, { showToast, vibrateShort } from '@tarojs/taro';
import { View } from '@tarojs/components';
import Icon from '@/components/icon';
import { getUserInfo, requestUserProfile, filterHtml, addLike, removeLike, isLiked, ILikeData } from '@/utils/index';
import { IPostItem } from '@/types/post';
import styles from './index.module.scss';

interface IFabLikeProps {
  post: IPostItem;
  visible: boolean;
  active: boolean;
  canRemove?: boolean;
}

const FabLike: FC<IFabLikeProps> = ({
  post,
  visible,
  active,
  canRemove = true,
}) => {
  const [status, setStatus] = useState<boolean>(false);

  useEffect(() => {
    fetchCount();
  }, []);

  const fetchCount = async () => {
    const userInfo = await getUserInfo();
    if (!userInfo) return;
    const isUserLiked = isLiked(post.realPath || '', userInfo.nickName);
    setStatus(isUserLiked);
  };

  const handleLike = async () => {
    try {
      vibrateShort();
    } catch (e) {
      console.warn('vibrateShort not supported');
    }
    let userInfo = await getUserInfo();
    if (!userInfo) {
      try {
        userInfo = await requestUserProfile();
      } catch (e) {
        showToast({
          icon: 'none',
          title: '请授权登录',
          duration: 2000,
        });
        return;
      }
    }
    const { nickName, avatarUrl } = userInfo;
    if (status) {
      if (!canRemove) {
        showToast({
          icon: 'none',
          title: '小心心不可以收回哦~',
          duration: 2000,
        });
        return;
      }
      removeCount(nickName);
    } else {
      addCount(nickName, avatarUrl);
    }
    setTimeout(() => Taro.eventCenter.trigger('refreshLeancloud', 'Like'), 100);
  };

  const addCount = async (nickName: string, avatarUrl: string) => {
    const likeData: ILikeData = {
      nickName,
      avatarUrl,
      slug: post.slug,
      path: post.realPath || '',
      title: post.title,
      excerpt: post.excerpt || filterHtml(post.content || '').substr(0, 50),
      cover: post.cover,
      createdAt: new Date().toISOString(),
    };
    const success = addLike(likeData);
    if (success) {
      setStatus(true);
    }
  };

  const removeCount = async (nickName: string) => {
    const success = removeLike(post.realPath || '', nickName);
    if (success) {
      setStatus(false);
    }
  };

  return (
    <View
      className={`${styles.fabLike} ${visible ? styles.fabVisible : null} ${
        active ? styles.fabActive : null
      }`}
      onClick={() => handleLike()}
    >
      {status ? (
        <Icon size={20} name='iconheart-fill' style={{ color: '#eb3223' }} />
      ) : (
        <Icon size={20} name='iconheart' />
      )}
    </View>
  );
};

export default FabLike;