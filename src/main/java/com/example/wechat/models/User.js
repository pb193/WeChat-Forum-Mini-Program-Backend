// models/User.js
const bcrypt = require('bcrypt');

module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        username: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                len: [3, 50],
                isAlphanumeric: true,
            },
        },
        password: {
            type: DataTypes.STRING,
            allowNull: true,
            validate: {
                len: [6, 100],
                notNullIfNotDebug(value) {
                    if (!this.isDebug && !value) {
                        throw new Error('非调试用户必须提供密码');
                    }
                },
            },
        },
        avatar: {
            type: DataTypes.STRING,
            defaultValue: 'https://your-cloud-storage/default-avatar.png',
            validate: {
                isUrl: true
            },
        },
        grade: {
            type: DataTypes.STRING,
            validate: {
                isIn: [['Freshman', 'Sophomore', 'Junior', 'Senior']]
            },
        },
        department: {
            type: DataTypes.STRING,
            validate: {
                notEmpty: true
            },
        },
        bio: {
            type: DataTypes.TEXT
        },
        createdAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        isDebug: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        role: { // 添加 role 字段
            type: DataTypes.STRING,
            defaultValue: 'user', // 默认角色为普通用户
            validate: {
                isIn: [['user', 'moderator', 'admin']] // 限制角色值
            }
        }
    }, {
        tableName: 'users',
        timestamps: false,
        hooks: {
            beforeCreate: async (user) => {
                if (user.password) {
                    const salt = await bcrypt.genSalt(10);
                    user.password = await bcrypt.hash(user.password, salt);
                }
            },
            beforeUpdate: async (user) => {
                if (user.password) {
                    const salt = await bcrypt.genSalt(10);
                    user.password = await bcrypt.hash(user.password, salt);
                }
            },
        },
    });

    User.associate = (models) => {
        User.hasMany(models.Post, {
            foreignKey: 'userId',
            onDelete: 'CASCADE',
        });
        User.hasMany(models.Comment, {
            foreignKey: 'userId',
            onDelete: 'CASCADE',
        });
    };

    return User;
};