# 运动社交 - 后端接口文档

> 本文档供后端开发对接使用。前端已按此约定预留调用，切换实接口时：将 `app.js` 中 `globalData.useMock` 设为 `false`，并配置各页的 `API_BASE`。

---

## 一、通用约定

### 1.1 基础信息

| 项目 | 说明 |
|------|------|
| 请求头 | `token`: 登录态，由 `wx.getStorageSync("token")` 获取，后端鉴权 |
| Content-Type | POST 请求使用 `application/json` |
| 响应格式 | 统一 `{ code, msg?, data? }`，`code === 0` 表示成功 |
| 错误码 | 建议：0=成功，非0=失败，`msg` 为错误描述 |

### 1.2 会话标识

- **chatId**：会话 ID，表示当前用户与某伙伴的一对一对话。首页会话列表项中的 `id` 即 chatId，点击进入聊天页时传递 `id` 作为 chatId 使用。

---

## 二、会话与伙伴

### 2.1 获取会话列表

**接口**：`GET /chat/session-list`

**说明**：拉取当前用户的匹配伙伴会话列表，用于首页展示。支持按 `sportType` 筛选、按 `activityScore` 排序。

**请求**：无 body，Query 无必填参数

**响应**：

```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": "1",
        "avatar": "https://xxx/avatar.png",
        "nickName": "跑步小能手",
        "lastMessage": "今天跑了5公里，你呢？",
        "lastTime": "10:30",
        "sportType": "跑步",
        "activityScore": 18
      }
    ]
  }
}
```

**字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 会话 ID（即 chatId），点击进入聊天时使用 |
| avatar | string | 伙伴头像 URL |
| nickName | string | 伙伴昵称 |
| lastMessage | string | 最后一条消息摘要 |
| lastTime | string | 最后消息时间展示（如 "10:30" / "昨天" / "周一"） |
| sportType | string | 搭子类型，枚举：`跑步` \| `骑行` \| `羽毛球` \| `健走` \| `球类` \| `游泳` \| `其他`，用于筛选 |
| activityScore | number | 活跃程度（最近 1 个月内有活动的天数），与火花值一致；用于排序 |

---

### 2.2 获取擂台数据

**接口**：`GET /chat/arena`

**说明**：拉取与某伙伴的擂台页数据，包括伙伴信息、当前用户成就值、共同成就值。

**请求**：Query `chatId`（string，必填）

**响应**：

```json
{
  "code": 0,
  "data": {
    "partner": {
      "id": "1",
      "avatar": "https://xxx/avatar.png",
      "nickName": "跑步小能手",
      "achieveScore": 1280
    },
    "me": {
      "avatar": "https://xxx/me.png",
      "nickName": "我",
      "achieveScore": 1050
    },
    "commonAchieveScore": 2330
  }
}
```

**字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| partner | object | 伙伴信息 |
| partner.achieveScore | number | 伙伴成就值 |
| me | object | 当前用户信息 |
| me.achieveScore | number | 当前用户成就值 |
| commonAchieveScore | number | 共同成就值（可后端计算或前端用 partner.achieveScore + me.achieveScore） |

---

## 三、任务系统

任务按 chatId 分组，每对用户有四个池子：**pending**（待接受/拒绝）、**accepted**（进行中）、**completed**（已完成）、**rejected**（已拒绝）。

- 日历：显示 accepted + completed
- 历史任务页：显示 accepted（进行中）+ completed（完成）+ rejected（拒绝）

### 3.1 获取待处理邀请（对方发给我）

**接口**：`GET /chat/task/pending-invites`

**说明**：拉取「对方发给我」、当前会话下的待接受/拒绝邀请，用于擂台页「对方发起的任务」区块。

**请求**：Query `chatId`（string，必填）

**响应**：

```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "inviteId": "inv-xxx",
        "chatId": "1",
        "fromNickName": "跑步小能手",
        "taskDate": "2026-02-08",
        "taskTime": "09:00",
        "place": "学校操场",
        "placeAddress": "XX市XX区XX路",
        "sportType": "跑步",
        "timeDisplay": "2月8日 周六 09:00"
      }
    ]
  }
}
```

