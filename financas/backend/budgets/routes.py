# /backend/budgets/routes.py
# Rotas para gerenciamento de orçamentos

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from budgets.controllers import (
    create_budget, get_budget, get_user_budgets, get_current_budgets,
    update_budget, delete_budget, calculate_budget_progress, get_budget_categories
)
from utils.validators import validate_budget_data
from utils.sanitizers import sanitize_budget_data

# Criar blueprint
budgets_bp = Blueprint('budgets', __name__)

@budgets_bp.route('', methods=['GET'])
@jwt_required()
def list_budgets():
    """
    Lista orçamentos do usuário autenticado
    
    Query Parameters:
        - include_inactive: Se deve incluir orçamentos inativos (true/false)
        - current_only: Se deve incluir apenas orçamentos atuais (true/false)
    
    Returns:
        - Lista de orçamentos
    """
    current_user_id = get_jwt_identity()
    
    # Verificar se deve incluir inativos
    include_inactive = request.args.get('include_inactive', 'false').lower() == 'true'
    
    # Verificar se deve mostrar apenas orçamentos atuais
    current_only = request.args.get('current_only', 'false').lower() == 'true'
    
    if current_only:
        budgets = get_current_budgets(current_user_id)
    else:
        budgets = get_user_budgets(current_user_id, include_inactive)
    
    return jsonify([b.to_dict() for b in budgets]), 200

@budgets_bp.route('/<int:budget_id>', methods=['GET'])
@jwt_required()
def get_single_budget(budget_id):
    """
    Recupera um orçamento específico
    
    Parameters:
        - budget_id: ID do orçamento
    
    Returns:
        - Detalhes do orçamento
    """
    current_user_id = get_jwt_identity()
    
    budget = get_budget(budget_id, current_user_id)
    if not budget:
        return jsonify({"error": "Budget not found"}), 404
    
    return jsonify(budget.to_dict()), 200

@budgets_bp.route('', methods=['POST'])
@jwt_required()
def add_budget():
    """
    Adiciona um novo orçamento
    
    Request:
        - name: Nome do orçamento
        - amount: Valor do orçamento
        - start_date: Data de início (formato: YYYY-MM-DD)
        - end_date: Data de fim (formato: YYYY-MM-DD)
        - description: Descrição (opcional)
        - categories: Lista de categorias com alocações (opcional)
    
    Returns:
        - Orçamento criado
    """
    current_user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    # Sanitizar dados
    sanitized_data = sanitize_budget_data(data)
    
    # Validar dados
    validation = validate_budget_data(sanitized_data)
    if not validation['valid']:
        return jsonify({"error": "Validation error", "details": validation['errors']}), 400
    
    # Criar orçamento
    budget = create_budget(current_user_id, sanitized_data)
    
    if not budget:
        return jsonify({"error": "Failed to create budget"}), 400
    
    return jsonify(budget.to_dict()), 201

@budgets_bp.route('/<int:budget_id>', methods=['PUT'])
@jwt_required()
def update_single_budget(budget_id):
    """
    Atualiza um orçamento existente
    
    Parameters:
        - budget_id: ID do orçamento
    
    Request:
        - Campos a serem atualizados
    
    Returns:
        - Orçamento atualizado
    """
    current_user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    # Sanitizar dados
    sanitized_data = sanitize_budget_data(data)
    
    # Atualizar orçamento
    budget = update_budget(budget_id, current_user_id, sanitized_data)
    
    if not budget:
        return jsonify({"error": "Budget not found or update failed"}), 404
    
    return jsonify(budget.to_dict()), 200

@budgets_bp.route('/<int:budget_id>', methods=['DELETE'])
@jwt_required()
def delete_single_budget(budget_id):
    """
    Remove um orçamento
    
    Parameters:
        - budget_id: ID do orçamento
    
    Returns:
        - Mensagem de sucesso
    """
    current_user_id = get_jwt_identity()
    
    success = delete_budget(budget_id, current_user_id)
    
    if not success:
        return jsonify({"error": "Budget not found or delete failed"}), 404
    
    return jsonify({"message": "Budget deleted successfully"}), 200

@budgets_bp.route('/<int:budget_id>/progress', methods=['GET'])
@jwt_required()
def get_budget_progress(budget_id):
    """
    Calcula o progresso de um orçamento
    
    Parameters:
        - budget_id: ID do orçamento
    
    Returns:
        - Dados de progresso do orçamento
    """
    current_user_id = get_jwt_identity()
    
    progress = calculate_budget_progress(budget_id, current_user_id)
    
    if not progress:
        return jsonify({"error": "Budget not found"}), 404
    
    return jsonify(progress), 200

@budgets_bp.route('/<int:budget_id>/categories', methods=['GET'])
@jwt_required()
def list_budget_categories(budget_id):
    """
    Lista categorias alocadas em um orçamento
    
    Parameters:
        - budget_id: ID do orçamento
    
    Returns:
        - Lista de alocações por categoria
    """
    current_user_id = get_jwt_identity()
    
    categories = get_budget_categories(budget_id, current_user_id)
    
    if categories is None:
        return jsonify({"error": "Budget not found"}), 404
    
    return jsonify(categories), 200
