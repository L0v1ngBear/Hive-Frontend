Page({
  data: {
    currentFilter: 'all',
    filterList: [
      { key: 'all', label: '全部' },
      { key: 'pending_pay', label: '待收款' },
      { key: 'pending_ship', label: '待发货' },
      { key: 'shipped', label: '已发货' },
      { key: 'completed', label: '已完成' }
    ],
    orderList: [],
    filteredOrderList: [],
    statusMap: {
      pending_pay: '待收款',
      pending_ship: '待发货',
      shipped: '已发货',
      completed: '已完成',
      cancelled: '已取消'
    }
  },

  onLoad(options) {
    this.mockGetSalesOrderData();
  },

  mockGetSalesOrderData() {
    // 模拟销售订单数据
    const mockData = [
      {
        orderId: 'SO20260312001',
        status: 'pending_pay',
        customerName: '杭州锦绣服饰有限公司',
        goodsDesc: 'T800-210 涤纶弹力布 等2件',
        totalAmount: '14250.00',
        totalQuantity: 500,
        deliveryDate: '2026-03-20',
        expressCompany: '',
        expressNo: ''
      },
      {
        orderId: 'SO20260312002',
        status: 'pending_ship',
        customerName: '广州尚衣制造厂',
        goodsDesc: 'C600-180 纯棉平纹布',
        totalAmount: '18200.00',
        totalQuantity: 1000,
        deliveryDate: '2026-03-15',
        expressCompany: '',
        expressNo: ''
      },
      {
        orderId: 'SO20260310005',
        status: 'shipped',
        customerName: '上海依米服装设计',
        goodsDesc: 'N400-200 尼龙牛津布',
        totalAmount: '18240.00',
        totalQuantity: 800,
        deliveryDate: '2026-03-12',
        expressCompany: '顺丰速运',
        expressNo: 'SF1234567890'
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
    
    // 模拟按钮操作交互
    const actionMap = {
      pay: '确认已收到款项？',
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
          // 此处可调用接口刷新列表
        }
      }
    });
  },

  openDetail(e) {
    const order = e.currentTarget.dataset.order;
    // 预留销售订单详情页跳转
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