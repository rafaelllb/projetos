# /backend/goals/controllers.py
# Controladores para gerenciamento de metas financeiras

from sqlalchemy.exc import IntegrityError
from sqlalchemy import desc
from datetime import datetime, date
from goals.models import Goal, GoalContribution
from database.db import db, commit, rollback
from utils.date_helpers import parse_date

def create_goal(user_id, goal_data):
    """
    Cria uma nova meta financeira
    
    Args:
        user_id (int): ID do usuário
        goal_data (dict): Dados da meta
    
    Returns:
        Goal: Instância da meta criada ou None se falhar
    """
    try:
        # Converter deadline para objeto date se fornecido
        deadline = None
        if 'deadline' in goal_data and goal_data['deadline']:
            deadline = parse_date(goal_data['deadline'])
        
        # Criar nova meta
        goal = Goal(
            name=goal_data['name'],
            target_amount=goal_data['target_amount'],
            user_id=user_id,
            current_amount=goal_data.get('current_amount', 0),
            deadline=deadline,
            description=goal_data.get('description'),
            category=goal_data.get('category'),
            icon=goal_data.get('icon')
        )
        
        # Verificar se a meta já está completa
        if goal.current_amount >= goal.target_amount:
            goal.is_completed = True
            goal.completed_date = date.today()
        
        db.session.add(goal)
        commit()
        
        return goal
    except IntegrityError:
        rollback()
        return None
    except Exception as e:
        rollback()
        raise e

def get_goal(goal_id, user_id=None):
    """
    Recupera uma meta pelo ID
    
    Args:
        goal_id (int): ID da meta
        user_id (int, optional): ID do usuário para verificação de acesso
    
    Returns:
        Goal: Instância da meta ou None se não encontrada ou sem acesso
    """
    query = Goal.query.filter_by(id=goal_id)
    
    # Se user_id fornecido, verificar se a meta pertence ao usuário
    if user_id:
        query = query.filter_by(user_id=user_id)
    
    return query.first()

def get_user_goals(user_id, include_completed=False):
    """
    Recupera metas de um usuário
    
    Args:
        user_id (int): ID do usuário
        include_completed (bool): Se deve incluir metas concluídas
    
    Returns:
        list: Lista de metas
    """
    query = Goal.query.filter_by(user_id=user_id, is_active=True)
    
    if not include_completed:
        query = query.filter_by(is_completed=False)
    
    # Ordenar por data limite (metas sem prazo por último) e depois por progresso
    return query.order_by(
        Goal.deadline.is_(None).asc(),
        Goal.deadline.asc(),
        (Goal.current_amount / Goal.target_amount).desc()
    ).all()

def update_goal(goal_id, user_id, updated_data):
    """
    Atualiza uma meta existente
    
    Args:
        goal_id (int): ID da meta
        user_id (int): ID do usuário
        updated_data (dict): Novos dados da meta
    
    Returns:
        Goal: Instância da meta atualizada ou None se falhar
    """
    try:
        # Buscar meta do usuário
        goal = Goal.query.filter_by(id=goal_id, user_id=user_id).first()
        
        if not goal:
            return None
        
        # Atualizar campos básicos
        if 'name' in updated_data:
            goal.name = updated_data['name']
        
        if 'target_amount' in updated_data:
            goal.target_amount = updated_data['target_amount']
        
        if 'current_amount' in updated_data:
            goal.current_amount = updated_data['current_amount']
        
        if 'description' in updated_data:
            goal.description = updated_data['description']
        
        if 'category' in updated_data:
            goal.category = updated_data['category']
        
        if 'icon' in updated_data:
            goal.icon = updated_data['icon']
        
        if 'is_active' in updated_data:
            goal.is_active = updated_data['is_active']
        
        # Atualizar deadline
        if 'deadline' in updated_data:
            if updated_data['deadline']:
                deadline = parse_date(updated_data['deadline'])
                if deadline:
                    goal.deadline = deadline
            else:
                goal.deadline = None
        
        # Verificar se a meta foi concluída
        if goal.current_amount >= goal.target_amount and not goal.is_completed:
            goal.is_completed = True
            goal.completed_date = date.today()
        # Se a meta foi reduzida e não está mais completa
        elif goal.current_amount < goal.target_amount and goal.is_completed:
            goal.is_completed = False
            goal.completed_date = None
        
        commit()
        return goal
    except IntegrityError:
        rollback()
        return None
    except Exception as e:
        rollback()
        raise e

