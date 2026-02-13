/**
 * 计算成就解锁状态（独立函数，不依赖任何全局变量）
 * @param {Array} achievementRules 成就规则列表
 * @param {Object} userData 用户运动数据
 * @returns {Array} 带解锁状态的成就列表
 */
export function calculateAchievementStatus(achievementRules, userData) {
  return achievementRules.map(rule => {
    return {
      ...rule,
      current: userData[rule.dataKey] || 0,
      unlocked: (userData[rule.dataKey] || 0) >= rule.target
    };
  });
}

/**
 * 统计已解锁成就数量
 * @param {Array} achievementList 成就列表
 * @returns {Number} 已解锁数量
 */
export function countUnlockedAchievements(achievementList) {
  return achievementList.filter(item => item.unlocked).length;
}

/**
 * 定义默认成就规则（后续可由后端返回，或团队统一配置）
 * 注意：dataKey 对应用户数据的字段名，后续只需和团队对齐字段名即可
 */
export const DEFAULT_ACHIEVEMENT_RULES = [
  {
    id: 1,
    title: "步数达人",
    desc: "单日步数达到10000步",
    icon: "🏃",
    target: 10000,
    dataKey: "totalStep" // 对应用户数据的字段名
  },
  {
    id: 2,
    title: "打卡王者",
    desc: "连续打卡7天",
    icon: "✅",
    target: 7,
    dataKey: "continuousCheckIn"
  },
  {
    id: 3,
    title: "跑者先锋",
    desc: "跑步总里程达到100km",
    icon: "🏆",
    target: 100,
    dataKey: "totalRunDistance"
  }
];
