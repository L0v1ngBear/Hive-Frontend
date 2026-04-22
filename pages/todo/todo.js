const requestUtil = require('../../utils/request.js');
const authUtil = require('../../utils/auth.js');
const subscribeUtil = require('../../utils/subscribe.js');

const FILTERS = [
  { label: '全部', value: 'all' },
  { label: '审批', value: 'approval' },
  { label: '订单', value: 'order' },
  { label: '打印', value: 'print' },
  { label: '质量', value: 'quality' }
];

Page({
  data: {
    filters: FILTERS,
    activeType: 'all',
    list: [],
    pageNum: 1,
    pageSize: 20,
    total: 0,
    loading: false,
    finished: false
  },

  onLoad(options = {}) {
    if (!authUtil.requireLogin('/pages/todo/todo')) {
      return;
    }
    if (options.type) {
      this.setData({ activeType: options.type });
    }
    this.fetchList(true);
  },

  onPullDownRefresh() {
    this.fetchList(true).finally(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (!this.data.finished && !this.data.loading) {
      this.fetchList(false);
    }
  },

  async fetchList(reset = false) {
    const nextPage = reset ? 1 : this.data.pageNum + 1;
    this.setData({ loading: true });

    try {
      const res = await requestUtil.get('/todo/list', {
        showLoading: reset,
        data: {
          pageNum: nextPage,
          pageSize: this.data.pageSize,
          type: this.data.activeType
        }
      });
      const page = res.data || {};
      const records = page.data || [];
      const merged = reset ? records : this.data.list.concat(records);

      this.setData({
        list: merged,
        total: page.total || 0,
        pageNum: nextPage,
        finished: merged.length >= (page.total || 0),
        loading: false
      });
    } catch (error) {
      console.error('获取待办列表失败', error);
      this.setData({ loading: false });
    }
  },

  handleBack() {
    wx.navigateBack({
      fail: () => wx.reLaunch({ url: '/pages/index/index' })
    });
  },

  handleFilterTap(e) {
    const type = e.currentTarget.dataset.type;
    if (type === this.data.activeType) {
      return;
    }
    this.setData({
      activeType: type,
      list: [],
      pageNum: 1,
      finished: false
    });
    this.fetchList(true);
  },

  handleTodoTap(e) {
    const item = e.currentTarget.dataset.item || {};
    if (!authUtil.requireLogin('/pages/todo/todo')) {
      return;
    }

    if (item.route && item.route !== '/pages/index/index') {
      wx.navigateTo({ url: item.route });
      return;
    }

    wx.showToast({
      title: item.content || '请前往对应业务页面处理',
      icon: 'none'
    });
  },

  async handleSubscribeTap() {
    try {
      await subscribeUtil.requestTodoSubscribe();
    } catch (error) {
      if ((error.errMsg || '').includes('cancel')) {
        return;
      }
      console.error('订阅待办提醒失败', error);
    }
  }
});
