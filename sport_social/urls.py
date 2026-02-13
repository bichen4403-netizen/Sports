from django.contrib import admin
from django.urls import path
from sport_core import views  # 确保导入了 views

urlpatterns = [
    path('admin/', admin.site.urls),

    # --- 1. 用户相关 ---
    path('api/profile/update', views.update_profile), # 修改/注册个人资料
    path('api/profile', views.get_profile),           # 获取个人资料

    # --- 2. 匹配相关 ---
    path('api/swipe', views.swipe_user),              # 左滑右滑

    # --- 3. 伙伴 & 成就空间 ---
    path('api/friend/list', views.get_friend_list),     # 获取伙伴列表
    path('api/partner/space', views.get_partner_space), # 获取伙伴空间(成长地图)

    # --- 4. 活动相关 ---
    path('api/activity/create', views.create_activity), # 发布活动
    path('api/activity/list', views.get_activity_list), # 获取活动列表
    path('api/activity/join', views.join_activity),     # 参加活动
]