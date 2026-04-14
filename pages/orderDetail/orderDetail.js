const request = require('../../utils/request.js');

const STATUS_MAP = {
  pending_confirm: '待确认',
  pending_material: '备料中',
  producing: '生产中',
  pending_ship: '待发货',
  shipped: '已发货',
  completed: '已完成'
};
const PROCESS_STEPS = ['整经', '浆纱', '织造', '验布', '卷布'];

Page({
  data: {
    orderId: '',
    orderDetail: {},
    totalPrice: '0.00',
    statusMap: STATUS_MAP,
    statusClass: '',
    steps: PROCESS_STEPS,
    statusLog: []
  },

  onLoad(options) {
    const { orderId } = options;
    if (!orderId) {
      wx.showToast({ title: '订单ID异常', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    this.setData({ orderId });
    this.getOrderDetail();
  },

  getOrderDetail() {
    wx.showLoading({ title: '加载中...', mask: true });

    Promise.all([
      request.get(`/production/orders/detail/${this.data.orderId}`, { showLoading: false }),
      request.get(`/production/orders/status-log/${this.data.orderId}`, { showLoading: false })
    ])
      .then(([detailRes, logRes]) => {
        const orderDetail = this.normalizeOrder(detailRes.data || {});
        const statusLog = this.normalizeLogs(logRes.data || []);

        this.setData({
          orderDetail,
          statusClass: `status-${orderDetail.status || ''}`,
          statusLog,
          totalPrice: this.calcTotalPrice(orderDetail)
        });
      })
      .catch((error) => {
        console.error('获取生产订单详情失败：', error);
      })
      .finally(() => {
        wx.hideLoading();
      });
  },

  normalizeOrder(item) {
    const processRaw = typeof item.process === 'number' ? item.process : null;
    return {
      ...item,
      model: item.modelCode || item.model || '-',
      width: item.spec || item.width || '-',
      createTime: this.formatTime(item.createTime),
      deliveryDate: this.formatTime(item.deliveryDate),
      processRaw,
      process: processRaw === null ? 0 : processRaw + 1,
      processText: processRaw === null ? '未开始' : PROCESS_STEPS[processRaw]
    };
  },

  normalizeLogs(list) {
    return list.map((item, index) => ({
      id: item.id || index + 1,
      statusText: item.newStatus || item.remark || '状态更新',
      time: this.formatTime(item.createTime),
      operator: item.operator || '系统',
      remark: item.remark || '',
      current: index === list.length - 1
    }));
  },

  formatTime(value) {
    if (!value) {
      return '';
    }
    return String(value).replace('T', ' ').slice(0, 19);
  },

  calcTotalPrice(orderDetail) {
    if (orderDetail.quantity && orderDetail.price) {
      return (Number(orderDetail.quantity) * Number(orderDetail.price)).toFixed(2);
    }
    return '0.00';
  },

  handleBack() {
    wx.navigateBack({ delta: 1 });
  },

  handleUpdateStatus() {
    wx.navigateBack({ delta: 1 });
  }
});