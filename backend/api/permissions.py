from rest_framework import permissions

class IsAdmin(permissions.BasePermission):
    """Allows access only to admin users."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'admin')


class IsHR(permissions.BasePermission):
    """Allows access only to HR users."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'hr')


class IsAdminOrHR(permissions.BasePermission):
    """Allows access to Admin and HR users."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role in ['admin', 'hr'])


class IsAdminOrHRorReadOnly(permissions.BasePermission):
    """Allows read permissions to authenticated users, but write only to Admin/HR."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.role in ['admin', 'hr']


class IsOwnerOrAdminOrHR(permissions.BasePermission):
    """Object-level permission allowing owners, admins, and same-company HR to view/modify."""
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role == 'admin':
            return True
        # For User objects
        if hasattr(obj, 'email') and hasattr(obj, 'role'):
            if obj.id == request.user.id:
                return True
            if request.user.role == 'hr' and request.user.company and obj.company == request.user.company:
                return True
        # For DailyReport objects
        if hasattr(obj, 'user'):
            if obj.user_id == request.user.id:
                return True
            if request.user.role == 'hr' and request.user.company and obj.user.company == request.user.company:
                return True
        return False

