const app = getApp();

Page({
  data: {
    role: '',
    myPosts: [],
    posts: [],
    users: [],
    filteredUsers: [],
    topPosts: [],
    notices: [],
    logs: [],
    stats: {},
    reportedPosts: [], // 新增字段存储举报最多帖子
    loading: false,
    userId: null,
    token: '',
    collapsed: {
      myPosts: true,
      posts: true,
      users: true,
      topPosts: true,
      notices: true,
      logs: true,
      stats: true,
      reportedPosts: true, // 新增字段
    },
    searchQuery: '',
    expandedSections: [],
    maxExpanded: 2,
  },

  onLoad() {
    const token = wx.getStorageSync('token');
    if (!token) {
      this.debugLogin();
      return;
    }
    this.setData({ token, loading: true });
    this.getUserRole();
  },

  debugLogin() {
    wx.showLoading({ title: '登录中...', mask: true });
    this.request({
      url: 'debug-login',
      method: 'POST',
      data: { username: 'testuser2' },
      success: (data) => {
        wx.hideLoading();
        const token = data.data.token;
        wx.setStorageSync('token', token);
        this.setData({ token, loading: true });
        this.getUserRole();
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

  getUserRole() {
    this.request('user', 'GET', {}, (res) => {
      const role = res.data?.role || '';
      const userId = res.data?.id;
      if (!userId) {
        wx.showToast({ title: '获取用户信息失败', icon: 'none' });
        wx.navigateTo({ url: '/pages/user-center/index' });
        return;
      }
      console.log('User Info:', { role, userId });
      this.setData({ role, userId, loading: false });
      this.loadData();
    }, (err) => {
      console.error('获取用户信息失败:', err);
      this.setData({ loading: false });
      if (err.message === '认证失败') {
        this.handleAuthError();
      }
    });
  },
// 新增获取举报最多帖子方法
getReportedPosts() {
  this.request('admin/reported-posts', 'GET', {}, (res) => {
    console.log('Reported Posts Response:', res);
    this.setData({ reportedPosts: res.data || [] });
  });
},

  loadData() {
    this.getMyPosts();
    if (this.data.role === 'admin' || this.data.role === 'moderator') {
      console.log('加载 moderator 或 admin 数据');
      this.getPosts();
      this.getUsers();
      this.getTopPosts();
      this.getNotices();
      this.getReportedPosts(); // 新增加载举报最多帖子
      if (this.data.role === 'admin') {
        console.log('加载 admin 专属数据');
        this.getLogs();
        this.getStats();
      }
    } else {
      console.log('非管理员用户，仅加载个人帖子');
    }
    setTimeout(() => {
      console.log('加载完成后 data:', this.data);
    }, 1000);
  },
  getMyPosts() {
    if (!this.data.userId) return;
    this.request(`posts?userId=${this.data.userId}`, 'GET', {}, (res) => {
      console.log('My Posts Response:', res);
      this.setData({ myPosts: res.data || [] });
    });
  },

  getPosts() {
    this.request('admin/top-liked-posts', 'GET', {}, (res) => {
      console.log('Top Liked Posts Response:', res);
      this.setData({ posts: res.data || [] });
    });
  },

  getUsers() {
    this.request('admin/users', 'GET', {}, (res) => {
      console.log('Users Response:', res);
      const users = res.data || [];
      this.setData({ users, filteredUsers: users }); // 初始化 filteredUsers
    });
  },

  getTopPosts() {
    this.request('admin/top-liked-posts', 'GET', {}, (res) => {
      console.log('Top Posts Response:', res);
      this.setData({ topPosts: res.data || [] });
    });
  },

  getNotices() {
    this.request('admin/notices', 'GET', {}, (res) => {
      console.log('Notices Response:', res);
      this.setData({ notices: res.data || [] });
    });
  },

  getLogs() {
    this.request('admin/logs', 'GET', {}, (res) => {
      console.log('Logs Response:', res);
      this.setData({ logs: res.data || [] });
    });
  },

  getStats() {
    this.request('admin/stats', 'GET', {}, (res) => {
      console.log('Stats Response:', res);
      this.setData({ stats: res.data || {} });
    });
  },

  // 修改 toggleSection 方法，限制展开数量
  toggleSection(e) {
    const section = e.currentTarget.dataset.section;
    const isCollapsed = this.data.collapsed[section];
    const newCollapsed = { ...this.data.collapsed };
    let expandedSections = [...this.data.expandedSections];

    if (isCollapsed) {
      // 展开时检查数量
      if (expandedSections.length >= this.data.maxExpanded) {
        const oldestSection = expandedSections.shift(); // 移除最早展开的
        newCollapsed[oldestSection] = true; // 收起它
      }
      expandedSections.push(section); // 添加新展开的
      newCollapsed[section] = false;
    } else {
      // 收起时从数组中移除
      expandedSections = expandedSections.filter((s) => s !== section);
      newCollapsed[section] = true;
    }

    this.setData({ collapsed: newCollapsed, expandedSections });
  },

  goToPostDetail(e) {
    const postId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/post-detail/post-detail?id=${postId}`,
    });
  },

// 修改 deletePost 方法，确保删除后更新 reportedPosts
deletePost(e) {
  if (!this.checkAdminPermission()) return;
  const postId = e.currentTarget.dataset.id;
  wx.showModal({
    title: '确认删除',
    content: '确定要删除此帖子吗？',
    success: (res) => {
      if (res.confirm) {
        this.request(`admin/posts/${postId}`, 'DELETE', {}, () => {
          wx.showToast({ title: '帖子已删除', icon: 'success' });
          this.setData({
            myPosts: this.data.myPosts.filter(post => post.id !== postId),
            posts: this.data.posts.filter(post => post.id !== postId),
            topPosts: this.data.topPosts.filter(post => post.id !== postId),
            reportedPosts: this.data.reportedPosts.filter(post => post.id !== postId), // 新增
          });
          this.loadData(); // 刷新所有数据
        });
      }
    },
  });
},
  muteUser(e) {
    if (!this.checkAdminPermission()) return;
    const userId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '禁言用户',
      content: '请输入禁言时长（分钟）',
      showCancel: true,
      confirmText: '确定',
      editable: true,
      success: (res) => {
        if (res.confirm && res.content) {
          const duration = parseInt(res.content, 10);
          if (isNaN(duration) || duration <= 0) {
            wx.showToast({ title: '请输入有效时长', icon: 'none' });
            return;
          }
          this.request(`admin/mute-user/${userId}`, 'POST', { duration }, () => {
            wx.showToast({ title: '用户已禁言', icon: 'success' });
            this.getUsers();
          });
        }
      },
    });
  },

  unmuteUser(e) {
    if (!this.checkAdminPermission()) return;
    const userId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '解除禁言',
      content: '确定要解除该用户的禁言吗？',
      success: (res) => {
        if (res.confirm) {
          this.request(`admin/unmute-user/${userId}`, 'POST', {}, () => {
            wx.showToast({ title: '禁言已解除', icon: 'success' });
            this.getUsers();
          });
        }
      },
    });
  },

  // 新增搜索用户方法
  onSearchInput(e) {
    const searchQuery = e.detail.value.trim();
    this.setData({ searchQuery });
    this.filterUsers();
  },

  filterUsers() {
    const { users, searchQuery } = this.data;
    if (!searchQuery) {
      this.setData({ filteredUsers: users });
      return;
    }
    const filteredUsers = users.filter(user =>
      user.username && user.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
    this.setData({ filteredUsers });
  },

  checkAdminPermission() {
    if (this.data.role !== 'admin' && this.data.role !== 'moderator') {
      wx.showToast({ title: '无管理员权限', icon: 'none' });
      return false;
    }
    return true;
  },
  
  request(url, method, data, success, fail) {
    const token = this.data.token || wx.getStorageSync('token');
    if (!token) {
      this.handleAuthError();
      return;
    }
    console.log('Sending Request:', { url, method, data, token });
    wx.request({
      url: `${app.globalData.apiBaseUrl}/${url}`,
      method,
      data,
      header: { 'Authorization': `Bearer ${token}` },
      success: (res) => {
        console.log('Response:', res);
        if (res.statusCode === 401) {
          this.handleAuthError();
          return;
        }
        if (res.data.success) {
          success(res.data);
        } else if (fail) {
          fail(res.data);
        }
      },
      fail: (err) => {
        console.error('请求失败:', err);
        if (fail) fail(err);
      },
    });
  },
  banUser(e) {
    if (this.data.role !== 'admin') {
      wx.showToast({ title: '仅超级管理员可封禁用户', icon: 'none' });
      return;
    }
    const userId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '封禁用户',
      content: '确定要封禁该用户吗？',
      success: (res) => {
        if (res.confirm) {
          this.request(`admin/ban-user/${userId}`, 'POST', {}, () => {
            wx.showToast({ title: '用户已封禁', icon: 'success' });
            this.getUsers();
          });
        }
      },
    });
  },

  unbanUser(e) {
    if (this.data.role !== 'admin') return;
    const userId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '解封用户',
      content: '确定要解封该用户吗？',
      success: (res) => {
        if (res.confirm) {
          this.request(`admin/unban-user/${userId}`, 'POST', {}, () => {
            wx.showToast({ title: '用户已解封', icon: 'success' });
            this.getUsers();
          });
        }
      },
    });
  },

  handleAuthError() {
    wx.removeStorageSync('token');
    this.setData({ token: '', userId: null, role: '' });
    wx.showModal({
      title: '登录已过期',
      content: '请重新登录',
      showCancel: false,
      success: () => {
        this.debugLogin();
      },
    });
  },
});