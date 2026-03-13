const { request } = require('../../utils/request.js');

Page({
  data: {
    customerList: [],
    allCustomers: [], // 用于本地搜索备份
  },

  onShow() {
    this.fetchCustomerList();
  },

  /**
   * 返回上一页
   */
  handleBack() {
    wx.navigateBack({
      delta: 1
    });
  },

  // 获取全部客户数据
  async fetchCustomerList() {
    wx.showLoading({ title: '加载中...' });
    try {
      // 预留接口请求
      // const res = await request({ url: '/api/customer/list', method: 'GET' });
      // 模拟数据
      const mockData = [
        { id: 1, companyName: '中建八局', customerType: 1, region: '上海', projectName: '智慧中心', projectCount: 3 },
        { id: 2, companyName: '恒大地产', customerType: 2, region: '广东', projectName: '恒大绿洲', projectCount: 1 }
      ];
      this.setData({
        customerList: mockData,
        allCustomers: mockData
      });
    } catch (err) {
      console.error(err);
    } finally {
      wx.hideLoading();
    }
  },

  // 搜索逻辑
  handleSearch(e) {
    const keyword = e.detail.value.toLowerCase();
    const filtered = this.data.allCustomers.filter(item => 
      item.companyName.toLowerCase().includes(keyword)
    );
    this.setData({ customerList: filtered });
  },

  goToAdd() {
    wx.navigateTo({ url: '/pages/customer/customerEdit' });
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/customer/customerEdit?id=${id}` });
  }
});