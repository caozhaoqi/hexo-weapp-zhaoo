import { useState, useEffect } from 'react';
import { useShareTimeline, useShareAppMessage } from '@tarojs/taro';
import { View, Text } from '@tarojs/components';
import GalleryItem from '@/components/gallery-item';
import { getGalleries } from '@/apis/api';
import { IGalleryItem } from '@/types/gallery';
import './galleries.scss';

const Galleries = () => {
  const [galleries, setGalleries] = useState<IGalleryItem[]>([]);
  const [isError, setIsError] = useState<boolean>(false);

  useEffect(() => {
    fetchGalleriesData();
  }, []);

  const fetchGalleriesData = async () => {
    try {
      console.log('[galleries] 开始加载相册数据');
      const res = await getGalleries();
      if (res && Array.isArray(res)) {
        setGalleries(res);
        console.log('[galleries] 相册加载成功, 共', res.length, '个相册');
      } else {
        console.log('[galleries] 相册数据为空或格式错误');
      }
    } catch (e) {
      console.error('[galleries] 相册加载失败:', e);
      setIsError(true);
    }
  };

  useShareTimeline(() => {
    return {
      title: '相册',
      imageUrl: galleries.length > 0 ? galleries[0].cover : '',
    };
  });

  useShareAppMessage(() => {
    return {
      title: '相册',
      imageUrl: galleries.length > 0 ? galleries[0].cover : '',
    };
  });

  return (
    <View className='galleries'>
      {isError ? (
        <View className='error'>
          <Text>相册数据加载失败</Text>
        </View>
      ) : galleries.length > 0 ? (
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
