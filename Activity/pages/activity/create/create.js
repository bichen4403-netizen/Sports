Page({
    data: {
      sportsTypes: [
        '跑步','骑行','越野','羽毛球','乒乓球','篮球','足球','排球',
        '游泳','网球','健身','飞盘','攀岩','徒步','冲浪','滑雪',
        '瑜伽','舞蹈','台球','露营','高尔夫','滑板','滑冰','划船','射箭','拳击','马术','橄榄球'
      ],
      // 标签状态
      tagNewbie: false, tagIntense: false, tagTeaching: false, 
      tagAdvanced: false, tagFree: false, tagAA: false,
      
      formData: {
        title: '',
        sport: '', // 前端暂存，提交时转为 type
        category: '自由报名', // 暂时保留，接口未提及但可能有扩展
        date: '',
        time: '',
        location: '', // 详细地址
        venue: '',    // 场馆名称
        city: '本地', 
        max_people: '',
        description: '',
        contact: '',     // 联系人姓名
        contactInfo: '', // 联系方式 (对应接口 contact)
        image: '',       // 对应接口 cover_url
        relatedImages: [],
        tags: []
      }
    },
  
handleInput(e) {
      const field = e.currentTarget.dataset.field;
      this.setData({ [`formData.${field}`]: e.detail.value });
    },
    handleSportChange(e) {
      this.setData({ 'formData.sport': this.data.sportsTypes[e.detail.value] });
    },
    setCategory(e) {
      this.setData({ 'formData.category': e.currentTarget.dataset.val });
    },
    handleDateChange(e) {
      this.setData({ 'formData.date': e.detail.value });
    },
    handleTimeChange(e) {
      this.setData({ 'formData.time': e.detail.value });
    },
    onLoad() {
      this.setData({ 'formData.tags': [] });
    },
    chooseImage() {
      wx.chooseMedia({
        count: 1, mediaType: ['image'], sourceType: ['album', 'camera'],
        success: (res) => {
          this.setData({ 'formData.image': res.tempFiles[0].tempFilePath });
        }
      });
    },
    chooseLocation() {
      wx.chooseLocation({
        success: (res) => {
            // 简单处理城市逻辑
            let city = '本地';
            if(res.address) {
                // 尝试提取市级
                const match = res.address.match(/([^省]+市|[^自治区]+自治州)/);
                if(match) city = match[0];
            }
            this.setData({
                'formData.location': res.address, // 详细地址
                'formData.venue': res.name,       // 场所名
                'formData.city': city
            });
        }
      });
    },
    
    // 添加相关图片
    addRelatedImage() {
      const currentCount = this.data.formData.relatedImages.length;
      const maxCount = 9; // 最多9张相关图片
      
      wx.chooseMedia({
        count: maxCount - currentCount,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const newImages = res.tempFiles.map(file => file.tempFilePath);
          const updatedImages = [...this.data.formData.relatedImages, ...newImages];
          
          this.setData({
            'formData.relatedImages': updatedImages
          });
        }
      });
    },
    
    // 删除相关图片
    removeRelatedImage(e) {
      const index = e.currentTarget.dataset.index;
      const updatedImages = this.data.formData.relatedImages.filter((_, i) => i !== index);
      
      this.setData({
        'formData.relatedImages': updatedImages
      });
    },
    
    // 分别处理每个标签的点击事件
    toggleTagNewbie() { this.setData({tagNewbie: !this.data.tagNewbie}); this.updateTagsArray(); },
    toggleTagIntense() { this.setData({tagIntense: !this.data.tagIntense}); this.updateTagsArray(); },
    toggleTagTeaching() { this.setData({tagTeaching: !this.data.tagTeaching}); this.updateTagsArray(); },
    toggleTagAdvanced() { this.setData({tagAdvanced: !this.data.tagAdvanced}); this.updateTagsArray(); },
    toggleTagFree() { this.setData({tagFree: !this.data.tagFree}); this.updateTagsArray(); },
    toggleTagAA() { this.setData({tagAA: !this.data.tagAA}); this.updateTagsArray(); },
    updateTagsArray() {
      const tags = [];
      if (this.data.tagNewbie) tags.push('新手友好');
      if (this.data.tagIntense) tags.push('上强度');
      if (this.data.tagAdvanced) tags.push('进阶');
      if (this.data.tagTeaching) tags.push('有教学');
      if (this.data.tagFree) tags.push('免费');
      if (this.data.tagAA) tags.push('AA制');
      this.setData({ 'formData.tags': tags });
    },
  
    submit() {
      // 直接使用 this.data.formData，确保所有字段都能获取到
      const formData = this.data.formData;
      const { title, sport, date, time, location, venue, image, max_people, description, contact, contactInfo, city } = formData;
      
      console.log('=== 表单数据 ===');
      console.log('contact:', contact);
      console.log('contactInfo:', contactInfo);
      
      if (!title || !sport || !date || !time || !location) {
        wx.showToast({ title: '请完善核心信息', icon: 'none' });
        return;
      }

      wx.showLoading({ title: '发布中...' });

    // --- 构造匹配后端接口的数据结构 ---
      const apiPayload = {
          creator_id: 1, // Mock ID，实际应从全局用户状态获取
          title: title,
          type: sport, // 接口字段名为 type
          city: city || '北京',
          venue: venue || location,
          location: location,
          // 接口要求格式 YYYY-MM-DD HH:mm:ss
          time: `${date} ${time}:00`, 
          max_people: parseInt(max_people) || 10,
          cover_url: image, // 接口字段名为 cover_url
          description: description,
          contact: contactInfo || contact || '', // 接口字段名为 contact，确保有值
          contactInfo: contactInfo || contact || '' // 保存联系方式
          // 注意：tags 和 relatedImages 接口目前未列出，但在Mock中我们存入以便展示
          // 实际对接时需确认后端是否新增了 extra 字段或 tags 字段
      };
      
      console.log('=== 提交活动数据 ===');
      console.log('formData:', formData);
      console.log('apiPayload:', apiPayload);

      // --- MOCK 发送请求逻辑 ---
      setTimeout(() => {
        // 1. 获取现有列表
        let list = wx.getStorageSync('activity_list') || [];
        
        // 2. 将 Payload 转换为本地存储格式 (模拟后端处理后的返回)
        // 后端存入数据库后，返回给前端 list 接口时，格式会变成 source: 45 的格式
        const newActivityResponse = {
          id: Date.now(),
          title: apiPayload.title,
          type: apiPayload.type,
          city: apiPayload.city,
          venue: apiPayload.venue,
          location: apiPayload.location,
          time: apiPayload.time, // 保持完整时间字符串
          max_people: apiPayload.max_people,
          current_people: 1,
          cover: apiPayload.cover_url, // 响应里通常叫 cover
          description: apiPayload.description,
          contact: this.data.formData.contact, // 直接使用表单中的联系人
          contactInfo: this.data.formData.contactInfo, // 直接使用表单中的联系方式
          creator: {
              id: 1, // 添加creator.id，便于判断发起者
              nickname: "我", // Mock
              avatar: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'
          },
          participants: [{
              id: 1,
              nickname: "我",
              avatar: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'
          }], // 添加参与者列表，包含发起者
          // 补充前端额外需要的数据
          tags: [...this.data.formData.tags, this.data.formData.category],
          relatedImages: this.data.formData.relatedImages,
          distance: 0.1,
          status: 0 // 添加活动状态，默认为报名中
        };
        
        console.log('=== 新创建的活动数据 ===');
        console.log('表单联系信息:', {
          contact: this.data.formData.contact,
          contactInfo: this.data.formData.contactInfo
        });
        console.log('保存的联系信息:', {
          contact: newActivityResponse.contact,
          contactInfo: newActivityResponse.contactInfo
        });
        console.log('活动状态:', newActivityResponse.status);
  
        // 3. 插入到头部
        list.unshift(newActivityResponse);
  
        // 4. 保存回本地缓存
        wx.setStorageSync('activity_list', list);
  
        wx.hideLoading();
        wx.showToast({ title: '发布成功', icon: 'success' });
  
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
  
      }, 1000);
    }
  })