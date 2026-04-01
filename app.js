// app.js
App({
  onLaunch() {
    // 监听全局报错
    wx.onError((err) => {
      console.log('【全局捕获的报错】:', err);
    });

    // 监听 Promise 中未被 catch 的 rejection (这个最容易引发 [object Object])
    wx.onUnhandledRejection((res) => {
      console.log('【未处理的 Promise 异常】:', res.reason);
    });
  },
  globalData: {
    baseUrl: 'https://www.dtvl.top' // 你的后端服务器地址
  }
})
