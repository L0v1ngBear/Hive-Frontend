const { request } = require('../../utils/request.js');
const printerUtil = require('../../utils/printer.js');

Page({
  data: {
    // 核心看板数据
    lowStockList: [], // 异常预警列表
    recordList: [],   // 最近操作记录

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
   * 刷新看板数据：并发请求预警、记录和趋势数据
   */
  async refreshDashboard() {
    try {
      // 同时发起 3 个请求，不互相阻塞
      const [warnRes, recordRes, trendRes] = await Promise.all([
        request({ url: '/inventory/warning/list', method: 'GET' }).catch(() => ({})),
        request({ url: '/inventory/record/recent', method: 'GET' }).catch(() => ({})),
        request({ url: '/inventory/trend', method: 'GET' }).catch(() => ({}))
      ]);

      // 1. 赋值预警数据
      if (warnRes.code === 200 || warnRes.code === 0) {
        this.setData({ lowStockList: warnRes.data || [] });
      }

      // 2. 赋值操作记录 (重点修改了这里的映射逻辑)
      if (recordRes.code === 200 || recordRes.code === 0) {
        // 适配后端的 InventoryRecordVO 字段
        const rawList = recordRes.data || [];
        const formattedList = rawList.map(item => {

          let fTime = item.createTime || '';
          if (fTime.includes('T')) {
            fTime = fTime.substring(5, 16).replace('T', ' ');
          }

          return {
            id: item.id,
            time: fTime,
            type: item.operateType === 0 ? 'in' : 'out',
            model: item.modelCode,        // 映射 modelCode
            meters: item.operateMeters    // 映射 operateMeters
          };
        });

        this.setData({ recordList: formattedList });
      }

      // 3. 拿到趋势数据后，交给 Canvas 画图
      this.drawTrendChart((trendRes.code === 200 || trendRes.code === 0) ? trendRes.data : null);

    } catch (err) {
      console.error("加载看板数据失败", err);
    }
  },

  /**
   * 带有坐标轴的趋势图绘制 (Canvas)
   */
  drawTrendChart(trendData) {
    // 1. 如果后端接口没数据，先用模拟数据让图表显示出来
    if (!trendData || !trendData.inMeters) {
      trendData = {
        dates: ["10-21", "10-22", "10-23", "10-24", "10-25", "10-26", "今天"],
        inMeters: [120, 300, 150, 50, 400, 210, 350],
        outMeters: [50, 100, 80, 200, 10, 30, 90]
      };
    }

    // 2. 加一个短暂延迟，确保 WXML 里的 canvas 节点已经渲染完毕
    setTimeout(() => {
      const ctx = wx.createCanvasContext('trendChart', this);

      const screenWidth = wx.getSystemInfoSync().windowWidth;
      const canvasWidth = screenWidth - 40;
      const canvasHeight = 120; // 对应 WXSS 中的 240rpx 左右

      const paddingLeft = 35;
      const paddingBottom = 20;
      const paddingTop = 10;

      const chartWidth = canvasWidth - paddingLeft - 10;
      const chartHeight = canvasHeight - paddingBottom - paddingTop;

      const { dates, inMeters, outMeters } = trendData;
      const daysCount = dates.length;

      let maxVal = Math.max(...inMeters, ...outMeters, 100);
      maxVal = Math.ceil(maxVal / 100) * 100;

      // ---- 绘制背景网格和 Y 轴数字 ----
      ctx.setFontSize(10);
      ctx.setFillStyle('#999999');
      ctx.setTextAlign('right');
      const ySteps = 4;
      for (let i = 0; i <= ySteps; i++) {
        const val = (maxVal / ySteps) * i;
        const y = paddingTop + chartHeight - (chartHeight / ySteps) * i;
        ctx.fillText(val.toString(), paddingLeft - 5, y + 4);

        ctx.beginPath();
        ctx.setStrokeStyle('#eeeeee');
        ctx.setLineWidth(1);
        ctx.moveTo(paddingLeft, y);
        ctx.lineTo(canvasWidth, y);
        ctx.stroke();
      }

      // ---- 绘制 X 轴日期 ----
      ctx.setTextAlign('center');
      dates.forEach((date, i) => {
        const x = paddingLeft + (chartWidth / (daysCount - 1)) * i;
        ctx.fillText(date, x, canvasHeight - 2);
      });

      // ---- 封装画折线的方法 ----
      const drawLine = (dataArray, color) => {
        ctx.beginPath();
        ctx.setStrokeStyle(color);
        ctx.setLineWidth(2);
        ctx.setLineJoin('round');
        dataArray.forEach((val, i) => {
          const x = paddingLeft + (chartWidth / (daysCount - 1)) * i;
          const y = paddingTop + chartHeight - (val / maxVal) * chartHeight;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();

        dataArray.forEach((val, i) => {
          const x = paddingLeft + (chartWidth / (daysCount - 1)) * i;
          const y = paddingTop + chartHeight - (val / maxVal) * chartHeight;
          ctx.beginPath();
          ctx.setFillStyle('#ffffff');
          ctx.arc(x, y, 3, 0, 2 * Math.PI);
          ctx.fill();
          ctx.setStrokeStyle(color);
          ctx.setLineWidth(1.5);
          ctx.stroke();
        });
      };

      drawLine(inMeters, '#1890FF');
      drawLine(outMeters, '#52C41A');

      ctx.draw();
    }, 150);
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