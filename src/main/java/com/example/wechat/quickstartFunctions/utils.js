// quickstartFunctions/utils.js

/**
 * 验证输入参数是否包含所有必需字段
 * @param {Object} data - 输入参数对象
 * @param {string[]} requiredFields - 必需字段列表
 * @param {Object} [options] - 可选配置项
 * @param {boolean} [options.allowEmptyString] - 是否允许空字符串
 * @param {Object} [options.fieldDescriptions] - 字段描述，用于错误提示
 * @throws {Error} 如果缺少必需字段或字段值无效
 */
const validateInput = (data, requiredFields, options = {}) => {
    const { allowEmptyString = false, fieldDescriptions = {} } = options;
    if (!data || typeof data !== 'object') {
        throw new Error('输入参数必须是一个对象');
    }
    if (!Array.isArray(requiredFields)) {
        throw new Error('requiredFields 必须是一个数组');
    }
    for (const field of requiredFields) {
        if (data[field] === undefined || data[field] === null) {
            const description = fieldDescriptions[field] || '未知字段';
            throw new Error(`缺少必要的参数: ${field} (${description})`);
        }
        if (!allowEmptyString && typeof data[field] === 'string' && data[field].trim() === '') {
            const description = fieldDescriptions[field] || '未知字段';
            throw new Error(`参数 ${field} 不能为空字符串 (${description})`);
        }
    }
};

/**
 * 检查数据库中是否存在指定 ID 的动态
 * @param {Object} Model - Sequelize 模型
 * @param {number|string} id - 动态 ID
 * @returns {Promise<Object>} 动态对象
 * @throws {Error} 如果模型无效、动态不存在或数据库查询失败
 */
const checkPostExists = async (Model, id) => {
    if (!Model || typeof Model.findByPk !== 'function') {
        throw new Error('无效的 Sequelize 模型');
    }
    if (!id) {
        throw new Error('动态 ID 不能为空');
    }
    try {
        const post = await Model.findByPk(id);
        if (!post) {
            throw new Error('动态不存在');
        }
        return post;
    } catch (err) {
        if (err.message === '动态不存在') {
            throw err; // 直接抛出业务错误
        }
        throw new Error(`数据库查询失败: ${err.message}`);
    }
};

/**
 * 验证分类是否在有效分类列表中
 * @param {string} data - 分类名称
 * @param {string[]} validCategories - 有效分类列表
 * @throws {Error} 如果分类无效或参数类型错误
 */
const validateCategory = (data, validCategories) => {
    if (!Array.isArray(validCategories)) {
        throw new Error('validCategories 必须是一个数组');
    }
    if (typeof data !== 'string') {
        throw new Error('分类名称必须是一个字符串');
    }
    const normalizedCategory = data.trim().toLowerCase();
    const normalizedValidCategories = validCategories.map(cat => cat.trim().toLowerCase());
    if (!normalizedValidCategories.includes(normalizedCategory)) {
        throw new Error(`无效的分类: ${data}，有效的分类包括: ${validCategories.join(', ')}`);
    }
};

module.exports = {
    validateInput,
    checkPostExists,
    validateCategory,
};