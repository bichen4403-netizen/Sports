// 引入独立工具函数（后续复制到团队项目时，只需保证utils路径正确）
import {
  calculateAchievementStatus,
  countUnlockedAchievements,
  DEFAULT_ACHIEVEMENT_RULES
} from '../../utils/achievement-utils.js';

Page({
  data: {
    achievementList: [],
    unlockedCount: 0,
    totalAchievements: 0,
    pageTitle: "我的运动成就" // target=partner 时为「TA的运动成就」
  },

  onLoad(options) {
    this.setData({
      target: options.target || "me",
      chatId: options.chatId || ""
    });
    this.initAchievements();
  },

  /**
   * 初始化成就数据；根据 target（me/partner）拉取对应用户数据并计算成就
   */
  async initAchievements() {
    try {
      const target = this.data.target || "me";
      const pageTitle = target === "partner" ? "TA的运动成就" : "我的运动成就";
      this.setData({ pageTitle });

      const userData = await this.getUserSportData(target, this.data.chatId);

      const achievementList = calculateAchievementStatus(DEFAULT_ACHIEVEMENT_RULES, userData);
      const unlockedCount = countUnlockedAchievements(achievementList);

      this.setData({
        achievementList,
        unlockedCount,
        totalAchievements: achievementList.length
      });
    } catch (error) {
      console.error("初始化成就数据失败：", error);
      wx.showToast({
        title: "数据加载失败",
        icon: "none"
      });
    }
  },

  /**
   * 获取运动数据：target=me 拉我的，target=partner 拉伙伴的（见 utils/api-interface.js）
   */
  async getUserSportData(target, chatId) {
    const app = getApp();
    if (app.globalData.useMock) {
      if (target === "partner") {
        return Promise.resolve({
          totalStep: 8000,
          continuousCheckIn: 3,
          totalRunDistance: 50
        });
      }
      return Promise.resolve({
        totalStep: 12500,
        continuousCheckIn: 5,
        totalRunDistance: 80
      });
    }
    const API_BASE = "";
    const url = target === "partner"
      ? `${API_BASE}/user/partner/sport-data`
      : `${API_BASE}/user/sport-data`;
    const data = target === "partner" ? { chatId } : {};
    return new Promise((resolve, reject) => {
      wx.request({
        url,
        method: "GET",
        data,
        header: { token: wx.getStorageSync("token") || "" },
        success: (res) => {
          if (res.data && res.data.code === 0 && res.data.data) {
            resolve(res.data.data);
          } else {
            reject(new Error((res.data && res.data.msg) || "数据异常"));
          }
        },
        fail: (err) => reject(err)
      });
    });
  },

  gotoChat() {
    wx.navigateBack();
  }
});