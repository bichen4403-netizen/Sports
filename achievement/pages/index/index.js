// 【需后端接口】本页会话列表由接口返回，需含 sportType、activityScore 以支持筛选排序，见 utils/api-interface.js
const API_BASE = "";
const { getCalendarTasks, markTaskCompleted } = require("../../utils/task-pools.js");

const SPORT_TYPES = ["全部", "跑步", "骑行", "羽毛球"];
const ACTIVITY_SORT = ["默认顺序", "最活跃优先", "最近活跃优先"];
const WEEK_HEADERS = ["日", "一", "二", "三", "四", "五", "六"];

/** 火花与活跃程度映射：活跃一天（当天至少一项发起或接受任务）火花值 +1；展示时 sparkCount = activityScore（有活动天数） */
const MOCK_CHAT_LIST = [
  { id: "1", avatar: "/images/avatar-default.png", nickName: "跑步小能手", lastMessage: "今天跑了5公里，你呢？", lastTime: "10:30", sportType: "跑步", activityScore: 18 },
  { id: "2", avatar: "/images/avatar-default.png", nickName: "步数达人", lastMessage: "我刚解锁了步数成就～", lastTime: "昨天", sportType: "骑行", activityScore: 5 },
  { id: "3", avatar: "/images/avatar-default.png", nickName: "晨练伙伴", lastMessage: "明天早上一起？", lastTime: "周一", sportType: "羽毛球", activityScore: 22 },
  { id: "4", avatar: "/images/avatar-default.png", nickName: "夜跑党", lastMessage: "晚上操场见", lastTime: "昨天", sportType: "跑步", activityScore: 8 },
  { id: "5", avatar: "/images/avatar-default.png", nickName: "周末骑友", lastMessage: "周六环湖？", lastTime: "周三", sportType: "骑行", activityScore: 12 }
];

