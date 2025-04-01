# /backend/transactions/routes.py
# Rotas para gerenciamento de transações

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from transactions.controllers import (
    create_transaction, get_transaction, get_user_transactions,
    update_transaction, delete_transaction, get_transactions_summary,
    create_category, get_categories, update_category, delete_category
)
from utils.validators import validate_transaction_data
from utils.sanitizers import sanitize_transaction_data

# Criar blueprint
transactions_bp = Blueprint('transactions', __name__)

@transactions_bp.route('', methods=['GET'])
@jwt_required()
def list_transactions():
    """
    Lista transações do usuário autenticado
    
    Query Parameters:
        - type: Filtrar por tipo ('income' ou 'expense')
        - category_id: Filtrar por categoria
        - start_date: Data inicial (formato: YYYY-MM-DD)
        - end_date: Data final (formato: YYYY-MM-DD)
        - min_amount: Valor mínimo
        - max_amount: Valor máximo
        - search: Termo de busca na descrição
        - is_recurring: Filtrar transações recorrentes (true/false)
        - sort: Campo para ordenação (prefixo '-' para decrescente)
        - page: Página para paginação
        - per_page: Itens por página
    
    Returns:
        - Lista de transações ou resultado paginado
    """
    current_user_id = get_jwt_identity()
    
    # Extrair filtros da query string
    filters = {}
    
    for key in request.args:
        filters[key] = request.args.get(key)
    
    # Converter valores booleanos
    if 'is_recurring' in filters:
        filters['is_recurring'] = filters['is_recurring'].lower() == 'true'
    
    # Converter valores numéricos
    for key in ['min_amount', 'max_amount', 'page', 'per_page', 'category_id']:
        if key in filters:
            try:
                filters[key] = float(filters[key]) if key in ['min_amount', 'max_amount'] else int(filters[key])
            except ValueError:
                pass
    
    # Buscar transações com filtros
    result = get_user_transactions(current_user_id, filters)
    
    # Se é um resultado paginado
    if isinstance(result, dict):
        return jsonify({
            'items': [t.to_dict() for t in result['items']],
            'total': result['total'],
            'page': result['page'],
            'pages': result['pages'],
            'per_page': result['per_page']
        }), 200
    
    # Se é uma lista simples
    return jsonify([t.to_dict() for t in result]), 200

@transactions_bp.route('/<int:transaction_id>', methods=['GET'])
@jwt_required()
def get_single_transaction(transaction_id):
    """
    Recupera uma transação específica
    
    Parameters:
        - transaction_id: ID da transação
    
    Returns:
        - Detalhes da transação
    """
    current_user_id = get_jwt_identity()
    
    transaction = get_transaction(transaction_id, current_user_id)
    if not transaction:
        return jsonify({"error": "Transaction not found"}), 404
    
    return jsonify(transaction.to_dict()), 200

@transactions_bp.route('', methods=['POST'])
@jwt_required()
def add_transaction():
    """
    Adiciona uma nova transação
    
    Request:
        - type: Tipo da transação ('income' ou 'expense')
        - description: Descrição da transação
        - amount: Valor da transação
        - date: Data da transação (formato: YYYY-MM-DD)
        - category_id: ID da categoria
        - notes: Observações (opcional)
        - is_recurring: Se é recorrente (opcional)
        - recurrence_pattern: Padrão de recorrência (opcional)
    
    Returns:
        - Transação criada
    """
    current_user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    # Sanitizar dados
    sanitized_data = sanitize_transaction_data(data)
    
    # Validar dados
    validation = validate_transaction_data(sanitized_data)
    if not validation['valid']:
        return jsonify({"error": "Validation error", "details": validation['errors']}), 400
    
    # Criar transação
    transaction = create_transaction(current_user_id, sanitized_data)
    
    if not transaction:
        return jsonify({"error": "Failed to create transaction"}), 400
    
    return jsonify(transaction.to_dict()), 201

