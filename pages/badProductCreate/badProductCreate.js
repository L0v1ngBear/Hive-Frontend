const requestUtil = require('../../utils/request.js');

const TYPE_OPTIONS = [
  { key: 'quality', label: '质量问题' },
  { key: 'damage', label: '运输破损' },
  { key: 'wrong', label: '生产错误' },
  { key: 'other', label: '其他原因' }
];

function buildEmptyForm() {
  return {
    orderId: '',
    type: TYPE_OPTIONS[0].key,
    quantity: '',
    lossAmount: '',
    description: ''
  };
}

Page({
  data: {
    submitting: false,
    typeIndex: 0,
    typeOptions: TYPE_OPTIONS,
    typeLabels: TYPE_OPTIONS.map((item) => item.label),
    formData: buildEmptyForm()
  },

  handleBack() {
    wx.navigateBack({ delta: 1 });
  },

  handleInput(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ [`formData.${key}`]: e.detail.value });
  },

  handleTypeChange(e) {
    const typeIndex = Number(e.detail.value);
    const selectedType = TYPE_OPTIONS[typeIndex] || TYPE_OPTIONS[0];
    this.setData({
      typeIndex,
      'formData.type': selectedType.key
    });
  },

  async submitForm() {
    const { formData, submitting } = this.data;
    if (submitting) {
      return;
    }

    const quantity = Number(formData.quantity);
    const lossAmount = Number(formData.lossAmount);
    if (!quantity || quantity <= 0) {
      wx.showToast({ title: '请填写有效的次品数量', icon: 'none' });
      return;
    }
    if (!lossAmount || lossAmount <= 0) {
      wx.showToast({ title: '请填写有效的损失金额', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    try {
      await requestUtil.post('/bad-product/save', {
        orderId: formData.orderId || undefined,
        type: formData.type,
        quantity,
        lossAmount,
        description: formData.description || undefined
      });
      wx.showToast({ title: '登记成功', icon: 'success' });
      setTimeout(() => wx.navigateBack({ delta: 1 }), 500);
    } catch (error) {
      console.error('保存次品失败', error);
    } finally {
      this.setData({ submitting: false });
    }
  }
});
