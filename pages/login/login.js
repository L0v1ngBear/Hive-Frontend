const requestUtil = require('../../utils/request.js');
const authUtil = require('../../utils/auth.js');
const tenantUtil = require('../../utils/tenant.js');

Page({
  data: {
    isAgreed: false,
    tenantCode: 'TENANT_001',
    username: '',
    password: '',
    submitting: false,
    redirect: ''
  },

  onLoad(options = {}) {
    this.setData({
      redirect: decodeURIComponent(options.redirect || '')
    });
    const tenantInfo = tenantUtil.getTenantInfo();
    if (tenantInfo.code) {
      this.setData({ tenantCode: tenantInfo.code });
    }
  },

  toggleAgreement() {
    this.setData({
      isAgreed: !this.data.isAgreed
    });
    wx.vibrateShort({ type: 'light' });
  },

  handleInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
  },

  async handleAccountLogin() {
    if (!this.data.isAgreed) {
      wx.showToast({ title: '请先勾选协议', icon: 'none' });
      return;
    }
    if (!this.data.tenantCode || !this.data.username || !this.data.password) {
      wx.showToast({ title: '请填写租户码、账号和密码', icon: 'none' });
      return;
    }
    if (this.data.submitting) {
      return;
    }

    this.setData({ submitting: true });
    try {
      const res = await requestUtil.post('/auth/login', {
        tenantCode: this.data.tenantCode.trim(),
        username: this.data.username.trim(),
        password: this.data.password
      }, { needAuth: false, needTenant: false });

      authUtil.saveLoginSession(res.data || {});
      wx.showToast({ title: '登录成功', icon: 'success' });

      const target = this.data.redirect || '/pages/index/index';
      setTimeout(() => {
        wx.reLaunch({ url: target });
      }, 300);
    } catch (error) {
      console.error('登录失败', error);
    } finally {
      this.setData({ submitting: false });
    }
  },

  handleWechatLogin() {
    wx.showToast({ title: '微信一键登录暂未接通，请先使用账号密码登录', icon: 'none' });
  },

  handlePhoneLogin() {
    this.handleAccountLogin();
  },

  openProtocol() {
    console.log('打开用户协议');
  },

  openPrivacy() {
    console.log('打开隐私政策');
  },

  openRule() {
    console.log('打开数字化管理准则');
  }
});
