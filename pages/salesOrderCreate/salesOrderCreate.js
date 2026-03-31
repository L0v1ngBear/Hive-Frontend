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
      createProductionOrder: 0 // 新增：默认 0 (不创建)
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

  // 新增：处理开关切换逻辑 (布尔值转为后端的 0 或 1)
  handleSwitchChange(e) {
    this.setData({
      'formData.createProductionOrder': e.detail.value ? 1 : 0
    });
  },

  // 提交订单
  async handleSubmit() {
    const { formData } = this.data;

    // 1. 必填项简单校验 (增加了 projectName 的校验，适配后端 @NotBlank)
    if (!formData.customerName.trim()) return wx.showToast({ title: '请输入客户名称', icon: 'none' });
    if (!formData.projectName.trim()) return wx.showToast({ title: '请输入项目名称', icon: 'none' });
    if (!formData.goodsDesc.trim()) return wx.showToast({ title: '请输入商品描述', icon: 'none' });
    if (!formData.totalQuantity || formData.totalQuantity <= 0) return wx.showToast({ title: '请输入正确的总米数', icon: 'none' });
    if (!formData.totalAmount || formData.totalAmount < 0) return wx.showToast({ title: '请输入正确的总金额', icon: 'none' });
    if (!formData.deliveryDate) return wx.showToast({ title: '请选择交货日期', icon: 'none' });

    wx.showLoading({ title: '提交中...', mask: true });

    try {
      // 2. 组装发给后端的数据 (严格匹配后端 DTO)
      const postData = {
        customerName: formData.customerName,
        projectName: formData.projectName,
        needGood: formData.goodsDesc,                  // 字段映射：前端 goodsDesc -> 后端 needGood
        totalQuantity: parseInt(formData.totalQuantity, 10), // 类型转换：转为 Integer
        deliveryDate: formData.deliveryDate,
        createProductionOrder: formData.createProductionOrder // 0 或 1
      };
      
      // 注意：这里没有把 formData.totalAmount 放入 postData 中，
      // 因为你提供的后端 DTO 中没有这个字段。这样做可以防止后端报未知属性错误。

      // 3. 实际接口请求代码 (解除注释即可使用)
      /*
      const res = await request({
        url: '/order/sales/create',
        method: 'POST',
        data: postData
      });
      */
      
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
      wx.showToast({ title: '提交失败，请重试', icon: 'none' });
    }
  }
});