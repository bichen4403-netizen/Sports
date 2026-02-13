// 擂台模式：左伙伴右我、中间成就值；发起任务在底部，历史任务独立页
const API_BASE = "";
const { getPendingForMe, acceptInvite, rejectInvite, createInvite, getCurrentTask } = require("../../utils/task-pools.js");

/** 最近2周日期范围：返回 { start: YYYY-MM-DD, end: YYYY-MM-DD } */
function getTaskDateRange() {
  const today = new Date();
  const start = formatDate(today);
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 14);
  const end = formatDate(endDate);
  return { start, end };
}

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 将 YYYY-MM-DD 格式化为展示文案（如 2月7日 周五） */
function formatDateDisplay(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const week = ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
  return `${m}月${day}日 周${week}`;
}

/** 成就值容器满格对应的数值（顶峰成就值，用于注入填充百分比） */
const SCORE_MAX = 5000;

const MOCK_PARTNERS = {
  "1": { id: "1", avatar: "/images/avatar-default.png", nickName: "跑步小能手", achieveScore: 1280 },
  "2": { id: "2", avatar: "/images/avatar-default.png", nickName: "步数达人", achieveScore: 960 },
  "3": { id: "3", avatar: "/images/avatar-default.png", nickName: "晨练伙伴", achieveScore: 1100 }
};

