from django.urls import path
from .views import (
    home,
    login,
    UserListView,
    UserDetailView,
    CurrentUserView,
    ChangePasswordView,
    DailyReportListView,
    DailyReportDetailView,
    UserDailyReportsView,
    TaskCategoryListView,
    TaskCategoryDetailView,
    HolidayListView,
    HolidayDetailView
)

urlpatterns = [
    path('', home, name='home'),
    path('login/', login, name='login'),
    path('users/', UserListView.as_view(), name='user-list'),
    path('users/<int:pk>/', UserDetailView.as_view(), name='user-detail'),
    path('users/me/', CurrentUserView.as_view(), name='current-user'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('daily-reports/', DailyReportListView.as_view(), name='daily-report-list'),
    path('daily-reports/<int:pk>/', DailyReportDetailView.as_view(), name='daily-report-detail'),
    path('users/<int:user_id>/reports/', UserDailyReportsView.as_view(), name='user-daily-reports'),
    path('task-categories/', TaskCategoryListView.as_view(), name='task-category-list'),
    path('task-categories/<int:pk>/', TaskCategoryDetailView.as_view(), name='task-category-detail'),
    path('holidays/', HolidayListView.as_view(), name='holiday-list'),
    path('holidays/<int:pk>/', HolidayDetailView.as_view(), name='holiday-detail'),
]
