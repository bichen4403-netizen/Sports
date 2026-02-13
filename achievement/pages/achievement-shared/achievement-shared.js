// 与伙伴共同的成就空间：成长地图（蜿蜒向上的登山路径）

/* 山顶在 top 最小处，山脚在 top 最大处；节点间距加大便于吸附，每个约 400rpx
 * 成就节点字段说明：
 *   id, title, desc, icon, unlocked, top — 必填
 *   medalImage — 可选，后期替换为自绘/上传勋章图；有则左侧勋章墙优先展示图片，无则用 icon(emoji) */
const MOCK_GROWTH_NODES = [
  { id: 5, title: "巅峰伙伴", desc: "共同成就值达5000", icon: "🏆", unlocked: false, top: 80 },
  { id: 4, title: "默契搭档", desc: "完成10次约定", icon: "🔥", unlocked: false, top: 480 },
  { id: 3, title: "步数共进", desc: "双方合计5万步", icon: "👟", unlocked: true, top: 880 },
  { id: 2, title: "一起打卡", desc: "连续3天共同运动", icon: "✅", unlocked: true, top: 1280 },
  { id: 1, title: "初次相遇", desc: "成为运动搭子", icon: "🤝", unlocked: true, top: 1680 }
];

/** 成长地图内容区宽度（rpx）：750 - 左侧数据面板 200 = 550，减去 growth-map 左右 padding 24*2 = 502 */
const MAP_CONTENT_WIDTH = 502;
/** 节点圆心 X（rpx）：左节点 padding 16 + dot 半宽 48 = 64 */
const NODE_CX_LEFT = 64;
/** 右节点：内容区右边缘 - padding 16 - dot 半宽 48 */
const NODE_CX_RIGHT = MAP_CONTENT_WIDTH - 64;
/** 节点圆心 Y 偏移（map-node padding 24 + dot 半宽 48） */
const NODE_CENTER_Y = 72;

/** 根据节点列表计算两两之间的交错连线（顶峰→左→右→左→右→左 山脚）
 *  线段以 top-center 为起点，transform-origin: top center，需与节点圆心对齐 */
function buildPathSegments(nodes) {
  if (!nodes || nodes.length < 1) return [];
  const segments = [];
  const summitTop = 68;
  const summitCx = MAP_CONTENT_WIDTH / 2;
  for (let i = 0; i < nodes.length; i++) {
    const fromIsLeft = i === 0 ? null : ((i - 1) % 2 === 0);
    const toIsLeft = i % 2 === 0;
    const fromLeft = i === 0 ? summitCx : (fromIsLeft ? NODE_CX_LEFT : NODE_CX_RIGHT);
    const fromTop = i === 0 ? summitTop : (nodes[i - 1].top + NODE_CENTER_Y);
    const toLeft = toIsLeft ? NODE_CX_LEFT : NODE_CX_RIGHT;
    const toTop = nodes[i].top + NODE_CENTER_Y;
    const dx = toLeft - fromLeft;
    const dy = toTop - fromTop;
    const len = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dx, dy) * (180 / Math.PI);
    segments.push({
      top: fromTop,
      left: fromLeft - 6,
      height: Math.round(len),
      rotate: -angle
    });
  }
  return segments;
}

