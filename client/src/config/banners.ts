export const banners = [
  {
    id: 1,
    image: 'https://pic4.zhimg.com/80/v2-e434e3a2888fb4efb1844845b8791d1f_1440w.webp',
    title: '探索技术前沿',
    desc: '分享编程心得与技术思考',
  },
  {
    id: 2,
    image: 'https://pic1.zhimg.com/80/v2-3a5f4b7e8c9d0a1b2c3d4e5f6a7b8c9d_1440w.webp',
    title: '代码改变世界',
    desc: '用代码构建美好未来',
  },
  {
    id: 3,
    image: 'https://pic2.zhimg.com/80/v2-1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d_1440w.webp',
    title: '持续学习',
    desc: '保持好奇心，不断进步',
  },
  {
    id: 4,
    image: 'https://pic3.zhimg.com/80/v2-9c8d7e6f5a4b3c2d1e0f1a2b3c4d5e6f_1440w.webp',
    title: '技术分享',
    desc: '记录成长，分享经验',
  },
  {
    id: 5,
    image: 'https://pic5.zhimg.com/80/v2-5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d_1440w.webp',
    title: '编程乐趣',
    desc: '享受编程带来的乐趣',
  },
];

export const getRandomBanner = () => {
  const index = Math.floor(Math.random() * banners.length);
  return banners[index];
};

export const getBannerByIndex = (index: number) => {
  return banners[index % banners.length];
};
