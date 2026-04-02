const { request } = require('../../utils/request.js');

Page({
  data: {
    formData: {
      customerName: '',
      projectName: '',
      modelCode: '',   // 面料型号
      weight: '',      // 克重
      spec: '',        // 规格
      quantity: '',    // 数量
      deliveryDate: '' // 预计交付日期
    },
    minDate: '' // 用于限制日期选择器不能选过去的时间
  },

  onLoad() {
    // 设置日期选择器的起始日期为明天 (严格符合后端 @Future 的要求)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const y = tomorrow.getFullYear();
    const m = (tomorrow.getMonth() + 1).toString().padStart(2, '0');
    const d = tomorrow.getDate().toString().padStart(2, '0');
    
    this.setData({ minDate: `${y}-${m}-${d}` });
  },

  handleBack() {
    wx.navigateBack({ delta: 1 });
  },

  // 统一处理所有普通输入框 (客户、项目、型号、克重、规格、数量)
  handleInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`formData.${field}`]: e.detail.value
    });
  },

  // 处理交货日期选择
  handleDateChange(e) {
    this.setData({ 'formData.deliveryDate': e.detail.value });
  },

  async handleSubmit() {
    const { formData } = this.data;

    // 1. 表单规则校验 (对齐后端 Validator 注解)
    if (!formData.modelCode.trim()) {
      return wx.showToast({ title: '面料型号不能为空', icon: 'none' });
    }

    const weightVal = parseFloat(formData.weight);
    if (!formData.weight || isNaN(weightVal) || weightVal <= 0) {
      return wx.showToast({ title: '克重必须大于0', icon: 'none' });
    }

    const specVal = parseFloat(formData.spec);
    if (!formData.spec || isNaN(specVal) || specVal <= 0) {
      return wx.showToast({ title: '规格必须为正数', icon: 'none' });
    }

    const quantityVal = parseInt(formData.quantity, 10);
    if (!formData.quantity || isNaN(quantityVal) || quantityVal < 1) {
      return wx.showToast({ title: '订单数量至少为1', icon: 'none' });
    }

    if (!formData.deliveryDate) {
      return wx.showToast({ title: '预计交付日期不能为空', icon: 'none' });
    }

    wx.showLoading({ title: '提交中...', mask: true });

    try {
      // 2. 构建符合 ProductionOrderAddRequest 结构的数据
      // 注意：后端的 deliveryDate 是 LocalDateTime，通常需要拼接时分秒，否则可能报反序列化异常
      const postData = {
        customerName: formData.customerName.trim() || null,
        projectName: formData.projectName.trim() || null,
        modelCode: formData.modelCode.trim(),
        weight: weightVal,       // Float
        spec: specVal,           // Float
        quantity: quantityVal,   // Integer
        deliveryDate: `${formData.deliveryDate} 00:00:00` // 补全为 LocalDateTime 格式
      };

      console.log('发送给后端的数据:', postData);

      // 发送请求 (请确保 request.js 封装支持返回 Promise)
      // await request.post('/order/production/add', postData);
      
      // 这里模拟网络请求延迟
      await new Promise(resolve => setTimeout(resolve, 800));

      wx.hideLoading();
      wx.showToast({ title: '创建成功', icon: 'success' });
      
      // 3. 延迟返回，刷新上一页数据
      setTimeout(() => {
        const pages = getCurrentPages();
        if (pages.length > 1) {
          const prePage = pages[pages.length - 2];
          // 如果列表页有刷新方法，调用它
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