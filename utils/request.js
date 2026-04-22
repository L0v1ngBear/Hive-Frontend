const tenantUtil = require('./tenant.js');
const secureUtil = require('./secure.js');
const authUtil = require('./auth.js');

const DEVTOOLS_BASE_URL = 'http://127.0.0.1:8080/api';
const DEVICE_BASE_URL = 'http://192.168.10.16:8080/api';
const DEVTOOLS_WEB_BASE_URL = 'http://127.0.0.1:8081/web';
const DEVICE_WEB_BASE_URL = 'http://192.168.10.16:8081/web';

function getBaseUrl() {
  try {
    const { platform } = wx.getSystemInfoSync();
    // The devtools proxy is more stable against localhost than the host LAN IP.
    return platform === 'devtools' ? DEVTOOLS_BASE_URL : DEVICE_BASE_URL;
  } catch (error) {
    return DEVICE_BASE_URL;
  }
}

function getWebBaseUrl() {
  try {
    const { platform } = wx.getSystemInfoSync();
    return platform === 'devtools' ? DEVTOOLS_WEB_BASE_URL : DEVICE_WEB_BASE_URL;
  } catch (error) {
    return DEVICE_WEB_BASE_URL;
  }
}

function request(options) {
  const {
    url,
    method = 'POST',
    data = {},
    params = {},
    showLoading = true,
    needTenant = true,
    needAuth = true,
    timeout = 15000
  } = options;

  const tenantId = tenantUtil.getTenantId();
  if (needTenant && !tenantId) {
    wx.showToast({ title: '请先选择租户', icon: 'none' });
    return Promise.reject(new Error('缺少租户编码'));
  }

  const token = wx.getStorageSync('token');
  const responseKey = wx.getStorageSync('response_key');

  if (needAuth && !token && url !== '/auth/login') {
    authUtil.redirectToLogin();
    return Promise.reject(new Error('请先登录'));
  }

  if (showLoading) {
    wx.showLoading({ title: '加载中...', mask: true });
  }

  const header = {
    'content-type': 'application/json'
  };

  if (token) {
    header.Authorization = `Bearer ${token}`;
    if (responseKey && url !== '/auth/login') {
      header['X-Response-Encrypt'] = '1';
    }
  } else if (needTenant) {
    header['Tenant-Code'] = tenantId;
  }

  // wx.request 的 GET 查询参数也通过 data 传递；兼容旧页面里使用 params 的写法，避免参数被静默丢弃。
  const requestData = Object.keys(params || {}).length > 0 ? { ...data, ...params } : data;
  const fullUrl = url.startsWith('http') ? url : getBaseUrl() + url;

  return new Promise((resolve, reject) => {
    wx.request({
      url: fullUrl,
      method,
      header,
      data: requestData,
      timeout,
      success: (res) => {
        if (showLoading) {
          wx.hideLoading();
        }

        const result = res.data || {};
        const msg = result.msg || '请求失败';

        if (res.statusCode === 200) {
          try {
            result.data = secureUtil.decryptPayload(responseKey, result.data);
          } catch (error) {
            wx.showToast({ title: '响应解密失败', icon: 'none' });
            reject(error);
            return;
          }

          if (result.code === 200) {
            resolve(result);
            return;
          }

          if (result.code === 401) {
            authUtil.clearLoginSession();
            authUtil.redirectToLogin();
          }
          wx.showToast({ title: msg, icon: 'none' });
          reject(result);
          return;
        }

        if (res.statusCode === 401) {
          authUtil.clearLoginSession();
          authUtil.redirectToLogin();
        }
        wx.showToast({ title: msg, icon: 'none' });
        reject(res);
      },
      fail: (err) => {
        if (showLoading) {
          wx.hideLoading();
        }

        let friendlyMsg = '网络请求失败，请检查网络';
        if ((err.errMsg || '').includes('timeout')) {
          friendlyMsg = '请求超时，请重试';
        } else if ((err.errMsg || '').includes('request:fail')) {
          friendlyMsg = '网络连接异常';
        }

        wx.showToast({ title: friendlyMsg, icon: 'none' });
        reject(err);
      }
    });
  });
}

function get(url, options = {}) {
  return request({ ...options, url, method: 'GET' });
}

function post(url, data, options = {}) {
  return request({ ...options, url, method: 'POST', data });
}

module.exports = {
  request,
  get,
  post,
  getWebBaseUrl
};
