/**
 * 微信小程序 - 蓝牙打印核心工具类
 * 支持 TSPL(标签) 和 ESC/POS(三联单) 指令集分包发送。
 */
const { renderTemplate } = require('./templatePrinter.js');

const fallbackLabelTemplate = require('./label.js');
const triplicateTemplate = require('./triplicate.js');

class PrinterUtil {
  constructor() {
    this.deviceId = '';
    this.serviceId = '';
    this.characteristicId = '';
    this.isConnected = false;
  }

  async printLabel(printData, templateContent) {
    if (!this._checkConnection()) return;

    wx.showLoading({ title: '生成标签中...', mask: true });
    try {
      const template = templateContent || fallbackLabelTemplate;
      const finalCmd = renderTemplate(template, printData) + '\r\n';
      await this._sendBuffer(this.stringToArrayBuffer(finalCmd));
      wx.showToast({ title: '标签打印成功', icon: 'success' });
    } catch (err) {
      this._handlePrintError(err, '标签');
    } finally {
      wx.hideLoading();
    }
  }

  async printTriplicate(printData) {
    if (!this._checkConnection()) return;

    wx.showLoading({ title: '生成三联单...', mask: true });
    try {
      const finalCmd = renderTemplate(triplicateTemplate, printData) + '\n\n\n\n';
      await this._sendBuffer(this.stringToArrayBuffer(finalCmd));
      wx.showToast({ title: '三联单打印成功', icon: 'success' });
    } catch (err) {
      this._handlePrintError(err, '三联单');
    } finally {
      wx.hideLoading();
    }
  }

  async _sendBuffer(buffer) {
    const MAX_CHUNK_SIZE = 20;
    let offset = 0;

    while (offset < buffer.byteLength) {
      const chunk = buffer.slice(offset, offset + MAX_CHUNK_SIZE);
      await this._writeBLEValue(chunk);
      offset += MAX_CHUNK_SIZE;
    }
  }

  stringToArrayBuffer(str) {
    const utf8Str = unescape(encodeURIComponent(str));
    const buffer = new ArrayBuffer(utf8Str.length);
    const dataView = new Uint8Array(buffer);
    for (let i = 0; i < utf8Str.length; i++) {
      dataView[i] = utf8Str.charCodeAt(i);
    }
    return buffer;
  }

  _writeBLEValue(buffer) {
    return new Promise((resolve, reject) => {
      wx.writeBLECharacteristicValue({
        deviceId: this.deviceId,
        serviceId: this.serviceId,
        characteristicId: this.characteristicId,
        value: buffer,
        success: resolve,
        fail: reject
      });
    });
  }

  setBluetoothDevice(deviceId, serviceId, characteristicId) {
    this.deviceId = deviceId;
    this.serviceId = serviceId;
    this.characteristicId = characteristicId;
    this.isConnected = true;
  }

  _checkConnection() {
    if (!this.isConnected || !this.deviceId || !this.characteristicId) {
      wx.showToast({ title: '请先连接蓝牙打印机', icon: 'none' });
      setTimeout(() => {
        wx.navigateTo({ url: '/pages/bluetooth/bluetooth' });
      }, 1000);
      return false;
    }
    return true;
  }

  _handlePrintError(err, type) {
    console.error(`${type}打印指令发送失败`, err);
    wx.showToast({ title: '打印失败，请检查打印机', icon: 'none' });
    this.isConnected = false;
  }
}

module.exports = new PrinterUtil();