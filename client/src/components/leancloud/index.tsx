import { FC, useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { getLikes, getComments, getCounter, incrementCounter } from '@/utils/index';

interface ILeancloudProps {
  path: string;
  model?: string;
  exp?: boolean;
  field?: string;
}

const Leancloud: FC<ILeancloudProps> = ({
  model = 'Counter',
  path,
  exp = true,
  field = 'words',
}) => {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    fetchCount();
    if (exp) {
      addCount();
    }
    Taro.eventCenter.on('refreshLeancloud', (arg) => {
      if (model === arg) {
        fetchCount();
      }
    });
    return () => {
      Taro.eventCenter.off('refreshLeancloud');
    };
  }, []);

  const fetchCount = () => {
    let result = 0;
    if (model === 'Like') {
      result = getLikes(path).length;
    } else if (model === 'Comment') {
      result = getComments(path).length;
    } else {
      result = getCounter(path);
    }
    setCount(result);
  };

  const addCount = () => {
    if (model === 'Counter') {
      incrementCounter(path);
    }
  };

  return <>{count}</>;
};

export default Leancloud;