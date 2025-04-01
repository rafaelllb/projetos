# /backend/database/db.py
# Configuração do banco de dados

from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

# Instância do SQLAlchemy
db = SQLAlchemy()

# Instância do Migrate
migrate = Migrate()

def init_app(app):
    """
    Inicializa o banco de dados com a aplicação
    
    Args:
        app: Aplicação Flask
    """
    db.init_app(app)
    migrate.init_app(app, db)
    
    # Criar tabelas no primeiro uso
    with app.app_context():
        db.create_all()

def commit():
    """Realiza o commit das alterações pendentes"""
    db.session.commit()

def rollback():
    """Reverte alterações em caso de erro"""
    db.session.rollback()

def clear_session():
    """Limpa a sessão atual"""
    db.session.remove()
