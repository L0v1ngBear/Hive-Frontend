// pages/index/index.js
const functionAuth = require('../../utils/function-auth.js');
const tenantUtil = require('../../utils/tenant.js');
const { request } = require('../../utils/request.js');

// ================= 预留 API 接口配置 =================
const API = {
  // 基础数据接口
  GET_USER_INFO: 'https://你的接口域名/api/user/info',           // 获取用户信息
  GET_TENANT_INFO: 'https://你的接口域名/api/tenant/info',       // 获取租户详细信息
  GET_AUTH_FUNCTIONS: 'https://你的接口域名/api/permission/list', // 获取租户启用的核心功能权限
  // 待办与消息接口
  GET_TODO_LIST: 'https://你的接口域名/api/todo/list',           // 获取待办事项
  // 业务模块接口预留（可供对应的子页面调用）
  GET_PROD_ORDERS: 'https://你的接口域名/api/order/production',  // 生产订单接口
  GET_SALES_ORDERS: 'https://你的接口域名/api/order/sales',      // 销售订单接口
  GET_KNOWLEDGE_BASE: 'https://你的接口域名/api/knowledge/list'  // 知识库接口
};
// =====================================================

Page({
  data: {
    isPc: false,
    todoCount: 0, 
    todoList: [],  
    tenantInfo: {
      name: '' 
    },
    userInfo: {    
      name: "张三",
      dept: "技术部 - 前端开发工程师"
    },
    // 新增：补充 salesOrder 和 knowledge 字段
    functionEnable: {
      attendance: true,
      order: true,       // 生产订单
      salesOrder: false,  // 销售订单 (新增)
      inventory: true,
      approval: false,
      notice: false,
      file: false,
      badProduct: false,
      knowledge: false,
      customer: true,
    },
    hasAnyFunctionEnable: false
  },

  onLoad(options) {
    this.initFunctionPermission();
    this.fetchUserInfo(); // 替换为真实的预留接口方法
    this.fetchTodoData();
  },

  onShow() {
    this.initFunctionPermission();
    this.fetchUserInfo();
    this.fetchTodoData();
  },

  /**
   * 预留：从服务端拉取用户和关联租户信息
   */
  async fetchUserInfo() {
    try {
      // 预留接口请求代码：
      /*
      const res = await request({ url: API.GET_USER_INFO, method: 'GET' });
      this.setData({ userInfo: res.data });
      */

      // 以下为现有本地获取逻辑：
      const tenantInfo = tenantUtil.getTenantInfo();
      if (tenantInfo && tenantInfo.name) {
        this.setData({
          tenantInfo: { name: tenantInfo.name },
          userInfo: {
            ...this.data.userInfo,
            dept: `${tenantInfo.name} - ${this.data.userInfo.dept.split(' - ').pop()}`
          }
        });
      } else {
        this.setData({ tenantInfo: { name: "群星" } });
      }
    } catch (error) {
      console.error('获取用户信息失败', error);
    }
  },

  handleJoinTenant() {
    if (this.data.tenantInfo.name && this.data.tenantInfo.name !== '群星') {
      wx.showToast({ title: `当前租户：${this.data.tenantInfo.name}`, icon: 'none' });
    } else {
      wx.navigateTo({ url: '/pages/joinTenant/joinTenant' });
    }
  },

  /**
   * 初始化功能权限
   */
  initFunctionPermission() {
    // 预留从服务端获取权限：
    // request({ url: API.GET_AUTH_FUNCTIONS, method: 'GET' }).then(res => { ... })

    // 当前固定映射
    const functionEnable = {
      attendance: true,
      order: true,         // 生产订单显示
      salesOrder: true,    // 销售订单显示
      inventory: true,
      approval: true,
      notice: true,
      file: false,
      badProduct: true,
      knowledge: true, 
      customer: true     // 企业知识库显示
    }

    const hasAnyFunctionEnable = Object.values(functionEnable).some(enable => enable === true);

    this.setData({
      functionEnable,
      hasAnyFunctionEnable
    });
  },

  async fetchTodoData() {
    const tenantId = tenantUtil.getTenantId();
    if (!tenantId) {
      // 本地无租户时，为了体验可先注销拦截，或者要求强制登录
      console.warn('暂无租户ID');
    }

    wx.showLoading({ title: '加载中...' });

    try {
      // 使用预留的常量 API.GET_TODO_LIST
      const res = await request({
        url: API.GET_TODO_LIST,
        method: 'GET',
        needTenant: !!tenantId // 如果未选租户，可能允许不带Tenant请求公共待办
      });

      const { count, list } = res.data;
      this.setData({
        todoCount: count,
        todoList: list
      });
    } catch (err) {
      console.error('待办数据请求失败：', err);
    } finally {
      wx.hideLoading();
    }
  },

  handleFunctionTap(e) {
    const type = e.currentTarget.dataset.functionType;

    if (!this.data.functionEnable[type]) {
      wx.showToast({ title: '该功能已禁用，请联系管理员', icon: 'none' });
      return;
    }

    wx.showToast({
      title: `即将进入${this.getFunctionName(type)}`,
      icon: "none",
      duration: 1500
    });
    wx.navigateTo({ url: `/pages/${type}/${type}` });
  },

  getFunctionName(type) {
    const functionMap = {
      order: "生产订单",          // 修改原映射
      salesOrder: "销售订单",     // 新增
      inventory: "库存管理",
      attendance: "考勤打卡",
      approval: "审批流程",
      notice: "企业公告",
      file: "内部文件",
      contact: "员工通讯录",
      meeting: "会议室预约",
      asset: "资产管理",
      more: "更多功能",
      badProduct: "次品管理",
      knowledge: "企业知识库",
      customer: "客户管理"    // 新增
    };
    return functionMap[type] || "未知功能";
  },

  handleJumpToTodoList() {
    wx.navigateTo({ url: '/pages/todoList/todoList' });
  },

  handleMoreTodo() {
    wx.navigateTo({ url: '/pages/todoList/todoList' });
  },

  handleTodoItemTap(e) {
    const todoId = e.currentTarget.dataset.todoId;
    wx.showToast({ title: `查看待办项 ${todoId} 详情`, icon: "none" });
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tabPage;
    if (tab === "index") {
      return;
    } else if (tab === "mine") {
      wx.switchTab({ url: "/pages/mine/mine" });
    }
  }
});