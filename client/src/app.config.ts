export default {
  pages: [
    'pages/home/home',
    'pages/post/post',
    'pages/my/my',
    'pages/galleries/galleries',
    'pages/gallery/gallery',
  ],
  subPackages: [
    {
      root: 'pages/extra',
      pages: [
        'about/about',
        'laboratory/laboratory',
        'developer/developer',
        'like/like',
        'history/history',
        'webview/webview',
        'comment/comment',
      ],
    },
  ],
  preloadRule: {
    'pages/home/home': {
      network: 'all',
      packages: ['pages/extra'],
    },
    'pages/my/my': {
      network: 'all',
      packages: ['pages/extra'],
    },
  },
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: 'WeChat',
    navigationBarTextStyle: 'black',
  },
  tabBar: {
    color: '#666666',
    selectedColor: '#33333D',
    backgroundColor: '#fafafa',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/home/home',
        iconPath: './assets/tabbar/home.png',
        selectedIconPath: './assets/tabbar/home-active.png',
        text: '首页',
      },
      {
        pagePath: 'pages/galleries/galleries',
        iconPath: './assets/tabbar/image.png',
        selectedIconPath: './assets/tabbar/image-active.png',
        text: '时间轴',
      },
      {
        pagePath: 'pages/my/my',
        iconPath: './assets/tabbar/my.png',
        selectedIconPath: './assets/tabbar/my-active.png',
        text: '我的',
      },
    ],
  },
};
