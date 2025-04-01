# /backend/reports/generators.py
# Geradores de relatórios financeiros

from datetime import datetime, timedelta
from sqlalchemy import func, and_, desc, extract
from transactions.models import Transaction, Category
from budgets.models import Budget, BudgetCategory
from goals.models import Goal
from utils.date_helpers import get_date_range, format_date, parse_date

def generate_summary_report(user_id, start_date, end_date):
    """
    Gera um relatório de resumo financeiro para um período
    
    Args:
        user_id (int): ID do usuário
        start_date (date): Data de início
        end_date (date): Data de fim
    
    Returns:
        dict: Dados do relatório
    """
    # Converter strings para objetos date se necessário
    if isinstance(start_date, str):
        start_date = parse_date(start_date)
    if isinstance(end_date, str):
        end_date = parse_date(end_date)
    
    if not start_date or not end_date:
        return {'error': 'Invalid date format'}
    
    # Filtrar transações do período
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
    
    # Calcular total por categoria
    category_totals = {}
    for transaction in transactions:
        category_id = transaction.category_id
        if category_id not in category_totals:
            category = Category.query.get(category_id)
            category_totals[category_id] = {
                'id': category_id,
                'name': category.name if category else 'Unknown',
                'type': transaction.type,
                'icon': category.icon if category else None,
                'total': 0
            }
        
        category_totals[category_id]['total'] += transaction.amount
    
    # Separar categorias por tipo
    income_categories = [c for c in category_totals.values() if c['type'] == 'income']
    expense_categories = [c for c in category_totals.values() if c['type'] == 'expense']
    
    # Ordenar por valor total (decrescente)
    income_categories.sort(key=lambda x: x['total'], reverse=True)
    expense_categories.sort(key=lambda x: x['total'], reverse=True)
    
    # Calcular média diária
    days = (end_date - start_date).days + 1
    avg_daily_income = income / days if days > 0 else 0
    avg_daily_expense = expense / days if days > 0 else 0
    
    # Construir resposta
    return {
        'period': {
            'start_date': format_date(start_date),
            'end_date': format_date(end_date),
            'days': days
        },
        'summary': {
            'income': income,
            'expense': expense,
            'balance': balance,
            'savings_rate': (income - expense) / income * 100 if income > 0 else 0
        },
        'averages': {
            'daily_income': avg_daily_income,
            'daily_expense': avg_daily_expense
        },
        'categories': {
            'income': income_categories,
            'expense': expense_categories
        },
        'transaction_count': len(transactions),
        'generated_at': datetime.utcnow().isoformat()
    }

def generate_category_report(user_id, start_date, end_date, category_type='expense'):
    """
    Gera um relatório de gastos por categoria
    
    Args:
        user_id (int): ID do usuário
        start_date (date): Data de início
        end_date (date): Data de fim
        category_type (str): Tipo de categoria ('income' ou 'expense')
    
    Returns:
        dict: Dados do relatório
    """
    # Converter strings para objetos date se necessário
    if isinstance(start_date, str):
        start_date = parse_date(start_date)
    if isinstance(end_date, str):
        end_date = parse_date(end_date)
    
    if not start_date or not end_date:
        return {'error': 'Invalid date format'}
    
    # Filtrar transações do período e tipo
    transactions = Transaction.query.filter(
        and_(
            Transaction.user_id == user_id,
            Transaction.type == category_type,
            Transaction.date >= start_date,
            Transaction.date <= end_date
        )
    ).all()
    
    # Calcular total geral
    total_amount = sum(t.amount for t in transactions)
    
    # Calcular total por categoria
    category_data = {}
    for transaction in transactions:
        category_id = transaction.category_id
        if category_id not in category_data:
            category = Category.query.get(category_id)
            category_data[category_id] = {
                'id': category_id,
                'name': category.name if category else 'Unknown',
                'icon': category.icon if category else None,
                'color': category.color if category else None,
                'total': 0,
                'percentage': 0,
                'transaction_count': 0,
                'transactions': []
            }
        
        category_data[category_id]['total'] += transaction.amount
        category_data[category_id]['transaction_count'] += 1
        category_data[category_id]['transactions'].append(transaction.to_dict())
    
    # Calcular percentuais
    for category in category_data.values():
        category['percentage'] = (category['total'] / total_amount * 100) if total_amount > 0 else 0
    
    # Converter para lista e ordenar por valor total (decrescente)
    categories = list(category_data.values())
    categories.sort(key=lambda x: x['total'], reverse=True)
    
    # Construir resposta
    return {
        'period': {
            'start_date': format_date(start_date),
            'end_date': format_date(end_date),
            'days': (end_date - start_date).days + 1
        },
        'type': category_type,
        'total_amount': total_amount,
        'categories': categories,
        'transaction_count': len(transactions),
        'generated_at': datetime.utcnow().isoformat()
    }

