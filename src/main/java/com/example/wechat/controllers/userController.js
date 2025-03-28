// controllers/userController.js

// 导入 quickstartFunctions 模块，其中包含用户相关的功能函数
const quickstartFunctions = require('../quickstartFunctions');

/**
 * 控制器函数：获取用户信息
 * @param {Object} req - Express 请求对象，包含用户信息
 * @param {Object} res - Express 响应对象，用于返回结果
 * @returns {void} - 直接通过 res 返回 JSON 响应
 */
const getUserInfo = async (req, res) => {
  try {
    // 从请求中获取用户ID，通常由认证中间件（如 JWT）设置
    const userId = req.userId;

    // 调用 quickstartFunctions 中的 getUserInfo 函数，获取用户信息
    const user = await quickstartFunctions.getUserInfo(userId);

    // 返回成功响应，包含用户信息
    res.json({
      success: true,    // 表示操作成功
      data: user        // 返回用户数据对象
    });
  } catch (err) {
    // 捕获错误并返回失败响应
    res.status(500).json({
      success: false,   // 表示操作失败
      message: err.message // 返回错误信息
    });
  }
};

/**
 * 控制器函数：更新用户信息
 * @param {Object} req - Express 请求对象，包含用户信息和更新数据
 * @param {Object} res - Express 响应对象，用于返回结果
 * @returns {void} - 直接通过 res 返回 JSON 响应
 */
const updateUserInfo = async (req, res) => {
  try {
    // 从请求中获取用户ID，通常由认证中间件（如 JWT）设置
    const userId = req.userId;

    // 调用 quickstartFunctions 中的 updateUserInfo 函数，更新用户信息
    const user = await quickstartFunctions.updateUserInfo(userId, req.body);

    // 返回成功响应，包含更新后的用户数据
    res.json({
      success: true,    // 表示操作成功
      data: user        // 返回更新后的用户对象
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
  getUserInfo,        // 获取用户信息
  updateUserInfo,     // 更新用户信息
};