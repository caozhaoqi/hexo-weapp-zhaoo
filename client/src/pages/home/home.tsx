import { useShareAppMessage, useShareTimeline } from '@tarojs/taro';
import { ScrollView, View, Text, Input } from '@tarojs/components';
import usePagination from '@/hooks/usePagination';
import PostItem from '@/components/post-item';
import LiteLoading from '@/components/lite-loading';
import Skeleton from '@/components/skeleton';
import './home.scss';

const DEFAULT_SHARE_IMAGE = '/assets/images/logo.png';

const Home = () => {
  const [posts, hasMore, isLoading, { allTags, sortBy, setSortBy, selectedTag, setSelectedTag, searchKeyword, setSearchKeyword }] = usePagination();

  useShareTimeline(() => {
    return {
      title: 'Arona share a post to you！',
      imageUrl: DEFAULT_SHARE_IMAGE,
    };
  });

  useShareAppMessage(() => {
    return {
      title: 'Arona share a post to you！',
      path: '/pages/home/home',
      imageUrl: DEFAULT_SHARE_IMAGE,
      webpageUrl: '',
      userName: '',
      imagePath: '',
      withShareTicket: false,
      miniprogramType: 0,
      scene: 0,
    };
  });

  return (
    <ScrollView className='home' scrollY scrollX={false}>
      <View className='search-bar'>
        <Input
          className='search-input'
          placeholder='搜索文章标题、内容或标签'
          value={searchKeyword}
          onInput={(e: any) => setSearchKeyword(e.detail.value)}
          type='text'
        />
      </View>
      <View className='filter-bar'>
        <ScrollView className='tag-scroll' scrollX showScrollbar={false}>
          <View className='tag-list'>
            <View
              className={`tag-item ${selectedTag === '' ? 'active' : ''}`}
              onClick={() => setSelectedTag('')}
            >
              全部
            </View>
            {allTags.map((tag, index) => (
              <View
                key={index}
                className={`tag-item ${selectedTag === tag ? 'active' : ''}`}
                onClick={() => setSelectedTag(tag)}
              >
                {tag}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      <View className='sort-bar'>
        <View
          className={`sort-item ${sortBy === 'latest' ? 'active' : ''}`}
          onClick={() => setSortBy('latest')}
        >
          <Text>最新发布</Text>
        </View>
        <View
          className={`sort-item ${sortBy === 'earliest' ? 'active' : ''}`}
          onClick={() => setSortBy('earliest')}
        >
          <Text>最早发布</Text>
        </View>
      </View>

      {posts.length > 0 ? (
        posts.map((item, index: number) => (
          <PostItem data={item} key={index} index={index} />
        ))
      ) : isLoading ? (
        <Skeleton loading={true} />
      ) : null}
      {!hasMore && posts.length === 0 ? <LiteLoading text='暂无相关文章' /> : null}
      {!hasMore && posts.length > 0 ? <LiteLoading text='忍把浮名去了，换作浅斟低唱~' /> : null}
    </ScrollView>
  );
};

export default Home;
