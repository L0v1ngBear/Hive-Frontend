const requestUtil = require('./request.js');

/**
 * 发起微信订阅消息授权，并把 wx.login 换来的 code 和模板授权结果交给后端保存。
 */
async function requestTodoSubscribe() {
  const configRes = await requestUtil.get('/wechat/subscribe/config', { showLoading: false });
  const config = configRes.data || {};
  const templateIds = config.templateIds || [];

  if (!config.enabled || templateIds.length === 0) {
    wx.showToast({ title: '后台未配置订阅模板', icon: 'none' });
    return false;
  }

  const subscribeResult = await new Promise((resolve, reject) => {
    wx.requestSubscribeMessage({
      tmplIds: templateIds,
      success: resolve,
      fail: reject
    });
  });

  const loginResult = await new Promise((resolve, reject) => {
    wx.login({
      success: resolve,
      fail: reject
    });
  });

  const subscriptions = templateIds.map((templateId) => ({
    templateId,
    status: subscribeResult[templateId] || 'reject'
  }));

  await requestUtil.post('/wechat/subscribe/register', {
    code: loginResult.code,
    subscriptions
  }, { showLoading: true });

  const accepted = subscriptions.some((item) => item.status === 'accept');
  wx.showToast({
    title: accepted ? '已开启待办提醒' : '未授权提醒',
    icon: accepted ? 'success' : 'none'
  });
  return accepted;
}

module.exports = {
  requestTodoSubscribe
};
