Page({
  /**
   * 页面的初始数据
   */
  data: {
    orderId: '', // 接收的订单ID
    orderDetail: {}, // 订单详情数据
    totalPrice: '0.00', // 计算好的总价（新增）
    statusMap: {
      pending_confirm: '待确认',
      pending_material: '备料中',
      producing: '生产中',
      pending_ship: '待发货',
      completed: '已完成'
    },
    statusClass: '', // 状态标签样式类
    steps: ['整经', '浆纱', '织造', '验布', '卷布'], // 生产工序
    statusLog: [ // 状态流转记录
      { id: 1, statusText: '创建订单', time: '2026-02-12 10:30:00', operator: '系统', current: false },
      { id: 2, statusText: '待确认', time: '2026-02-12 11:00:00', operator: '李主管', current: false },
      { id: 3, statusText: '备料中', time: '2026-02-12 14:00:00', operator: '王仓库', current: false },
      { id: 4, statusText: '生产中', time: '2026-02-13 09:00:00', operator: '张厂长', current: true }
    ]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 获取从订单管理页传递的订单ID
    const { orderId } = options;
    if (!orderId) {
      wx.showToast({
        title: '订单ID异常',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    this.setData({
      orderId
    });

    // 获取订单详情数据（实际项目替换为接口请求）
    this.getOrderDetail();
  },

  /**
   * 获取订单详情数据
   */
  getOrderDetail() {
    wx.showLoading({
      title: '加载中...',
      mask: true
    });

    // 模拟接口请求（实际项目替换为真实接口）
    setTimeout(() => {
      // 根据订单ID匹配模拟数据
      const mockOrderList = [
        {
          orderId: 'TZ20260212001',
          status: 'producing',
          statusIndex: 2,
          model: 'T800-210',
          fabric: '涤纶弹力布',
          weight: 280,
          width: 150,
          color: '藏青色',
          quantity: 500,
          price: 28.5,
          process: 3, // 当前生产工序（织造）
          createTime: '2026-02-12 10:30:00',
          customerName: 'XX纺织贸易有限公司',
          contact: '张经理 138XXXX8888'
        },
        {
          orderId: 'TZ20260212002',
          status: 'pending_confirm',
          statusIndex: 0,
          model: 'C600-180',
          fabric: '纯棉平纹布',
          weight: 180,
          width: 148,
          color: '白色',
          quantity: 1000,
          price: 18.2,
          process: 0,
          createTime: '2026-02-12 09:15:00',
          customerName: 'YY服装加工厂',
          contact: '刘厂长 139XXXX9999'
        },
        {
          orderId: 'TZ20260212003',
          status: 'pending_ship',
          statusIndex: 3,
          model: 'N400-200',
          fabric: '尼龙牛津布',
          weight: 200,
          width: 152,
          color: '黑色',
          quantity: 800,
          price: 22.8,
          process: 5,
          createTime: '2026-02-11 16:20:00',
          customerName: 'ZZ箱包有限公司',
          contact: '陈采购 137XXXX7777'
        }
      ];

      // 匹配当前订单ID的详情
      const orderDetail = mockOrderList.find(item => item.orderId === this.data.orderId) || {};
      // 设置状态标签样式类
      const statusClass = `status-${orderDetail.status}`;

      // 修复：在JS中计算总价并保留两位小数
      let totalPrice = '0.00';
      if (orderDetail.quantity && orderDetail.price) {
        totalPrice = (orderDetail.quantity * orderDetail.price).toFixed(2);
      }

      // 更新状态流转记录（根据当前状态）
      let statusLog = this.data.statusLog;
      if (orderDetail.status === 'pending_confirm') {
        statusLog = [
          { id: 1, statusText: '创建订单', time: '2026-02-12 09:15:00', operator: '系统', current: false },
          { id: 2, statusText: '待确认', time: '2026-02-12 09:20:00', operator: '系统', current: true }
        ];
      } else if (orderDetail.status === 'pending_ship') {
        statusLog = [
          { id: 1, statusText: '创建订单', time: '2026-02-11 16:20:00', operator: '系统', current: false },
          { id: 2, statusText: '待确认', time: '2026-02-11 16:30:00', operator: '李主管', current: false },
          { id: 3, statusText: '备料中', time: '2026-02-11 17:00:00', operator: '王仓库', current: false },
          { id: 4, statusText: '生产中', time: '2026-02-12 10:00:00', operator: '张厂长', current: false },
          { id: 5, statusText: '待发货', time: '2026-02-12 16:00:00', operator: '赵质检', current: true }
        ];
      } else if (orderDetail.status === 'completed') {
        statusLog = [
          { id: 1, statusText: '创建订单', time: '2026-02-10 09:00:00', operator: '系统', current: false },
          { id: 2, statusText: '待确认', time: '2026-02-10 09:10:00', operator: '李主管', current: false },
          { id: 3, statusText: '备料中', time: '2026-02-10 10:00:00', operator: '王仓库', current: false },
          { id: 4, statusText: '生产中', time: '2026-02-10 14:00:00', operator: '张厂长', current: false },
          { id: 5, statusText: '待发货', time: '2026-02-11 10:00:00', operator: '赵质检', current: false },
          { id: 6, statusText: '已完成', time: '2026-02-11 15:00:00', operator: '孙物流', current: true }
        ];
      }

      this.setData({
        orderDetail,
        statusClass,
        statusLog,
        totalPrice // 新增：设置计算好的总价
      });

      wx.hideLoading();
    }, 800);
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
   * 跳转到更新状态页面/弹窗
   */
  handleUpdateStatus() {
    // 跳转回订单管理页并打开更新状态弹窗（或直接在详情页实现更新弹窗）
    wx.navigateBack({
      delta: 1,
      success: () => {
        // 通知订单管理页打开对应订单的更新弹窗（需在订单管理页监听）
        const eventChannel = this.getOpenerEventChannel();
        eventChannel.emit('updateOrderStatus', {
          orderId: this.data.orderId
        });
      }
    });
  }
});