Page({
  data: {
    defaultAvatarUrl: "/images/avatar-default.png",
    chatList: [],
    displayList: [],
    sportTypeOptions: SPORT_TYPES,
    sportTypeIndex: 0,
    activitySortOptions: ACTIVITY_SORT,
    activitySortIndex: 0,
    filterEmptyTip: "暂无匹配伙伴，去匹配一个吧～",
    calendarYear: 0,
    calendarMonth: 0,
    calendarTitle: "",
    weekHeaders: WEEK_HEADERS,
    calendarDays: [],
    showTaskDetailModal: false,
    taskDetailDate: "",
    taskDetailList: [],
    showCompleteForm: false,
    completeFormTask: null,
    completeDuration: "",
    completeRatingIndex: 0,
    completeRatingOptions: ["1星", "2星", "3星", "4星", "5星"]
  },

  onLoad() {
    const now = new Date();
    this.setData({
      calendarYear: now.getFullYear(),
      calendarMonth: now.getMonth() + 1
    }, () => {
      this.buildCalendarDays();
    });
    this.getChatList();
  },

  onShow() {
    if (this.data.calendarYear && this.data.calendarMonth) {
      this.buildCalendarDays();
    }
  },

  /** 根据当前月份与搭子类型筛选，得到本月内「已接受+已完成」任务日期集合，并生成日历 42 格 */
  buildCalendarDays() {
    const { calendarYear, calendarMonth, sportTypeIndex } = this.data;
    const sportFilter = SPORT_TYPES[sportTypeIndex];
    const app = getApp();
    const list = getCalendarTasks(app);
    const filtered = sportFilter === "全部"
      ? list
      : list.filter(item => (item.sportType || "") === sportFilter);
    const markedSet = new Set(
      filtered
        .map(item => item.taskDate)
        .filter(dateStr => {
          if (!dateStr || dateStr.length < 7) return false;
          const parts = dateStr.split("-");
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          return y === calendarYear && m === calendarMonth;
        })
    );
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const firstDay = new Date(calendarYear, calendarMonth - 1, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth, 0).getDate();
    const days = [];
    const prefixEmpty = startWeekday;
    for (let i = 0; i < prefixEmpty; i++) {
      days.push({ day: 0, dateKey: "", hasDot: false, isCurrentMonth: false, isToday: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${calendarYear}-${String(calendarMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ day: d, dateKey, hasDot: markedSet.has(dateKey), isCurrentMonth: true, isToday: dateKey === todayStr });
    }
    const total = 42;
    while (days.length < total) {
      days.push({ day: 0, dateKey: "", hasDot: false, isCurrentMonth: false, isToday: false });
    }
    const calendarTitle = `${calendarYear}年${calendarMonth}月`;
    this.setData({ calendarDays: days, calendarTitle });
  },

  prevMonth() {
    let { calendarYear, calendarMonth } = this.data;
    if (calendarMonth === 1) {
      calendarYear -= 1;
      calendarMonth = 12;
    } else {
      calendarMonth -= 1;
    }
    this.setData({ calendarYear, calendarMonth }, () => this.buildCalendarDays());
  },

  nextMonth() {
    let { calendarYear, calendarMonth } = this.data;
    if (calendarMonth === 12) {
      calendarYear += 1;
      calendarMonth = 1;
    } else {
      calendarMonth += 1;
    }
    this.setData({ calendarYear, calendarMonth }, () => this.buildCalendarDays());
  },

  /** 【后端接口】拉取会话列表；activityScore=最近1个月有活动天数（一天至少1项活动计1），火花值=activityScore */
  getChatList() {
    const app = getApp();
    if (app.globalData.useMock) {
      this.setData({ chatList: MOCK_CHAT_LIST }, () => this.applyFilterAndSort());
      return;
    }
    wx.request({
      url: `${API_BASE}/chat/session-list`,
      method: "GET",
      header: { token: wx.getStorageSync("token") || "" },
      success: (res) => {
        if (res.data && res.data.code === 0 && res.data.data && res.data.data.list) {
          this.setData({ chatList: res.data.data.list }, () => this.applyFilterAndSort());
        } else {
          this.setData({ chatList: [], displayList: [] });
        }
      },
      fail: () => {
        this.setData({ chatList: [], displayList: [] });
      }
    });
  },

  /** 按搭子类型筛选 + 按活跃程度排序；活跃程度=有活动天数，火花=同一数值（活跃一天一项活动+1） */
  applyFilterAndSort() {
    const { chatList, sportTypeIndex, activitySortIndex } = this.data;
    const sportFilter = SPORT_TYPES[sportTypeIndex];
    let list = sportFilter === "全部" ? [...chatList] : chatList.filter(item => (item.sportType || "") === sportFilter);
    if (activitySortIndex === 1) {
      list.sort((a, b) => (b.activityScore || 0) - (a.activityScore || 0));
    } else if (activitySortIndex === 2) {
      list.sort((a, b) => (a.activityScore || 0) - (b.activityScore || 0));
    }
    const filterEmptyTip = list.length === 0 && sportFilter !== "全部"
      ? "暂无该类型的伙伴，试试其他类型"
      : "暂无匹配伙伴，去匹配一个吧～";
    this.setData({ displayList: list, filterEmptyTip });
  },

  /** 点击日历格（有黄点时）：查看当日约定详情，支持打勾完成 */
  onCalendarDayTap(e) {
    const dateKey = e.currentTarget.dataset.dateKey || "";
    const hasDot = e.currentTarget.dataset.hasDot === true || e.currentTarget.dataset.hasDot === "true";
    if (!hasDot || !dateKey) return;
    const { sportTypeIndex } = this.data;
    const sportFilter = SPORT_TYPES[sportTypeIndex];
    const app = getApp();
    const list = getCalendarTasks(app);
    const filtered = sportFilter === "全部"
      ? list
      : list.filter(item => (item.sportType || "") === sportFilter);
    const dayTasks = filtered.filter(item => (item.taskDate || "") === dateKey);
    if (dayTasks.length === 0) return;
    const dateDisplay = dateKey.replace(/-/g, "/");
    this.setData({
      showTaskDetailModal: true,
      taskDetailDate: dateDisplay,
      taskDetailList: dayTasks
    });
  },

  closeTaskDetailModal() {
    this.setData({ showTaskDetailModal: false });
  },

  openCompleteForm(e) {
    const taskId = e.currentTarget.dataset.taskId || "";
    const chatId = e.currentTarget.dataset.chatId || "";
    const list = this.data.taskDetailList || [];
    const task = list.find(t => t.taskId === taskId && t.chatId === chatId);
    if (!task) return;
    this.setData({
      showCompleteForm: true,
      completeFormTask: task,
      completeDuration: "",
      completeRatingIndex: 0
    });
  },

  closeCompleteForm() {
    this.setData({ showCompleteForm: false, completeFormTask: null });
  },

  onCompleteDurationInput(e) {
    this.setData({ completeDuration: e.detail.value || "" });
  },

  onCompleteRatingChange(e) {
    this.setData({ completeRatingIndex: parseInt(e.detail.value, 10) });
  },

  submitComplete() {
    const { completeFormTask, completeDuration, completeRatingIndex, completeRatingOptions, taskDetailDate } = this.data;
    if (!completeFormTask) return;
    const duration = (completeDuration || "").trim();
    if (!duration) {
      wx.showToast({ title: "请填写运动时长", icon: "none" });
      return;
    }
    const app = getApp();
    const rating = completeRatingIndex + 1;
    markTaskCompleted(app, completeFormTask.chatId, completeFormTask.taskId, duration, rating);
    const dateKey = (taskDetailDate || "").replace(/\//g, "-");
    const list = getCalendarTasks(app);
    const sportFilter = SPORT_TYPES[this.data.sportTypeIndex];
    const filtered = sportFilter === "全部" ? list : list.filter(item => (item.sportType || "") === sportFilter);
    const dayTasks = filtered.filter(item => (item.taskDate || "") === dateKey);
    this.setData({
      showCompleteForm: false,
      completeFormTask: null,
      taskDetailList: dayTasks,
      showTaskDetailModal: true
    });
    this.buildCalendarDays();
    wx.showToast({ title: "已标记完成", icon: "success" });
  },

  preventTapPropagation() {},


  onSportTypeChange(e) {
    const sportTypeIndex = parseInt(e.detail.value, 10);
    this.setData({ sportTypeIndex }, () => {
      this.applyFilterAndSort();
      this.buildCalendarDays();
    });
  },

  onActivitySortChange(e) {
    const activitySortIndex = parseInt(e.detail.value, 10);
    this.setData({ activitySortIndex }, () => this.applyFilterAndSort());
  },

  // 进入成就商店（后续替换为商店页路径）
  goMall() {
    wx.showToast({
      title: "成就商店即将上线",
      icon: "none"
    });
    // 后续： wx.navigateTo({ url: "/pages/mall/mall" });
  },

  // 进入与某人的聊天
  openChat(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: "/pages/chat/chat?id=" + id
    });
  }
});
