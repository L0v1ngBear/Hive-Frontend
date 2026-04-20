const tenantUtil = require('./tenant.js');

const LOGIN_PAGE = '/pages/login/login';

function isLoggedIn() {
  return !!wx.getStorageSync('token');
}

function getLoginUrl(redirectUrl = '') {
  if (!redirectUrl) {
    return LOGIN_PAGE;
  }
  return `${LOGIN_PAGE}?redirect=${encodeURIComponent(redirectUrl)}`;
}

function redirectToLogin(redirectUrl = '') {
  wx.navigateTo({
    url: getLoginUrl(redirectUrl)
  });
}

function requireLogin(redirectUrl = '') {
  if (isLoggedIn()) {
    return true;
  }
  redirectToLogin(redirectUrl);
  return false;
}

function saveLoginSession(loginData = {}) {
  const tenantCode = loginData.tenantCode || tenantUtil.getTenantId();
  wx.setStorageSync('token', loginData.token || '');
  wx.setStorageSync('response_key', loginData.responseKey || '');
  wx.setStorageSync('user_id', loginData.userId || '');
  wx.setStorageSync('userInfo', {
    id: loginData.userId || '',
    name: loginData.userName || '',
    dept: loginData.position || ''
  });
  tenantUtil.setTenantInfo({
    code: tenantCode,
    tenantCode,
    name: loginData.tenantName || tenantUtil.getTenantInfo().name || tenantCode
  });
}

function clearLoginSession() {
  wx.removeStorageSync('token');
  wx.removeStorageSync('response_key');
  wx.removeStorageSync('user_id');
  wx.removeStorageSync('userInfo');
}

module.exports = {
  isLoggedIn,
  getLoginUrl,
  redirectToLogin,
  requireLogin,
  saveLoginSession,
  clearLoginSession
};
