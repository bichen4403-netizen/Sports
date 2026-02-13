from django.db import models
import json # 存标签

class AppUser(models.Model):
    # --- 基础信息 ---
    nickname = models.CharField(max_length=50, verbose_name="昵称")
    avatar_url = models.CharField(max_length=500, null=True, verbose_name="头像/照片")
    gender = models.CharField(max_length=10, null=True, verbose_name="性别")
    age = models.IntegerField(null=True, verbose_name="年龄") # 新增
    school = models.CharField(max_length=100, null=True, verbose_name="学校") # 新增
    location = models.CharField(max_length=100, null=True, verbose_name="地理位置") # 新增
    
    # --- 简介 ---
    short_desc = models.CharField(max_length=50, null=True, verbose_name="一句话描述") # 匹配页用
    intro = models.TextField(null=True, verbose_name="个人简介(长文本)") # 主页用

    # --- 标签体系 (建议存成字符串，用逗号分隔，或者存JSON字符串) ---
    # 1. 运动类型 (跑步、骑行...)
    tags_sport = models.TextField(null=True, verbose_name="运动类型标签") 
    # 2. 自身段位 (新手、高阶...)
    tags_level = models.CharField(max_length=50, null=True, verbose_name="段位标签") 
    # 3. 习惯与偏好 (早期型、话唠...)
    tags_habit = models.TextField(null=True, verbose_name="习惯与偏好标签") 
    # 4. 目标匹配 (提升训练、轻松运动...)
    tags_target = models.CharField(max_length=50, null=True, verbose_name="目标标签")

    # --- 数值 ---
    credit_score = models.IntegerField(default=100, verbose_name="信用值")
    personal_achievement = models.IntegerField(default=0, verbose_name="个人成就值")

    class Meta:
        db_table = 'users'


# 2. 喜欢/匹配记录表 (对应文档：交友滑动)
class UserLike(models.Model):
    sender_id = models.IntegerField(verbose_name="发起者ID")
    receiver_id = models.IntegerField(verbose_name="被喜欢者ID")
    action_type = models.CharField(max_length=10, verbose_name="类型(like/pass)")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="时间")

    class Meta:
        db_table = 'user_likes'


# 3. 伙伴关系表 (新增! 对应"成就/聊天"模块)
# 当两个人互相 like 后，在这里创建一条记录
class Friendship(models.Model):
    user_a_id = models.IntegerField(verbose_name="用户A")
    user_b_id = models.IntegerField(verbose_name="用户B")
    achievement_score = models.IntegerField(default=0, verbose_name="伙伴成就值")
    co_exercise_count = models.IntegerField(default=0, verbose_name="共同运动次数")
    co_exercise_duration = models.IntegerField(default=0, verbose_name="共同运动时长(分钟)")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="成为伙伴时间")

    class Meta:
        db_table = 'friendships'


# 4. 活动表
class Activity(models.Model):
    creator_id = models.IntegerField(verbose_name="发起人ID")
    title = models.CharField(max_length=100, verbose_name="标题")
    
    # 地点相关
    city = models.CharField(max_length=50, null=True, verbose_name="城市") # 新增，用于筛选
    location = models.CharField(max_length=100, verbose_name="详细地址/定位")
    venue_name = models.CharField(max_length=100, null=True, verbose_name="场馆名称") # 新增

    # 时间与类型
    event_time = models.DateTimeField(verbose_name="活动时间") # 前端可以格式化为 日期+星期+时间点
    type = models.CharField(max_length=50, verbose_name="运动类型") # 用于筛选
    
    # 详情
    description = models.TextField(null=True, verbose_name="活动描述")
    contact_info = models.CharField(max_length=100, null=True, verbose_name="联系方式") # 新增
    
    # 状态与人数
    max_people = models.IntegerField(default=10, verbose_name="最大人数")
    current_people = models.IntegerField(default=0, verbose_name="当前人数")
    cover_url = models.CharField(max_length=500, null=True, verbose_name="封面图URL")
    status = models.IntegerField(default=0, verbose_name="状态") # 0报名中 1已结束

    class Meta:
        db_table = 'activities'


# 5. 活动参与表
class ActivityParticipant(models.Model):
    activity_id = models.IntegerField(verbose_name="活动ID")
    user_id = models.IntegerField(verbose_name="用户ID")
    # 记录报名时的状态，比如 "已通过"
    status = models.CharField(max_length=20, default='success', verbose_name="状态")
    join_time = models.DateTimeField(auto_now_add=True, verbose_name="加入时间")

    class Meta:
        db_table = 'activity_participants'