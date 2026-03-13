// pages/attendance/attendance.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 当前日期和星期
    currentDate: '',
    currentWeek: '',
    // 打卡状态：completed(已完成) / uncompleted(未完成)
    checkStatus: 'uncompleted',
    // 上班打卡时间
    checkInTime: '',
    // 下班打卡时间
    checkOutTime: '',
    // 考勤规则时间
    workStartTime: '09:00',
    workEndTime: '09:30',
    offWorkStartTime: '18:00',
    offWorkEndTime: '18:30',
    // 打卡记录列表
    recordList: [
      { id: 1, date: '2026-02-10', checkInTime: '08:58', checkOutTime: '18:05', status: 'normal' },
      { id: 2, date: '2026-02-09', checkInTime: '09:40', checkOutTime: '17:50', status: 'abnormal' },
      { id: 3, date: '2026-02-08', checkInTime: '08:55', checkOutTime: '18:10', status: 'normal' },
      { id: 4, date: '2026-02-07', checkInTime: '09:05', checkOutTime: '', status: 'abnormal' },
      { id: 5, date: '2026-02-06', checkInTime: '08:50', checkOutTime: '18:00', status: 'normal' }
    ]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 初始化日期和星期
    this.initDateInfo();
  },

  /**
   * 初始化日期信息
   */
  initDateInfo() {
    const now = new Date();
    // 格式化日期：YYYY-MM-DD
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const currentDate = `${year}-${month}-${day}`;
    
    // 格式化星期
    const weekArr = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const currentWeek = weekArr[now.getDay()];
    
    this.setData({
      currentDate,
      currentWeek
    });
  },

  /**
   * 返回上一页
   */
  handleBack() {
    wx.navigateBack({
      delta: 1
    });
  },

  /**
   * 打卡操作
   */
  handleCheckIn() {
    wx.showLoading({
      title: '打卡中...',
      mask: true
    });

    // 模拟打卡接口请求
    setTimeout(() => {
      wx.hideLoading();
      
      // 获取当前时间
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const currentTime = `${hours}:${minutes}`;

      // 更新打卡状态和时间
      this.setData({
        checkStatus: 'completed',
        checkInTime: currentTime
      });

      // 打卡成功提示
      wx.showToast({
        title: '打卡成功',
        icon: 'success',
        duration: 2000
      });

      // 更新打卡记录（模拟）
      const newRecord = {
        id: Date.now(),
        date: this.data.currentDate,
        checkInTime: currentTime,
        checkOutTime: '',
        status: 'normal'
      };
      
      this.data.recordList.unshift(newRecord);
      this.setData({
        recordList: this.data.recordList
      });
    }, 1000);
  },

  /**
   * 查看全部打卡记录
   */
  handleShowAllRecord() {
    wx.navigateTo({
      url: '/pages/attendanceRecord/attendanceRecord'
    });
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  }
});