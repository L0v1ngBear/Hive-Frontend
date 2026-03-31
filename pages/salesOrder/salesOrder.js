Page({
  data: {
    currentFilter: 'all',
    filterList: [
      { key: 'all', label: '全部' },
      { label: '待确认', key: 'pending_confirm' },
      { label: '备料中', key: 'pending_material' },
      { label: '生产中', key: 'producing' },
      { label: '待发货', key: 'pending_ship' },
      { label: '已发货', key: 'shipped' },
      { label: '已完成', key: 'completed' }
    ],
    orderList: [],
    filteredOrderList: [],
    statusMap: {
      'pending_confirm': '待确认',
      'pending_material': '备料中',
      'producing': '生产中',
      'pending_ship': '待发货',
      'shipped': '已发货',
      'completed': '已完成'
    },
  },

  onLoad(options) {
    this.mockGetSalesOrderData();
  },

  mockGetSalesOrderData() {
    // 【核心修改点】：模拟后端新的一对多（主子表）数据结构
    const mockData = [
      {
        orderId: 'SO20260312001',
        status: 'pending_confirm',
        customerName: '杭州锦绣服饰有限公司',
        projectName: '26春季新款预售',
        totalAmount: '14250.00',
        totalQuantity: 500,
        deliveryDate: '2026-03-20',
        expressCompany: '',
        expressNo: '',
        // 新增的明细列表
        items: [
          { modelCode: 'T800-210', goodsDesc: '涤纶弹力布', quantity: 300 },
          { modelCode: 'C600-180', goodsDesc: '纯棉平纹布', quantity: 200 }
        ]
      },
      {
        orderId: 'SO20260312002',
        status: 'pending_ship',
        customerName: '广州尚衣制造厂',
        projectName: '',
        totalAmount: '18200.00',
        totalQuantity: 1000,
        deliveryDate: '2026-03-15',
        expressCompany: '',
        expressNo: '',
        items: [
          { modelCode: 'C600-180', goodsDesc: '纯棉平纹布', quantity: 1000 }
        ]
      },
      {
        orderId: 'SO20260310005',
        status: 'shipped',
        customerName: '上海依米服装设计',
        projectName: '冬季联名款',
        totalAmount: '18240.00',
        totalQuantity: 800,
        deliveryDate: '2026-03-12',
        expressCompany: '顺丰速运',
        expressNo: 'SF1234567890',
        items: [
          { modelCode: 'N400-200', goodsDesc: '尼龙牛津布', quantity: 500 },
          { modelCode: 'F300-150', goodsDesc: '复合摇粒绒', quantity: 300 }
        ]
      }
    ];

    this.setData({
      orderList: mockData,
      filteredOrderList: mockData
    });
  },

  handleFilter(e) {
    const filterKey = e.currentTarget.dataset.filter;
    let filteredList = this.data.orderList;

    if (filterKey !== 'all') {
      filteredList = this.data.orderList.filter(item => item.status === filterKey);
    }

    this.setData({
      currentFilter: filterKey,
      filteredOrderList: filteredList
    });
  },

  handleAction(e) {
    const { type, order } = e.currentTarget.dataset;
    
    const actionMap = {
      confirm: '确认接受该订单？',
      material_done: '确认备料已完成，流转至生产？',
      produce_done: '确认生产已完成，流转至待发货？',
      ship: '准备发货并录入物流单号？',
      finish: '确认客户已签收并完成订单？'
    };

    if (type === 'logistics') {
      wx.showToast({ title: '物流信息加载中...', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '操作确认',
      content: actionMap[type],
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '操作成功', icon: 'success' });
        }
      }
    });
  },

  handleCreateOrder() {
    wx.navigateTo({ url: '/pages/salesOrderCreate/salesOrderCreate' });
  },

  openDetail(e) {
    const order = e.currentTarget.dataset.order;
    wx.showToast({
      title: '开发中: ' + order.orderId,
      icon: 'none'
    });
  },

  handleBack() {
    wx.navigateBack({ delta: 1 });
  },

  handleSearch() {
    wx.showToast({ title: '搜索功能开发中', icon: 'none' });
  }
});