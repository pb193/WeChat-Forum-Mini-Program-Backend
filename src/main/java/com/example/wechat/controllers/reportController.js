// controllers/reportController.js
const quickstartFunctions = require('../quickstartFunctions');

const reportPost = async (req, res) => {
    try {
        const userId = req.userId; // 从认证中间件获取
        const postId = req.params.id; // 从 URL 参数获取
        const result = await quickstartFunctions.reportPost(userId, postId);
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(err.status || 500).json({ success: false, message: err.message });
    }
};

module.exports = { reportPost };