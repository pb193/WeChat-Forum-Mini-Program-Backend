// middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    console.log('Received Authorization Header:', authHeader); // 添加日志

    if (!authHeader) {
        return res.status(401).json({ success: false, message: '未提供认证头' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ success: false, message: 'token 格式错误' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        console.log('Decoded Token:', decoded); // 添加日志
        req.userId = decoded.userId;
        next();
    } catch (err) {
        console.error('Token Verification Failed:', err.message);
        return res.status(401).json({ success: false, message: '无效的 token' });
    }
};