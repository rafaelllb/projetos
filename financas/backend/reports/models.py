# /backend/reports/models.py
# Modelos relacionados a relatórios financeiros

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database.models import BaseModel
from database.db import db

class Report(BaseModel):
    """Modelo de relatório salvo"""
    
    # Dados básicos
    name = Column(String(100), nullable=False)
    type = Column(String(50), nullable=False)  # 'summary', 'category', 'monthly', etc.
    
    # Parâmetros e dados do relatório
    parameters = Column(JSON, nullable=True)  # Parâmetros usados para gerar o relatório
    data = Column(JSON, nullable=True)  # Dados do relatório em formato JSON
    
    # Chaves estrangeiras
    user_id = Column(Integer, ForeignKey('user.id'), nullable=False)
    
    # Data de geração
    generated_at = Column(DateTime, default=datetime.utcnow)
    
    def __init__(self, name, type, user_id, **kwargs):
        """
        Inicializa um relatório
        
        Args:
            name: Nome do relatório
            type: Tipo do relatório
            user_id: ID do usuário
        """
        super(Report, self).__init__(**kwargs)
        self.name = name
        self.type = type
        self.user_id = user_id
        self.parameters = kwargs.get('parameters')
        self.data = kwargs.get('data')
        self.generated_at = kwargs.get('generated_at', datetime.utcnow())

class ReportSchedule(BaseModel):
    """Modelo de agendamento de relatórios"""
    
    # Configurações de agendamento
    name = Column(String(100), nullable=False)
    report_type = Column(String(50), nullable=False)  # 'summary', 'category', 'monthly', etc.
    frequency = Column(String(20), nullable=False)  # 'daily', 'weekly', 'monthly'
    parameters = Column(JSON, nullable=True)  # Parâmetros para gerar o relatório
    
    # Configurações de entrega
    delivery_method = Column(String(20), nullable=False)  # 'email', 'download'
    email = Column(String(255), nullable=True)  # Email para envio (se método for email)
    
    # Status do agendamento
    is_active = Column(Boolean, default=True)
    last_run = Column(DateTime, nullable=True)
    next_run = Column(DateTime, nullable=True)
    
    # Chaves estrangeiras
    user_id = Column(Integer, ForeignKey('user.id'), nullable=False)
    
    def __init__(self, name, report_type, frequency, delivery_method, user_id, **kwargs):
        """
        Inicializa um agendamento de relatório
        
        Args:
            name: Nome do agendamento
            report_type: Tipo de relatório
            frequency: Frequência de geração
            delivery_method: Método de entrega
            user_id: ID do usuário
        """
        super(ReportSchedule, self).__init__(**kwargs)
        self.name = name
        self.report_type = report_type
        self.frequency = frequency
        self.delivery_method = delivery_method
        self.user_id = user_id
        self.parameters = kwargs.get('parameters')
        self.email = kwargs.get('email')
        self.is_active = kwargs.get('is_active', True)
        self.last_run = kwargs.get('last_run')
        self.next_run = kwargs.get('next_run')
