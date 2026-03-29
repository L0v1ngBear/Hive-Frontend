const { request } = require('../../utils/request.js');
const tenantCode = "TENANT_001"; 
const userId = "1";

Page({
  data: {
    currentParentId: 0,     
    breadcrumbs: [],        
    documentList: [],       
    
    // 核心新增：控制显示模式，'grid' 为大图标(Windows风格)，'list' 为列表
    viewMode: 'grid', 

    showCreateModal: false,
    showRenameModal: false,
    showMoveModal: false,
    
    newFolderName: '',
    renameDocId: '',
    renameDocName: '',
    newParentIdInput: '', 
  },

  onLoad() {
    this.loadDirectory(0);
  },

  // 切换视图模式 (大图标 / 列表)
  toggleViewMode() {
    this.setData({
      viewMode: this.data.viewMode === 'grid' ? 'list' : 'grid'
    });
  },

  // 加载目录
  async loadDirectory(parentId) {
    wx.showLoading({ title: '加载中' });
    this.setData({ currentParentId: parentId });
    
    try {
      // 获取当前目录列表（请确保后端返回的数据里带有标识文件夹还是文件的字段，如 type: 1(文件夹), 2(文件)）
      const res = await request({
        url: `/document/list?parentId=${parentId}`, 
        method: 'GET'
      });
      if (res.code === 200 || res.code === 0) {
        this.setData({ documentList: res.data || [] });
      }

      // 获取面包屑
      if (parentId === 0) {
        this.setData({ breadcrumbs: [{ id: 0, name: '根目录' }] });
      } else {
        const breadRes = await request({
          url: `/document/breadcrumbs?documentId=${parentId}`,
          method: 'GET'
        });
        if (breadRes.code === 200 || breadRes.code === 0) {
          this.setData({ breadcrumbs: breadRes.data || [] });
        }
      }
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 面包屑点击
  handleBreadcrumbClick(e) {
    const { id } = e.currentTarget.dataset;
    if (id !== this.data.currentParentId) {
      this.loadDirectory(id);
    }
  },

  // 单击图标：进入文件夹 或 预览文件
  handleItemClick(e) {
    const item = e.currentTarget.dataset.item;
    // 假设后端返回 type 为 1 代表是文件夹
    if (item.type === 1 || item.type === 'folder') {
      this.loadDirectory(item.id);
    } else {
      wx.showToast({ title: '文件预览开发中', icon: 'none' });
    }
  },

  // 长按图标 或 点击更多：弹出右键菜单 (重命名、移动、删除)
  handleItemLongPress(e) {
    const item = e.currentTarget.dataset.item;
    wx.vibrateShort(); // 长按给个震动反馈
    
    wx.showActionSheet({
      itemList: ['重命名', '移动', '删除'], 
      success: (res) => {
        if (res.tapIndex === 0) {
          this.setData({ showRenameModal: true, renameDocId: item.id, renameDocName: item.name });
        } else if (res.tapIndex === 1) {
          this.setData({ showMoveModal: true, renameDocId: item.id, newParentIdInput: '' });
        } else if (res.tapIndex === 2) {
          wx.showToast({ title: '删除功能开发中', icon: 'none' });
        }
      }
    });
  },

  // --- API 操作区 (与之前保持一致) ---
  async doCreateFolder() {
    if (!this.data.newFolderName) return wx.showToast({ title: '请输入名称', icon: 'none' });
    wx.showLoading({ title: '创建中' });
    try {
      await request({
        url: '/document/folder/create',
        method: 'POST',
        data: { parentId: this.data.currentParentId, name: this.data.newFolderName }
      });
      wx.showToast({ title: '创建成功', icon: 'success' });
      this.setData({ showCreateModal: false, newFolderName: '' });
      // 创建完立刻刷新当前目录，新文件夹就会显示出来
      this.loadDirectory(this.data.currentParentId); 
    } catch (e) {
      wx.showToast({ title: '创建失败', icon: 'none' });
    }
  },

  async doRename() {
    if (!this.data.renameDocName) return;
    wx.showLoading({ title: '修改中' });
    try {
      await request({
        url: `/document/document/rename?documentId=${this.data.renameDocId}&newName=${encodeURIComponent(this.data.renameDocName)}`,
        method: 'PUT'
      });
      wx.showToast({ title: '成功', icon: 'success' });
      this.setData({ showRenameModal: false });
      this.loadDirectory(this.data.currentParentId);
    } catch (e) {
      wx.showToast({ title: '失败', icon: 'none' });
    }
  },

  async doMove() {
    if (!this.data.newParentIdInput) return;
    wx.showLoading({ title: '移动中' });
    try {
      await request({
        url: `/document/document/move?documentId=${this.data.renameDocId}&newParentId=${this.data.newParentIdInput}`,
        method: 'PUT'
      });
      wx.showToast({ title: '成功', icon: 'success' });
      this.setData({ showMoveModal: false });
      this.loadDirectory(this.data.currentParentId);
    } catch (e) {
      wx.showToast({ title: '失败', icon: 'none' });
    }
  },

  chooseAndUploadFile() {
    wx.chooseMessageFile({
      count: 1, type: 'all',
      success: (res) => {
        const tempFile = res.tempFiles[0];
        wx.getFileSystemManager().readFile({
          filePath: tempFile.path,
          encoding: 'base64',
          success: async (data) => {
            wx.showLoading({ title: '上传中' });
            try {
              await request({
                url: '/document/file/upload',
                method: 'POST',
                data: { file: data.data }
              });
              wx.showToast({ title: '上传成功', icon: 'success' });
              this.loadDirectory(this.data.currentParentId);
            } catch (e) {
              wx.showToast({ title: '上传失败', icon: 'none' });
            }
          }
        });
      }
    });
  },

  onInput(e) { this.setData({ [e.currentTarget.dataset.field]: e.detail.value }); },
  openCreateModal() { this.setData({ showCreateModal: true, newFolderName: '新建文件夹' }); },
  closeModals() { this.setData({ showCreateModal: false, showRenameModal: false, showMoveModal: false }); }
});