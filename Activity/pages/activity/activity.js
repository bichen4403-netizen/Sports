// pages/activity/activity.js
const app = getApp()

// 1. 模拟后端接口返回的数据结构 (参考 Source 45-47)
// 注意：后端返回的是下划线命名 (snake_case)，且字段名有所变化
const MOCK_API_RESPONSE = [
  {
    id: 1,
    title: '城市夜跑 6km · 轻松局',
    type: '跑步', // 对应后端字段 type
    city: '北京',
    venue: '奥森公园',
    location: '奥林匹克森林公园', // 详细地址
    time: '2026-02-12 19:00:00', // 后端标准时间格式
    max_people: 10,
    current_people: 2, // 后端返回字段
    description: '新手友好，欢迎加入！',
    cover: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&auto=format&fit=crop&q=60', // 接口返回 cover
    creator: {
      nickname: "Felix",
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'
    },
    // 以下字段接口可能不返回，但前端详情页需要，Mock时保留
    distance: 3.2, 
    relatedImages: [],
    tags: ['新手友好', '免费'] 
  },
  {
    id: 2,
    title: '羽毛球双打练习 · 进阶',
    type: '羽毛球',
    city: '北京',
    venue: '朝阳体育馆',
    location: '朝阳区体育馆路',
    time: '2026-02-13 20:00:00',
    max_people: 4,
    current_people: 1,
    description: '来点有实力的，AA制。',
    cover: 'https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?w=800&auto=format&fit=crop&q=60',
    creator: {
      nickname: "Aneka",
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka'
    },
    distance: 5.1,
    relatedImages: [],
    tags: ['AA制', '进阶']
  }
];

