import { useShareAppMessage, useShareTimeline } from '@tarojs/taro';
import { View, Image } from '@tarojs/components';
import waitting from '@/assets/illustration/waitting.svg';
import styles from './laboratory.module.scss';

const DEFAULT_SHARE_IMAGE = '/assets/images/logo.png';

const Laboratory = () => {
  useShareTimeline(() => {
    return {
      title: '实验功能',
      imageUrl: DEFAULT_SHARE_IMAGE,
    };
  });

  useShareAppMessage(() => {
    return {
      title: '实验功能',
      path: '/pages/laboratory/laboratory',
      imageUrl: DEFAULT_SHARE_IMAGE,
      webpageUrl: '',
      userName: '',
      imagePath: '',
      withShareTicket: false,
      miniprogramType: 0,
      scene: 0,
    };
  });

  return (
    <View className={styles.laboratory}>
      <Image src={waitting} mode='aspectFill' />
    </View>
  );
};

export default Laboratory;
