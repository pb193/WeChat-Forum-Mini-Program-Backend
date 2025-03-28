const app = getApp();

Page({
  data: {
    postId: null,
    post: {},
    comments: [],
    isLiked: false,
    commentInput: '',
    loading: false,
    error: '',
    token: '',
    _forceRender: 0,
    isSubmitDisabled: true,
    currentUser: null // 新增字段，用于存储当前用户信息
  },

  onLoad(options) {
    if (!options.postId) {
      wx.showToast({ title: '帖子ID无效', icon: 'none' });
      wx.navigateBack();
      return;
    }
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showModal({
        title: '未登录',
        content: '请先登录以查看帖子详情',
        showCancel: false,
        success: () => {
          wx.navigateTo({ url: '/pages/login/login' });
        },
      });
      return;
    }
    this.setData({ postId: options.postId, token });
    this.getPostDetail();
    this.getComments();
    this.getCurrentUser(); // 新增获取当前用户
  },

  // 新增获取当前用户的方法
  async getCurrentUser() {
    try {
      const res = await this.request('user');
      if (res.success && res.data) {
        this.setData({ currentUser: res.data });
      } else {
        console.error('获取用户信息失败:', res.message);
      }
    } catch (err) {
      console.error('获取当前用户信息失败:', err);
    }
  },

  async getPostDetail() {
    this.setData({ loading: true, error: '' });
    try {
      const res = await this.request(`posts/${this.data.postId}`);
      console.log('Post data from server:', res.data);
      if (res.success && res.data) {
        const post = res.data;
        let mediaFiles = post.mediaFiles || [];
        const baseUrl = app.globalData.apiBaseUrl || 'http://localhost:3000';
        mediaFiles = (Array.isArray(mediaFiles) ? mediaFiles : JSON.parse(mediaFiles || '[]'))
          .map(file => typeof file === 'string' && !file.startsWith('http') ? `${baseUrl}${file}` : file)
          .filter(Boolean);
        console.log('Parsed mediaFiles:', mediaFiles);
        this.setData({
          post: { ...post, mediaFiles },
          isLiked: post.isLiked || false,
          'post.likeCount': post.likeCount || 0,
        });
      } else {
        this.setData({ error: res.message || '帖子不存在' });
      }
    } catch (err) {
      this.setData({ error: '加载失败，请检查网络' });
      console.error('获取帖子详情失败:', err);
    } finally {
      this.setData({ loading: false });
    }
  },
  async getComments() {
    this.setData({ loading: true, error: '' });
    try {
      const res = await this.request(`posts/${this.data.postId}/comments`);
      if (res.success && res.data) {
        this.setData({ comments: res.data });
      } else {
        this.setData({ comments: [] });
        wx.showToast({ title: res.message || '暂无评论', icon: 'none' });
      }
    } catch (err) {
      this.setData({ comments: [], error: '加载评论失败' });
      wx.showToast({ title: this.data.error, icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  async toggleLike() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    try {
      const res = await this.request(`posts/${this.data.postId}/like`, 'POST', {
        action: this.data.isLiked ? 'unlike' : 'like',
      });
      if (res.success) {
        this.setData({
          isLiked: !this.data.isLiked,
          'post.likeCount': res.data.likeCount || (this.data.isLiked ? this.data.post.likeCount - 1 : this.data.post.likeCount + 1),
        });
        wx.showToast({ title: this.data.isLiked ? '已点赞' : '已取消点赞', icon: 'success' });
      } else {
        wx.showToast({ title: res.message || '操作失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '操作失败，请检查网络', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  onCommentInput(e) {
    const value = e.detail.value;
    this.setData({
      commentInput: value,
      isSubmitDisabled: !this.data.loading && value.trim().length === 0
    });
    console.log('输入值:', value);
    console.log('当前 commentInput:', this.data.commentInput);
    console.log('按钮是否应启用:', !this.data.isSubmitDisabled);
  },

  async submitComment() {
    const content = this.data.commentInput.trim();
    console.log('提交时的内容:', content);
    if (!content) {
      wx.showToast({ title: '评论不能为空', icon: 'none' });
      return;
    }
    if (content.length > 200) {
      wx.showToast({ title: '评论不能超过200字', icon: 'none' });
      return;
    }
    if (this.data.loading) return;

    // 检查用户是否被禁言
    if (this.data.currentUser && this.data.currentUser.muteUntil && new Date() < new Date(this.data.currentUser.muteUntil)) {
      wx.showModal({
        title: '无法评论',
        content: `您已被禁言，禁言将持续至 ${this.formatTime(this.data.currentUser.muteUntil)}`,
        showCancel: false,
      });
      return;
    }

    this.setData({ loading: true, isSubmitDisabled: true });
    try {
      const res = await this.request(`posts/${this.data.postId}/comments`, 'POST', { content });
      if (res.success && res.data) {
        const newComment = res.data;
        const updatedComments = [newComment, ...this.data.comments].sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        this.setData({
          comments: updatedComments,
          commentInput: '',
          isSubmitDisabled: true
        });
        wx.showToast({ title: '评论成功', icon: 'success' });
      } else {
        wx.showToast({ title: res.message || '评论失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '评论失败，请检查网络', icon: 'none' });
    } finally {
      this.setData({ 
        loading: false,
        isSubmitDisabled: !this.data.commentInput.trim().length
      });
    }
  },

  previewImage(e) {
    const currentIndex = e.currentTarget.dataset.index;
    const images = this.data.post.mediaFiles || [];
    wx.previewImage({
      current: images[currentIndex],
      urls: images,
    });
  },

  request(url, method = 'GET', data = {}) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.apiBaseUrl}/${url}`,
        method,
        data,
        header: { 'Authorization': `Bearer ${this.data.token}` },
        success: (res) => {
          if (res.data.success) {
            resolve(res.data);
          } else {
            reject(res.data);
          }
        },
        fail: (err) => reject(err),
      });
    });
  },

  formatTime(date) {
    if (!date) return '未知时间';
    const now = new Date();
    const time = new Date(date);
    if (isNaN(time.getTime())) return '无效时间';
    const diff = (now - time) / 1000;
    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
    return time.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }); // 修改为更详细的格式以显示禁言时间
  },

  onImageLoad(e) {
    const index = e.currentTarget.dataset.index;
    console.log('图片加载成功:', this.data.post.mediaFiles[index]);
  },

  onShareAppMessage() {
    const { post } = this.data;
    return {
      title: `${post.username} 的帖子: ${post.content.slice(0, 20)}${post.content.length > 20 ? '...' : ''}`,
      path: `/pages/postDetail/index?postId=${this.data.postId}`,
      imageUrl: post.avatar || 'https://via.placeholder.com/40',
    };
  },
});