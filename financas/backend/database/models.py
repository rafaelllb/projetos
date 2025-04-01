# /backend/database/models.py
# Modelos base para banco de dados

import datetime
from sqlalchemy import Column, Integer, DateTime
from sqlalchemy.ext.declarative import declared_attr
from database.db import db

class BaseModel(db.Model):
    """Classe base para todos os modelos"""
    __abstract__ = True

    id = Column(Integer, primary_key=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    @declared_attr
    def __tablename__(cls):
        """Cria nome de tabela automaticamente"""
        return cls.__name__.lower()

    @classmethod
    def get_by_id(cls, id):
        """Recupera um registro pelo ID"""
        return cls.query.get(id)
    
    @classmethod
    def list_all(cls):
        """Lista todos os registros"""
        return cls.query.all()
    
    def save(self):
        """Salva o registro atual"""
        db.session.add(self)
        db.session.commit()
        return self
    
    def delete(self):
        """Exclui o registro atual"""
        db.session.delete(self)
        db.session.commit()
        return True
    
    def to_dict(self):
        """Converte o objeto em um dicionário"""
        result = {}
        for column in self.__table__.columns:
            value = getattr(self, column.name)
            
            # Converter datetime para string ISO
            if isinstance(value, datetime.datetime):
                value = value.isoformat()
                
            result[column.name] = value
            
        return result