def delete_goal(goal_id, user_id):
    """
    Remove uma meta
    
    Args:
        goal_id (int): ID da meta
        user_id (int): ID do usuário
    
    Returns:
        bool: True se removida com sucesso, False caso contrário
    """
    try:
        # Buscar meta do usuário
        goal = Goal.query.filter_by(id=goal_id, user_id=user_id).first()
        
        if not goal:
            return False
        
        db.session.delete(goal)
        commit()
        
        return True
    except Exception:
        rollback()
        return False

def add_goal_contribution(goal_id, user_id, contribution_data):
    """
    Adiciona uma contribuição para uma meta
    
    Args:
        goal_id (int): ID da meta
        user_id (int): ID do usuário
        contribution_data (dict): Dados da contribuição
    
    Returns:
        dict: Meta atualizada e contribuição adicionada
    """
    try:
        # Buscar meta do usuário
        goal = Goal.query.filter_by(id=goal_id, user_id=user_id).first()
        
        if not goal:
            return None
        
        # Criar contribuição
        contribution = GoalContribution(
            goal_id=goal.id,
            amount=contribution_data['amount'],
            notes=contribution_data.get('notes')
        )
        
        # Se data específica fornecida
        if 'date' in contribution_data and contribution_data['date']:
            contribution_date = parse_date(contribution_data['date'])
            if contribution_date:
                contribution.date = contribution_date
        
        db.session.add(contribution)
        
        # Atualizar valor atual da meta
        goal.current_amount += contribution.amount
        
        # Verificar se a meta foi concluída
        if goal.current_amount >= goal.target_amount and not goal.is_completed:
            goal.is_completed = True
            goal.completed_date = date.today()
        
        commit()
        
        return {
            'goal': goal.to_dict(),
            'contribution': contribution.to_dict()
        }
    except IntegrityError:
        rollback()
        return None
    except Exception as e:
        rollback()
        raise e

def get_goal_contributions(goal_id, user_id=None):
    """
    Recupera contribuições de uma meta
    
    Args:
        goal_id (int): ID da meta
        user_id (int, optional): ID do usuário para verificação de acesso
    
    Returns:
        list: Lista de contribuições
    """
    # Verificar acesso à meta se user_id fornecido
    if user_id:
        goal = Goal.query.filter_by(id=goal_id, user_id=user_id).first()
        if not goal:
            return None
    
    # Buscar contribuições ordenadas por data decrescente
    contributions = GoalContribution.query.filter_by(goal_id=goal_id).order_by(desc(GoalContribution.date)).all()
    
    return contributions

def calculate_goal_progress(goal_id, user_id=None):
    """
    Calcula o progresso de uma meta
    
    Args:
        goal_id (int): ID da meta
        user_id (int, optional): ID do usuário para verificação de acesso
    
    Returns:
        dict: Dados de progresso da meta
    """
    # Buscar meta
    goal = get_goal(goal_id, user_id)
    
    if not goal:
        return None
    
    # Calcular percentual de progresso
    progress_percentage = min(100, (goal.current_amount / goal.target_amount * 100)) if goal.target_amount > 0 else 0
    
    # Calcular valor restante
    remaining_amount = max(0, goal.target_amount - goal.current_amount)
    
    # Determinação de status
    status = "completed" if goal.is_completed else "in_progress"
    
    # Se tem prazo, calcular se está em risco ou vencido
    if not goal.is_completed and goal.deadline:
        today = date.today()
        
        if goal.deadline < today:
            status = "overdue"
        elif (goal.deadline - today).days <= 30 and progress_percentage < 75:
            status = "at_risk"
    
    # Calcular dias restantes se tiver prazo
    days_remaining = None
    if goal.deadline and not goal.is_completed:
        days_remaining = max(0, (goal.deadline - date.today()).days)
    
    result = {
        'goal': goal.to_dict(),
        'progress_percentage': progress_percentage,
        'remaining_amount': remaining_amount,
        'status': status
    }
    
    if days_remaining is not None:
        result['days_remaining'] = days_remaining
        
        # Se tiver dias restantes, calcular valor diário necessário
        if days_remaining > 0:
            result['daily_amount_needed'] = remaining_amount / days_remaining
    
    return result
