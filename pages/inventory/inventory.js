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
      
      // 2. 赋值操作记录 (适配后端的 InventoryRecordVO 字段)
      if (recordRes.code === 200 || recordRes.code === 0) {
        const rawList = recordRes.data || [];
        const formattedList = rawList.map(item => {
          // 格式化时间：截取 "2026-03-29 10:15"
          let fTime = item.createTime || '';
          if (fTime.includes('T')) {
            fTime = fTime.substring(5, 16).replace('T', ' ');
          }

          return {
            id: item.id,
            time: fTime,
            // 0 是入库，其他是出库 (请确保后端 0 表示入库)
            type: item.operateType === 0 ? 'in' : 'out',
            model: item.modelCode,        
            meters: item.operateMeters    
          };
        });

        this.setData({ recordList: formattedList });
      }
      
      // 3. 拿到趋势数据后，交给 Canvas 画图
      this.drawTrendChart((trendRes.code === 300) ? trendRes.data : null);

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
      const canvasHeight = 120; // 对应 WXSS 中的 240rpx

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
        
        // 画线上的点
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

      drawLine(inMeters, '#1890FF');  // 入库 蓝
      drawLine(outMeters, '#52C41A'); // 出库 绿

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
      } else {
        wx.showToast({ title: '未查询到布匹信息', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '查询失败', icon: 'none' });
    } finally { wx.hideLoading(); }
  },

  // --- 入库/出库提交 ---

  // 手动入库确认按钮点击
  doAddCloth() {
    this.executeIn({ ...this.data.clothForm, inType: 'hand' });
  },

  // 扫码弹窗确认入库点击
  doIn() {
    const { clothInfo, barcode, inputMeters } = this.data;
    this.executeIn({
      barcode: barcode,
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
        data: { ...payload, meters: Number(payload.meters), spec: Number(payload.spec) }
      });
      if (res.code === 200 || res.code === 0) {
        wx.showToast({ title: '入库成功' });
        this.setData({ showAddClothModal: false, showClothModal: false });
        
        // 调用打印（优先使用后端返回的条码等信息）
        const resData = res.data || payload;
        this.preparePrintData(resData.barcode, resData.modelCode, resData.meters, resData.spec);
        
        this.refreshDashboard(); // 刷新数据
      } else {
        wx.showToast({ title: res.msg || '入库失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '请求失败', icon: 'none' });
    } finally { wx.hideLoading(); }
  },

  async doOut() {
    const { barcode, inputMeters } = this.data;
    if (!inputMeters || inputMeters <= 0) return wx.showToast({ title: '请输入出库米数', icon: 'none' });

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

        // 获取出库后最新的布匹信息，若有剩余则提示打印新标签贴回
        const outClothInfo = res.data || {};
        if (outClothInfo.meters && outClothInfo.meters > 0) {
           this.preparePrintData(
             outClothInfo.barcode, 
             outClothInfo.modelCode, 
             outClothInfo.meters, 
             outClothInfo.spec
           );
        }
      } else {
        wx.showToast({ title: res.msg || '出库失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '请求失败', icon: 'none' });
    } finally { wx.hideLoading(); }
  },

  // --- 辅助 UI 函数 ---

  onModelSearch(e) {
    let keyword = (e.detail.value || '').trim();
    
    // 更新输入框的值
    this.setData({ 'clothForm.modelCode': keyword });

    // 1. 【优化】清空定时器
    if (this.searchTimer) clearTimeout(this.searchTimer);

    // 2. 【优化】如果关键词为空，直接隐藏列表，不发请求
    if (!keyword) {
      this.setData({ modelOptions: [], showModelList: false });
      return;
    }

    // 3. 【优化】延长防抖时间到 500ms，更符合手机端打字习惯
    this.searchTimer = setTimeout(() => {
      this.fetchModelOptions(keyword);
    }, 500);
  },

  async fetchModelOptions(keyword) {
    // 4. 【优化】增加本地缓存。如果搜过的词再次搜，直接用缓存，秒出结果
    if (!this.searchCache) this.searchCache = {};
    if (this.searchCache[keyword]) {
      this.setData({ 
        modelOptions: this.searchCache[keyword], 
        showModelList: this.searchCache[keyword].length > 0 
      });
      return;
    }

    // 5. 【优化】竞态处理。记录当前请求的批次号，防止弱网下旧请求覆盖新请求
    if (!this.searchId) this.searchId = 0;
    const currentSearchId = ++this.searchId;

    try {
      const res = await request({ url: `/inventory/model/search?keyword=${keyword}`, method: 'GET' });
      
      // 【关键】如果当前请求已经不是最后一次发起的请求，直接丢弃结果
      if (currentSearchId !== this.searchId) return;

      if (res.data) {
        const formattedOptions = res.data.map(item => ({
          modelCode: item.modelCode,
          spec: item.Spec !== undefined ? item.Spec : item.spec
        }));

        // 存入本地缓存
        this.searchCache[keyword] = formattedOptions;

        this.setData({ 
          modelOptions: formattedOptions, 
          showModelList: formattedOptions.length > 0 
        });
      } else {
        this.setData({ modelOptions: [], showModelList: false });
      }
    } catch (err) {
      console.error("搜索型号失败", err);
      // 报错时也要校验是不是最后一次请求
      if (currentSearchId === this.searchId) {
        this.setData({ modelOptions: [], showModelList: false });
      }
    }
  },

  chooseModel(e) {
    const { model, spec } = e.currentTarget.dataset;
    this.setData({ 'clothForm.modelCode': model, 'clothForm.spec': spec, showModelList: false });
  },

  preparePrintData(barcode, modelCode, meters, spec) {
    this.setData({ printData: { barcode, modelCode, meters, spec }, showPrintModal: true });
  },

  handleAddCloth() { 
    this.setData({ 
      showAddClothModal: true, 
      clothForm: { modelCode: '', meters: '', spec: '', inType: 'hand' },
      modelOptions: [],
      showModelList: false
    }); 
  },

  hideAddClothModal() { this.setData({ showAddClothModal: false, showModelList: false }); },
  hideClothModal() { this.setData({ showClothModal: false }); },
  hidePrintModal() { this.setData({ showPrintModal: false }); },
  handleBack() { wx.navigateBack(); },
  onFormInput(e) { this.setData({ [`clothForm.${e.currentTarget.dataset.field}`]: e.detail.value }); },
  onMetersInput(e) { this.setData({ inputMeters: e.detail.value }); },
  stopPropagation() {}, // 阻止弹窗事件冒泡
  
  choosePrintType(e) {
    const type = e.currentTarget.dataset.type;
    const { printData } = this.data;
    if (type === 'bluetooth') {
      printerUtil.printViaBluetooth(printData);
      this.hidePrintModal();
    } else if (type === 'preview') {
      wx.showToast({ title: '预览功能开发中', icon: 'none' });
    }
  }
});