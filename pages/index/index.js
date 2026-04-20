const tenantUtil = require('../../utils/tenant.js');
const requestUtil = require('../../utils/request.js');
const authUtil = require('../../utils/auth.js');

Page({
  data: {
    isPc: false,
    todoCount: 0,
    todoList: [],
    tenantInfo: { name: '' },
    userInfo: { name: '', dept: '' },
    functionEnable: {
      attendance: true,
      order: true,
      salesOrder: true,
      inventory: true,
      approval: true,
      notice: true,
      file: true,
      badProduct: true,
      knowledge: true,
      customer: true
    },
    hasAnyFunctionEnable: true
  },

  onLoad() {
    this.fetchHomeSummary();
  },

  onShow() {
    this.fetchHomeSummary(false);
  },

  async fetchHomeSummary(showLoading = true) {
    if (!authUtil.isLoggedIn()) {
      this.setData({
        tenantInfo: tenantUtil.getTenantInfo(),
        userInfo: { name: '未登录用户', dept: '点击功能后跳转登录' },
        todoCount: 0,
        todoList: []
      });
      return;
    }

    try {
      const res = await requestUtil.get('/home/summary', { showLoading });
      const data = res.data || {};
      const tenantInfo = data.tenantInfo || {};
      tenantUtil.setTenantInfo(tenantInfo);

      this.setData({
        tenantInfo: { name: tenantInfo.name || '当前组织' },
        userInfo: data.userInfo || { name: '', dept: '' },
        todoCount: data.todoCount || 0,
        todoList: data.todoList || []
      });
    } catch (error) {
      console.error('获取首页数据失败', error);
    }
  },

  handleFunctionTap(e) {
    const type = e.currentTarget.dataset.functionType;
    if (!authUtil.requireLogin(`/pages/${type}/${type}`)) {
      return;
    }
    wx.navigateTo({ url: `/pages/${type}/${type}` });
  },

  async handleScanWebLogin() {
    if (!authUtil.requireLogin('/pages/index/index')) {
      return;
    }

    try {
      const scanResult = await new Promise((resolve, reject) => {
        wx.scanCode({
          scanType: ['qrCode'],
          success: resolve,
          fail: reject
        });
      });

      const sceneKey = this.parseWebLoginScene(scanResult.result);
      if (!sceneKey) {
        wx.showToast({ title: '这不是网页登录二维码', icon: 'none' });
        return;
      }

      await requestUtil.post(`${requestUtil.getWebBaseUrl()}/auth/scan-login/confirm`, {
        sceneKey
      }, { needTenant: false });

      wx.showToast({ title: '已确认网页登录', icon: 'success' });
    } catch (error) {
      if (error?.errMsg === 'scanCode:fail cancel') {
        return;
      }
      console.error('扫码确认网页登录失败', error);
    }
  },

  parseWebLoginScene(result) {
    const content = String(result || '').trim();
    if (!content) {
      return '';
    }
    if (content.startsWith('HIVE_WEB_LOGIN:')) {
      return content.slice('HIVE_WEB_LOGIN:'.length).trim();
    }
    return '';
  },

  handleJumpToTodoList() {
    wx.pageScrollTo({ scrollTop: 420, duration: 200 });
  },

  handleMoreTodo() {
    wx.pageScrollTo({ scrollTop: 420, duration: 200 });
  },

  handleTodoItemTap(e) {
    if (!authUtil.requireLogin('/pages/index/index')) {
      return;
    }

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
