# /backend/transactions/controllers.py
# Controladores para gerenciamento de transações

from sqlalchemy.exc import IntegrityError
from sqlalchemy import desc, and_
from datetime import datetime
from transactions.models import Transaction, Category
from database.db import db, commit, rollback
from utils.date_helpers import parse_date, get_date_range

def create_transaction(user_id, transaction_data):
    """
    Cria uma nova transação
    
    Args:
        user_id (int): ID do usuário
        transaction_data (dict): Dados da transação
    
    Returns:
        Transaction: Instância da transação criada ou None se falhar
    """
    try:
        # Verificar se categoria existe
        category = Category.query.get(transaction_data['category_id'])
        if not category:
            return None
        
        # Converter string de data para objeto datetime
        transaction_date = parse_date(transaction_data['date'])
        if not transaction_date:
            return None
        
        # Criar nova transação
        transaction = Transaction(
            type=transaction_data['type'],
            description=transaction_data['description'],
            amount=transaction_data['amount'],
            date=transaction_date,
            user_id=user_id,
            category_id=transaction_data['category_id'],
            notes=transaction_data.get('notes', None),
            is_recurring=transaction_data.get('is_recurring', False),
            recurrence_pattern=transaction_data.get('recurrence_pattern', None)
        )
        
        db.session.add(transaction)
        commit()
        
        return transaction
    except IntegrityError:
        rollback()
        return None
    except Exception as e:
        rollback()
        raise e

def get_transaction(transaction_id, user_id=None):
    """
    Recupera uma transação pelo ID
    
    Args:
        transaction_id (int): ID da transação
        user_id (int, optional): ID do usuário para verificação de acesso
    
    Returns:
        Transaction: Instância da transação ou None se não encontrada ou sem acesso
    """
    query = Transaction.query.filter_by(id=transaction_id)
    
    # Se user_id fornecido, verificar se a transação pertence ao usuário
    if user_id:
        query = query.filter_by(user_id=user_id)
    
    return query.first()

def get_user_transactions(user_id, filters=None):
    """
    Recupera transações de um usuário com filtros opcionais
    
    Args:
        user_id (int): ID do usuário
        filters (dict, optional): Filtros para as transações
    
    Returns:
        list: Lista de transações
    """
    # Consulta base
    query = Transaction.query.filter_by(user_id=user_id)
    
    # Aplicar filtros se fornecidos
    if filters:
        if 'type' in filters and filters['type'] in ['income', 'expense']:
            query = query.filter_by(type=filters['type'])
        
        if 'category_id' in filters and filters['category_id']:
            query = query.filter_by(category_id=filters['category_id'])
        
        if 'start_date' in filters and filters['start_date']:
            start_date = parse_date(filters['start_date'])
            if start_date:
                query = query.filter(Transaction.date >= start_date)
        
        if 'end_date' in filters and filters['end_date']:
            end_date = parse_date(filters['end_date'])
            if end_date:
                query = query.filter(Transaction.date <= end_date)
        
        if 'min_amount' in filters and isinstance(filters['min_amount'], (int, float)):
            query = query.filter(Transaction.amount >= filters['min_amount'])
        
        if 'max_amount' in filters and isinstance(filters['max_amount'], (int, float)):
            query = query.filter(Transaction.amount <= filters['max_amount'])
        
        if 'search' in filters and filters['search']:
            search_term = f"%{filters['search']}%"
            query = query.filter(Transaction.description.ilike(search_term))
        
        if 'is_recurring' in filters:
            query = query.filter_by(is_recurring=filters['is_recurring'])
        
        # Aplicar ordenação
        if 'sort' in filters and filters['sort']:
            sort_field = filters['sort'].lstrip('-')
            
            if hasattr(Transaction, sort_field):
                # Determinar direção da ordenação
                if filters['sort'].startswith('-'):
                    query = query.order_by(desc(getattr(Transaction, sort_field)))
                else:
                    query = query.order_by(getattr(Transaction, sort_field))
        else:
            # Ordenação padrão: data decrescente
            query = query.order_by(desc(Transaction.date))
        
        # Aplicar paginação
        if 'page' in filters and 'per_page' in filters:
            page = max(1, int(filters['page']))
            per_page = min(100, int(filters['per_page']))
            
            pagination = query.paginate(page=page, per_page=per_page)
            return {
                'items': pagination.items,
                'total': pagination.total,
                'page': pagination.page,
                'pages': pagination.pages,
                'per_page': pagination.per_page
            }
    
    # Retornar todos os resultados se não houver paginação
    return query.all()

def update_transaction(transaction_id, user_id, updated_data):
    """
    Atualiza uma transação existente
    
    Args:
        transaction_id (int): ID da transação
        user_id (int): ID do usuário
        updated_data (dict): Novos dados da transação
    
    Returns:
        Transaction: Instância da transação atualizada ou None se falhar
    """
    try:
        # Buscar transação do usuário
        transaction = Transaction.query.filter_by(id=transaction_id, user_id=user_id).first()
        
        if not transaction:
            return None
        
        # Atualizar campos básicos
        if 'type' in updated_data:
            transaction.type = updated_data['type']
        
        if 'description' in updated_data:
            transaction.description = updated_data['description']
        
        if 'amount' in updated_data:
            transaction.amount = updated_data['amount']
        
        if 'date' in updated_data:
            transaction_date = parse_date(updated_data['date'])
            if transaction_date:
                transaction.date = transaction_date
        
        if 'notes' in updated_data:
            transaction.notes = updated_data['notes']
        
        if 'is_recurring' in updated_data:
            transaction.is_recurring = updated_data['is_recurring']
        
        if 'recurrence_pattern' in updated_data:
            transaction.recurrence_pattern = updated_data['recurrence_pattern']
        
        # Atualizar categoria se fornecida e existir
        if 'category_id' in updated_data:
            category = Category.query.get(updated_data['category_id'])
            if category:
                transaction.category_id = updated_data['category_id']
        
        commit()
        return transaction
    except IntegrityError:
        rollback()
        return None
    except Exception as e:
        rollback()
        raise e

