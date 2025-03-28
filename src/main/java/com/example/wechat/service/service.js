// service.js
async function reportPost(userId, postId) {
    const post = await global.db.Post.findByPk(postId);
    if (!post) throw new Error('帖子不存在');

    let reportedBy = post.reportedBy || [];
    let reportCount = post.reportCount || 0;
    let status = post.status || 'published';

    const userIdStr = userId.toString();
    if (reportedBy.map(String).includes(userIdStr)) {
        throw new Error('您已举报过此帖子');
    }

    reportedBy.push(userIdStr);
    reportCount += 1;
    if (reportCount >= 5) {
        status = 'collapsed';
    }

    console.log('更新前:', { reportedBy, reportCount, status });
    // 显式设置字段并保存
    post.reportedBy = reportedBy;
    post.reportCount = reportCount;
    post.status = status;
    await post.save({ fields: ['reportedBy', 'reportCount', 'status'], logging: console.log });
    console.log('更新后:', post.toJSON());

    return {
        reportCount: post.reportCount,
        status: post.status,
        reportedBy: post.reportedBy
    };
}

async function cancelReportPost(userId, postId) {
    const post = await global.db.Post.findByPk(postId);
    if (!post) throw new Error('帖子不存在');

    let reportedBy = post.reportedBy || [];
    let reportCount = post.reportCount || 0;
    let status = post.status || 'published';

    const userIdStr = userId.toString();
    if (!reportedBy.map(String).includes(userIdStr)) {
        throw new Error('您未举报过此帖子');
    }

    reportedBy = reportedBy.filter(id => id !== userIdStr);
    reportCount -= 1;
    if (reportCount < 5 && status === 'collapsed') {
        status = 'published';
    }

    console.log('更新前:', { reportedBy, reportCount, status });
    post.reportedBy = reportedBy;
    post.reportCount = reportCount;
    post.status = status;
    await post.save({ fields: ['reportedBy', 'reportCount', 'status'], logging: console.log });
    console.log('更新后:', post.toJSON());

    return {
        reportCount: post.reportCount,
        status: post.status,
        reportedBy: post.reportedBy
    };
}

module.exports = {
    reportPost,
    cancelReportPost,
};