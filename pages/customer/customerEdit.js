const { request } = require('../../utils/request.js');

Page({
  data: {
    typeRange: ['请选择', '总包', '业主'],
    typeIndex: 0,
    contacts: [{ name: '', phone: '' }] // 初始一个联系人
  },
  /**
   * 返回上一页
   */
  handleBack() {
    wx.navigateBack({
      delta: 1
    });
  },
  onLoad(options) {
    if (options.id) {
      this.setData({ isEdit: true });
      this.fetchCustomerDetail(options.id);
      wx.setNavigationBarTitle({ title: '客户详情' });
    } else {
      wx.setNavigationBarTitle({ title: '新增客户' });
    }
  },

  async fetchCustomerDetail(id) {
    // 模拟根据ID获取详情并填充 data
    // const res = await request({ url: `/api/customer/detail/${id}` });
    // this.setData({ ...res.data });
  },

  // 改变客户类型
  handleTypeChange(e) {
    this.setData({ typeIndex: e.detail.value });
  },

  // 添加联系人项
  handleAddContact() {
    const contacts = this.data.contacts;
    contacts.push({ name: '', phone: '' });
    this.setData({ contacts });
  },

  // 删除联系人项
  handleRemoveContact(e) {
    const index = e.currentTarget.dataset.index;
    const contacts = this.data.contacts;
    contacts.splice(index, 1);
    this.setData({ contacts });
  },

  // 监听联系人输入
  handleContactInput(e) {
    const { index, field } = e.currentTarget.dataset;
    const contacts = this.data.contacts;
    contacts[index][field] = e.detail.value;
    this.setData({ contacts });
  },

  // 提交表单
  async handleFormSubmit(e) {
    const formData = e.detail.value;
    const postData = {
      ...formData,
      customerType: this.data.typeIndex,
      contactInfo: JSON.stringify(this.data.contacts) // 序列化联系人数组
    };

    if (!postData.companyName) {
      wx.showToast({ title: '公司名称必填', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });
    try {
      // 预留接口提交，具体url需根据后端Controller定义
      // await request({ url: 'https://你的域名/api/customer/add', method: 'POST', data: postData });
      wx.showToast({ title: '录入成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1500);
    } catch (err) {
      console.error(err);
    } finally {
      wx.hideLoading();
    }
  }
});