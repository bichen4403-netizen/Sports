from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Q
from .models import AppUser, UserLike, Activity, ActivityParticipant, Friendship
import json
import datetime

# =======================
# 1. 用户模块 (主页 & 资料)
# =======================

# 1.1更新/注册个人资料 (支持复杂标签)
@csrf_exempt
def update_profile(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        user_id = data.get('user_id')
        
        # 准备数据字典
        update_data = {
            "nickname": data.get('nickname'),
            "avatar_url": data.get('avatar'),
            "gender": data.get('gender'),
            "age": data.get('age'),
            "school": data.get('school'),
            "location": data.get('location'),
            "short_desc": data.get('short_desc'),
            "intro": data.get('intro'),
            
            # 标签：建议前端传过来是数组 ["跑步", "游泳"]，后端转成字符串 "跑步,游泳" 存进库
            "tags_sport": ",".join(data.get('tags_sport', [])), 
            "tags_level": data.get('tags_level'),
            "tags_habit": ",".join(data.get('tags_habit', [])),
            "tags_target": data.get('tags_target')
        }

        if user_id:
            # 修改
            AppUser.objects.filter(id=user_id).update(**update_data)
            return JsonResponse({"code": 200, "msg": "修改成功", "user_id": user_id})
        else:
            # 注册
            new_user = AppUser.objects.create(**update_data)
            return JsonResponse({"code": 200, "msg": "创建成功", "user_id": new_user.id})

# 1.2获取个人资料
def get_profile(request):
    user_id = request.GET.get('user_id')
    try:
        u = AppUser.objects.get(id=user_id)
        # 把逗号分隔的字符串转回数组给前端
        tags_sport_list = u.tags_sport.split(',') if u.tags_sport else []
        tags_habit_list = u.tags_habit.split(',') if u.tags_habit else []
        
        return JsonResponse({
            "code": 200,
            "data": {
                "id": u.id,
                "nickname": u.nickname,
                "avatar": u.avatar_url,
                "age": u.age,
                "school": u.school,
                "short_desc": u.short_desc,
                "intro": u.intro,
                "credit": u.credit_score,
                "tags": {
                    "sport": tags_sport_list,
                    "level": u.tags_level,
                    "habit": tags_habit_list,
                    "target": u.tags_target
                }
            }
        })
    except AppUser.DoesNotExist:
        return JsonResponse({"code": 404, "msg": "用户不存在"})

# =======================
# 2. 匹配模块
# =======================
@csrf_exempt
def swipe_user(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        me_id = data.get('my_id')
        target_id = data.get('target_id')
        action = data.get('action') # 'like' / 'pass'

        # 1. 记录操作
        UserLike.objects.create(sender_id=me_id, receiver_id=target_id, action_type=action)

        is_match = False
        if action == 'like':
            # 2. 检查对方是否喜欢过我
            has_liked_back = UserLike.objects.filter(
                sender_id=target_id, receiver_id=me_id, action_type='like'
            ).exists()
            
            if has_liked_back:
                is_match = True
                # 3. ★关键点：匹配成功，建立伙伴关系
                # 检查是否已经存在关系，避免重复创建
                exists = Friendship.objects.filter(
                    Q(user_a_id=me_id, user_b_id=target_id) | 
                    Q(user_a_id=target_id, user_b_id=me_id)
                ).exists()
                
                if not exists:
                    Friendship.objects.create(user_a_id=me_id, user_b_id=target_id)

        return JsonResponse({"code": 200, "is_match": is_match, "msg": "操作成功"})

# =======================
# 3. 伙伴 & 成就模块 (文档中的"成就/聊天")
# =======================

# 3.1获取我的伙伴列表
def get_friend_list(request):
    my_id = request.GET.get('user_id')
    # 3.1.1查找所有和我有关的 Friendship
    friends_rel = Friendship.objects.filter(Q(user_a_id=my_id) | Q(user_b_id=my_id))
    
    data_list = []
    for rel in friends_rel:
        # 3.1.2判断谁是对方
        friend_id = rel.user_b_id if str(rel.user_a_id) == str(my_id) else rel.user_a_id
        try:
            friend_user = AppUser.objects.get(id=friend_id)
            data_list.append({
                "friend_id": friend_user.id,
                "nickname": friend_user.nickname,
                "avatar": friend_user.avatar_url,
                "achievement_score": rel.achievement_score # 伙伴成就值
            })
        except:
            continue
            
    return JsonResponse({"code": 200, "data": data_list})

# 3.2获取"伙伴空间"详情 (成长地图数据)
def get_partner_space(request):
    my_id = request.GET.get('my_id')
    friend_id = request.GET.get('friend_id')
    
    # 3.2.1查找关系
    try:
        rel = Friendship.objects.get(
            Q(user_a_id=my_id, user_b_id=friend_id) | 
            Q(user_a_id=friend_id, user_b_id=my_id)
        )
    except Friendship.DoesNotExist:
        return JsonResponse({"code": 404, "msg": "你们还不是伙伴"})

    # 3.2.2查找共同参加过的活动 (用于生成成长地图里程碑)
    # 逻辑：查找两个人都报了名的活动
    my_acts = ActivityParticipant.objects.filter(user_id=my_id).values_list('activity_id', flat=True)
    friend_acts = ActivityParticipant.objects.filter(user_id=friend_id).values_list('activity_id', flat=True)
    
    # 3.2.3取交集 (两个列表里都有的ID)
    common_ids = list(set(my_acts) & set(friend_acts))
    
    milestones = []
    activities = Activity.objects.filter(id__in=common_ids).order_by('-event_time')
    
    for act in activities:
        milestones.append({
            "activity_id": act.id,
            "title": act.title,
            "time": act.event_time.strftime('%Y-%m-%d'),
            "location": act.location,
            "cover": act.cover_url
        })

    return JsonResponse({
        "code": 200,
        "data": {
            "achievement_score": rel.achievement_score,
            "co_duration": rel.co_exercise_duration,
            "milestones": milestones # 前端用这个渲染"蜿蜒向上的路径"
        }
    })

# =======================
# 4. 活动模块
# =======================

# 4.1发布活动
@csrf_exempt
def create_activity(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        Activity.objects.create(
            creator_id=data.get('creator_id'),
            title=data.get('title'),
            type=data.get('type'),
            city=data.get('city', '默认城市'),
            venue_name=data.get('venue'),
            location=data.get('location'),
            event_time=data.get('time'),
            description=data.get('description'),
            contact_info=data.get('contact'),
            max_people=data.get('max_people', 10),
            cover_url=data.get('cover_url'),
            current_people=1 # 默认含自己
        )
        return JsonResponse({"code": 200, "msg": "发布成功"})

# 4.2获取活动列表 (支持筛选)
def get_activity_list(request):
    # 筛选参数
    filter_type = request.GET.get('type') # 运动类型
    filter_city = request.GET.get('city') # 城市
    sort_by = request.GET.get('sort')     # 排序: time / distance
    
    activities = Activity.objects.all()

    if filter_type and filter_type != "全部":
        activities = activities.filter(type=filter_type)
    
    if filter_city:
        activities = activities.filter(city__contains=filter_city)
        
    # 排序逻辑
    if sort_by == 'time':
        activities = activities.order_by('event_time')
    else:
        # 默认按最新发布排
        activities = activities.order_by('-id')

    data = []
    for act in activities:
        # 获取发起人信息
        try:
            creator = AppUser.objects.get(id=act.creator_id)
            creator_data = {"nickname": creator.nickname, "avatar": creator.avatar_url}
        except:
            creator_data = {}

        data.append({
            "id": act.id,
            "title": act.title,
            "time_str": act.event_time.strftime('%m-%d %H:%M'), # 格式化时间
            "weekday": act.event_time.strftime('%A'), # 星期几
            "city": act.city,
            "venue": act.venue_name,
            "distance": "500m", # 距离需要结合经纬度计算，暂时Mock一个数据
            "current_people": act.current_people,
            "max_people": act.max_people,
            "cover": act.cover_url,
            "creator": creator_data
        })
        
    return JsonResponse({"code": 200, "data": data})

# 参加活动接口
# =======================
@csrf_exempt
def join_activity(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        user_id = data.get('user_id')
        activity_id = data.get('activity_id')
        
        try:
            activity = Activity.objects.get(id=activity_id)
            
            # 1. 检查是不是人满了
            if activity.current_people >= activity.max_people:
                return JsonResponse({"code": 400, "msg": "报名人数已满"})
            
            # 2. 检查是不是已经报过名了
            if ActivityParticipant.objects.filter(activity_id=activity_id, user_id=user_id).exists():
                return JsonResponse({"code": 400, "msg": "你已经报过名了"})

            # 3. 报名成功：加记录，人数+1
            ActivityParticipant.objects.create(activity_id=activity_id, user_id=user_id)
            activity.current_people += 1
            activity.save()
            
            return JsonResponse({"code": 200, "msg": "报名成功"})
            
        except Activity.DoesNotExist:
            return JsonResponse({"code": 404, "msg": "活动不存在"})