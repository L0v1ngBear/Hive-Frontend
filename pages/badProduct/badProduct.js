Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 筛选条件
    currentStatus: 'all',
    currentType: 'all',
    dateRange: '',
    currentDate: '',
    
    // 状态列表
    statusList: [
      { key: 'all', label: '全部' },
      { key: 'pending', label: '待处理' },
      { key: 'processed', label: '已处理' }
    ],
    
    // 次品类型列表
    typeList: [
      { key: 'all', label: '全部' },
      { key: 'quality', label: '质量问题' },
      { key: 'damage', label: '运输破损' },
      { key: 'wrong', label: '生产错误' },
      { key: 'other', label: '其他原因' }
    ],
    
    // 修复：提前处理picker的range数组，避免WXML中使用map
    typeLabelList: [],
    
    // 状态映射
    statusMap: {
      pending: '待处理',
      processed: '已处理'
    },
    
    // 类型映射
    typeMap: {
      quality: '质量问题',
      damage: '运输破损',
      wrong: '生产错误',
      other: '其他原因'
    },
    
    // 状态样式类
    statusClass: {
      pending: 'status-pending',
      processed: 'status-processed'
    },
    
    // 次品列表
    defectiveList: [
      {
        defectiveId: 'DC20260222001',
        orderId: 'OD20260222001',
        type: 'quality',
        createTime: '2026-02-22 09:30:00',
        creator: '李质检',
        quantity: 50,
        lossAmount: 2500,
        description: '面料存在明显色差，不符合订单要求',
        status: 'pending',
        processMethod: '',
        processRemark: ''
      },
      {
        defectiveId: 'DC20260222002',
        orderId: 'OD20260222002',
        type: 'damage',
        createTime: '2026-02-21 14:20:00',
        creator: '王仓库',
        quantity: 20,
        lossAmount: 800,
        description: '运输过程中包装破损，导致面料污染',
        status: 'processed',
        processMethod: '报废处理',
        processRemark: '已登记报废，计入损耗'
      },
      {
        defectiveId: 'DC20260222003',
        orderId: '',
        type: 'wrong',
        createTime: '2026-02-20 10:15:00',
        creator: '张车间',
        quantity: 30,
        lossAmount: 1500,
        description: '织造过程中参数设置错误，幅宽不符合要求',
        status: 'pending',
        processMethod: '',
        processRemark: ''
      }
    ],
    
    // 筛选后的列表
    filteredDefectiveList: [],
    
    // 弹窗控制
    showAddModal: false,
    showProcessModal: false,
    isEdit: false,
    
    // 表单数据
    formData: {
      defectiveId: '',
      orderId: '',
      type: 'quality',
      quantity: '',
      lossAmount: '',
      description: ''
    },
    
    // 处理表单数据
    processData: {
      method: '',
      remark: ''
    },
    
    // 当前操作的次品
    currentDefective: null,
    
    // 类型选择索引
    typeIndex: 0
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 获取当前日期
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const currentDate = `${year}-${month}-${day}`;
    
    // 修复：提前处理picker的range数组
    const typeLabelList = this.data.typeList.map(item => item.label);
    
    this.setData({
      currentDate,
      typeLabelList, // 初始化类型标签数组
      filteredDefectiveList: this.data.defectiveList
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
   * 打开新增弹窗
   */
  openAddModal() {
    // 重置表单
    this.setData({
      showAddModal: true,
      isEdit: false,
      formData: {
        defectiveId: '',
        orderId: '',
        type: 'quality',
        quantity: '',
        lossAmount: '',
        description: ''
      },
      typeIndex: 0
    });
  },

  /**
   * 关闭新增弹窗
   */
  closeAddModal() {
    this.setData({
      showAddModal: false
    });
  },

  /**
   * 打开编辑弹窗
   */
  openEditModal(e) {
    const defective = e.currentTarget.dataset.defective;
    // 查找类型索引
    const typeIndex = this.data.typeList.findIndex(item => item.key === defective.type);
    
    this.setData({
      showAddModal: true,
      isEdit: true,
      currentDefective: defective,
      formData: {
        defectiveId: defective.defectiveId,
        orderId: defective.orderId || '',
        type: defective.type,
        quantity: defective.quantity,
        lossAmount: defective.lossAmount,
        description: defective.description || ''
      },
      typeIndex: typeIndex > 0 ? typeIndex : 0
    });
  },

  /**
   * 打开处理弹窗
   */
  openProcessModal(e) {
    const defective = e.currentTarget.dataset.defective;
    this.setData({
      showProcessModal: true,
      currentDefective: defective,
      processData: {
        method: '',
        remark: ''
      }
    });
  },

  /**
   * 关闭处理弹窗
   */
  closeProcessModal() {
    this.setData({
      showProcessModal: false
    });
  },

  /**
   * 阻止事件冒泡
   */
  stopPropagation() {},

  /**
   * 输入框处理
   */
  handleInput(e) {
    const key = e.currentTarget.dataset.key;
    const value = e.detail.value;
    this.setData({
      [`formData.${key}`]: value
    });
  },

  /**
   * 处理表单输入
   */
  handleProcessInput(e) {
    const key = e.currentTarget.dataset.key;
    const value = e.detail.value;
    this.setData({
      [`processData.${key}`]: value
    });
  },

  /**
   * 切换次品类型
   */
  changeType(e) {
    const index = e.detail.value;
    const typeKey = this.data.typeList[index].key;
    this.setData({
      typeIndex: index,
      [`formData.type`]: typeKey !== 'all' ? typeKey : 'quality'
    });
  },

  /**
   * 提交次品信息
   */
  submitDefective() {
    const { formData, isEdit, defectiveList } = this.data;
    
    // 简单验证
    if (!formData.quantity || !formData.lossAmount) {
      wx.showToast({
        title: '数量和损失金额不能为空',
        icon: 'none'
      });
      return;
    }
    
    if (isEdit) {
      // 编辑模式
      const newList = defectiveList.map(item => {
        if (item.defectiveId === formData.defectiveId) {
          return {
            ...item,
            orderId: formData.orderId,
            type: formData.type,
            quantity: formData.quantity,
            lossAmount: formData.lossAmount,
            description: formData.description
          };
        }
        return item;
      });
      
      this.setData({
        defectiveList: newList,
        filteredDefectiveList: this.filterDefectiveList(newList),
        showAddModal: false
      });
      
      wx.showToast({
        title: '修改成功',
        icon: 'success'
      });
    } else {
      // 新增模式
      const now = new Date();
      const dateStr = now.getFullYear() + 
                      (now.getMonth() + 1).toString().padStart(2, '0') + 
                      now.getDate().toString().padStart(2, '0');
      const newId = `DC${dateStr}${(defectiveList.length + 1).toString().padStart(3, '0')}`;
      
      const newDefective = {
        defectiveId: newId,
        orderId: formData.orderId,
        type: formData.type,
        createTime: now.getFullYear() + '-' + 
                   (now.getMonth() + 1).toString().padStart(2, '0') + '-' + 
                   now.getDate().toString().padStart(2, '0') + ' ' + 
                   now.getHours().toString().padStart(2, '0') + ':' + 
                   now.getMinutes().toString().padStart(2, '0') + ':' + 
                   now.getSeconds().toString().padStart(2, '0'),
        creator: '当前用户', // 实际项目中替换为登录用户
        quantity: formData.quantity,
        lossAmount: formData.lossAmount,
        description: formData.description,
        status: 'pending',
        processMethod: '',
        processRemark: ''
      };
      
      const newList = [...defectiveList, newDefective];
      
      this.setData({
        defectiveList: newList,
        filteredDefectiveList: this.filterDefectiveList(newList),
        showAddModal: false
      });
      
      wx.showToast({
        title: '登记成功',
        icon: 'success'
      });
    }
  },

  /**
   * 确认处理
   */
  confirmProcess() {
    const { processData, currentDefective, defectiveList } = this.data;
    
    if (!processData.method) {
      wx.showToast({
        title: '处理方式不能为空',
        icon: 'none'
      });
      return;
    }
    
    const newList = defectiveList.map(item => {
      if (item.defectiveId === currentDefective.defectiveId) {
        return {
          ...item,
          status: 'processed',
          processMethod: processData.method,
          processRemark: processData.remark
        };
      }
      return item;
    });
    
    this.setData({
      defectiveList: newList,
      filteredDefectiveList: this.filterDefectiveList(newList),
      showProcessModal: false
    });
    
    wx.showToast({
      title: '标记处理成功',
      icon: 'success'
    });
  },

  /**
   * 状态筛选
   */
  handleStatusFilter(e) {
    const status = e.currentTarget.dataset.status;
    this.setData({
      currentStatus: status,
      filteredDefectiveList: this.filterDefectiveList(this.data.defectiveList)
    });
  },

  /**
   * 类型筛选
   */
  handleTypeFilter(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      currentType: type,
      filteredDefectiveList: this.filterDefectiveList(this.data.defectiveList)
    });
  },

  /**
   * 日期筛选
   */
  handleDateFilter(e) {
    const date = e.detail.value;
    this.setData({
      dateRange: date,
      filteredDefectiveList: this.filterDefectiveList(this.data.defectiveList)
    });
  },

  /**
   * 筛选次品列表
   */
  filterDefectiveList(list) {
    const { currentStatus, currentType, dateRange } = this.data;
    
    return list.filter(item => {
      // 状态筛选
      if (currentStatus !== 'all' && item.status !== currentStatus) {
        return false;
      }
      
      // 类型筛选
      if (currentType !== 'all' && item.type !== currentType) {
        return false;
      }
      
      // 日期筛选
      if (dateRange && !item.createTime.startsWith(dateRange)) {
        return false;
      }
      
      return true;
    });
  },

  /**
   * 打开详情页
   */
  openDetail(e) {
    const defective = e.currentTarget.dataset.defective;
    // 修复：简化字符串拼接，避免模板字符串嵌套错误
    let detailContent = `次品编号：${defective.defectiveId}\n`;
    detailContent += `关联订单：${defective.orderId || '无'}\n`;
    detailContent += `次品类型：${this.data.typeMap[defective.type]}\n`;
    detailContent += `登记时间：${defective.createTime}\n`;
    detailContent += `登记人：${defective.creator}\n`;
    detailContent += `次品数量：${defective.quantity}米\n`;
    detailContent += `损失金额：¥${defective.lossAmount}\n`;
    detailContent += `次品描述：${defective.description || '无'}\n`;
    detailContent += `处理状态：${this.data.statusMap[defective.status]}\n`;
    if (defective.processMethod) {
      detailContent += `处理方式：${defective.processMethod}\n`;
    }
    if (defective.processRemark) {
      detailContent += `处理备注：${defective.processRemark}\n`;
    }
    
    wx.showModal({
      title: '次品详情',
      content: detailContent,
      showCancel: false,
      confirmText: '知道了'
    });
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {},

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {},

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {},

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {},

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {},

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {},

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {}
});