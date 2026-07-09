import { useShareAppMessage, useShareTimeline } from '@tarojs/taro';
import { ScrollView, View, Text, Input, Image } from '@tarojs/components';
import usePagination from '@/hooks/usePagination';
import PostItem from '@/components/post-item';
import LiteLoading from '@/components/lite-loading';
import Skeleton from '@/components/skeleton';
import { useState, useEffect } from 'react';
import { getGalleries } from '@/apis/api';
import { IGalleryItem } from '@/types/gallery';
import './home.scss';
import Taro from '@tarojs/taro';

const DEFAULT_SHARE_IMAGE = '/assets/images/logo.png';

const DEFAULT_GALLERIES: IGalleryItem[] = [
  {
    name: '摄影作品',
    cover: 'https://pica.zhimg.com/80/v2-61f99f8dcf899f54cad2a1aa28b21e44_1440w.webp',
    description: '精选摄影作品',
    count: 12,
    photos: [
    'https://p3.music.126.net/bQ0yDljE0g32N7AvAs3P_A==/109951170542138279.jpg?param=300y300',
    'https://caozhaoqi.github.io/medias/logo.png',
    'https://cdn.jsdelivr.net/gh/fghrsh/live2d_api/model/Potion-Maker/Pio/textures/default-costume.png',
    'https://img10.360buyimg.com/ddimg/jfs/t1/166587/8/21344/72069/6088c24fEda5fdeb6/f9730ab637b7ca47.png',
    'https://picx.zhimg.com/80/v2-85c31120acff76826ab53ea8934ef4bb_1440w.webp',
    'https://pic3.zhimg.com/80/v2-e5c15010b8ba4608a1974403a02a2da0_1440w.webp',
    'https://pica.zhimg.com/80/v2-61f99f8dcf899f54cad2a1aa28b21e44_1440w.webp',
    'https://pic1.zhimg.com/80/v2-03a22891ccba9bccf6424dfd7cbf4be7_1440w.webp',
    'https://pic3.zhimg.com/80/v2-5f7cb7e900b9dcf5354c3d4d2c5cc3c2_1440w.webp',
    'https://pic4.zhimg.com/80/v2-e434e3a2888fb4efb1844845b8791d1f_1440w.webp',
    'https://pic3.zhimg.com/80/v2-e5c15010b8ba4608a1974403a02a2da0_1440w.webp',
    'https://pic2.zhimg.com/80/v2-29e78b52051ce542adf6d786d61fbd19_1440w.webp',
    ],
  },
];

const Home = () => {
  const [posts, hasMore, isLoading, { allTags, sortBy, setSortBy, selectedTag, setSelectedTag, searchKeyword, setSearchKeyword }] = usePagination();
  const [galleries, setGalleries] = useState<IGalleryItem[]>([]);

  useEffect(() => {
    fetchGalleries();
  }, []);

  const fetchGalleries = async () => {
    try {
      const res = await getGalleries();
      if (res && Array.isArray(res) && res.length > 0) {
        setGalleries(res);
      } else {
        setGalleries(DEFAULT_GALLERIES);
      }
    } catch (e) {
      console.error('[相册] 请求异常:', e);
      setGalleries(DEFAULT_GALLERIES);
    }
  };

  const handleGalleryClick = (name: string) => {

    Taro.navigateTo({
      url: `/pages/gallery/gallery?name=${name}`,
    });
  };

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
      <View className='search-bar'>
        <Input
          className='search-input'
          placeholder='搜索文章标题、内容或标签'
          value={searchKeyword}
          onInput={(e: any) => setSearchKeyword(e.detail.value)}
          type='text'
        />
      </View>
      <View className='sort-bar'>
        <View
          className={`sort-item ${sortBy === 'latest' ? 'active' : ''}`}
          onClick={() => setSortBy('latest')}
        >
          <Text>最新发布</Text>
        </View>
        <View
          className={`sort-item ${sortBy === 'earliest' ? 'active' : ''}`}
          onClick={() => setSortBy('earliest')}
        >
          <Text>最早发布</Text>
        </View>
      </View>

      {posts.length > 0 ? (
        posts.map((item, index: number) => (
          <PostItem data={item} key={index} index={index} />
        ))
      ) : isLoading ? (
        <Skeleton loading={true} />
      ) : null}
      {!hasMore && posts.length === 0 ? <LiteLoading text='暂无相关文章' /> : null}
      {!hasMore && posts.length > 0 ? <LiteLoading text='忍把浮名去了，换作浅斟低唱~' /> : null}
    </ScrollView>
  );
};

export default Home;
