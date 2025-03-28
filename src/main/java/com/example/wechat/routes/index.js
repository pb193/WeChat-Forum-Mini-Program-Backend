const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const adminRoutes = require('./admin');
const authMiddleware = require('../middleware/auth');
const { reportPost, cancelReportPost } = require('../service/service');

console.log('Imported reportPost:', reportPost);
// 配置常量
const config = {
  validCategories: ['吐槽', '二手交易', '表白', '反馈', '求助'],
  anonymousAvatar: 'https://your-cloud-storage/anonymous-avatar.png',
};

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads')); // 保存到 server.js 同级目录下的 uploads
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).substring(2)}${ext}`);
  },
});
const upload = multer({ storage });

// 输入验证函数
function validateInput(data, requiredFields) {
  const missingFields = requiredFields.filter(
      (field) => {
        const value = data[field];
        return value === undefined || value === null || value.toString().trim() === '';
      }
  );
  if (missingFields.length > 0) {
    throw new Error(`缺少必要字段: ${missingFields.join(', ')}`);
  }
}

// 类别验证函数
function validateCategory(category, validCategories = config.validCategories) {
  if (!validCategories.includes(category)) {
    throw new Error(`无效的类别: ${category}，可选类别: ${validCategories.join(', ')}`);
  }
}

// 挂载 admin 路由
router.use('/admin', authMiddleware, adminRoutes);

// 调试登录路由
router.post('/debug-login', async (req, res) => {
  try {
    const { username, avatar } = req.body;
    validateInput(req.body, ['username']);

    let debugUser = await global.db.User.findOne({ where: { username } });
    if (!debugUser) {
      debugUser = await global.db.User.create({
        username: username || 'testUser',
        password: '$2b$10$debughashedpassword',
        avatar: avatar || 'https://example.com/debug-avatar.png',
        role: 'user',
      });
    }

    const token = jwt.sign({ userId: debugUser.id }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '1h' });
    console.log('调试登录成功，返回 token:', token);

    res.json({
      success: true,
      data: {
        user: { id: debugUser.id, username: debugUser.username, avatar: debugUser.avatar, role: debugUser.role },
        token,
      },
    });
  } catch (err) {
    console.error('调试登录失败:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
});

// 获取用户信息
router.get('/user', authMiddleware, async (req, res) => {
  try {
    const user = await global.db.User.findByPk(req.userId);
    if (!user) return res.status(404).json({ success: false, message: '用户不存在' });
    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        avatar: user.avatar || '',
        grade: user.grade || '',
        department: user.department || '',
        bio: user.bio || '',
        isDebug: user.isDebug,
        role: user.role || '',
      },
    });
  } catch (err) {
    console.error('获取用户信息失败:', err);
    res.status(500).json({ success: false, message: '服务器错误，请稍后重试' });
  }
});

// 获取帖子列表
// 获取帖子列表
router.get('/posts', authMiddleware, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, sortBy = 'createdAt', category, userId } = req.query;
    const offset = (page - 1) * pageSize;
    const orderBy = sortBy === 'time' ? 'createdAt' : sortBy;

    const where = {};
    if (category) where.category = category;
    if (userId) where.userId = userId;

    const posts = await global.db.Post.findAll({
      where,
      limit: parseInt(pageSize),
      offset: parseInt(offset),
      order: [[orderBy, 'DESC']],
      include: [{ model: global.db.Comment, as: 'comments' }], // 修改为小写 'comments'
    });

    const total = await global.db.Post.count({ where });
    const hasMore = offset + posts.length < total;

    const postsData = posts.map((post) => ({
      ...post.toJSON(),
      likeCount: post.likedBy.length,
      comments: post.comments || [], // 修改为小写 'comments'
    }));

    res.json({ success: true, data: postsData, hasMore });
  } catch (err) {
    console.error('获取帖子失败:', err);
    res.status(500).json({ success: false, message: '服务器错误，请稍后重试' });
  }
});

// 添加新帖子（支持文件上传）
router.post('/posts', authMiddleware, async (req, res) => {
  try {
    const { category, content, mediaFiles = '[]', isAnonymous = 'false' } = req.body;
    const userId = req.userId;
    const parsedMediaFiles = typeof mediaFiles === 'string' ? JSON.parse(mediaFiles) : mediaFiles;

    const user = await global.db.User.findByPk(userId);
    if (!user) return res.status(404).json({ success: false, message: '用户不存在' });

    const post = await global.db.Post.create({
      userId,
      category,
      content,
      mediaFiles: parsedMediaFiles,
      isAnonymous: isAnonymous === 'true',
      username: isAnonymous === 'true' ? '匿名用户' : user.username,
      avatar: isAnonymous === 'true' ? config.anonymousAvatar : user.avatar,
    });

    res.json({ success: true, data: post.toJSON() });
  } catch (err) {
    console.error('添加帖子失败:', err);
    res.status(500).json({ success: false, message: err.message || '服务器错误' });
  }
});
// 举报帖子
// 举报帖子
// 举报帖子
// 举报帖子
// 举报帖子
router.post('/posts/:id/report', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const postId = req.params.id;
    const result = await reportPost(userId, postId);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('举报帖子失败:', err);
    res.status(err.message === '帖子不存在' ? 404 : 400).json({ success: false, message: err.message });
  }
});

// 取消举报帖子
router.delete('/posts/:id/report', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const postId = req.params.id;
    const result = await cancelReportPost(userId, postId);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('取消举报帖子失败:', err);
    res.status(err.message === '帖子不存在' ? 404 : 400).json({ success: false, message: err.message });
  }
});
// 点赞/取消点赞
router.post('/posts/:id/like', authMiddleware, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.userId;

    const post = await global.db.Post.findByPk(postId);
    if (!post) return res.status(404).json({ success: false, message: '帖子不存在' });

    let likedBy = post.likedBy || [];
    if (!likedBy.includes(userId)) {
      likedBy.push(userId);
      await post.update({ likedBy });
    }

    res.json({ success: true, data: { likeCount: likedBy.length } });
  } catch (err) {
    console.error('点赞失败:', err);
    res.status(500).json({ success: false, message: '服务器错误，请稍后重试' });
  }
});

router.delete('/posts/:id/like', authMiddleware, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.userId;

    const post = await global.db.Post.findByPk(postId);
    if (!post) return res.status(404).json({ success: false, message: '帖子不存在' });

    let likedBy = post.likedBy || [];
    if (likedBy.includes(userId)) {
      likedBy = likedBy.filter((id) => id !== userId);
      await post.update({ likedBy });
    }

    res.json({ success: true, data: { likeCount: likedBy.length } });
  } catch (err) {
    console.error('取消点赞失败:', err);
    res.status(500).json({ success: false, message: '服务器错误，请稍后重试' });
  }
});

// 添加评论
router.post('/posts/:id/comments', authMiddleware, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.userId;
    const { content } = req.body;

    validateInput({ content }, ['content']);

    const [post, user] = await Promise.all([
      global.db.Post.findByPk(postId),
      global.db.User.findByPk(userId),
    ]);
    if (!post) return res.status(404).json({ success: false, message: '帖子不存在' });
    if (!user) return res.status(404).json({ success: false, message: '用户不存在' });

    const comment = await global.db.Comment.create({
      postId,
      userId,
      username: user.username,
      content,
      createdAt: new Date(),
    });

    res.json({ success: true, data: comment.toJSON() });
  } catch (err) {
    console.error('添加评论失败:', err);
    res.status(500).json({ success: false, message: err.message || '服务器错误，请稍后重试' });
  }
});

// 获取用户点赞的帖子
router.get('/user/liked-posts', authMiddleware, async (req, res) => {
  try {
    const posts = await global.db.Post.findAll({
      where: { likedBy: { [Op.contains]: [req.userId] } }, // 使用 Sequelize JSON 包含查询
    });
    res.json({ success: true, data: posts.map((post) => ({ ...post.toJSON(), likeCount: post.likedBy.length })) });
  } catch (err) {
    console.error('获取点赞帖子失败:', err);
    res.status(500).json({ success: false, message: '服务器错误，请稍后重试' });
  }
});

// 获取用户评论的帖子
router.get('/user/commented-posts', authMiddleware, async (req, res) => {
  try {
    const posts = await global.db.Post.findAll({
      include: [{ model: global.db.Comment, as: 'Comments', where: { userId: req.userId } }],
    });
    res.json({ success: true, data: posts.map((post) => ({ ...post.toJSON(), likeCount: post.likedBy.length })) });
  } catch (err) {
    console.error('获取评论帖子失败:', err);
    res.status(500).json({ success: false, message: '服务器错误，请稍后重试' });
  }
});

// 删除帖子
router.delete('/posts/:id', authMiddleware, async (req, res) => {
  try {
    const post = await global.db.Post.findByPk(req.params.id);
    if (!post || post.userId !== req.userId) {
      return res.status(403).json({ success: false, message: '无权限删除' });
    }
    await post.destroy();
    res.json({ success: true });
  } catch (err) {
    console.error('删除帖子失败:', err);
    res.status(500).json({ success: false, message: '服务器错误，请稍后重试' });
  }
});

// 删除评论
router.delete('/posts/:postId/comments/:commentId', authMiddleware, async (req, res) => {
  try {
    const comment = await global.db.Comment.findByPk(req.params.commentId);
    if (!comment || comment.userId !== req.userId) {
      return res.status(403).json({ success: false, message: '无权限删除' });
    }
    await comment.destroy();
    res.json({ success: true });
  } catch (err) {
    console.error('删除评论失败:', err);
    res.status(500).json({ success: false, message: '服务器错误，请稍后重试' });
  }
});

// 更新用户资料
router.put('/user', authMiddleware, async (req, res) => {
  try {
    const user = await global.db.User.findByPk(req.userId);
    if (!user) return res.status(404).json({ success: false, message: '用户不存在' });
    await user.update(req.body);
    res.json({ success: true, data: user.toJSON() });
  } catch (err) {
    console.error('更新用户信息失败:', err);
    res.status(500).json({ success: false, message: '服务器错误，请稍后重试' });
  }
});

// 上传头像
router.post('/upload/avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: '未上传文件' });
    const avatarUrl = `/uploads/${req.file.filename}`;
    const user = await global.db.User.findByPk(req.userId);
    await user.update({ avatar: avatarUrl });
    res.json({ success: true, data: { url: avatarUrl } });
  } catch (err) {
    console.error('头像上传失败:', err);
    res.status(500).json({ success: false, message: '服务器错误，请稍后重试' });
  }
});

// 上传文件
router.post('/upload', authMiddleware, upload.array('file', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: '未上传文件' });
    }
    const baseUrl = 'https://your-server-domain.com'; // 替换为实际域名
    const fileUrls = req.files.map((file) => `${baseUrl}/uploads/${file.filename}`);
    console.log('上传成功的文件:', fileUrls);
    res.json({ success: true, data: { urls: fileUrls } });
  } catch (err) {
    console.error('文件上传失败:', err);
    res.status(500).json({ success: false, message: '服务器错误，请稍后重试' });
  }
});
// 获取帖子详情
router.get('/posts/:id', authMiddleware, async (req, res) => {
  try {
    const post = await global.db.Post.findByPk(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: '帖子不存在' });
    res.json({
      success: true,
      data: { ...post.toJSON(), likeCount: post.likedBy.length, isLiked: post.likedBy.includes(req.userId) },
    });
  } catch (err) {
    console.error('获取帖子详情失败:', err);
    res.status(500).json({ success: false, message: '服务器错误，请稍后重试' });
  }
});

// 获取帖子评论
router.get('/posts/:id/comments', authMiddleware, async (req, res) => {
  try {
    const comments = await global.db.Comment.findAll({
      where: { postId: req.params.id },
      order: [['createdAt', 'DESC']],
    });
    res.json({ success: true, data: comments.map((c) => c.toJSON()) });
  } catch (err) {
    console.error('获取评论失败:', err);
    res.status(500).json({ success: false, message: '服务器错误，请稍后重试' });
  }
});

// 获取自己的评论
router.get('/comments', authMiddleware, async (req, res) => {
  try {
    const comments = await global.db.Comment.findAll({
      where: { userId: req.userId },
      include: [{ model: global.db.Post, as: 'Post', attributes: ['id', 'content'] }],
    });
    const formattedComments = comments.map((comment) => ({
      ...comment.toJSON(),
      postContent: comment.Post ? comment.Post.content : '帖子已删除',
    }));
    res.json({ success: true, data: formattedComments });
  } catch (err) {
    console.error('获取评论失败:', err);
    res.status(500).json({ success: false, message: '服务器错误，请稍后重试' });
  }
});

// 删除评论
router.delete('/comments/:id', authMiddleware, async (req, res) => {
  try {
    const comment = await global.db.Comment.findByPk(req.params.id);
    if (!comment) return res.status(404).json({ success: false, message: '评论不存在' });
    if (comment.userId !== req.userId) {
      return res.status(403).json({ success: false, message: '无权限删除此评论' });
    }
    await comment.destroy();
    res.json({ success: true, message: '评论删除成功' });
  } catch (err) {
    console.error('删除评论失败:', err);
    res.status(500).json({ success: false, message: '服务器错误，请稍后重试' });
  }
});

module.exports = router;