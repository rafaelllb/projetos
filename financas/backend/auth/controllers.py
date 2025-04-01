# /backend/auth/controllers.py
# Controladores para autenticação

from sqlalchemy.exc import IntegrityError
from auth.models import User, UserSettings
from database.db import db, commit, rollback

def register_user(name, email, password):
    """
    Registra um novo usuário no sistema
    
    Args:
        name (str): Nome do usuário
        email (str): Email do usuário
        password (str): Senha do usuário
    
    Returns:
        User: Instância do usuário criado ou None se falhar
    """
    try:
        # Verificar se email já está em uso
        existing_user = User.query.filter_by(email=email.lower()).first()
        if existing_user:
            return None
        
        # Criar novo usuário
        user = User(name=name, email=email, password=password)
        db.session.add(user)
        commit()
        
        # Criar configurações padrão para o usuário
        settings = UserSettings(user_id=user.id)
        db.session.add(settings)
        commit()
        
        return user
    except IntegrityError:
        # Rollback em caso de erro
        rollback()
        return None
    except Exception as e:
        rollback()
        raise e

def authenticate_user(email, password):
    """
    Autentica um usuário com email e senha
    
    Args:
        email (str): Email do usuário
        password (str): Senha do usuário
    
    Returns:
        User: Instância do usuário autenticado ou None se falhar
    """
    # Buscar usuário pelo email
    user = User.query.filter_by(email=email.lower()).first()
    
    # Verificar se usuário existe e senha está correta
    if user and user.check_password(password):
        # Verificar se conta está ativa
        if not user.is_active:
            return None
        
        return user
    
    return None

def get_user_by_id(user_id):
    """
    Recupera um usuário pelo ID
    
    Args:
        user_id (int): ID do usuário
    
    Returns:
        User: Instância do usuário ou None se não encontrado
    """
    return User.query.get(user_id)

def update_user_data(user_id, data):
    """
    Atualiza dados do usuário
    
    Args:
        user_id (int): ID do usuário
        data (dict): Dados para atualização
    
    Returns:
        User: Instância do usuário atualizado ou None se falhar
    """
    try:
        user = User.query.get(user_id)
        if not user:
            return None
        
        # Atualizar campos fornecidos
        if 'name' in data:
            user.name = data['name']
        
        # Atualizar senha se fornecida
        if 'password' in data and data['password']:
            user.set_password(data['password'])
        
        commit()
        return user
    except Exception as e:
        rollback()
        raise e

def update_user_settings(user_id, settings_data):
    """
    Atualiza configurações do usuário
    
    Args:
        user_id (int): ID do usuário
        settings_data (dict): Dados de configuração
    
    Returns:
        UserSettings: Instância de configurações atualizada ou None se falhar
    """
    try:
        settings = UserSettings.query.filter_by(user_id=user_id).first()
        
        if not settings:
            return None
        
        # Atualizar campos fornecidos
        for key, value in settings_data.items():
            if hasattr(settings, key):
                setattr(settings, key, value)
        
        commit()
        return settings
    except Exception as e:
        rollback()
        raise e

def deactivate_user(user_id):
    """
    Desativa a conta de um usuário
    
    Args:
        user_id (int): ID do usuário
    
    Returns:
        bool: True se operação bem-sucedida
    """
    try:
        user = User.query.get(user_id)
        if not user:
            return False
        
        user.is_active = False
        commit()
        return True
    except Exception:
        rollback()
        return False
