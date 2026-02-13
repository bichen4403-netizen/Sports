// 【Mock 开关】true = 前端独立看效果不请求后端；后端接好后改为 false
const { initMockTaskPools } = require("./utils/task-pools.js");

App({
  onLaunch() {
    if (this.globalData.useMock) {
      initMockTaskPools(this);
    }
  },
  globalData: {
    useMock: true,
    /** 统一任务池：taskPools[chatId] = { pending, accepted, completed, rejected } */
    taskPools: undefined
  }
});
