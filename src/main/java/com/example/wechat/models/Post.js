// models/Post.js
/**
 * 定义 Post 模型，用于表示帖子表
 * @param {Object} sequelize - Sequelize 实例
 * @param {Object} DataTypes - Sequelize 数据类型
 * @returns {Object} - 返回定义好的 Post 模型
 */
module.exports = (sequelize, DataTypes) => {
    // 定义 Post 模型
    const Post = sequelize.define('Post', {
        // 主键字段：帖子的唯一标识符
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        // 外键字段：发表帖子的用户ID
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        // 帖子分类：例如“吐槽”、“二手交易”等
        category: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        // 帖子内容：核心字段，存储用户输入的文本
        content: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        // 媒体文件：存储图片、视频等 URL 列表，使用 JSON 格式
        mediaFiles: {
            type: DataTypes.JSON,
            defaultValue: [],
        },
        // 是否匿名：标识帖子是否以匿名形式发布
        isAnonymous: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        // 用户名：冗余存储，便于直接查询显示
        username: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        // 用户头像：冗余存储头像 URL
        avatar: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        // 点赞数：记录帖子被点赞的次数
        likes: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        // 点赞用户列表：存储点赞用户的 ID，使用 JSON 格式
        likedBy: {
            type: DataTypes.JSON,
            defaultValue: [],
        },
        // 举报次数：记录帖子被举报的次数
        reportCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0, // 默认值为 0
        },
        // 举报用户列表：存储举报用户的 ID，使用 JSON 格式
        reportedBy: {
            type: DataTypes.JSON,
            defaultValue: [], // 默认值为空数组
        },
        // 帖子状态：表示帖子当前状态（如发布、收起、待审核）
        status: {
            type: DataTypes.ENUM('published', 'collapsed', 'pending'),
            defaultValue: 'published', // 默认值为 'published'
        },
        // 创建时间：记录帖子的发表时间
        createdAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    }, {
        // 模型配置选项
        tableName: 'posts',
        timestamps: false, // 禁用自动时间戳，因为手动定义了 createdAt
        indexes: [
            { fields: ['category'] }, // 为 category 添加索引
            { fields: ['createdAt'] }, // 为 createdAt 添加索引
        ],
    });

    // 定义模型之间的关联关系
    Post.associate = (models) => {
        // Post 属于 User，通过 userId 外键关联
        Post.belongsTo(models.User, {
            foreignKey: 'userId',
            onDelete: 'CASCADE',
        });
        // Post 有一对多关系与 Comment，通过 postId 外键关联
        Post.hasMany(models.Comment, { foreignKey: 'postId', as: 'comments', onDelete: 'CASCADE' });
    };

    // 返回定义好的 Post 模型
    return Post;
};