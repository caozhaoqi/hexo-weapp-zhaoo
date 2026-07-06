import { get, post } from "@/apis/request";

export const getConfig = () => {
  return get(`/site.json`, {}, {}, true, true, 'config_cache');
};

export const getPosts = (current = 1) => {
  return get(`/posts/${current}.json`, {}, {}, true, true, `posts_${current}_cache`);
};

export const getPostBySlug = (slug) => {
  return get(`/articles/${slug}.json`, {}, {}, true, true, `post_${slug}_cache`);
};

export const getCategories = () => {
  return get(`/categories.json`, {}, {}, true, true, 'categories_cache');
};

export const getGalleries = async () => {
  try {
    const result = await get(`/galleries.json`, {}, {}, true, true, 'galleries_cache');
    if (result) {
      return result;
    }
  } catch (e) {
    console.warn('[API] galleries.json 加载失败，使用空数据');
  }
  return [];
};

export const getGalleryByName = (name) => {
  return get(`/galleries/${name}.json`, {}, {}, true, true, `gallery_${name}_cache`);
};

export const getAllGalleries = () => {
  return get(`/galleries/all.json`, {}, {}, true, true, 'all_galleries_cache');
};

export const getComments = (url?: string) => {
  const params = url ? { url } : {};
  return get(`/api/comments`, params, {}, true, false);
};

export const postComment = (data: {
  url: string;
  comment: string;
  nick: string;
  mail?: string;
  weappAvatar: string;
}) => {
  return post(`/api/comments`, data, {}, true);
};
