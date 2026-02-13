/**
 * ========== 后端接口约定（由后端同学实现，前端已按此约定预留调用） ==========
 *
 * 【首页 - 会话列表（支持筛选排序）】
 * - 接口：GET /api/chat/session-list（或团队约定路径）
 * - 说明：拉取当前用户的匹配伙伴会话列表；搭子类型用于筛选，活跃程度用于排序并与火花数值一致
 * - 返回约定：{ code, data: { list: [{ id, avatar, nickName, lastMessage, lastTime, sportType, activityScore }] } }
 *   - sportType：搭子类型，枚举 "跑步" | "骑行" | "羽毛球"（与前端筛选选项一致）
 *   - activityScore：活跃程度，且与火花值映射一致。建议为「最近 1 个月内有活动的天数」：
 *     当天至少有 1 次发起任务或接受任务计为 1 天，活跃一天则火花 +1，即 火花值 = activityScore
 *
 * 【聊天页 - 消息列表】
 * - 接口：GET /api/chat/messages?chatId=xxx
 * - 说明：拉取与某人的聊天记录
 * - 返回约定：{ code, data: { list: [{ id, type: 'receive'|'send', avatar, content }] } }
 *
 * 【聊天页 - 发送消息】
 * - 接口：POST /api/chat/send
 * - 说明：发送一条文本消息
 * - 请求体：{ chatId, content }
 * - 返回约定：{ code, data: { message: { id, type, avatar, content } } } 或仅 code 表示成功
 *
 * 【聊天页 - 任务发起（约运动）】
 * - 接口：POST /api/chat/task/invite（或团队约定路径）
 * - 说明：发起约运动任务
 * - 请求体：{ chatId, time, place, sportType }
 * - 返回约定：{ code, data }；前端可将“约运动”作为一条消息展示，可由后端推送或前端本地插入
 *
 * 【接受端 - 待处理邀请列表】
 * - 接口：GET /api/chat/task/pending-invites?chatId=xxx
 * - 说明：拉取「对方发给我」、当前会话下的待接受/拒绝邀请
 * - 返回约定：{ code, data: { list: [{ inviteId, chatId, fromNickName, taskDate, taskTime, place, sportType, timeDisplay }] } }
 *
 * 【接受端 - 接受邀请（可设置提醒，与微信订阅消息互通）】
 * - 接口：POST /api/chat/task/accept
 * - 请求体：{ inviteId, reminderMinutes?, taskDate?, taskTime? }
 *   - reminderMinutes：提前多少分钟提醒，0 表示不提醒
 *   - taskDate、taskTime：任务日期与时间，用于计算提醒触发时刻 = 任务开始时间 - reminderMinutes
 * - 返回约定：{ code }
 * - 与微信提醒互通：当 reminderMinutes > 0 时，前端会先请求用户订阅「任务提醒」模板消息；
 *   后端需在「提醒时刻」向用户发送该订阅消息，用户将在微信服务通知中收到提醒（如提前30分钟提醒）
 *
 * 【接受端 - 拒绝邀请（需理由或说明）】
 * - 接口：POST /api/chat/task/reject
 * - 请求体：{ inviteId, reasonType, reasonText }
 *   - reasonType：预设理由，如 "时间冲突" | "已有安排" | "不方便" | "其他"
 *   - reasonText：用户输入的补充说明（选填，选「其他」时可必填）
 * - 返回约定：{ code }
 *
 * 【成就页 - 用户运动数据】
 * - 接口：GET /api/user/sport-data（或团队约定路径）
 * - 说明：获取当前用户的运动汇总数据，用于计算成就
 * - 返回约定：{ code, data: { totalStep, continuousCheckIn, totalRunDistance } }（字段名可与成就规则一致）
 *
 * 以上为前端占位调用时使用的约定，实际路径、鉴权（如 header.token）、code 含义由后端统一后替换即可。
 */

// 本文件仅作接口约定说明，不导出逻辑。
// 各页面中已预留 API_BASE（空字符串），后端同学提供 baseUrl 后在各页填写，或统一在 app.js 中配置后引用。
