// quickstartFunctions/index.js
const config = require('./config');
const utils = require('./utils');
const userFunctions = require('./functions/user');
const postFunctions = require('./functions/post');
const commentFunctions = require('./functions/comment');
const likeFunctions = require('./functions/like');

module.exports = {
    config,
    utils,
    ...userFunctions,
    ...postFunctions,
    ...commentFunctions,
    ...likeFunctions,
};