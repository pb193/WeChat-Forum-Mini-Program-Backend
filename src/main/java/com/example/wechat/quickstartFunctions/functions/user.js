// quickstartFunctions.js
const { User, Post, Comment } = require('../../models'); // 导入所有模型

/**
 * 获取用户信息
 * @param {number} userId - 用户ID
 * @returns {Promise<User>} - 返回用户对象
 * @throws {Error} - 如果用户不存在
 */
async function getUserInfo(userId) {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('用户不存在');
    return user;
}

/**
 * 更新用户信息
 * @param {number} userId - 用户ID
 * @param {Object} data - 需要更新的数据
 * @returns {Promise<User>} - 返回更新后的用户对象
 * @throws {Error} - 如果用户不存在
 */
async function updateUserInfo(userId, data) {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('用户不存在');
    await user.update(data);
    return user;
}

/**
 * 获取帖子列表
 * @param {Object} filters - 过滤条件
 * @param {string} [filters.category] - 可选的帖子类别
 * @param {number} filters.page - 页码
 * @param {number} filters.pageSize - 每页数量
 * @param {string} [filters.sortBy='createdAt'] - 排序字段（默认按创建时间排序）
 * @returns {Promise<Object>} - 包含帖子列表和是否还有更多数据
 */
async function getPosts({ category, page, pageSize, sortBy = 'createdAt' }) {
    const offset = (page - 1) * pageSize;
    const where = category ? { category } : {};
    const order = sortBy === 'category' ? [['category', 'ASC']] : [['createdAt', 'DESC']];

    const posts = await Post.findAll({
        where,
        order,
        limit: pageSize,
        offset,
        include: [{ model: Comment, as: 'Comments' }], // 使用 Post.js 中的别名
        attributes: [
            'id', 'userId', 'category', 'content', 'mediaFiles', 'isAnonymous',
            'username', 'avatar', 'likes', 'likedBy', 'reportCount', 'reportedBy',
            'status', 'createdAt'
        ], // 明确返回所有字段，包括新字段
    });

    const total = await Post.count({ where });

    return { posts, hasMore: offset + posts.length < total };
}

/**
 * 添加新帖子
 * @param {number} userId - 用户ID
 * @param {Object} postData - 帖子数据
 * @param {string} postData.category - 帖子类别
 * @param {string} postData.content - 帖子内容
 * @param {Array} [postData.mediaFiles] - 可选的媒体文件列表
 * @param {boolean} [postData.isAnonymous=false] - 是否匿名
 * @returns {Promise<number>} - 返回新帖子的ID
 * @throws {Error} - 如果用户不存在
 */
async function addPost(userId, { category, content, mediaFiles, isAnonymous }) {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('用户不存在');

    const post = await Post.create({
        userId,
        category,
        content,
        mediaFiles: mediaFiles || [],
        isAnonymous: isAnonymous || false,
        username: isAnonymous ? '匿名用户' : user.username,
        avatar: isAnonymous ? 'https://your-cloud-storage/default-avatar.png' : user.avatar,
        reportCount: 0, // 初始举报次数
        reportedBy: [], // 初始举报用户列表
        status: 'published', // 初始状态
    });

    return post.id;
}

/**
 * 添加评论
 * @param {number} userId - 用户ID
 * @param {Object} commentData - 评论数据
 * @param {number} commentData.postId - 关联的帖子ID
 * @param {string} commentData.content - 评论内容
 * @returns {Promise<Comment>} - 返回新创建的评论
 * @throws {Error} - 如果用户或帖子不存在
 */
async function addComment(userId, { postId, content }) {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('用户不存在');

    const post = await Post.findByPk(postId);
    if (!post) throw new Error('动态不存在');

    const comment = await Comment.create({
        postId,
        userId,
        username: user.username,
        avatar: user.avatar,
        content,
    });

    return comment;
}

/**
 * 点赞或取消点赞帖子
 * @param {number} userId - 用户ID
 * @param {Object} likeData - 点赞数据
 * @param {number} likeData.postId - 需要点赞的帖子ID
 * @param {boolean} likeData.like - true 表示点赞，false 表示取消点赞
 * @returns {Promise<void>}
 * @throws {Error} - 如果帖子不存在
 */
async function toggleLike(userId, { postId, like }) {
    const post = await Post.findByPk(postId);
    if (!post) throw new Error('动态不存在');

    let likedBy = post.likedBy || [];
    let likes = post.likes || 0;

    if (like) {
        if (!likedBy.includes(userId)) {
            likedBy.push(userId);
            likes += 1;
        }
    } else {
        if (likedBy.includes(userId)) {
            likedBy = likedBy.filter((id) => id !== userId);
            likes -= 1;
        }
    }

    await post.update({ likedBy, likes });
}

/**
 * 举报帖子
 * @param {number} userId - 举报者ID
 * @param {number} postId - 被举报的帖子ID
 * @returns {Promise<Object>} - 返回更新后的举报信息
 * @throws {Error} - 如果帖子不存在或用户已举报
 */
async function reportPost(userId, postId) {
    const post = await Post.findByPk(postId);
    if (!post) throw new Error('帖子不存在');

    let reportedBy = post.reportedBy || [];
    let reportCount = post.reportCount || 0;
    let status = post.status || 'published';

    if (reportedBy.includes(userId)) {
        throw new Error('您已举报过此帖子');
    }

    reportedBy.push(userId);
    reportCount += 1;
    if (reportCount >= 5) {
        status = 'collapsed';
    }

    await post.update({ reportedBy, reportCount, status });

    return { reportCount, status };
}

module.exports = {
    getUserInfo,
    updateUserInfo,
    getPosts,
    addPost,
    addComment,
    toggleLike,
    reportPost, // 新增导出
};