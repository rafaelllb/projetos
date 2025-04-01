# /backend/app.py
# Aplicação principal do backend

from flask import Flask
from flask_cors import CORS
from config import config

# Import blueprints
from auth.routes import auth_bp
from transactions.routes import transactions_bp
from budgets.routes import budgets_bp
from goals.routes import goals_bp
from reports.routes import reports_bp

def create_app(config_name='default'):
    """
    Factory para criar a aplicação Flask
    
    Args:
        config_name: Nome da configuração a ser carregada
    
    Returns:
        app: Aplicação Flask configurada
    """
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # Inicializar extensões
    CORS(app)
    
    # Registrar blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(transactions_bp, url_prefix='/api/transactions')
    app.register_blueprint(budgets_bp, url_prefix='/api/budgets')
    app.register_blueprint(goals_bp, url_prefix='/api/goals')
    app.register_blueprint(reports_bp, url_prefix='/api/reports')
    
    # Registrar handlers de erro
    register_error_handlers(app)
    
    return app

def register_error_handlers(app):
    """
    Registra handlers para erros comuns
    
    Args:
        app: Aplicação Flask
    """
    @app.errorhandler(400)
    def bad_request(e):
        return {"error": "Bad request", "message": str(e)}, 400
    
    @app.errorhandler(404)
    def not_found(e):
        return {"error": "Resource not found", "message": str(e)}, 404
    
    @app.errorhandler(500)
    def internal_server_error(e):
        return {"error": "Internal server error", "message": str(e)}, 500

# Criar aplicação com configuração padrão
app = create_app()

if __name__ == '__main__':
    app.run(debug=True)
