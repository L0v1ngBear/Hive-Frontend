// 引入封装的请求工具 + 租户工具
const { request } = require('../../utils/request.js');
const tenantUtil = require('../../utils/tenant.js');

// 【修复1】：首字母改为小写，且确保引用的文件名是 printer.js
const printerUtil = require('../../utils/printer.js'); 

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
      inType: "hand"
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
   */
  async getInventoryStats() {
    try {
      const res = await request({
        url: '/inventory/overView',
        method: 'GET'
      });
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
   * 2. 手动入库：型号搜索框输入事件 (注意：这里绝对不能加 async，否则会导致输入框变成 undefined)
   */
  onModelSearch(e) {
    // 兼容取值方式
    let rawValue = e.detail.value !== undefined ? e.detail.value : e.detail;
    let keyword = (rawValue || '').trim();
    
    // 1. 同步、立刻把用户输入的字渲染到页面上，保证输入流畅不卡顿
    this.setData({ 
      'clothForm.modelCode': keyword,
      showModelList: !!keyword 
    });

    // 2. 如果清空了输入框，直接清空搜索结果并停止往下执行
    if (!keyword) {
      this.setData({ modelOptions: [] });
      return;
    }

    // 3. 防抖处理：用户停止打字 300 毫秒后，再去后端查数据
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => {
      this.fetchModelOptions(keyword);
    }, 300);
  },

  /**
   * 2.1 专门用来发送请求获取型号列表的异步函数
   */
  async fetchModelOptions(keyword) {
    try {
      const res = await request({
        url: `/inventory/model/search?keyword=${keyword}`,
        method: 'GET'
      });
      
      if ((res.code === 0 || res.code === 200) && res.data && res.data.length > 0) {
        // 核心：适配后端返回的 List<ModelCodeVO>
        // 处理可能因为后端序列化导致字段名为 Spec 或 spec 的情况
        const formattedOptions = res.data.map(item => {
          return {
            modelCode: item.modelCode,
            spec: item.Spec !== undefined ? item.Spec : item.spec // 统一映射为小写 spec
          }
        });

        this.setData({ 
          modelOptions: formattedOptions, 
          showModelList: true 
        });
      } else {
        // 查不到数据，说明可能是新录入的型号，直接隐藏下拉列表即可
        this.setData({ modelOptions: [], showModelList: false });
      }
    } catch (err) { 
      console.error("型号搜索失败", err); 
      this.setData({ modelOptions: [], showModelList: false });
    }
  },

  /**
   * 3. 用户点击下拉列表中的某一个 型号+规格 组合
   * (WXML中需要写成 data-model="{{item.modelCode}}" data-spec="{{item.spec}}")
   */
  chooseModel(e) {
    // 微信小程序的 dataset 会自动将绑定的属性名转成全小写
    const { model, spec } = e.currentTarget.dataset;
    
    this.setData({
      'clothForm.modelCode': model || '', 
      'clothForm.spec': spec || '',
      showModelList: false, // 点击后隐藏下拉框
      modelOptions: []
    });
  },

  /**
   * 4. 执行入库提交 (新增 或 扫码后入库)
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
        
        // 解析后端返回的 ClothInfoVO 对象
        const clothInfo = res.data || {};
        this.setData({ showAddClothModal: false, showClothModal: false });
        
        // 弹出打印确认框（交由前端去调起蓝牙打印）
        this.preparePrintData(clothInfo.barcode, clothInfo.modelCode, clothInfo.meters, clothInfo.spec);
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
    this.executeIn({ ...this.data.clothForm, inType: 'hand' });
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
          // 出库时默认填入剩余库存量，方便全额出库
          inputMeters: d.remainingMeters || d.meters || 0,
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
          barcode: barcode, 
          meters: Number(inputMeters) 
        }
      });

      if (res.code === 200 || res.code === 0) {
        wx.showToast({ title: '出库成功', icon: 'success' });
        this.hideClothModal();
        this.getInventoryStats();

        // 获取出库后最新的布匹信息 ClothInfoVO
        const outClothInfo = res.data || {};
        
        // 如果出库后剩余米数大于 0 (说明是部分出库)，则提示用户打印新标签贴回布卷
        if (outClothInfo.meters && outClothInfo.meters > 0) {
           this.preparePrintData(
             outClothInfo.barcode, 
             outClothInfo.modelCode, 
             outClothInfo.meters, // 这里的 meters 已经是出库后扣减的最新剩余米数
             outClothInfo.spec
           );
        }

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
      clothForm: { modelCode: '', meters: '', spec: '', inType: 'hand' },
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
  
  // 打印相关
  choosePrintType(e) {
    const type = e.currentTarget.dataset.type;
    
    // 【修复2】：必须先从 data 中解构出 printData，否则下面调用时会报 undefined 错误
    const { printData } = this.data; 

    console.log("选择打印方式:", type, "数据:", printData);
    
    if (type === 'bluetooth') {
      // 1. 调用上方工具类的打印方法
      printerUtil.printViaBluetooth(printData);
      
      // 2. 关闭当前弹窗
      this.hidePrintModal();
    } else if (type === 'preview') {
      wx.showToast({ title: '预览功能开发中', icon: 'none' });
    }
  }
});