// 租户上下文：管理租户ID、租户信息的本地存储
const TENANT_KEY = 'current_tenant'; // 租户信息缓存key
const TENANT_ID_KEY = 'current_tenant_id'; // 租户ID缓存key

// 模拟租户列表（后续替换为后端接口返回）
const MOCK_TENANT_LIST = [
  { id: 1, name: '家纺客户A', code: 'tenant_a', status: 1 },
  { id: 2, name: '家纺客户B', code: 'tenant_b', status: 1 },
  { id: 3, name: '家纺客户C', code: 'tenant_c', status: 1 }
];

// 测试用后续删除
const TEST_TENANT_ID = 'test_001';
const TEST_TENANT_NAME = '测试租户';

module.exports = {
  // 模拟：根据用户名获取租户（实际登录后从后端获取）
  getTenantByUsername(username) {
    // 简单模拟：不同用户名对应不同租户
    if (username.includes('a')) return MOCK_TENANT_LIST[0];
    if (username.includes('b')) return MOCK_TENANT_LIST[1];
    return MOCK_TENANT_LIST[2];
  },

  // 设置当前租户信息
  setTenantInfo(tenantInfo) {
    wx.setStorageSync(TENANT_KEY, tenantInfo);
    wx.setStorageSync(TENANT_ID_KEY, tenantInfo.id);
  },

  // 获取当前租户ID
  getTenantId() {
    return wx.getStorageSync(TENANT_ID_KEY) || TEST_TENANT_ID; // TEST_TENANT_ID后续需要删除
  },

  // 获取当前租户信息
  getTenantInfo() {
    return wx.getStorageSync(TENANT_KEY) || {};
  },

  // 清除租户信息（退出登录）
  clearTenantInfo() {
    wx.removeStorageSync(TENANT_KEY);
    wx.removeStorageSync(TENANT_ID_KEY);
  }
};