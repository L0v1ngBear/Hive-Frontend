const tenantUtil = require('../../utils/tenant.js');
const requestUtil = require('../../utils/request.js');
const authUtil = require('../../utils/auth.js');

const FUNCTION_SEARCH_ITEMS = [
  {
    key: 'attendance',
    title: '考勤打卡',
    desc: '进入考勤打卡页面',
    route: '/pages/attendance/attendance',
    aliases: ['考勤', '打卡', '签到', '签退']
  },
  {
    key: 'order',
    title: '生产订单',
    desc: '进入生产订单列表',
    route: '/pages/order/order',
    aliases: ['生产', '订单', '排产', '工序']
  },
  {
    key: 'salesOrder',
    title: '销售订单',
    desc: '进入销售订单列表',
    route: '/pages/salesOrder/salesOrder',
    aliases: ['销售', '销售单', '发货', '客户订单']
  },
  {
    key: 'inventory',
    title: '库存管理',
    desc: '进入库存与扫码出库页面',
    route: '/pages/inventory/inventory',
    aliases: ['库存', '出库', '入库', '条码', '扫码']
  },
  {
    key: 'badProduct',
    title: '坏品管理',
    desc: '进入坏品管理页面',
    route: '/pages/badProduct/badProduct',
    aliases: ['坏品', '次品', '不良品']
  },
  {
    key: 'approval',
    title: '审批待办',
    desc: '进入待办中心处理审批事项',
    route: '/pages/todo/todo?type=approval',
    aliases: ['审批', '请假审批', '财务审批', '待办审批']
  },
  {
    key: 'scanWebLogin',
    title: '扫码登录网页端',
    desc: '使用小程序扫码确认网页登录',
    action: 'scanWebLogin',
    aliases: ['网页登录', '网页登录', '扫码登录', '二维码登录']
  }
];

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
    functionItems: [
      { key: 'attendance', label: '考勤', icon: '/images/attendance.png' },
      { key: 'order', label: '生产', icon: '/images/order.png' },
      { key: 'salesOrder', label: '销售', icon: '/images/salesOrder.png' },
      { key: 'inventory', label: '库存', icon: '/images/inventory.png' },
      { key: 'badProduct', label: '次品', icon: '/images/badproduct.png' },
      { key: 'approval', label: '审批', icon: '/images/approval.png' }
    ],
    hasAnyFunctionEnable: true,
    showSearchPanel: false,
    searchKeyword: '',
    searchResults: [],
    searchLoading: false,
    searchEmptyText: '输入关键词后可搜索功能、待办和订单'
  },

  onLoad() {
    this.fetchHomeSummary();
    this.resetSearchResults();
  },

  onShow() {
    this.fetchHomeSummary(false);
  },

  onUnload() {
    this.clearSearchTimer();
  },

  async fetchHomeSummary(showLoading = true) {
    if (!authUtil.isLoggedIn()) {
      this.setData({
        tenantInfo: tenantUtil.getTenantInfo(),
        userInfo: { name: '未登录用户', dept: '点击功能后跳转登录' },
        todoCount: 0,
        todoList: []
      });
      this.resetSearchResults();
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
      if (!this.data.searchKeyword.trim()) {
        this.resetSearchResults();
      }
    } catch (error) {
      console.error('获取首页数据失败', error);
    }
  },

  handleFunctionTap(e) {
    const type = e.currentTarget.dataset.functionType;
    const target = FUNCTION_SEARCH_ITEMS.find((item) => item.key === type);
    if (!target) {
      return;
    }
    this.navigateBySearchResult({
      type: 'function',
      route: target.route,
      redirect: target.route,
      action: target.action || ''
    });
  },

  handleSearchTap() {
    if (!authUtil.requireLogin('/pages/index/index')) {
      return;
    }
    this.setData({
      showSearchPanel: true
    });
    if (!this.data.searchKeyword.trim()) {
      this.resetSearchResults();
    }
  },

  closeSearchPanel() {
    this.clearSearchTimer();
    this.setData({
      showSearchPanel: false,
      searchKeyword: '',
      searchLoading: false
    });
    this.resetSearchResults();
  },

  stopSearchPanelPropagation() {},

  handleSearchInput(e) {
    const keyword = String(e.detail.value || '');
    this.setData({ searchKeyword: keyword });
    this.clearSearchTimer();

    if (!keyword.trim()) {
      this.setData({
        searchLoading: false,
        searchEmptyText: '输入关键词后可搜索功能、待办和订单'
      });
      this.resetSearchResults();
      return;
    }

    this.searchTimer = setTimeout(() => {
      this.performSearch(keyword.trim());
    }, 220);
  },

  clearSearchKeyword() {
    this.clearSearchTimer();
    this.setData({
      searchKeyword: '',
      searchLoading: false,
      searchEmptyText: '输入关键词后可搜索功能、待办和订单'
    });
    this.resetSearchResults();
  },

  async performSearch(keyword) {
    this.setData({
      searchLoading: true,
      searchEmptyText: '正在搜索...'
    });

    const localResults = this.searchLocal(keyword);
    const [productionResults, salesResults] = await Promise.all([
      this.searchProductionOrders(keyword),
      this.searchSalesOrders(keyword)
    ]);

    const merged = this.mergeSearchResults([
      ...localResults,
      ...productionResults,
      ...salesResults
    ]);

    this.setData({
      searchResults: merged,
      searchLoading: false,
      searchEmptyText: merged.length === 0 ? '没有找到相关内容，换个关键词试试' : ''
    });
  },

  searchLocal(keyword) {
    const normalized = keyword.toLowerCase();
    const results = [];

    FUNCTION_SEARCH_ITEMS.forEach((item) => {
      const hit = item.title.includes(keyword)
        || item.desc.includes(keyword)
        || (item.aliases || []).some((alias) => alias.toLowerCase().includes(normalized));
      if (hit) {
        results.push({
          id: `function-${item.key}`,
          type: 'function',
          title: item.title,
          desc: item.desc,
          badge: '功能',
          route: item.route || '',
          redirect: item.route || '/pages/index/index',
          action: item.action || ''
        });
      }
    });

    (this.data.todoList || []).forEach((item, index) => {
      const tag = item.tag || '';
      const content = item.content || '';
      if (tag.includes(keyword) || content.includes(keyword)) {
        results.push({
          id: `todo-${item.id || index}`,
          type: 'todo',
          title: content || tag || '待办事项',
          desc: `待办 · ${tag || '首页待办'}`,
          badge: '待办',
          todoItem: item
        });
      }
    });

    return results;
  },

  async searchProductionOrders(keyword) {
    if (!authUtil.isLoggedIn()) {
      return [];
    }

    try {
      const res = await requestUtil.get('/production/orders/list', {
        showLoading: false,
        data: {
          pageNum: 1,
          pageSize: 5,
          keyword
        }
      });

      const list = res?.data?.data || [];
      return list.map((item) => ({
        id: `production-${item.orderId}`,
        type: 'production',
        title: item.orderId || '生产订单',
        desc: `生产订单 · ${item.modelCode || item.model || '-'} · ${item.customerName || '未填写客户'}`,
        badge: '生产',
        orderId: item.orderId
      }));
    } catch (error) {
      console.error('搜索生产订单失败', error);
      return [];
    }
  },

  async searchSalesOrders(keyword) {
    if (!authUtil.isLoggedIn()) {
      return [];
    }

    try {
      const res = await requestUtil.get('/sales/orders/list', {
        showLoading: false,
        data: {
          current: 1,
          size: 5,
          keyWord: keyword
        }
      });

      const list = res?.data?.data || [];
      return list.map((item) => ({
        id: `sales-${item.orderId}`,
        type: 'sales',
        title: item.orderId || '销售订单',
        desc: `销售订单 · ${item.customerName || '未填写客户'} · ${item.projectName || '默认项目'}`,
        badge: '销售',
        orderId: item.orderId,
        keyword: item.orderId || keyword
      }));
    } catch (error) {
      console.error('搜索销售订单失败', error);
      return [];
    }
  },

  mergeSearchResults(results) {
    const seen = new Set();
    return results.filter((item) => {
      if (!item || !item.id || seen.has(item.id)) {
        return false;
      }
      seen.add(item.id);
      return true;
    });
  },

  resetSearchResults() {
    const suggestions = [
      {
        id: 'suggest-order',
        type: 'function',
        title: '生产订单',
        desc: '快速进入生产订单列表',
        badge: '推荐',
        route: '/pages/order/order',
        redirect: '/pages/order/order'
      },
      {
        id: 'suggest-sales',
        type: 'function',
        title: '销售订单',
        desc: '快速进入销售订单列表',
        badge: '推荐',
        route: '/pages/salesOrder/salesOrder',
        redirect: '/pages/salesOrder/salesOrder'
      },
      {
        id: 'suggest-inventory',
        type: 'function',
        title: '库存管理',
        desc: '快速进入库存与扫码出库',
        badge: '推荐',
        route: '/pages/inventory/inventory',
        redirect: '/pages/inventory/inventory'
      },
      {
        id: 'suggest-web-login',
        type: 'function',
        title: '扫码登录网页端',
        desc: '使用小程序确认网页登录',
        badge: '快捷',
        action: 'scanWebLogin',
        redirect: '/pages/index/index'
      }
    ];
    this.setData({ searchResults: suggestions });
  },

  handleSearchResultTap(e) {
    const item = e.currentTarget.dataset.item || {};
    this.closeSearchPanel();
    this.navigateBySearchResult(item);
  },

  navigateBySearchResult(item) {
    if (!item) {
      return;
    }

    if (item.action === 'scanWebLogin') {
      this.handleScanWebLogin();
      return;
    }

    if (item.type === 'todo') {
      this.handleTodoItemTap({
        currentTarget: {
          dataset: {
            item: item.todoItem
          }
        }
      });
      return;
    }

    if (item.type === 'production' && item.orderId) {
      if (!authUtil.requireLogin('/pages/orderDetail/orderDetail')) {
        return;
      }
      wx.navigateTo({
        url: `/pages/orderDetail/orderDetail?orderId=${item.orderId}`
      });
      return;
    }

    if (item.type === 'sales' && item.orderId) {
      if (!authUtil.requireLogin('/pages/orderDetail/orderDetail')) {
        return;
      }
      wx.navigateTo({
        url: `/pages/orderDetail/orderDetail?type=sales&orderId=${item.orderId}`
      });
      return;
    }

    if (item.route) {
      if (!authUtil.requireLogin(item.redirect || item.route)) {
        return;
      }
      wx.navigateTo({ url: item.route });
    }
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
      }, { needTenant: false, showLoading: true });

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
    if (!authUtil.requireLogin('/pages/todo/todo')) {
      return;
    }
    wx.navigateTo({ url: '/pages/todo/todo' });
  },

  handleMoreTodo() {
    this.handleJumpToTodoList();
  },

  handleTodoItemTap(e) {
    if (!authUtil.requireLogin('/pages/index/index')) {
      return;
    }

    const item = e.currentTarget.dataset.item || {};
    if (item.route && item.route !== '/pages/index/index') {
      wx.navigateTo({ url: item.route });
      return;
    }
    if (item.tag === '生产订单') {
      wx.navigateTo({ url: '/pages/order/order' });
      return;
    }
    if (item.tag === '销售订单') {
      wx.navigateTo({ url: '/pages/salesOrder/salesOrder' });
      return;
    }
    wx.navigateTo({ url: '/pages/todo/todo' });
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tabPage;
    if (tab !== 'index') {
      wx.showToast({ title: '我的页面未配置真实接口', icon: 'none' });
    }
  },

  clearSearchTimer() {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
      this.searchTimer = null;
    }
  }
});
