const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth'); // 假设已有认证中间件

// 检查超级管理员权限
const checkAdmin = async (req, res, next) => {
    const user = await global.db.User.findByPk(req.userId);
    if (!user || user.role !== 'admin') {
        return res.status(403).json({ success: false, message: '无超级管理员权限' });
    }
    next();
};

// 检查吧主或超级管理员权限
const checkModerator = async (req, res, next) => {
    const user = await global.db.User.findByPk(req.userId);
    if (!user || (user.role !== 'moderator' && user.role !== 'admin')) {
        return res.status(403).json({ success: false, message: '无权限' });
    }
    req.user = user;
    next();
};

// 删除帖子
router.delete('/posts/:id', authMiddleware, checkModerator, async (req, res) => {
    const postId = req.params.id;
    const post = await global.db.Post.findByPk(postId);
    if (!post) {
        return res.status(404).json({ success: false, message: '帖子不存在' });
    }
    await post.destroy();
    await global.db.Log.create({ adminId: req.userId, action: '删除帖子', targetId: postId, targetType: 'post' });
    res.json({ success: true, message: '帖子已删除' });
});

// 删除评论
router.delete('/comments/:id', authMiddleware, checkModerator, async (req, res) => {
    const commentId = req.params.id;
    const comment = await global.db.Comment.findByPk(commentId);
    if (!comment) {
        return res.status(404).json({ success: false, message: '评论不存在' });
    }
    await comment.destroy();
    await global.db.Log.create({ adminId: req.userId, action: '删除评论', targetId: commentId, targetType: 'comment' });
    res.json({ success: true, message: '评论已删除' });
});

// 查看用户信息（超级管理员）
router.get('/users/:id', authMiddleware, checkAdmin, async (req, res) => {
    const user = await global.db.User.findByPk(req.params.id);
    if (!user) {
        return res.status(404).json({ success: false, message: '用户不存在' });
    }
    res.json({ success: true, data: user });
});

// 查看所有用户（吧主或超级管理员）
router.get('/users', authMiddleware, checkModerator, async (req, res) => {
    const users = await global.db.User.findAll({
        attributes: ['id', 'username', 'avatar', 'grade', 'department', 'createdAt', 'muteUntil'],
    });
    res.json({ success: true, data: users });
});

// 查看最高点赞帖子
router.get('/top-liked-posts', authMiddleware, checkModerator, async (req, res) => {
    const posts = await global.db.Post.findAll({
        order: [['likes', 'DESC']],
        limit: 10,
    });
    res.json({ success: true, data: posts });
});

// 发布通知
router.post('/notices', authMiddleware, checkModerator, async (req, res) => {
    const { content } = req.body;
    if (!content) {
        return res.status(400).json({ success: false, message: '通知内容不能为空' });
    }
    const notice = await global.db.Notice.create({ userId: req.userId, content });
    await global.db.Log.create({ adminId: req.userId, action: '发布通知', targetId: notice.id, targetType: 'notice' });
    res.json({ success: true, data: notice });
});

// 删除通知
router.delete('/notices/:id', authMiddleware, checkModerator, async (req, res) => {
    const noticeId = req.params.id;
    const notice = await global.db.Notice.findByPk(noticeId);
    if (!notice) {
        return res.status(404).json({ success: false, message: '通知不存在' });
    }
    await notice.destroy();
    await global.db.Log.create({ adminId: req.userId, action: '删除通知', targetId: noticeId, targetType: 'notice' });
    res.json({ success: true, message: '通知已删除' });
});

// 禁言用户
router.post('/mute-user/:id', authMiddleware, checkModerator, async (req, res) => {
    const userId = req.params.id;
    const { duration } = req.body; // 禁言时长（分钟）
    const user = await global.db.User.findByPk(userId);
    if (!user) {
        return res.status(404).json({ success: false, message: '用户不存在' });
    }
    const muteUntil = new Date(Date.now() + duration * 60 * 1000);
    await user.update({ muteUntil });
    await global.db.Log.create({ adminId: req.userId, action: '禁言用户', targetId: userId, targetType: 'user' });
    res.json({ success: true, message: `用户已禁言至 ${muteUntil}` });
});

// 解除禁言
router.post('/unmute-user/:id', authMiddleware, checkModerator, async (req, res) => {
    const userId = req.params.id;
    const user = await global.db.User.findByPk(userId);
    if (!user) {
        return res.status(404).json({ success: false, message: '用户不存在' });
    }
    await user.update({ muteUntil: null });
    await global.db.Log.create({ adminId: req.userId, action: '解除禁言', targetId: userId, targetType: 'user' });
    res.json({ success: true, message: '用户禁言已解除' });
});

// 封禁用户（仅超级管理员）
router.post('/ban-user/:id', authMiddleware, checkAdmin, async (req, res) => {
    const userId = req.params.id;
    const user = await global.db.User.findByPk(userId);
    if (!user) {
        return res.status(404).json({ success: false, message: '用户不存在' });
    }
    await user.update({ role: 'banned' });
    await global.db.Log.create({ adminId: req.userId, action: '封禁用户', targetId: userId, targetType: 'user' });
    res.json({ success: true, message: '用户已封禁' });
});

// 解禁用户（仅超级管理员）
router.post('/unban-user/:id', authMiddleware, checkAdmin, async (req, res) => {
    const userId = req.params.id;
    const user = await global.db.User.findByPk(userId);
    if (!user) {
        return res.status(404).json({ success: false, message: '用户不存在' });
    }
    await user.update({ role: 'user' });
    await global.db.Log.create({ adminId: req.userId, action: '解禁用户', targetId: userId, targetType: 'user' });
    res.json({ success: true, message: '用户已解禁' });
});

// 查看操作日志（仅超级管理员）
router.get('/logs', authMiddleware, checkAdmin, async (req, res) => {
    const logs = await global.db.Log.findAll({
        include: [{ model: global.db.User, as: 'admin', attributes: ['username'] }],
        order: [['createdAt', 'DESC']],
        limit: 50,
    });
    res.json({ success: true, data: logs });
});

// 系统统计（仅超级管理员）
router.get('/stats', authMiddleware, checkAdmin, async (req, res) => {
    const postCount = await global.db.Post.count();
    const userCount = await global.db.User.count();
    const commentCount = await global.db.Comment.count();
    res.json({ success: true, data: { postCount, userCount, commentCount } });
});

router.get('/notices', authMiddleware, checkModerator, async (req, res) => {
    const notices = await global.db.Notice.findAll({
        order: [['createdAt', 'DESC']],
    });
    res.json({ success: true, data: notices });
});


// admin.js
router.get('/notices', authMiddleware, checkModerator, async (req, res) => {
    try {
        const notices = await global.db.Notice.findAll({
            order: [['createdAt', 'DESC']],
        });
        res.json({ success: true, data: notices });
    } catch (err) {
        console.error('获取通知失败:', err);
        res.status(500).json({ success: false, message: '服务器错误，请稍后重试' });
    }
});

module.exports = router;