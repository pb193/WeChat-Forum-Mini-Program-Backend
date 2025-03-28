module.exports = (sequelize, DataTypes) => {
    const Notice = sequelize.define('Notice', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        userId: DataTypes.INTEGER,
        content: DataTypes.TEXT,
        createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    }, {
        tableName: 'notices',
        timestamps: false,
    });
    Notice.associate = (models) => {
        Notice.belongsTo(models.User, { foreignKey: 'userId' });
    };
    return Notice;
};