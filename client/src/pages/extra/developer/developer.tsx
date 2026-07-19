import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, ScrollView, Input } from '@tarojs/components';
import List from '@/components/list';
import { clearStorageSync, getStorageSync, setStorageSync } from '@/utils/storage';
import sourcesConfig from '../../../../config.json';
import styles from './developer.module.scss';

const VERSION = '2.0.9';
const CUSTOM_SOURCES_KEY = 'custom_sources';

interface Source {
  name: string;
  url: string;
}

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

/** 获取默认数据源 */
const getDefaultSources = (): Source[] => {
  const cfg = sourcesConfig as any;
  if (cfg.sources && Array.isArray(cfg.sources) && cfg.sources.length > 0) {
    return cfg.sources.filter((s: any) => s && s.url).map((s: any) => ({ name: s.name || '', url: s.url }));
  }
  return [];
};

const Developer = () => {
  const [displayLogs, setDisplayLogs] = useState<typeof logs>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showAllLogs, setShowAllLogs] = useState(false);

  // 数据源管理状态
  const [sources, setSources] = useState<Source[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editIndex, setEditIndex] = useState(-1);
  const [editName, setEditName] = useState('');
  const [editUrl, setEditUrl] = useState('');

  useEffect(() => {
    console.log('=== 开发者功能页面初始化 ===');
    console.log('版本号:', VERSION);
    console.log('当前时间:', new Date().toLocaleString());
    console.log('缓存状态:', Taro.getStorageInfoSync());
    loadSources();
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

  /** 加载数据源（优先用户配置，否则默认） */
  const loadSources = () => {
    const custom = getStorageSync(CUSTOM_SOURCES_KEY);
    if (custom && Array.isArray(custom) && custom.length > 0) {
      setSources(custom);
      console.log('[数据源] 已加载用户自定义配置:', custom.length, '个');
    } else {
      const defaults = getDefaultSources();
      setSources(defaults);
      console.log('[数据源] 已加载默认配置:', defaults.length, '个');
    }
  };

  /** 保存数据源到 storage */
  const saveSources = (newSources: Source[]) => {
    setSources(newSources);
    setStorageSync(CUSTOM_SOURCES_KEY, newSources);
    console.log('[数据源] 已保存:', newSources.length, '个');
  };

  /** 开始编辑 */
  const handleStartEdit = (index: number) => {
    setIsEditing(true);
    setEditIndex(index);
    setEditName(sources[index].name);
    setEditUrl(sources[index].url);
  };

  /** 保存编辑 */
  const handleSaveEdit = () => {
    const url = editUrl.trim();
    if (!url) {
      Taro.showToast({ icon: 'none', title: 'URL 不能为空' });
      return;
    }
    const name = editName.trim() || '自定义';
    const newSources = [...sources];
    if (editIndex >= 0 && editIndex < newSources.length) {
      newSources[editIndex] = { name, url };
    } else {
      newSources.push({ name, url });
    }
    saveSources(newSources);
    setIsEditing(false);
    setEditIndex(-1);
    Taro.showToast({ icon: 'success', title: '数据源已保存' });
  };

  /** 取消编辑 */
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditIndex(-1);
  };

  /** 删除数据源 */
  const handleDelete = (index: number) => {
    if (sources.length <= 1) {
      Taro.showToast({ icon: 'none', title: '至少保留一个数据源' });
      return;
    }
    Taro.showModal({
      title: '删除数据源',
      content: `确定删除 "${sources[index].name}" 吗？`,
      success: (res) => {
        if (res.confirm) {
          const newSources = sources.filter((_, i) => i !== index);
          saveSources(newSources);
        }
      },
    });
  };

  /** 上移 */
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const newSources = [...sources];
    [newSources[index - 1], newSources[index]] = [newSources[index], newSources[index - 1]];
    saveSources(newSources);
  };

  /** 下移 */
  const handleMoveDown = (index: number) => {
    if (index >= sources.length - 1) return;
    const newSources = [...sources];
    [newSources[index], newSources[index + 1]] = [newSources[index + 1], newSources[index]];
    saveSources(newSources);
  };

  /** 恢复默认 */
  const handleResetSources = () => {
    Taro.showModal({
      title: '恢复默认',
      content: '将清除自定义数据源，恢复为内置默认配置。确认？',
      success: (res) => {
        if (res.confirm) {
          try {
            Taro.removeStorageSync(CUSTOM_SOURCES_KEY);
          } catch (e) { /* ignore */ }
          const defaults = getDefaultSources();
          setSources(defaults);
          console.log('[数据源] 已恢复默认配置');
          Taro.showToast({ icon: 'success', title: '已恢复默认数据源' });
        }
      },
    });
  };

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

  // const handleShowVersion = () => {
  //   Taro.showToast({ icon: 'none', title: `版本号: ${VERSION}`, duration: 2000 });
  //   console.log('版本号:', VERSION);
  // };

  const handleRefresh = () => {
    Taro.showToast({ icon: 'loading', title: '刷新中...', duration: 1000 });
    setTimeout(() => {
      Taro.redirectTo({ url: '/pages/extra/developer/developer' });
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

      {/* ===== 数据源管理 ===== */}
      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>数据源管理</Text>
          <View className={styles.headerRight}>
            <View className={styles.sourceCount}>{sources.length} 个</View>
            <View
              className={styles.resetBtn}
              onClick={handleResetSources}
            >
              <Text>恢复默认</Text>
            </View>
          </View>
        </View>

        <View className={styles.sourceHint}>
          <Text className={styles.hintText}>
            数据源按顺序依次尝试，第一个成功即返回。拖拽调整优先级，排前面的优先。
          </Text>
        </View>

        <View className={styles.sourceList}>
          {sources.map((item, index) => (
            <View key={index} className={styles.sourceItem}>
              <View className={styles.sourceOrder}>
                <Text className={styles.orderNum}>{index + 1}</Text>
              </View>
              <View className={styles.sourceInfo}>
                <Text className={styles.sourceName}>{item.name}</Text>
                <Text className={styles.sourceUrl}>{item.url}</Text>
              </View>
              <View className={styles.sourceActions}>
                <View
                  className={`${styles.actionBtn} ${index === 0 ? styles.disabled : ''}`}
                  onClick={() => handleMoveUp(index)}
                >
                  <Text className={styles.actionIcon}>↑</Text>
                </View>
                <View
                  className={`${styles.actionBtn} ${index === sources.length - 1 ? styles.disabled : ''}`}
                  onClick={() => handleMoveDown(index)}
                >
                  <Text className={styles.actionIcon}>↓</Text>
                </View>
                <View
                  className={styles.actionBtn}
                  onClick={() => handleStartEdit(index)}
                >
                  <Text className={styles.actionIcon}>✎</Text>
                </View>
                <View
                  className={`${styles.actionBtn} ${styles.deleteBtn}`}
                  onClick={() => handleDelete(index)}
                >
                  <Text className={styles.actionIcon}>✕</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View className={styles.sourceFooter}>
          {!isEditing ? (
            <View
              className={styles.addBtn}
              onClick={() => {
                setIsEditing(true);
                setEditIndex(-1);
                setEditName('');
                setEditUrl('');
              }}
            >
              <Text className={styles.addBtnText}>+ 添加数据源</Text>
            </View>
          ) : (
            <View className={styles.editForm}>
              <View className={styles.formRow}>
                <Text className={styles.formLabel}>名称</Text>
                <Input
                  className={styles.formInput}
                  value={editName}
                  placeholder='如：我的CDN'
                  onInput={(e) => setEditName(e.detail.value)}
                  maxlength={30}
                />
              </View>
              <View className={styles.formRow}>
                <Text className={styles.formLabel}>URL</Text>
                <Input
                  className={styles.formInput}
                  value={editUrl}
                  placeholder='https://example.com/api'
                  onInput={(e) => setEditUrl(e.detail.value)}
                />
              </View>
              <View className={styles.formActions}>
                <View className={styles.cancelBtn} onClick={handleCancelEdit}>
                  <Text>取消</Text>
                </View>
                <View className={styles.saveBtn} onClick={handleSaveEdit}>
                  <Text>保存</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* ===== 控制台日志 ===== */}
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