Page({
  data: {
    partnerName: "伙伴",
    partnerAvatar: "",
    meAvatar: "",
    defaultAvatarUrl: "/images/avatar-default.png",
    growthNodes: [],
    pathSegments: [],
    commonScore: 0,
    activeNodeIndex: 2,
    horseTop: 0,
    horseIsLeft: true,
    horseImage1: "",
    horseImage2: "",
    rpxRatio: 0.5,
    hasUnlockedNodes: true,
    summitUnlocked: false,
    jointExerciseCount: 0,
    jointExerciseDuration: "0分钟",
    /** unlockedBadges: 共同解锁成就，用于左侧勋章墙
     *  当前：{ id, title, icon }，icon 为 emoji
     *  后期：可增加 medalImage 字段（图片路径），勋章墙优先展示 medalImage */
    unlockedBadges: [],
    showMessageModal: false,
    selectedNode: { id: null, title: "", unlocked: false },
    nodeMessages: [],
    newMessageText: "",
    scrollToMsgId: "",
    showActivityHistoryModal: false,
    activityHistoryRecords: []
  },

  /** 各节点留言缓存 { nodeId: [{ id, content, isMe, time }] }，后期接接口 */
  _nodeMessagesMap: null,

  onLoad(options) {
    const chatId = options.chatId || "";
    this._nodeMessagesMap = {};
    this.setData({ chatId });
    this.loadAvatarsFromPrevPage();
    this.loadGrowthMap(chatId);
  },

  /** 从上一页（擂台页）获取两人头像，后期改为用户自定义 */
  loadAvatarsFromPrevPage() {
    const pages = getCurrentPages();
    const prev = pages[pages.length - 2];
    if (prev && prev.route === "pages/chat/chat") {
      const partner = prev.data.partner || {};
      const me = prev.data.me || {};
      this.setData({
        partnerAvatar: partner.avatar || "",
        meAvatar: me.avatar || ""
      });
      return;
    }
    if (getApp().globalData.useMock) {
      this.setData({
        partnerAvatar: "/images/avatar-default.png",
        meAvatar: "/images/avatar-default.png"
      });
    }
  },

  loadGrowthMap(chatId) {
    const app = getApp();
    const sys = wx.getSystemInfoSync();
    const rpxRatio = sys.windowWidth / 750;
    const scrollViewHeightPx = sys.windowHeight - 340 * rpxRatio;
    if (app.globalData.useMock) {
      const partner = chatId === "1" ? { nickName: "跑步小能手" } : { nickName: "伙伴" };
      const nodes = MOCK_GROWTH_NODES;
      let minUnlockedIdx = -1;
      for (let i = 0; i < nodes.length; i++) if (nodes[i].unlocked) { minUnlockedIdx = i; break; }
      const summitUnlocked = nodes.length > 0 && nodes[0].unlocked;
      const unlockedBadges = nodes.filter(function(n) { return n.unlocked; }).map(function(n) {
        return { id: n.id, title: n.title, icon: n.icon, medalImage: n.medalImage };
      });
      this.setData({
        partnerName: partner.nickName || "伙伴",
        growthNodes: nodes,
        pathSegments: buildPathSegments(nodes),
        commonScore: 2330,
        hasUnlockedNodes: minUnlockedIdx >= 0,
        activeNodeIndex: minUnlockedIdx >= 0 ? minUnlockedIdx : 0,
        horseTop: minUnlockedIdx >= 0 ? (nodes[minUnlockedIdx].top + NODE_CENTER_Y - 20) : 0,
        horseIsLeft: (minUnlockedIdx >= 0 ? minUnlockedIdx : 0) % 2 === 0,
        rpxRatio,
        scrollViewHeightPx,
        summitUnlocked,
        jointExerciseCount: 18,
        jointExerciseDuration: "12小时",
        unlockedBadges
      });
      return;
    }
    this.setData({ rpxRatio, scrollViewHeightPx });
    // 后端接口：拉取共同成就空间 / 成长地图数据
    wx.request({
      url: "",
      method: "GET",
      data: { chatId },
      header: { token: wx.getStorageSync("token") || "" },
      success: (res) => {
        if (res.data && res.data.code === 0 && res.data.data) {
          const d = res.data.data;
          const nodes = d.growthNodes || [];
          let minUnlockedIdx = -1;
          for (let i = 0; i < nodes.length; i++) if (nodes[i].unlocked) { minUnlockedIdx = i; break; }
          const activeIdx = minUnlockedIdx >= 0 ? minUnlockedIdx : 0;
          const activeNode = nodes[activeIdx] || nodes[0];
          const summitUnlocked = nodes.length > 0 && nodes[0].unlocked;
          const unlockedBadges = nodes.filter(function(n) { return n.unlocked; }).map(function(n) {
            return { id: n.id, title: n.title, icon: n.icon, medalImage: n.medalImage };
          });
          this.setData({
            partnerName: d.partnerName || "伙伴",
            growthNodes: nodes,
            pathSegments: buildPathSegments(nodes),
            commonScore: d.commonScore || 0,
            hasUnlockedNodes: minUnlockedIdx >= 0,
            activeNodeIndex: activeIdx,
            horseTop: (activeNode.top || 0) + NODE_CENTER_Y - 20,
            horseIsLeft: activeIdx % 2 === 0,
            summitUnlocked,
            jointExerciseCount: d.jointExerciseCount || 0,
            jointExerciseDuration: d.jointExerciseDuration || "0分钟",
            unlockedBadges
          });
        }
      }
    });
  },

  /** 点击共同运动次数：查看历史节点，约了什么活动、持续多久 */
  onActivityCountTap() {
    const records = this._getMockActivityHistory();
    this.setData({
      showActivityHistoryModal: true,
      activityHistoryRecords: records
    });
  },

  /** Mock 共同运动历史，后期改为接口拉取；仅记录运动活动，不含「成为搭子」等非运动项 */
  _getMockActivityHistory() {
    return [
      { id: "h1", date: "今天 10:30", activity: "跑步", duration: "35分钟", nodeTitle: "步数共进" },
      { id: "h2", date: "昨天 18:00", activity: "跳绳", duration: "20分钟", nodeTitle: "一起打卡" },
      { id: "h3", date: "2月5日 19:00", activity: "夜跑", duration: "40分钟", nodeTitle: "一起打卡" },
      { id: "h4", date: "2月4日 08:00", activity: "晨跑", duration: "25分钟", nodeTitle: "一起打卡" },
      { id: "h5", date: "2月3日 14:00", activity: "快走", duration: "30分钟", nodeTitle: "初次相遇" },
      { id: "h6", date: "2月2日 16:00", activity: "羽毛球", duration: "45分钟" }
    ];
  },

  closeActivityHistoryModal() {
    this.setData({ showActivityHistoryModal: false });
  },

  /** 点击节点：仅已解锁节点可打开留言弹窗 */
  onNodeTap(e) {
    const nodeId = e.currentTarget.dataset.nodeId;
    const nodeTitle = e.currentTarget.dataset.nodeTitle || "";
    const unlocked = e.currentTarget.dataset.unlocked === true || e.currentTarget.dataset.unlocked === "true";
    if (!unlocked) {
      wx.showToast({ title: "该成就尚未解锁", icon: "none" });
      return;
    }
    const key = String(nodeId);
    let messages = this._nodeMessagesMap[key];
    if (!messages) {
      messages = this._getMockMessages(key);
      this._nodeMessagesMap[key] = messages;
    }
    this.setData({
      showMessageModal: true,
      selectedNode: { id: nodeId, title: nodeTitle, unlocked: true },
      nodeMessages: messages,
      newMessageText: "",
      scrollToMsgId: ""
    });
  },

  /** Mock 历史留言，后期改为接口拉取 */
  _getMockMessages(nodeId) {
    const m = {
      "1": [
        { id: "m1-1", content: "成为搭子的第一天！", isMe: true, time: "12:30" },
        { id: "m1-2", content: "一起加油运动～", isMe: false, time: "12:35" }
      ],
      "2": [
        { id: "m2-1", content: "连续三天打卡成功！", isMe: false, time: "昨天 18:00" }
      ],
      "3": [
        { id: "m3-1", content: "步数破五万了！", isMe: true, time: "今天 10:00" }
      ],
      "0": []
    };
    return m[nodeId] || [];
  },

  closeMessageModal() {
    this.setData({ showMessageModal: false, newMessageText: "" });
  },

  /** 阻止点击内容区时冒泡到蒙层，避免点击输入框等导致弹窗关闭 */
  preventTapPropagation() {},

  onMessageInput(e) {
    this.setData({ newMessageText: e.detail.value || "" });
  },

  submitMessage() {
    const text = (this.data.newMessageText || "").trim();
    if (!text) return;
    const nodeId = String(this.data.selectedNode.id);
    const messages = this._nodeMessagesMap[nodeId] || [];
    const now = new Date();
    const timeStr = now.getHours() + ":" + String(now.getMinutes()).padStart(2, "0");
    const newMsg = {
      id: "m" + nodeId + "-" + Date.now(),
      content: text,
      isMe: true,
      time: timeStr
    };
    messages.push(newMsg);
    this._nodeMessagesMap[nodeId] = messages;
    this.setData({
      nodeMessages: messages,
      newMessageText: "",
      scrollToMsgId: "msg-" + newMsg.id
    });
    wx.showToast({ title: "发送成功", icon: "success" });
  },

  /** 滚动时根据位置更新马所在节点（仅限历史/当前节点，不站在未来节点） */
  onScroll(e) {
    const scrollTop = e.detail.scrollTop || 0;
    const nodes = this.data.growthNodes;
    if (!nodes || nodes.length === 0) return;
    let maxNodeIndex = -1;
    for (let i = 0; i < nodes.length; i++) if (nodes[i].unlocked) maxNodeIndex = i;
    if (maxNodeIndex < 0) return;
    const rpx = this.data.rpxRatio || 0.5;
    const scrollViewHeight = this.data.scrollViewHeightPx || 400;
    const viewportCenter = scrollTop + scrollViewHeight / 2;
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let i = 0; i <= maxNodeIndex; i++) {
      if (!nodes[i].unlocked) continue;
      const nodeCenter = (nodes[i].top + NODE_CENTER_Y) * rpx;
      const dist = Math.abs(nodeCenter - viewportCenter);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    if (bestIdx < 0) return;
    const node = nodes[bestIdx];
    if (this.data.activeNodeIndex !== bestIdx) {
      this.setData({
        activeNodeIndex: bestIdx,
        horseTop: node.top + NODE_CENTER_Y - 20,
        horseIsLeft: bestIdx % 2 === 0
      });
    }
  },

  goBack() {
    wx.navigateBack();
  },

  /** 进入成就兑换空间，用共同成就值兑换奖励 */
  goToAchievementExchange() {
    wx.navigateTo({
      url: "/pages/achievement-exchange/achievement-exchange?chatId=" + (this.data.chatId || "") + "&commonScore=" + (this.data.commonScore || 0)
    });
  }
});
