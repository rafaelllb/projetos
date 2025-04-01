# /backend/budgets/controllers.py
# Controladores para gerenciamento de orçamentos

from sqlalchemy.exc import IntegrityError
from sqlalchemy import and_, func
from datetime import datetime, date
from budgets.models import Budget, BudgetCategory
from transactions.models import Transaction, Category
from database.db import db, commit, rollback
from utils.date_helpers import parse_date

def create_budget(user_id, budget_data):
    """
    Cria um novo orçamento
    
    Args:
        user_id (int): ID do usuário
        budget_data (dict): Dados do orçamento
    
    Returns:
        Budget: Instância do orçamento criado ou None se falhar
    """
    try:
        # Converter strings de data para objetos date
        start_date = parse_date(budget_data['start_date'])
        end_date = parse_date(budget_data['end_date'])
        
        if not start_date or not end_date:
            return None
        
        # Criar novo orçamento
        budget = Budget(
            name=budget_data['name'],
            amount=budget_data['amount'],
            start_date=start_date,
            end_date=end_date,
            user_id=user_id,
            description=budget_data.get('description')
        )
        
        db.session.add(budget)
        commit()
        
        # Se há categorias específicas para o orçamento
        if 'categories' in budget_data and isinstance(budget_data['categories'], list):
            for category_data in budget_data['categories']:
                if 'category_id' in category_data and 'amount' in category_data:
                    # Verificar se categoria existe
                    category = Category.query.get(category_data['category_id'])
                    if category:
                        budget_category = BudgetCategory(
                            budget_id=budget.id,
                            category_id=category_data['category_id'],
                            amount=category_data['amount']
                        )
                        db.session.add(budget_category)
            
            commit()
        
        return budget
    except IntegrityError:
        rollback()
        return None
    except Exception as e:
        rollback()
        raise e

def get_budget(budget_id, user_id=None):
    """
    Recupera um orçamento pelo ID
    
    Args:
        budget_id (int): ID do orçamento
        user_id (int, optional): ID do usuário para verificação de acesso
    
    Returns:
        Budget: Instância do orçamento ou None se não encontrado ou sem acesso
    """
    query = Budget.query.filter_by(id=budget_id)
    
    # Se user_id fornecido, verificar se o orçamento pertence ao usuário
    if user_id:
        query = query.filter_by(user_id=user_id)
    
    return query.first()

def get_user_budgets(user_id, include_inactive=False):
    """
    Recupera orçamentos de um usuário
    
    Args:
        user_id (int): ID do usuário
        include_inactive (bool): Se deve incluir orçamentos inativos
    
    Returns:
        list: Lista de orçamentos
    """
    query = Budget.query.filter_by(user_id=user_id)
    
    if not include_inactive:
        query = query.filter_by(is_active=True)
    
    # Ordenar por data de início decrescente
    return query.order_by(Budget.start_date.desc()).all()

def get_current_budgets(user_id):
    """
    Recupera orçamentos ativos no período atual
    
    Args:
        user_id (int): ID do usuário
    
    Returns:
        list: Lista de orçamentos
    """
    today = date.today()
    
    query = Budget.query.filter(
        and_(
            Budget.user_id == user_id,
            Budget.is_active == True,
            Budget.start_date <= today,
            Budget.end_date >= today
        )
    )
    
    return query.all()

def update_budget(budget_id, user_id, updated_data):
    """
    Atualiza um orçamento existente
    
    Args:
        budget_id (int): ID do orçamento
        user_id (int): ID do usuário
        updated_data (dict): Novos dados do orçamento
    
    Returns:
        Budget: Instância do orçamento atualizado ou None se falhar
    """
    try:
        # Buscar orçamento do usuário
        budget = Budget.query.filter_by(id=budget_id, user_id=user_id).first()
        
        if not budget:
            return None
        
        # Atualizar campos básicos
        if 'name' in updated_data:
            budget.name = updated_data['name']
        
        if 'amount' in updated_data:
            budget.amount = updated_data['amount']
        
        if 'description' in updated_data:
            budget.description = updated_data['description']
        
        if 'is_active' in updated_data:
            budget.is_active = updated_data['is_active']
        
        # Atualizar datas
        if 'start_date' in updated_data:
            start_date = parse_date(updated_data['start_date'])
            if start_date:
                budget.start_date = start_date
        
        if 'end_date' in updated_data:
            end_date = parse_date(updated_data['end_date'])
            if end_date:
                budget.end_date = end_date
        
        # Atualizar categorias se fornecidas
        if 'categories' in updated_data and isinstance(updated_data['categories'], list):
            # Remover alocações existentes
            BudgetCategory.query.filter_by(budget_id=budget.id).delete()
            
            # Adicionar novas alocações
            for category_data in updated_data['categories']:
                if 'category_id' in category_data and 'amount' in category_data:
                    # Verificar se categoria existe
                    category = Category.query.get(category_data['category_id'])
                    if category:
                        budget_category = BudgetCategory(
                            budget_id=budget.id,
                            category_id=category_data['category_id'],
                            amount=category_data['amount']
                        )
                        db.session.add(budget_category)
        
        commit()
        return budget
    except IntegrityError:
        rollback()
        return None
    except Exception as e:
        rollback()
        raise e

