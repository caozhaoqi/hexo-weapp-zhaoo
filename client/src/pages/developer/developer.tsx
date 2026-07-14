import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import List from '@/components/list';
import { clearStorageSync } from '@/utils/storage';
import styles from './developer.module.scss';

const VERSION = '2.0.8';

const logs: { time: string; message: string; type: 'log' | 'error' | 'warn' }[] = [];

const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = (...args: any[]) => {
  const msg = args.map(arg => formatArg(arg)).join(' ');
  logs.push({ time: new Date().toLocaleTimeString(), message: msg, type: 'log' });
  originalLog.apply(console, args);
};

console.error = (...args: any[]) => {
  const msg = args.map(arg => formatArg(arg)).join(' ');
  logs.push({ time: new Date().toLocaleTimeString(), message: msg, type: 'error' });
  originalError.apply(console, args);
};

console.warn = (...args: any[]) => {
  const msg = args.map(arg => formatArg(arg)).join(' ');
  logs.push({ time: new Date().toLocaleTimeString(), message: msg, type: 'warn' });
  originalWarn.apply(console, args);
};

function formatArg(arg: any): string {
  if (typeof arg === 'object') {
    try {
      return JSON.stringify(arg, null, 2);
    } catch {
      return String(arg);
    }
  }
  return String(arg);
}

const Developer = () => {
  const [displayLogs, setDisplayLogs] = useState<typeof logs>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showAllLogs, setShowAllLogs] = useState(false);

  useEffect(() => {
    console.log('=== 开发者功能页面初始化 ===');
    console.log('版本号:', VERSION);
    console.log('当前时间:', new Date().toLocaleString());
    console.log('缓存状态:', Taro.getStorageInfoSync());
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (logs.length !== displayLogs.length) {
        const filtered = showAllLogs ? [...logs] : logs.filter(l => l.type !== 'log');
        setDisplayLogs(filtered);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [displayLogs.length, showAllLogs]);

  const handleClearCache = () => {
    Taro.showModal({
      title: '清理缓存',
      content: '确定要清理所有缓存吗？清理后需要重新加载数据。',
      success: (res) => {
        if (res.confirm) {
          clearStorageSync();
          Taro.showToast({ icon: 'success', title: '缓存清理成功' });
          console.log('缓存已清理');
        }
      },
    });
  };

  const handleShowVersion = () => {
    Taro.showToast({ icon: 'none', title: `版本号: ${VERSION}`, duration: 2000 });
    console.log('版本号:', VERSION);
  };

  const handleRefresh = () => {
    Taro.showToast({ icon: 'loading', title: '刷新中...', duration: 1000 });
    setTimeout(() => {
      Taro.redirectTo({ url: '/pages/developer/developer' });
    }, 1000);
  };

  const handleClearLogs = () => {
    logs.length = 0;
    setDisplayLogs([]);
    console.log('日志已清空');
  };

  return (
    <View className={styles.container}>
      <View className={styles.header}>
        <View className={styles.headerContent}>
          <Text className={styles.title}>开发者功能</Text>
          <Text className={styles.version}>v{VERSION}</Text>
        </View>
      </View>

      <View className={styles.listWrapper}>
        {/* <List
          title='查看版本号'
          icon='info-circle'
          arrow
          onClick={handleShowVersion}
        /> */}
        <List
          title='清除缓存'
          icon='close-circle'
          arrow
          onClick={handleClearCache}
        />
        <List
          title='刷新页面'
          icon='right'
          arrow
          onClick={handleRefresh}
        />
        <List
          title='清空日志'
          icon='task'
          arrow
          onClick={handleClearLogs}
        />
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>控制台日志</Text>
          <View className={styles.headerRight}>
            <View className={styles.logCount}>{displayLogs.length} 条</View>
            <View
              className={`${styles.logFilter} ${showAllLogs ? styles.active : ''}`}
              onClick={() => setShowAllLogs(!showAllLogs)}
            >
              <Text>{showAllLogs ? '仅错误' : '显示全部'}</Text>
            </View>
          </View>
        </View>
        <ScrollView
          className={styles.logContainer}
          scrollY
          scrollWithAnimation
          scrollTop={autoScroll ? displayLogs.length * 1000 : undefined}
          onScroll={() => setAutoScroll(false)}
        >
          {displayLogs.length === 0 ? (
            <View className={styles.emptyLogs}>
              <Text className={styles.emptyText}>暂无日志</Text>
              <Text className={styles.emptyHint}>操作应用以查看日志</Text>
            </View>
          ) : (
            displayLogs.map((log, index) => (
              <View key={index} className={styles.logItem}>
                <Text className={styles.logTime}>[{log.time}]</Text>
                <Text className={`${styles.logContent} ${styles[`log${log.type.charAt(0).toUpperCase() + log.type.slice(1)}`]}`}>
                  {log.message}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
};

export default Developer;