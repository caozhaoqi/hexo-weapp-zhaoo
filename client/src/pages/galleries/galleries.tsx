import { useState, useEffect } from 'react';
import { useShareTimeline, useShareAppMessage } from '@tarojs/taro';
import { View, Text } from '@tarojs/components';
import GalleryItem from '@/components/gallery-item';
import { getGalleries } from '@/apis/api';
import { IGalleryItem } from '@/types/gallery';
import './galleries.scss';

const DEFAULT_SHARE_IMAGE = '/assets/images/logo.png';

const DEFAULT_GALLERIES: IGalleryItem[] = [
  {
    name: '摄影作品',
    cover: 'https://caozhaoqi.github.io/images/gallery/1.jpg',
    description: '精选摄影作品',
    count: 12,
    photos: [
      'https://caozhaoqi.github.io/images/gallery/1.jpg',
      'https://caozhaoqi.github.io/images/gallery/2.jpg',
      'https://caozhaoqi.github.io/images/gallery/3.jpg',
      'https://caozhaoqi.github.io/images/gallery/4.jpg',
      'https://caozhaoqi.github.io/images/gallery/5.jpg',
      'https://caozhaoqi.github.io/images/gallery/6.jpg',
      'https://caozhaoqi.github.io/images/gallery/7.jpg',
      'https://caozhaoqi.github.io/images/gallery/8.jpg',
      'https://caozhaoqi.github.io/images/gallery/9.jpg',
      'https://caozhaoqi.github.io/images/gallery/10.jpg',
      'https://caozhaoqi.github.io/images/gallery/11.jpg',
      'https://caozhaoqi.github.io/images/gallery/12.jpg',
    ],
  },
];

const Galleries = () => {
  const [galleries, setGalleries] = useState<IGalleryItem[]>([]);
  const [isError, setIsError] = useState<boolean>(false);

  useEffect(() => {
    fetchGalleriesData();
  }, []);

  const fetchGalleriesData = async () => {
    try {
      const res = await getGalleries();
      if (res && Array.isArray(res) && res.length > 0) {
        setGalleries(res);
      } else {
        setGalleries(DEFAULT_GALLERIES);
      }
    } catch (e) {
      setGalleries(DEFAULT_GALLERIES);
      setIsError(true);
    }
  };

  useShareTimeline(() => {
    return {
      title: '相册',
      imageUrl: galleries.length > 0 ? galleries[0].cover || DEFAULT_SHARE_IMAGE : DEFAULT_SHARE_IMAGE,
    };
  });

  useShareAppMessage(() => {
    return {
      title: '相册',
      path: '/pages/galleries/galleries',
      imageUrl: galleries.length > 0 ? galleries[0].cover || DEFAULT_SHARE_IMAGE : DEFAULT_SHARE_IMAGE,
      webpageUrl: '',
      userName: '',
      imagePath: '',
      withShareTicket: false,
      miniprogramType: 0,
      scene: 0,
    };
  });

  return (
    <View className='galleries'>
      {galleries.length > 0 ? (
        galleries.map((item, index: number) => (
          <GalleryItem data={item} key={index} />
        ))
      ) : (
        <View className='empty'>
          <Text>暂无相册</Text>
        </View>
      )}
    </View>
  );
};

export default Galleries;