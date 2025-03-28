const app = getApp();

Page({
  data: {
    avatarUrl: '', // 初始化为空，等待获取微信头像
    username: '',
    grade: '',
    department: '',
    bio: '',
    token: '',
    gradeOptions: ['Freshman', 'Sophomore', 'Junior', 'Senior'],
    gradeIndex: -1,
  },

  onLoad() {
    const token = wx.getStorageSync('token');
    const userInfo = app.globalData.userInfo || {};
    if (token && userInfo) {
      const gradeIndex = this.data.gradeOptions.indexOf(userInfo.grade || '');
      this.setData({
        token,
        avatarUrl: userInfo.avatar || '', // 使用后端返回的头像（若有）
        username: userInfo.username || '',
        grade: userInfo.grade || '',
        gradeIndex: gradeIndex >= 0 ? gradeIndex : -1,
        department: userInfo.department || '',
        bio: userInfo.bio || '',
      });
      console.log('初始数据:', this.data);
    }
  },

  // 获取微信头像和昵称
  getUserProfile() {
    wx.getUserProfile({
      desc: '用于完善个人资料', // 提示用户授权的目的
      success: (res) => {
        const { avatarUrl, nickName } = res.userInfo;
        this.setData({
          avatarUrl, // 直接使用微信头像 URL
          username: this.data.username || nickName, // 如果未设置用户名，使用微信昵称
        });
        wx.showToast({ title: '获取成功', icon: 'success' });
      },
      fail: (err) => {
        console.error('获取用户信息失败:', err);
        wx.showToast({ title: '获取失败，请重试', icon: 'none' });
      },
    });
  },

  onInputChange(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
  },

  bindGradeChange(e) {
    const gradeIndex = e.detail.value;
    this.setData({
      gradeIndex,
      grade: this.data.gradeOptions[gradeIndex],
    });
  },

  async saveProfile() {
    const { avatarUrl, username, grade } = this.data;

    if (!username.trim()) {
      wx.showToast({ title: '用户名不能为空', icon: 'none' });
      return;
    }
    if (!grade) {
      wx.showToast({ title: '请选择年级', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });
    try {
      const data = {
        avatar: avatarUrl, // 保存微信头像 URL
        username: username.trim(),
        grade,
        department: this.data.department,
        bio: this.data.bio,
      };
      console.log('发送数据:', data);
      const res = await this.request('user', 'PUT', data);
      wx.hideLoading();
      if (res.success) {
        app.globalData.userInfo = res.data;
        wx.showToast({ title: '保存成功', icon: 'success' });
        wx.navigateBack();
      } else {
        wx.showToast({ title: res.message || '保存失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '保存失败，请稍后重试', icon: 'none' });
      console.error('保存资料失败:', err);
    }
  },

  async request(url, method = 'GET', data = {}) {
    const token = this.data.token || wx.getStorageSync('token');
    if (!token) throw new Error('未登录');
    return new Promise((resolve, reject) => {
      wx.request({
        url: `http://localhost:3000/api/${url}`,
        method,
        data,
        header: { 'Authorization': `Bearer ${token}` },
        success: (res) => {
          console.log(`请求成功 (${url}):`, res.data);
          resolve(res.data);
        },
        fail: (err) => reject(err),
      });
    });
  },

  onImageError(e) {
    console.error('头像加载失败:', e.detail);
    wx.showToast({ title: '头像加载失败', icon: 'none' });
  },
});