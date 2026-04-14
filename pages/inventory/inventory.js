const { request } = require('../../utils/request.js');
const printerUtil = require('../../utils/printer.js');

Page({
  data: {
    lowStockList: [],
    recordList: [],
    showClothModal: false,
    showAddClothModal: false,
    showPrintModal: false,
    showModelList: false,
    showOrderSelectModal: false,
    showOrderList: false,
    barcode: '',
    clothInfo: {},
    inputMeters: 0,
    currentOperType: 'in',
    clothForm: { modelCode: '', meters: '', spec: '', inType: 'hand' },
    modelOptions: [],
    printData: {},
    labelTemplates: [],
    selectedTemplateIndex: 0,
    selectedTemplateId: '',
    orderSearchKeyword: '',
    orderOptions: [],
    tempOrderNo: '',
    tempCustomerName: '',
    activeOrderNo: '',
    activeCustomerName: '',
    activeOrderTotalMeters: 0
  },

  onLoad() {
    this.refreshDashboard();
  },

  async refreshDashboard() {
    try {
      const [warnRes, recordRes, trendRes] = await Promise.all([
        request({ url: '/inventory/warning/list', method: 'GET', showLoading: false }).catch(() => ({})),
        request({ url: '/inventory/record/recent', method: 'GET', showLoading: false }).catch(() => ({})),
        request({ url: '/inventory/trend', method: 'GET', showLoading: false }).catch(() => ({}))
      ]);

      if (warnRes.code === 200 || warnRes.code === 0) {
        this.setData({ lowStockList: warnRes.data || [] });
      }

      if (recordRes.code === 200 || recordRes.code === 0) {
        const recordList = (recordRes.data || []).map((item) => {
          let time = item.createTime || '';
          if (time.includes('T')) {
            time = time.substring(5, 16).replace('T', ' ');
          }
          return {
            id: item.id,
            time,
            type: item.operateType === 0 ? 'in' : 'out',
            model: item.modelCode,
            meters: item.operateMeters
          };
        });
        this.setData({ recordList });
      }

      this.drawTrendChart((trendRes.code === 200 || trendRes.code === 0) ? trendRes.data : null);
    } catch (err) {
      console.error('加载看板数据失败', err);
    }
  },

  drawTrendChart(trendData) {
    if (!trendData || !trendData.inMeters) {
      trendData = {
        dates: ['10-21', '10-22', '10-23', '10-24', '10-25', '10-26', '今天'],
        inMeters: [120, 300, 150, 50, 400, 210, 350],
        outMeters: [50, 100, 80, 200, 10, 30, 90]
      };
    }

    setTimeout(() => {
      const ctx = wx.createCanvasContext('trendChart', this);
      const screenWidth = wx.getSystemInfoSync().windowWidth;
      const canvasWidth = screenWidth - 40;
      const canvasHeight = 120;
      const paddingLeft = 35;
      const paddingBottom = 20;
      const paddingTop = 10;
      const chartWidth = canvasWidth - paddingLeft - 10;
      const chartHeight = canvasHeight - paddingBottom - paddingTop;
      const { dates, inMeters, outMeters } = trendData;
      const daysCount = dates.length;
      let maxVal = Math.max(...inMeters, ...outMeters, 100);
      maxVal = Math.ceil(maxVal / 100) * 100;

      ctx.setFontSize(10);
      ctx.setFillStyle('#999999');
      ctx.setTextAlign('right');
      for (let i = 0; i <= 4; i++) {
        const val = (maxVal / 4) * i;
        const y = paddingTop + chartHeight - (chartHeight / 4) * i;
        ctx.fillText(val.toString(), paddingLeft - 5, y + 4);
        ctx.beginPath();
        ctx.setStrokeStyle('#eeeeee');
        ctx.setLineWidth(1);
        ctx.moveTo(paddingLeft, y);
        ctx.lineTo(canvasWidth, y);
        ctx.stroke();
      }

      ctx.setTextAlign('center');
      dates.forEach((date, i) => {
        const x = paddingLeft + (chartWidth / (daysCount - 1)) * i;
        ctx.fillText(date, x, canvasHeight - 2);
      });

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

  handlePrepareScanOut() {
    this.setData({
      showOrderSelectModal: true,
      orderSearchKeyword: this.data.activeOrderNo ? `${this.data.activeCustomerName} (${this.data.activeOrderNo})` : '',
      tempOrderNo: this.data.activeOrderNo,
      tempCustomerName: this.data.activeCustomerName,
      showOrderList: false,
      orderOptions: []
    });
  },

  onOrderSearch(e) {
    const keyword = (e.detail.value || '').trim();
    this.setData({
      orderSearchKeyword: keyword,
      tempOrderNo: '',
      tempCustomerName: ''
    });

    if (this.orderSearchTimer) clearTimeout(this.orderSearchTimer);
    if (!keyword) {
      this.setData({ orderOptions: [], showOrderList: false });
      return;
    }

    this.orderSearchTimer = setTimeout(() => this.fetchOrderOptions(keyword), 500);
  },

  async fetchOrderOptions(keyword) {
    try {
      const res = await request({ url: `/inventory/order/search?keyword=${encodeURIComponent(keyword)}`, method: 'GET' });
      if (res.code === 200 || res.code === 0) {
        const orderOptions = res.data || [];
        this.setData({ orderOptions, showOrderList: orderOptions.length > 0 });
      }
    } catch (err) {
      console.error('搜索订单失败', err);
    }
  },

  chooseOrder(e) {
    const { order, customer } = e.currentTarget.dataset;
    this.setData({
      orderSearchKeyword: `${customer} (${order})`,
      tempOrderNo: order,
      tempCustomerName: customer,
      showOrderList: false
    });
  },

  hideOrderSelectModal() {
    this.setData({ showOrderSelectModal: false });
  },

  confirmOrderAndScan() {
    if (!this.data.tempOrderNo) {
      wx.showToast({ title: '请从搜索列表中选择有效单据', icon: 'none' });
      return;
    }

    if (this.data.tempOrderNo !== this.data.activeOrderNo) {
      this.setData({ activeOrderTotalMeters: 0 });
    }

    this.setData({
      activeOrderNo: this.data.tempOrderNo,
      activeCustomerName: this.data.tempCustomerName,
      showOrderSelectModal: false
    });
    this.handleScanCode();
  },

  async handleFinishOrder() {
    const orderNo = this.data.activeOrderNo;
    const customer = this.data.activeCustomerName;
    if (!orderNo) return;

    wx.showModal({
      title: '结单确认',
      content: `客户 [${customer}] 累计出库 ${this.data.activeOrderTotalMeters.toFixed(2)}m，确认已装车完毕并推送打印吗？`,
      success: async (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '正在结单...' });
        try {
          const result = await request({
            url: `/inventory/outbound/submit-print?orderNo=${encodeURIComponent(orderNo)}`,
            method: 'POST',
            showLoading: false
          });

          if (result.code === 200 || result.code === 0) {
            wx.showToast({ title: '已推送至打印台', icon: 'success' });
            this.setData({
              activeOrderNo: '',
              activeCustomerName: '',
              tempOrderNo: '',
              orderSearchKeyword: '',
              activeOrderTotalMeters: 0
            });
            this.refreshDashboard();
          }
        } catch (err) {
          wx.showToast({ title: '网络异常', icon: 'none' });
        } finally {
          wx.hideLoading();
        }
      }
    });
  },

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
      const res = await request({ url: `/inventory/barCode/search?barCode=${encodeURIComponent(barcode)}`, method: 'GET', showLoading: false });
      if ((res.code === 200 || res.code === 0) && res.data) {
        const clothInfo = res.data;
        this.setData({
          clothInfo,
          showClothModal: true,
          inputMeters: clothInfo.remainingMeters || clothInfo.meters || 0,
          currentOperType: clothInfo.status === 1 ? 'out' : 'in'
        });
      } else {
        wx.showToast({ title: '未查询到布匹信息', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '查询失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  async doOut() {
    const { barcode, inputMeters, activeOrderNo, activeCustomerName, activeOrderTotalMeters } = this.data;
    if (!inputMeters || inputMeters <= 0) return wx.showToast({ title: '请输入出库米数', icon: 'none' });
    if (!activeOrderNo) return wx.showToast({ title: '丢失目标订单，请重新选择', icon: 'none' });

    wx.showLoading({ title: '正在出库...' });
    try {
      const res = await request({
        url: '/inventory/cloth/out',
        method: 'POST',
        showLoading: false,
        data: {
          barcode,
          meters: Number(inputMeters),
          orderNo: activeOrderNo,
          customerName: activeCustomerName
        }
      });

      if (res.code === 200 || res.code === 0) {
        wx.showToast({ title: '出库成功' });
        this.setData({ activeOrderTotalMeters: activeOrderTotalMeters + Number(inputMeters) });
        this.hideClothModal();
        this.refreshDashboard();

        const outClothInfo = res.data || {};
        if (outClothInfo.meters && outClothInfo.meters > 0) {
          this.preparePrintData(outClothInfo.barcode, outClothInfo.modelCode, outClothInfo.meters, outClothInfo.spec);
        }
      }
    } catch (err) {
      wx.showToast({ title: '请求失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  doAddCloth() {
    this.executeIn({ ...this.data.clothForm, inType: 'hand' });
  },

  doIn() {
    const { clothInfo, barcode, inputMeters } = this.data;
    this.executeIn({
      barcode,
      modelCode: clothInfo.modelCode || clothInfo.model,
      meters: inputMeters,
      spec: clothInfo.spec,
      inType: 'SCAN'
    });
  },

  async executeIn(payload) {
    if (!payload.modelCode) return wx.showToast({ title: '请输入型号', icon: 'none' });
    if (!payload.meters || payload.meters <= 0) return wx.showToast({ title: '请输入有效米数', icon: 'none' });

    wx.showLoading({ title: '提交中...' });
    try {
      const res = await request({
        url: '/inventory/cloth/in',
        method: 'POST',
        showLoading: false,
        data: { ...payload, meters: Number(payload.meters), spec: Number(payload.spec) }
      });
      if (res.code === 200 || res.code === 0) {
        wx.showToast({ title: '入库成功' });
        this.setData({ showAddClothModal: false, showClothModal: false });
        const resData = res.data || payload;
        this.preparePrintData(resData.barcode, resData.modelCode, resData.meters, resData.spec);
        this.refreshDashboard();
      }
    } catch (err) {
      wx.showToast({ title: '请求失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onModelSearch(e) {
    const keyword = (e.detail.value || '').trim();
    this.setData({ 'clothForm.modelCode': keyword });
    if (this.modelSearchTimer) clearTimeout(this.modelSearchTimer);

    if (!keyword) {
      this.setData({ modelOptions: [], showModelList: false });
      return;
    }
    this.modelSearchTimer = setTimeout(() => this.fetchModelOptions(keyword), 500);
  },

  async fetchModelOptions(keyword) {
    if (!this.searchCache) this.searchCache = {};
    if (this.searchCache[keyword]) {
      this.setData({ modelOptions: this.searchCache[keyword], showModelList: this.searchCache[keyword].length > 0 });
      return;
    }

    this.searchId = (this.searchId || 0) + 1;
    const currentSearchId = this.searchId;

    try {
      const res = await request({ url: `/inventory/model/search?keyword=${encodeURIComponent(keyword)}`, method: 'GET' });
      if (currentSearchId !== this.searchId) return;
      const modelOptions = (res.data || []).map((item) => ({
        modelCode: item.modelCode,
        spec: item.Spec !== undefined ? item.Spec : item.spec
      }));
      this.searchCache[keyword] = modelOptions;
      this.setData({ modelOptions, showModelList: modelOptions.length > 0 });
    } catch (err) {
      console.error('搜索型号失败', err);
      if (currentSearchId === this.searchId) {
        this.setData({ modelOptions: [], showModelList: false });
      }
    }
  },

  chooseModel(e) {
    const { model, spec } = e.currentTarget.dataset;
    this.setData({ 'clothForm.modelCode': model, 'clothForm.spec': spec, showModelList: false });
  },

  async preparePrintData(barcode, modelCode, meters, spec) {
    this.setData({ printData: { barcode, modelCode, meters, spec }, showPrintModal: true });
    await this.fetchLabelTemplates();
  },

  async fetchLabelTemplates() {
    try {
      const res = await request({ url: '/label-template/list?printType=label', method: 'GET', showLoading: false });
      const labelTemplates = res.data || [];
      const defaultIndex = Math.max(0, labelTemplates.findIndex((item) => item.isDefault === 1));
      this.setData({
        labelTemplates,
        selectedTemplateIndex: defaultIndex,
        selectedTemplateId: labelTemplates[defaultIndex] ? labelTemplates[defaultIndex].id : ''
      });
    } catch (err) {
      console.error('获取标签模板失败', err);
      this.setData({ labelTemplates: [], selectedTemplateIndex: 0, selectedTemplateId: '' });
    }
  },

  chooseLabelTemplate(e) {
    const selectedTemplateIndex = Number(e.detail.value);
    const selectedTemplate = this.data.labelTemplates[selectedTemplateIndex];
    this.setData({
      selectedTemplateIndex,
      selectedTemplateId: selectedTemplate ? selectedTemplate.id : ''
    });
  },


  generateRequestId(barcode) {
    return `${barcode || 'cloth'}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  },

  handleAddCloth() {
    this.setData({
      showAddClothModal: true,
      clothForm: { modelCode: '', meters: '', spec: '', inType: 'hand' },
      modelOptions: [],
      showModelList: false
    });
  },

  handleStockCheck() { wx.showToast({ title: '盘点功能开发中', icon: 'none' }); },
  handleShowAllRecord() { wx.showToast({ title: '跳转完整记录页面', icon: 'none' }); },
  hideAddClothModal() { this.setData({ showAddClothModal: false, showModelList: false }); },
  hideClothModal() { this.setData({ showClothModal: false, currentRequestId: '' }); },
  hidePrintModal() { this.setData({ showPrintModal: false }); },
  handleBack() { wx.navigateBack(); },
  onFormInput(e) { this.setData({ [`clothForm.${e.currentTarget.dataset.field}`]: e.detail.value }); },
  onMetersInput(e) { this.setData({ inputMeters: e.detail.value }); },
  stopPropagation() {},

  async choosePrintType(e) {
    const type = e.currentTarget.dataset.type;
    const { printData, labelTemplates, selectedTemplateIndex } = this.data;

    if (type === 'bluetooth') {
      if (!labelTemplates.length) {
        wx.showToast({ title: '请先在管理端上传标签模板', icon: 'none' });
        return;
      }
      const template = labelTemplates[selectedTemplateIndex] || labelTemplates[0];
      await printerUtil.printLabel(printData, template.content);
      this.hidePrintModal();
    } else if (type === 'triplicate') {
      await printerUtil.printTriplicate(printData);
      this.hidePrintModal();
    } else if (type === 'preview') {
      wx.showToast({ title: '预览功能开发中', icon: 'none' });
    }
  }
});