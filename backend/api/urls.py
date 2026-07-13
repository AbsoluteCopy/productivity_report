from django.urls import path
from .views import (
    home,
    login,
    UserListView,
    UserDetailView,
    DailyReportListView,
    DailyReportDetailView,
    UserDailyReportsView
)

urlpatterns = [
    path('', home, name='home'),
    path('login/', login, name='login'),
    path('users/', UserListView.as_view(), name='user-list'),
    path('users/<int:pk>/', UserDetailView.as_view(), name='user-detail'),
    path('daily-reports/', DailyReportListView.as_view(), name='daily-report-list'),
    path('daily-reports/<int:pk>/', DailyReportDetailView.as_view(), name='daily-report-detail'),
    path('users/<int:user_id>/reports/', UserDailyReportsView.as_view(), name='user-daily-reports'),
]
