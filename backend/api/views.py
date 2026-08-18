from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.conf import settings
from django.utils import timezone
import jwt
import datetime

from .models import User, DailyReport, TaskCategory, Holiday
from .serializers import (
    UserSerializer, 
    DailyReportSerializer, 
    TaskCategorySerializer, 
    HolidaySerializer
)
from .permissions import IsAdmin, IsHR, IsAdminOrHR, IsAdminOrHRorReadOnly, IsOwnerOrAdminOrHR


def is_more_than_one_month_old(report_date):
    """Check if a date is more than 1 month old from current date."""
    if not report_date:
        return False
    current_date = timezone.now().date()
    one_month_ago = current_date - datetime.timedelta(days=30)
    return report_date < one_month_ago


@api_view(["GET"])
@permission_classes([AllowAny])
def home(request):
    """Public health-check endpoint."""
    return Response({
        "status": "online",
        "message": "Productivity Report API is operating normally."
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    email = request.data.get('email', '')
    password = request.data.get('password', '')

    if not isinstance(email, str) or not isinstance(password, str):
        return Response(
            {"error": "Invalid request payload."}, 
            status=status.HTTP_400_BAD_REQUEST
        )

    email = email.strip().lower()
    if not email or not password:
        return Response(
            {"error": "Email and password are required."}, 
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        user = User.objects.get(email=email)
        if check_password(password, user.password):
            serializer = UserSerializer(user)

            # Generate JWT token bound to current token_version
            now = datetime.datetime.now(datetime.timezone.utc)
            token = jwt.encode({
                'user_id': user.id,
                'token_version': user.token_version,
                'exp': now + datetime.timedelta(days=1),
                'iat': now
            }, settings.SECRET_KEY, algorithm='HS256')

            return Response({
                "message": "Login successful.",
                "user": serializer.data,
                "token": token
            }, status=status.HTTP_200_OK)
        else:
            return Response(
                {"error": "Invalid email or password."}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
    except User.DoesNotExist:
        return Response(
            {"error": "Invalid email or password."}, 
            status=status.HTTP_401_UNAUTHORIZED
        )


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        # Increment token version to immediately invalidate this and any other existing tokens
        user.token_version += 1
        user.save(update_fields=['token_version'])
        return Response({"message": "Successfully logged out."}, status=status.HTTP_200_OK)


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')

        if not current_password or not new_password:
            return Response(
                {"error": "Current password and new password are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not check_password(current_password, user.password):
            return Response(
                {"error": "Current password is incorrect."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            validate_password(new_password)
        except DjangoValidationError as e:
            return Response({"error": list(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

        # Update password and bump token version so old tokens are invalidated
        user.password = make_password(new_password)
        user.token_version += 1
        user.save(update_fields=['password', 'token_version'])

        return Response(
            {"message": "Password changed successfully."},
            status=status.HTTP_200_OK
        )


class UserListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        current_user = request.user
        if current_user.role == 'admin':
            users = User.objects.all()
        elif current_user.role == 'hr' and current_user.company:
            users = User.objects.filter(company=current_user.company)
        else:
            # Regular employee / viewer can view users within same company if set, or just themselves
            if current_user.company:
                users = User.objects.filter(company=current_user.company)
            else:
                users = User.objects.filter(id=current_user.id)

        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)

    def post(self, request):
        current_user = request.user
        # Only Admin and HR can create users
        if current_user.role not in ['admin', 'hr']:
            return Response(
                {"error": "You do not have permission to create users."},
                status=status.HTTP_403_FORBIDDEN
            )

        data = request.data.copy()

        # HR can only create employees/viewers for their own company
        if current_user.role == 'hr':
            if data.get('role') == 'admin':
                return Response(
                    {"error": "HR users cannot create administrator accounts."},
                    status=status.HTTP_403_FORBIDDEN
                )
            data['company'] = current_user.company

        serializer = UserSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        try:
            return User.objects.get(pk=pk)
        except User.DoesNotExist:
            return None

    def get(self, request, pk):
        user = self.get_object(pk)
        if not user:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        current_user = request.user
        # Authorization check
        if current_user.role == 'admin':
            pass
        elif current_user.role == 'hr' and current_user.company == user.company:
            pass
        elif current_user.id == user.id:
            pass
        else:
            return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        serializer = UserSerializer(user)
        return Response(serializer.data)

    def put(self, request, pk):
        user = self.get_object(pk)
        if not user:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        current_user = request.user
        data = request.data.copy()

        if current_user.role == 'admin':
            pass  # Admin can edit anything
        elif current_user.role == 'hr' and current_user.company == user.company:
            # HR cannot elevate to admin or change company
            if data.get('role') == 'admin':
                return Response({"error": "HR cannot promote users to admin."}, status=status.HTTP_403_FORBIDDEN)
            data['company'] = current_user.company
        elif current_user.id == user.id:
            # Self-edit: regular users cannot change their role, company, or id_number
            data.pop('role', None)
            data.pop('company', None)
            data.pop('id_number', None)
        else:
            return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        serializer = UserSerializer(user, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        user = self.get_object(pk)
        if not user:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        current_user = request.user
        # Prevent self-deletion of last admin
        if current_user.role == 'admin':
            if user.id == current_user.id and User.objects.filter(role='admin').count() <= 1:
                return Response({"error": "Cannot delete the sole administrator account."}, status=status.HTTP_400_BAD_REQUEST)
        elif current_user.role == 'hr' and current_user.company == user.company:
            if user.role in ['admin', 'hr']:
                return Response({"error": "HR cannot delete admin or HR accounts."}, status=status.HTTP_403_FORBIDDEN)
        else:
            return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        user.delete()
        return Response({"message": "User deleted successfully."}, status=status.HTTP_204_NO_CONTENT)


class DailyReportListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        current_user = request.user
        reports = DailyReport.objects.select_related('user').all()

        year = request.GET.get("year")
        month = request.GET.get("month")
        user_id_param = request.GET.get("user_id")

        if current_user.role == 'admin':
            if user_id_param:
                reports = reports.filter(user_id=user_id_param)
        elif current_user.role == 'hr' and current_user.company:
            reports = reports.filter(user__company=current_user.company)
            if user_id_param:
                reports = reports.filter(user_id=user_id_param)
        else:
            # Regular employee / viewer can ONLY see their own reports
            reports = reports.filter(user=current_user)

        if year:
            reports = reports.filter(date__year=year)
        if month:
            reports = reports.filter(date__month=month)

        serializer = DailyReportSerializer(reports.order_by("date"), many=True)
        return Response(serializer.data)

    def post(self, request):
        current_user = request.user
        data = request.data.copy()

        # Regular employees/viewers can only create reports for themselves
        if current_user.role not in ['admin', 'hr']:
            data['user'] = current_user.id
        elif current_user.role == 'hr':
            # HR can create reports for themselves or users in their company
            target_user_id = data.get('user', current_user.id)
            try:
                target_user = User.objects.get(id=target_user_id)
                if target_user.company != current_user.company:
                    return Response({"error": "Cannot submit report for employee in different company."}, status=status.HTTP_403_FORBIDDEN)
            except User.DoesNotExist:
                return Response({"error": "Target user not found."}, status=status.HTTP_404_NOT_FOUND)
        else:
            # Admin defaults to self if user not provided
            if not data.get('user'):
                data['user'] = current_user.id

        serializer = DailyReportSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DailyReportDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        try:
            return DailyReport.objects.select_related('user').get(pk=pk)
        except DailyReport.DoesNotExist:
            return None

    def check_report_permission(self, request, report):
        current_user = request.user
        if current_user.role == 'admin':
            return True
        if current_user.role == 'hr' and current_user.company and report.user.company == current_user.company:
            return True
        return report.user_id == current_user.id

    def get(self, request, pk):
        report = self.get_object(pk)
        if not report:
            return Response({"error": "Daily report not found."}, status=status.HTTP_404_NOT_FOUND)

        if not self.check_report_permission(request, report):
            return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        serializer = DailyReportSerializer(report)
        return Response(serializer.data)

    def put(self, request, pk):
        report = self.get_object(pk)
        if not report:
            return Response({"error": "Daily report not found."}, status=status.HTTP_404_NOT_FOUND)

        if not self.check_report_permission(request, report):
            return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        # Enforce 1-month edit restriction
        if is_more_than_one_month_old(report.date):
            return Response(
                {"error": "Cannot edit records older than 1 month."},
                status=status.HTTP_403_FORBIDDEN
            )

        data = request.data.copy()
        # Employees cannot reassign reports to other users
        if request.user.role not in ['admin', 'hr']:
            data.pop('user', None)

        serializer = DailyReportSerializer(report, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        report = self.get_object(pk)
        if not report:
            return Response({"error": "Daily report not found."}, status=status.HTTP_404_NOT_FOUND)

        if not self.check_report_permission(request, report):
            return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        # Enforce 1-month delete restriction
        if is_more_than_one_month_old(report.date):
            return Response(
                {"error": "Cannot delete records older than 1 month."},
                status=status.HTTP_403_FORBIDDEN
            )

        report.delete()
        return Response({"message": "Daily report deleted successfully."}, status=status.HTTP_204_NO_CONTENT)


class UserDailyReportsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        current_user = request.user
        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        if current_user.role == 'admin':
            pass
        elif current_user.role == 'hr' and current_user.company and target_user.company == current_user.company:
            pass
        elif current_user.id == target_user.id:
            pass
        else:
            return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        reports = DailyReport.objects.filter(user_id=user_id)
        year = request.GET.get("year")
        month = request.GET.get("month")
        if year:
            reports = reports.filter(date__year=year)
        if month:
            reports = reports.filter(date__month=month)

        serializer = DailyReportSerializer(reports.order_by("date"), many=True)
        return Response(serializer.data)


class TaskCategoryListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        current_user = request.user
        if current_user.role == 'admin':
            categories = TaskCategory.objects.all()
        elif current_user.company:
            categories = TaskCategory.objects.filter(company__in=[current_user.company, None, ''])
        else:
            categories = TaskCategory.objects.all()

        serializer = TaskCategorySerializer(categories, many=True)
        return Response(serializer.data)

    def post(self, request):
        if request.user.role not in ['admin', 'hr']:
            return Response({"error": "Only Admin or HR can create task categories."}, status=status.HTTP_403_FORBIDDEN)

        data = request.data.copy()
        if request.user.role == 'hr':
            data['company'] = request.user.company

        serializer = TaskCategorySerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TaskCategoryDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        try:
            return TaskCategory.objects.get(pk=pk)
        except TaskCategory.DoesNotExist:
            return None

    def get(self, request, pk):
        category = self.get_object(pk)
        if not category:
            return Response({"error": "Task category not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = TaskCategorySerializer(category)
        return Response(serializer.data)

    def put(self, request, pk):
        if request.user.role not in ['admin', 'hr']:
            return Response({"error": "Only Admin or HR can edit task categories."}, status=status.HTTP_403_FORBIDDEN)

        category = self.get_object(pk)
        if not category:
            return Response({"error": "Task category not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.user.role == 'hr' and category.company and category.company != request.user.company:
            return Response({"error": "Cannot modify categories belonging to another company."}, status=status.HTTP_403_FORBIDDEN)

        data = request.data.copy()
        if request.user.role == 'hr':
            data['company'] = request.user.company

        serializer = TaskCategorySerializer(category, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        if request.user.role not in ['admin', 'hr']:
            return Response({"error": "Only Admin or HR can delete task categories."}, status=status.HTTP_403_FORBIDDEN)

        category = self.get_object(pk)
        if not category:
            return Response({"error": "Task category not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.user.role == 'hr' and category.company and category.company != request.user.company:
            return Response({"error": "Cannot delete categories belonging to another company."}, status=status.HTTP_403_FORBIDDEN)

        category.delete()
        return Response({"message": "Task category deleted successfully."}, status=status.HTTP_204_NO_CONTENT)


class HolidayListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        current_user = request.user
        if current_user.role == 'admin':
            holidays = Holiday.objects.all()
        elif current_user.company:
            holidays = Holiday.objects.filter(company__in=[current_user.company, None, ''])
        else:
            holidays = Holiday.objects.all()

        serializer = HolidaySerializer(holidays, many=True)
        return Response(serializer.data)

    def post(self, request):
        if request.user.role not in ['admin', 'hr']:
            return Response({"error": "Only Admin or HR can create holidays."}, status=status.HTTP_403_FORBIDDEN)

        data = request.data.copy()
        if request.user.role == 'hr':
            data['company'] = request.user.company

        serializer = HolidaySerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class HolidayDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        try:
            return Holiday.objects.get(pk=pk)
        except Holiday.DoesNotExist:
            return None

    def get(self, request, pk):
        holiday = self.get_object(pk)
        if not holiday:
            return Response({"error": "Holiday not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HolidaySerializer(holiday)
        return Response(serializer.data)

    def put(self, request, pk):
        if request.user.role not in ['admin', 'hr']:
            return Response({"error": "Only Admin or HR can edit holidays."}, status=status.HTTP_403_FORBIDDEN)

        holiday = self.get_object(pk)
        if not holiday:
            return Response({"error": "Holiday not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.user.role == 'hr' and holiday.company and holiday.company != request.user.company:
            return Response({"error": "Cannot modify holidays belonging to another company."}, status=status.HTTP_403_FORBIDDEN)

        data = request.data.copy()
        if request.user.role == 'hr':
            data['company'] = request.user.company

        serializer = HolidaySerializer(holiday, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        if request.user.role not in ['admin', 'hr']:
            return Response({"error": "Only Admin or HR can delete holidays."}, status=status.HTTP_403_FORBIDDEN)

        holiday = self.get_object(pk)
        if not holiday:
            return Response({"error": "Holiday not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.user.role == 'hr' and holiday.company and holiday.company != request.user.company:
            return Response({"error": "Cannot delete holidays belonging to another company."}, status=status.HTTP_403_FORBIDDEN)

        holiday.delete()
        return Response({"message": "Holiday deleted successfully."}, status=status.HTTP_204_NO_CONTENT)