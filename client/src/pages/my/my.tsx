import { useState, useEffect } from 'react';
import Taro, { useShareAppMessage, useShareTimeline, showToast } from '@tarojs/taro';
import {
  View,
  Image,
  OpenData,
  Text,
  Button,
  OfficialAccount,
} from '@tarojs/components';
import Icon from '@/components/icon';
import List from '@/components/list';
import Donate from '@/components/donate';
import ColorSwitch from '@/components/color-switch';
import { get } from '@/apis/request';
import { webUrl, motto } from '../../../config.json';
import { getUserInfo, requestUserProfile } from '@/utils/index';
import { clearStorageSync } from '@/utils/storage';
import styles from './my.module.scss';
import defaultAvatar from '@/assets/images/avatar.png';

const DEFAULT_SHARE_IMAGE = '/assets/images/logo.png';

const My = () => {
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [mottoText, setMottoText] = useState<string>(motto.default);
  const [motion, setMotion] = useState<[number, number]>([0, 0]);
  const [hasUserInfo, setHasUserInfo] = useState<boolean>(false);
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
      setHasUserInfo(true);
    }
  };

  const handleLogin = async () => {
    try {
      const userInfo = await requestUserProfile();
      setNickName(userInfo.nickName);
      setAvatarUrl(userInfo.avatarUrl);
      setHasUserInfo(true);
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

  const handleClearCache = () => {
    Taro.showModal({
      title: '清理缓存',
      content: '确定要清理所有缓存吗？清理后需要重新加载数据。',
      success: (res) => {
        if (res.confirm) {
          clearStorageSync();
          showToast({
            icon: 'success',
            title: '缓存清理成功',
            duration: 2000,
          });
        }
      },
    });
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

  const banner3d = () => {
    Taro.startDeviceMotionListening({
      success: () => {
        Taro.onDeviceMotionChange((res: any) => {
          const { beta, gamma } = res;
          setMotion([gamma, beta]);
        });
      },
      interval: 'ui',
    });
  };

  const fetchMotto = () => {
    get(motto.api, {}, {}, false)
      .then((res: string) => setMottoText(res))
      .catch();
  };

  const bgStyle = {
    transform: `translateX(${motion[0] / 9}px)`
  };

  const bannerStyle = {
    transform: `translate(${-motion[0] / 9}px, ${-motion[1] / 9}px)`
  };

  return (
    <>
      <OfficialAccount className={styles.officialAccount} />
      <View className={styles.my}>
        <View className={styles.userWrapper}>
          <Image
            className={styles.backgroundImage}
            src='https://pic4.zhimg.com/80/v2-e434e3a2888fb4efb1844845b8791d1f_1440w.webp'
            style={bgStyle}
          />
          <View className={styles.user}>
            {
              <>
                <View className={styles.avatar}>
                  <Image
                    src={avatarUrl || defaultAvatar}
                    className={styles.avatarImage}
                    mode='aspectFill'
                  />
                </View>
                <View className={styles.userContent}>
                  <View className={styles.nickname}>
                    <Text>{nickName}</Text>
                  </View>
                  <Text className={styles.motto}>{mottoText}</Text>
                </View>
              </>
            }
          </View>
        </View>
        <View className={styles.tabnav} style={bannerStyle}>
          <View
            className={styles.tabnavItem}
            onClick={() => Taro.navigateTo({ url: `/pages/history/history` })}
          >
            <Icon type='image' name='tag' size={30} />
            <Text className={styles.text}>收藏</Text>
          </View>
          <View className={styles.divide} />
          <View
            className={styles.tabnavItem}
            onClick={() => Taro.navigateTo({ url: `/pages/like/like` })}
          >
            <Icon type='image' name='like' size={30} />
            <Text className={styles.text}>喜欢</Text>
          </View>
          {/* <View className={styles.divide} /> */}
          {/* <View
            className={styles.tabnavItem}
            onClick={() => {
              // setModalVisible(true);
              setMottoText('');
            }}
          >
            <Icon type='image' name='reward' size={30} />
            <Text className={styles.text}>打赏</Text>
          </View> */}
          {/* <View className={styles.divide} /> */}
          {/* <Button
            className={styles.tabnavItem}
            openType='share'
            style={{
              padding: 0,
              backgroundColor: '#ffffff',
              lineHeight: '1em',
            }}
          >
            <Icon type='image' name='share' size={30} />
            <Text className={styles.text}>分享</Text>
          </Button> */}
        </View>
        <View className={styles.listWrapper}>
          <List title='夜间模式' icon='moon' rightChildren={<ColorSwitch />} />
          <List
            title='浏览历史'
            icon='time'
            arrow
            onClick={() => Taro.navigateTo({ url: `/pages/history/history` })}
          />
          {/* <List
            title='网页博客'
            icon='cloud'
            arrow
            onClick={() =>
              Taro.navigateTo({
                url: `/pages/webview/webview?url=${encodeURIComponent(webUrl)}`,
              })
            }
          /> */}
           <List
            title='清理缓存'
            icon='close-circle'
            arrow
            onClick={handleClearCache}
          />
          <List
            title='相册'
            icon='earth'
            arrow
            onClick={() => Taro.navigateTo({ url: `/pages/gallery/gallery?name=摄影作品` })}
          />
          <List
            title='关于应用'
            icon='info-circle'
            arrow
            onClick={() => Taro.navigateTo({ url: `/pages/about/about` })}
          />
   
        </View>
      </View>
      <Donate visible={modalVisible} setVisible={setModalVisible} />
    </>
  );
};

export default My;