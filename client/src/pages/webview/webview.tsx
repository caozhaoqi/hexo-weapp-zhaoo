import Taro, { useShareAppMessage, useShareTimeline } from '@tarojs/taro';
import { WebView } from '@tarojs/components';

const DEFAULT_SHARE_IMAGE = '/assets/images/logo.png';

const Webview = () => {
  const { url } = Taro.getCurrentInstance()?.router?.params || {};

  useShareTimeline(() => {
    return {
      title: '网页浏览',
      imageUrl: DEFAULT_SHARE_IMAGE,
    };
  });

  useShareAppMessage(() => {
    return {
      title: '网页浏览',
      path: '/pages/webview/webview',
      imageUrl: DEFAULT_SHARE_IMAGE,
      webpageUrl: '',
      userName: '',
      imagePath: '',
      withShareTicket: false,
      miniprogramType: 0,
      scene: 0,
    };
  });

  return <WebView src={url || ''} />;
};

export default Webview;
