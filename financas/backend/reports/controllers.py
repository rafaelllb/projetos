# /backend/reports/controllers.py
# Controladores para gerenciamento de relatórios

from sqlalchemy.exc import IntegrityError
from sqlalchemy import desc
from datetime import datetime, timedelta
from reports.models import Report, ReportSchedule
from reports.generators import (
    generate_summary_report, generate_category_report,
    generate_monthly_report, generate_budget_report,
    generate_goals_report, generate_cash_flow_forecast
)
from database.db import db, commit, rollback
from utils.date_helpers import parse_date, get_date_range

def save_report(user_id, name, type, parameters, data):
    """
    Salva um relatório gerado
    
    Args:
        user_id (int): ID do usuário
        name (str): Nome do relatório
        type (str): Tipo de relatório
        parameters (dict): Parâmetros usados na geração
        data (dict): Dados do relatório
    
    Returns:
        Report: Instância do relatório salvo ou None se falhar
    """
    try:
        report = Report(
            name=name,
            type=type,
            user_id=user_id,
            parameters=parameters,
            data=data,
            generated_at=datetime.utcnow()
        )
        
        db.session.add(report)
        commit()
        
        return report
    except IntegrityError:
        rollback()
        return None
    except Exception as e:
        rollback()
        raise e

def get_user_reports(user_id, limit=10):
    """
    Recupera relatórios salvos de um usuário
    
    Args:
        user_id (int): ID do usuário
        limit (int): Limite de relatórios a retornar
    
    Returns:
        list: Lista de relatórios
    """
    return Report.query.filter_by(user_id=user_id).order_by(desc(Report.generated_at)).limit(limit).all()

def get_report(report_id, user_id=None):
    """
    Recupera um relatório pelo ID
    
    Args:
        report_id (int): ID do relatório
        user_id (int, optional): ID do usuário para verificação de acesso
    
    Returns:
        Report: Instância do relatório ou None se não encontrado ou sem acesso
    """
    query = Report.query.filter_by(id=report_id)
    
    # Se user_id fornecido, verificar se o relatório pertence ao usuário
    if user_id:
        query = query.filter_by(user_id=user_id)
    
    return query.first()

def delete_report(report_id, user_id):
    """
    Remove um relatório
    
    Args:
        report_id (int): ID do relatório
        user_id (int): ID do usuário
    
    Returns:
        bool: True se removido com sucesso, False caso contrário
    """
    try:
        # Buscar relatório do usuário
        report = Report.query.filter_by(id=report_id, user_id=user_id).first()
        
        if not report:
            return False
        
        db.session.delete(report)
        commit()
        
        return True
    except Exception:
        rollback()
        return False

def create_report_schedule(user_id, schedule_data):
    """
    Cria um novo agendamento de relatório
    
    Args:
        user_id (int): ID do usuário
        schedule_data (dict): Dados do agendamento
    
    Returns:
        ReportSchedule: Instância do agendamento criado ou None se falhar
    """
    try:
        # Calcular próxima execução
        next_run = calculate_next_run(schedule_data['frequency'])
        
        schedule = ReportSchedule(
            name=schedule_data['name'],
            report_type=schedule_data['report_type'],
            frequency=schedule_data['frequency'],
            delivery_method=schedule_data['delivery_method'],
            user_id=user_id,
            parameters=schedule_data.get('parameters'),
            email=schedule_data.get('email'),
            next_run=next_run
        )
        
        db.session.add(schedule)
        commit()
        
        return schedule
    except IntegrityError:
        rollback()
        return None
    except Exception as e:
        rollback()
        raise e

def get_user_report_schedules(user_id):
    """
    Recupera agendamentos de relatórios de um usuário
    
    Args:
        user_id (int): ID do usuário
    
    Returns:
        list: Lista de agendamentos
    """
    return ReportSchedule.query.filter_by(user_id=user_id, is_active=True).all()

