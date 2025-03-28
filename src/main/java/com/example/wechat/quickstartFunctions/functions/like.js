// 导入数据库模型
const db = require('../../models');
// 导入输入验证和帖子检查工具函数
const { validateInput, checkPostExists } = require('../utils');

/**
 * 切换帖子点赞状态
 * @param {number} userId - 用户ID
 * @param {Object} likeData - 点赞数据
 * @param {number} likeData.postId - 帖子ID
 * @param {boolean} likeData.liked - 是否点赞（true 表示点赞，false 表示取消点赞）
 * @returns {Promise<boolean>} - 点赞/取消点赞成功返回 true
 */
async function toggleLike(userId, { postId, liked }) {
    // 验证输入参数，确保 postId 和 liked 有效
    validateInput({ postId, liked }, ['postId', 'liked']);

    // 检查帖子是否存在
    const post = await checkPostExists(db.Post, postId);

    // 获取帖子当前的点赞用户列表（默认空数组）
    let likedBy = post.likedBy || [];
    const hasLiked = likedBy.includes(userId); // 判断用户是否已点赞

    // 逻辑检查：防止重复点赞或重复取消点赞
    if (liked && hasLiked) {
        throw new Error('用户已点赞');
    }
    if (!liked && !hasLiked) {
        throw new Error('用户未点赞');
    }

    // 根据 liked 参数进行点赞/取消点赞操作
    if (liked) {
        post.likes += 1; // 增加点赞数
        likedBy.push(userId); // 记录用户点赞
    } else {
        post.likes -= 1; // 减少点赞数
        likedBy = likedBy.filter((id) => id !== userId); // 移除该用户
    }

    // 更新帖子数据
    await post.update({ likes: post.likes, likedBy });

    return true; // 返回成功标志
}

// 导出模块
module.exports = {
    toggleLike,
};
