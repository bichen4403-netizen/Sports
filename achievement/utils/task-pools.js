/**
 * 统一任务池：按 chatId 分组，每对用户有 pending/accepted/completed/rejected 四池
 * - pending: 一方发给另一方，待对方接受/拒绝
 * - accepted: 已接受，进行中，显示在日历
 * - completed: 已打勾完成（含时长、评价），参与成就值计算
 * - rejected: 已拒绝
 * 日历显示：accepted + completed
 * 历史任务：accepted(进行中) + completed(完成) + rejected(拒绝)
 */

/** 初始化空任务池结构 */
function initPool() {
  return { pending: [], accepted: [], completed: [], rejected: [] };
}

/** 确保 taskPools[chatId] 存在 */
function ensurePool(app, chatId) {
  if (!app.globalData.taskPools) app.globalData.taskPools = {};
  if (!app.globalData.taskPools[chatId]) {
    app.globalData.taskPools[chatId] = initPool();
  }
  return app.globalData.taskPools[chatId];
}

/** 获取某 chatId 下「对方发给我」的待处理邀请（用于擂台页「对方发起的任务」） */
function getPendingForMe(app, chatId) {
  const pool = ensurePool(app, chatId);
  return (pool.pending || []).filter(i => !i.fromMe);
}

/** 接受邀请：从 pending 移到 accepted */
function acceptInvite(app, chatId, inviteId) {
  const pool = ensurePool(app, chatId);
  const idx = (pool.pending || []).findIndex(i => i.inviteId === inviteId);
  if (idx < 0) return null;
  const item = pool.pending.splice(idx, 1)[0];
  const accepted = {
    taskId: "t-" + Date.now(),
    taskDate: item.taskDate,
    taskTime: item.taskTime || "09:00",
    place: item.place || "",
    placeAddress: item.placeAddress || "",
    sportType: item.sportType || "跑步",
    partnerName: item.fromNickName || "伙伴",
    chatId,
    status: "accepted"
  };
  (pool.accepted = pool.accepted || []).push(accepted);
  return accepted;
}

/** 拒绝邀请：从 pending 移到 rejected */
function rejectInvite(app, chatId, inviteId, reasonType, reasonText) {
  const pool = ensurePool(app, chatId);
  const idx = (pool.pending || []).findIndex(i => i.inviteId === inviteId);
  if (idx < 0) return;
  const item = pool.pending.splice(idx, 1)[0];
  (pool.rejected = pool.rejected || []).push({
    ...item,
    reasonType: reasonType || "",
    reasonText: reasonText || "",
    rejectedAt: new Date().toISOString(),
    status: "rejected"
  });
}

/** 我发起任务：创建待对方处理的邀请，加入 pending（fromMe=true，对方视角才需处理） */
function createInvite(app, chatId, task, partnerName) {
  const pool = ensurePool(app, chatId);
  const invite = {
    inviteId: "inv-" + Date.now(),
    chatId,
    taskDate: task.taskDate,
    taskTime: task.taskTime || "09:00",
    place: task.place || "",
    placeAddress: task.placeAddress || "",
    sportType: task.sportType || "跑步",
    fromNickName: "我",
    fromMe: true,
    timeDisplay: (task.taskDateDisplay || task.taskDate) + " " + (task.taskTime || "09:00")
  };
  (pool.pending = pool.pending || []).push(invite);
  return invite;
}

/** 获取用于日历展示的任务（accepted + completed，汇总所有 chatId） */
function getCalendarTasks(app) {
  const pools = app.globalData.taskPools || {};
  const list = [];
  Object.keys(pools).forEach(chatId => {
    const p = pools[chatId];
    (p.accepted || []).forEach(t => list.push({ ...t, chatId, _status: "accepted" }));
    (p.completed || []).forEach(t => list.push({ ...t, chatId, _status: "completed" }));
  });
  return list;
}

/** 标记任务完成：从 accepted 移到 completed，需 duration、rating */
function markTaskCompleted(app, chatId, taskId, duration, rating) {
  const pool = ensurePool(app, chatId);
  const idx = (pool.accepted || []).findIndex(t => t.taskId === taskId);
  if (idx < 0) return null;
  const item = pool.accepted.splice(idx, 1)[0];
  const completed = {
    ...item,
    duration: duration || "",
    rating: rating || 0,
    completedAt: new Date().toISOString(),
    status: "completed"
  };
  (pool.completed = pool.completed || []).push(completed);
  return completed;
}

/** 获取某 chatId 的历史任务（accepted + completed + rejected），用于历史页 */
function getHistoryTasks(app, chatId) {
  const pool = ensurePool(app, chatId) || initPool();
  const list = [];
  (pool.accepted || []).forEach(t => list.push({ ...t, statusLabel: "进行中", _id: t.taskId }));
  (pool.completed || []).forEach(t => list.push({ ...t, statusLabel: "完成", _id: t.taskId }));
  (pool.rejected || []).forEach(t => list.push({ ...t, statusLabel: "拒绝", _id: t.inviteId || "r-" + Date.now() }));
  list.sort((a, b) => {
    const da = (a.taskDate || a.rejectedAt || "").replace(/-/g, "");
    const db = (b.taskDate || b.rejectedAt || "").replace(/-/g, "");
    return parseInt(db, 10) - parseInt(da, 10);
  });
  return list;
}

