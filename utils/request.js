// 引入租户工具（之前封装的 tenant.js）
const tenantUtil = require('./tenant.js');

// 【注意】正式上线前，请务必将 http 改为 https，并在微信公众平台配置合法域名
const BASE_URL = 'http://www.dtvl.top/api';

/**
 * 封装微信小程序请求方法，自动带租户ID + user_id + 自动拼接URL
 */
function request(options) {
  const {
    url,
    method = 'POST',
    data = {},
    showLoading = true,
    needTenant = true,
    timeout = 15000 // 默认将超时时间调整为 15 秒，适应弱网环境
  } = options;

  // 1. 获取租户ID
  const tenantId = tenantUtil.getTenantId();
  if (needTenant && !tenantId) {
    wx.showToast({ title: '请先选择租户', icon: 'none' });
    return Promise.reject('缺少租户ID');
  }

  // 2. 获取 user_id
  const userId = wx.getStorageSync('user_id') || '1';

  // 3. 加载提示
  if (showLoading) {
    wx.showLoading({ title: '加载中...', mask: true });
  }

  // 4. 请求头
  const header = {
    'content-type': 'application/json',
    ...(needTenant && { 'Tenant-Code': tenantId }),
    'User-Id': userId
  };

  // 5. 自动拼接 URL
  let fullUrl = url;
  if (!url.startsWith('http')) {
    fullUrl = BASE_URL + url;
  }

  console.log('✅ 请求地址：', fullUrl);
  console.log('✅ 请求头：', header);

  // 6. 发起请求
  return new Promise((resolve, reject) => {
    wx.request({
      url: fullUrl,
      method: method,
      header: header,
      data: data,
      timeout: timeout, // 使用传入的或默认的超时时间
      success: (res) => {
        if (showLoading) wx.hideLoading();
        
        const statusCode = res.statusCode;

        // 根据 HTTP 状态码给出友好的业务提示
        if (statusCode === 200) {
          // 这里可以根据你们后端的业务 code 再做一层拦截，比如 res.data.code !== 200 抛出提示
          resolve(res.data);
        } else if (statusCode === 401 || statusCode === 403) {
          wx.showToast({ title: '登录已过期，请重新登录', icon: 'none', duration: 2000 });
          reject(res);
        } else if (statusCode === 404) {
          wx.showToast({ title: '请求的资源不存在', icon: 'none', duration: 2000 });
          reject(res);
        } else if (statusCode >= 500) {
          wx.showToast({ title: '服务器开小差了，请稍后再试', icon: 'none', duration: 2500 });
          reject(res);
        } else {
          // 兜底提示：如果有后端返回的具体 msg 则显示，否则显示通用提示
          const errorMsg = (res.data && res.data.msg) ? res.data.msg : '系统异常，请稍后重试';
          wx.showToast({ title: errorMsg, icon: 'none', duration: 2000 });
          reject(res);
        }
      },
      fail: (err) => {
        if (showLoading) wx.hideLoading();
        console.error('❌ 请求失败详情：', err);

        // 解析底层的网络错误（无网络、超时、DNS解析失败等）
        let friendlyMsg = '网络请求失败，请检查网络';
        
        if (err.errMsg.includes('timeout')) {
          friendlyMsg = '请求超时，请检查当前网络状态';
        } else if (err.errMsg.includes('request:fail')) {
          friendlyMsg = '似乎已断开与互联网的连接';
        }

        wx.showToast({ title: friendlyMsg, icon: 'none', duration: 3000 });
        reject(err);
      }
    });
  });
}

// 快捷方法
function get(url, options = {}) {
  return request({ ...options, url, method: 'GET' });
}

function post(url, data, options = {}) {
  return request({ ...options, url, method: 'POST', data });
}

module.exports = {
  request,
  get,
  post
};