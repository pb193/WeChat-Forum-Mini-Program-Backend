const app = getApp();

Page({
  data: {
    userInfo: null,
    avatarUrl: '../../images/icons/avatar.png',
    username: '点击登录',
    grade: '',
    department: '',
    bio: '',
    hasGrade: false,
    showTip: false,
    title: '',
    content: '',
    token: '',
    myPosts: [],
    myActivity: [],
    activeTab: 'profile',
    myPostsSortBy: 'createdAt',
    myPostsSortOrder: 'desc',
    myActivitySortBy: 'createdAt',
    myActivitySortOrder: 'desc',
    loading: true,
  },

  onShow() {
    this.setData({ loading: true });
    const token = wx.getStorageSync('token');
    if (token) {
      this.setData({ token });
      this.refreshData();
    } else {
      this.autoLogin();
    }
  },

  async refreshData() {
    try {
      await Promise.all([this.getUserInfo(), this.getMyPosts(), this.getMyActivity()]);
    } catch (err) {
      this.showTipModal('数据刷新失败', '请检查网络后重试');
    } finally {
      this.setData({ loading: false });
    }
  },

  // 修改 switchTab 方法，处理管理员页面跳转
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === 'admin' && (this.data.userInfo?.role === 'admin' || this.data.userInfo?.role === 'moderator')) {
      wx.navigateTo({
        url: '/pages/admin/index',
        fail: (err) => {
          console.error('跳转管理员页面失败:', err);
          this.showTipModal('跳转失败', '管理员页面不可用');
        },
      });
    } else {
      this.setData({ activeTab: tab });
    }
  },

  getWechatAvatar() {
    wx.getUserProfile({
      desc: '用于完善个人资料',
      success: (res) => {
        const { avatarUrl, nickName } = res.userInfo;
        this.setData({
          avatarUrl,
          username: this.data.username === '点击登录' ? nickName : this.data.username,
        });
        this.saveProfile(avatarUrl);
        wx.showToast({ title: '获取成功', icon: 'success' });
      },
      fail: (err) => {
        console.error('获取微信用户信息失败:', err);
        this.showTipModal('获取失败', '请重试');
      },
    });
  },

  async saveProfile(avatarUrl) {
    const data = {
      avatar: avatarUrl,
      username: this.data.username,
      grade: this.data.grade,
      department: this.data.department,
      bio: this.data.bio,
    };
    try {
      const res = await this.request('user', 'PUT', data);
      if (res?.success) {
        this.setData({
          avatarUrl,
          userInfo: { ...this.data.userInfo, ...data },
        });
        wx.showToast({ title: '保存成功', icon: 'success' });
        await this.getUserInfo();
      } else {
        this.showTipModal('保存失败', res?.message || '未知错误');
      }
    } catch (err) {
      this.showTipModal('保存失败', err.message || '请稍后重试');
    }
  },

  async getUserInfo() {
    try {
      const res = await this.request('user', 'GET');
      if (!res || typeof res.success === 'undefined') {
        throw new Error('服务器返回数据格式错误');
      }
      if (res.success) {
        const userInfo = res.data;
        this.setData({
          userInfo,
          avatarUrl: userInfo.avatar || '../../images/icons/avatar.png',
          username: userInfo.username || '点击登录',
          grade: userInfo.grade || '',
          department: userInfo.department || '',
          bio: userInfo.bio || '',
          hasGrade: !!userInfo.grade,
        });
        // 移除自动跳转逻辑，仅提示禁言状态
        if (userInfo.muteUntil && new Date() < new Date(userInfo.muteUntil)) {
          this.showTipModal('您已被禁言', `禁言至: ${this.formatTime(userInfo.muteUntil)}`);
        }
      } else {
        this.resetUserInfo();
        wx.removeStorageSync('token');
        this.showTipModal('获取用户信息失败', res.message || '请重新登录');
      }
    } catch (err) {
      this.resetUserInfo();
      wx.removeStorageSync('token');
      this.showTipModal('获取用户信息失败', err.message || '令牌无效或网络错误，请重新登录');
    }
  },

  async getMyPosts() {
    try {
      const res = await this.request(`posts?userId=${this.data.userInfo?.id}`, 'GET');
      if (res?.success) {
        const sortedPosts = this.sortPosts(res.data, this.data.myPostsSortBy, this.data.myPostsSortOrder);
        this.setData({ myPosts: sortedPosts });
      } else {
        this.showTipModal('获取我的帖子失败', res?.message || '未知错误');
      }
    } catch (err) {
      this.showTipModal('获取我的帖子失败', err.message || '请稍后重试');
    }
  },

  async getMyActivity() {
    try {
      const userId = this.data.userInfo?.id;
      const [likedRes, commentsRes] = await Promise.all([
        this.request('user/liked-posts', 'GET'),
        this.request(`comments?userId=${userId}`, 'GET'),
      ]);

      let myActivity = [];
      if (likedRes?.success) {
        myActivity = myActivity.concat(
          likedRes.data.map((post) => ({
            type: 'liked',
            postId: post.id,
            content: post.content,
            category: post.category,
            createdAt: post.createdAt,
          }))
        );
      }
      if (commentsRes?.success) {
        myActivity = myActivity.concat(
          commentsRes.data.map((comment) => ({
            type: 'comment',
            commentId: comment.id,
            postId: comment.postId,
            content: comment.content,
            postContent: comment.postContent || '帖子已删除',
            createdAt: comment.createdAt,
          }))
        );
      }
      const sortedActivity = this.sortActivity(myActivity, this.data.myActivitySortBy, this.data.myActivitySortOrder);
      this.setData({ myActivity: sortedActivity });
    } catch (err) {
      console.error('getMyActivity 错误:', err);
      this.showTipModal('获取我的互动失败', err.message || '请稍后重试');
    }
  },

  navigateToPostDetail(e) {
    const postId = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/postDetail/index?postId=${postId}` });
  },

  navigateToEdit() {
    if (!this.data.userInfo) {
      this.showTipModal('请先登录', '登录后即可编辑个人资料');
      return;
    }
    wx.navigateTo({ url: '/pages/editProfile/index' });
  },

  sortPosts(posts, sortBy, sortOrder) {
    posts.sort((a, b) => {
      if (sortBy === 'createdAt') {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      } else if (sortBy === 'category') {
        const comparison = a.category.localeCompare(b.category);
        return sortOrder === 'desc' ? -comparison : comparison;
      }
      return 0;
    });
    return posts;
  },

  sortActivity(activity, sortBy, sortOrder) {
    activity.sort((a, b) => {
      if (sortBy === 'createdAt') {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      }
      return 0;
    });
    return activity;
  },

  sortMyPosts(e) {
    const { sortBy, sortOrder } = e.currentTarget.dataset;
    const newSortOrder =
      sortBy === this.data.myPostsSortBy
        ? this.data.myPostsSortOrder === 'desc'
          ? 'asc'
          : 'desc'
        : sortOrder;
    const sortedPosts = this.sortPosts([...this.data.myPosts], sortBy, newSortOrder);
    this.setData({
      myPosts: sortedPosts,
      myPostsSortBy: sortBy,
      myPostsSortOrder: newSortOrder,
    });
  },

  sortMyActivity(e) {
    const { sortBy, sortOrder } = e.currentTarget.dataset;
    const newSortOrder =
      sortBy === this.data.myActivitySortBy
        ? this.data.myActivitySortOrder === 'desc'
          ? 'asc'
          : 'desc'
        : sortOrder;
    const sortedActivity = this.sortActivity([...this.data.myActivity], sortBy, newSortOrder);
    this.setData({
      myActivity: sortedActivity,
      myActivitySortBy: sortBy,
      myActivitySortOrder: newSortOrder,
    });
  },

  async deletePost(e) {
    const postId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个帖子吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await this.request(`posts/${postId}`, 'DELETE');
            if (result?.success) {
              await this.getMyPosts();
              wx.showToast({ title: '删除成功', icon: 'success' });
            } else {
              this.showTipModal('删除失败', result?.message || '未知错误');
            }
          } catch (err) {
            this.showTipModal('删除失败', err.message || '请稍后重试');
          }
        }
      },
    });
  },

  async deleteComment(e) {
    const commentId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个评论吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await this.request(`comments/${commentId}`, 'DELETE');
            if (result?.success) {
              await this.getMyActivity();
              wx.showToast({ title: '删除成功', icon: 'success' });
            } else {
              this.showTipModal('删除失败', result?.message || '评论不存在');
            }
          } catch (err) {
            this.showTipModal('删除失败', err.message || '请稍后重试');
          }
        }
      },
    });
  },

  async request(url, method = 'GET', data = {}) {
    const token = this.data.token || wx.getStorageSync('token');
    if (!token && url !== 'login' && url !== 'debug-login') {
      throw new Error('未登录');
    }
    return new Promise((resolve, reject) => {
      wx.request({
        url: `http://localhost:3000/api/${url}`,
        method,
        data,
        header: { Authorization: `Bearer ${token}` },
        timeout: 10000,
        success: (res) => {
          if (!res.data || typeof res.data.success === 'undefined') {
            reject(new Error('服务器返回数据格式错误'));
          } else {
            resolve(res.data);
          }
        },
        fail: (err) => reject(err),
      });
    });
  },

  resetUserInfo() {
    this.setData({
      userInfo: null,
      avatarUrl: '../../images/icons/avatar.png',
      username: '点击登录',
      grade: '',
      department: '',
      bio: '',
      hasGrade: false,
      token: '',
      myPosts: [],
      myActivity: [],
    });
  },

  async autoLogin() {
    wx.showActionSheet({
      itemList: ['登录普通用户', '登录吧主 (moderator)', '登录管理员 (admin)'],
      success: async (res) => {
        const roleIndex = res.tapIndex;
        const roles = ['user', 'moderator', 'admin'];
        const role = roles[roleIndex];
        const debugUsers = {
          user: { username: 'testuser', password: 'test123' },
          moderator: { username: 'testuser2', password: 'test123' },
          admin: { username: 'testuser1', password: 'test123' },
        };
        const { username, password } = debugUsers[role];

        wx.showLoading({ title: '登录中...' });
        try {
          const res = await this.request('debug-login', 'POST', { username, password });
          wx.hideLoading();
          if (res?.success) {
            const token = res.data.token;
            this.setData({ token });
            wx.setStorageSync('token', token);
            await this.refreshData();
            wx.showToast({
              title: `${role === 'admin' ? '管理员' : role === 'moderator' ? '吧主' : '普通用户'}登录成功`,
              icon: 'success',
            });
          } else {
            this.showTipModal('登录失败', res?.message || '用户名或密码错误');
          }
        } catch (err) {
          wx.hideLoading();
          this.showTipModal('登录失败', err.message || '请检查网络连接后重试');
        }
      },
      fail: () => {
        this.showTipModal('提示', '请先登录以使用完整功能');
      },
    });
  },

  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('token');
          this.resetUserInfo();
          this.autoLogin();
          wx.showToast({ title: '已退出登录', icon: 'success' });
        }
      },
    });
  },

  showTipModal(title, content) {
    this.setData({ showTip: true, title, content });
  },

  onCloseTipModal() {
    this.setData({ showTip: false, title: '', content: '' });
  },

  formatTime(date) {
    if (!date || (typeof date !== 'string' && typeof date !== 'object')) return '未知时间';
    const now = new Date();
    const time = new Date(date);
    if (isNaN(time.getTime())) return '无效时间';
    const diff = (now - time) / 1000;
    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
    return time.toLocaleDateString();
  },
});