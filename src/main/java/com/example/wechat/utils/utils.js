// utils/utils.js
const validateInput = (params, requiredFields) => {
  for (const field of requiredFields) {
    if (!params[field]) {
      throw new Error(`缺少必要的参数: ${field}`);
    }
  }
};

const checkPostExists = async (Post, postId) => {
  const post = await Post.findByPk(postId);
  if (!post) {
    throw new Error('动态不存在');
  }
  return post;
};

const validateCategory = (category, validCategories) => {
  if (!validCategories.includes(category)) {
    throw new Error(`无效的分类: ${category}`);
  }
};

module.exports = {
  validateInput,
  checkPostExists,
  validateCategory,
};