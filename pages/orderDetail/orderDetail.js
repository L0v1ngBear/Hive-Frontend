const request = require('../../utils/request.js');

const STATUS_MAP = {
  pending_confirm: '待确认',
  pending_material: '备料中',
  producing: '生产中',
  pending_ship: '待发货',
  shipped: '已发货',
  completed: '已完成',
  cancelled: '已取消'
};
const PROCESS_STEPS = ['整经', '浆纱', '织造', '验布', '卷布'];

Page({
  data: {
    orderId: '',
    orderType: 'production',
    orderDetail: {},
    totalPrice: '0.00',
    statusMap: STATUS_MAP,
    statusClass: '',
    steps: PROCESS_STEPS,
    statusLog: []
  },

  onLoad(options) {
    const { orderId, type } = options;
    if (!orderId) {
      wx.showToast({ title: '订单ID异常', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    this.setData({
      orderId,
      orderType: type === 'sales' ? 'sales' : 'production'
    });
    this.getOrderDetail();
  },

  getOrderDetail() {
    wx.showLoading({ title: '加载中...', mask: true });

    const isSales = this.data.orderType === 'sales';
    const detailUrl = isSales
      ? `/sales/orders/detail/${this.data.orderId}`
      : `/production/orders/detail/${this.data.orderId}`;
    const logUrl = isSales
      ? `/sales/orders/status-log/${this.data.orderId}`
      : `/production/orders/status-log/${this.data.orderId}`;

    Promise.all([
      request.get(detailUrl, { showLoading: false }),
      request.get(logUrl, { showLoading: false })
    ])
      .then(([detailRes, logRes]) => {
        const orderDetail = isSales
          ? this.normalizeSalesOrder(detailRes.data || {})
          : this.normalizeProductionOrder(detailRes.data || {});
        const statusLog = this.normalizeLogs(logRes.data || []);

        this.setData({
          orderDetail,
          statusClass: `status-${orderDetail.status || ''}`,
          statusLog,
          totalPrice: this.calcTotalPrice(orderDetail)
        });
      })
      .catch((error) => {
        console.error('获取订单详情失败：', error);
        wx.showToast({ title: '获取订单详情失败', icon: 'none' });
      })
      .finally(() => {
        wx.hideLoading();
      });
  },

  normalizeProductionOrder(item) {
    const processRaw = typeof item.process === 'number' ? item.process : null;
    return {
      ...item,
      model: item.modelCode || item.model || '-',
      width: item.spec || item.width || '-',
      createTime: this.formatTime(item.createTime),
      deliveryDate: this.formatTime(item.deliveryDate),
      processRaw,
      process: processRaw === null ? 0 : processRaw + 1,
      processText: processRaw === null ? '未开始' : PROCESS_STEPS[processRaw],
      items: []
    };
  },

  normalizeSalesOrder(item) {
    const items = Array.isArray(item.items) ? item.items : [];
    return {
      ...item,
      model: item.goodsDesc || (items[0] && items[0].modelCode) || '-',
      width: '-',
      createTime: this.formatTime(item.createTime),
      deliveryDate: this.formatTime(item.deliveryDate),
      process: 0,
      processText: '',
      items
    };
  },

  normalizeLogs(list) {
    return list.map((item, index) => ({
      id: item.id || index + 1,
      statusText: this.buildLogTitle(item),
      time: this.formatTime(item.createTime),
      operator: item.operatorName || item.operator || '系统',
      remark: item.remark || '',
      current: index === list.length - 1
    }));
  },

  buildLogTitle(item) {
    const oldStatus = item.oldStatus ? (STATUS_MAP[item.oldStatus] || item.oldStatus) : '';
    const newStatus = item.newStatus ? (STATUS_MAP[item.newStatus] || item.newStatus) : '状态更新';
    return oldStatus ? `${oldStatus} → ${newStatus}` : newStatus;
  },

  formatTime(value) {
    if (!value) {
      return '';
    }
    return String(value).replace('T', ' ').slice(0, 19);
  },

  calcTotalPrice(orderDetail) {
    if (orderDetail.totalAmount) {
      return Number(orderDetail.totalAmount).toFixed(2);
    }
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
