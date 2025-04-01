# /backend/auth/routes.py
# Rotas de autenticação

from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity
)
from email_validator import validate_email, EmailNotValidError
from auth.controllers import register_user, authenticate_user, get_user_by_id
from utils.validators import validate_registration_data
from utils.sanitizers import sanitize_user_data

# Criar blueprint
auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    """
    Registra um novo usuário
    
    Request:
        - name: Nome do usuário
        - email: Email do usuário
        - password: Senha do usuário
    
    Returns:
        - user: Dados do usuário criado
        - access_token: Token JWT para autenticação
    """
    # Obter dados da requisição
    data = request.get_json() or {}
    
    # Sanitizar dados
    sanitized_data = sanitize_user_data(data)
    
    # Validar dados
    validation = validate_registration_data(sanitized_data)
    if not validation['valid']:
        return jsonify({"error": "Validation error", "details": validation['errors']}), 400
    
    try:
        # Validar email
        validate_email(sanitized_data['email'])
        
        # Tentar registrar usuário
        user = register_user(
            sanitized_data['name'],
            sanitized_data['email'],
            sanitized_data['password']
        )
        
        if not user:
            return jsonify({"error": "Registration failed"}), 400
        
        # Gerar tokens
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)
        
        # Retornar dados e token
        return jsonify({
            "message": "User registered successfully",
            "user": user.to_dict(),
            "access_token": access_token,
            "refresh_token": refresh_token
        }), 201
        
    except EmailNotValidError as e:
        return jsonify({"error": "Invalid email", "message": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Autentica um usuário existente
    
    Request:
        - email: Email do usuário
        - password: Senha do usuário
    
    Returns:
        - user: Dados do usuário
        - access_token: Token JWT para autenticação
    """
    # Obter dados da requisição
    data = request.get_json() or {}
    
    # Verificar campos obrigatórios
    if 'email' not in data or 'password' not in data:
        return jsonify({"error": "Email and password are required"}), 400
    
    # Sanitizar dados
    email = data['email'].strip().lower()
    password = data['password']
    
    try:
        # Autenticar usuário
        user = authenticate_user(email, password)
        
        if not user:
            return jsonify({"error": "Invalid credentials"}), 401
        
        # Gerar tokens
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)
        
        # Atualizar último login
        user.update_last_login()
        
        # Retornar dados e token
        return jsonify({
            "message": "Login successful",
            "user": user.to_dict(),
            "access_token": access_token,
            "refresh_token": refresh_token
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """
    Renova o token de acesso usando refresh token
    
    Returns:
        - access_token: Novo token JWT
    """
    current_user_id = get_jwt_identity()
    access_token = create_access_token(identity=current_user_id)
    
    return jsonify({"access_token": access_token}), 200

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """
    Retorna dados do usuário atual
    
    Returns:
        - user: Dados do usuário
    """
    current_user_id = get_jwt_identity()
    
    user = get_user_by_id(current_user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    return jsonify({"user": user.to_dict()}), 200

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """
    Realiza logout (invalidação de token será feita pelo frontend)
    
    Returns:
        - message: Mensagem de sucesso
    """
    return jsonify({"message": "Logout successful"}), 200
