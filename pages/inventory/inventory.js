const { request } = require('../../utils/request.js');
const printerUtil = require('../../utils/printer.js'); 

Page({
  data: {
    // 核心看板数据
    lowStockList: [], // 异常预警列表
    recordList: [],
    
    // UI 控制
    showClothModal: false,
    showAddClothModal: false,
    showPrintModal: false,
    showModelList: false,

    // 业务数据
    barcode: '',
    clothInfo: {},
    inputMeters: 0,
    currentOperType: 'in',
    clothForm: { modelCode: '', meters: '', spec: '', inType: "hand" },
    modelOptions: [],
    printData: {},
  },

  onLoad() {
    this.refreshDashboard();
  },

  /**
   * 刷新看板数据：预警 + 记录 + 统计
   */
  async refreshDashboard() {
    try {
      const res = await request({ url: '/inventory/overView', method: 'GET' });
      if (res.code === 200 || res.code === 0) {
        this.setData({
          // 假设后端返回 lowStocks 字段，若没有则模拟两条数据演示
          lowStockList: res.data.lowStocks || [
            { modelCode: '黑色莱卡-S1', meters: 5.5 },
            { modelCode: '白色平纹-A2', meters: 2.1 }
          ],
          recordList: res.data.recentRecords || []
        });
        // 渲染图表
        this.drawTrendChart();
      }
    } catch (err) {
      console.error("加载概览失败", err);
    }
  },

  /**
   * 绘制简易趋势图 (Canvas)
   */
  drawTrendChart() {
    const ctx = wx.createCanvasContext('trendChart');
    const width = 340, height = 150;

    // 绘制入库线 (蓝色)
    ctx.beginPath();
    ctx.setStrokeStyle('#1890FF');
    ctx.setLineWidth(2);
    ctx.moveTo(10, 120); ctx.lineTo(60, 40); ctx.lineTo(120, 90);
    ctx.lineTo(180, 30); ctx.lineTo(240, 70); ctx.lineTo(300, 50);
    ctx.stroke();

    // 绘制出库线 (绿色)
    ctx.beginPath();
    ctx.setStrokeStyle('#52C41A');
    ctx.moveTo(10, 140); ctx.lineTo(80, 100); ctx.lineTo(160, 110);
    ctx.lineTo(240, 40); ctx.lineTo(320, 80);
    ctx.stroke();

    ctx.draw();
  },

  // --- 原有扫码业务逻辑 ---
  handleScanCode() {
    wx.scanCode({
      scanType: ['barCode'],
      success: (res) => {
        this.setData({ barcode: res.result });
        this.getClothInfo(res.result);
      }
    });
  },

  async getClothInfo(barcode) {
    wx.showLoading({ title: '查询中...' });
    try {
      const res = await request({ url: `/inventory/barCode/search?barCode=${barcode}`, method: 'GET' });
      if ((res.code === 200 || res.code === 0) && res.data) {
        const d = res.data;
        this.setData({ 
          clothInfo: d, 
          showClothModal: true,
          inputMeters: d.remainingMeters || d.meters || 0,
          currentOperType: d.status === 1 ? 'out' : 'in' 
        });
      }
    } finally { wx.hideLoading(); }
  },

  // --- 入库/出库提交 ---
  async executeIn(payload) {
    if (!payload.modelCode || !payload.meters) return wx.showToast({ title: '信息不全', icon: 'none' });
    wx.showLoading({ title: '提交中...' });
    try {
      const res = await request({
        url: '/inventory/cloth/in',
        method: 'POST',
        data: { ...payload, meters: Number(payload.meters), spec: Number(payload.spec) }
      });
      if (res.code === 200 || res.code === 0) {
        wx.showToast({ title: '入库成功' });
        this.setData({ showAddClothModal: false, showClothModal: false });
        this.preparePrintData(res.data.barcode, res.data.modelCode, res.data.meters, res.data.spec);
        this.refreshDashboard(); // 刷新数据
      }
    } finally { wx.hideLoading(); }
  },

  async doOut() {
    const { barcode, inputMeters } = this.data;
    wx.showLoading({ title: '正在出库...' });
    try {
      const res = await request({
        url: '/inventory/cloth/out',
        method: 'POST',
        data: { barcode, meters: Number(inputMeters) }
      });
      if (res.code === 200 || res.code === 0) {
        wx.showToast({ title: '出库成功' });
        this.hideClothModal();
        this.refreshDashboard();
      }
    } finally { wx.hideLoading(); }
  },

  // --- 辅助 UI 函数 ---
  onModelSearch(e) {
    let keyword = (e.detail.value || '').trim();
    this.setData({ 'clothForm.modelCode': keyword, showModelList: !!keyword });
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.fetchModelOptions(keyword), 300);
  },

  async fetchModelOptions(keyword) {
    const res = await request({ url: `/inventory/model/search?keyword=${keyword}`, method: 'GET' });
    if (res.data) this.setData({ modelOptions: res.data, showModelList: true });
  },

  chooseModel(e) {
    const { model, spec } = e.currentTarget.dataset;
    this.setData({ 'clothForm.modelCode': model, 'clothForm.spec': spec, showModelList: false });
  },

  preparePrintData(barcode, modelCode, meters, spec) {
    this.setData({ printData: { barcode, modelCode, meters, spec }, showPrintModal: true });
  },

  hideAddClothModal() { this.setData({ showAddClothModal: false }); },
  hideClothModal() { this.setData({ showClothModal: false }); },
  hidePrintModal() { this.setData({ showPrintModal: false }); },
  handleBack() { wx.navigateBack(); },
  onFormInput(e) { this.setData({ [`clothForm.${e.currentTarget.dataset.field}`]: e.detail.value }); },
  onMetersInput(e) { this.setData({ inputMeters: e.detail.value }); },
  handleAddCloth() { this.setData({ showAddClothModal: true, clothForm: { modelCode: '', meters: '', spec: '', inType: 'hand' } }); },
  choosePrintType(e) {
    if (e.currentTarget.dataset.type === 'bluetooth') {
      printerUtil.printViaBluetooth(this.data.printData);
      this.hidePrintModal();
    }
  }
});