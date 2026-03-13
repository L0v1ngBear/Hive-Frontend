// 引入租户工具（之前封装的 tenant.js）
const tenantUtil = require('./tenant.js');



/**
 * 封装微信小程序请求方法，自动带租户ID
 * @param {Object} options - 请求配置
 * @param {String} options.url - 接口地址
 * @param {String} [options.method='POST'] - 请求方法
 * @param {Object} [options.data={}] - 请求参数
 * @param {Boolean} [options.showLoading=true] - 是否显示加载中
 * @param {Boolean} [options.needTenant=true] - 是否需要带租户ID
 * @returns {Promise} - 返回Promise
 */
function request(options) {
  const {
    url,
    method = 'POST',
    data = {},
    showLoading = true,
    needTenant = true
  } = options;

  // 1. 前置校验：如果需要租户ID但未获取到，直接reject
  const tenantId = tenantUtil.getTenantId();
  if (needTenant && !tenantId) {
    wx.showToast({ title: '请先选择租户', icon: 'none' });
    return Promise.reject(new Error('缺少租户ID'));
  }

  // 2. 显示加载提示（可选）
  if (showLoading) {
    wx.showLoading({ title: '处理中...', mask: true });
  }

  // 3. 构造请求头（自动加租户ID）
  const header = {
    'content-type': 'application/json',
    ...(needTenant && { 'Tenant-Id': tenantId }) // 自动添加租户ID到请求头
  };

  // 4. 返回Promise，简化异步调用
  return new Promise((resolve, reject) => {
    wx.request({
      url: url,
      method: method,
      header: header,
      data: data,
      success: (res) => {
        // 统一隐藏加载提示
        if (showLoading) wx.hideLoading();

        // 统一处理后端返回的错误码（比如401未授权、403无权限）
        if (res.data.code === 200) {
          resolve(res.data); // 成功：返回后端数据
        } else {
          // 统一错误提示（可根据业务调整）
          wx.showToast({ title: res.data.msg || '请求失败', icon: 'none' });
          reject(new Error(res.data.msg || '请求失败'));
        }
      },
      fail: (err) => {
        // 统一隐藏加载提示
        if (showLoading) wx.hideLoading();

        // 统一网络错误提示
        wx.showToast({ title: '网络异常，请重试', icon: 'none' });
        reject(err);
        console.error(`接口请求失败：${url}`, err);
      }
    });
  });
}

// 导出封装后的请求方法
module.exports = {
  request
};