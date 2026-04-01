const { request } = require('../../utils/request.js');

Page({
  data: {
    formData: {
      customerName: '',
      projectName: '',
      // 匹配后端 OrderItemDTO 的字段结构
      items: [
        { modelCode: '', quantity: '', weight: '', spec: '' }
      ],
      deliveryDate: '',
      createProductionOrder: 1 // 默认同步创建
    },
    totalQuantity: 0, // 用于页面显示的汇总
    minDate: ''
  },

  onLoad() {
    // 设置日期选择器的起始日期为今天
    const today = new Date();
    const y = today.getFullYear();
    const m = (today.getMonth() + 1).toString().padStart(2, '0');
    const d = today.getDate().toString().padStart(2, '0');
    this.setData({ minDate: `${y}-${m}-${d}` });
  },

  handleBack() {
    wx.navigateBack({ delta: 1 });
  },

  // 处理基础输入框 (客户名称、项目名称)
  handleInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`formData.${field}`]: e.detail.value
    });
  },

  // 处理商品明细数组里的输入 (modelCode, quantity, weight, spec)
  handleItemInput(e) {
    const { index, field } = e.currentTarget.dataset;
    const value = e.detail.value;
    const items = this.data.formData.items;
    
    items[index][field] = value;

    // 更新数据
    this.setData({
      'formData.items': items
    });

    // 如果修改的是数量，触发自动计算总数量展示
    if (field === 'quantity') {
      this.calculateTotal();
    }
  },

  // 计算总数量展示
  calculateTotal() {
    const items = this.data.formData.items;
    const total = items.reduce((sum, item) => {
      const q = parseFloat(item.quantity) || 0;
      return sum + q;
    }, 0);
    
    this.setData({
      totalQuantity: total.toFixed(2)
    });
  },

  // 添加商品行
  addItem() {
    const items = this.data.formData.items;
    items.push({ modelCode: '', quantity: '', weight: '', spec: '' });
    this.setData({ 'formData.items': items });
  },

  // 删除商品行
  removeItem(e) {
    const index = e.currentTarget.dataset.index;
    const items = this.data.formData.items;
    items.splice(index, 1);

    this.setData({ 'formData.items': items }, () => {
      this.calculateTotal();
    });
  },

  handleDateChange(e) {
    this.setData({ 'formData.deliveryDate': e.detail.value });
  },

  handleSwitchChange(e) {
    // 后端接收 Integer (0-否 1-是)
    this.setData({ 'formData.createProductionOrder': e.detail.value ? 1 : 0 });
  },

  async handleSubmit() {
    const { formData } = this.data;

    // 1. 基础信息校验
    if (!formData.customerName.trim()) return wx.showToast({ title: '请输入客户名称', icon: 'none' });
    if (!formData.projectName.trim()) return wx.showToast({ title: '请输入项目名称', icon: 'none' });
    if (!formData.deliveryDate) return wx.showToast({ title: '请选择交货日期', icon: 'none' });

    // 2. 明细循环校验
    if (formData.items.length === 0) return wx.showToast({ title: '请至少添加一个商品', icon: 'none' });
    
    for (let i = 0; i < formData.items.length; i++) {
      const item = formData.items[i];
      const name = `商品 ${i + 1}`;
      
      if (!item.modelCode.trim()) return wx.showToast({ title: `请输入${name}的型号`, icon: 'none' });
      
      if (!item.quantity || parseFloat(item.quantity) <= 0) 
        return wx.showToast({ title: `请输入${name}的正数数量`, icon: 'none' });
        
      if (!item.weight || parseFloat(item.weight) <= 0) 
        return wx.showToast({ title: `请输入${name}的正数克重`, icon: 'none' });
        
      if (!item.spec || parseFloat(item.spec) <= 0) 
        return wx.showToast({ title: `请输入${name}的正数规格`, icon: 'none' });
    }

    wx.showLoading({ title: '提交中...', mask: true });

    try {
      // 3. 构建符合后端 SalesOrderAddRequest 结构的数据
      const postData = {
        customerName: formData.customerName,
        projectName: formData.projectName,
        deliveryDate: formData.deliveryDate,
        createProductionOrder: formData.createProductionOrder,
        // 核心：映射并转换数值类型
        items: formData.items.map(item => ({
          modelCode: item.modelCode,
          quantity: parseFloat(item.quantity),
          weight: parseFloat(item.weight), // DTO中的 Float
          spec: parseFloat(item.spec)      // DTO中的 Float
        }))
      };

      console.log('发送给后端的数据:', postData);

      // 发送请求 (请确保 request.js 支持返回 Promise)
      // await request.post('/order/sales/add', postData);
      
      // 模拟请求成功效果
      await new Promise(resolve => setTimeout(resolve, 800));

      wx.hideLoading();
      wx.showToast({ title: '创建成功', icon: 'success' });
      
      // 延迟返回，给用户看一眼成功提示
      setTimeout(() => {
        const pages = getCurrentPages();
        if (pages.length > 1) {
          const prePage = pages[pages.length - 2];
          // 刷新上一页数据列表（如果有刷新方法的话）
          if (prePage && prePage.onRefresh) {
            prePage.onRefresh(); 
          }
        }
        wx.navigateBack();
      }, 1500);

    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '提交失败', icon: 'none' });
    }
  }
});