@transactions_bp.route('/<int:transaction_id>', methods=['PUT'])
@jwt_required()
def update_single_transaction(transaction_id):
    """
    Atualiza uma transação existente
    
    Parameters:
        - transaction_id: ID da transação
    
    Request:
        - Campos a serem atualizados
    
    Returns:
        - Transação atualizada
    """
    current_user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    # Sanitizar dados
    sanitized_data = sanitize_transaction_data(data)
    
    # Atualizar transação
    transaction = update_transaction(transaction_id, current_user_id, sanitized_data)
    
    if not transaction:
        return jsonify({"error": "Transaction not found or update failed"}), 404
    
    return jsonify(transaction.to_dict()), 200

@transactions_bp.route('/<int:transaction_id>', methods=['DELETE'])
@jwt_required()
def delete_single_transaction(transaction_id):
    """
    Remove uma transação
    
    Parameters:
        - transaction_id: ID da transação
    
    Returns:
        - Mensagem de sucesso
    """
    current_user_id = get_jwt_identity()
    
    success = delete_transaction(transaction_id, current_user_id)
    
    if not success:
        return jsonify({"error": "Transaction not found or delete failed"}), 404
    
    return jsonify({"message": "Transaction deleted successfully"}), 200

@transactions_bp.route('/summary', methods=['GET'])
@jwt_required()
def get_summary():
    """
    Obtém resumo financeiro para um período
    
    Query Parameters:
        - period: Período ('day', 'week', 'month', 'quarter', 'year')
    
    Returns:
        - Resumo financeiro
    """
    current_user_id = get_jwt_identity()
    period = request.args.get('period', 'month')
    
    summary = get_transactions_summary(current_user_id, period)
    
    return jsonify(summary), 200

# Rotas para categorias

@transactions_bp.route('/categories', methods=['GET'])
@jwt_required()
def list_categories():
    """
    Lista categorias disponíveis
    
    Query Parameters:
        - type: Filtrar por tipo ('income' ou 'expense')
    
    Returns:
        - Lista de categorias
    """
    current_user_id = get_jwt_identity()
    category_type = request.args.get('type')
    
    categories = get_categories(current_user_id, category_type)
    
    return jsonify([c.to_dict() for c in categories]), 200

@transactions_bp.route('/categories', methods=['POST'])
@jwt_required()
def add_category():
    """
    Adiciona uma nova categoria
    
    Request:
        - name: Nome da categoria
        - type: Tipo da categoria ('income' ou 'expense')
        - icon: Ícone (opcional)
        - color: Cor (opcional)
    
    Returns:
        - Categoria criada
    """
    current_user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    if 'name' not in data or 'type' not in data:
        return jsonify({"error": "Name and type are required"}), 400
    
    if data['type'] not in ['income', 'expense']:
        return jsonify({"error": "Type must be 'income' or 'expense'"}), 400
    
    category = create_category(
        name=data['name'],
        type=data['type'],
        user_id=current_user_id,
        icon=data.get('icon'),
        color=data.get('color')
    )
    
    if not category:
        return jsonify({"error": "Failed to create category"}), 400
    
    return jsonify(category.to_dict()), 201

@transactions_bp.route('/categories/<int:category_id>', methods=['PUT'])
@jwt_required()
def update_single_category(category_id):
    """
    Atualiza uma categoria existente
    
    Parameters:
        - category_id: ID da categoria
    
    Request:
        - Campos a serem atualizados
    
    Returns:
        - Categoria atualizada
    """
    current_user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    category = update_category(category_id, current_user_id, data)
    
    if not category:
        return jsonify({"error": "Category not found or update failed"}), 404
    
    return jsonify(category.to_dict()), 200

@transactions_bp.route('/categories/<int:category_id>', methods=['DELETE'])
@jwt_required()
def delete_single_category(category_id):
    """
    Remove uma categoria
    
    Parameters:
        - category_id: ID da categoria
    
    Returns:
        - Mensagem de sucesso
    """
    current_user_id = get_jwt_identity()
    
    success = delete_category(category_id, current_user_id)
    
    if not success:
        return jsonify({
            "error": "Category not found, is a system category, or is in use by transactions"
        }), 400
    
    return jsonify({"message": "Category deleted successfully"}), 200