/** 获取某 chatId 当前进行中的任务（accepted 中最新的） */
function getCurrentTask(app, chatId) {
  const pool = ensurePool(app, chatId);
  const accepted = pool.accepted || [];
  if (accepted.length === 0) return null;
  const sorted = [...accepted].sort((a, b) => {
    const da = (a.taskDate || "").replace(/-/g, "");
    const db = (b.taskDate || "").replace(/-/g, "");
    if (da !== db) return parseInt(db, 10) - parseInt(da, 10);
    return (b.taskTime || "").localeCompare(a.taskTime || "");
  });
  return sorted[0];
}

/** 日期工具：相对今天加减天数，返回 YYYY-MM-DD */
function _mockDate(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
  return y + "-" + (m < 10 ? "0" + m : m) + "-" + (day < 10 ? "0" + day : day);
}
/** 格式化显示：X月X日 周X HH:mm */
function _mockTimeDisplay(dateStr, time) {
  const d = new Date(dateStr);
  const week = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][d.getDay()];
  return (d.getMonth() + 1) + "月" + d.getDate() + "日 " + week + " " + (time || "09:00");
}

/** Mock 初始化：填充 taskPools；日期动态，发起/待接受=今日及之后，历史=今日之前 */
function initMockTaskPools(app) {
  app.globalData.taskPools = app.globalData.taskPools || {};
  const pools = app.globalData.taskPools;
  ["1", "2", "3", "4", "5"].forEach(id => { if (!pools[id]) pools[id] = initPool(); });

  const t0 = _mockDate(0), t1 = _mockDate(1), t2 = _mockDate(2), t3 = _mockDate(3);   // 今天、明天、后天、大后天
  const h1 = _mockDate(-2), h2 = _mockDate(-4), h3 = _mockDate(-5); // 历史：前天、4天前、5天前

  const p1 = pools["1"];
  p1.pending = [
    { inviteId: "inv-1", chatId: "1", fromNickName: "跑步小能手", taskDate: t1, taskTime: "09:00", place: "学校操场", sportType: "跑步", timeDisplay: _mockTimeDisplay(t1, "09:00") },
    { inviteId: "inv-2", chatId: "1", fromNickName: "跑步小能手", taskDate: t3, taskTime: "18:00", place: "体育馆", sportType: "跑步", timeDisplay: _mockTimeDisplay(t3, "18:00") }
  ];
  p1.accepted = [
    { taskId: "t-1", taskDate: t1, taskTime: "09:00", place: "学校操场", sportType: "跑步", partnerName: "跑步小能手", chatId: "1", status: "accepted" }
  ];
  p1.completed = [];
  p1.rejected = [];

  const p2 = pools["2"];
  p2.pending = [
    { inviteId: "inv-3", chatId: "2", fromNickName: "步数达人", taskDate: t2, taskTime: "14:00", place: "环湖绿道", sportType: "骑行", timeDisplay: _mockTimeDisplay(t2, "14:00") }
  ];
  p2.accepted = [
    { taskId: "t-2", taskDate: t0, taskTime: "14:00", place: "环湖绿道", sportType: "骑行", partnerName: "步数达人", chatId: "2", status: "accepted" },
    { taskId: "t-3", taskDate: t2, taskTime: "18:00", place: "体育馆", sportType: "跑步", partnerName: "跑步小能手", chatId: "2", status: "accepted" }
  ];
  p2.completed = [];
  p2.rejected = [];

  const p3 = pools["3"];
  p3.pending = [];
  p3.accepted = [];
  p3.completed = [
    { taskId: "t-4", taskDate: h2, taskTime: "16:00", place: "体育馆", sportType: "羽毛球", partnerName: "晨练伙伴", chatId: "3", duration: "45分钟", rating: 5, status: "completed" }
  ];
  p3.rejected = [
    { inviteId: "inv-r1", chatId: "3", fromNickName: "晨练伙伴", taskDate: h1, taskTime: "08:00", place: "操场", sportType: "跑步", reasonType: "时间冲突", reasonText: "", rejectedAt: new Date(h1).toISOString(), status: "rejected" }
  ];

  const p4 = pools["4"];
  p4.pending = [];
  p4.accepted = [];
  p4.completed = [
    { taskId: "t-5", taskDate: h3, taskTime: "08:00", place: "操场", sportType: "跑步", partnerName: "夜跑党", chatId: "4", duration: "30分钟", rating: 4, status: "completed" }
  ];
  p4.rejected = [];
}

module.exports = {
  initPool,
  ensurePool,
  getPendingForMe,
  acceptInvite,
  rejectInvite,
  createInvite,
  getCalendarTasks,
  markTaskCompleted,
  getHistoryTasks,
  getCurrentTask,
  initMockTaskPools
};
