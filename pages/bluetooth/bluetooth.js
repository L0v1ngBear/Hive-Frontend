// 引入全局的打印工具类
const printerUtil = require('../../utils/printer.js');

Page({
  data: {
    devices: [],
    connectedDeviceId: '',
    isScanning: false
  },

  onLoad() {
    this.initBluetooth();
  },

  onUnload() {
    // 离开页面时停止搜索，节省手机电量
    wx.stopBluetoothDevicesDiscovery(); 
  },

  // 1. 初始化蓝牙适配器
  initBluetooth() {
    wx.openBluetoothAdapter({
      success: (res) => {
        this.startScan();
      },
      fail: (err) => {
        wx.showModal({ 
          title: '提示', 
          content: '请在手机设置中开启蓝牙，并授权微信使用蓝牙', 
          showCancel: false 
        });
      }
    });
  },

  // 2. 开始搜索附近的蓝牙设备
  startScan() {
    if (this.data.isScanning) return;
    
    this.setData({ devices: [], isScanning: true });

    wx.startBluetoothDevicesDiscovery({
      allowDuplicatesKey: false, // 不允许重复设备
      success: () => {
        // 监听寻找到新设备的事件
        wx.onBluetoothDeviceFound((res) => {
          res.devices.forEach(device => {
            // 过滤掉完全没有名字的无用蓝牙设备
            if (!device.name && !device.localName) return;
            
            let devices = this.data.devices;
            let exists = devices.some(item => item.deviceId === device.deviceId);
            if (!exists) {
              devices.push(device);
              this.setData({ devices });
            }
          });
        });
      },
      complete: () => {
        // 搜索 5 秒后自动停止转圈
        setTimeout(() => { 
          this.setData({ isScanning: false });
          wx.stopBluetoothDevicesDiscovery();
        }, 5000);
      }
    });
  },

  // 3. 点击列表中的设备进行连接
  connectDevice(e) {
    const device = e.currentTarget.dataset.device;
    const deviceId = device.deviceId;
    
    wx.stopBluetoothDevicesDiscovery(); // 准备连接时先停止搜索
    this.setData({ isScanning: false });
    wx.showLoading({ title: '连接中...', mask: true });

    wx.createBLEConnection({
      deviceId: deviceId,
      success: () => {
        this.setData({ connectedDeviceId: deviceId });
        this.getServices(deviceId); // 连接成功后，去寻找打印机的服务
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({ title: '连接失败', icon: 'none' });
        console.error('连接失败', err);
      }
    });
  },

  // 4. 获取蓝牙服务，找出具备“写入(write)”权限的特征值
  getServices(deviceId) {
    wx.getBLEDeviceServices({
      deviceId: deviceId,
      success: (res) => {
        for (let i = 0; i < res.services.length; i++) {
          let serviceId = res.services[i].uuid;
          
          wx.getBLEDeviceCharacteristics({
            deviceId: deviceId,
            serviceId: serviceId,
            success: (charRes) => {
              for (let j = 0; j < charRes.characteristics.length; j++) {
                let char = charRes.characteristics[j];
                
                // 【最关键的一步】：找到支持 write (写入) 的特征值，这就是发送指令的入口！
                if (char.properties.write) {
                  wx.hideLoading();
                  wx.showToast({ title: '打印机连接成功!', icon: 'success' });
                  
                  // 将拿到的这 3 个关键 ID 存入全局的 printerUtil 单例中
                  printerUtil.setBluetoothDevice(deviceId, serviceId, char.uuid);
                  
                  // 延时 1.5 秒后自动返回仓库页面
                  setTimeout(() => { wx.navigateBack(); }, 1500);
                  return; 
                }
              }
            }
          });
        }
      }
    });
  }
});