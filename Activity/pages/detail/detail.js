// pages/detail/detail.js
const app = getApp();

Page({
  data: {
    activity: null,
    isCreator: false, // 是否是发起者
    isJoined: false,  // 是否已参与
    status: 0,        // 0:报名中, 1:进行中, 2:已结束
    currentUserId: 1,  // 模拟当前登录用户ID
    participants: []  // 参与者列表
  },

  onLoad(options) {
    if (options.data) {
      const activityData = JSON.parse(decodeURIComponent(options.data));
      console.log('=== 活动详情页加载 ===');
      console.log('接收到的活动数据:', activityData);
      
      // 检查当前用户是否是发起者
      let isCreator = false;
      if (activityData.creator) {
        console.log('Creator信息:', activityData.creator);
        // 情况1：creator有id属性
        if (activityData.creator.id) {
          console.log('根据creator.id判断:', activityData.creator.id, 'vs', this.data.currentUserId);
          isCreator = activityData.creator.id === this.data.currentUserId;
        } 
        // 情况2：根据nickname判断
        else if (activityData.creator.nickname) {
          console.log('根据creator.nickname判断:', activityData.creator.nickname);
          // 根据实际数据，creator.nickname为"我"
          isCreator = activityData.creator.nickname === "我" && this.data.currentUserId === 1;
        }
      }
      console.log('isCreator判断结果:', isCreator);
      
      // 获取活动状态
      let status = activityData.status !== undefined ? activityData.status : 0;
      console.log('活动状态:', status);

      // 检查当前用户是否已参与
      const participants = activityData.participants || [];
      const isJoined = participants.some(p => p.id === this.data.currentUserId);
      console.log('是否已参与:', isJoined);

      // 检查联系信息
      console.log('联系信息检查:', {
        contact: activityData.contact,
        contactInfo: activityData.contactInfo
      });

      this.setData({ 
        activity: activityData,
        isCreator: isCreator,
        status: status,
        isJoined: isJoined,
        participants: participants
      });
      
      this.updateTitle(status);
      
      // 检查最终状态
      console.log('=== 最终状态 ===');
      console.log('isCreator:', this.data.isCreator);
      console.log('status:', this.data.status);
      console.log('isJoined:', this.data.isJoined);
    }
  },

  updateTitle(status) {
    const titles = ['活动详情', '活动进行中', '活动已结束'];
    wx.setNavigationBarTitle({ title: titles[status] || '活动详情' });
  },

  // 1. 参与者报名
  join() {
    // 模拟报名请求
    wx.showLoading({ title: '报名中...' });
    
    try {
      setTimeout(() => {
        try {
          wx.hideLoading();
          
          // 模拟报名成功
          this.setData({ isJoined: true });
          
          // 保存到本地存储（实际项目中应该调用API）
          let localActivities = wx.getStorageSync('activity_list') || [];
          let updatedActivities = localActivities.map(act => {
            if (act.id === this.data.activity.id) {
              // 更新参与者信息
              const updatedParticipants = [...(act.participants || []), {
                id: this.data.currentUserId,
                nickname: '当前用户',
                avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=User'
              }];
              return {
                ...act,
                participants: updatedParticipants,
                current_people: updatedParticipants.length
              };
            }
            return act;
          });
          wx.setStorageSync('activity_list', updatedActivities);
          
          wx.showToast({ 
            title: '报名成功！', 
            icon: 'success',
            duration: 2000
          });
        } catch (error) {
          console.error('报名过程中出错:', error);
          wx.hideLoading();
          wx.showToast({ 
            title: '报名失败，请重试', 
            icon: 'none',
            duration: 2000
          });
        }
      }, 1000);
    } catch (error) {
      console.error('报名初始化出错:', error);
      wx.hideLoading();
      wx.showToast({ 
        title: '报名失败，请重试', 
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 2. 发起者开始活动 (从报名中 -> 进行中)
  startActivity() {
    wx.showModal({
      title: '确认开始',
      content: '确认人员已齐，开始活动吗？',
      success: (res) => {
        if (res.confirm) {
          // 更新本地状态
          this.setData({ status: 1 });
          this.updateTitle(1);
          
          // 保存到本地存储（实际项目中应该调用API）
          this.updateActivityStatus(1);
          
          wx.showToast({ 
            title: '活动已开始！', 
            icon: 'success'
          });
        }
      }
    })
  },

  // 3. 发起者结束活动 (从进行中 -> 已结束) -> 跳转结算
  finishActivity() {
    wx.showModal({
      title: '结束活动',
      content: '活动已完成？将通知所有成员进行结算。',
      success: (res) => {
        if (res.confirm) {
          // 更新本地状态
          this.setData({ status: 2 });
          
          // 保存到本地存储（实际项目中应该调用API）
          this.updateActivityStatus(2);
          
          // 跳转到结算页面
          this.goToSettle();
        }
      }
    })
  },
  
  // 更新活动状态到本地存储
  updateActivityStatus(status) {
    let localActivities = wx.getStorageSync('activity_list') || [];
    let updatedActivities = localActivities.map(act => {
      if (act.id === this.data.activity.id) {
        return { ...act, status: status };
      }
      return act;
    });
    wx.setStorageSync('activity_list', updatedActivities);
  },

  // 4. 跳转到结算页面
  goToSettle() {
    // 传递活动基本信息和参与者数据
    const dataStr = encodeURIComponent(JSON.stringify({
      ...this.data.activity,
      participants: this.data.activity.participants || [],
      isCreator: this.data.isCreator // 传递是否为发起者
    }));
    wx.navigateTo({
      url: `/pages/activity/settle/settle?data=${dataStr}`,
    });
  },

  share() { wx.showShareMenu(); },
  // 联系信息点击事件
  contact() {
    console.log('=== 联系按钮被点击 ===');
    const { activity } = this.data;
    console.log('活动信息:', activity);
    
    // 检查活动信息
    if (!activity) {
      console.log('活动信息为空');
      wx.showToast({ 
        title: '活动信息加载失败', 
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 只使用联系方式
    const contactInfo = activity.contactInfo;
    console.log('联系信息检查:', {
      contact: activity.contact,
      contactInfo: contactInfo
    });
    
    // 即使没有联系信息，也显示提示
    if (!contactInfo) {
      console.log('没有联系信息，显示提示');
      wx.showToast({ 
        title: '暂无联系信息', 
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    try {
      console.log('准备显示ActionSheet');
      wx.showActionSheet({
        itemList: ['查看联系方式', '复制联系方式'],
        success: (res) => {
          console.log('ActionSheet成功:', res);
          if (res.tapIndex === 0) {
            // 查看联系方式
            console.log('查看联系方式');
            console.log('联系方式:', contactInfo);
            wx.showModal({
              title: '联系信息',
              content: contactInfo,
              showCancel: true,
              cancelText: '关闭',
              confirmText: '复制',
              success: (modalRes) => {
                console.log('Modal结果:', modalRes);
                if (modalRes.confirm) {
                  console.log('用户点击复制');
                  this.copyContactInfo();
                }
              },
              fail: (error) => {
                console.error('Modal失败:', error);
              }
            });
          } else if (res.tapIndex === 1) {
            // 复制联系方式
            console.log('复制联系方式');
            this.copyContactInfo();
          }
        },
        fail: (error) => {
          console.error('ActionSheet失败:', error);
          // 直接显示联系方式
          wx.showModal({
            title: '联系信息',
            content: contactInfo,
            showCancel: true,
            cancelText: '关闭',
            confirmText: '复制',
            success: (modalRes) => {
              if (modalRes.confirm) {
                this.copyContactInfo();
              }
            }
          });
        }
      });
    } catch (error) {
      console.error('联系功能出错:', error);
      // 直接显示联系方式
      wx.showModal({
        title: '联系信息',
        content: contactInfo,
        showCancel: true,
        cancelText: '关闭',
        confirmText: '复制',
        success: (modalRes) => {
          if (modalRes.confirm) {
            this.copyContactInfo();
          }
        }
      });
    }
  },
  
  // 复制联系信息
  copyContactInfo() {
    const { activity } = this.data;
    // 只复制联系方式
    const contactInfo = activity.contactInfo || '';
    
    console.log('复制联系信息:', contactInfo);
    wx.setClipboardData({
      data: contactInfo,
      success: () => {
        wx.showToast({ 
          title: '联系方式已复制', 
          icon: 'success',
          duration: 1500
        });
      },
      fail: (error) => {
        console.error('复制失败:', error);
        wx.showToast({ 
          title: '复制失败，请重试', 
          icon: 'none',
          duration: 1500
        });
      }
    });
  }
})