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

  // 模拟从后端获取数据，适配最新 DTO 结构
  mockGetSalesOrderData() {
    const mockData = [
      {
        orderId: 'SO20260312001',
        status: 'pending_confirm',
        customerName: '杭州锦绣服饰有限公司',
        projectName: '26春季新款预售',
        totalAmount: '14250.00',
        totalQuantity: 500.00,
        deliveryDate: '2026-03-20',
        createProductionOrder: 1, // 1-是 0-否
        expressCompany: '',
        expressNo: '',
        // 核心：明细中增加了 weight 和 spec
        items: [
          { 
            modelCode: 'T800-210', 
            quantity: 300.00, 
            weight: 120.5, // 克重
            spec: 150.0    // 规格/幅宽
          },
          { 
            modelCode: 'C600-180', 
            quantity: 200.00, 
            weight: 180.0, 
            spec: 160.0 
          }
        ]
      },
      {
        orderId: 'SO20260312002',
        status: 'pending_ship',
        customerName: '广州尚衣制造厂',
        projectName: '',
        totalAmount: '18200.00',
        totalQuantity: 1000.00,
        deliveryDate: '2026-03-15',
        createProductionOrder: 0,
        expressCompany: '',
        expressNo: '',
        items: [
          { 
            modelCode: 'C600-180', 
            quantity: 1000.00, 
            weight: 180.0, 
            spec: 160.0 
          }
        ]
      },
      {
        orderId: 'SO20260310005',
        status: 'shipped',
        customerName: '上海依米服装设计',
        projectName: '冬季联名款',
        totalAmount: '18240.00',
        totalQuantity: 800.00,
        deliveryDate: '2026-03-12',
        createProductionOrder: 1,
        expressCompany: '顺丰速运',
        expressNo: 'SF1234567890',
        items: [
          { 
            modelCode: 'N400-200', 
            quantity: 500.00, 
            weight: 210.0, 
            spec: 148.0 
          }
        ]
      }
    ];

    this.setData({
      orderList: mockData,
      filteredOrderList: mockData
    });
  },

  // 顶部 Tab 切换过滤
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

  // 按钮操作逻辑
  handleAction(e) {
    const { type, order } = e.currentTarget.dataset;
    
    const actionMap = {
      confirm: '确认接受该订单并进入待备料状态？',
      material_done: '确认备料已完成，开始排产？',
      produce_done: '确认生产已完成，进入仓库待发货？',
      ship: '前往录入物流单号发货？',
      finish: '确认该订单已送达并结算完成？',
      logistics: '查看当前物流轨迹？'
    };

    if (type === 'logistics') {
      wx.showToast({ title: '物流查询接口维护中', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '业务流转确认',
      content: actionMap[type] || '确认执行此操作？',
      confirmColor: '#1890FF',
      success: (res) => {
        if (res.confirm) {
          // 这里将来调用 API 修改订单状态
          wx.showLoading({ title: '处理中...' });
          setTimeout(() => {
            wx.hideLoading();
            wx.showToast({ title: '流转成功', icon: 'success' });
            // 重新刷新数据
            this.mockGetSalesOrderData();
          }, 600);
        }
      }
    });
  },

  // 跳转至新建页面
  handleCreateOrder() {
    // 确保这里的路径与你的实际目录一致
    wx.navigateTo({ url: '/pages/salesOrderCreate/salesOrderCreate' });
  },

  // 进入详情页
  openDetail(e) {
    const { order } = e.currentTarget.dataset;
    // 传递订单号进入详情页
    wx.navigateTo({
      url: `/pages/order/detail?orderId=${order.orderId}`
    });
  },

  handleBack() {
    wx.navigateBack({ delta: 1 });
  },

  handleSearch() {
    wx.showToast({ title: '搜索功能优化中', icon: 'none' });
  }
});