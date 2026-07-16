from rest_framework import serializers
from .models import User, DailyReport
import hashlib


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'id_number', 'first_name', 'last_name',
            'email', 'password', 'role', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {
            'password': {'write_only': True, 'required': False}
        }

    def create(self, validated_data):
        password = validated_data.pop('password')
        validated_data['password'] = hashlib.sha256(password.encode()).hexdigest()
        return User.objects.create(**validated_data)

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)

        if password:
            instance.password = hashlib.sha256(password.encode()).hexdigest()

        return super().update(instance, validated_data)


class DailyReportSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = DailyReport
        fields = ['id', 'user', 'user_name', 'date', 'task_category', 'task_list', 
                  'number_of_tasks', 'time_spent', 'meeting_count', 'work_type', 'created_at', 'updated_at', 'sub_category']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}"
