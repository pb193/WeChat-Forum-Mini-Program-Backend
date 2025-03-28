// pages/share/index.js
Page({
  data: {
    qrCodeUrl: '', // 小程序二维码 URL
  },

  onLoad() {
    this.generateQRCode();
  },

  // 生成小程序二维码
  generateQRCode() {
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '生成中...' });
    wx.request({
      url: 'http://localhost:3000/api/genMpQrcode', // 本地后端生成二维码接口
      method: 'POST',
      header: {
        'Authorization': token,
      },
      data: {
        path: 'pages/feed/index', // 默认跳转页面
        width: 430,
      },
      success: (res) => {
        wx.hideLoading();
        if (res.data.success) {
          this.setData({ qrCodeUrl: res.data.data.qrCodeUrl });
        } else {
          wx.showToast({ title: res.data.message || '生成二维码失败', icon: 'none' });
        }
      },
      fail: (err) => {
        console.error('生成二维码失败', err);
        wx.hideLoading();
        wx.showToast({ title: '生成二维码失败', icon: 'none' });
      },
    });
  },

  // 保存二维码到相册
  saveQRCode() {
    if (!this.data.qrCodeUrl) {
      wx.showToast({ title: '二维码尚未生成', icon: 'none' });
      return;
    }
    wx.downloadFile({
      url: this.data.qrCodeUrl,
      success: (res) => {
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => {
            wx.showToast({ title: '保存成功', icon: 'success' });
          },
          fail: (err) => {
            console.error('保存二维码失败', err);
            wx.showToast({ title: '保存失败', icon: 'none' });
          },
        });
      },
      fail: (err) => {
        console.error('下载二维码失败', err);
        wx.showToast({ title: '下载失败', icon: 'none' });
      },
    });
  },
});