// app.js
App({
  globalData: {
    userInfo: null,
    token: null,
    apiBaseUrl: 'http://localhost:3000/api', // 本地开发地址，上线时改为 HTTPS
    theme: 'light',
    themeListeners: [],
  },

  onLaunch: async function () {
    await this.loadUserInfo(); // 等待用户信息加载完成
    this.initTheme();
    this.checkUpdate();
  },

  // 加载用户信息
  async loadUserInfo() {
    const token = wx.getStorageSync('token');
    if (token) {
      this.globalData.token = token;
      try {
        const userInfo = await this.getUserInfoFromServer();
        console.log('Successfully loaded user info on launch:', userInfo);
      } catch (err) {
        console.error('Failed to load user info on launch:', err.message || err);
        this.handleAuthFailure(err); // 处理认证失败
      }
    } else {
      console.log('No token found, skipping user info load');
    }
  },

  // 从服务器获取用户信息
  getUserInfoFromServer: function () {
    return new Promise((resolve, reject) => {
      const token = this.globalData.token || wx.getStorageSync('token');
      if (!token) {
        return reject(new Error('未提供认证令牌'));
      }
      wx.request({
        url: `${this.globalData.apiBaseUrl}/user`,
        method: 'GET',
        header: { 'Authorization': `Bearer ${token}` }, // 添加 Bearer 前缀
        success: (res) => {
          if (res.data.success) {
            this.globalData.userInfo = res.data.data;
            console.log('Successfully retrieved user info:', this.globalData.userInfo);
            resolve(res.data.data);
          } else {
            console.error('Failed to retrieve user info:', res.data.message);
            reject(new Error(res.data.message || '获取用户信息失败'));
          }
        },
        fail: (err) => {
          console.error('Failed to retrieve user info:', err);
          reject(err);
        },
      });
    });
  },

  // 处理认证失败
  handleAuthFailure(err) {
    const message = err.message || '未知错误';
    if (message.includes('未提供认证令牌') || message.includes('无效的认证令牌')) {
      this.globalData.token = null;
      this.globalData.userInfo = null;
      wx.removeStorageSync('token');
      wx.showToast({
        title: '登录已过期，请重新登录',
        icon: 'none',
        duration: 2000,
      });
      // 可选：跳转到登录页面
      // wx.navigateTo({ url: '/pages/login/login' });
    }
  },

  // 初始化主题（占位）
  initTheme() {
    // 实现主题初始化逻辑
    console.log('Theme initialized:', this.globalData.theme);
  },

  // 检查小程序更新（占位）
  checkUpdate() {
    const updateManager = wx.getUpdateManager();
    updateManager.onUpdateReady(() => {
      wx.showModal({
        title: '更新提示',
        content: '新版本已就绪，是否重启应用？',
        success: (res) => {
          if (res.confirm) {
            updateManager.applyUpdate();
          }
        },
      });
    });
  },
});