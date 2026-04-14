const requestUtil = require('../../utils/request.js');

Page({
  data: {
    formData: {
      customerName: '',
      projectName: '',
      items: [{ modelCode: '', quantity: '', weight: '', spec: '' }],
      deliveryDate: '',
      createProductionOrder: 1
    },
    totalQuantity: 0,
    minDate: ''
  },

  onLoad() {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    this.setData({ minDate: `${y}-${m}-${d}` });
  },

  handleBack() {
    wx.navigateBack({ delta: 1 });
  },

  handleInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`formData.${field}`]: e.detail.value });
  },

  handleItemInput(e) {
    const { index, field } = e.currentTarget.dataset;
    const items = this.data.formData.items;
    items[index][field] = e.detail.value;
    this.setData({ 'formData.items': items });
    if (field === 'quantity') this.calculateTotal();
  },

  calculateTotal() {
    const total = this.data.formData.items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
    this.setData({ totalQuantity: total.toFixed(2) });
  },

  addItem() {
    const items = this.data.formData.items;
    items.push({ modelCode: '', quantity: '', weight: '', spec: '' });
    this.setData({ 'formData.items': items });
  },

  removeItem(e) {
    const items = this.data.formData.items;
    items.splice(e.currentTarget.dataset.index, 1);
    this.setData({ 'formData.items': items }, () => this.calculateTotal());
  },

  handleDateChange(e) {
    this.setData({ 'formData.deliveryDate': e.detail.value });
  },

  handleSwitchChange(e) {
    this.setData({ 'formData.createProductionOrder': e.detail.value ? 1 : 0 });
  },

  async handleSubmit() {
    const { formData } = this.data;
    if (!formData.customerName.trim()) return wx.showToast({ title: '请输入客户名称', icon: 'none' });
    if (!formData.projectName.trim()) return wx.showToast({ title: '请输入项目名称', icon: 'none' });
    if (!formData.deliveryDate) return wx.showToast({ title: '请选择交货日期', icon: 'none' });
    if (!formData.items.length) return wx.showToast({ title: '请至少添加一个商品', icon: 'none' });

    for (let i = 0; i < formData.items.length; i += 1) {
      const item = formData.items[i];
      const name = `商品${i + 1}`;
      if (!item.modelCode.trim()) return wx.showToast({ title: `${name}型号不能为空`, icon: 'none' });
      if (!item.quantity || parseFloat(item.quantity) <= 0) return wx.showToast({ title: `${name}数量必须大于0`, icon: 'none' });
      if (!item.weight || parseFloat(item.weight) <= 0) return wx.showToast({ title: `${name}克重必须大于0`, icon: 'none' });
      if (!item.spec || parseFloat(item.spec) <= 0) return wx.showToast({ title: `${name}规格必须大于0`, icon: 'none' });
    }

    wx.showLoading({ title: '提交中...', mask: true });
    try {
      await requestUtil.post('/sales/orders/add', {
        customerName: formData.customerName.trim(),
        projectName: formData.projectName.trim(),
        deliveryDate: formData.deliveryDate,
        createProductionOrder: formData.createProductionOrder,
        items: formData.items.map((item) => ({
          modelCode: item.modelCode.trim(),
          quantity: parseFloat(item.quantity),
          weight: parseFloat(item.weight),
          spec: parseFloat(item.spec)
        }))
      }, { showLoading: false });

      wx.hideLoading();
      wx.showToast({ title: '创建成功', icon: 'success' });
      setTimeout(() => {
        const pages = getCurrentPages();
        const prePage = pages[pages.length - 2];
        if (prePage && typeof prePage.fetchOrderList === 'function') {
          prePage.setData({ page: 1, isFinished: false, filteredOrderList: [] });
          prePage.fetchOrderList();
        }
        wx.navigateBack();
      }, 800);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.msg || err.message || '提交失败', icon: 'none' });
    }
  }
});