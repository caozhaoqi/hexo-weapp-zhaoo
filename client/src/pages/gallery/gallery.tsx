import { useEffect, useState } from 'react';
import Taro, {
  getCurrentInstance,
  useShareTimeline,
  useShareAppMessage,
} from '@tarojs/taro';
import { View, Image, Text } from '@tarojs/components';
import { getGalleryByName } from '@/apis/api';
import { IGalleryItem } from '@/types/gallery';
import './gallery.scss';

const DEFAULT_SHARE_IMAGE = '/assets/images/logo.png';

const DEFAULT_GALLERY: IGalleryItem = {
  name: '美图',
  cover: 'https://pic3.zhimg.com/80/v2-e5c15010b8ba4608a1974403a02a2da0_1440w.webp',
  description: '美图',
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
};

const Gallery = () => {
  const { name } = getCurrentInstance()?.router?.params || {};
  const [gallery, setGallery] = useState<IGalleryItem | null>(null);

  useEffect(() => {
    fetchGalleryData();
  }, []);

  useShareTimeline(() => {
    return {
      title: gallery?.name || '相册',
      imageUrl: gallery?.photos?.[0] || DEFAULT_SHARE_IMAGE,
    };
  });

  useShareAppMessage(() => {
    return {
      title: gallery?.name || '相册',
      path: `/pages/gallery/gallery?name=${name || ''}`,
      imageUrl: gallery?.photos?.[0] || DEFAULT_SHARE_IMAGE,
      webpageUrl: '',
      userName: '',
      imagePath: '',
      withShareTicket: false,
      miniprogramType: 0,
      scene: 0,
    };
  });

  const fetchGalleryData = async () => {
    Taro.setNavigationBarTitle({ title: name || '' });
    try {
      const data = await getGalleryByName(name);
      if (data && data.photos && data.photos.length > 0) {
        setGallery(data);
      } else {
        setGallery(DEFAULT_GALLERY);
      }
    } catch (e) {
      setGallery(DEFAULT_GALLERY);
    }
  };

  const handlePreviewImage = (current: string) => {
    Taro.previewImage({
      current,
      urls: gallery?.photos || [],
    });
  };

  return (
    <View className='gallery'>
      {gallery ? (
        <View>
          <View className='title'>
            <Text className='name'>{gallery.name}</Text>
            <Text className='description'>{gallery.description}</Text>
          </View>
          <View className='grid'>
            {gallery.photos.map((item: string, index: number) => {
              return (
                <Image
                  src={item}
                  key={index}
                  lazyLoad
                  mode='aspectFill'
                  className='photo'
                  onClick={() => {
                    handlePreviewImage(item);
                  }}
                />
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
};

export default Gallery;