require('dotenv').config({ path: 'E:\\vs code zuoye\\wechatAPP\\wechat\\.env' });
const express = require('express');
const { Sequelize } = require('sequelize');
const routes = require('./routes');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;

// 调试环境变量
console.log('环境变量:', {
    database: process.env.MYSQL_DATABASE,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD ? '[隐藏]' : undefined,
    host: process.env.MYSQL_HOST,
    dotenvPath: 'E:\\vs code zuoye\\wechatAPP\\wechat\\.env',
});

// 检查必要环境变量是否定义
const requiredEnvVars = ['MYSQL_DATABASE', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_HOST'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        throw new Error(`环境变量 ${envVar} 未定义，请检查 .env 文件`);
    }
}

// 配置 Sequelize
const sequelize = new Sequelize(
    process.env.MYSQL_DATABASE,
    process.env.MYSQL_USER,
    process.env.MYSQL_PASSWORD,
    {
        host: process.env.MYSQL_HOST,
        dialect: 'mysql',
        logging: console.log,
        pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
    }
);

// 加载模型
const User = require('./models/User')(sequelize, Sequelize.DataTypes);
const Post = require('./models/Post')(sequelize, Sequelize.DataTypes);
const Comment = require('./models/Comment')(sequelize, Sequelize.DataTypes);
const Log = require('./models/Log')(sequelize, Sequelize.DataTypes); // 新增 Log 模型
const Notice = require('./models/Notice')(sequelize, Sequelize.DataTypes); // 新增 Notice 模型
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    setHeaders: (res, filePath) => {
        console.log(`Serving file: ${filePath}`);
    },
}));



// 定义模型关联
Post.hasMany(Comment, { as: 'comments', foreignKey: 'postId' });
Comment.belongsTo(Post, { foreignKey: 'postId' });

User.hasMany(Post, { foreignKey: 'userId' });
Post.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Comment, { foreignKey: 'userId' });
Comment.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Log, { foreignKey: 'adminId', as: 'logs' }); // Log 与 User 关联
Log.belongsTo(User, { foreignKey: 'adminId', as: 'admin' });

User.hasMany(Notice, { foreignKey: 'userId' }); // Notice 与 User 关联
Notice.belongsTo(User, { foreignKey: 'userId' });

global.db = { sequelize, Sequelize, User, Post, Comment, Log, Notice };

// 中间件
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use((req, res, next) => {
    console.log(`收到请求: ${req.method} ${req.url}`);
    next();
});
app.use('/api', routes);

// 数据库连接和同步 
async function startServer() {
    try {
        await sequelize.authenticate();
        console.log('数据库连接成功');

        await sequelize.sync({ force: false }); // force: false 保留现有数据
        console.log('数据库表结构已同步');

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error('启动服务器失败:', err);
        process.exit(1);
    }
}

startServer();