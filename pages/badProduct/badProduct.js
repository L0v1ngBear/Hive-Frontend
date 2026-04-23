const requestUtil = require('../../utils/request.js');

const STATUS_OPTIONS = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待处理' },
  { key: 'processed', label: '已处理' }
];

const TYPE_OPTIONS = [
  { key: 'all', label: '全部' },
  { key: 'quality', label: '质量问题' },
  { key: 'damage', label: '运输破损' },
  { key: 'wrong', label: '生产错误' },
  { key: 'other', label: '其他原因' }
];

const TYPE_MAP = {
  quality: '质量问题',
  damage: '运输破损',
  wrong: '生产错误',
  other: '其他原因'
};

const STATUS_MAP = {
  pending: '待处理',
  processed: '已处理'
};

function buildEmptyForm() {
  return {
    defectiveId: '',
    orderId: '',
    type: 'quality',
    quantity: '',
    lossAmount: '',
    description: ''
  };
}

Page({
  data: {
    loading: false,
    currentStatus: 'all',
    currentType: 'all',
    dateRange: '',
    currentDate: '',
    statusOptions: STATUS_OPTIONS,
    typeOptions: TYPE_OPTIONS,
    typeLabels: TYPE_OPTIONS.slice(1).map((item) => item.label),
    list: [],
    showFormPopup: false,
    showProcessPopup: false,
    isEdit: false,
    typeIndex: 0,
    formData: buildEmptyForm(),
    processData: { method: '', remark: '' },
    currentRecord: null,
    loaded: false
  },

  onLoad() {
    const now = new Date();
    const currentDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    this.setData({ currentDate });
    this.loadList();
  },

  onShow() {
    if (this.data.loaded) {
      this.loadList();
    }
  },

  handleBack() {
    wx.navigateBack({ delta: 1 });
  },

  stopPropagation() {},

  async loadList() {
    this.setData({ loading: true });
    try {
      const res = await requestUtil.get('/bad-product/list', {
        data: {
          pageNum: 1,
          pageSize: 100,
          status: this.data.currentStatus === 'all' ? undefined : this.data.currentStatus,
          type: this.data.currentType === 'all' ? undefined : this.data.currentType,
          date: this.data.dateRange || undefined
        },
        showLoading: false
      });
      const records = (res.data?.data || []).map((item) => ({
        ...item,
        typeLabel: TYPE_MAP[item.type] || '其他原因',
        statusLabel: STATUS_MAP[item.status] || '待处理',
        createTimeText: formatDateTime(item.createTime),
        quantityText: formatNumber(item.quantity),
        lossAmountText: formatNumber(item.lossAmount),
        creatorText: item.creator || '未知用户'
      }));
      this.setData({ list: records, loaded: true });
    } catch (error) {
      console.error('加载次品列表失败', error);
    } finally {
      this.setData({ loading: false });
    }
  },

  handleStatusFilter(e) {
    this.setData({ currentStatus: e.currentTarget.dataset.status }, () => this.loadList());
  },

  handleTypeFilter(e) {
    this.setData({ currentType: e.currentTarget.dataset.type }, () => this.loadList());
  },

  handleDateFilter(e) {
    this.setData({ dateRange: e.detail.value }, () => this.loadList());
  },

  openCreate() {
    wx.navigateTo({ url: '/pages/badProductCreate/badProductCreate' });
  },

  openEdit(e) {
    const record = e.currentTarget.dataset.record;
    const typeIndex = Math.max(
      TYPE_OPTIONS.slice(1).findIndex((item) => item.key === record.type),
      0
    );
    this.setData({
      showFormPopup: true,
      isEdit: true,
      currentRecord: record,
      typeIndex,
      formData: {
        defectiveId: record.defectiveId,
        orderId: record.orderId || '',
        type: record.type,
        quantity: String(record.quantity ?? ''),
        lossAmount: String(record.lossAmount ?? ''),
        description: record.description || ''
      }
    });
  },

  closeFormPopup() {
    this.setData({
      showFormPopup: false,
      currentRecord: null,
      formData: buildEmptyForm()
    });
  },

  openProcess(e) {
    this.setData({
      showProcessPopup: true,
      currentRecord: e.currentTarget.dataset.record,
      processData: { method: '', remark: '' }
    });
  },

  closeProcessPopup() {
    this.setData({
      showProcessPopup: false,
      currentRecord: null,
      processData: { method: '', remark: '' }
    });
  },

  handleFormInput(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ [`formData.${key}`]: e.detail.value });
  },

  handleProcessInput(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ [`processData.${key}`]: e.detail.value });
  },

  handleTypeChange(e) {
    const typeIndex = Number(e.detail.value);
    const type = TYPE_OPTIONS[typeIndex + 1]?.key || 'quality';
    this.setData({
      typeIndex,
      'formData.type': type
    });
  },

  async submitForm() {
    const { formData, isEdit } = this.data;
    if (!formData.quantity || Number(formData.quantity) <= 0) {
      wx.showToast({ title: '请填写有效的次品数量', icon: 'none' });
      return;
    }
    if (!formData.lossAmount || Number(formData.lossAmount) <= 0) {
      wx.showToast({ title: '请填写有效的损失金额', icon: 'none' });
      return;
    }

    try {
      await requestUtil.post('/bad-product/save', {
        defectiveId: formData.defectiveId || undefined,
        orderId: formData.orderId || undefined,
        type: formData.type,
        quantity: Number(formData.quantity),
        lossAmount: Number(formData.lossAmount),
        description: formData.description || undefined
      });
      wx.showToast({ title: isEdit ? '修改成功' : '登记成功', icon: 'success' });
      this.closeFormPopup();
      this.loadList();
    } catch (error) {
      console.error('保存次品失败', error);
    }
  },

  async submitProcess() {
    const { processData, currentRecord } = this.data;
    if (!processData.method) {
      wx.showToast({ title: '请填写处理方式', icon: 'none' });
      return;
    }

    try {
      await requestUtil.post('/bad-product/process', {
        defectiveId: currentRecord.defectiveId,
        method: processData.method,
        remark: processData.remark || undefined
      });
      wx.showToast({ title: '处理成功', icon: 'success' });
      this.closeProcessPopup();
      this.loadList();
    } catch (error) {
      console.error('处理次品失败', error);
    }
  },

  showDetail(e) {
    const record = e.currentTarget.dataset.record;
    const lines = [
      `次品编号：${record.defectiveId}`,
      `关联订单：${record.orderId || '未关联'}`,
      `次品类型：${record.typeLabel}`,
      `登记时间：${record.createTimeText}`,
      `登记人：${record.creatorText}`,
      `次品数量：${record.quantityText}`,
      `损失金额：¥${record.lossAmountText}`,
      `处理状态：${record.statusLabel}`,
      `问题描述：${record.description || '无'}`
    ];
    if (record.processMethod) {
      lines.push(`处理方式：${record.processMethod}`);
    }
    if (record.processRemark) {
      lines.push(`处理备注：${record.processRemark}`);
    }
    wx.showModal({
      title: '次品详情',
      content: lines.join('\n'),
      showCancel: false,
      confirmText: '我知道了'
    });
  }
});

function formatDateTime(value) {
  if (!value) {
    return '--';
  }
  return String(value).replace('T', ' ').slice(0, 19);
}

function formatNumber(value) {
  const number = Number(value || 0);
  if (Number.isNaN(number)) {
    return '0.00';
  }
  return number.toFixed(2);
}