def generate_monthly_report(user_id, start_month, months_count=12):
    """
    Gera um relatório de evolução mensal
    
    Args:
        user_id (int): ID do usuário
        start_month (str): Mês inicial no formato YYYY-MM
        months_count (int): Número de meses a incluir
    
    Returns:
        dict: Dados do relatório
    """
    # Validar e processar mês inicial
    try:
        if isinstance(start_month, str):
            year, month = map(int, start_month.split('-'))
            start_date = datetime(year, month, 1).date()
        else:
            start_date = start_month
    except (ValueError, TypeError):
        # Se inválido, usar 12 meses atrás a partir de hoje
        today = datetime.now().date()
        start_date = datetime(today.year, today.month, 1).date() - timedelta(days=365)
    
    # Calcular data final (primeiro dia do mês + n meses)
    end_date = datetime(start_date.year, start_date.month, 1).date()
    for _ in range(months_count):
        month = end_date.month % 12 + 1
        year = end_date.year + (end_date.month // 12)
        end_date = datetime(year, month, 1).date() - timedelta(days=1)
    
    # Dados mensais
    monthly_data = []
    current_date = start_date
    
    for _ in range(months_count):
        # Definir período do mês
        month_start = datetime(current_date.year, current_date.month, 1).date()
        
        # Calcular último dia do mês
        if current_date.month == 12:
            next_month = datetime(current_date.year + 1, 1, 1).date()
        else:
            next_month = datetime(current_date.year, current_date.month + 1, 1).date()
        
        month_end = next_month - timedelta(days=1)
        
        # Buscar transações do mês
        transactions = Transaction.query.filter(
            and_(
                Transaction.user_id == user_id,
                Transaction.date >= month_start,
                Transaction.date <= month_end
            )
        ).all()
        
        # Calcular totais
        income = sum(t.amount for t in transactions if t.type == 'income')
        expense = sum(t.amount for t in transactions if t.type == 'expense')
        balance = income - expense
        
        # Adicionar dados do mês
        monthly_data.append({
            'year': current_date.year,
            'month': current_date.month,
            'month_name': format_date(current_date, '%b %Y'),
            'income': income,
            'expense': expense,
            'balance': balance,
            'savings_rate': (income - expense) / income * 100 if income > 0 else 0,
            'transaction_count': len(transactions)
        })
        
        # Avançar para o próximo mês
        if current_date.month == 12:
            current_date = datetime(current_date.year + 1, 1, 1).date()
        else:
            current_date = datetime(current_date.year, current_date.month + 1, 1).date()
    
    # Calcular totais e médias
    total_income = sum(month['income'] for month in monthly_data)
    total_expense = sum(month['expense'] for month in monthly_data)
    total_balance = total_income - total_expense
    
    avg_monthly_income = total_income / months_count if months_count > 0 else 0
    avg_monthly_expense = total_expense / months_count if months_count > 0 else 0
    
    # Encontrar melhor e pior mês
    if monthly_data:
        best_month = max(monthly_data, key=lambda x: x['balance'])
        worst_month = min(monthly_data, key=lambda x: x['balance'])
    else:
        best_month = worst_month = None
    
    # Calcular tendências (últimos 3 meses vs 3 meses anteriores)
    trends = {
        'income': 'stable',
        'expense': 'stable',
        'balance': 'stable'
    }
    
    if len(monthly_data) >= 6:
        last_3_months = monthly_data[-3:]
        prev_3_months = monthly_data[-6:-3]
        
        avg_income_last_3 = sum(m['income'] for m in last_3_months) / 3
        avg_income_prev_3 = sum(m['income'] for m in prev_3_months) / 3
        
        avg_expense_last_3 = sum(m['expense'] for m in last_3_months) / 3
        avg_expense_prev_3 = sum(m['expense'] for m in prev_3_months) / 3
        
        avg_balance_last_3 = sum(m['balance'] for m in last_3_months) / 3
        avg_balance_prev_3 = sum(m['balance'] for m in prev_3_months) / 3
        
        # Determinar tendências com base na variação percentual
        if avg_income_prev_3 > 0:
            income_change = (avg_income_last_3 - avg_income_prev_3) / avg_income_prev_3 * 100
            trends['income'] = 'up' if income_change > 5 else ('down' if income_change < -5 else 'stable')
        
        if avg_expense_prev_3 > 0:
            expense_change = (avg_expense_last_3 - avg_expense_prev_3) / avg_expense_prev_3 * 100
            trends['expense'] = 'up' if expense_change > 5 else ('down' if expense_change < -5 else 'stable')
        
        if avg_balance_prev_3 != 0:
            balance_change = (avg_balance_last_3 - avg_balance_prev_3) / abs(avg_balance_prev_3) * 100
            trends['balance'] = 'up' if balance_change > 5 else ('down' if balance_change < -5 else 'stable')
    
    # Construir resposta
    return {
        'period': {
            'start_date': format_date(start_date),
            'end_date': format_date(end_date),
            'months': months_count
        },
        'summary': {
            'total_income': total_income,
            'total_expense': total_expense,
            'total_balance': total_balance,
            'avg_monthly_income': avg_monthly_income,
            'avg_monthly_expense': avg_monthly_expense,
            'best_month': best_month,
            'worst_month': worst_month
        },
        'trends': trends,
        'monthly_data': monthly_data,
        'generated_at': datetime.utcnow().isoformat()
    }

def generate_budget_report(user_id, start_date, end_date):
    """
    Gera um relatório de desempenho de orçamentos
    
    Args:
        user_id (int): ID do usuário
        start_date (date): Data de início
        end_date (date): Data de fim
    
    Returns:
        dict: Dados do relatório
    """
    # Converter strings para objetos date se necessário
    if isinstance(start_date, str):
        start_date = parse_date(start_date)
    if isinstance(end_date, str):
        end_date = parse_date(end_date)
    
    if not start_date or not end_date:
        return {'error': 'Invalid date format'}
    
    # Buscar orçamentos ativos no período
    budgets = Budget.query.filter(
        and_(
            Budget.user_id == user_id,
            Budget.is_active == True,
            Budget.start_date <= end_date,
            Budget.end_date >= start_date
        )
    ).all()
    
    budget_data = []
    
    for budget in budgets:
        # Filtrar transações do período e do orçamento
        period_start = max(budget.start_date, start_date)
        period_end = min(budget.end_date, end_date)
        
        # Buscar categorias específicas do orçamento
        budget_categories = BudgetCategory.query.filter_by(budget_id=budget.id).all()
        
        if budget_categories:
            # Orçamento com categorias específicas
            category_ids = [bc.category_id for bc in budget_categories]
            transactions = Transaction.query.filter(
                and_(
                    Transaction.user_id == user_id,
                    Transaction.type == 'expense',
                    Transaction.date >= period_start,
                    Transaction.date <= period_end,
                    Transaction.category_id.in_(category_ids)
                )
            ).all()
            
            # Calcular gastos por categoria
            category_spending = {}
            for bc in budget_categories:
                category = Category.query.get(bc.category_id)
                category_transactions = [t for t in transactions if t.category_id == bc.category_id]
                spent = sum(t.amount for t in category_transactions)
                
                category_spending[bc.category_id] = {
                    'category': {
                        'id': bc.category_id,
                        'name': category.name if category else 'Unknown',
                        'icon': category.icon if category else None
                    },
                    'budget_amount': bc.amount,
                    'spent': spent,
                    'remaining': max(0, bc.amount - spent),
                    'percentage': min(100, (spent / bc.amount * 100)) if bc.amount > 0 else 0,
                    'status': 'on_track' if spent <= bc.amount else 'exceeded'
                }
        else:
            # Orçamento geral (todas as despesas)
            transactions = Transaction.query.filter(
                and_(
                    Transaction.user_id == user_id,
                    Transaction.type == 'expense',
                    Transaction.date >= period_start,
                    Transaction.date <= period_end
                )
            ).all()
            
            category_spending = {}
        
        # Calcular totais
        total_spent = sum(t.amount for t in transactions)
        
        # Adicionar dados do orçamento
        budget_data.append({
            'budget': budget.to_dict(),
            'period': {
                'start_date': format_date(period_start),
                'end_date': format_date(period_end),
                'days': (period_end - period_start).days + 1
            },
            'total_budget': budget.amount,
            'total_spent': total_spent,
            'remaining': max(0, budget.amount - total_spent),
            'percentage': min(100, (total_spent / budget.amount * 100)) if budget.amount > 0 else 0,
            'status': 'on_track' if total_spent <= budget.amount else 'exceeded',
            'categories': list(category_spending.values())
        })
    
    # Construir resposta
    return {
        'period': {
            'start_date': format_date(start_date),
            'end_date': format_date(end_date),
            'days': (end_date - start_date).days + 1
        },
        'budgets': budget_data,
        'budget_count': len(budgets),
        'generated_at': datetime.utcnow().isoformat()
    }

def generate_goals_report(user_id):
    """
    Gera um relatório de progresso de metas financeiras
    
    Args:
        user_id (int): ID do usuário
    
    Returns:
        dict: Dados do relatório
    """
    # Buscar todas as metas do usuário
    goals = Goal.query.filter_by(user_id=user_id).all()
    
    goals_data = []
    
    for goal in goals:
        # Calcular dias restantes
        days_remaining = None
        if goal.deadline and not goal.is_completed:
            days_remaining = (goal.deadline - datetime.now().date()).days
            days_remaining = max(0, days_remaining)
        
        # Calcular valor diário necessário
        daily_amount_needed = None
        if days_remaining and days_remaining > 0:
            remaining_amount = goal.target_amount - goal.current_amount
            if remaining_amount > 0:
                daily_amount_needed = remaining_amount / days_remaining
        
        # Determinar status
        if goal.is_completed:
            status = 'completed'
        elif not goal.deadline:
            status = 'in_progress'
        elif days_remaining is not None and days_remaining <= 0:
            status = 'overdue'
        elif days_remaining is not None and days_remaining <= 30 and (goal.current_amount / goal.target_amount) < 0.75:
            status = 'at_risk'
        else:
            status = 'on_track'
        
        # Adicionar dados da meta
        goals_data.append({
            'goal': goal.to_dict(),
            'progress': {
                'percentage': min(100, (goal.current_amount / goal.target_amount * 100)) if goal.target_amount > 0 else 0,
                'current_amount': goal.current_amount,
                'remaining_amount': max(0, goal.target_amount - goal.current_amount),
                'days_remaining': days_remaining,
                'daily_amount_needed': daily_amount_needed,
                'status': status
            }
        })
    
    # Separar metas por status
    completed_goals = [g for g in goals_data if g['progress']['status'] == 'completed']
    active_goals = [g for g in goals_data if g['progress']['status'] != 'completed']
    at_risk_goals = [g for g in goals_data if g['progress']['status'] == 'at_risk' or g['progress']['status'] == 'overdue']
    
    # Calcular estatísticas
    total_saved = sum(g['goal']['current_amount'] for g in goals_data)
    total_target = sum(g['goal']['target_amount'] for g in goals_data)
    overall_progress = min(100, (total_saved / total_target * 100)) if total_target > 0 else 0
    completion_rate = len(completed_goals) / len(goals) * 100 if goals else 0
    
    # Construir resposta
    return {
        'summary': {
            'total_goals': len(goals),
            'completed_goals': len(completed_goals),
            'active_goals': len(active_goals),
            'at_risk_goals': len(at_risk_goals),
            'total_saved': total_saved,
            'total_target': total_target,
            'overall_progress': overall_progress,
            'completion_rate': completion_rate
        },
        'goals': goals_data,
        'generated_at': datetime.utcnow().isoformat()
    }

def generate_cash_flow_forecast(user_id, months=6):
    """
    Gera uma previsão de fluxo de caixa com base em transações recorrentes
    
    Args:
        user_id (int): ID do usuário
        months (int): Número de meses para previsão
    
    Returns:
        dict: Dados do relatório
    """
    # Data atual para início da previsão
    today = datetime.now().date()
    start_date = datetime(today.year, today.month, 1).date()
    
    # Buscar transações recorrentes
    recurring_transactions = Transaction.query.filter(
        and_(
            Transaction.user_id == user_id,
            Transaction.is_recurring == True
        )
    ).all()
    
    # Previsão mensal
    forecast = []
    
    for i in range(months):
        # Calcular mês da previsão
        forecast_month = start_date.month + i
        forecast_year = start_date.year + (forecast_month - 1) // 12
        forecast_month = ((forecast_month - 1) % 12) + 1
        
        month_start = datetime(forecast_year, forecast_month, 1).date()
        
        # Calcular último dia do mês
        if forecast_month == 12:
            next_month = datetime(forecast_year + 1, 1, 1).date()
        else:
            next_month = datetime(forecast_year, forecast_month + 1, 1).date()
        
        month_end = next_month - timedelta(days=1)
        
        # Projetar transações recorrentes para este mês
        income = 0
        expense = 0
        recurring_items = []
        
        for transaction in recurring_transactions:
            # Aqui precisaríamos de uma lógica mais complexa para padrões de recorrência,
            # mas para simplificar vamos assumir que todas as transações recorrentes acontecem mensalmente
            recurring_items.append({
                'description': transaction.description,
                'type': transaction.type,
                'amount': transaction.amount,
                'category_id': transaction.category_id,
                'date': f"{forecast_year}-{forecast_month:02d}-15"  # Assumindo dia 15 do mês
            })
            
            if transaction.type == 'income':
                income += transaction.amount
            else:
                expense += transaction.amount
        
        # Adicionar ao forecast
        forecast.append({
            'year': forecast_year,
            'month': forecast_month,
            'month_name': format_date(month_start, '%b %Y'),
            'projected_income': income,
            'projected_expense': expense,
            'projected_balance': income - expense,
            'recurring_items': recurring_items
        })
    
    # Calcular totais
    total_projected_income = sum(month['projected_income'] for month in forecast)
    total_projected_expense = sum(month['projected_expense'] for month in forecast)
    total_projected_balance = total_projected_income - total_projected_expense
    
    # Construir resposta
    return {
        'period': {
            'start_date': format_date(start_date),
            'months': months
        },
        'summary': {
            'total_projected_income': total_projected_income,
            'total_projected_expense': total_projected_expense,
            'total_projected_balance': total_projected_balance,
            'recurring_transactions_count': len(recurring_transactions)
        },
        'forecast': forecast,
        'generated_at': datetime.utcnow().isoformat()
    }
