import { useState, useEffect } from 'react';
import Taro, { useShareAppMessage, useShareTimeline } from '@tarojs/taro';
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
import styles from './my.module.scss';

const DEFAULT_SHARE_IMAGE = '/assets/images/logo.png';

const My = () => {
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [mottoText, setMottoText] = useState<string>(motto.default);
  const [motion, setMotion] = useState<[number, number]>([0, 0]);

  useEffect(() => {
    fetchMotto();
  }, []);

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
      userName: '',
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
            <View className={styles.avatar}>
              <OpenData type='userAvatarUrl' lang='zh_CN' />
            </View>
            <View className={styles.userContent}>
              <View className={styles.nickname}>
                <OpenData type='userNickName' lang='zh_CN' defaultText='用户' />
              </View>
              <Text className={styles.motto}>{mottoText}</Text>
            </View>
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
          <View className={styles.divide} />
          <View
            className={styles.tabnavItem}
            onClick={() => {
              // setModalVisible(true);
              setMottoText('');
            }}
          >
            <Icon type='image' name='reward' size={30} />
            <Text className={styles.text}>打赏</Text>
          </View>
          <View className={styles.divide} />
          <Button
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
          </Button>
        </View>
        <View className={styles.listWrapper}>
          <List title='夜间模式' icon='moon' rightChildren={<ColorSwitch />} />
          <List
            title='全部评论'
            icon='message'
            arrow
            onClick={() => Taro.navigateTo({ url: `/pages/comment/comment` })}
          />
          <List
            title='浏览历史'
            icon='time'
            arrow
            onClick={() => Taro.navigateTo({ url: `/pages/history/history` })}
          />
          <List
            title='网页博客'
            icon='cloud'
            arrow
            onClick={() =>
              Taro.setClipboardData({
                data: webUrl,
              })
            }
          />
          <List
            title='实验功能'
            icon='experiment'
            arrow
            onClick={() =>
              Taro.navigateTo({ url: `/pages/laboratory/laboratory` })
            }
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