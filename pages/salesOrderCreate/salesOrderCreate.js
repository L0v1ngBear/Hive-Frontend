const { request } = require('../../utils/request.js');

Page({
  data: {
    formData: {
      customerName: '',
      projectName: '',
      // 【修改】：变为数组，默认给出一个空商品槽位
      items: [
        { modelCode: '', goodsDesc: '', quantity: '' }
      ],
      totalQuantity: 0, // 改为由系统自动累加
      totalAmount: '',
      deliveryDate: '',
      createProductionOrder: 0
    },
    minDate: ''
  },

  onLoad() {
    const today = new Date();
    const y = today.getFullYear();
    const m = (today.getMonth() + 1).toString().padStart(2, '0');
    const d = today.getDate().toString().padStart(2, '0');
    this.setData({ minDate: `${y}-${m}-${d}` });
  },

  handleBack() {
    wx.navigateBack({ delta: 1 });
  },

  // 基础输入框处理
  handleInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`formData.${field}`]: e.detail.value
    });
  },

  // 【新增】：处理商品明细数组里的输入
  handleItemInput(e) {
    const { index, field } = e.currentTarget.dataset;
    const value = e.detail.value;
    const items = this.data.formData.items;
    
    items[index][field] = value;

    // 如果修改的是数量，触发自动计算总数量
    let totalQuantity = this.data.formData.totalQuantity;
    if (field === 'quantity') {
      totalQuantity = items.reduce((sum, item) => {
        const q = parseFloat(item.quantity) || 0;
        return sum + q;
      }, 0);
    }

    this.setData({
      'formData.items': items,
      'formData.totalQuantity': totalQuantity
    });
  },

  // 【新增】：添加商品行
  addItem() {
    const items = this.data.formData.items;
    items.push({ modelCode: '', goodsDesc: '', quantity: '' });
    this.setData({ 'formData.items': items });
  },

  // 【新增】：删除商品行
  removeItem(e) {
    const index = e.currentTarget.dataset.index;
    const items = this.data.formData.items;
    items.splice(index, 1);

    // 重新计算总数量
    const totalQuantity = items.reduce((sum, item) => {
      const q = parseFloat(item.quantity) || 0;
      return sum + q;
    }, 0);

    this.setData({
      'formData.items': items,
      'formData.totalQuantity': totalQuantity
    });
  },

  handleDateChange(e) {
    this.setData({ 'formData.deliveryDate': e.detail.value });
  },

  handleSwitchChange(e) {
    this.setData({ 'formData.createProductionOrder': e.detail.value ? 1 : 0 });
  },

  async handleSubmit() {
    const { formData } = this.data;

    // 1. 基础校验
    if (!formData.customerName.trim()) return wx.showToast({ title: '请输入客户名称', icon: 'none' });
    if (!formData.projectName.trim()) return wx.showToast({ title: '请输入项目名称', icon: 'none' });

    // 2. 明细循环校验
    if (formData.items.length === 0) return wx.showToast({ title: '请至少添加一个商品', icon: 'none' });
    for (let i = 0; i < formData.items.length; i++) {
      const item = formData.items[i];
      if (!item.modelCode.trim()) return wx.showToast({ title: `请输入商品 ${i+1} 的型号`, icon: 'none' });
      if (!item.quantity || parseFloat(item.quantity) <= 0) return wx.showToast({ title: `请输入商品 ${i+1} 的正确数量`, icon: 'none' });
    }

    if (!formData.totalAmount || formData.totalAmount < 0) return wx.showToast({ title: '请输入正确的总金额', icon: 'none' });
    if (!formData.deliveryDate) return wx.showToast({ title: '请选择交货日期', icon: 'none' });

    wx.showLoading({ title: '提交中...', mask: true });

    try {
      // 3. 严格匹配后端最新的一对多 DTO 结构
      const postData = {
        customerName: formData.customerName,
        projectName: formData.projectName,
        totalQuantity: formData.totalQuantity, 
        totalAmount: Number(formData.totalAmount),
        deliveryDate: formData.deliveryDate,
        createProductionOrder: formData.createProductionOrder,
        // 将前端数组映射为后端的 List<OrderItemDTO>
        items: formData.items.map(item => ({
          modelCode: item.modelCode,
          goodsDesc: item.goodsDesc,
          quantity: parseFloat(item.quantity)
        }))
      };

      // 模拟网络请求
      await new Promise(resolve => setTimeout(resolve, 800));

      wx.hideLoading();
      wx.showToast({ title: '创建成功', icon: 'success' });
      
      setTimeout(() => {
        const pages = getCurrentPages();
        if (pages.length > 1) {
          const prePage = pages[pages.length - 2];
          if (prePage && prePage.mockGetSalesOrderData) {
            prePage.mockGetSalesOrderData(); 
          }
        }
        wx.navigateBack({ delta: 1 });
      }, 1500);

    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '提交失败，请重试', icon: 'none' });
    }
  }
});