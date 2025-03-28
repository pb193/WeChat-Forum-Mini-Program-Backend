// quickstartFunctions/config.js
require('dotenv').config();

module.exports = {
    defaultAvatar: process.env.DEFAULT_AVATAR_URL || 'https://your-cloud-storage/default-avatar.png',
    anonymousAvatar: process.env.ANONYMOUS_AVATAR_URL || 'https://your-cloud-storage/anonymous-avatar.png',
    validCategories: ['吐槽', '二手交易', '表白', '反馈'],
    pageSize: parseInt(process.env.PAGE_SIZE) || 20,
    uploadDir: process.env.UPLOAD_DIR || './uploads',
};