// 引入封装的请求工具 + 租户工具
const { request } = require('../../utils/request.js');
const tenantUtil = require('../../utils/tenant.js');

Page({
  data: {
    // --- 顶部统计概览数据 ---
    totalRollCount: 0,
    totalMeters: 0,
    todayInMeters: 0,
    todayOutMeters: 0,
    recordList: [], // 最近操作记录

    // --- UI 弹窗控制 ---
    showClothModal: false,    // 扫码后的操作弹窗
    showAddClothModal: false, // 手动入库弹窗
    showPrintModal: false,    // 打印/成功提示弹窗
    showModelList: false,     // 控制型号下拉搜索框显示

    // --- 扫码核心数据 ---
    barcode: '',
    clothInfo: {},            // 扫码查询到的布匹详情
    inputMeters: 0,           // 弹窗中输入的米数
    currentOperType: 'in',    // 操作类型：in(入库) / out(出库)
    
    // --- 手动入库表单 ---
    clothForm: {
      modelCode: '', 
      meters: '',
      spec: '',      
      inType: 'MANUAL'
    },

    // --- 动态选项 (同一型号多规格数组) ---
    modelOptions: [], 
    
    // --- 打印数据 ---
    printData: {},
  },

  onLoad(options) {
    this.getInventoryStats();
  },

  /**
   * 1. 获取库存概览统计
   * 对应接口: /api/inventory/overView
   */
  async getInventoryStats() {
    try {
      const res = await request({
        url: '/inventory/overView',
        method: 'GET'
      });
      // 兼容 code 为 0 或 200 的情况
      if ((res.code === 200 || res.code === 0) && res.data) {
        this.setData({
          totalRollCount: res.data.totalRollCount || 0,
          totalMeters: res.data.totalMeters || 0,
          todayInMeters: res.data.todayInMeters || 0,
          todayOutMeters: res.data.todayOutMeters || 0,
          recordList: res.data.recentRecords || []
        });
      }
    } catch (err) {
      console.error("获取统计数据失败", err);
    }
  },

  /**
   * 2. 手动入库：型号搜索 (支持同型号多规格)
   * 对应接口: /api/inventory/model/search?keyword
   */
  async onModelSearch(e) {
    const keyword = e.detail.value.trim();
    
    // 1. 实时记录用户输入的内容
    this.setData({ 
      'clothForm.modelCode': keyword,
      showModelList: !!keyword 
    });

    if (!keyword) {
      this.setData({ modelOptions: [] });
      return;
    }

    try {
      const res = await request({
        url: `/inventory/model/search?keyword=${keyword}`,
        method: 'GET'
      });
      
      if ((res.code === 0 || res.code === 200) && res.data) {
        // res.data 结构: [{modelCode: "A", spec: 100}, {modelCode: "A", spec: 200}]
        this.setData({ 
          modelOptions: res.data, 
          showModelList: res.data.length > 0 
        });
      } else {
        this.setData({ modelOptions: [] });
      }
    } catch (err) { 
      console.error("型号搜索失败", err); 
      this.setData({ modelOptions: [] });
    }
  },

  /**
   * 3. 用户点击下拉列表中的某一个 型号+规格 组合
   */
  chooseModel(e) {
    const { model, spec } = e.currentTarget.dataset;
    
    // 点击后，同时填充型号和规格，并关闭下拉框
    this.setData({
      'clothForm.modelCode': model || '', 
      'clothForm.spec': spec || '',
      showModelList: false,
      modelOptions: []
    });
  },

  /**
   * 4. 执行入库提交 (新增 或 扫码后入库)
   * 对应接口: /api/inventory/cloth/in
   */
  async executeIn(payload) {
    if (!payload.modelCode) return wx.showToast({ title: '请输入型号', icon: 'none' });
    if (!payload.meters || payload.meters <= 0) return wx.showToast({ title: '请输入有效米数', icon: 'none' });
    if (!payload.spec) return wx.showToast({ title: '请输入规格', icon: 'none' });

    wx.showLoading({ title: '正在处理...' });

    try {
      const res = await request({
        url: '/inventory/cloth/in',
        method: 'POST',
        data: {
          barcode: payload.barcode || "", // 新增时为空，由后端生成
          modelCode: payload.modelCode,
          meters: Number(payload.meters),
          spec: Number(payload.spec), 
          inType: payload.inType
        }
      });

      if (res.code === 200 || res.code === 0) {
        wx.showToast({ title: '入库成功', icon: 'success' });
        
        const newBarcode = res.data; // 后端生成或确认的条码
        this.setData({ showAddClothModal: false, showClothModal: false });
        
        // 弹出打印确认框
        this.preparePrintData(newBarcode, payload.modelCode, payload.meters, payload.spec);
        // 刷新首页统计
        this.getInventoryStats();
      } else {
        wx.showToast({ title: res.msg || '入库失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '请求失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 手动入库按钮点击
  doAddCloth() {
    this.executeIn({ ...this.data.clothForm, inType: 'MANUAL' });
  },

  // 扫码弹窗中的“入库”点击
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

  /**
   * 5. 扫码业务逻辑
   * 对应接口: /api/inventory/barCode/search?barCode
   */
  handleScanCode() {
    wx.scanCode({
      scanType: ['barCode'],
      success: (res) => {
        const barcode = res.result;
        this.setData({ barcode });
        this.getClothInfo(barcode);
      }
    });
  },

  async getClothInfo(barcode) {
    wx.showLoading({ title: '查询中...' });
    try {
      const res = await request({
        url: `/inventory/barCode/search?barCode=${barcode}`,
        method: 'GET'
      });

      if ((res.code === 200 || res.code === 0) && res.data) {
        const d = res.data;
        this.setData({ 
          clothInfo: d, 
          showClothModal: true,
          inputMeters: d.meters || 0,
          // 状态 1 为在库(执行出库)，其他为不在库(重新入库)
          currentOperType: d.status === 1 ? 'out' : 'in' 
        });
      } else {
        wx.showToast({ title: '未查询到信息', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '查询失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 6. 出库逻辑
   * 对应接口: /api/inventory/cloth/out
   */
  async doOut() {
    const { barcode, inputMeters } = this.data;
    if (!inputMeters || inputMeters <= 0) return wx.showToast({ title: '米数错误', icon: 'none' });

    wx.showLoading({ title: '正在出库...' });
    try {
      const res = await request({
        url: '/inventory/cloth/out',
        method: 'POST',
        data: { 
          barCode: barcode, 
          meters: Number(inputMeters) 
        }
      });

      if (res.code === 200 || res.code === 0) {
        wx.showToast({ title: '出库成功', icon: 'success' });
        this.hideClothModal();
        this.getInventoryStats();
      } else {
        wx.showToast({ title: res.msg || '出库失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '请求失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 辅助 UI 函数
   */
  onFormInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [`clothForm.${field}`]: e.detail.value });
  },

  onMetersInput(e) {
    this.setData({ inputMeters: e.detail.value });
  },

  preparePrintData(barcode, modelCode, meters, spec) {
    this.setData({
      printData: { barcode, modelCode, meters, spec },
      showPrintModal: true
    });
  },

  handleAddCloth() {
    this.setData({
      showAddClothModal: true,
      clothForm: { modelCode: '', meters: '', spec: '', inType: 'MANUAL' },
      modelOptions: [],
      showModelList: false
    });
  },

  hideAddClothModal() { this.setData({ showAddClothModal: false, showModelList: false }); },
  hideClothModal() { this.setData({ showClothModal: false }); },
  hidePrintModal() { this.setData({ showPrintModal: false }); },
  stopPropagation() {},
  handleBack() { wx.navigateBack(); },
  handleStockCheck() { wx.showToast({ title: '开发中', icon: 'none' }); },
  
  // 打印相关（预留空函数，根据你的蓝牙工具类实现）
  choosePrintType(e) {
    const type = e.currentTarget.dataset.type;
    console.log("选择打印方式:", type, this.data.printData);
    // 这里调用你之前的蓝牙打印逻辑
  }
});