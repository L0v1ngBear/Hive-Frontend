/**
 * 微信小程序 - 蓝牙打印核心工具类
 * 支持 TSPL(标签) 和 ESC/POS(三联单) 指令集分包发送
 */

// 1. 引入模板渲染工具 (请确保路径和你的项目一致)
const { renderTemplate } = require('./templatePrinter.js'); 

// 2. 引入你建好的两个模板文件
const labelTemplate = require('./label.js');             // 标签 TSPL 模板
const triplicateTemplate = require('./triplicate.js');   // 三联单 ESC/POS 模板

class PrinterUtil {
  constructor() {
    this.deviceId = '';         // 蓝牙设备 ID (连接后获取)
    this.serviceId = '';        // 蓝牙服务 UUID
    this.characteristicId = ''; // 蓝牙特征值 UUID (必须具备 write 权限)
    this.isConnected = false;   // 当前连接状态
  }

  // ==========================================
  // 业务入口 1：打印标签 (TSPL)
  // ==========================================
  async printLabel(printData) {
    if (!this._checkConnection()) return;

    wx.showLoading({ title: '生成标签中...', mask: true });
    try {
      // 渲染标签模板，TSPL 指令结尾通常需要回车换行
      let finalCmd = renderTemplate(labelTemplate, printData) + '\r\n';
      
      // 转成 Buffer 并分包发送
      await this._sendBuffer(this.stringToArrayBuffer(finalCmd));
      
      wx.showToast({ title: '标签打印成功', icon: 'success' });
    } catch (err) {
      this._handlePrintError(err, '标签');
    } finally {
      wx.hideLoading();
    }
  }

  // ==========================================
  // 业务入口 2：打印三联单 (ESC/POS)
  // ==========================================
  async printTriplicate(printData) {
    if (!this._checkConnection()) return;

    wx.showLoading({ title: '生成三联单...', mask: true });
    try {
      // 渲染三联单模板，ESC/POS 结尾通常需要走纸几行并切刀
      let finalCmd = renderTemplate(triplicateTemplate, printData) + '\n\n\n\n';
      
      // 转成 Buffer 并分包发送
      await this._sendBuffer(this.stringToArrayBuffer(finalCmd));
      
      wx.showToast({ title: '三联单打印成功', icon: 'success' });
    } catch (err) {
      this._handlePrintError(err, '三联单');
    } finally {
      wx.hideLoading();
    }
  }

  // ==========================================
  // 底层通信能力
  // ==========================================

  /**
   * 核心：执行蓝牙分包发送 (处理微信小程序的 MTU 限制)
   */
  async _sendBuffer(buffer) {
    const MAX_CHUNK_SIZE = 20; // 微信小程序/安卓低功耗蓝牙每次最多发送 20 字节
    let offset = 0;
    
    while (offset < buffer.byteLength) {
      let chunk = buffer.slice(offset, offset + MAX_CHUNK_SIZE);
      await this._writeBLEValue(chunk);
      offset += MAX_CHUNK_SIZE;
    }
  }

  /**
   * 字符串转 ArrayBuffer (微信小程序环境)
   */
  stringToArrayBuffer(str) {
    // 微信小程序暂不支持原生的 TextEncoder，这里使用简易的 UTF-8 编码方式
    // 【注意】如果你的三联单打印机打出中文乱码，说明它只认 GBK 编码！
    // 届时你需要引入一个 gbk.js 库，把这里的转码逻辑换成 GBK 转码。
    let utf8Str = unescape(encodeURIComponent(str));
    let buffer = new ArrayBuffer(utf8Str.length);
    let dataView = new Uint8Array(buffer);
    for (let i = 0; i < utf8Str.length; i++) {
      dataView[i] = utf8Str.charCodeAt(i);
    }
    return buffer;
  }

  /**
   * 封装小程序原生的写入特征值 API 为 Promise
   */
  _writeBLEValue(buffer) {
    return new Promise((resolve, reject) => {
      wx.writeBLECharacteristicValue({
        deviceId: this.deviceId,
        serviceId: this.serviceId,
        characteristicId: this.characteristicId,
        value: buffer,
        success: res => resolve(res),
        fail: err => reject(err)
      });
    });
  }

  // ==========================================
  // 状态管理与辅助
  // ==========================================

  /**
   * 供蓝牙搜索连接页面调用的方法
   */
  setBluetoothDevice(deviceId, serviceId, characteristicId) {
    this.deviceId = deviceId;
    this.serviceId = serviceId;
    this.characteristicId = characteristicId;
    this.isConnected = true;
  }

  /**
   * 检查连接状态
   */
  _checkConnection() {
    if (!this.isConnected || !this.deviceId || !this.characteristicId) {
      wx.showToast({ title: '请先连接蓝牙打印机', icon: 'none' });
      // 延迟跳转到蓝牙搜索页
      setTimeout(() => {
        wx.navigateTo({ url: '/pages/bluetooth/bluetooth' }); // 路径请按实际修改
      }, 1000);
      return false;
    }
    return true;
  }

  /**
   * 统一错误处理
   */
  _handlePrintError(err, type) {
    console.error(`${type}打印指令发送失败`, err);
    wx.showToast({ title: '打印失败，请检查打印机', icon: 'none' });
    this.isConnected = false; // 发送失败通常意味着断开了，重置状态
  }
}

// 导出单例对象，确保整个小程序生命周期内复用同一个蓝牙连接状态
module.exports = new PrinterUtil();