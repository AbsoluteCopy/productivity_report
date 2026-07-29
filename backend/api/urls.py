from django.urls import path
from .views import (
    home,
    login,
    UserListView,
    UserDetailView,
    CurrentUserView,
    DailyReportListView,
    DailyReportDetailView,
    UserDailyReportsView,
    TaskCategoryListView,
    TaskCategoryDetailView
)

urlpatterns = [
    path('', home, name='home'),
    path('login/', login, name='login'),
    path('users/', UserListView.as_view(), name='user-list'),
    path('users/<int:pk>/', UserDetailView.as_view(), name='user-detail'),
    path('users/me/', CurrentUserView.as_view(), name='current-user'),
    path('daily-reports/', DailyReportListView.as_view(), name='daily-report-list'),
    path('daily-reports/<int:pk>/', DailyReportDetailView.as_view(), name='daily-report-detail'),
    path('users/<int:user_id>/reports/', UserDailyReportsView.as_view(), name='user-daily-reports'),
    path('task-categories/', TaskCategoryListView.as_view(), name='task-category-list'),
    path('task-categories/<int:pk>/', TaskCategoryDetailView.as_view(), name='task-category-detail'),
]
