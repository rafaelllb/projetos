# /backend/budgets/models.py
# Modelos relacionados a orçamentos financeiros

from sqlalchemy import Column, Integer, String, Float, Boolean, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, date
from database.models import BaseModel
from database.db import db

class Budget(BaseModel):
    """Modelo de orçamento financeiro"""
    
    # Dados básicos
    name = Column(String(100), nullable=False)
    amount = Column(Float, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    description = Column(Text, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Chaves estrangeiras
    user_id = Column(Integer, ForeignKey('user.id'), nullable=False)
    
    # Relações com categorias
    budget_categories = relationship("BudgetCategory", back_populates="budget", cascade="all, delete-orphan")
    
    def __init__(self, name, amount, start_date, end_date, user_id, **kwargs):
        """
        Inicializa um orçamento
        
        Args:
            name: Nome do orçamento
            amount: Valor total do orçamento
            start_date: Data de início
            end_date: Data de fim
            user_id: ID do usuário
        """
        super(Budget, self).__init__(**kwargs)
        self.name = name
        self.amount = amount
        self.start_date = start_date
        self.end_date = end_date
        self.user_id = user_id
        self.description = kwargs.get('description')
        self.is_active = kwargs.get('is_active', True)

class BudgetCategory(BaseModel):
    """Modelo de categoria dentro de um orçamento"""
    
    # Valor alocado para a categoria
    amount = Column(Float, nullable=False)
    
    # Chaves estrangeiras
    budget_id = Column(Integer, ForeignKey('budget.id'), nullable=False)
    category_id = Column(Integer, ForeignKey('category.id'), nullable=False)
    
    # Relações
    budget = relationship("Budget", back_populates="budget_categories")
    category = relationship("Category")
    
    def __init__(self, budget_id, category_id, amount, **kwargs):
        """
        Inicializa uma alocação de orçamento para categoria
        
        Args:
            budget_id: ID do orçamento
            category_id: ID da categoria
            amount: Valor alocado
        """
        super(BudgetCategory, self).__init__(**kwargs)
        self.budget_id = budget_id
        self.category_id = category_id
        self.amount = amount
