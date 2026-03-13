// 功能权限校验 - 适配微信小程序
const tenantUtil = require('./tenant.js');
const FUNCTION_CACHE_KEY = 'tenant_function_list';

// 所有功能定义（一级模块+二级子功能）
const ALL_FUNCTIONS = [
  { id: 1, parentId: 0, code: 'attendance', name: '考勤管理', status: 1 },
  { id: 2, parentId: 0, code: 'inventory', name: '库存管理', status: 1 },
  { id: 3, parentId: 0, code: 'order', name: '订单管理', status: 1 },
  { id: 4, parentId: 0, code: 'badProduct', name: '次品管理', status: 1 },
  { id: 11, parentId: 1, code: 'attendance_check', name: '打卡记录', status: 1 },
  { id: 12, parentId: 1, code: 'attendance_rule', name: '打卡规则', status: 1 },
  { id: 21, parentId: 2, code: 'inventory_list', name: '库存查询', status: 1 },
  { id: 22, parentId: 2, code: 'inventory_warn', name: '库存预警', status: 1 },
  { id: 31, parentId: 3, code: 'order_list', name: '订单列表', status: 1 },
  { id: 41, parentId: 4, code: 'badProduct_list', name: '次品登记', status: 1 }
];

// 不同租户的功能启用配置
const TENANT_FUNCTIONS = {
  1: ['attendance', 'attendance_check', 'inventory', 'inventory_list'], // 租户A
  2: ['attendance', 'order', 'order_list', 'badProduct'], // 租户B
  3: ['attendance', 'inventory', 'order', 'badProduct'] // 租户C（全量）
};

module.exports = {
  // 初始化租户功能列表
  initFunctionList() {
    const tenantId = tenantUtil.getTenantId();
    if (!tenantId) return;

    // 生成功能状态映射
    const functionMap = {};
    const enableCodes = TENANT_FUNCTIONS[tenantId] || [];
    ALL_FUNCTIONS.forEach(item => {
      functionMap[item.code] = enableCodes.includes(item.code);
    });

    // 缓存到微信本地存储
    wx.setStorageSync(FUNCTION_CACHE_KEY, functionMap);
  },

  // 校验功能是否启用
  checkEnable(functionCode) {
    const functionMap = wx.getStorageSync(FUNCTION_CACHE_KEY) || {};
    return functionMap[functionCode] === true;
  },

  // 获取功能树形列表（配置页用）
  getFunctionTree() {
    const tenantId = tenantUtil.getTenantId();
    const enableCodes = TENANT_FUNCTIONS[tenantId] || [];
    
    // 组装树形结构
    const tree = [];
    // 一级模块
    const parents = ALL_FUNCTIONS.filter(item => item.parentId === 0);
    parents.forEach(parent => {
      const node = {
        ...parent,
        status: enableCodes.includes(parent.code) ? 1 : 0,
        children: []
      };
      // 二级子功能
      const children = ALL_FUNCTIONS.filter(item => item.parentId === parent.id);
      node.children = children.map(child => ({
        ...child,
        status: enableCodes.includes(child.code) ? 1 : 0
      }));
      tree.push(node);
    });
    return tree;
  },

  // 清除功能缓存
  clearFunctionCache() {
    wx.removeStorageSync(FUNCTION_CACHE_KEY);
  }
};