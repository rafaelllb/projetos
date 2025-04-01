# /backend/auth/models.py
# Modelos relacionados à autenticação

import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
import bcrypt
from database.models import BaseModel
from database.db import db

class User(BaseModel):
    """Modelo de usuário"""
    
    # Dados básicos
    name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    password_hash = Column(String(128), nullable=False)
    
    # Status da conta
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    email_verified = Column(Boolean, default=False)
    
    # Data da última atividade
    last_login = Column(DateTime, nullable=True)
    
    # Relações
    settings = relationship("UserSettings", uselist=False, back_populates="user", cascade="all, delete-orphan")
    
    def __init__(self, name, email, password, **kwargs):
        """
        Inicializa usuário e cria hash da senha
        
        Args:
            name: Nome do usuário
            email: Email do usuário
            password: Senha em texto plano
        """
        super(User, self).__init__(**kwargs)
        self.name = name
        self.email = email.lower()
        self.set_password(password)
    
    def set_password(self, password):
        """
        Define a senha, criando um hash com bcrypt
        
        Args:
            password: Senha em texto plano
        """
        # Gerar salt e hash da senha
        password_bytes = password.encode('utf-8')
        salt = bcrypt.gensalt()
        self.password_hash = bcrypt.hashpw(password_bytes, salt).decode('utf-8')
    
    def check_password(self, password):
        """
        Verifica se a senha está correta
        
        Args:
            password: Senha em texto plano
            
        Returns:
            bool: True se a senha estiver correta
        """
        password_bytes = password.encode('utf-8')
        hash_bytes = self.password_hash.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hash_bytes)
    
    def update_last_login(self):
        """Atualiza a data do último login"""
        self.last_login = datetime.datetime.utcnow()
        db.session.commit()
    
    def to_dict(self):
        """
        Converte usuário para dicionário (omitindo senha)
        
        Returns:
            dict: Dados do usuário
        """
        data = super().to_dict()
        del data['password_hash']
        return data

class UserSettings(BaseModel):
    """Configurações do usuário"""
    
    # Chave estrangeira para usuário
    user_id = Column(Integer, ForeignKey('user.id'), nullable=False)
    user = relationship("User", back_populates="settings")
    
    # Preferências da interface
    theme = Column(String(20), default="light")
    language = Column(String(10), default="pt-BR")
    currency = Column(String(3), default="BRL")
    date_format = Column(String(20), default="DD/MM/YYYY")
    
    # Preferências de notificações
    email_notifications = Column(Boolean, default=True)
    budget_alerts = Column(Boolean, default=True)
    goal_updates = Column(Boolean, default=True)
    
    def __init__(self, user_id, **kwargs):
        """
        Inicializa configurações do usuário
        
        Args:
            user_id: ID do usuário
        """
        super(UserSettings, self).__init__(**kwargs)
        self.user_id = user_id
