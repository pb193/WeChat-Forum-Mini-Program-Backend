// models/Comment.js
module.exports = (sequelize, DataTypes) => {
    const Comment = sequelize.define('Comment', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        postId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        parentId: {                     // 新增字段：父评论ID
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        username: {
            type: DataTypes.STRING,
        },
        avatar: {
            type: DataTypes.STRING,
        },
        content: {
            type: DataTypes.STRING(500), // 修改为 500 字符限制
            allowNull: false,
        },
        createdAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    }, {
        tableName: 'comments',
        timestamps: false,
    });

    Comment.associate = (models) => {
        Comment.belongsTo(models.Post, { foreignKey: 'postId' });
        Comment.belongsTo(models.User, { foreignKey: 'userId' });
        Comment.belongsTo(models.Comment, { foreignKey: 'parentId', as: 'parent' }); // 自关联
    };

    return Comment;
};