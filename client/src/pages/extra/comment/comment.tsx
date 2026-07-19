import { useEffect, useState } from 'react';
import { useShareAppMessage, useShareTimeline } from '@tarojs/taro';
import { View, Text } from '@tarojs/components';
import CommentList from '@/components/comment-list';
import LiteLoading from '@/components/lite-loading';
import { getComments, ICommentData } from '@/utils/index';
import styles from './comment.module.scss';

const DEFAULT_SHARE_IMAGE = '/assets/images/logo.png';

const CommentPage = () => {
  const [list, setList] = useState<ICommentData[]>([]);
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    fetchData();
  }, []);

  useShareTimeline(() => {
    return {
      title: '全部评论',
      imageUrl: DEFAULT_SHARE_IMAGE,
    };
  });

  useShareAppMessage(() => {
    return {
      title: '全部评论',
      path: '/pages/extra/comment/comment',
      imageUrl: DEFAULT_SHARE_IMAGE,
      webpageUrl: '',
      userName: '',
      imagePath: '',
      withShareTicket: false,
      miniprogramType: 0,
      scene: 0,
    };
  });

  const fetchData = () => {
    const comments = getComments();
    setList(comments);
    setCount(comments.length);
  };

  return (
    <View className={styles.comment}>
      <Text className={styles.count}>{`共${count}条评论`}</Text>
      <CommentList list={list} needJump />
      <LiteLoading text=' ~' />
    </View>
  );
};

export default CommentPage;