def update_report_schedule(schedule_id, user_id, updated_data):
    """
    Atualiza um agendamento de relatório existente
    
    Args:
        schedule_id (int): ID do agendamento
        user_id (int): ID do usuário
        updated_data (dict): Novos dados do agendamento
    
    Returns:
        ReportSchedule: Instância do agendamento atualizado ou None se falhar
    """
    try:
        # Buscar agendamento do usuário
        schedule = ReportSchedule.query.filter_by(id=schedule_id, user_id=user_id).first()
        
        if not schedule:
            return None
        
        # Atualizar campos básicos
        if 'name' in updated_data:
            schedule.name = updated_data['name']
        
        if 'report_type' in updated_data:
            schedule.report_type = updated_data['report_type']
        
        if 'frequency' in updated_data:
            schedule.frequency = updated_data['frequency']
            # Recalcular próxima execução se frequência mudar
            schedule.next_run = calculate_next_run(schedule.frequency)
        
        if 'delivery_method' in updated_data:
            schedule.delivery_method = updated_data['delivery_method']
        
        if 'email' in updated_data:
            schedule.email = updated_data['email']
        
        if 'parameters' in updated_data:
            schedule.parameters = updated_data['parameters']
        
        if 'is_active' in updated_data:
            schedule.is_active = updated_data['is_active']
        
        commit()
        return schedule
    except IntegrityError:
        rollback()
        return None
    except Exception as e:
        rollback()
        raise e

def delete_report_schedule(schedule_id, user_id):
    """
    Remove um agendamento de relatório
    
    Args:
        schedule_id (int): ID do agendamento
        user_id (int): ID do usuário
    
    Returns:
        bool: True se removido com sucesso, False caso contrário
    """
    try:
        # Buscar agendamento do usuário
        schedule = ReportSchedule.query.filter_by(id=schedule_id, user_id=user_id).first()
        
        if not schedule:
            return False
        
        db.session.delete(schedule)
        commit()
        
        return True
    except Exception:
        rollback()
        return False

def generate_report(user_id, report_type, parameters=None):
    """
    Gera um relatório conforme o tipo solicitado
    
    Args:
        user_id (int): ID do usuário
        report_type (str): Tipo de relatório
        parameters (dict): Parâmetros para geração
    
    Returns:
        dict: Dados do relatório
    """
    if parameters is None:
        parameters = {}
    
    # Processar parâmetros de data
    if 'period' in parameters:
        period = parameters['period']
        start_date, end_date = get_date_range(period)
        parameters['start_date'] = start_date
        parameters['end_date'] = end_date
    
    # Gerar relatório de acordo com o tipo
    if report_type == 'summary':
        return generate_summary_report(
            user_id, 
            parameters.get('start_date'), 
            parameters.get('end_date')
        )
    
    elif report_type == 'category':
        return generate_category_report(
            user_id, 
            parameters.get('start_date'), 
            parameters.get('end_date'),
            parameters.get('category_type', 'expense')
        )
    
    elif report_type == 'monthly':
        return generate_monthly_report(
            user_id,
            parameters.get('start_month'),
            parameters.get('months_count', 12)
        )
    
    elif report_type == 'budget':
        return generate_budget_report(
            user_id,
            parameters.get('start_date'),
            parameters.get('end_date')
        )
    
    elif report_type == 'goals':
        return generate_goals_report(user_id)
    
    elif report_type == 'cash_flow_forecast':
        return generate_cash_flow_forecast(
            user_id,
            parameters.get('months', 6)
        )
    
    else:
        return {'error': f'Unknown report type: {report_type}'}

def calculate_next_run(frequency):
    """
    Calcula a próxima data de execução com base na frequência
    
    Args:
        frequency (str): Frequência ('daily', 'weekly', 'monthly')
    
    Returns:
        datetime: Próxima data de execução
    """
    now = datetime.utcnow()
    
    if frequency == 'daily':
        # Próximo dia, mesma hora
        return now + timedelta(days=1)
    
    elif frequency == 'weekly':
        # Próxima semana, mesmo dia da semana e hora
        return now + timedelta(days=7)
    
    elif frequency == 'monthly':
        # Próximo mês, mesmo dia do mês e hora
        month = now.month % 12 + 1
        year = now.year + (now.month // 12)
        day = min(now.day, 28)  # Evitar problemas com fevereiro
        
        return datetime(year, month, day, now.hour, now.minute, now.second)
    
    else:
        # Padrão: próxima semana
        return now + timedelta(days=7)
