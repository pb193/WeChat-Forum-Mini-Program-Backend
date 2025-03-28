// models/index.js

// 加载环境变量配置，使用 dotenv 从 .env 文件读取数据库连接信息
require('dotenv').config();

// 导入 Sequelize 核心库
const Sequelize = require('sequelize');

// 创建 Sequelize 实例，建立数据库连接
const sequelize = new Sequelize(
    process.env.DB_NAME,      // 数据库名称，从环境变量获取
    process.env.DB_USER,      // 数据库用户名，从环境变量获取
    process.env.DB_PASSWORD,  // 数据库密码，从环境变量获取
    {
        host: process.env.DB_HOST,  // 数据库主机地址，从环境变量获取
        dialect: 'mysql',           // 指定数据库类型为 MySQL
        logging: false,             // 禁用 SQL 查询日志输出，提高性能并减少控制台干扰
    }
);

// 定义 models 对象，加载并初始化所有模型
const models = {
    User: require('./User')(sequelize, Sequelize.DataTypes),     // 加载 User 模型
    Post: require('./Post')(sequelize, Sequelize.DataTypes),     // 加载 Post 模型
    Comment: require('./Comment')(sequelize, Sequelize.DataTypes), // 加载 Comment 模型
};

/**
 * 遍历所有模型，执行关联关系配置
 * 如果模型定义了 associate 方法，则调用它来建立表之间的关系
 */
Object.values(models).forEach((model) => {
    if (model.associate) {
        model.associate(models); // 传递所有模型对象，以便设置关联
    }
});

// 导出 sequelize 实例和所有模型，供其他模块使用
module.exports = {
    sequelize, // Sequelize 实例，用于数据库操作
    ...models  // 展开所有模型（User, Post, Comment）
};