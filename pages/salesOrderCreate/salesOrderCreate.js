const { request } = require('../../utils/request.js');

Page({
  data: {
    // 表单数据绑定对象
    formData: {
      customerName: '',
      projectName: '',
      goodsDesc: '',
      totalQuantity: '',
      totalAmount: '',
      deliveryDate: '',
      remark: ''
    },
    // 日期选择器的最小可选日期（今天）
    minDate: ''
  },

  onLoad() {
    // 设置最小可选日期为今天
    const today = new Date();
    const y = today.getFullYear();
    const m = (today.getMonth() + 1).toString().padStart(2, '0');
    const d = today.getDate().toString().padStart(2, '0');
    this.setData({ minDate: `${y}-${m}-${d}` });
  },

  // 返回上一页
  handleBack() {
    wx.navigateBack({ delta: 1 });
  },

  // 统一处理输入框输入
  handleInput(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({
      [`formData.${field}`]: value
    });
  },

  // 处理交期选择
  handleDateChange(e) {
    this.setData({
      'formData.deliveryDate': e.detail.value
    });
  },

  // 提交订单
  async handleSubmit() {
    const { formData } = this.data;

    // 1. 必填项简单校验
    if (!formData.customerName.trim()) return wx.showToast({ title: '请输入客户名称', icon: 'none' });
    if (!formData.goodsDesc.trim()) return wx.showToast({ title: '请输入商品描述', icon: 'none' });
    if (!formData.totalQuantity || formData.totalQuantity <= 0) return wx.showToast({ title: '请输入正确的总米数', icon: 'none' });
    if (!formData.totalAmount || formData.totalAmount < 0) return wx.showToast({ title: '请输入正确的总金额', icon: 'none' });
    if (!formData.deliveryDate) return wx.showToast({ title: '请选择交货日期', icon: 'none' });

    wx.showLoading({ title: '提交中...', mask: true });

    try {
      // TODO: 替换为实际的新建订单接口
      // const res = await request({
      //   url: '/order/sales/create',
      //   method: 'POST',
      //   data: {
      //     ...formData,
      //     totalQuantity: Number(formData.totalQuantity),
      //     totalAmount: Number(formData.totalAmount)
      //   }
      // });
      
      // 模拟网络请求延迟
      await new Promise(resolve => setTimeout(resolve, 800));

      wx.hideLoading();
      wx.showToast({ title: '创建成功', icon: 'success' });
      
      // 延迟返回上一页并刷新列表
      setTimeout(() => {
        // 获取上一页实例，调用其刷新方法
        const pages = getCurrentPages();
        if (pages.length > 1) {
          const prePage = pages[pages.length - 2];
          if (prePage && prePage.mockGetSalesOrderData) {
            prePage.mockGetSalesOrderData(); // 如果真实接口，这里应调用 prePage.refreshList() 等方法
          }
        }
        wx.navigateBack({ delta: 1 });
      }, 1500);

    } catch (err) {
      wx.hideLoading();
      console.error(err);
    }
  }
});                                                                                                                                                                                                                                                                                                 