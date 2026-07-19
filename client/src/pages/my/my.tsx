import { useState, useEffect, useCallback, memo } from 'react';
import Taro, { useShareAppMessage, useShareTimeline } from '@tarojs/taro';
import {
  View,
  Image,
  Text,
  OfficialAccount,
} from '@tarojs/components';
import Icon from '@/components/icon';
import List from '@/components/list';
import Donate from '@/components/donate';
import ColorSwitch from '@/components/color-switch';
import { get } from '@/apis/request';
import { motto } from '../../../config.json';
import { getUserInfo } from '@/utils/index';
import styles from './my.module.scss';
import defaultAvatar from '@/assets/images/avatar.png';

const DEFAULT_SHARE_IMAGE = '/assets/images/logo.png';

const My = () => {
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [mottoText, setMottoText] = useState<string>(motto.default);
  const [nickName, setNickName] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');

  useEffect(() => {
    fetchMotto();
    checkUserInfo();
  }, []);

  const checkUserInfo = async () => {
    const userInfo = await getUserInfo();
    if (userInfo) {
      setNickName(userInfo.nickName);
      setAvatarUrl(userInfo.avatarUrl);
    }
  };

  useShareTimeline(() => {
    return {
      title: '我的主页',
      imageUrl: DEFAULT_SHARE_IMAGE,
    };
  });

  useShareAppMessage(() => {
    return {
      title: '我的主页',
      path: '/pages/my/my',
      imageUrl: DEFAULT_SHARE_IMAGE,
      webpageUrl: '',
      userName: 'Arona',
      imagePath: '',
      withShareTicket: false,
      miniprogramType: 0,
      scene: 0,
    };
  });

  const fetchMotto = () => {
    get(motto.api, {}, {}, false)
      .then((res: string) => setMottoText(res))
      .catch();
  };

  // 稳定的导航回调，避免每次渲染重建
  const goToHistory = useCallback(() => Taro.navigateTo({ url: '/pages/extra/history/history' }), []);
  const goToLike = useCallback(() => Taro.navigateTo({ url: '/pages/extra/like/like' }), []);
  const goToGallery = useCallback(() => Taro.navigateTo({ url: '/pages/gallery/gallery?name=摄影作品' }), []);
  const goToDeveloper = useCallback(() => Taro.navigateTo({ url: '/pages/extra/developer/developer' }), []);
  const goToAbout = useCallback(() => Taro.navigateTo({ url: '/pages/extra/about/about' }), []);

  return (
    <>
      <OfficialAccount className={styles.officialAccount} />
      <View className={styles.my}>
        <View className={styles.userWrapper}>
          <Image
            className={styles.backgroundImage}
            src='https://pic4.zhimg.com/80/v2-e434e3a2888fb4efb1844845b8791d1f_1440w.webp'
            lazyLoad
          />
          <View className={styles.bgOverlay} />
          <View className={styles.user}>
            <View className={styles.avatar}>
              <Image
                src={avatarUrl || defaultAvatar}
                className={styles.avatarImage}
                mode='aspectFill'
              />
            </View>
            <View className={styles.userContent}>
              <View className={styles.nickname}>
                <Text>{nickName || 'Arona'}</Text>
              </View>
              <Text className={styles.motto}>{mottoText}</Text>
            </View>
          </View>
        </View>
        <View className={styles.tabnav}>
          <View className={styles.tabnavItem} onClick={goToHistory}>
            <Icon type='image' name='tag' size={30} />
            <Text className={styles.text}>收藏</Text>
          </View>
          <View className={styles.divide} />
          <View className={styles.tabnavItem} onClick={goToLike}>
            <Icon type='image' name='like' size={30} />
            <Text className={styles.text}>喜欢</Text>
          </View>
        </View>
        <View className={styles.listWrapper}>
          <List title='夜间模式' icon='moon' rightChildren={<ColorSwitch />} />
          <List
            title='浏览历史'
            icon='time'
            arrow
            onClick={goToHistory}
          />
          <List
            title='相册'
            icon='earth'
            arrow
            onClick={goToGallery}
          />
          <List
            title='开发者功能'
            icon='experiment'
            arrow
            onClick={goToDeveloper}
          />
          <List
            title='关于应用'
            icon='info-circle'
            arrow
            onClick={goToAbout}
          />
        </View>
      </View>
      <Donate visible={modalVisible} setVisible={setModalVisible} />
    </>
  );
};

export default memo(My);
