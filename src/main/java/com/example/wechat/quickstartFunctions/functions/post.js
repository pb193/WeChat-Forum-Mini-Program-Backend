// 导入数据库模型
const db = require('../../models');
// 导入配置文件
const config = require('../config');
// 导入输入验证工具
const { validateInput, validateCategory } = require('../utils');

/**
 * 获取帖子列表
 * @param {Object} options - 查询选项
 * @param {string} options.category - 帖子类别（可选）
 * @param {number} options.page - 当前页码（默认为1）
 * @param {number} options.pageSize - 每页帖子数量（默认为配置中的 pageSize）
 * @param {string} options.sortBy - 排序方式（默认为 'createdAt'，支持 'category'）
 * @returns {Promise<Object>} - 返回帖子列表及是否有更多数据
 */
async function getPosts({ category, page = 1, pageSize = config.pageSize, sortBy = 'createdAt' }) {
    // 验证输入参数（确保 page 和 pageSize 为有效数字）
    validateInput({ page, pageSize }, ['page', 'pageSize']);

    let where = {}; // 定义查询条件对象

    // 如果提供了 category 并且值有效，则进行验证并添加到查询条件
    if (category && category !== 'null' && category !== 'undefined' && category.trim() !== '') {
        validateCategory(category, config.validCategories);
        where.category = category;
    }

    // 设置排序方式：按时间降序（默认）或按类别升序
    const order = sortBy === 'category' ? [['category', 'ASC']] : [['createdAt', 'DESC']];

    // 查询符合条件的帖子总数
    const total = await db.Post.count({ where });

    // 获取符合条件的帖子数据，并包含评论信息
    const posts = await db.Post.findAll({
        where,
        include: [{ model: db.Comment, as: 'Comments' }],
        order,
        offset: (page - 1) * pageSize,
        limit: parseInt(pageSize),
    });

    return {
        posts,
        hasMore: page * pageSize < total,
    };
}

/**
 * 添加新帖子
 * @param {number} userId - 用户ID
 * @param {Object} postData - 帖子数据
 * @param {string} postData.category - 帖子类别
 * @param {string} postData.content - 帖子内容
 * @param {Array<string>} postData.mediaFiles - 附件（可选，默认为空数组）
 * @param {boolean} postData.isAnonymous - 是否匿名（默认为 false）
 * @returns {Promise<Object>} - 返回新创建的帖子ID
 */
async function addPost(userId, { category, content, mediaFiles = [], isAnonymous = false }) {
    // 验证必须的输入字段（category 和 content）
    validateInput({ category, content }, ['category', 'content']);
    // 验证类别是否有效
    validateCategory(category, config.validCategories);

    // 根据 userId 查找用户
    const user = await db.User.findByPk(userId);
    if (!user) {
        throw new Error('用户不存在');
    }

    // 组装帖子数据
    const postData = {
        userId,
        category,
        content,
        mediaFiles,
        isAnonymous,
        username: isAnonymous ? '匿名用户' : user.username,
        avatar: isAnonymous ? config.anonymousAvatar : user.avatar,
        // reportCount、reportedBy 和 status 使用模型默认值
    };

    // 创建帖子并返回新帖子ID
    const post = await db.Post.create(postData);
    return { postId: post.id };
}

/**
 * 举报帖子
 * @param {number} userId - 举报者ID
 * @param {number} postId - 被举报的帖子ID
 * @returns {Promise<Object>} - 返回更新后的举报信息
 * @throws {Error} - 如果帖子不存在或用户已举报
 */
async function reportPost(userId, postId) {
    const post = await db.Post.findByPk(postId);
    if (!post) throw new Error('帖子不存在');

    let reportedBy = post.reportedBy || [];
    let reportCount = post.reportCount || 0;
    let status = post.status || 'published';

    // 确保类型一致
    const userIdStr = userId.toString();
    if (reportedBy.map(String).includes(userIdStr)) {
        throw new Error('您已举报过此帖子');
    }

    reportedBy.push(userIdStr);
    reportCount += 1;
    if (reportCount >= 5) {
        status = 'collapsed';
    }

    console.log('更新前:', { reportedBy, reportCount, status });
    // 直接修改对象并保存
    post.reportedBy = reportedBy;
    post.reportCount = reportCount;
    post.status = status;
    await post.save({ logging: console.log });
    console.log('更新后:', post.toJSON());

    return {
        reportCount: post.reportCount,
        status: post.status,
        reportedBy: post.reportedBy
    };
}
// 导出模块
module.exports = {
    getPosts,
    addPost,
    reportPost,
};
/**
 * 取消举报帖子
 * @param {number} userId - 取消举报者ID
 * @param {number} postId - 被取消举报的帖子ID
 * @returns {Promise<Object>} - 返回更新后的举报信息
 * @throws {Error} - 如果帖子不存在或用户未举报
 */
async function cancelReportPost(userId, postId) {
    const post = await db.Post.findByPk(postId);
    if (!post) throw new Error('帖子不存在');

    let reportedBy = post.reportedBy || [];
    let reportCount = post.reportCount || 0;
    let status = post.status || 'published';

    const userIdStr = userId.toString();
    if (!reportedBy.map(String).includes(userIdStr)) {
        throw new Error('您未举报过此帖子');
    }

    reportedBy = reportedBy.filter(id => id !== userIdStr);
    reportCount -= 1;
    if (reportCount < 5 && status === 'collapsed') {
        status = 'published';
    }

    console.log('更新前:', { reportedBy, reportCount, status });
    post.reportedBy = reportedBy;
    post.reportCount = reportCount;
    post.status = status;
    await post.save({ logging: console.log });
    console.log('更新后:', post.toJSON());

    return {
        reportCount: post.reportCount,
        status: post.status,
        reportedBy: post.reportedBy
    };
}