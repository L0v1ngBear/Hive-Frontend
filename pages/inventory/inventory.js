// 引入封装的请求工具 + 租户工具
const { request } = require('../../utils/request.js');
const tenantUtil = require('../../utils/tenant.js');

Page({
  data: {
    // 库存统计
    totalRollCount: 120,
    totalMeters: 3600.5,
    todayInMeters: 280,
    todayOutMeters: 160,

    recordList: [
      { id: 1, time: '09:25', type: 'in', model: 'C001', meters: 28.5 },
      { id: 2, time: '08:40', type: 'out', model: 'C002', meters: 32.0 },
    ],

    // 扫码相关
    barcode: '',
    showClothModal: false,
    clothInfo: {},
    inputMeters: 0,
    currentOperType: 'in',

    // 打印相关
    showPrintModal: false,
    printData: {},
    bluetoothDevices: [],
    connectedDeviceId: '',
    isBluetoothOpen: false,

    // 手动入库表单
    showAddClothModal: false,
    clothForm: {
      model: '',
      meters: 0,
      width: ''
    },

    // 型号相关
    modelOptions: [],
    showModelList: false,
    allModels: [],
    // 门幅核心关联数据
    widthOptions: [], // 当前型号对应的门幅列表
    showWidthList: false,
    modelHasWidth: false, // 当前型号是否有预设门幅
    // 型号-门幅映射表（模拟后端数据）
    modelWidthMap: {
      'C001': ['1.8m'],
      'C002': ['2.0m', '2.2m'],
      'C003': ['1.5m'],
      '白色棉布': ['1.8m', '2.0m']
    }
  },

  onLoad(options) {
    this.getInventoryStats();
    this.initBluetooth();
    this.getAllModels();
  },

  // 获取所有型号
  getAllModels() {
    this.setData({
      allModels: ['C001', 'C002', 'C003', 'C004', 'C005', '白色棉布', '黑色涤纶']
    });
  },

  // 型号搜索输入（核心：输入型号时自动匹配门幅）
  onModelSearch(e) {
    const inputModel = e.detail.value.trim();
    const { allModels, modelWidthMap } = this.data;

    // 更新型号
    this.setData({
      'clothForm.model': inputModel
    });

    // 匹配型号列表
    if (inputModel) {
      const matchModels = allModels.filter(model => 
        model.toLowerCase().includes(inputModel.toLowerCase())
      );
      this.setData({ modelOptions: matchModels });
    } else {
      this.setData({ modelOptions: [], 'clothForm.width': '', modelHasWidth: false });
    }

    // 核心：自动匹配当前型号的门幅
    if (inputModel && modelWidthMap[inputModel]) {
      // 型号有预设门幅
      const widthList = modelWidthMap[inputModel];
      this.setData({
        widthOptions: widthList,
        'clothForm.width': widthList[0], // 自动填充第一个门幅
        modelHasWidth: true
      });
    } else {
      // 型号无预设门幅，清空门幅
      this.setData({
        widthOptions: [],
        'clothForm.width': '',
        modelHasWidth: false
      });
    }

    this.setData({ showModelList: !!inputModel });
  },

  // 显示型号列表
  showModelList() {
    const { clothForm, allModels } = this.data;
    if (clothForm.model) {
      this.onModelSearch({ detail: { value: clothForm.model } });
    } else {
      this.setData({
        modelOptions: allModels,
        showModelList: true
      });
    }
  },

  // 选择型号（核心：选择型号后自动关联门幅）
  chooseModel(e) {
    const selectedModel = e.currentTarget.dataset.model;
    const { modelWidthMap } = this.data;

    // 1. 更新选中的型号
    this.setData({
      'clothForm.model': selectedModel,
      showModelList: false
    });

    // 2. 核心：自动匹配该型号的门幅
    if (modelWidthMap[selectedModel]) {
      // 有预设门幅：自动填充+显示可选列表
      const widthList = modelWidthMap[selectedModel];
      this.setData({
        widthOptions: widthList,
        'clothForm.width': widthList[0],
        modelHasWidth: true
      });
    } else {
      // 无预设门幅：清空门幅，允许手动输入
      this.setData({
        widthOptions: [],
        'clothForm.width': '',
        modelHasWidth: false
      });
      wx.showToast({
        title: `型号${selectedModel}暂无门幅，可手动输入`,
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 新建型号（自动新建型号-门幅关联）
  createModel() {
    const { clothForm, modelWidthMap } = this.data;
    const newModel = clothForm.model.trim();

    this.setData({ showModelList: false });

    // 如果用户已输入门幅，自动建立型号-门幅关联
    if (clothForm.width) {
      const newWidthMap = { ...modelWidthMap };
      newWidthMap[newModel] = [clothForm.width];
      this.setData({
        modelWidthMap: newWidthMap,
        modelHasWidth: true
      });
      wx.showToast({
        title: `新建型号${newModel}，并关联门幅${clothForm.width}`,
        icon: 'success',
        duration: 2000
      });
    } else {
      wx.showToast({
        title: `新建型号${newModel}，请输入门幅`,
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 门幅输入（无预设门幅时允许手动输入）
  onWidthInput(e) {
    const inputWidth = e.detail.value.trim();
    const { modelHasWidth } = this.data;

    // 有预设门幅时禁止手动输入（只能选择）
    if (!modelHasWidth) {
      this.setData({
        'clothForm.width': inputWidth
      });
    }
  },

  // 显示门幅列表（仅显示当前型号的门幅）
  showWidthList() {
    const { clothForm, widthOptions } = this.data;
    if (clothForm.model && widthOptions.length > 0) {
      this.setData({ showWidthList: true });
    }
  },

  // 选择门幅
  chooseWidth(e) {
    const selectedWidth = e.currentTarget.dataset.width;
    this.setData({
      'clothForm.width': selectedWidth,
      showWidthList: false
    });
  },

  // 打开手动入库弹窗
  handleAddCloth() {
    this.setData({
      clothForm: { model: '', meters: 0, width: '' },
      showAddClothModal: true,
      showModelList: false,
      modelOptions: [],
      showWidthList: false,
      modelHasWidth: false
    });
  },

  // 米数输入
  onFormInput(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;
    this.setData({
      [`clothForm.${field}`]: field === 'meters' ? Number(value) : value
    });
  },

  // 手动入库（核心：自动新建型号-门幅关联）
  async doAddCloth() {
    const { model, meters, width } = this.data.clothForm;
    const tenantId = tenantUtil.getTenantId();

    // 校验
    if (!tenantId) { wx.showToast({ title: '请先选择租户', icon: 'none' }); return; }
    if (!model) { wx.showToast({ title: '请输入/选择布匹型号', icon: 'none' }); return; }
    if (!meters || meters <= 0) { wx.showToast({ title: '请输入有效米数', icon: 'none' }); return; }
    if (!width) { wx.showToast({ title: '请输入/选择门幅', icon: 'none' }); return; }

    wx.showLoading({ title: '入库中...' })

    // 模拟入库逻辑
    setTimeout(() => {
      wx.hideLoading();
      const { modelWidthMap } = this.data;
      // 核心：如果是新型号/无门幅关联，自动新增到映射表
      if (!modelWidthMap[model]) {
        const newWidthMap = { ...modelWidthMap };
        newWidthMap[model] = [width];
        this.setData({ modelWidthMap: newWidthMap });
      } else if (!modelWidthMap[model].includes(width)) {
        // 如果型号已有门幅，但当前门幅是新的，追加到列表
        const newWidthMap = { ...modelWidthMap };
        newWidthMap[model].push(width);
        this.setData({ modelWidthMap: newWidthMap });
      }

      // 生成条码+打印逻辑
      const barcode = `CL${new Date().getFullYear().toString().slice(2)}${(new Date().getMonth()+1).toString().padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}${Math.floor(Math.random()*10000).toString().padStart(4, '0')}`;
      this.setData({
        printData: { barcode, model, meters, width, tenantId },
        showPrintModal: true,
        showAddClothModal: false
      });
      wx.showToast({ title: '入库成功，型号门幅已关联', icon: 'success' });
      this.getInventoryStats();
      this.getAllModels();
    }, 800);
  },

  // 以下为原有功能代码（无修改）
  handleScanCode() {
    wx.scanCode({
      scanType: ['barCode'],
      success: res => {
        const barcode = res.result;
        this.setData({ barcode });
        this.getClothInfo(barcode);
      }
    });
  },

  getClothInfo(barcode) {
    const tenantId = tenantUtil.getTenantId();
    if (!tenantId) {
      wx.showToast({ title: '请先选择租户', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '查询中...' });
    setTimeout(() => {
      const mockCloth = {
        model: 'C001',
        meters: 28.5,
        isInStock: true,
        width: '1.8m'
      };
      this.setData({ 
        clothInfo: mockCloth, 
        showClothModal: true,
        currentOperType: mockCloth.isInStock ? 'out' : 'in'
      });
      wx.hideLoading();
    }, 800);
  },

  onMetersInput(e) {
    this.setData({ inputMeters: Number(e.detail.value) });
  },

  doIn() {
    const meters = this.data.inputMeters;
    const tenantId = tenantUtil.getTenantId();
    const barcode = this.data.barcode;
    
    if (!tenantId) { wx.showToast({ title: '请先选择租户', icon: 'none' }); return; }
    if (!meters || meters <= 0) { wx.showToast({ title: '请输入有效米数', icon: 'none' }); return; }

    wx.showLoading({ title: '入库中...' });
    setTimeout(() => {
      wx.hideLoading();
      const printData = {
        barcode: barcode,
        model: this.data.clothInfo.model,
        meters: meters,
        width: this.data.clothInfo.width,
        tenantId: tenantId
      };
      this.setData({
        printData: printData,
        showPrintModal: true,
        showClothModal: false
      });
      wx.showToast({ title: '入库成功，准备打印条码', icon: 'success' });
    }, 800);
  },

  doOut() {
    const tenantId = tenantUtil.getTenantId();
    const barcode = this.data.barcode;
    
    if (!tenantId) { wx.showToast({ title: '请先选择租户', icon: 'none' }); return; }

    wx.showLoading({ title: '出库中...' });
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({ title: '出库成功', icon: 'success' });
      this.hideClothModal();
    }, 800);
  },

  choosePrintType(e) {
    const type = e.currentTarget.dataset.type;
    const { printData } = this.data;
    if (!printData.barcode) {
      wx.showToast({ title: '无打印数据', icon: 'none' });
      return;
    }

    if (type === 'preview') {
      this.previewPrint(printData);
    } else if (type === 'bluetooth') {
      this.bluetoothPrint(printData);
    }
  },

  previewPrint(printData) {
    const barcodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${printData.barcode}`;
    wx.previewImage({ urls: [barcodeUrl] });
    wx.downloadFile({
      url: barcodeUrl,
      success: (res) => {
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => {
            wx.showToast({ title: '条码图片已保存到相册', icon: 'success' });
          }
        });
      }
    });
  },

  bluetoothPrint(printData) {
    const { connectedDeviceId } = this.data;
    if (connectedDeviceId) {
      this.sendPrintCommand(printData);
      return;
    }

    wx.showLoading({ title: '搜索蓝牙打印机...' });
    wx.startBluetoothDevicesDiscovery({
      services: ['0000FFE0-0000-1000-8000-00805F9B34FB'],
      success: (res) => {
        wx.hideLoading();
        wx.getBluetoothDevices({
          success: (res) => {
            const devices = res.devices.filter(device => device.name && device.name.includes('Printer'));
            if (devices.length === 0) {
              wx.showToast({ title: '未找到蓝牙打印机', icon: 'none' });
              return;
            }
            this.setData({ bluetoothDevices: devices });
            this.connectBluetoothDevice(devices[0].deviceId);
          }
        });
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '蓝牙搜索失败，请开启蓝牙', icon: 'none' });
      }
    });
  },

  initBluetooth() {
    wx.openBluetoothAdapter({
      success: () => { this.setData({ isBluetoothOpen: true }); },
      fail: () => { 
        this.setData({ isBluetoothOpen: false });
        wx.showToast({ title: '请开启蓝牙以使用打印功能', icon: 'none' });
      }
    });
  },

  connectBluetoothDevice(deviceId) {
    wx.createBLEConnection({
      deviceId: deviceId,
      success: () => {
        this.setData({ connectedDeviceId: deviceId });
        wx.showToast({ title: '打印机连接成功', icon: 'success' });
        this.sendPrintCommand(this.data.printData);
      },
      fail: () => { wx.showToast({ title: '打印机连接失败', icon: 'none' }); }
    });
  },

  sendPrintCommand(printData) {
    const { connectedDeviceId } = this.data;
    wx.getBLEDeviceServices({
      deviceId: connectedDeviceId,
      success: (res) => {
        const serviceId = res.services[0].uuid;
        wx.getBLEDeviceCharacteristics({
          deviceId: connectedDeviceId,
          serviceId: serviceId,
          success: (res) => {
            const charId = res.characteristics[0].uuid;
            const printContent = `
              ${printData.barcode}\n
              型号：${printData.model}\n
              米数：${printData.meters}m\n
              门幅：${printData.width}\n
              \n\n
            `;
            const buffer = new ArrayBuffer(printContent.length);
            const dataView = new DataView(buffer);
            for (let i = 0; i < printContent.length; i++) {
              dataView.setUint8(i, printContent.charCodeAt(i));
            }
            wx.writeBLECharacteristicValue({
              deviceId: connectedDeviceId,
              serviceId: serviceId,
              characteristicId: charId,
              value: buffer,
              success: () => {
                wx.showToast({ title: '打印指令发送成功', icon: 'success' });
                this.setData({ showPrintModal: false });
              },
              fail: () => { wx.showToast({ title: '打印指令发送失败', icon: 'none' }); }
            });
          }
        });
      }
    });
  },

  getInventoryStats() {},
  hideClothModal() {
    this.setData({ showClothModal: false, barcode: '', clothInfo: {}, inputMeters: 0 });
  },
  hideAddClothModal() {
    this.setData({ showAddClothModal: false, showModelList: false, showWidthList: false });
  },
  hidePrintModal() {
    this.setData({ showPrintModal: false });
  },
  stopPropagation() {},
  handleBack() { wx.navigateBack() },
  handleStockCheck() { wx.showToast({ title: '盘点功能开发中', icon: 'none' }) },
  handleShowAllRecord() {},
});