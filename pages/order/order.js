Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 筛选相关
    scrollTop: 0,
    currentFilter: 'all',
    filterList: [
      { key: 'all', label: '全部' },
      { key: 'pending_confirm', label: '待确认' },
      { key: 'pending_material', label: '备料中' },
      { key: 'producing', label: '生产中' },
      { key: 'pending_ship', label: '待发货' },
      { key: 'completed', label: '已完成' }
    ],
    // 订单列表
    orderList: [], // 原始订单数据
    filteredOrderList: [], // 筛选后的订单数据
    // 状态映射
    statusMap: {
      pending_confirm: '待确认',
      pending_material: '备料中',
      producing: '生产中',
      pending_ship: '待发货',
      completed: '已完成'
    },
    // 弹窗相关
    showModal: false,
    currentOrder: null,
    // 生产工序相关
    steps: ['整经', '浆纱', '织造', '验布', '卷布'],
    step: 0,
    // 状态更新相关
    nextStatusText: [],
    nextIndex: 0,
    // 新增：扫码更新状态相关
    targetStatusKey: '', // 扫码得到的目标状态key
    targetStatusText: '' // 扫码得到的目标状态文本
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 模拟获取订单数据（实际项目中替换为接口请求）
    this.mockGetOrderData();
  },

  /**
   * 模拟获取订单数据
   */
  mockGetOrderData() {
    const mockData = [
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
        process: 3 // 当前生产工序（织造）
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
        process: 0
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
        process: 5
      }
    ];

    this.setData({
      orderList: mockData,
      filteredOrderList: mockData
    });
  },

  /**
   * 筛选订单
   */
  handleFilter(e) {
    const filterKey = e.currentTarget.dataset.filter;
    let filteredList = this.data.orderList;

    if (filterKey !== 'all') {
      filteredList = this.data.orderList.filter(item => item.status === filterKey);
    }

    this.setData({
      currentFilter: filterKey,
      filteredOrderList: filteredList,
      scrollTop: 0
    });
  },

  /**
   * 打开更新状态弹窗
   */
  openUpdateModal(e) {
    const order = e.currentTarget.dataset.order;
    // 根据当前订单状态初始化弹窗数据
    let step = 0;
    let nextStatusText = [];
    let nextIndex = 0;

    // 生产中状态：初始化工序选择
    if (order.status === 'producing') {
      step = order.process - 1 >= 0 ? order.process - 1 : 0;
    } else {
      // 非生产中状态：获取可更新的下一级状态（保留原有逻辑，兼容过渡）
      nextStatusText = this.getNextStatusOptions(order.status);
    }

    this.setData({
      showModal: true,
      currentOrder: order,
      step: step,
      nextStatusText: nextStatusText,
      nextIndex: nextIndex,
      targetStatusKey: '', // 清空历史扫码状态
      targetStatusText: ''
    });
  },

  /**
   * 获取可更新的状态选项
   */
  getNextStatusOptions(currentStatus) {
    const statusOrder = [
      { key: 'pending_confirm', label: '待确认' },
      { key: 'pending_material', label: '备料中' },
      { key: 'producing', label: '生产中' },
      { key: 'pending_ship', label: '待发货' },
      { key: 'completed', label: '已完成' }
    ];

    // 找到当前状态的索引
    const currentIndex = statusOrder.findIndex(item => item.key === currentStatus);
    // 获取下一级及之后的状态（已完成则返回空）
    const nextStatus = statusOrder.slice(currentIndex + 1);
    
    return nextStatus.map(item => item.label);
  },

  /**
   * 切换生产工序
   */
  changeStep(e) {
    this.setData({
      step: e.detail.value
    });
  },

  /**
   * 切换订单状态（保留原有方法，兼容过渡）
   */
  changeNextStatus(e) {
    this.setData({
      nextIndex: e.detail.value
    });
  },

  /**
   * 新增：扫码更新非生产中订单的状态
   */
  scanToUpdateStatus() {
    const { currentOrder } = this.data;
    
    if (!currentOrder) {
      wx.showToast({
        title: '订单信息异常',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    wx.showLoading({
      title: '扫码中...',
      mask: true
    });

    // 调用微信扫码API
    wx.scanCode({
      onlyFromCamera: true, // 仅允许从相机扫码
      scanType: ['barCode', 'qrCode'], // 支持条形码和二维码
      success: (res) => {
        wx.hideLoading();
        
        try {
          // 解析扫码结果（支持两种格式：statusKey 或 状态名称）
          const scanResult = res.result.trim();
          let targetStatusKey = '';
          
          // 格式1：扫码结果是状态key（如pending_ship）
          if (['pending_confirm', 'pending_material', 'producing', 'pending_ship', 'completed'].includes(scanResult)) {
            targetStatusKey = scanResult;
          }
          // 格式2：扫码结果是状态名称（如待发货），转换为key
          else {
            const statusMapReverse = {
              '待确认': 'pending_confirm',
              '备料中': 'pending_material',
              '生产中': 'producing',
              '待发货': 'pending_ship',
              '已完成': 'completed'
            };
            targetStatusKey = statusMapReverse[scanResult];
          }

          // 验证状态是否有效
          if (!targetStatusKey) {
            wx.showToast({
              title: '扫码内容无效',
              icon: 'none',
              duration: 2000
            });
            return;
          }

          // 验证状态流转合理性（只能向后更新，不能回退）
          const statusOrder = ['pending_confirm', 'pending_material', 'producing', 'pending_ship', 'completed'];
          const currentIndex = statusOrder.findIndex(item => item === currentOrder.status);
          const targetIndex = statusOrder.findIndex(item => item === targetStatusKey);

          if (targetIndex <= currentIndex) {
            wx.showToast({
              title: '不能回退订单状态',
              icon: 'none',
              duration: 2000
            });
            return;
          }

          // 保存目标状态到数据中
          this.setData({
            targetStatusKey: targetStatusKey,
            targetStatusText: this.data.statusMap[targetStatusKey]
          });

          // 提示用户确认更新
          wx.showModal({
            title: '确认更新',
            content: `是否将订单【${currentOrder.orderId}】更新为【${this.data.statusMap[targetStatusKey]}】？`,
            confirmText: '确认',
            cancelText: '取消',
            success: (modalRes) => {
              if (modalRes.confirm) {
                this.confirmUpdateByScan(); // 执行扫码更新逻辑
              }
            }
          });

        } catch (error) {
          console.error('解析扫码结果失败：', error);
          wx.showToast({
            title: '解析失败，请重试',
            icon: 'none',
            duration: 2000
          });
        }
      },
      fail: (error) => {
        wx.hideLoading();
        // 排除用户主动取消的情况
        if (error.errMsg !== 'scanCode:fail cancel') {
          console.error('扫码失败：', error);
          wx.showToast({
            title: '扫码失败，请重试',
            icon: 'none',
            duration: 2000
          });
        }
      }
    });
  },

  /**
   * 新增：执行扫码更新订单状态的逻辑
   */
  confirmUpdateByScan() {
    const { currentOrder, targetStatusKey } = this.data;
    
    if (!currentOrder || !targetStatusKey) {
      wx.showToast({
        title: '更新参数异常',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    wx.showLoading({
      title: '更新中...',
      mask: true
    });

    try {
      // 构造更新后的订单数据
      const updatedOrder = { ...currentOrder };
      const statusOrder = ['pending_confirm', 'pending_material', 'producing', 'pending_ship', 'completed'];
      updatedOrder.status = targetStatusKey;
      updatedOrder.statusIndex = statusOrder.findIndex(item => item === targetStatusKey);

      // 更新订单列表（实际项目替换为接口请求）
      const newOrderList = this.data.orderList.map(item => {
        if (item.orderId === updatedOrder.orderId) {
          return updatedOrder;
        }
        return item;
      });

      // 重新筛选订单列表
      let newFilteredList = newOrderList;
      if (this.data.currentFilter !== 'all') {
        newFilteredList = newOrderList.filter(item => item.status === this.data.currentFilter);
      }

      this.setData({
        orderList: newOrderList,
        filteredOrderList: newFilteredList
      });

      // 关闭弹窗并提示成功
      this.closeModal();
      wx.hideLoading();
      wx.showToast({
        title: '状态更新成功',
        icon: 'success',
        duration: 2000
      });

    } catch (error) {
      wx.hideLoading();
      console.error('更新订单状态失败：', error);
      wx.showToast({
        title: '更新失败，请重试',
        icon: 'none',
        duration: 2000
      });
    }
  },

  /**
   * 确认更新订单状态（保留原有逻辑，处理生产中订单工序更新）
   */
  confirmUpdate() {
    const { currentOrder, step, nextIndex, nextStatusText, statusMap, steps } = this.data;
    let updatedOrder = { ...currentOrder };

    // 显示加载提示
    wx.showLoading({
      title: '更新中...',
      mask: true
    });

    try {
      // 生产中状态：更新工序
      if (currentOrder.status === 'producing') {
        const newProcess = parseInt(step) + 1;
        updatedOrder.process = newProcess;
        
        // 如果工序完成（卷布），自动更新为待发货
        if (newProcess >= 5) {
          updatedOrder.status = 'pending_ship';
          updatedOrder.statusIndex = 3;
        }

        // 更新订单列表
        const newOrderList = this.data.orderList.map(item => {
          if (item.orderId === updatedOrder.orderId) {
            return updatedOrder;
          }
          return item;
        });

        // 重新筛选订单列表
        let newFilteredList = newOrderList;
        if (this.data.currentFilter !== 'all') {
          newFilteredList = newOrderList.filter(item => item.status === this.data.currentFilter);
        }

        this.setData({
          orderList: newOrderList,
          filteredOrderList: newFilteredList,
          currentOrder: updatedOrder
        });

        // 隐藏弹窗
        this.closeModal();

        // 显示成功提示
        wx.showToast({
          title: '工序更新成功',
          icon: 'success',
          duration: 2000
        });
      }

    } catch (error) {
      console.error('更新订单状态失败：', error);
      wx.showToast({
        title: '更新失败，请重试',
        icon: 'none',
        duration: 2000
      });
    } finally {
      // 隐藏加载提示
      wx.hideLoading();
    }
  },

  /**
   * 关闭弹窗（新增清空扫码相关数据）
   */
  closeModal() {
    this.setData({
      showModal: false,
      currentOrder: null,
      step: 0,
      nextIndex: 0,
      nextStatusText: [],
      targetStatusKey: '', // 清空扫码目标状态
      targetStatusText: ''
    });
  },

  /**
   * 扫码更新订单（原有方法）
   */
  handleScanOrder() {
    // 调用微信扫码API
    wx.scanCode({
      success: (res) => {
        // 解析扫码结果（假设扫码返回订单号）
        const orderId = res.result;
        const targetOrder = this.data.orderList.find(item => item.orderId === orderId);
        
        if (targetOrder) {
          this.openUpdateModal({
            currentTarget: {
              dataset: {
                order: targetOrder
              }
            }
          });
        } else {
          wx.showToast({
            title: '未找到该订单',
            icon: 'none'
          });
        }
      },
      fail: (error) => {
        console.error('扫码失败：', error);
        wx.showToast({
          title: '扫码失败',
          icon: 'none'
        });
      }
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
   * 打开订单详情
   */
  openDetail(e) {
    const order = e.currentTarget.dataset.order;
    // 跳转到订单详情页（实际项目中补充跳转逻辑）
    wx.navigateTo({
      url: `/pages/orderDetail/orderDetail?orderId=${order.orderId}`
    });
  }
});