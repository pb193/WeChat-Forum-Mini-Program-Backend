module.exports = (sequelize, DataTypes) => {
    const Log = sequelize.define('Log', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        adminId: DataTypes.INTEGER,
        action: DataTypes.STRING,
        targetId: DataTypes.INTEGER,
        targetType: DataTypes.STRING,
        createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    }, {
        tableName: 'logs',
        timestamps: false,
    });
    Log.associate = (models) => {
        Log.belongsTo(models.User, { foreignKey: 'adminId', as: 'admin' });
    };
    return Log;
};