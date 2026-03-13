// 引入多租户工具（如需适配多租户，取消注释）
// const tenantUtil = require('../../utils/tenant.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 库存统计数据
    totalCount: 1286,
    todayInCount: 28,
    todayOutCount: 16,
    // 操作记录列表
    recordList: [
      { id: 1, time: '09:25', type: 'in', goodsName: '办公用品A', count: 10, status: 'success' },
      { id: 2, time: '08:42', type: 'out', goodsName: '生产原料B', count: 5, status: 'success' },
      { id: 3, time: '昨日', type: 'in', goodsName: '包装材料C', count: 20, status: 'success' },
      { id: 4, time: '昨日', type: 'out', goodsName: '成品D', count: 8, status: 'fail' },
      { id: 5, time: '昨日', type: 'in', goodsName: '配件E', count: 15, status: 'success' }
    ],
    // 扫码相关
    scanResult: '', // 纯商品条码（无任何前缀）
    currentOperType: '', // in:入库 out:出库（用户选择）
    operCount: 1, // 操作数量（默认1，可手动输入）
    showOperTypeModal: false, // 操作类型选择弹窗
    showConfirmModal: false // 确认操作弹窗
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 支持从扫码直接进入页面
    if (options.barCode) {
      this.setData({
        scanResult: options.barCode,
        showOperTypeModal: true
      });
    }
  },

  /**
   * 返回上一页
   */
  handleBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1, fail: () => wx.redirectTo({ url: '/pages/index/index' }) });
    } else {
      wx.redirectTo({ url: '/pages/index/index' });
    }
  },

  /**
   * 扫码操作（仅识别商品条码，无前缀）
   */
  handleScanCode() {
    wx.scanCode({
      onlyFromCamera: true,
      scanType: ['barCode'], // 仅支持条形码
      success: (res) => {
        // 直接存储纯商品条码，不解析前缀
        this.setData({
          scanResult: res.result,
          showOperTypeModal: true // 显示操作类型选择弹窗
        });
      },
      fail: (err) => {
        if (err.errMsg !== 'scanCode:fail cancel') {
          wx.showToast({ title: '扫码失败，请重试', icon: 'none' });
          console.error('扫码失败：', err);
        }
      }
    });
  },

  /**
   * 选择操作类型（入库/出库）
   */
  chooseOperType(type) {
    this.setData({
      currentOperType: type,
      showOperTypeModal: false,
      showConfirmModal: true // 显示确认操作弹窗
    });
  },

  /**
   * 输入操作数量
   */
  handleCountInput(e) {
    const count = Number(e.detail.value) || 1; // 防止空值/非数字
    this.setData({ operCount: count < 1 ? 1 : count }); // 数量至少为1
  },

  /**
   * 确认执行出入库操作（预留后端接口）
   */
  confirmOper() {
    wx.showLoading({ title: '处理中...', mask: true });

    // ======================== 后端接口预留区 ========================
    /* 后端开发完成后，删除模拟逻辑，取消以下注释
    wx.request({
      url: 'https://你的域名/api/inventory/operate',
      method: 'POST',
      header: {
        'content-type': 'application/json',
        // 'Tenant-Id': tenantUtil.getTenantId() // 多租户适配
      },
      data: {
        goodsCode: this.data.scanResult, // 商品条码（纯编码）
        operType: this.data.currentOperType, // 操作类型
        count: this.data.operCount // 操作数量
      },
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 200) {
          this.updateInventoryData(res.data.data);
        } else {
          wx.showToast({ title: res.data.msg || '操作失败', icon: 'none' });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({ title: '网络异常，请重试', icon: 'none' });
        console.error('接口请求失败：', err);
      }
    });
    */
    // ======================== 模拟逻辑（可删除） ========================
    setTimeout(() => {
      wx.hideLoading();
      this.updateInventoryData();
    }, 1000);
  },

  /**
   * 更新库存数据和操作记录（接口/模拟通用）
   */
  updateInventoryData(apiData = {}) {
    const { currentOperType, operCount } = this.data;
    // 出库库存校验
    if (currentOperType === 'out' && this.data.totalCount < operCount) {
      wx.showToast({ title: '库存不足，无法出库', icon: 'none' });
      this.hideConfirmModal();
      return;
    }

    // 更新库存统计
    const updateData = {};
    if (currentOperType === 'in') {
      updateData.totalCount = this.data.totalCount + operCount;
      updateData.todayInCount = this.data.todayInCount + operCount;
      wx.showToast({ title: '入库成功', icon: 'success' });
    } else {
      updateData.totalCount = this.data.totalCount - operCount;
      updateData.todayOutCount = this.data.todayOutCount + operCount;
      wx.showToast({ title: '出库成功', icon: 'success' });
    }

    // 添加操作记录
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const newRecord = {
      id: Date.now(),
      time,
      type: currentOperType,
      goodsName: apiData.goodsName || `商品${this.data.scanResult.slice(-4)}`,
      count: operCount,
      status: 'success'
    };
    const newRecordList = [newRecord, ...this.data.recordList].slice(0, 5); // 保留最近5条

    // 刷新页面数据
    this.setData({
      ...updateData,
      recordList: newRecordList,
      showConfirmModal: false,
      operCount: 1 // 重置数量为1
    });
  },

  /**
   * 隐藏操作类型选择弹窗
   */
  hideOperTypeModal() {
    this.setData({ showOperTypeModal: false, scanResult: '' });
  },

  /**
   * 隐藏确认操作弹窗
   */
  hideConfirmModal() {
    this.setData({ showConfirmModal: false, operCount: 1 });
  },

  /**
   * 阻止事件冒泡
   */
  stopPropagation() {},

  /**
   * 库存盘点
   */
  handleStockCheck() {
    wx.showToast({ title: '库存盘点功能开发中', icon: 'none' });
  },

  /**
   * 查看全部记录
   */
  handleShowAllRecord() {
    wx.navigateTo({
      url: '/pages/inventoryRecord/inventoryRecord',
      fail: () => wx.showToast({ title: '功能暂未开发', icon: 'none' })
    });
  },

  // 生命周期函数（无改动，省略）
  onReady() {},
  onShow() {},
  onHide() {},
  onUnload() {},
  onPullDownRefresh() {},
  onReachBottom() {},
  onShareAppMessage() {
    return { title: '库存管理', path: '/pages/inventory/inventory' };
  }
});