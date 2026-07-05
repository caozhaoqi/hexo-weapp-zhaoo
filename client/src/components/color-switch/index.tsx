import { FC, useState, useEffect } from 'react';
import { View } from '@tarojs/components';
import { useTheme } from '../../contexts/theme';
import styles from './index.module.scss';

const ColorSwitch: FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [state, setState] = useState<boolean>(theme === 'dark');

  useEffect(() => {
    setState(theme === 'dark');
  }, [theme]);

  const handleToggle = () => {
    toggleTheme();
  };

  return (
    <View
      className={`${styles.colorSwitch} ${state ? styles.night : styles.day}`}
      onClick={handleToggle}
    >
      <View className={styles.knob} />
    </View>
  );
};

export default ColorSwitch;
