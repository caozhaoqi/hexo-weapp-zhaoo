import { useEffect, useState, FC } from 'react';
import Taro from '@tarojs/taro';
import {
  View,
  Text,
  OpenData,
  ScrollView,
  Input,
  Button,
} from '@tarojs/components';
import { showToast } from '@tarojs/taro';
import CommentList from '@/components/comment-list';
import LiteLoading from '@/components/lite-loading';
import Pad from '@/components/pad';
import Icon from '@/components/icon';
import { getUserInfo, requestUserProfile, addComment, getComments, ICommentData } from '@/utils/index';
import styles from './index.module.scss';

interface ICommentProps {
  model?: string;
  url: string;
}

const Comment: FC<ICommentProps> = ({ url }) => {
  const [list, setList] = useState<ICommentData[]>([]);
  const [commentVisible, setCommentVisible] = useState<boolean>(false);
  const [commentValue, setCommentValue] = useState<string>('');

  useEffect(() => {
    fetchData();
    const handler = () => {
      setCommentVisible((prev) => !prev);
    };
    Taro.eventCenter.on('changeCommentVisible', handler);
    return () => {
      Taro.eventCenter.off('changeCommentVisible', handler);
    };
  }, []);

  const fetchData = () => {
    const comments = getComments(url);
    setList(comments);
  };

  const sendComment = async () => {
    if (!commentValue) {
      showToast({
        title: '请输入评论内容',
        icon: 'none',
        duration: 2000,
      });
      return;
    }

    let userInfo = await getUserInfo();
    if (!userInfo) {
      try {
        userInfo = await requestUserProfile();
      } catch (e) {
        console.error('[评论] 获取用户信息失败:', e);
        showToast({
          title: '请授权登录',
          icon: 'none',
          duration: 2000,
        });
        return;
      }
    }

    const { avatarUrl, nickName } = userInfo;
    const commentData: ICommentData = {
      url,
      comment: `<p>${commentValue}</p>`,
      nick: nickName || '访客',
      weappAvatar: avatarUrl || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const success = addComment(commentData);
    if (success) {
      setCommentValue('');
      showToast({
        title: '评论成功',
        icon: 'success',
        duration: 2000,
      });
      setTimeout(() => {
        fetchData();
        setCommentVisible(false);
      }, 1000);
    } else {
      showToast({
        title: '评论失败，请重试',
        icon: 'none',
        duration: 2000,
      });
    }
  };

  return (
    <>
      <View className={styles.comment}>
        <Text className={styles.count}>{`共${list.length}条评论`}</Text>
        <View className={styles.inputWrapper}>
          <View className={styles.avatar}>
            <OpenData type='userAvatarUrl' lang='zh_CN' />
          </View>
          <View
            className={styles.input}
            onClick={() => setCommentVisible(true)}
          >
            雁过留痕...
          </View>
        </View>
        <CommentList list={list} limit={3} />
        {list.length > 3 ? (
          <View
            className={styles.moreTextWrapper}
            onClick={() => setCommentVisible(true)}
          >
            <Text className={styles.moreText}>查看更多评论</Text>
          </View>
        ) : null}
      </View>
      <Pad
        visible={commentVisible}
        setVisible={setCommentVisible}
        height='70vh'
      >
        <View
          className={styles.commentPad}
          onClick={(e) => e.stopPropagation()}
        >
          <View className={styles.titleWrapper}>
            <Text className={styles.title}>全部评论</Text>
          </View>
          <View style={{ flex: 1, overflow: 'scroll' }}>
            <ScrollView scrollY className={styles.content}>
              <CommentList list={list} />
              <LiteLoading text='忍把浮名去了，换做浅斟低唱' />
              <View className={styles.placeholder} />
            </ScrollView>
          </View>
          <View className={styles.inputWrapper}>
            <Input
              className={styles.input}
              type='text'
              placeholder='雁过留痕...'
              placeholderStyle='font-size: 0.9em;'
              cursorSpacing={20}
              value={commentValue}
              onInput={({ detail }) => setCommentValue(detail.value)}
            />
            <View className={styles.avatar}>
              {commentValue ? (
                <Button
                  className={styles.send}
                  onClick={() => sendComment()}
                >
                  <Icon
                    name='iconsend'
                    size={18}
                    style={{
                      color: '#ffffff',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  />
                </Button>
              ) : (
                <OpenData type='userAvatarUrl' lang='zh_CN' />
              )}
            </View>
          </View>
        </View>
     </Pad>
    </>
  );
};

export default Comment;