**字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| inviteId | string | 邀请唯一 ID，接受/拒绝时回传 |
| taskDate | string | YYYY-MM-DD |
| taskTime | string | HH:mm |
| timeDisplay | string | 展示用，如 "2月8日 周六 09:00" |

---

### 3.2 发起任务（约运动）

**接口**：`POST /chat/task/invite`

**说明**：当前用户向对方发起约运动任务，加入 pending 池，等待对方接受/拒绝。

**请求体**：

```json
{
  "chatId": "1",
  "taskDate": "2026-02-08",
  "taskTime": "09:00",
  "place": "学校操场",
  "placeAddress": "XX市XX区XX路",
  "sportType": "跑步",
  "latitude": 30.123,
  "longitude": 120.456
}
```

**字段说明**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| chatId | string | 是 | 会话 ID |
| taskDate | string | 是 | YYYY-MM-DD |
| taskTime | string | 是 | HH:mm，默认 09:00 |
| place | string | 是 | 地点名称（地图选点） |
| placeAddress | string | 否 | 详细地址 |
| sportType | string | 是 | 跑步 / 骑行 / 健走 / 球类 / 游泳 / 其他 |
| latitude | number | 否 | 纬度 |
| longitude | number | 否 | 经度 |

**响应**：

```json
{
  "code": 0,
  "data": {
    "inviteId": "inv-xxx",
    "task": { "taskDate": "2026-02-08", "taskTime": "09:00", "place": "学校操场", "sportType": "跑步", ... }
  }
}
```

---

### 3.3 接受邀请

**接口**：`POST /chat/task/accept`

**说明**：接受对方发来的邀请，任务由 pending 转入 accepted。支持设置提醒，与微信订阅消息互通。

**请求体**：

```json
{
  "inviteId": "inv-xxx",
  "reminderMinutes": 30,
  "taskDate": "2026-02-08",
  "taskTime": "09:00"
}
```

**字段说明**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| inviteId | string | 是 | 邀请 ID |
| reminderMinutes | number | 否 | 提前多少分钟提醒，0 表示不提醒 |
| taskDate | string | 是 | 任务日期，用于计算提醒触发时刻 |
| taskTime | string | 是 | 任务时间 |

**提醒机制**：当 `reminderMinutes > 0` 时，前端会先请求用户订阅「任务提醒」模板消息；后端需在「任务开始时间 - reminderMinutes」时刻向用户发送该订阅消息。

**响应**：`{ "code": 0 }` 或 `{ "code": 0, "data": { "taskId": "t-xxx" } }`

---

### 3.4 拒绝邀请

**接口**：`POST /chat/task/reject`

**说明**：拒绝对方发来的邀请，任务由 pending 转入 rejected。

**请求体**：

```json
{
  "inviteId": "inv-xxx",
  "reasonType": "时间冲突",
  "reasonText": "那天有会议"
}
```

**字段说明**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| inviteId | string | 是 | 邀请 ID |
| reasonType | string | 是 | 预设理由：时间冲突 / 已有安排 / 不方便 / 其他 |
| reasonText | string | 否 | 补充说明，选「其他」时可必填 |

**响应**：`{ "code": 0 }`

---

### 3.5 标记任务完成

**接口**：`POST /chat/task/complete`

**说明**：用户对进行中任务（accepted）打勾完成，填写运动时长和评价，任务转入 completed，参与成就值计算。

**请求体**：

```json
{
  "chatId": "1",
  "taskId": "t-xxx",
  "duration": "45分钟",
  "rating": 5
}
```

**字段说明**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| chatId | string | 是 | 会话 ID |
| taskId | string | 是 | 任务 ID（accepted 状态的任务） |
| duration | string | 是 | 运动时长，如 "45分钟" |
| rating | number | 是 | 1~5 星评价 |

**响应**：`{ "code": 0 }` 或 `{ "code": 0, "data": { ... } }`

---

### 3.6 获取历史任务列表

**接口**：`GET /chat/task/list`

**说明**：拉取某会话下的历史任务（accepted + completed + rejected），用于历史任务页。按日期倒序。

**请求**：Query `chatId`（string，必填）

