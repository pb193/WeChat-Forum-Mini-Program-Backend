const app = getApp();

Page({
  data: {
    posts: [],
    loading: false,
    currentUser: null,
    activePostIndex: -1,
    currentPage: 'default',
    hasMore: true,
    activeTimer: null,
    isRefreshing: false,
    isLoadingMore: false,
    pageSize: 20,
    token: '',
    sortOptions: ['按最新排序', '按分类排序'],
    sortIndex: 0,
    categories: ['吐槽', '二手交易', '表白', '反馈'],
    categoryIndex: -1,
    scrollTop: 0,
  },

  // 跳转到帖子详情
  navigateToPostDetail(e) {
    const postId = e.currentTarget.dataset.postId;
    console.log('跳转到帖子详情，postId:', postId); // 添加调试日志
    if (!postId) {
      console.error('postId 未定义');
      return;
    }
    wx.navigateTo({
      url: `/pages/postDetail/index?postId=${postId}`,
      fail: (err) => {
        console.error('跳转失败:', err); // 捕获跳转错误
      },
    });
  },

  // 页面加载
  onLoad(options) {
    const token = wx.getStorageSync('token');
    console.log('本地存储的 token:', token);
    if (!token) {
      this.debugLogin();
    } else {
      this.setData({ token, loading: true });
      if (options.type) {
        this.setData({ currentPage: options.type });
      }
      this.getCurrentUser();
      this.loadPosts();
    }
  },

  // 调试登录
  debugLogin() {
    wx.showLoading({ title: '登录中...', mask: true });
    this.requestWithRetry({
      url: 'debug-login',
      method: 'POST',
      data: { username: 'testUser', avatar: 'https://example.com/debug-avatar.png' },
      success: (data) => {
        wx.hideLoading();
        const token = data.data.token;
        wx.setStorageSync('token', token);
        this.setData({ token, loading: true });
        this.getCurrentUser();
        this.loadPosts();
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('调试登录失败:', err);
        wx.showModal({
          title: '登录失败',
          content: '调试登录失败，请检查网络或后端服务',
          showCancel: false,
          success: () => {
            wx.navigateTo({ url: '/pages/login/login' });
          },
        });
      },
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    if (this.data.isRefreshing) {
      console.log('正在刷新中，忽略重复刷新');
      wx.stopPullDownRefresh();
      return;
    }
    console.log('触发下拉刷新');
    this.setData({ isRefreshing: true });
    this.refreshPosts();
  },

  // 手动刷新
  manualRefresh() {
    if (this.data.isRefreshing) {
      console.log('正在刷新中，忽略重复刷新');
      return;
    }
    console.log('触发手动刷新');
    this.setData({ isRefreshing: true });
    this.refreshPosts();
  },

  // 统一刷新逻辑
  refreshPosts() {
    const timeoutId = setTimeout(() => {
      if (this.data.isRefreshing) {
        console.log('刷新超时，强制停止');
        this.setData({ isRefreshing: false, loading: false });
        wx.stopPullDownRefresh();
        wx.showToast({ title: '刷新超时，请检查网络后重试', icon: 'none' });
      }
    }, 10000);

    // 检查 token 并加载帖子
    const token = wx.getStorageSync('token') || this.data.token;
    if (!token) {
      this.debugLogin();
      return;
    }
    this.setData({ token });

    this.loadPosts(() => {
      console.log('loadPosts 回调执行，停止刷新');
      clearTimeout(timeoutId);
      this.setData({ isRefreshing: false, scrollTop: 0 });
      wx.stopPullDownRefresh();
      wx.pageScrollTo({ scrollTop: 0, duration: 0 });
    }, false);
  },

  // 上拉加载更多
  onReachBottom() {
    if (this.data.isLoadingMore) {
      console.log('正在加载更多，忽略重复请求');
      return;
    }
    if (this.data.hasMore) {
      console.log('触发上拉加载更多');
      this.setData({ isLoadingMore: true });
      this.loadPosts(() => {
        this.setData({ isLoadingMore: false });
      }, true);
    } else {
      wx.showToast({ title: '没有更多内容了', icon: 'none' });
    }
  },

  // 页面卸载
  onUnload() {
    if (this.data.activeTimer) {
      clearTimeout(this.data.activeTimer);
    }
  },

  // 封装带有重试的请求方法
  requestWithRetry({ url, method = 'GET', data = {}, maxRetries = 2, retryCount = 0, success, fail }) {
    const fullUrl = `${app.globalData.apiBaseUrl}/${url}`;
    const token = this.data.token || wx.getStorageSync('token');
    console.log(`发起请求: ${method} ${fullUrl}`, data);

    wx.request({
      url: fullUrl,
      method,
      data,
      header: { 'Authorization': `Bearer ${token}` },
      timeout: 5000,
      success: (res) => {
        console.log(`请求 ${url} 返回状态码:`, res.statusCode, '数据:', res.data);
        if (res.statusCode === 401) {
          // token 无效，重新登录
          this.handleAuthError();
          if (fail) fail({ message: '认证失败' });
          return;
        }
        if (res.data.success) {
          success(res.data);
        } else {
          this.handleError(`${url} 请求失败`, res.data.message || '未知错误');
          if (fail) fail(res.data);
        }
      },
      fail: (err) => {
        console.log(`请求 ${url} 失败:`, err);
        if (err.errMsg.includes('timeout')) {
          this.handleError(`${url} 请求失败`, '请求超时，请检查网络后重试');
        }
        if (retryCount < maxRetries) {
          console.log(`请求失败，第 ${retryCount + 1} 次重试...`);
          setTimeout(() => {
            this.requestWithRetry({ url, method, data, maxRetries, retryCount: retryCount + 1, success, fail });
          }, 1000 * (retryCount + 1));
        } else {
          this.handleError(`${url} 请求失败`, err.errMsg || '网络错误，请稍后重试', err);
          if (fail) fail(err);
        }
      },
    });
  },

  // 获取当前用户信息
  getCurrentUser() {
    this.requestWithRetry({
      url: 'user',
      success: (data) => {
        console.log('当前用户信息:', data.data);
        this.setData({ currentUser: data.data, loading: false });
      },
      fail: (err) => {
        console.error('获取用户信息失败:', err);
        this.setData({ loading: false });
        if (err.message === '无效的认证令牌' || err.message === '未提供认证令牌') {
          this.handleAuthError();
        }
      },
    });
  },

  // 加载动态列表
// 加载动态列表（添加 reportCount 和 isCollapsed 处理）
loadPosts(callback, isLoadMore = false) {
  this.setData({ loading: true });
  const page = isLoadMore ? Math.ceil(this.data.posts.length / this.data.pageSize) + 1 : 1;
  
  let queryString = `page=${page}&pageSize=${this.data.pageSize}&sortBy=${this.data.sortIndex === 0 ? 'time' : 'category'}`;
  if (this.data.currentPage !== 'default') {
    queryString += `&category=${encodeURIComponent(this.data.currentPage)}`;
  }
  if (this.data.sortIndex === 1 && this.data.categoryIndex >= 0) {
    queryString += `&category=${encodeURIComponent(this.data.categories[this.data.categoryIndex])}`;
  }

  console.log('Request params:', queryString);

  this.requestWithRetry({
    url: `posts?${queryString}`,
    success: (data) => {
      const baseUrl = app.globalData.apiBaseUrl || 'http://localhost:3000';
      console.log('Base URL:', baseUrl);
      const newPosts = data.data.map(post => {
        let mediaFiles = [];
        try {
          mediaFiles = Array.isArray(post.mediaFiles) ? post.mediaFiles : JSON.parse(post.mediaFiles || '[]');
          mediaFiles = mediaFiles.map(file => {
            if (typeof file === 'string' && !file.startsWith('http')) {
              return `${baseUrl}${file}`;
            }
            return file;
          }).filter(Boolean);
          console.log('Post ID:', post.id, 'Parsed mediaFiles:', mediaFiles);
        } catch (err) {
          console.error('解析 mediaFiles 失败:', post.mediaFiles, err);
          mediaFiles = [];
        }
        return {
          ...post,
          mediaFiles,
          time: this.formatTime(post.createdAt || post.time),
          category: post.category || '未分类',
          showComments: false,
          showCommentInput: false,
          commentInput: '',
          liked: post.likedBy?.includes(this.data.currentUser?.id) || false,
          likeCount: post.likes || 0,
          comments: post.comments || [],
          reportCount: post.reportCount || 0,
          isCollapsed: (post.reportCount || 0) >= 5,
        };
      });
      const updatedPosts = isLoadMore ? [...this.data.posts, ...newPosts] : newPosts;
      this.setData({
        posts: updatedPosts,
        loading: false,
        hasMore: newPosts.length === this.data.pageSize,
      }, () => {
        console.log('setData 完成，posts:', this.data.posts.map(p => ({ id: p.id, mediaFiles: p.mediaFiles })));
        if (callback) callback();
      });
    },
    fail: () => {
      this.setData({ loading: false }, () => {
        console.log('请求失败，setData 完成，loading:', this.data.loading);
        if (callback) callback();
      });
    },
  });
},

// 新增举报方法
// 新增切换举报状态方法
toggleReport(e) {
  if (!this.checkLogin()) return;

  const postIndex = e.currentTarget.dataset.postIndex;
  if (postIndex === undefined || !this.data.posts[postIndex]) {
    console.error('无效的 postIndex:', postIndex);
    return;
  }

  const post = this.data.posts[postIndex];
  const isReported = post.isReported;

  wx.showModal({
    title: isReported ? '取消举报' : '举报帖子',
    content: isReported ? '确定要取消举报此帖子吗？' : '确定要举报此帖子吗？',
    success: (res) => {
      if (res.confirm) {
        const method = isReported ? 'DELETE' : 'POST';
        this.requestWithRetry({
          url: `posts/${post.id}/report`,
          method,
          success: (data) => {
            console.log('举报/取消举报响应:', data);
            const newReportCount = data.data.reportCount;
            const newStatus = data.data.status;
            const newReportedBy = data.data.reportedBy;
            this.setData({
              [`posts[${postIndex}].isReported`]: newReportedBy.map(String).includes(this.data.currentUser.id.toString()),
              [`posts[${postIndex}].reportCount`]: newReportCount,
              [`posts[${postIndex}].isCollapsed`]: newStatus === 'collapsed',
              [`posts[${postIndex}].reportedBy`]: newReportedBy,
            });
            wx.showToast({
              title: isReported ? '已取消举报' : '举报成功，已提交管理员审核',
              icon: 'success',
            });
            if (newReportCount >= 5 && !isReported) {
              wx.showToast({ title: '帖子已被多人举报，已收起', icon: 'none' });
            }
          },
          fail: (err) => {
            console.error(`${isReported ? '取消举报' : '举报'}失败:`, err);
            if (err.data && err.data.message === '您未举报过此帖子') {
              wx.showToast({ title: '您未举报过此帖子', icon: 'none' });
              this.setData({ [`posts[${postIndex}].isReported`]: false });
            } else if (err.data && err.data.message === '您已举报过此帖子') {
              wx.showToast({ title: '您已举报过此帖子', icon: 'none' });
              this.setData({ [`posts[${postIndex}].isReported`]: true });
            } else {
              wx.showToast({ title: `${isReported ? '取消举报' : '举报'}失败，请稍后重试`, icon: 'none' });
            }
          },
        });
      }
    },
  });
},
  // 切换点赞状态
  toggleLike(e) {
    if (!this.checkLogin()) return;

    const postIndex = e.currentTarget.dataset.postIndex;
    if (postIndex === undefined || !this.data.posts[postIndex]) {
      console.error('无效的 postIndex:', postIndex);
      return;
    }

    const post = this.data.posts[postIndex];
    const liked = post.liked;
    const likeCount = post.likeCount || 0;

    this.requestWithRetry({
      url: `posts/${post.id}/like`,
      method: 'POST',
      data: { action: liked ? 'unlike' : 'like' },
      success: (data) => {
        this.setData({
          [`posts[${postIndex}].liked`]: !liked,
          [`posts[${postIndex}].likeCount`]: liked ? likeCount - 1 : likeCount + 1,
        });
        wx.showToast({ title: liked ? '已取消点赞' : '已点赞', icon: 'success', duration: 1000 });
      },
      fail: (err) => {
        console.error('点赞失败:', err);
        wx.showToast({ title: '操作失败，请稍后重试', icon: 'none', duration: 1000 });
      },
    });
  },

  // 显示/隐藏评论区
  showComment(e) {
    const postIndex = e.currentTarget.dataset.postIndex;
    if (postIndex === undefined || !this.data.posts[postIndex]) {
      console.error('无效的 postIndex:', postIndex);
      return;
    }

    const showComments = this.data.posts[postIndex].showComments;
    this.setData({
      [`posts[${postIndex}].showComments`]: !showComments,
    });
  },

  // 跳转到详细界面进行评论
  showCommentInput(e) {
    if (!this.checkLogin()) return;

    const postIndex = e.currentTarget.dataset.postIndex;
    if (postIndex === undefined || !this.data.posts[postIndex]) {
      console.error('无效的 postIndex:', postIndex);
      return;
    }

    const postId = this.data.posts[postIndex].id;
    wx.navigateTo({
      url: `/pages/postDetail/index?postId=${postId}&action=comment`,
    });
  },

  // 排序选择变化
  bindSortChange(e) {
    const sortIndex = e.detail.value;
    this.setData({
      sortIndex,
      categoryIndex: sortIndex === 1 ? 0 : -1,
      posts: [],
    });
    this.loadPosts();
  },

  // 分类选择变化
  bindCategoryChange(e) {
    const categoryIndex = e.detail.value;
    this.setData({
      categoryIndex,
      posts: [],
    });
    this.loadPosts();
  },

  // 格式化时间
  formatTime(date) {
    if (!date) {
      console.log('Time is missing or null');
      return '未知时间';
    }
    const now = new Date();
    const time = new Date(date);
    if (isNaN(time.getTime())) {
      console.log('Invalid time format:', date);
      return '无效时间';
    }
    const diff = (now - time) / 1000;
    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
    return time.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  },

  // 处理图片加载错误
  handleImageError(e) {
    const postIndex = e.currentTarget.dataset.index;
    const imgIndex = e.currentTarget.dataset.imgIndex;
    if (postIndex === undefined || imgIndex === undefined) {
      console.error('无效的 postIndex 或 imgIndex:', postIndex, imgIndex);
      return;
    }
    this.setData({
      [`posts[${postIndex}].mediaFiles[${imgIndex}]`]: '/images/default-image.png',
    });
  },

  // 检查登录状态
  checkLogin() {
    if (!this.data.currentUser) { 
      wx.showModal({
        title: '未登录',
        content: '请先登录以执行此操作',
        showCancel: false,
        success: () => {
          wx.navigateTo({ url: '/pages/login/login' });
        },
      });
      return false;
    }
    return true;
  },

  // 处理认证错误
  handleAuthError() {
    wx.removeStorageSync('token');
    this.setData({ token: '', currentUser: null, posts: [] });
    wx.showModal({
      title: '登录已过期',
      content: '请重新登录',
      showCancel: false,
      success: () => {
        this.debugLogin();
      },
    });
  },

  // 错误处理
  handleError(action, message, err) {
    console.error(`${action}:`, err || message);
    wx.showToast({ title: message, icon: 'none', duration: 1000 });
    this.setData({ loading: false });
  },
});