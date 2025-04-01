# /backend/goals/routes.py
# Rotas para gerenciamento de metas financeiras

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from goals.controllers import (
    create_goal, get_goal, get_user_goals, update_goal,
    delete_goal, add_goal_contribution, get_goal_contributions,
    calculate_goal_progress
)
from utils.validators import validate_goal_data
from utils.sanitizers import sanitize_goal_data

# Criar blueprint
goals_bp = Blueprint('goals', __name__)

@goals_bp.route('', methods=['GET'])
@jwt_required()
def list_goals():
    """
    Lista metas do usuário autenticado
    
    Query Parameters:
        - include_completed: Se deve incluir metas concluídas (true/false)
    
    Returns:
        - Lista de metas
    """
    current_user_id = get_jwt_identity()
    
    # Verificar se deve incluir metas concluídas
    include_completed = request.args.get('include_completed', 'false').lower() == 'true'
    
    goals = get_user_goals(current_user_id, include_completed)
    
    return jsonify([g.to_dict() for g in goals]), 200

@goals_bp.route('/<int:goal_id>', methods=['GET'])
@jwt_required()
def get_single_goal(goal_id):
    """
    Recupera uma meta específica
    
    Parameters:
        - goal_id: ID da meta
    
    Returns:
        - Detalhes da meta
    """
    current_user_id = get_jwt_identity()
    
    goal = get_goal(goal_id, current_user_id)
    if not goal:
        return jsonify({"error": "Goal not found"}), 404
    
    return jsonify(goal.to_dict()), 200

@goals_bp.route('', methods=['POST'])
@jwt_required()
def add_goal():
    """
    Adiciona uma nova meta
    
    Request:
        - name: Nome da meta
        - target_amount: Valor alvo da meta
        - current_amount: Valor atual (opcional)
        - deadline: Data limite (formato: YYYY-MM-DD, opcional)
        - description: Descrição (opcional)
        - category: Categoria (opcional)
        - icon: Ícone (opcional)
    
    Returns:
        - Meta criada
    """
    current_user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    # Sanitizar dados
    sanitized_data = sanitize_goal_data(data)
    
    # Validar dados
    validation = validate_goal_data(sanitized_data)
    if not validation['valid']:
        return jsonify({"error": "Validation error", "details": validation['errors']}), 400
    
    # Criar meta
    goal = create_goal(current_user_id, sanitized_data)
    
    if not goal:
        return jsonify({"error": "Failed to create goal"}), 400
    
    return jsonify(goal.to_dict()), 201

@goals_bp.route('/<int:goal_id>', methods=['PUT'])
@jwt_required()
def update_single_goal(goal_id):
    """
    Atualiza uma meta existente
    
    Parameters:
        - goal_id: ID da meta
    
    Request:
        - Campos a serem atualizados
    
    Returns:
        - Meta atualizada
    """
    current_user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    # Sanitizar dados
    sanitized_data = sanitize_goal_data(data)
    
    # Atualizar meta
    goal = update_goal(goal_id, current_user_id, sanitized_data)
    
    if not goal:
        return jsonify({"error": "Goal not found or update failed"}), 404
    
    return jsonify(goal.to_dict()), 200

@goals_bp.route('/<int:goal_id>', methods=['DELETE'])
@jwt_required()
def delete_single_goal(goal_id):
    """
    Remove uma meta
    
    Parameters:
        - goal_id: ID da meta
    
    Returns:
        - Mensagem de sucesso
    """
    current_user_id = get_jwt_identity()
    
    success = delete_goal(goal_id, current_user_id)
    
    if not success:
        return jsonify({"error": "Goal not found or delete failed"}), 404
    
    return jsonify({"message": "Goal deleted successfully"}), 200

@goals_bp.route('/<int:goal_id>/progress', methods=['GET'])
@jwt_required()
def get_goal_progress(goal_id):
    """
    Calcula o progresso de uma meta
    
    Parameters:
        - goal_id: ID da meta
    
    Returns:
        - Dados de progresso da meta
    """
    current_user_id = get_jwt_identity()
    
    progress = calculate_goal_progress(goal_id, current_user_id)
    
    if not progress:
        return jsonify({"error": "Goal not found"}), 404
    
    return jsonify(progress), 200

@goals_bp.route('/<int:goal_id>/contributions', methods=['GET'])
@jwt_required()
def list_goal_contributions(goal_id):
    """
    Lista contribuições de uma meta
    
    Parameters:
        - goal_id: ID da meta
    
    Returns:
        - Lista de contribuições
    """
    current_user_id = get_jwt_identity()
    
    contributions = get_goal_contributions(goal_id, current_user_id)
    
    if contributions is None:
        return jsonify({"error": "Goal not found"}), 404
    
    return jsonify([c.to_dict() for c in contributions]), 200

@goals_bp.route('/<int:goal_id>/contributions', methods=['POST'])
@jwt_required()
def add_contribution(goal_id):
    """
    Adiciona uma contribuição para uma meta
    
    Parameters:
        - goal_id: ID da meta
    
    Request:
        - amount: Valor da contribuição
        - date: Data da contribuição (opcional)
        - notes: Observações (opcional)
    
    Returns:
        - Meta atualizada e contribuição adicionada
    """
    current_user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    # Validar campos básicos
    if 'amount' not in data or not isinstance(data['amount'], (int, float)) or data['amount'] <= 0:
        return jsonify({"error": "Valid amount is required"}), 400
    
    # Adicionar contribuição
    result = add_goal_contribution(goal_id, current_user_id, data)
    
    if not result:
        return jsonify({"error": "Goal not found or contribution failed"}), 404
    
    return jsonify(result), 201
