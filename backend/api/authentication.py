import jwt
from django.conf import settings
from rest_framework import authentication
from rest_framework import exceptions
from .models import User

class CustomJWTAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return None

        parts = auth_header.split(' ')
        if len(parts) != 2:
            return None

        token = parts[1].strip()
        if not token or token in ('null', 'undefined'):
            return None
            
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed('Token has expired.')
        except jwt.InvalidTokenError:
            raise exceptions.AuthenticationFailed('Invalid authentication token.')

        user_id = payload.get('user_id')
        token_version = payload.get('token_version')
        if user_id is None:
            raise exceptions.AuthenticationFailed('Invalid token payload.')

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            raise exceptions.AuthenticationFailed('User associated with token does not exist.')

        # Enforce token version revocation (logout / password change invalidates older tokens)
        if token_version is None or user.token_version != token_version:
            raise exceptions.AuthenticationFailed('Token has been revoked or invalidated. Please log in again.')

        return (user, token)

