# /backend/transactions/models.py
# Modelos relacionados a transações financeiras

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from database.models import BaseModel
from database.db import db

class Category(BaseModel):
    """Modelo de categoria para transações"""
    
    # Dados básicos
    name = Column(String(50), nullable=False)
    type = Column(String(10), nullable=False)  # 'income' ou 'expense'
    icon = Column(String(30), nullable=True)
    color = Column(String(20), nullable=True)
    
    # Relação com usuário (proprietário)
    user_id = Column(Integer, ForeignKey('user.id'), nullable=True)  # Null para categorias padrão
    
    # Flag para categoria padrão do sistema
    is_default = Column(Boolean, default=False)
    
    # Relações
    transactions = relationship("Transaction", back_populates="category")
    
    def __init__(self, name, type, **kwargs):
        """
        Inicializa uma categoria
        
        Args:
            name: Nome da categoria
            type: Tipo da categoria ('income' ou 'expense')
        """
        super(Category, self).__init__(**kwargs)
        self.name = name
        self.type = type
        self.icon = kwargs.get('icon', None)
        self.color = kwargs.get('color', None)
        self.user_id = kwargs.get('user_id', None)
        self.is_default = kwargs.get('is_default', False)

class Transaction(BaseModel):
    """Modelo de transação financeira"""
    
    # Dados básicos
    type = Column(String(10), nullable=False)  # 'income' ou 'expense'
    description = Column(String(200), nullable=False)
    amount = Column(Float, nullable=False)
    date = Column(DateTime, nullable=False)
    
    # Campos opcionais
    notes = Column(Text, nullable=True)
    is_recurring = Column(Boolean, default=False)
    recurrence_pattern = Column(String(50), nullable=True)
    
    # Chaves estrangeiras
    user_id = Column(Integer, ForeignKey('user.id'), nullable=False)
    category_id = Column(Integer, ForeignKey('category.id'), nullable=False)
    
    # Relações
    category = relationship("Category", back_populates="transactions")
    
    def __init__(self, type, description, amount, date, user_id, category_id, **kwargs):
        """
        Inicializa uma transação
        
        Args:
            type: Tipo da transação ('income' ou 'expense')
            description: Descrição da transação
            amount: Valor da transação
            date: Data da transação
            user_id: ID do usuário
            category_id: ID da categoria
        """
        super(Transaction, self).__init__(**kwargs)
        self.type = type
        self.description = description
        self.amount = amount
        self.date = date
        self.user_id = user_id
        self.category_id = category_id
        self.notes = kwargs.get('notes', None)
        self.is_recurring = kwargs.get('is_recurring', False)
        self.recurrence_pattern = kwargs.get('recurrence_pattern', None)
