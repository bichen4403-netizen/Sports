// 成就兑换空间：共同成就值兑换奖励

Page({
  data: {
    chatId: "",
    commonScore: 0
  },

  onLoad(options) {
    this.setData({
      chatId: options.chatId || "",
      commonScore: options.commonScore || 0
    });
  },

  goBack() {
    wx.navigateBack();
  }
});
