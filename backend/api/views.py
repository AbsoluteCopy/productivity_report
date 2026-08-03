from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from django.contrib.auth.hashers import check_password, make_password
from django.conf import settings
import jwt
import datetime

from .models import User, DailyReport, TaskCategory, Holiday
from .serializers import UserSerializer, DailyReportSerializer, TaskCategorySerializer, HolidaySerializer
from .permissions import IsAdmin


# Create your views here.
@api_view(["GET"])
@permission_classes([AllowAny])
def home(request):
    return Response({
        "message": "Django backend is connected!"
    })


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    email = request.data.get('email')
    password = request.data.get('password')
    
    if not email or not password:
        return Response(
            {"error": "Email and password are required"}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        user = User.objects.get(email=email)
        if check_password(password, user.password):
            serializer = UserSerializer(user)
            
            # Generate JWT token
            token = jwt.encode({
                'user_id': user.id,
                'exp': datetime.datetime.utcnow() + datetime.timedelta(days=1)
            }, settings.SECRET_KEY, algorithm='HS256')
            
            return Response({
                "message": "Login successful",
                "user": serializer.data,
                "token": token
            }, status=status.HTTP_200_OK)
        else:
            return Response(
                {"error": "Invalid credentials"}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
    except User.DoesNotExist:
        return Response(
            {"error": "Invalid credentials"}, 
            status=status.HTTP_401_UNAUTHORIZED
        )


class UserListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Get current user from JWT token
        user_id = self.get_user_id_from_token(request)
        if not user_id:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            current_user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        
        users = User.objects.all()
        
        # If HR role, filter by company
        if current_user.role == 'hr' and current_user.company:
            users = users.filter(company=current_user.company)
        
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def get_user_id_from_token(self, request):
        token = request.META.get('HTTP_AUTHORIZATION', '').replace('Bearer ', '')
        if token:
            try:
                decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
                return decoded.get('user_id')
            except:
                pass
        return None


class UserDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        try:
            return User.objects.get(pk=pk)
        except User.DoesNotExist:
            return None

    def get(self, request, pk):
        user = self.get_object(pk)
        if user:
            serializer = UserSerializer(user)
            return Response(serializer.data)
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    def put(self, request, pk):
        user = self.get_object(pk)
        if user:
            serializer = UserSerializer(user, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, pk):
        user = self.get_object(pk)
        if user:
            user.delete()
            return Response({"message": "User deleted successfully"}, status=status.HTTP_204_NO_CONTENT)
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_id = request.user.id if hasattr(request, 'user') and request.user else None
        if not user_id:
            # Try to get user_id from JWT token
            token = request.META.get('HTTP_AUTHORIZATION', '').replace('Bearer ', '')
            if token:
                try:
                    import jwt
                    from django.conf import settings
                    decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
                    user_id = decoded.get('user_id')
                except:
                    pass
        
        if user_id:
            try:
                user = User.objects.get(pk=user_id)
                serializer = UserSerializer(user)
                return Response(serializer.data)
            except User.DoesNotExist:
                return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        
        return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user_id = request.user.id if hasattr(request, 'user') and request.user else None
        if not user_id:
            # Try to get user_id from JWT token
            token = request.META.get('HTTP_AUTHORIZATION', '').replace('Bearer ', '')
            if token:
                try:
                    import jwt
                    from django.conf import settings
                    decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
                    user_id = decoded.get('user_id')
                except:
                    pass

        if not user_id:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')

        if not current_password or not new_password:
            return Response(
                {"error": "Current password and new password are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verify current password
        if not check_password(current_password, user.password):
            return Response(
                {"error": "Current password is incorrect"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update password
        user.password = make_password(new_password)
        user.save()

        return Response(
            {"message": "Password changed successfully"},
            status=status.HTTP_200_OK
        )


class DailyReportListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Get current user from JWT token
        user_id = self.get_user_id_from_token(request)
        if not user_id:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            current_user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        
        reports = DailyReport.objects.all()

        year = request.GET.get("year")
        month = request.GET.get("month")
        user_id_param = request.GET.get("user_id")

        if year:
            reports = reports.filter(date__year=year)

        if month:
            reports = reports.filter(date__month=month)

        if user_id_param:
            reports = reports.filter(user_id=user_id_param)
        
        # If HR role, filter by company
        if current_user.role == 'hr' and current_user.company:
            reports = reports.filter(user__company=current_user.company)

        serializer = DailyReportSerializer(
            reports.order_by("date"),
            many=True
        )

        return Response(serializer.data)
    
    def get_user_id_from_token(self, request):
        token = request.META.get('HTTP_AUTHORIZATION', '').replace('Bearer ', '')
        if token:
            try:
                decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
                return decoded.get('user_id')
            except:
                pass
        return None

    def post(self, request):
        serializer = DailyReportSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class DailyReportDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        try:
            return DailyReport.objects.get(pk=pk)
        except DailyReport.DoesNotExist:
            return None

    def get(self, request, pk):
        report = self.get_object(pk)

        if not report:
            return Response(
                {"error": "Daily report not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = DailyReportSerializer(report)
        return Response(serializer.data)

    def put(self, request, pk):
        report = self.get_object(pk)

        if not report:
            return Response(
                {"error": "Daily report not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = DailyReportSerializer(
            report,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )
        
    def has_permission(self, request, report):
        if request.user.role == "admin":
            return True
        return report.user_id == request.user.id

    def delete(self, request, pk):
        report = self.get_object(pk)

        if not report:
            return Response(
                {"error": "Daily report not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        if not self.has_permission(request, report):
            return Response(
                {"error": "Permission denied"},
                status=status.HTTP_403_FORBIDDEN
            )

        report.delete()
        return Response(
            {"message": "Daily report deleted successfully"},
            status=status.HTTP_204_NO_CONTENT
        )


class UserDailyReportsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        # Get current user from JWT token
        current_user_id = self.get_user_id_from_token(request)
        if not current_user_id:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            current_user = User.objects.get(pk=current_user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        
        reports = DailyReport.objects.filter(
            user_id=user_id
        )

        year = request.GET.get("year")
        month = request.GET.get("month")

        if year:
            reports = reports.filter(date__year=year)

        if month:
            reports = reports.filter(date__month=month)
        
        # If HR role, filter by company
        if current_user.role == 'hr' and current_user.company:
            reports = reports.filter(user__company=current_user.company)

        serializer = DailyReportSerializer(
            reports.order_by("date"),
            many=True
        )

        return Response(serializer.data)
    
    def get_user_id_from_token(self, request):
        token = request.META.get('HTTP_AUTHORIZATION', '').replace('Bearer ', '')
        if token:
            try:
                decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
                return decoded.get('user_id')
            except:
                pass
        return None


class TaskCategoryListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Get current user from JWT token
        user_id = self.get_user_id_from_token(request)
        if not user_id:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            current_user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        
        categories = TaskCategory.objects.all()
        
        # If HR role, filter by company
        if current_user.role == 'hr' and current_user.company:
            categories = categories.filter(company=current_user.company)
        
        serializer = TaskCategorySerializer(categories, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = TaskCategorySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def get_user_id_from_token(self, request):
        token = request.META.get('HTTP_AUTHORIZATION', '').replace('Bearer ', '')
        if token:
            try:
                decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
                return decoded.get('user_id')
            except:
                pass
        return None


class TaskCategoryDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        try:
            return TaskCategory.objects.get(pk=pk)
        except TaskCategory.DoesNotExist:
            return None

    def get(self, request, pk):
        category = self.get_object(pk)
        if category:
            serializer = TaskCategorySerializer(category)
            return Response(serializer.data)
        return Response({"error": "Task category not found"}, status=status.HTTP_404_NOT_FOUND)

    def put(self, request, pk):
        category = self.get_object(pk)
        if category:
            serializer = TaskCategorySerializer(category, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        return Response({"error": "Task category not found"}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, pk):
        category = self.get_object(pk)
        if category:
            category.delete()
            return Response({"message": "Task category deleted successfully"}, status=status.HTTP_204_NO_CONTENT)
        return Response({"error": "Task category not found"}, status=status.HTTP_404_NOT_FOUND)


class HolidayListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Get current user from JWT token
        user_id = self.get_user_id_from_token(request)
        if not user_id:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            current_user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        
        holidays = Holiday.objects.all()
        
        # If HR role, filter by company
        if current_user.role == 'hr' and current_user.company:
            holidays = holidays.filter(company=current_user.company)
        
        serializer = HolidaySerializer(holidays, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = HolidaySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def get_user_id_from_token(self, request):
        token = request.META.get('HTTP_AUTHORIZATION', '').replace('Bearer ', '')
        if token:
            try:
                decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
                return decoded.get('user_id')
            except:
                pass
        return None


class HolidayDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        try:
            return Holiday.objects.get(pk=pk)
        except Holiday.DoesNotExist:
            return None

    def get(self, request, pk):
        holiday = self.get_object(pk)
        if holiday:
            serializer = HolidaySerializer(holiday)
            return Response(serializer.data)
        return Response({"error": "Holiday not found"}, status=status.HTTP_404_NOT_FOUND)

    def put(self, request, pk):
        holiday = self.get_object(pk)
        if holiday:
            serializer = HolidaySerializer(holiday, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        return Response({"error": "Holiday not found"}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, pk):
        holiday = self.get_object(pk)
        if holiday:
            holiday.delete()
            return Response({"message": "Holiday deleted successfully"}, status=status.HTTP_204_NO_CONTENT)
        return Response({"error": "Holiday not found"}, status=status.HTTP_404_NOT_FOUND)