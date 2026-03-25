// 引入租户工具（之前封装的 tenant.js）
const tenantUtil = require('./tenant.js');

// 【 fix 】你的正式后端地址（必须 HTTPS + 合法域名）
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
    needTenant = true
  } = options;

  // 1. 获取租户ID
  const tenantId = tenantUtil.getTenantId();
  if (needTenant && !tenantId) {
    wx.showToast({ title: '请先选择租户', icon: 'none' });
    return Promise.reject('缺少租户ID');
  }

  // 2. 获取 user_id
  const userId = wx.getStorageSync('user_id') || '1';

  // 3. 加载
  if (showLoading) {
    wx.showLoading({ title: '加载中...', mask: true });
  }

  // 4. 请求头
  const header = {
    'content-type': 'application/json',
    ...(needTenant && { 'Tenant-Code': tenantId }),
    'User-Id': userId
  };

  // 5. 【关键修复】自动拼接 URL，并且自动处理斜杠问题
  let fullUrl = url;
  if (!url.startsWith('http')) {
    fullUrl = BASE_URL + url;
  }

  console.log('✅ 请求地址：', fullUrl); // 这里会打印真实地址
  console.log('✅ 请求头：', header);

  // 6. 发起请求
  return new Promise((resolve, reject) => {
    wx.request({
      url: fullUrl,
      method: method,
      header: header,
      data: data,
      timeout: 10000, // 超时时间
      success: (res) => {
        if (showLoading) wx.hideLoading();
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          wx.showToast({ title: '服务器异常', icon: 'none' });
          reject(res);
        }
      },
      fail: (err) => {
        if (showLoading) wx.hideLoading();
        console.error('❌ 请求失败详情：', err); // 看这里！
        wx.showToast({ title: '网络请求失败', icon: 'none' });
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