Page({
  data: {
    defaultAvatarUrl: "/images/avatar-default.png",
    chatId: "",
    partner: { avatar: "/images/avatar-default.png", nickName: "伙伴", achieveScore: 0 },
    me: { avatar: "/images/avatar-default.png", nickName: "我", achieveScore: 0 },
    commonAchieveScore: 0,
    scoreFillPercent: 0, // 成就值注入容器填充高度百分比（0~100）
    currentTask: null,
    pendingInvites: [], // 对方发给我、当前会话下的待处理邀请
    taskPanelVisible: false,
    rejectSheetVisible: false,
    rejectInviteId: null,
    rejectReasonOptions: ["时间冲突", "已有安排", "不方便", "其他"],
    rejectReasonIndex: 0,
    rejectReasonOtherIndex: 3,
    rejectReasonText: "",
    acceptReminderVisible: false,
    acceptInviteItem: null, // 当前要接受的那条邀请，用于弹层展示和提交提醒时间
    reminderOptions: [
      { text: "不提醒", minutes: 0 },
      { text: "提前15分钟", minutes: 15 },
      { text: "提前30分钟", minutes: 30 },
      { text: "提前1小时", minutes: 60 },
      { text: "提前2小时", minutes: 120 }
    ],
    reminderIndex: 0,
    taskDateStart: "", // 日期可选范围起（最近2周）
    taskDateEnd: "",
    taskDate: "", // YYYY-MM-DD
    taskDateDisplay: "", // 展示用如 2月7日 周五
    taskTime: "", // HH:mm，00:00-23:59
    taskPlace: "",
    taskPlaceAddress: "", // 地图选点返回的详细地址
    taskLocation: null, // { latitude, longitude } 地图选点坐标，提交任务可带给后端
    taskSportOptions: ["跑步", "骑行", "健走", "球类", "游泳", "其他"],
    taskSportIndex: 0,
    taskSportText: ""
  },

  onLoad(options) {
    const chatId = options.id || "";
    const { start: taskDateStart, end: taskDateEnd } = getTaskDateRange();
    const taskDate = taskDateStart;
    this.setData({
      chatId,
      taskDateStart,
      taskDateEnd,
      taskDate,
      taskDateDisplay: formatDateDisplay(taskDate),
      taskTime: "09:00"
    });
    this.loadArenaData(chatId);
    this.loadCurrentTask();
    this.loadPendingInvites(chatId);
  },

  onShow() {
    this.loadCurrentTask();
    this.loadPendingInvites(this.data.chatId);
  },

  /** 拉取对方发给我、当前会话下的待处理邀请；mock 从 taskPools[chatId].pending 取 */
  loadPendingInvites(chatId) {
    const app = getApp();
    if (!chatId) {
      this.setData({ pendingInvites: [] });
      return;
    }
    if (app.globalData.useMock) {
      const list = getPendingForMe(app, chatId);
      this.setData({ pendingInvites: list });
      return;
    }
    wx.request({
      url: `${API_BASE}/chat/task/pending-invites`,
      method: "GET",
      data: { chatId },
      header: { token: wx.getStorageSync("token") || "" },
      success: (res) => {
        if (res.data && res.data.code === 0 && res.data.data && res.data.data.list) {
          this.setData({ pendingInvites: res.data.data.list });
        } else {
          this.setData({ pendingInvites: [] });
        }
      },
      fail: () => this.setData({ pendingInvites: [] })
    });
  },

  /** 点击接受：先弹出提醒时间选择，确定后再真正接受 */
  openAcceptReminderSheet(e) {
    const inviteId = e.currentTarget.dataset.inviteId;
    const item = this.data.pendingInvites.find(i => i.inviteId === inviteId) || null;
    this.setData({
      acceptReminderVisible: true,
      acceptInviteItem: item,
      reminderIndex: 0
    });
  },

  hideAcceptReminderSheet() {
    this.setData({ acceptReminderVisible: false, acceptInviteItem: null });
  },

  onReminderOptionTap(e) {
    this.setData({ reminderIndex: parseInt(e.currentTarget.dataset.index, 10) });
  },

  /** 确定接受并提交提醒设置；若选了提前提醒则请求订阅消息（与微信提醒互通），后端在设定时间发送模板消息 */
  confirmAcceptWithReminder() {
    const { acceptInviteItem, reminderOptions, reminderIndex } = this.data;
    if (!acceptInviteItem) {
      this.setData({ acceptReminderVisible: false });
      return;
    }
    const inviteId = acceptInviteItem.inviteId;
    const reminderMinutes = reminderOptions[reminderIndex].minutes;
    const app = getApp();

    const doAccept = () => {
      if (app.globalData.useMock) {
        acceptInvite(app, this.data.chatId, inviteId);
        this.setData({
          pendingInvites: getPendingForMe(app, this.data.chatId),
          acceptReminderVisible: false,
          acceptInviteItem: null
        });
        this.loadCurrentTask();
        wx.showToast({
          title: reminderMinutes > 0 ? `已接受，将提前${reminderMinutes}分钟在微信提醒你` : "已接受",
          icon: "success"
        });
        return;
      }
      wx.request({
        url: `${API_BASE}/chat/task/accept`,
        method: "POST",
        data: {
          inviteId,
          reminderMinutes,
          taskDate: acceptInviteItem.taskDate,
          taskTime: acceptInviteItem.taskTime
        },
        header: { "content-type": "application/json", token: wx.getStorageSync("token") || "" },
        success: (res) => {
          if (res.data && res.data.code === 0) {
            this.loadPendingInvites(this.data.chatId);
            this.setData({ acceptReminderVisible: false, acceptInviteItem: null });
            wx.showToast({
              title: reminderMinutes > 0 ? `已接受，将提前${reminderMinutes}分钟提醒` : "已接受",
              icon: "success"
            });
          } else {
            wx.showToast({ title: res.data.msg || "操作失败", icon: "none" });
          }
        },
        fail: () => wx.showToast({ title: "网络错误", icon: "none" })
      });
    };

    if (reminderMinutes > 0 && !app.globalData.useMock) {
      const TASK_REMIND_TMPL_ID = ""; // 在小程序后台「订阅消息」中申请任务提醒模板，将模板 id 填在此处
      if (TASK_REMIND_TMPL_ID) {
        wx.requestSubscribeMessage({
          tmplIds: [TASK_REMIND_TMPL_ID],
          success: () => doAccept(),
          fail: () => {
            wx.showToast({ title: "需要授权才能接收提醒", icon: "none" });
          }
        });
      } else {
        doAccept();
      }
    } else {
      doAccept();
    }
  },

  /** 打开拒绝理由弹层 */
  openRejectSheet(e) {
    this.setData({
      rejectSheetVisible: true,
      rejectInviteId: e.currentTarget.dataset.inviteId,
      rejectReasonIndex: 0,
      rejectReasonText: ""
    });
  },

  hideRejectSheet() {
    this.setData({ rejectSheetVisible: false, rejectInviteId: null });
  },

  onRejectReasonTap(e) {
    this.setData({ rejectReasonIndex: parseInt(e.currentTarget.dataset.index, 10) });
  },

  onRejectReasonInput(e) {
    this.setData({ rejectReasonText: e.detail.value });
  },

  /** 确认拒绝：提交理由（预设 + 自定义说明） */
  confirmReject() {
    const { rejectInviteId, rejectReasonIndex, rejectReasonOptions, rejectReasonText } = this.data;
    const reasonType = rejectReasonOptions[rejectReasonIndex];
    const reasonText = (reasonType === "其他" ? rejectReasonText : "").trim() || (rejectReasonText || "").trim();
    const app = getApp();
    if (app.globalData.useMock) {
      rejectInvite(app, this.data.chatId, rejectInviteId, reasonType, reasonText);
      this.setData({
        pendingInvites: getPendingForMe(app, this.data.chatId),
        rejectSheetVisible: false,
        rejectInviteId: null
      });
      wx.showToast({ title: "已拒绝", icon: "none" });
      return;
    }
    wx.request({
      url: `${API_BASE}/chat/task/reject`,
      method: "POST",
      data: { inviteId: rejectInviteId, reasonType, reasonText },
      header: { "content-type": "application/json", token: wx.getStorageSync("token") || "" },
      success: (res) => {
        if (res.data && res.data.code === 0) {
          this.loadPendingInvites(this.data.chatId);
          this.setData({ rejectSheetVisible: false, rejectInviteId: null });
          wx.showToast({ title: "已拒绝", icon: "none" });
        } else {
          wx.showToast({ title: res.data.msg || "操作失败", icon: "none" });
        }
      },
      fail: () => wx.showToast({ title: "网络错误", icon: "none" })
    });
  },

  /** 擂台数据：伙伴信息 + 我的成就值；后端接好后改为接口 */
  loadArenaData(chatId) {
    const app = getApp();
    if (app.globalData.useMock) {
      const partner = MOCK_PARTNERS[chatId] || { avatar: "/images/avatar-default.png", nickName: "伙伴", achieveScore: 0 };
      const me = {
        avatar: "/images/avatar-default.png",
        nickName: "我",
        achieveScore: 1050
      };
      const commonAchieveScore = (partner.achieveScore || 0) + (me.achieveScore || 0);
      const scoreFillPercent = SCORE_MAX <= 0 ? 0 : Math.min(100, (commonAchieveScore / SCORE_MAX) * 100);
      this.setData({ partner, me, commonAchieveScore, scoreFillPercent });
      return;
    }
    // 后端接口：拉取擂台/伙伴信息及双方成就值
    wx.request({
      url: `${API_BASE}/chat/arena`,
      method: "GET",
      data: { chatId },
      header: { token: wx.getStorageSync("token") || "" },
      success: (res) => {
        if (res.data && res.data.code === 0 && res.data.data) {
          const d = res.data.data;
          const commonAchieveScore = d.commonAchieveScore != null ? d.commonAchieveScore : (d.partner && d.me ? (d.partner.achieveScore || 0) + (d.me.achieveScore || 0) : 0);
          const scoreFillPercent = SCORE_MAX <= 0 ? 0 : Math.min(100, (commonAchieveScore / SCORE_MAX) * 100);
          this.setData({
            partner: d.partner || this.data.partner,
            me: d.me || this.data.me,
            commonAchieveScore,
            scoreFillPercent
          });
        }
      },
      fail: () => {}
    });
  },

  /** 本界面只显示一个进行中任务；mock 时从 taskPools[chatId].accepted 取最新 */
  loadCurrentTask() {
    const app = getApp();
    const currentTask = getCurrentTask(app, this.data.chatId);
    this.setData({ currentTask: currentTask ? {
      time: (currentTask.taskDate || "") + " " + (currentTask.taskTime || ""),
      taskDate: currentTask.taskDate,
      taskTime: currentTask.taskTime,
      place: currentTask.place || "",
      sportType: currentTask.sportType || ""
    } : null });
  },

  /** 对方发起任务区域：左滑进入共同成就空间（成长地图） */
  onPendingSwipeStart(e) {
    if (e.touches && e.touches[0]) this._pendingTouchStartX = e.touches[0].clientX;
  },
  onPendingSwipeEnd(e) {
    if (!e.changedTouches || !e.changedTouches[0] || this._pendingTouchStartX == null) return;
    const endX = e.changedTouches[0].clientX;
    if (this._pendingTouchStartX - endX > 60) this.gotoSharedAchievementSpace();
    this._pendingTouchStartX = null;
  },
  /** 进入与伙伴共同的成就空间（成长地图页） */
  gotoSharedAchievementSpace() {
    wx.navigateTo({
      url: "/pages/achievement-shared/achievement-shared?chatId=" + this.data.chatId
    });
  },

  /** 点击伙伴头像：查看伙伴成就 */
  gotoPartnerAchievement() {
    wx.navigateTo({
      url: "/pages/achievement/achievement?target=partner&chatId=" + this.data.chatId
    });
  },
  /** 点击我的头像：查看我的成就 */
  gotoMyAchievement() {
    wx.navigateTo({
      url: "/pages/achievement/achievement?target=me"
    });
  },

  goTaskHistory() {
    wx.navigateTo({ url: "/pages/task-history/task-history?chatId=" + this.data.chatId });
  },

  showTaskPanel() {
    const { start: taskDateStart, end: taskDateEnd } = getTaskDateRange();
    const taskDate = this.data.taskDate || taskDateStart;
    this.setData({
      taskPanelVisible: true,
      taskDateStart,
      taskDateEnd,
      taskDate: taskDate >= taskDateStart && taskDate <= taskDateEnd ? taskDate : taskDateStart,
      taskDateDisplay: formatDateDisplay(taskDate >= taskDateStart && taskDate <= taskDateEnd ? taskDate : taskDateStart),
      taskTime: this.data.taskTime || "09:00",
      taskSportText: this.data.taskSportOptions[this.data.taskSportIndex] || ""
    });
  },

  hideTaskPanel() {
    this.setData({ taskPanelVisible: false });
  },

  onTaskDateChange(e) {
    const taskDate = e.detail.value;
    this.setData({
      taskDate,
      taskDateDisplay: formatDateDisplay(taskDate)
    });
  },

  onTaskTimeChange(e) {
    this.setData({ taskTime: e.detail.value });
  },

  /** 地图选点 API：打开微信内置地图选择地点，需用户授权位置 */
  chooseTaskPlace() {
    wx.chooseLocation({
      success: (res) => {
        this.setData({
          taskPlace: res.name || res.address || "已选地点",
          taskPlaceAddress: res.address || "",
          taskLocation: { latitude: res.latitude, longitude: res.longitude }
        });
      },
      fail: (err) => {
        if (err.errMsg && err.errMsg.indexOf("cancel") !== -1) {
          return;
        }
        wx.showToast({
          title: "选点失败，请检查位置权限",
          icon: "none"
        });
      }
    });
  },

  onTaskSportChange(e) {
    const i = e.detail.value;
    this.setData({
      taskSportIndex: i,
      taskSportText: this.data.taskSportOptions[i]
    });
  },

  /** 发起任务：日期+时间分开，地点来自地图选点；mock 时加入 taskPools[chatId].pending（待对方接受） */
  submitTask() {
    const { taskDate, taskDateDisplay, taskTime, taskPlace, taskPlaceAddress, taskLocation, taskSportText, chatId } = this.data;
    if (!taskPlace || !taskPlace.trim()) {
      wx.showToast({ title: "请先点击选择地点", icon: "none" });
      return;
    }
    if (!taskDate || !taskTime) {
      wx.showToast({ title: "请选择日期和时间", icon: "none" });
      return;
    }
    const app = getApp();
    const timeDisplay = (taskDateDisplay || taskDate) + " " + (taskTime || "09:00");
    const task = {
      taskDate,
      taskDateDisplay: taskDateDisplay || taskDate,
      taskTime: taskTime || "09:00",
      time: timeDisplay,
      place: taskPlace,
      placeAddress: taskPlaceAddress || "",
      sportType: taskSportText || "未选",
      chatId
    };
    if (app.globalData.useMock) {
      createInvite(app, chatId, task, this.data.partner?.nickName || "对方");
      const { start: nextDateStart } = getTaskDateRange();
      this.setData({
        taskPanelVisible: false,
        taskPlace: "",
        taskPlaceAddress: "",
        taskLocation: null,
        taskDate: nextDateStart,
        taskDateDisplay: formatDateDisplay(nextDateStart),
        taskTime: "09:00"
      });
      wx.showToast({ title: "已发起，等待对方接受", icon: "success" });
      return;
    }
    wx.request({
      url: `${API_BASE}/chat/task/invite`,
      method: "POST",
      data: {
        chatId,
        time: task.time,
        taskDate: task.taskDate,
        taskTime: task.taskTime,
        place: task.place,
        placeAddress: task.placeAddress,
        latitude: task.latitude,
        longitude: task.longitude,
        sportType: task.sportType
      },
      header: { "content-type": "application/json", token: wx.getStorageSync("token") || "" },
      success: (res) => {
        if (res.data && res.data.code === 0 && res.data.data) {
          const t = res.data.data.task || task;
          createInvite(app, chatId, t, this.data.partner?.nickName || "对方");
          const { start: nextDateStart } = getTaskDateRange();
          this.loadCurrentTask();
          this.setData({
            taskPanelVisible: false,
            taskPlace: "",
            taskPlaceAddress: "",
            taskLocation: null,
            taskDate: nextDateStart,
            taskDateDisplay: formatDateDisplay(nextDateStart),
            taskTime: "09:00"
          });
          wx.showToast({ title: "已发起", icon: "success" });
          const { start } = getTaskDateRange();
          this.setData({
            taskDate: start,
            taskDateDisplay: formatDateDisplay(start),
            taskTime: "09:00"
          });
        } else {
          wx.showToast({ title: res.data.msg || "发起失败", icon: "none" });
        }
      },
      fail: () => wx.showToast({ title: "网络错误", icon: "none" })
    });
  }
});
