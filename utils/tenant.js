const TENANT_KEY = 'current_tenant';
const TENANT_ID_KEY = 'current_tenant_id';
const DEFAULT_TENANT_CODE = 'TENANT_001';

module.exports = {
  setTenantInfo(tenantInfo = {}) {
    const normalized = {
      ...tenantInfo,
      code: tenantInfo.code || tenantInfo.tenantCode || tenantInfo.id || DEFAULT_TENANT_CODE,
      name: tenantInfo.name || tenantInfo.tenantName || ''
    };
    wx.setStorageSync(TENANT_KEY, normalized);
    wx.setStorageSync(TENANT_ID_KEY, normalized.code);
  },

  getTenantId() {
    return wx.getStorageSync(TENANT_ID_KEY) || (wx.getStorageSync(TENANT_KEY) || {}).code || DEFAULT_TENANT_CODE;
  },

  getTenantInfo() {
    return wx.getStorageSync(TENANT_KEY) || { code: DEFAULT_TENANT_CODE, name: '' };
  },

  clearTenantInfo() {
    wx.removeStorageSync(TENANT_KEY);
    wx.removeStorageSync(TENANT_ID_KEY);
  }
};