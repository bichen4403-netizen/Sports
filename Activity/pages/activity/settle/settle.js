// pages/activity/settle/settle.js
Page({
    data: {
    activity: null,
    teammates: [], // 队友数据
    personalAchievements: {
      credit: 5,       // 个人信用值
      achievement: 20, // 个人成就值
      duration: 1.5    // 运动时长（小时）
    },
    partnerAchievements: {
      credit: 10,       // 伙伴信用值加成
      achievement: 30   // 伙伴成就值加成
    }
  },

  onLoad(options) {
    if(options.data) {
      const activityData = JSON.parse(decodeURIComponent(options.data));
      this.setData({ 
        activity: activityData,
        isCreator: activityData.isCreator // 保存发起者状态
      });
      
      // 初始化队友数据（排除当前用户）
      this.initTeammates();
    }
  },
  
  // 初始化队友数据
  initTeammates() {
    // 从本地存储获取所有参与者（实际项目中应该调用API）
    let localActivities = wx.getStorageSync('activity_list') || [];
    let currentActivity = localActivities.find(act => act.id === this.data.activity.id);
    
    if (currentActivity && currentActivity.participants) {
      // 排除当前用户
      const teammates = currentActivity.participants
        .filter(p => p.id !== 1) // 假设当前用户ID是1
        .map(p => ({
          ...p,
          tag: this.getRandomTag(),
          selected: false
        }));
      
      this.setData({ teammates });
    }
  },
  
  // 获取随机标签
  getRandomTag() {
    const tags = ['运动达人', '新手友好', '技术精湛', '团队合作', '守时守信', '积极主动'];
    return tags[Math.floor(Math.random() * tags.length)];
  },
  
    // 切换“加为伙伴”状态
    togglePartner(e) {
      const index = e.currentTarget.dataset.index;
      const key = `teammates[${index}].selected`;
      this.setData({ [key]: !this.data.teammates[index].selected });
    },
  
    // 提交结算
  submitSettle() {
    const selectedPartners = this.data.teammates.filter(t => t.selected);
    
    wx.showLoading({ title: '结算中...' });

    try {
      // Mock 后端请求
      setTimeout(() => {
        try {
          wx.hideLoading();
          
          // 保存个人成就
          this.savePersonalAchievements();
          
          // 逻辑分支：如果有选中的伙伴
          if (selectedPartners.length > 0) {
            // 模拟伙伴确认请求
            this.confirmPartners(selectedPartners);
          } else {
            // 没有建立伙伴关系
            this.showNoPartnerResult();
          }
        } catch (error) {
          console.error('结算过程中出错:', error);
          wx.hideLoading();
          wx.showToast({ 
            title: '结算失败，请重试', 
            icon: 'none',
            duration: 2000
          });
        }
      }, 1000);
    } catch (error) {
      console.error('结算初始化出错:', error);
      wx.hideLoading();
      wx.showToast({ 
        title: '结算失败，请重试', 
        icon: 'none',
        duration: 2000
      });
    }
  },
  
  // 保存个人成就
  savePersonalAchievements() {
    // 从本地存储获取当前成就
    let userAchievements = wx.getStorageSync('user_achievements') || {
      totalCredit: 0,
      totalAchievement: 0,
      totalDuration: 0
    };
    
    // 更新成就
    userAchievements = {
      totalCredit: userAchievements.totalCredit + this.data.personalAchievements.credit,
      totalAchievement: userAchievements.totalAchievement + this.data.personalAchievements.achievement,
      totalDuration: userAchievements.totalDuration + this.data.personalAchievements.duration
    };
    
    // 保存到本地存储
    wx.setStorageSync('user_achievements', userAchievements);
  },
  
  // 确认伙伴关系
  confirmPartners(selectedPartners) {
    // 模拟伙伴确认逻辑（双向确认）
    const confirmedPartners = selectedPartners.filter(p => Math.random() > 0.3); // 70%概率确认
    
    if (confirmedPartners.length > 0) {
      const partnerNames = confirmedPartners.map(p => p.nickname).join(',');
      
      // 保存伙伴关系
      this.savePartnerships(confirmedPartners);
      
      // 显示成功提示
      wx.showModal({
        title: '恭喜！',
        content: `你们合作得很棒！\n\n已与 ${partnerNames} 建立固定运动伙伴关系！\n\n个人成就：\n- 信用值 +${this.data.personalAchievements.credit}\n- 成就值 +${this.data.personalAchievements.achievement}\n\n伙伴成就加成：\n- 额外信用值 +${this.data.partnerAchievements.credit}\n- 额外成就值 +${this.data.partnerAchievements.achievement}`,
        showCancel: false,
        confirmText: '太棒了',
        success: () => {
          this.goBack();
        }
      });
    } else {
      // 伙伴未确认
      wx.showModal({
        title: '温馨提示',
        content: '队友暂未确认，个人成就已保存至历史记录。',
        showCancel: false,
        confirmText: '知道了',
        success: () => {
          this.goBack();
        }
      });
    }
  },
  
  // 保存伙伴关系
  savePartnerships(partners) {
    // 从本地存储获取当前伙伴列表
    let partnerships = wx.getStorageSync('user_partnerships') || [];
    
    // 更新伙伴列表
    partners.forEach(partner => {
      if (!partnerships.find(p => p.id === partner.id)) {
        partnerships.push({
          id: partner.id,
          nickname: partner.nickname,
          avatar: partner.avatar,
          credit: this.data.partnerAchievements.credit,
          achievement: this.data.partnerAchievements.achievement,
          joinTime: new Date().toISOString()
        });
      }
    });
    
    // 保存到本地存储
    wx.setStorageSync('user_partnerships', partnerships);
    
    // 更新个人成就（包含伙伴加成）
    let userAchievements = wx.getStorageSync('user_achievements');
    userAchievements = {
      totalCredit: userAchievements.totalCredit + this.data.partnerAchievements.credit * partners.length,
      totalAchievement: userAchievements.totalAchievement + this.data.partnerAchievements.achievement * partners.length,
      totalDuration: userAchievements.totalDuration
    };
    wx.setStorageSync('user_achievements', userAchievements);
  },
  
  // 显示没有选择伙伴的结果
  showNoPartnerResult() {
    wx.showModal({
      title: '活动结算完成',
      content: `你们合作得很棒！\n\n个人成就已保存至历史记录：\n- 信用值 +${this.data.personalAchievements.credit}\n- 成就值 +${this.data.personalAchievements.achievement}\n- 运动时长 +${this.data.personalAchievements.duration}小时`,
      showCancel: false,
      confirmText: '确定',
      success: () => {
        this.goBack();
      }
    });
  },
  
    goBack() {
      // 返回首页或活动列表
      wx.switchTab({ url: '/pages/activity/activity' });
    }
  })