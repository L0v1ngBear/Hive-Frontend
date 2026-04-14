const requestUtil = require('../../utils/request.js');

Page({
  data: {
    formData: {
      customerName: '',
      projectName: '',
      modelCode: '',
      weight: '',
      spec: '',
      quantity: '',
      deliveryDate: ''
    },
    minDate: ''
  },

  onLoad() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const y = tomorrow.getFullYear();
    const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const d = String(tomorrow.getDate()).padStart(2, '0');
    this.setData({ minDate: `${y}-${m}-${d}` });
  },

  handleBack() {
    wx.navigateBack({ delta: 1 });
  },

  handleInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`formData.${field}`]: e.detail.value });
  },

  handleDateChange(e) {
    this.setData({ 'formData.deliveryDate': e.detail.value });
  },

  async handleSubmit() {
    const { formData } = this.data;
    if (!formData.modelCode.trim()) return wx.showToast({ title: '面料型号不能为空', icon: 'none' });

    const weightVal = parseFloat(formData.weight);
    if (!formData.weight || isNaN(weightVal) || weightVal <= 0) return wx.showToast({ title: '克重必须大于0', icon: 'none' });

    const specVal = parseFloat(formData.spec);
    if (!formData.spec || isNaN(specVal) || specVal <= 0) return wx.showToast({ title: '规格必须为正数', icon: 'none' });

    const quantityVal = parseInt(formData.quantity, 10);
    if (!formData.quantity || isNaN(quantityVal) || quantityVal < 1) return wx.showToast({ title: '订单数量至少为1', icon: 'none' });

    if (!formData.deliveryDate) return wx.showToast({ title: '预计交付日期不能为空', icon: 'none' });

    wx.showLoading({ title: '提交中...', mask: true });
    try {
      await requestUtil.post('/production/orders/add', {
        customerName: formData.customerName.trim() || null,
        projectName: formData.projectName.trim() || null,
        modelCode: formData.modelCode.trim(),
        weight: weightVal,
        spec: specVal,
        quantity: quantityVal,
        deliveryDate: `${formData.deliveryDate} 00:00:00`
      }, { showLoading: false });

      wx.hideLoading();
      wx.showToast({ title: '创建成功', icon: 'success' });
      setTimeout(() => {
        const pages = getCurrentPages();
        const prePage = pages[pages.length - 2];
        if (prePage && typeof prePage.fetchOrders === 'function') {
          prePage.fetchOrders(false);
        }
        wx.navigateBack();
      }, 800);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.msg || err.message || '提交失败', icon: 'none' });
    }
  }
});