Page({
  data: {
    displaySports: ['推荐', '跑步', '骑行', '羽毛球', '篮球'],
    allSports: [
      '跑步','骑行','越野','羽毛球','乒乓球','篮球','足球','排球',
      '游泳','网球','健身','飞盘','攀岩','徒步','冲浪','滑雪',
      '瑜伽','舞蹈','台球','露营','高尔夫','滑板','滑冰','划船','射箭','拳击','马术','橄榄球'
    ],
    showMore: false,
    currentSport: '推荐',
    sortType: 'smart', 
    activities: [],
    allActivities: [],
    searchKeyword: '' 
  },

  onLoad() {
    this.initData();
  },

  onShow() {
    this.initData();
  },

  initData() {
    // 模拟从后端获取数据
    // 实际开发中这里会是 wx.request 请求 /api/activity/list
    let localData = wx.getStorageSync('activity_list');
    
    if (!localData || localData.length === 0) {
      localData = MOCK_API_RESPONSE;
      // 首次加载模拟存入缓存
      wx.setStorageSync('activity_list', localData);
    }

    // 2. 数据适配层 (Adapter)
    // 将后端数据格式转换为前端 WXML 需要的格式
    const formattedData = localData.map(item => {
      // 解析时间字符串 "2026-02-13 20:00:00"
      const timeStr = item.time || '';
      const [datePart, timePart] = timeStr.split(' ');
      
      // 确保 status 字段存在
      const status = item.status !== undefined ? item.status : 0;
      
      return {
        ...item,
        // 映射字段以适配旧的 WXML
        sport: item.type,        // 接口是 type，前端用 sport
        image: item.cover || item.cover_url, // 接口是 cover，前端用 image
        date: datePart,          // 拆解日期
        time: timePart ? timePart.substring(0, 5) : '', // 拆解时间 (20:00)
        avatar: item.creator ? item.creator.avatar : '', // 扁平化头像字段
        status: status           // 确保状态字段存在
      };
    });

    // 按照ID倒序（模拟最新发布）
    formattedData.sort((a, b) => b.id - a.id);

    this.setData({ 
      allActivities: formattedData,
      activities: formattedData 
    });
    
    this.filterAndSort(this.data.currentSport, this.data.sortType);
  },

  handleSearch(e) {
    const keyword = e.detail.value;
    this.setData({ searchKeyword: keyword });
    this.filterAndSort(this.data.currentSport, this.data.sortType);
  },

  filterAndSort(sport, sortType) {
    let list = [...this.data.allActivities];
    const { searchKeyword } = this.data;

    // 1. 搜索
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      list = list.filter(item => 
        item.title.toLowerCase().includes(keyword) || 
        item.venue.toLowerCase().includes(keyword) || 
        item.city.toLowerCase().includes(keyword) ||
        item.sport.toLowerCase().includes(keyword)
      );
    }

    // 2. 筛选 (注意：这里用 mapped 后的 sport 字段)
    if (sport && sport !== '推荐') {
      list = list.filter(item => item.sport === sport);
    }

    // 3. 排序
    // 首先按活动状态排序：报名中(0) > 进行中(1) > 已结束(2)
    list.sort((a, b) => {
      const statusA = a.status || 0;
      const statusB = b.status || 0;
      return statusA - statusB;
    });
    
    // 然后按指定的排序方式排序
    if (sortType === 'distance') {
      list.sort((a, b) => {
        const statusA = a.status || 0;
        const statusB = b.status || 0;
        if (statusA !== statusB) {
          return statusA - statusB;
        }
        return (a.distance || 0) - (b.distance || 0);
      });
    } else if (sortType === 'time') {
      // 此时 item.time 是原始的完整时间字符串吗？
      // 注意：上面的 formattedData 已经覆盖了 item.time 为 "20:00"
      // 为了排序准确，最好在 map 时保留一个 rawTime 字段，或者重新拼接
      list.sort((a, b) => {
        const statusA = a.status || 0;
        const statusB = b.status || 0;
        if (statusA !== statusB) {
          return statusA - statusB;
        }
        
        // 修复iOS设备上Date对象格式不兼容的问题
        const formatDateForIOS = (dateStr, timeStr) => {
          // 将日期格式从 "yyyy-MM-dd" 转换为 "yyyy/MM/dd"
          const formattedDate = dateStr.replace(/-/g, '/');
          // 确保时间格式为 "HH:mm:ss"
          const formattedTime = timeStr.length === 5 ? timeStr + ':00' : timeStr;
          return `${formattedDate} ${formattedTime}`;
        };
        
        const tA = new Date(formatDateForIOS(a.date, a.time)).getTime();
        const tB = new Date(formatDateForIOS(b.date, b.time)).getTime();
        return tA - tB;
      });
    } else {
      // 智能排序（默认）：按状态 + 时间
      list.sort((a, b) => {
        const statusA = a.status || 0;
        const statusB = b.status || 0;
        if (statusA !== statusB) {
          return statusA - statusB;
        }
        
        // 同状态下按时间排序
        const formatDateForIOS = (dateStr, timeStr) => {
          const formattedDate = dateStr.replace(/-/g, '/');
          const formattedTime = timeStr.length === 5 ? timeStr + ':00' : timeStr;
          return `${formattedDate} ${formattedTime}`;
        };
        
        const tA = new Date(formatDateForIOS(a.date, a.time)).getTime();
        const tB = new Date(formatDateForIOS(b.date, b.time)).getTime();
        return tA - tB;
      });
    }

    this.setData({
      activities: list,
      currentSport: sport || '推荐',
      sortType: sortType || 'smart'
    });
  },

  selectSport(e) {
    const sport = e.currentTarget.dataset.sport;
    this.setData({ showMore: false });
    this.filterAndSort(sport, this.data.sortType);
  },
  
  changeSort(e) {
    const type = e.currentTarget.dataset.type;
    this.filterAndSort(this.data.currentSport, type);
  },

  toggleMore() {
    this.setData({ showMore: !this.data.showMore });
  },

  goToDetail(e) {
    const activity = e.currentTarget.dataset.item;
    wx.navigateTo({
      url: `/pages/detail/detail?data=${encodeURIComponent(JSON.stringify(activity))}`
    });
  },

  goToCreate() {
    wx.navigateTo({
      url: '/pages/activity/create/create',
    });
  }
})