**响应**：

```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "taskId": "t-xxx",
        "inviteId": null,
        "status": "accepted",
        "statusLabel": "进行中",
        "taskDate": "2026-02-08",
        "taskTime": "09:00",
        "place": "学校操场",
        "placeAddress": "",
        "sportType": "跑步",
        "partnerName": "跑步小能手",
        "chatId": "1",
        "duration": null,
        "rating": null,
        "completedAt": null,
        "reasonType": null,
        "reasonText": null,
        "rejectedAt": null
      },
      {
        "taskId": "t-yyy",
        "status": "completed",
        "statusLabel": "完成",
        "taskDate": "2026-02-05",
        "duration": "45分钟",
        "rating": 5,
        "completedAt": "2026-02-05T16:30:00.000Z"
      },
      {
        "inviteId": "inv-zzz",
        "status": "rejected",
        "statusLabel": "拒绝",
        "taskDate": "2026-02-04",
        "reasonType": "时间冲突",
        "reasonText": "",
        "rejectedAt": "2026-02-04T10:00:00.000Z"
      }
    ]
  }
}
```

**字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| status | string | accepted / completed / rejected |
| statusLabel | string | 进行中 / 完成 / 拒绝（前端展示用） |
| 进行中 | - | 无 duration、rating、completedAt、rejectedAt |
| 完成 | - | 有 duration、rating、completedAt |
| 拒绝 | - | 有 reasonType、reasonText、rejectedAt，可能无 taskId |

---

### 3.7 获取日历任务（首页日历）

**接口**：`GET /chat/task/calendar`

**说明**：拉取当前用户所有会话的「已接受 + 已完成」任务，用于首页日历展示黄点及点击后的当日详情。需支持按月份筛选。

**请求**：Query `year`（number）、`month`（number），如 `year=2026&month=2`

**响应**：

```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "taskId": "t-xxx",
        "chatId": "1",
        "taskDate": "2026-02-08",
        "taskTime": "09:00",
        "place": "学校操场",
        "sportType": "跑步",
        "partnerName": "跑步小能手",
        "status": "accepted"
      }
    ]
  }
}
```

**字段说明**：`status` 为 `accepted`（进行中）或 `completed`（已完成）；已完成项可含 `duration`、`rating`。

---

### 3.8 获取当前进行中任务

**接口**：`GET /chat/task/current`

**说明**：拉取某会话下当前进行中的任务（accepted 中最新的一个），用于擂台页「当前任务」展示。

**请求**：Query `chatId`（string，必填）

**响应**：

```json
{
  "code": 0,
  "data": {
    "taskId": "t-xxx",
    "taskDate": "2026-02-08",
    "taskTime": "09:00",
    "place": "学校操场",
    "sportType": "跑步"
  }
}
```

若无进行中任务：`{ "code": 0, "data": null }`

---

## 四、用户成就

### 4.1 获取我的运动数据

**接口**：`GET /user/sport-data`

**说明**：获取当前用户的运动汇总数据，用于成就页计算解锁状态。

**请求**：无

**响应**：

```json
{
  "code": 0,
  "data": {
    "totalStep": 12500,
    "continuousCheckIn": 5,
    "totalRunDistance": 80
  }
}
```

**字段说明**（与成就规则 `dataKey` 对齐）：

| 字段 | 类型 | 说明 |
|------|------|------|
| totalStep | number | 单日步数（或累计，以团队规则为准） |
| continuousCheckIn | number | 连续打卡天数 |
| totalRunDistance | number | 跑步总里程（km） |

---

### 4.2 获取伙伴运动数据

**接口**：`GET /user/partner/sport-data`

**说明**：获取某伙伴的运动数据，用于查看「TA 的运动成就」。

**请求**：Query `chatId`（string，必填）

**响应**：同 4.1，结构为 `{ code, data: { totalStep, continuousCheckIn, totalRunDistance } }`

---

## 五、共同成就空间（成长地图）

### 5.1 获取共同成就空间数据

**接口**：`GET /achievement/shared`

**说明**：拉取与某伙伴的共同成就空间（成长地图）数据，包括节点、共同成就值、共同运动次数/时长、共同解锁勋章等。

