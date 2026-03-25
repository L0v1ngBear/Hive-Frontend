const { request } = require('../../utils/request.js');

Page({
  data: {
    currentDate: '',
    currentWeek: '',
    checkStatus: 'uncompleted',
    checkInTime: '',
    checkOutTime: '',
    workStartTime: '09:00',
    workEndTime: '09:30',
    offWorkStartTime: '18:00',
    offWorkEndTime: '18:30',
    
    // 初始化为空，由 onLoad 从缓存中读取
    userId: '' 
  },

  onLoad(options) {
    this.initDateInfo();
    // 初始化时获取用户信息
    const userInfo = wx.getStorageSync('userInfo') || {};
    if (userInfo.id) {
      this.setData({ userId: userInfo.id });
    }
    this.fetchTodayRecord();
  },

  initDateInfo() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    
    const weekArr = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    this.setData({
      currentDate: `${year}-${month}-${day}`,
      currentWeek: weekArr[now.getDay()]
    });
  },

  handleBack() {
    wx.navigateBack({ delta: 1 });
  },

  // ==========================================
  // 核心功能：获取用户定位 (Promise 封装)
  // ==========================================
  getLocation() {
    return new Promise((resolve, reject) => {
      wx.getLocation({
        type: 'wgs84', // 'wgs84' 为 GPS 坐标，如果是用于地图展示或距离计算，通常后端也可能需要 'gcj02' (国测局坐标)
        success: (res) => {
          resolve({
            userLat: res.latitude,
            userLng: res.longitude
          });
        },
        fail: (err) => {
          console.error('获取定位失败:', err);
          reject(err);
        }
      });
    });
  },

  // ==========================================
  // 接口对接：查询当天的打卡记录
  // ==========================================
  async fetchTodayRecord() {
    if (!this.data.userId) return; // 如果没有 userId 则终止

    try {
      const res = await request({
        url: `/attendance/select/record/${this.data.userId}`,
        method: 'GET'
      });
      if (res.code === 200 && res.data) {
        const record = res.data;
        this.setData({
          checkInTime: record.firstPunchTime || '',
          checkOutTime: record.lastPunchTime || '',
          checkStatus: record.firstPunchTime ? 'completed' : 'uncompleted'
        });
      }
    } catch (err) {
      console.error('获取打卡记录失败', err);
    }
  },

  // ==========================================
  // 接口对接：提交打卡 (带定位)
  // ==========================================
  async handleCheckIn() {
    wx.showLoading({ title: '获取定位中...', mask: true });

    let locationData = null;

    try {
      // 1. 获取定位经纬度
      locationData = await this.getLocation();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '请授权并开启定位服务', icon: 'none' });
      return; // 获取定位失败，阻断打卡
    }

    wx.showLoading({ title: '打卡中...', mask: true });

    try {
      // 2. 提交打卡参数 (严格对齐你的 API 示例)
      const res = await request({
        url: '/attendance/punch',
        method: 'POST',
        data: {
          userLat: locationData.userLat,
          userLng: locationData.userLng
        }
      });

      wx.hideLoading(); // 隐藏 loading，准备显示 Toast

      if (res.code === 200) {
        wx.showToast({ title: '打卡成功', icon: 'success', duration: 2000 });
        // 重新拉取一次当天打卡数据刷新视图
        this.fetchTodayRecord();
      } else {
        wx.showToast({ title: res.msg || '打卡失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '网络异常，打卡失败', icon: 'none' });
    }
  },

  handleShowAllRecord() {
    wx.navigateTo({ url: '/pages/attendanceRecord/attendanceRecord' });
  }
});