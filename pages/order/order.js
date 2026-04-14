const request = require('../../utils/request.js');

const STATUS_ORDER = ['pending_confirm', 'pending_material', 'producing', 'pending_ship', 'shipped', 'completed'];
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
    scrollTop: 0,
    currentFilter: 'all',
    filterList: [
      { key: 'all', label: '全部' },
      { key: 'pending_confirm', label: '待确认' },
      { key: 'pending_material', label: '备料中' },
      { key: 'producing', label: '生产中' },
      { key: 'pending_ship', label: '待发货' },
      { key: 'completed', label: '已完成' }
    ],
    orderList: [],
    filteredOrderList: [],
    statusMap: STATUS_MAP,
    showModal: false,
    currentOrder: null,
    steps: PROCESS_STEPS,
    step: 0,
    nextStatusText: [],
    nextIndex: 0,
    targetStatusKey: '',
    targetStatusText: ''
  },

  onLoad() {
    this.fetchOrders();
  },

  onShow() {
    if (this.data.orderList.length > 0) {
      this.fetchOrders(false);
    }
  },

  fetchOrders(showLoading = true) {
    const params = {
      pageNum: 1,
      pageSize: 100
    };

    if (this.data.currentFilter !== 'all') {
      params.status = this.data.currentFilter;
    }

    return request.get('/production/orders/list', { data: params, showLoading })
      .then((res) => {
        const pageData = res.data || {};
        const list = (pageData.data || []).map(this.normalizeOrder);
        this.setData({
          orderList: list,
          filteredOrderList: list,
          scrollTop: 0
        });
      })
      .catch((error) => {
        console.error('获取生产订单失败：', error);
      });
  },

  normalizeOrder(item) {
    const processRaw = typeof item.process === 'number' ? item.process : null;
    return {
      ...item,
      model: item.modelCode || item.model || '-',
      width: item.spec || item.width || '-',
      fabric: item.fabric || '-',
      color: item.color || '-',
      price: item.price || '-',
      processRaw,
      process: processRaw === null ? 0 : processRaw + 1,
      statusIndex: STATUS_ORDER.indexOf(item.status)
    };
  },

  handleFilter(e) {
    this.setData({
      currentFilter: e.currentTarget.dataset.filter,
      scrollTop: 0
    });
    this.fetchOrders();
  },

  openUpdateModal(e) {
    const order = e.currentTarget.dataset.order;
    let step = 0;
    let nextStatusText = [];

    if (order.status === 'producing') {
      step = typeof order.processRaw === 'number' ? order.processRaw : 0;
    } else {
      nextStatusText = this.getNextStatusOptions(order.status);
    }

    this.setData({
      showModal: true,
      currentOrder: order,
      step,
      nextStatusText,
      nextIndex: 0,
      targetStatusKey: '',
      targetStatusText: ''
    });
  },

  getNextStatusOptions(currentStatus) {
    const currentIndex = STATUS_ORDER.indexOf(currentStatus);
    if (currentIndex < 0) {
      return [];
    }
    return STATUS_ORDER.slice(currentIndex + 1).map((key) => STATUS_MAP[key]);
  },

  changeStep(e) {
    this.setData({
      step: Number(e.detail.value)
    });
  },

  changeNextStatus(e) {
    this.setData({
      nextIndex: Number(e.detail.value)
    });
  },

  scanToUpdateStatus() {
    const { currentOrder } = this.data;
    if (!currentOrder) {
      wx.showToast({ title: '订单信息异常', icon: 'none' });
      return;
    }

    wx.scanCode({
      onlyFromCamera: true,
      scanType: ['barCode', 'qrCode'],
      success: (res) => {
        const targetStatusKey = this.parseScannedStatus(res.result);
        if (!targetStatusKey) {
          wx.showToast({ title: '扫码内容无效', icon: 'none' });
          return;
        }

        const currentIndex = STATUS_ORDER.indexOf(currentOrder.status);
        const targetIndex = STATUS_ORDER.indexOf(targetStatusKey);
        if (targetIndex <= currentIndex) {
          wx.showToast({ title: '不能回退订单状态', icon: 'none' });
          return;
        }

        this.setData({
          targetStatusKey,
          targetStatusText: STATUS_MAP[targetStatusKey]
        });

        wx.showModal({
          title: '确认更新',
          content: `是否将订单【${currentOrder.orderId}】更新为【${STATUS_MAP[targetStatusKey]}】？`,
          confirmText: '确认',
          cancelText: '取消',
          success: (modalRes) => {
            if (modalRes.confirm) {
              this.confirmUpdateByScan();
            }
          }
        });
      },
      fail: (error) => {
        if (error.errMsg !== 'scanCode:fail cancel') {
          console.error('扫码失败：', error);
          wx.showToast({ title: '扫码失败', icon: 'none' });
        }
      }
    });
  },

  parseScannedStatus(value) {
    const scanResult = String(value || '').trim();
    if (STATUS_ORDER.includes(scanResult)) {
      return scanResult;
    }

    const reverseMap = Object.keys(STATUS_MAP).reduce((map, key) => {
      map[STATUS_MAP[key]] = key;
      return map;
    }, {});
    return reverseMap[scanResult] || '';
  },

  confirmUpdateByScan() {
    const { currentOrder, targetStatusKey } = this.data;
    if (!currentOrder || !targetStatusKey) {
      wx.showToast({ title: '更新参数异常', icon: 'none' });
      return;
    }

    this.updateOrder(currentOrder.orderId, {
      status: targetStatusKey,
      operateType: 'scan_change',
      remark: `扫码更新为${STATUS_MAP[targetStatusKey]}`
    });
  },

  confirmUpdate() {
    const { currentOrder, step } = this.data;
    if (!currentOrder) {
      wx.showToast({ title: '订单信息异常', icon: 'none' });
      return;
    }

    if (currentOrder.status !== 'producing') {
      wx.showToast({ title: '请扫码更新订单状态', icon: 'none' });
      return;
    }

    const process = Number(step);
    const isLastProcess = process >= PROCESS_STEPS.length - 1;
    const payload = isLastProcess
      ? {
          status: 'pending_ship',
          process,
          operateType: 'process_change',
          remark: '完成卷布，流转到待发货'
        }
      : {
          status: 'producing',
          process,
          operateType: 'process_change',
          remark: `更新生产工序为${PROCESS_STEPS[process]}`
        };

    this.updateOrder(currentOrder.orderId, payload);
  },

  updateOrder(orderId, payload) {
    return request.post(`/production/orders/${orderId}/status`, payload)
      .then(() => {
        this.closeModal();
        wx.showToast({ title: '更新成功', icon: 'success' });
        return this.fetchOrders(false);
      })
      .catch((error) => {
        console.error('更新生产订单失败：', error);
      });
  },

  closeModal() {
    this.setData({
      showModal: false,
      currentOrder: null,
      step: 0,
      nextIndex: 0,
      nextStatusText: [],
      targetStatusKey: '',
      targetStatusText: ''
    });
  },

  stopPropagation() {},

  handleScanOrder() {
    wx.scanCode({
      success: (res) => {
        const orderId = String(res.result || '').trim();
        if (!orderId) {
          wx.showToast({ title: '订单号无效', icon: 'none' });
          return;
        }

        request.get(`/production/orders/detail/${orderId}`)
          .then((result) => {
            this.openUpdateModal({
              currentTarget: {
                dataset: {
                  order: this.normalizeOrder(result.data || {})
                }
              }
            });
          })
          .catch(() => {
            wx.showToast({ title: '未找到该订单', icon: 'none' });
          });
      },
      fail: (error) => {
        if (error.errMsg !== 'scanCode:fail cancel') {
          console.error('扫码失败：', error);
          wx.showToast({ title: '扫码失败', icon: 'none' });
        }
      }
    });
  },

  handleBack() {
    wx.navigateBack({ delta: 1 });
  },

  openDetail(e) {
    const order = e.currentTarget.dataset.order;
    wx.navigateTo({
      url: `/pages/orderDetail/orderDetail?orderId=${order.orderId}`
    });
  },

  handleCreateOrder() {
    wx.navigateTo({
      url: '/pages/productionOrderCreate/productionOrderCreate'
    });
  }
});