def delete_budget(budget_id, user_id):
    """
    Remove um orçamento
    
    Args:
        budget_id (int): ID do orçamento
        user_id (int): ID do usuário
    
    Returns:
        bool: True se removido com sucesso, False caso contrário
    """
    try:
        # Buscar orçamento do usuário
        budget = Budget.query.filter_by(id=budget_id, user_id=user_id).first()
        
        if not budget:
            return False
        
        db.session.delete(budget)
        commit()
        
        return True
    except Exception:
        rollback()
        return False

def calculate_budget_progress(budget_id, user_id=None):
    """
    Calcula o progresso de um orçamento
    
    Args:
        budget_id (int): ID do orçamento
        user_id (int, optional): ID do usuário para verificação de acesso
    
    Returns:
        dict: Dados de progresso do orçamento
    """
    # Buscar orçamento
    budget = get_budget(budget_id, user_id)
    
    if not budget:
        return None
    
    # Obter transações no período do orçamento
    transactions = Transaction.query.filter(
        and_(
            Transaction.user_id == budget.user_id,
            Transaction.type == 'expense',
            Transaction.date >= budget.start_date,
            Transaction.date <= budget.end_date
        )
    ).all()
    
    # Calcular gastos totais
    total_spent = sum(t.amount for t in transactions)
    
    # Obter dados de categorias do orçamento
    budget_categories = BudgetCategory.query.filter_by(budget_id=budget.id).all()
    
    # Se não há categorias específicas, considerar todas as despesas
    if not budget_categories:
        progress = {
            'budget': budget.to_dict(),
            'total_budget': budget.amount,
            'total_spent': total_spent,
            'remaining': max(0, budget.amount - total_spent),
            'percentage': min(100, (total_spent / budget.amount * 100)) if budget.amount > 0 else 0,
            'categories': []
        }
    else:
        # Calcular progresso por categoria
        categories_progress = []
        
        for budget_cat in budget_categories:
            # Calcular gastos na categoria
            cat_spent = sum(t.amount for t in transactions if t.category_id == budget_cat.category_id)
            
            # Calcular progresso
            cat_percentage = min(100, (cat_spent / budget_cat.amount * 100)) if budget_cat.amount > 0 else 0
            
            categories_progress.append({
                'category': Category.query.get(budget_cat.category_id).to_dict(),
                'budget_amount': budget_cat.amount,
                'spent': cat_spent,
                'remaining': max(0, budget_cat.amount - cat_spent),
                'percentage': cat_percentage
            })
        
        progress = {
            'budget': budget.to_dict(),
            'total_budget': budget.amount,
            'total_spent': total_spent,
            'remaining': max(0, budget.amount - total_spent),
            'percentage': min(100, (total_spent / budget.amount * 100)) if budget.amount > 0 else 0,
            'categories': categories_progress
        }
    
    return progress

def get_budget_categories(budget_id, user_id=None):
    """
    Recupera categorias alocadas em um orçamento
    
    Args:
        budget_id (int): ID do orçamento
        user_id (int, optional): ID do usuário para verificação de acesso
    
    Returns:
        list: Lista de alocações por categoria
    """
    # Verificar acesso ao orçamento se user_id fornecido
    if user_id:
        budget = Budget.query.filter_by(id=budget_id, user_id=user_id).first()
        if not budget:
            return None
    
    # Buscar alocações de categorias
    budget_categories = BudgetCategory.query.filter_by(budget_id=budget_id).all()
    
    # Formatar resultado
    result = []
    for bc in budget_categories:
        category = Category.query.get(bc.category_id)
        if category:
            result.append({
                'budget_category_id': bc.id,
                'category': category.to_dict(),
                'amount': bc.amount
            })
    
    return result
