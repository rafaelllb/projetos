# /backend/auth/__init__.py
from auth.models import User, UserSettings
from auth.controllers import (
    register_user, authenticate_user, get_user_by_id,
    update_user_data, update_user_settings, deactivate_user
)

__all__ = [
    'User', 'UserSettings',
    'register_user', 'authenticate_user', 'get_user_by_id',
    'update_user_data', 'update_user_settings', 'deactivate_user'
]
