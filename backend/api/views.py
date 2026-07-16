from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from .models import User, DailyReport
from .serializers import UserSerializer, DailyReportSerializer
import hashlib

# Create your views here.
@api_view(["GET"])
def home(request):
    return Response({
        "message": "Django backend is connected!"
    })


@api_view(["POST"])
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
        # Hash the provided password and compare
        hashed_password = hashlib.sha256(password.encode()).hexdigest()
        if user.password == hashed_password:
            serializer = UserSerializer(user)
            return Response({
                "message": "Login successful",
                "user": serializer.data
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
    def get(self, request):
        users = User.objects.all()
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserDetailView(APIView):
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


class DailyReportListView(APIView):
    def get(self, request):

        reports = DailyReport.objects.all()

        year = request.GET.get("year")
        month = request.GET.get("month")
        user_id = request.GET.get("user_id")

        if year:
            reports = reports.filter(date__year=year)

        if month:
            reports = reports.filter(date__month=month)

        if user_id:
            reports = reports.filter(user_id=user_id)

        serializer = DailyReportSerializer(
            reports.order_by("date"),
            many=True
        )

        return Response(serializer.data)

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

        user_id = request.GET.get("user_id")

        if not user_id:
            return False

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return False

        if user.role == "admin":
            return True

        return report.user_id == user.id

    def delete(self, request, pk):

        report = self.get_object(pk)

        if not report:
            return Response(
                {"error": "Daily report not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        report.delete()

        return Response(
            {"message": "Daily report deleted successfully"},
            status=status.HTTP_204_NO_CONTENT
        )


class UserDailyReportsView(APIView):

    def get(self, request, user_id):

        reports = DailyReport.objects.filter(
            user_id=user_id
        )

        year = request.GET.get("year")
        month = request.GET.get("month")

        if year:
            reports = reports.filter(date__year=year)

        if month:
            reports = reports.filter(date__month=month)


        serializer = DailyReportSerializer(
            reports.order_by("date"),
            many=True
        )

        return Response(serializer.data)