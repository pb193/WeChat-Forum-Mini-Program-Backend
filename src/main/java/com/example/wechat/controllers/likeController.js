// controllers/likeController.js

// 导入 quickstartFunctions 模块，其中包含点赞相关的功能函数
const quickstartFunctions = require('../quickstartFunctions');

/**
 * 控制器函数：切换帖子点赞状态（点赞或取消点赞）
 * @param {Object} req - Express 请求对象，包含用户信息和帖子数据
 * @param {Object} res - Express 响应对象，用于返回结果
 * @returns {void} - 直接通过 res 返回 JSON 响应
 */
const toggleLike = async (req, res) => {
  try {
    // 从请求中获取用户ID，通常由认证中间件（如 JWT）设置
    const userId = req.userId;

    // 调用 quickstartFunctions 中的 toggleLike 函数，传入用户ID和请求体数据
    await quickstartFunctions.toggleLike(userId, req.body);

    // 返回成功响应，仅表示操作完成
    res.json({
      success: true     // 表示操作成功
    });
  } catch (err) {
    // 捕获错误并返回失败响应
    res.status(500).json({
      success: false,   // 表示操作失败
      message: err.message // 返回错误信息
    });
  }
};

// 导出控制器函数，供路由使用
module.exports = {
  toggleLike,         // 切换点赞状态
};