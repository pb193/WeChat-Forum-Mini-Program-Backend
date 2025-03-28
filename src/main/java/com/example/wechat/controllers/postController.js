// controllers/postController.js

// 导入 quickstartFunctions 模块，其中包含帖子相关的功能函数
const quickstartFunctions = require('../quickstartFunctions');

/**
 * 控制器函数：获取帖子列表
 * @param {Object} req - Express 请求对象，包含查询参数
 * @param {Object} res - Express 响应对象，用于返回结果
 * @returns {void} - 直接通过 res 返回 JSON 响应
 */
const getPosts = async (req, res) => {
  try {
    // 从查询参数中解构获取分类、页码、每页大小和排序方式
    const { category, page, pageSize, sortBy } = req.query;

    // 调用 quickstartFunctions 中的 getPosts 函数，传入查询参数
    const result = await quickstartFunctions.getPosts({ category, page, pageSize, sortBy });

    // 返回成功响应，包含帖子列表和是否有更多数据的标志
    res.json({
      success: true,
      data: result.posts, // Sequelize 已解析 JSON 字段，无需额外处理
      hasMore: result.hasMore,
    });
  } catch (err) {
    // 捕获错误并返回失败响应
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/**
 * 控制器函数：添加新帖子
 * @param {Object} req - Express 请求对象，包含用户信息和帖子数据
 * @param {Object} res - Express 响应对象，用于返回结果
 * @returns {void} - 直接通过 res 返回 JSON 响应
 */
const addPost = async (req, res) => {
  try {
    // 从请求中获取用户ID，通常由认证中间件（如 JWT）设置
    const userId = req.userId;

    // 从请求体中获取帖子数据
    const { category, content, mediaFiles, isAnonymous } = req.body;

    // 调用 quickstartFunctions 中的 addPost 函数，传入用户ID和帖子数据
    const postId = await quickstartFunctions.addPost(userId, {
      category,
      content,
      mediaFiles: mediaFiles || [], // 确保 mediaFiles 有默认值
      isAnonymous: isAnonymous || false, // 确保 isAnonymous 有默认值
      // reportCount、reportedBy 和 status 使用模型默认值，无需显式传递
    });

    // 返回成功响应，包含新创建的帖子ID
    res.json({
      success: true,
      data: { id: postId },
    });
  } catch (err) {
    // 捕获错误并返回失败响应
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// 导出控制器函数，供路由使用
module.exports = {
  getPosts, // 获取帖子列表
  addPost,  // 添加新帖子
};