// 历史任务页：展示该伙伴下的历史任务（进行中/完成/拒绝）；mock 时从 taskPools[chatId] 取
const { getHistoryTasks } = require("../../utils/task-pools.js");

Page({
  data: {
    chatId: "",
    taskList: []
  },

  onLoad(options) {
    const chatId = options.chatId || "";
    this.setData({ chatId });
    this.loadTaskList(chatId);
  },

  onShow() {
    this.loadTaskList(this.data.chatId);
  },

  loadTaskList(chatId) {
    const app = getApp();
    if (app.globalData.useMock) {
      const list = getHistoryTasks(app, chatId);
      this.setData({ taskList: list });
      return;
    }
    // 后端接口：GET /chat/task/list?chatId=xxx
    this.setData({ taskList: [] });
  }
});