def delete_transaction(transaction_id, user_id):
    """
    Remove uma transação
    
    Args:
        transaction_id (int): ID da transação
        user_id (int): ID do usuário
    
    Returns:
        bool: True se removida com sucesso, False caso contrário
    """
    try:
        # Buscar transação do usuário
        transaction = Transaction.query.filter_by(id=transaction_id, user_id=user_id).first()
        
        if not transaction:
            return False
        
        db.session.delete(transaction)
        commit()
        
        return True
    except Exception:
        rollback()
        return False

def get_transactions_summary(user_id, period='month'):
    """
    Calcula resumo financeiro para um período
    
    Args:
        user_id (int): ID do usuário
        period (str): Período ('day', 'week', 'month', 'quarter', 'year')
    
    Returns:
        dict: Resumo financeiro com receitas, despesas e saldo
    """
    try:
        # Determinar intervalo de datas para o período
        start_date, end_date = get_date_range(period)
        
        # Buscar transações no período
        transactions = Transaction.query.filter(
            and_(
                Transaction.user_id == user_id,
                Transaction.date >= start_date,
                Transaction.date <= end_date
            )
        ).all()
        
        # Calcular totais
        income = sum(t.amount for t in transactions if t.type == 'income')
        expense = sum(t.amount for t in transactions if t.type == 'expense')
        balance = income - expense
        
        return {
            'period': {
                'start_date': start_date,
                'end_date': end_date,
                'name': period
            },
            'income': income,
            'expense': expense,
            'balance': balance,
            'transaction_count': len(transactions)
        }
    except Exception as e:
        print(f"Erro ao calcular resumo: {e}")
        return {
            'income': 0,
            'expense': 0,
            'balance': 0,
            'transaction_count': 0
        }

def create_category(name, type, user_id=None, **kwargs):
    """
    Cria uma nova categoria
    
    Args:
        name (str): Nome da categoria
        type (str): Tipo da categoria ('income' ou 'expense')
        user_id (int, optional): ID do usuário (None para categorias do sistema)
    
    Returns:
        Category: Instância da categoria criada ou None se falhar
    """
    try:
        # Verificar se já existe categoria com esse nome para o usuário
        existing = Category.query.filter_by(name=name, type=type, user_id=user_id).first()
        if existing:
            return None
        
        category = Category(
            name=name,
            type=type,
            user_id=user_id,
            icon=kwargs.get('icon'),
            color=kwargs.get('color'),
            is_default=kwargs.get('is_default', False)
        )
        
        db.session.add(category)
        commit()
        
        return category
    except IntegrityError:
        rollback()
        return None
    except Exception as e:
        rollback()
        raise e

def get_categories(user_id=None, type=None):
    """
    Recupera categorias do usuário e do sistema
    
    Args:
        user_id (int, optional): ID do usuário
        type (str, optional): Tipo de categoria ('income' ou 'expense')
    
    Returns:
        list: Lista de categorias
    """
    # Consulta base para categorias do sistema
    query = Category.query.filter(
        (Category.is_default == True) | (Category.user_id == user_id)
    )
    
    # Filtrar por tipo se fornecido
    if type in ['income', 'expense']:
        query = query.filter_by(type=type)
    
    # Ordenar por padrão primeiro, depois por nome
    return query.order_by(Category.is_default.desc(), Category.name).all()

def update_category(category_id, user_id, updated_data):
    """
    Atualiza uma categoria existente
    
    Args:
        category_id (int): ID da categoria
        user_id (int): ID do usuário
        updated_data (dict): Novos dados da categoria
    
    Returns:
        Category: Instância da categoria atualizada ou None se falhar
    """
    try:
        # Buscar categoria do usuário
        category = Category.query.filter_by(id=category_id, user_id=user_id).first()
        
        # Não permitir atualização de categorias do sistema
        if not category or category.is_default:
            return None
        
        # Atualizar campos
        if 'name' in updated_data:
            category.name = updated_data['name']
        
        if 'icon' in updated_data:
            category.icon = updated_data['icon']
        
        if 'color' in updated_data:
            category.color = updated_data['color']
        
        commit()
        return category
    except IntegrityError:
        rollback()
        return None
    except Exception as e:
        rollback()
        raise e

def delete_category(category_id, user_id):
    """
    Remove uma categoria
    
    Args:
        category_id (int): ID da categoria
        user_id (int): ID do usuário
    
    Returns:
        bool: True se removida com sucesso, False caso contrário
    """
    try:
        # Buscar categoria do usuário
        category = Category.query.filter_by(id=category_id, user_id=user_id).first()
        
        # Não permitir remoção de categorias do sistema ou que não existem
        if not category or category.is_default:
            return False
        
        # Verificar se há transações usando a categoria
        transactions_count = Transaction.query.filter_by(category_id=category_id).count()
        if transactions_count > 0:
            return False
        
        db.session.delete(category)
        commit()
        
        return True
    except Exception:
        rollback()
        return False
