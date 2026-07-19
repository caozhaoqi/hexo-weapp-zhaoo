import { useShareAppMessage, useShareTimeline } from '@tarojs/taro';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import Icon from '@/components/icon';
import styles from './laboratory.module.scss';

const DEFAULT_SHARE_IMAGE = '/assets/images/logo.png';

interface IToolItem {
  label: string;
  icon: string;
  desc: string;
  url: string;
}

const TOOLS: IToolItem[] = [
  {
    label: '数据源管理',
    icon: 'iconwangluo',
    desc: '配置 API 数据源优先级和地址',
    url: '/pages/extra/developer/developer',
  },
  {
    label: '缓存管理',
    icon: 'iconclear',
    desc: '清理本地缓存释放存储空间',
    url: '/pages/extra/developer/developer',
  },
  {
    label: '控制台日志',
    icon: 'icontask',
    desc: '查看运行时日志排查问题',
    url: '/pages/extra/developer/developer',
  },
];

const Laboratory = () => {
  useShareTimeline(() => ({
    title: '实验室',
    imageUrl: DEFAULT_SHARE_IMAGE,
  }));

  useShareAppMessage(() => ({
    title: '实验室',
    path: '/pages/extra/laboratory/laboratory',
    imageUrl: DEFAULT_SHARE_IMAGE,
    webpageUrl: '',
    userName: '',
    imagePath: '',
    withShareTicket: false,
    miniprogramType: 0,
    scene: 0,
  }));

  const handleToolTap = (url: string) => {
    Taro.navigateTo({ url });
  };

  return (
    <View className={styles.laboratory}>
      <View className={styles.header}>
        <Text className={styles.title}>🧪 实验室</Text>
        <Text className={styles.desc}>开发者工具与实验功能</Text>
      </View>

      <View className={styles.toolsGrid}>
        {TOOLS.map((tool, index) => (
          <View
            key={index}
            className={styles.toolCard}
            onClick={() => handleToolTap(tool.url)}
          >
            <View className={styles.toolIcon}>
              <Icon name={tool.icon} size={24} />
            </View>
            <Text className={styles.toolLabel}>{tool.label}</Text>
            <Text className={styles.toolDesc}>{tool.desc}</Text>
          </View>
        ))}
      </View>

      <View className={styles.footer}>
        <Text className={styles.footerText}>更多实验功能开发中...</Text>
      </View>
    </View>
  );
};

export default Laboratory;
