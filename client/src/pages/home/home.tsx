import { useShareAppMessage, useShareTimeline } from '@tarojs/taro';
import { ScrollView } from '@tarojs/components';
import usePagination from '@/hooks/usePagination';
import PostItem from '@/components/post-item';
import LiteLoading from '@/components/lite-loading';
import './home.scss';

const DEFAULT_SHARE_IMAGE = '/assets/images/logo.png';

const Home = () => {
  const [posts, hasMore, isLoading] = usePagination();

  useShareTimeline(() => {
    return {
      title: 'Arona share a post to you！',
      imageUrl: DEFAULT_SHARE_IMAGE,
    };
  });

  useShareAppMessage(() => {
    return {
      title: 'Arona share a post to you！',
      path: '/pages/home/home',
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
    <ScrollView className='home' scrollY scrollX={false}>
      {posts.length > 0
        ? posts.map((item, index: number) => (
            <PostItem data={item} key={index} />
          ))
        : null}
      {isLoading ? <LiteLoading text='正在加载...' icon='jingyu' /> : null}
      {!hasMore ? <LiteLoading text='忍把浮名去了，换作浅斟低唱~' /> : null}
    </ScrollView>
  );
};

export default Home;