**请求**：Query `chatId`（string，必填）

**响应**：

```json
{
  "code": 0,
  "data": {
    "partnerName": "跑步小能手",
    "growthNodes": [
      {
        "id": 5,
        "title": "巅峰伙伴",
        "desc": "共同成就值达5000",
        "icon": "🏆",
        "unlocked": false,
        "top": 80,
        "medalImage": ""
      }
    ],
    "commonScore": 2330,
    "jointExerciseCount": 18,
    "jointExerciseDuration": "12小时",
    "unlockedBadges": [
      { "id": 3, "title": "步数共进", "icon": "👟", "medalImage": "" }
    ]
  }
}
```

**字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| growthNodes | array | 成长地图节点，按山顶到山脚顺序；top 为 rpx 坐标 |
| commonScore | number | 共同成就值 |
| jointExerciseCount | number | 共同运动次数 |
| jointExerciseDuration | string | 共同运动时长展示，如 "12小时" |
| unlockedBadges | array | 共同解锁成就，用于左侧勋章墙；medalImage 可选 |

---

### 5.2 获取节点留言

**接口**：`GET /achievement/node-messages`

**说明**：拉取某节点下的历史留言。

**请求**：Query `chatId`、`nodeId`（string）

**响应**：

```json
{
  "code": 0,
  "data": {
    "list": [
      { "id": "m1", "content": "成为搭子的第一天！", "isMe": true, "time": "12:30" }
    ]
  }
}
```

---

### 5.3 发送节点留言

**接口**：`POST /achievement/node-message`

**说明**：在某个节点下发送新留言。

**请求体**：

```json
{
  "chatId": "1",
  "nodeId": "1",
  "content": "一起加油！"
}
```

**响应**：`{ "code": 0 }` 或 `{ "code": 0, "data": { "id": "m-xxx" } }`

---

### 5.4 获取共同运动历史

**接口**：`GET /achievement/activity-history`

**说明**：拉取与某伙伴的共同运动历史，用于点击「共同运动次数」后的弹窗展示。仅记录真实运动活动，不含「成为搭子」等。

**请求**：Query `chatId`（string，必填）

**响应**：

```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": "h1",
        "date": "今天 10:30",
        "activity": "跑步",
        "duration": "35分钟",
        "nodeTitle": "步数共进"
      }
    ]
  }
}
```

---

## 六、成就兑换（占位）

**接口**：待定

**说明**：成就兑换页当前为占位，用于共同成就值兑换奖励。后续需提供：商品列表、兑换接口等。

---

## 七、聊天消息（可选扩展）

若需完整聊天能力，可参考以下接口（当前前端以擂台/任务为主）：

| 接口 | 方法 | 说明 |
|------|------|------|
| /chat/messages | GET | 拉取聊天记录，Query: chatId |
| /chat/send | POST | 发送消息，Body: { chatId, content } |

---

## 八、接口汇总

| 模块 | 接口 | 方法 |
|------|------|------|
| 会话 | /chat/session-list | GET |
| 会话 | /chat/arena | GET |
| 任务 | /chat/task/pending-invites | GET |
| 任务 | /chat/task/invite | POST |
| 任务 | /chat/task/accept | POST |
| 任务 | /chat/task/reject | POST |
| 任务 | /chat/task/complete | POST |
| 任务 | /chat/task/list | GET |
| 任务 | /chat/task/calendar | GET |
| 任务 | /chat/task/current | GET |
| 成就 | /user/sport-data | GET |
| 成就 | /user/partner/sport-data | GET |
| 共同成就 | /achievement/shared | GET |
| 共同成就 | /achievement/node-messages | GET |
| 共同成就 | /achievement/node-message | POST |
| 共同成就 | /achievement/activity-history | GET |

---

## 九、前端 Mock 开关

对接时请：

1. 将 `app.js` 中 `globalData.useMock` 设为 `false`
2. 在各页或统一配置中设置 `API_BASE` 为后端 baseUrl（如 `https://api.example.com`）
3. 确保 `wx.setStorageSync("token", xxx)` 在登录成功后写入
