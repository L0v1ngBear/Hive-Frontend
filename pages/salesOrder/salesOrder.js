const { request } = require('../../utils/request.js');

Page({
  data: {
    currentFilter: 'all',
    searchKeyword: '',
    filterList: [
      { key: 'all', label: '全部' },
      { label: '待确认', key: 'pending_confirm' },
      { label: '备料中', key: 'pending_material' },
      { label: '生产中', key: 'producing' },
      { label: '待发货', key: 'pending_ship' },
      { label: '已发货', key: 'shipped' },
      { label: '已完成', key: 'completed' }
    ],
    filteredOrderList: [],
    page: 1,
    pageSize: 10,
    total: 0,
    isFinished: false,
    isLoading: false
  },

  onLoad(options = {}) {
    const keyword = decodeURIComponent(options.keyword || '');
    if (keyword) {
      this.setData({ searchKeyword: keyword });
    }
    this.fetchOrderList();
  },

  fetchOrderList(isMore = false) {
    if (this.data.isLoading || (isMore && this.data.isFinished)) return;

    this.setData({ isLoading: true });

    const queryParams = {
      current: this.data.page,
      size: this.data.pageSize,
      status: this.data.currentFilter === 'all' ? '' : this.data.currentFilter
    };

    if (this.data.searchKeyword) {
      queryParams.keyWord = this.data.searchKeyword;
    }

    request({
      url: '/sales/orders/list',
      method: 'GET',
      params: queryParams
    }).then((res) => {
      const { data, total, pages } = res.data;
      const newList = isMore ? this.data.filteredOrderList.concat(data) : data;

      this.setData({
        filteredOrderList: newList,
        total,
        isFinished: this.data.page >= pages
      });
    }).catch((err) => {
      console.error('加载销售订单失败', err);
    }).finally(() => {
      this.setData({ isLoading: false });
      wx.stopPullDownRefresh();
    });
  },

  handleFilter(e) {
    const filterKey = e.currentTarget.dataset.filter;
    if (this.data.currentFilter === filterKey) return;

    this.setData({
      currentFilter: filterKey,
      page: 1,
      filteredOrderList: [],
      isFinished: false
    }, () => {
      this.fetchOrderList();
    });
  },

  handleAction(e) {
    const { type, order } = e.currentTarget.dataset;
    const { orderId } = order;

    const actionConfig = {
      confirm: { status: 'pending_material', msg: '确认接受该订单并开始备料？' },
      material_done: { status: 'producing', msg: '确认备料已完成，开始排产？' },
      produce_done: { status: 'pending_ship', msg: '确认生产已完成，准备发货？' },
      ship: { status: 'shipped', msg: '确认订单已发货？' },
      finish: { status: 'completed', msg: '确认订单已完成签收与结算？' }
    };

    if (type === 'logistics') {
      this.getExpressDetail(orderId);
      return;
    }

    const config = actionConfig[type];
    if (!config) return;

    wx.showModal({
      title: '业务流转确认',
      content: config.msg,
      confirmColor: '#1890FF',
      success: (res) => {
        if (res.confirm) this.executeStatusUpdate(orderId, config.status);
      }
    });
  },

  executeStatusUpdate(orderId, nextStatus) {
    wx.showLoading({ title: '处理中...' });

    request({
      url: `/sales/orders/${orderId}/status`,
      method: 'POST',
      data: { status: nextStatus }
    }).then(() => {
      wx.showToast({ title: '流转成功', icon: 'success' });
      this.setData({ page: 1, isFinished: false }, () => {
        this.fetchOrderList();
      });
    }).catch((err) => {
      console.error('更新销售订单状态失败', err);
    }).finally(() => {
      wx.hideLoading();
    });
  },

  getExpressDetail(orderId) {
    request({
      url: `/sales/orders/expressInfo/${orderId}`,
      method: 'GET'
    }).then((res) => {
      const { expressCompany, expressNo } = res.data;
      if (!expressNo) {
        wx.showToast({ title: '暂无物流信息', icon: 'none' });
        return;
      }
      wx.showModal({
        title: '物流信息',
        content: `快递公司：${expressCompany || '未知'}\n快递单号：${expressNo}`,
        showCancel: false
      });
    });
  },

  handleCreateOrder() {
    wx.navigateTo({ url: '/pages/salesOrderCreate/salesOrderCreate' });
  },

  openDetail(e) {
    const { orderId } = e.currentTarget.dataset.order;
    wx.navigateTo({ url: `/pages/orderDetail/orderDetail?type=sales&orderId=${orderId}` });
  },

  onPullDownRefresh() {
    this.setData({ page: 1, isFinished: false }, () => {
      this.fetchOrderList();
    });
  },

  onReachBottom() {
    if (!this.data.isFinished && !this.data.isLoading) {
      this.setData({ page: this.data.page + 1 }, () => {
        this.fetchOrderList(true);
      });
    }
  },

  handleBack() {
    wx.navigateBack({ delta: 1 });
  },

  handleSearch() {
    wx.showToast({ title: '可从首页顶部搜索框直接搜索销售订单', icon: 'none' });
  }
});
