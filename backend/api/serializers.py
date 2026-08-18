import re
import html
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth.hashers import make_password
from .models import User, DailyReport, TaskCategory, Holiday


def sanitize_text(value, max_length=None):
    """Sanitize string by stripping whitespace and removing/escaping harmful HTML/script tags."""
    if value is None:
        return value
    if not isinstance(value, str):
        value = str(value)
    # Strip dangerous HTML/scripts
    clean = re.sub(r'<[^>]*>', '', value)
    clean = html.escape(clean.strip())
    if max_length and len(clean) > max_length:
        clean = clean[:max_length]
    return clean


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'id_number', 'first_name', 'last_name',
            'email', 'password', 'role', 'created_at', 'updated_at', 'task_list', 'company'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'token_version']
        extra_kwargs = {
            'password': {'write_only': True, 'required': False}
        }

    def validate_email(self, value):
        if not value:
            raise serializers.ValidationError("Email is required.")
        return value.strip().lower()

    def validate_id_number(self, value):
        return sanitize_text(value, max_length=20)

    def validate_first_name(self, value):
        return sanitize_text(value, max_length=100)

    def validate_last_name(self, value):
        return sanitize_text(value, max_length=100)

    def validate_company(self, value):
        return sanitize_text(value, max_length=100) if value else value

    def validate_task_list(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("task_list must be a list.")
        if len(value) > 200:
            raise serializers.ValidationError("task_list exceeds maximum allowed items (200).")
        sanitized = []
        for item in value:
            if isinstance(item, str):
                sanitized.append(sanitize_text(item, max_length=255))
            elif isinstance(item, dict):
                clean_item = {k: sanitize_text(v, max_length=255) if isinstance(v, str) else v for k, v in item.items()}
                sanitized.append(clean_item)
            else:
                sanitized.append(item)
        return sanitized

    def validate_password(self, value):
        if value:
            try:
                validate_password(value)
            except DjangoValidationError as e:
                raise serializers.ValidationError(list(e.messages))
        return value

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        if not password:
            raise serializers.ValidationError({"password": "Password is required for new users."})
        validated_data['password'] = make_password(password)
        return User.objects.create(**validated_data)

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        if password:
            instance.password = make_password(password)
            instance.token_version += 1  # Invalidate previous tokens on password change

        return super().update(instance, validated_data)


class DailyReportSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = DailyReport
        fields = [
            'id', 'user', 'user_name', 'date', 'task_category', 'task_list', 
            'number_of_tasks', 'time_spent', 'meeting_count', 'work_type', 
            'created_at', 'updated_at', 'sub_category'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}"

    def validate_task_category(self, value):
        return sanitize_text(value, max_length=100)

    def validate_work_type(self, value):
        return sanitize_text(value, max_length=100) if value else value

    def validate_sub_category(self, value):
        return sanitize_text(value, max_length=100) if value else value

    def validate_time_spent(self, value):
        if value < 0:
            raise serializers.ValidationError("time_spent cannot be negative.")
        if value > 1440:  # Max 24 hours in minutes
            raise serializers.ValidationError("time_spent cannot exceed 1440 minutes (24 hours).")
        return value

    def validate_number_of_tasks(self, value):
        if value < 0:
            raise serializers.ValidationError("number_of_tasks cannot be negative.")
        if value > 1000:
            raise serializers.ValidationError("number_of_tasks cannot exceed 1000.")
        return value

    def validate_meeting_count(self, value):
        if value < 0:
            raise serializers.ValidationError("meeting_count cannot be negative.")
        if value > 1000:
            raise serializers.ValidationError("meeting_count cannot exceed 1000.")
        return value

    def validate_task_list(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("task_list must be a list.")
        if len(value) > 200:
            raise serializers.ValidationError("task_list exceeds maximum allowed items (200).")
        sanitized = []
        for item in value:
            if isinstance(item, str):
                sanitized.append(sanitize_text(item, max_length=500))
            elif isinstance(item, dict):
                clean_item = {k: sanitize_text(v, max_length=500) if isinstance(v, str) else v for k, v in item.items()}
                sanitized.append(clean_item)
            else:
                sanitized.append(item)
        return sanitized


class TaskCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskCategory
        fields = ['id', 'name', 'status', 'created_at', 'updated_at', 'company']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_name(self, value):
        clean = sanitize_text(value, max_length=100)
        if not clean:
            raise serializers.ValidationError("Name cannot be empty.")
        return clean

    def validate_company(self, value):
        return sanitize_text(value, max_length=100) if value else value


class HolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model = Holiday
        fields = ['id', 'name', 'date', 'created_at', 'updated_at', 'company']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_name(self, value):
        clean = sanitize_text(value, max_length=255)
        if not clean:
            raise serializers.ValidationError("Name cannot be empty.")
        return clean

    def validate_company(self, value):
        return sanitize_text(value, max_length=100) if value else value

