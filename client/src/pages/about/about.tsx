import Taro, { useShareAppMessage, useShareTimeline } from '@tarojs/taro';
import { View, Image, Text } from '@tarojs/components';
import List from '@/components/list';
import logo from '@/assets/images/logo.png';
import styles from './about.module.scss';

const DEFAULT_SHARE_IMAGE = '/assets/images/logo.png';

const About = () => {
  useShareTimeline(() => {
    return {
      title: '关于应用',
      imageUrl: DEFAULT_SHARE_IMAGE,
    };
  });

  useShareAppMessage(() => {
    return {
      title: '关于应用',
      path: '/pages/about/about',
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
    <View className={styles.about}>
      <Image className={styles.logo} src={logo} mode='aspectFill' />
      <Text className={styles.title}>Arona static blog</Text>
      <View className={styles.listWrapper}>
        <List
          title='GitHub'
          icon='github'
          arrow
          extraText='Arona'
          onClick={() =>
            Taro.navigateTo({
              url: `/pages/webview/webview?url=https://caozhaoqi.github.io`,
            })
          }
        />
        {/* <List
          title='QQ群'
          icon='QQ'
          arrow
          extraText='550262893'
          onClick={
            () =>
              Taro.setClipboardData({
                data: 'https://qm.qq.com/cgi-bin/qm/qr?k=L0VjfLZ0MAzSuCjmrSf5H37FiVCndnA2&jump_from=webapi',
              })
            // Taro.navigateTo({
            //   url: `/pages/webview/webview?url=https://qm.qq.com/cgi-bin/qm/qr?k=L0VjfLZ0MAzSuCjmrSf5H37FiVCndnA2&jump_from=webapi`,
            // })
          }
        /> */}
      </View>
    </View>
  );
};

export default About;
