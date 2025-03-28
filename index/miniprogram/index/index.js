// pages/index/index.js
const app = getApp();
const { formatTime } = require('../../utils/utils'); // 假设存在时间格式化工具函数

Page({
  data: {
    posts: [], // 动态列表
    loading: false, // 加载状态
    currentUser: null, // 当前用户信息
    activePostIndex: -1, // 当前高亮的动态索引
    currentPage: 'default', // 当前页面类型
    hasMore: true, // 是否还有更多动态可加载
    activeTimer: null // 高亮状态定时器
  },

  onLoad(options) {
    this.setData({ loading: true });
    if (options.type) {
      this.setData({ currentPage: options.type });
    }
    this.getCurrentUser();
    this.loadPosts();
  },

  onPullDownRefresh() {
    this.loadPosts(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.hasMore) {
      this.loadPosts(null, true);
    } else {
      wx.showToast({ title: '没有更多动态了', icon: 'none' });
    }
  },

  onUnload() {
    if (this.data.activeTimer) {
      clearTimeout(this.data.activeTimer);
    }
  },

  getCurrentUser() {
    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: { type: 'getUserInfo' } // 统一使用 getUserInfo
    }).then(res => {
      if (res.result.success) {
        this.setData({ currentUser: res.result.data });
      } else {
        wx.showToast({ title: res.result.errorMessage || '获取用户信息失败', icon: 'none' });
      }
    }).catch(err => {
      console.error('获取用户信息失败', err);
      wx.showToast({ title: '网络错误，请稍后重试', icon: 'none' });
    });
  },

 // pages/index/index.js
loadPosts(callback, isLoadMore = false) {
  const pageSize = 20;
  const page = isLoadMore ? Math.ceil(this.data.posts.length / pageSize) + 1 : 1;

  wx.cloud.callFunction({
    name: 'quickstartFunctions',
    data: {
      type: 'getPosts',
      category: this.data.currentPage === 'default' ? null : this.data.currentPage,
      page,
      pageSize
    }
  }).then(res => {
    if (res.result.success) {
      const newPosts = res.result.data.map(post => ({
        ...post,
        time: formatTime(post.time),
        showComments: false,
        showCommentInput: false,
        commentInput: '',
        liked: post.likedBy && post.likedBy.includes(this.data.currentUser?._openid)
      }));
      this.setData({
        posts: isLoadMore ? this.data.posts.concat(newPosts) : newPosts,
        loading: false,
        hasMore: res.result.hasMore
      });
    } else {
      wx.showToast({ 
        title: res.result.errorMessage || '加载动态失败', 
        icon: 'none' 
      });
      this.setData({ loading: false });
    }
    if (callback) callback();
  }).catch(err => {
    console.error('加载动态失败', err);
    wx.showToast({ 
      title: '网络错误，请稍后重试', 
      icon: 'none' 
    });
    this.setData({ loading: false });
    if (callback) callback();
  });
},

  toggleLike(e) {
    if (!this.data.currentUser) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    const index = e.currentTarget.dataset.postIndex;
    const posts = this.data.posts;
    const post = posts[index];
    const liked = !post.liked;
    const likes = liked ? post.likes + 1 : post.likes - 1;

    this.setActivePost(index);
    this.setData({
      [`posts[${index}].liked`]: liked,
      [`posts[${index}].likes`]: likes
    });

    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'toggleLike',
        postId: post._id,
        liked
      }
    }).catch(err => {
      console.error('更新点赞状态失败', err);
      this.setData({
        [`posts[${index}].liked`]: !liked,
        [`posts[${index}].likes`]: post.likes
      });
    });
  },

  showComment(e) {
    const index = e.currentTarget.dataset.postIndex;
    const posts = this.data.posts.map((post, i) => ({
      ...post,
      showComments: i === index ? !post.showComments : false,
      showCommentInput: false
    }));
    this.setActivePost(index);
    this.setData({ posts });
  },

  showCommentInput(e) {
    const index = e.currentTarget.dataset.postIndex;
    const posts = this.data.posts.map((post, i) => ({
      ...post,
      showComments: false,
      showCommentInput: i === index ? !post.showCommentInput : false
    }));
    this.setActivePost(index);
    this.setData({ posts });
  },

  onCommentInput(e) {
    const index = e.currentTarget.dataset.postIndex;
    this.setData({
      [`posts[${index}].commentInput`]: e.detail.value
    });
  },

  submitComment(e) {
    if (!this.data.currentUser) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    const index = e.currentTarget.dataset.postIndex;
    const posts = this.data.posts;
    const post = posts[index];
    const commentInput = post.commentInput;

    if (!commentInput) {
      wx.showToast({ title: '评论内容不能为空', icon: 'none' });
      return;
    }

    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'addComment',
        postId: post._id,
        content: commentInput
      }
    }).then(res => {
      if (res.result.success) {
        const newComment = res.result.data.comment;
        this.setData({
          [`posts[${index}].comments`]: [...post.comments, newComment],
          [`posts[${index}].commentInput`]: '',
          [`posts[${index}].showCommentInput`]: false
        });
      } else {
        wx.showToast({ title: res.result.errorMessage || '提交评论失败', icon: 'none' });
      }
    }).catch(err => {
      console.error('提交评论失败', err);
      wx.showToast({ title: '提交评论失败', icon: 'none' });
    });
  },

  previewImage(e) {
    const postIndex = e.currentTarget.dataset.index;
    const imgIndex = e.currentTarget.dataset.imgIndex;
    const urls = this.data.posts[postIndex].mediaFiles;
    wx.previewImage({
      current: urls[imgIndex],
      urls
    });
  },

  handleImageError(e) {
    const postIndex = e.currentTarget.dataset.index;
    const imgIndex = e.currentTarget.dataset.imgIndex;
    this.setData({
      [`posts[${postIndex}].mediaFiles[${imgIndex}]`]: '/images/default-image.png'
    });
  },

  setActivePost(index) {
    if (this.data.activeTimer) {
      clearTimeout(this.data.activeTimer);
    }
    this.setData({
      activePostIndex: index,
      activeTimer: setTimeout(() => {
        this.setData({
          activePostIndex: -1,
          activeTimer: null
        });
      }, 3000)
    });
  }
});