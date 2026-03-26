/**
 * 微信小程序 - 蓝牙标签打印核心工具类 (基于 TSPL 指令集)
 * 纯前端实现，无需后端
 */
class PrinterUtil {
  constructor() {
    this.deviceId = '';         // 蓝牙设备 ID (连接后获取)
    this.serviceId = '';        // 蓝牙服务 UUID
    this.characteristicId = ''; // 蓝牙特征值 UUID (必须具备 write 权限)
    this.isConnected = false;   // 当前连接状态
  }

  /**
   * 1. 组装 TSPL 打印指令并转为 ArrayBuffer (小程序蓝牙发送必须是 Buffer)
   * @param {Object} printData { barcode: '条码号', modelCode: '型号', meters: 米数, spec: '规格' }
   */
  generateTsplBuffer(printData) {
    const { barcode, modelCode, meters, spec } = printData;
    
    // 【重要提示】: 这里的 SIZE 60 mm, 40 mm 需要根据你实际使用的标签纸物理尺寸进行修改！
    let cmds = [
      'SIZE 60 mm,40 mm\r\n',     // 标签纸尺寸：宽 60mm，高 40mm
      'GAP 2 mm,0 mm\r\n',        // 标签纸间距：2mm
      'DIRECTION 1\r\n',          // 打印方向 (0或1)
      'CLS\r\n',                  // 清除打印机缓存
      
      // 打印文字：TEXT x, y, "font", rotation, x-multi, y-multi, "text"
      // "TSS24.BF2" 是大多数便携标签机内置的中文繁简黑体/宋体
      `TEXT 20,30,"TSS24.BF2",0,1,1,"型号: ${modelCode}"\r\n`,
      `TEXT 20,80,"TSS24.BF2",0,1,1,"规格: ${spec}"\r\n`,
      `TEXT 20,130,"TSS24.BF2",0,1,1,"米数: ${meters} m"\r\n`,
      
      // 打印一维码：BARCODE x, y, "code_type", height, readable, rotation, narrow, wide, "content"
      // 高度 80，1 代表在条码下方打印出明文数字
      `BARCODE 20,180,"128",80,1,0,2,2,"${barcode}"\r\n`,
      
      'PRINT 1,1\r\n'             // 执行打印，打印 1 份
    ];

    const tsplString = cmds.join('');
    return this.stringToArrayBuffer(tsplString);
  }

  /**
   * 字符串转 ArrayBuffer (微信小程序环境)
   */
  stringToArrayBuffer(str) {
    // 微信小程序暂不支持原生的 TextEncoder，这里使用简易的 UTF-8 编码方式
    // 如果你的打印机不支持 UTF-8 导致中文乱码，建议引入第三方的 gbk.js 进行编码
    let utf8Str = unescape(encodeURIComponent(str));
    let buffer = new ArrayBuffer(utf8Str.length);
    let dataView = new Uint8Array(buffer);
    for (let i = 0; i < utf8Str.length; i++) {
      dataView[i] = utf8Str.charCodeAt(i);
    }
    return buffer;
  }

  /**
   * 2. 执行蓝牙打印 (处理了微信小程序的 MTU 分包限制)
   */
  async printViaBluetooth(printData) {
    if (!this.isConnected || !this.deviceId || !this.characteristicId) {
      wx.showToast({ title: '请先连接蓝牙打印机', icon: 'none' });
      // 如果没连接，延迟 1 秒后跳转到你专门写的蓝牙搜索页面
      setTimeout(() => {
        wx.navigateTo({ url: '/pages/bluetooth/bluetooth' });
      }, 1000);
      return;
    }

    wx.showLoading({ title: '正在发送至打印机...', mask: true });
    const buffer = this.generateTsplBuffer(printData);
    
    try {
      // 【核心坑点防御】：微信小程序/安卓底层的低功耗蓝牙 (BLE) 每次最多只能发送 20 字节
      // 如果直接把几百字节的 Buffer 发过去会直接报错，必须切片分包发送！
      const MAX_CHUNK_SIZE = 20; 
      let offset = 0;
      
      while (offset < buffer.byteLength) {
        let chunk = buffer.slice(offset, offset + MAX_CHUNK_SIZE);
        await this._writeBLEValue(chunk);
        offset += MAX_CHUNK_SIZE;
      }
      
      wx.showToast({ title: '打印指令已发送', icon: 'success' });
    } catch (err) {
      console.error('蓝牙写入特征值失败', err);
      wx.showToast({ title: '打印失败，请检查打印机状态', icon: 'none' });
      this.isConnected = false; // 发送失败通常意味着断开了，重置状态
    } finally {
      wx.hideLoading();
    }
  }

  /**
   * 内部方法：封装小程序原生的写入特征值 API 为 Promise
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

  /**
   * 3. 供蓝牙搜索连接页面调用的方法
   * 当用户在蓝牙列表中点击连接成功后，把设备信息存到这个工具类里
   */
  setBluetoothDevice(deviceId, serviceId, characteristicId) {
    this.deviceId = deviceId;
    this.serviceId = serviceId;
    this.characteristicId = characteristicId;
    this.isConnected = true;
  }
}

// 导出单例对象，确保整个小程序生命周期内复用同一个蓝牙连接状态
module.exports = new PrinterUtil();