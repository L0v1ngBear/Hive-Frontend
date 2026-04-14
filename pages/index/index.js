const tenantUtil = require('../../utils/tenant.js');
const requestUtil = require('../../utils/request.js');

Page({
  data: {
    isPc: false,
    todoCount: 0,
    todoList: [],
    tenantInfo: { name: '' },
    userInfo: { name: '', dept: '' },
    functionEnable: {
      attendance: false,
      order: false,
      salesOrder: false,
      inventory: false,
      approval: false,
      notice: false,
      file: false,
      badProduct: false,
      knowledge: false,
      customer: false
    },
    hasAnyFunctionEnable: false
  },

  onLoad() {
    this.fetchHomeSummary();
  },

  onShow() {
    this.fetchHomeSummary(false);
  },

  async fetchHomeSummary(showLoading = true) {
    try {
      const res = await requestUtil.get('/home/summary', { showLoading });
      const data = res.data || {};
      const tenantInfo = data.tenantInfo || {};
      const functionEnable = data.functionEnable || {};
      tenantUtil.setTenantInfo(tenantInfo);

      this.setData({
        tenantInfo: { name: tenantInfo.name || '未加入组织' },
        userInfo: data.userInfo || { name: '', dept: '' },
        todoCount: data.todoCount || 0,
        todoList: data.todoList || [],
        functionEnable,
        hasAnyFunctionEnable: Object.values(functionEnable).some(Boolean)
      });
    } catch (error) {
      console.error('获取首页数据失败', error);
    }
  },

  handleJoinTenant() {
    const tenantInfo = tenantUtil.getTenantInfo();
    wx.showToast({ title: tenantInfo.name || '当前未绑定组织', icon: 'none' });
  },

  handleFunctionTap(e) {
    const type = e.currentTarget.dataset.functionType;
    if (!this.data.functionEnable[type]) {
      wx.showToast({ title: '该功能暂无权限', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: `/pages/${type}/${type}` });
  },

  handleJumpToTodoList() {
    wx.pageScrollTo({ scrollTop: 420, duration: 200 });
  },

  handleMoreTodo() {
    wx.pageScrollTo({ scrollTop: 420, duration: 200 });
  },

  handleTodoItemTap(e) {
    const item = e.currentTarget.dataset.item || {};
    if (item.tag === '生产订单') {
      wx.navigateTo({ url: '/pages/order/order' });
      return;
    }
    if (item.tag === '销售订单') {
      wx.navigateTo({ url: '/pages/salesOrder/salesOrder' });
      return;
    }
    wx.showToast({ title: item.content || '请前往审批中心处理', icon: 'none' });
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tabPage;
    if (tab !== 'index') {
      wx.showToast({ title: '该页面暂未开放', icon: 'none' });
    }
  }
});