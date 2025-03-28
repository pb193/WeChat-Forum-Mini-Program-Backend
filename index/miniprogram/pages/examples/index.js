const app = getApp();

Page({
  data: {
    content: '',
    mediaFiles: [],
    categories: ['吐槽', '二手交易', '表白', '反馈'],
    categoryIndex: 0,
    isAnonymous: false,
    currentUser: null,
    submitting: false,
    uploadProgress: 0,
    token: '',
  },

  onLoad() {
    const token = wx.getStorageSync('token');
    console.log('当前 token:', token);
    if (!token) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      wx.navigateBack();
    } else {
      this.setData({ token });
      this.getCurrentUser();
    }
  },

  request({ url, method = 'GET', data = {}, success, fail }) {
    const fullUrl = `${app.globalData.apiBaseUrl}/${url}`;
    console.log(`发起请求: ${method} ${fullUrl}`, data);
    wx.request({
      url: fullUrl,
      method,
      data,
      header: { 'Authorization': `Bearer ${this.data.token}` },
      success: (res) => {
        console.log(`请求 ${url} 返回:`, res.data);
        if (res.data.success) {
          success(res.data);
        } else {
          this.handleError(`${url} 请求失败`, res.data.message || '未知错误');
          if (fail) fail(res.data);
        }
      },
      fail: (err) => {
        this.handleError(`${url} 请求失败`, err.errMsg || '网络错误，请稍后重试', err);
        if (fail) fail(err);
      },
    });
  },

  getCurrentUser() {
    this.request({
      url: 'user',
      success: (data) => {
        this.setData({ currentUser: data.data });
      },
      fail: (err) => {
        wx.showToast({ title: '获取用户信息失败', icon: 'none' });
        wx.navigateBack();
      },
    });
  },

  cancel() {
    const { content, mediaFiles } = this.data;
    if (content || mediaFiles.length > 0) {
      wx.showModal({
        title: '提示',
        content: '内容尚未保存，确定要取消吗？',
        confirmText: '确定',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) wx.navigateBack();
        },
      });
    } else {
      wx.navigateBack();
    }
  },

  submitPost() {
    const { content, currentUser, submitting, categories, categoryIndex, isAnonymous } = this.data;
    if (submitting) return wx.showToast({ title: '正在发布中，请稍候', icon: 'none' });
    if (!currentUser) return wx.showToast({ title: '请先登录', icon: 'none' });

    // 检查用户是否被禁言
    if (currentUser.muteUntil && new Date() < new Date(currentUser.muteUntil)) {
      wx.showModal({
        title: '无法发布',
        content: `您已被禁言，禁言将持续至 ${this.formatTime(currentUser.muteUntil)}`,
        showCancel: false,
      });
      return;
    }

    if (!content.trim()) return wx.showToast({ title: '请填写内容', icon: 'none' });
    if (!categories.length || categoryIndex < 0 || categoryIndex >= categories.length) {
      return wx.showToast({ title: '请选择有效分类', icon: 'none' });
    }

    this.setData({ submitting: true, uploadProgress: 0 });

    this.uploadMediaFiles()
      .then((uploadedMediaFiles) => {
        this.request({
          url: 'posts',
          method: 'POST',
          data: {
            category: categories[categoryIndex],
            content,
            mediaFiles: uploadedMediaFiles,
            isAnonymous,
          },
          success: (data) => {
            wx.showToast({ title: '发布成功', icon: 'success' });
            this.resetForm();
            wx.navigateBack();
          },
          fail: (err) => {
            this.handleSubmissionError(err.message || '发布失败');
          },
        });
      })
      .catch((err) => {
        console.error('发布失败:', err);
        this.handleSubmissionError(err.message || '网络错误，请稍后重试');
      });
  },

  uploadMediaFiles() {
    const { mediaFiles, currentUser } = this.data;
    if (!mediaFiles.length) return Promise.resolve([]);

    const totalFiles = mediaFiles.length;
    let uploadedFiles = 0;
    let failedFiles = [];

    const uploadTasks = mediaFiles.map((file, index) => {
      return new Promise((resolve, reject) => {
        if (file.match(/\.(jpg|jpeg|png)$/i)) {
          wx.compressImage({
            src: file,
            quality: 85,
            success: (res) => {
              this.uploadCompressedFile(res.tempFilePath, index, resolve, reject);
            },
            fail: (err) => {
              console.error(`压缩图片 ${file} 失败:`, err);
              failedFiles.push(file);
              uploadedFiles += 1;
              this.setData({ uploadProgress: Math.round((uploadedFiles / totalFiles) * 100) });
              resolve(null);
            },
          });
        } else {
          this.uploadCompressedFile(file, index, resolve, reject);
        }
      });
    });

    return Promise.all(uploadTasks).then((results) => {
      const uploadedMediaFiles = results.filter(Boolean);
      if (failedFiles.length > 0) {
        return new Promise((resolve, reject) => {
          wx.showModal({
            title: '提示',
            content: `以下文件上传失败：${failedFiles.map(f => f.split('/').pop()).join(', ')}，是否继续发布？`,
            confirmText: '继续',
            cancelText: '取消',
            success: (res) => {
              if (res.confirm) {
                resolve(uploadedMediaFiles);
              } else {
                this.setData({ submitting: false, uploadProgress: 0 });
                reject(new Error('用户取消发布'));
              }
            },
          });
        });
      }
      return uploadedMediaFiles;
    });
  },

  uploadCompressedFile(filePath, index, resolve, reject) {
    const { currentUser } = this.data;
    const fileExt = filePath.split('.').pop().toLowerCase();
    const cloudPath = `media/${currentUser.id}/${Date.now()}-${index}.${fileExt}`;

    wx.uploadFile({
      url: `${app.globalData.apiBaseUrl}/upload`,
      filePath: filePath,
      name: 'file',
      header: { 'Authorization': `Bearer ${this.data.token}` },
      formData: { cloudPath },
      success: (res) => {
        console.log(`上传响应 (文件 ${index}):`, res);
        if (res.statusCode !== 200) {
          console.error('上传失败，状态码:', res.statusCode, '数据:', res.data);
          resolve(null);
        } else {
          try {
            const data = JSON.parse(res.data);
            if (data.success) {
              resolve(data.data.urls ? data.data.urls[0] : null);
            } else {
              console.error('上传失败，服务器返回:', data.message);
              resolve(null);
            }
          } catch (parseErr) {
            console.error('解析 JSON 失败:', parseErr, res.data);
            if (res.data.includes('<!DOCTYPE html>')) {
              this.handleError('文件上传', '服务器返回错误，请检查网络或联系管理员');
            }
            resolve(null);
          }
        }
      },
      fail: (err) => {
        console.error(`文件 ${filePath} 上传失败:`, err);
        resolve(null);
      },
      complete: () => {
        uploadedFiles += 1;
        this.setData({ uploadProgress: Math.round((uploadedFiles / totalFiles) * 100) });
      },
    });
  },

  handleSubmissionError(message) {
    wx.showModal({
      title: '发布失败',
      content: message,
      showCancel: false,
    });
    this.setData({ submitting: false, uploadProgress: 0 });
  },

  resetForm() {
    this.setData({
      content: '',
      mediaFiles: [],
      categoryIndex: 0,
      isAnonymous: false,
      submitting: false,
      uploadProgress: 0,
    });
  },

  bindContent(e) {
    this.setData({ content: e.detail.value });
  },

  bindCategoryChange(e) {
    this.setData({ categoryIndex: e.detail.value });
  },

  chooseMedia() {
    wx.chooseMedia({
      count: 9 - this.data.mediaFiles.length,
      mediaType: ['image', 'video'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newFiles = res.tempFiles.map((file) => file.tempFilePath);
        this.setData({ mediaFiles: [...this.data.mediaFiles, ...newFiles] });
      },
      fail: (err) => console.error('选择媒体失败:', err),
    });
  },

  previewMedia(e) {
    const index = e.currentTarget.dataset.index;
    const mediaFile = this.data.mediaFiles[index];
    const isImage = mediaFile.match(/\.(jpg|jpeg|png|gif)$/i);
    const isVideo = mediaFile.match(/\.(mp4|mov)$/i);

    if (isImage) {
      wx.previewImage({
        current: mediaFile,
        urls: this.data.mediaFiles.filter((file) => file.match(/\.(jpg|jpeg|png|gif)$/i)),
      });
    } else if (isVideo) {
      wx.previewMedia({
        sources: [{ url: mediaFile, type: 'video' }],
      });
    } else {
      wx.showToast({ title: '不支持预览此类型文件', icon: 'none' });
    }
  },

  deleteMedia(e) {
    const index = e.currentTarget.dataset.index;
    wx.showModal({
      title: '提示',
      content: '确定要删除此文件吗？',
      confirmText: '确定',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            mediaFiles: this.data.mediaFiles.filter((_, i) => i !== index),
          });
        }
      },
    });
  },

  toggleAnonymous(e) {
    this.setData({ isAnonymous: e.detail.value });
  },

  handleError(action, message, err) {
    console.error(`${action}:`, err || message);
    wx.showModal({
      title: '错误',
      content: message,
      showCancel: false,
    });
    this.setData({ submitting: false });
  },

  // 新增时间格式化方法
  formatTime(date) {
    if (!date) return '未知时间';
    const time = new Date(date);
    if (isNaN(time.getTime())) return '无效时间';
    return time.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  },
});