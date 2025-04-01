# /backend/goals/models.py
# Modelos relacionados a metas financeiras

from sqlalchemy import Column, Integer, String, Float, Boolean, Date, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, date
from database.models import BaseModel
from database.db import db

class Goal(BaseModel):
    """Modelo de meta financeira"""
    
    # Dados básicos
    name = Column(String(100), nullable=False)
    target_amount = Column(Float, nullable=False)
    current_amount = Column(Float, default=0)
    deadline = Column(Date, nullable=True)
    description = Column(Text, nullable=True)
    
    # Campos adicionais
    category = Column(String(50), nullable=True)  # Categoria geral da meta
    icon = Column(String(30), nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_completed = Column(Boolean, default=False)
    completed_date = Column(Date, nullable=True)
    
    # Chaves estrangeiras
    user_id = Column(Integer, ForeignKey('user.id'), nullable=False)
    
    # Relações
    contributions = relationship("GoalContribution", back_populates="goal", cascade="all, delete-orphan")
    
    def __init__(self, name, target_amount, user_id, **kwargs):
        """
        Inicializa uma meta
        
        Args:
            name: Nome da meta
            target_amount: Valor alvo da meta
            user_id: ID do usuário
        """
        super(Goal, self).__init__(**kwargs)
        self.name = name
        self.target_amount = target_amount
        self.user_id = user_id
        self.current_amount = kwargs.get('current_amount', 0)
        self.deadline = kwargs.get('deadline')
        self.description = kwargs.get('description')
        self.category = kwargs.get('category')
        self.icon = kwargs.get('icon')
        self.is_active = kwargs.get('is_active', True)
        self.is_completed = kwargs.get('is_completed', False)
        self.completed_date = kwargs.get('completed_date')
        
        # Verificar se a meta já foi atingida
        if self.current_amount >= self.target_amount:
            self.is_completed = True
            self.completed_date = self.completed_date or date.today()

class GoalContribution(BaseModel):
    """Modelo de contribuição para uma meta"""
    
    # Dados da contribuição
    amount = Column(Float, nullable=False)
    date = Column(DateTime, nullable=False, default=datetime.utcnow)
    notes = Column(Text, nullable=True)
    
    # Chaves estrangeiras
    goal_id = Column(Integer, ForeignKey('goal.id'), nullable=False)
    
    # Relações
    goal = relationship("Goal", back_populates="contributions")
    
    def __init__(self, goal_id, amount, **kwargs):
        """
        Inicializa uma contribuição para meta
        
        Args:
            goal_id: ID da meta
            amount: Valor da contribuição
        """
        super(GoalContribution, self).__init__(**kwargs)
        self.goal_id = goal_id
        self.amount = amount
        self.date = kwargs.get('date', datetime.utcnow())
        self.notes = kwargs.get('notes')
