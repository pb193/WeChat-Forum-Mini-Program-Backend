// pages/post/post.js
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
    uploadProgress: 0, // 新增上传进度
  },

  onLoad() {
    this.getCurrentUser();
  },

  async getCurrentUser() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: { type: 'getUserInfo' },
      });
      if (res.result.success) {
        this.setData({ currentUser: res.result.data });
      } else {
        wx.showToast({ title: res.result.errorMessage || '获取用户信息失败', icon: 'none' });
        wx.navigateBack();
      }
    } catch (err) {
      console.error('获取用户信息失败', err);
      wx.showToast({ title: '网络错误，请稍后重试', icon: 'none' });
      wx.navigateBack();
    }
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

  async submitPost() {
    const { content, currentUser, submitting, categories, categoryIndex, isAnonymous } = this.data;
    if (submitting) return wx.showToast({ title: '正在发布中，请稍候', icon: 'none' });
    if (!currentUser) return wx.showToast({ title: '请先登录', icon: 'none' });
    if (!content.trim()) return wx.showToast({ title: '请填写内容', icon: 'none' });
    if (!categories.length || categoryIndex < 0 || categoryIndex >= categories.length) {
      return wx.showToast({ title: '请选择有效分类', icon: 'none' });
    }

    this.setData({ submitting: true, uploadProgress: 0 });

    try {
      const uploadedMediaFiles = await this.uploadMediaFiles();
      const res = await wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: {
          type: 'addPost',
          category: categories[categoryIndex],
          content,
          mediaFiles: uploadedMediaFiles,
          isAnonymous,
        },
      });

      if (res.result.success) {
        wx.showToast({ title: '发布成功', icon: 'success' });
        this.resetForm();
        wx.navigateBack();
      } else {
        this.handleSubmissionError(res.result.errorMessage || '发布失败');
      }
    } catch (err) {
      console.error('发布失败:', err);
      this.handleSubmissionError('网络错误，请稍后重试');
    }
  },

  async uploadMediaFiles() {
    const { mediaFiles, currentUser } = this.data;
    if (!mediaFiles.length) return [];

    const totalFiles = mediaFiles.length;
    let uploadedFiles = 0;
    let failedFiles = [];

    const uploadTasks = mediaFiles.map(async (file, index) => {
      try {
        const fileExt = file.split('.').pop().toLowerCase();
        const cloudPath = `media/${currentUser._openid}/${Date.now()}-${index}.${fileExt}`;
        const result = await wx.cloud.uploadFile({ cloudPath, filePath: file });
        uploadedFiles += 1;
        this.setData({ uploadProgress: Math.round((uploadedFiles / totalFiles) * 100) });
        return result.fileID;
      } catch (err) {
        console.error(`文件 ${file} 上传失败:`, err);
        failedFiles.push(file);
        uploadedFiles += 1;
        this.setData({ uploadProgress: Math.round((uploadedFiles / totalFiles) * 100) });
        return null;
      }
    });

    const results = await Promise.all(uploadTasks);
    const uploadedMediaFiles = results.filter(Boolean);

    if (failedFiles.length > 0) {
      wx.showModal({
        title: '提示',
        content: `以下文件上传失败：${failedFiles.map(f => f.split('/').pop()).join(', ')}，是否继续发布？`,
        confirmText: '继续',
        cancelText: '取消',
        success: (res) => {
          if (!res.confirm) {
            this.setData({ submitting: false });
            throw new Error('用户取消发布');
          }
        },
      });
    }

    return uploadedMediaFiles;
  },

  handleSubmissionError(message) {
    wx.showToast({ title: message, icon: 'none' });
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
});