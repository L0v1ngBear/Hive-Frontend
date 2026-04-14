const requestUtil = require('../../utils/request.js');

Page({
  data: {
    currentStatus: 'all',
    currentType: 'all',
    dateRange: '',
    currentDate: '',
    statusList: [
      { key: 'all', label: '全部' },
      { key: 'pending', label: '待处理' },
      { key: 'processed', label: '已处理' }
    ],
    typeList: [
      { key: 'all', label: '全部' },
      { key: 'quality', label: '质量问题' },
      { key: 'damage', label: '运输破损' },
      { key: 'wrong', label: '生产错误' },
      { key: 'other', label: '其他原因' }
    ],
    typeLabelList: [],
    statusMap: { pending: '待处理', processed: '已处理' },
    typeMap: { quality: '质量问题', damage: '运输破损', wrong: '生产错误', other: '其他原因' },
    statusClass: { pending: 'status-pending', processed: 'status-processed' },
    defectiveList: [],
    filteredDefectiveList: [],
    showAddModal: false,
    showProcessModal: false,
    isEdit: false,
    formData: { defectiveId: '', orderId: '', type: 'quality', quantity: '', lossAmount: '', description: '' },
    processData: { method: '', remark: '' },
    currentDefective: null,
    typeIndex: 0,
    loading: false
  },

  onLoad() {
    const now = new Date();
    const currentDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    this.setData({ currentDate, typeLabelList: this.data.typeList.map((item) => item.label) });
    this.loadList();
  },

  handleBack() { wx.navigateBack({ delta: 1 }); },
  stopPropagation() {},

  async loadList() {
    this.setData({ loading: true });
    try {
      const res = await requestUtil.get('/bad-product/list', {
        data: {
          pageNum: 1,
          pageSize: 100,
          status: this.data.currentStatus,
          type: this.data.currentType,
          date: this.data.dateRange || undefined
        },
        showLoading: false
      });
      const list = (res.data?.data || []).map((item) => ({ ...item, creator: item.creator || '未知用户' }));
      this.setData({ defectiveList: list, filteredDefectiveList: list });
    } catch (error) {
      console.error('加载次品列表失败', error);
    } finally {
      this.setData({ loading: false });
    }
  },

  openAddModal() {
    this.setData({
      showAddModal: true,
      isEdit: false,
      formData: { defectiveId: '', orderId: '', type: 'quality', quantity: '', lossAmount: '', description: '' },
      typeIndex: 0
    });
  },

  closeAddModal() { this.setData({ showAddModal: false }); },

  openEditModal(e) {
    const defective = e.currentTarget.dataset.defective;
    const typeIndex = this.data.typeList.findIndex((item) => item.key === defective.type);
    this.setData({
      showAddModal: true,
      isEdit: true,
      currentDefective: defective,
      formData: {
        defectiveId: defective.defectiveId,
        orderId: defective.orderId || '',
        type: defective.type,
        quantity: defective.quantity,
        lossAmount: defective.lossAmount,
        description: defective.description || ''
      },
      typeIndex: typeIndex > 0 ? typeIndex : 0
    });
  },

  openProcessModal(e) {
    this.setData({
      showProcessModal: true,
      currentDefective: e.currentTarget.dataset.defective,
      processData: { method: '', remark: '' }
    });
  },

  closeProcessModal() { this.setData({ showProcessModal: false }); },

  handleInput(e) {
    this.setData({ [`formData.${e.currentTarget.dataset.key}`]: e.detail.value });
  },

  handleProcessInput(e) {
    this.setData({ [`processData.${e.currentTarget.dataset.key}`]: e.detail.value });
  },

  changeType(e) {
    const index = Number(e.detail.value);
    const typeKey = this.data.typeList[index].key;
    this.setData({ typeIndex: index, 'formData.type': typeKey !== 'all' ? typeKey : 'quality' });
  },

  async submitDefective() {
    const { formData } = this.data;
    if (!formData.quantity || !formData.lossAmount) {
      wx.showToast({ title: '数量和损失金额不能为空', icon: 'none' });
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
      wx.showToast({ title: this.data.isEdit ? '修改成功' : '登记成功', icon: 'success' });
      this.setData({ showAddModal: false });
      this.loadList();
    } catch (error) {
      console.error('保存次品失败', error);
    }
  },

  async confirmProcess() {
    const { processData, currentDefective } = this.data;
    if (!processData.method) {
      wx.showToast({ title: '处理方式不能为空', icon: 'none' });
      return;
    }
    try {
      await requestUtil.post('/bad-product/process', {
        defectiveId: currentDefective.defectiveId,
        method: processData.method,
        remark: processData.remark || undefined
      });
      wx.showToast({ title: '标记处理成功', icon: 'success' });
      this.setData({ showProcessModal: false });
      this.loadList();
    } catch (error) {
      console.error('处理次品失败', error);
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

  openDetail(e) {
    const defective = e.currentTarget.dataset.defective;
    let detailContent = `次品编号：${defective.defectiveId}\n`;
    detailContent += `关联订单：${defective.orderId || '无'}\n`;
    detailContent += `次品类型：${this.data.typeMap[defective.type]}\n`;
    detailContent += `登记时间：${String(defective.createTime || '').replace('T', ' ').slice(0, 19)}\n`;
    detailContent += `登记人：${defective.creator}\n`;
    detailContent += `次品数量：${defective.quantity}米\n`;
    detailContent += `损失金额：¥${defective.lossAmount}\n`;
    detailContent += `次品描述：${defective.description || '无'}\n`;
    detailContent += `处理状态：${this.data.statusMap[defective.status]}\n`;
    if (defective.processMethod) detailContent += `处理方式：${defective.processMethod}\n`;
    if (defective.processRemark) detailContent += `处理备注：${defective.processRemark}\n`;
    wx.showModal({ title: '次品详情', content: detailContent, showCancel: false, confirmText: '知道了' });
  }
});