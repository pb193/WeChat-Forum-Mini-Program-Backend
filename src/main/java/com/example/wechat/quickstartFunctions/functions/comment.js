// quickstartFunctions/functions/comment.js
const db = require('../../models'); // 导入数据库模型
const { validateInput, checkPostExists } = require('../utils'); // 导入工具函数

/**
 * 添加评论的异步函数
 * @param {number} userId - 用户ID
 * @param {Object} params - 评论参数对象
 * @param {number} params.postId - 帖子ID
 * @param {string} params.content - 评论内容
 * @param {number|null} [params.parentId] - 父评论ID（可选，用于回复评论）
 * @returns {Promise<Object>} - 返回创建的评论对象
 * @throws {Error} - 如果输入无效、用户/帖子/父评论不存在或频率超限，则抛出错误
 */
async function addComment(userId, { postId, content, parentId = null }) {
    // 验证必填输入参数，确保 postId 和 content 不为空
    validateInput({ postId, content }, ['postId', 'content']);

    // 检查评论内容长度，限制为最多500字符
    if (content.length > 500) {
        throw new Error('评论内容过长，最多500个字符');
    }

    // 检查帖子是否存在，如果不存在会抛出错误
    const post = await checkPostExists(db.Post, postId);

    // 根据用户ID查找用户信息
    const user = await db.User.findByPk(userId);
    if (!user) {
        throw new Error('用户不存在');
    }

    // 检查评论频率：用户最近一次评论时间距现在是否小于30秒
    const lastComment = await db.Comment.findOne({
        where: { userId }, // 按用户ID过滤
        order: [['createdAt', 'DESC']], // 按创建时间降序排序，取最新评论
    });
    if (lastComment) {
        const timeDiff = (new Date() - new Date(lastComment.createdAt)) / 1000; // 计算时间差（秒）
        if (timeDiff < 30) {
            throw new Error('请稍后再发表评论'); // 小于30秒则限制发表
        }
    }

    // 如果提供了 parentId，检查父评论是否存在
    if (parentId) {
        const parentComment = await db.Comment.findByPk(parentId);
        if (!parentComment) {
            throw new Error('父评论不存在');
        }
    }

    // 构建评论对象
    const comment = {
        postId,         // 帖子ID
        userId,         // 用户ID
        parentId,       // 父评论ID（支持嵌套回复）
        username: user.username, // 用户名（冗余存储，便于查询）
        avatar: user.avatar,     // 用户头像（冗余存储）
        content,        // 评论内容
    };

    // 创建评论并保存到数据库
    const createdComment = await db.Comment.create(comment);

    // 返回创建的评论对象
    return createdComment;
}

// 导出函数
module.exports = {
    addComment,
};