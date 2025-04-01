# /backend/utils/date_helpers.py
# Utilitários para manipulação de datas

from datetime import datetime, timedelta, date
import calendar
from dateutil.relativedelta import relativedelta
import pytz

def get_current_date():
    """
    Retorna a data atual em UTC
    
    Returns:
        datetime: Data atual
    """
    return datetime.now(pytz.UTC)

def format_date(date_obj, format_str="%Y-%m-%d"):
    """
    Formata um objeto de data
    
    Args:
        date_obj (datetime): Objeto de data
        format_str (str): String de formato
    
    Returns:
        str: Data formatada
    """
    if not date_obj:
        return None
    
    if isinstance(date_obj, str):
        try:
            date_obj = datetime.fromisoformat(date_obj.replace('Z', '+00:00'))
        except ValueError:
            return None
    
    return date_obj.strftime(format_str)

def parse_date(date_str, formats=None):
    """
    Converte string em objeto de data
    
    Args:
        date_str (str): String com data
        formats (list): Lista de formatos a tentar
    
    Returns:
        datetime: Objeto de data ou None se inválido
    """
    if not date_str:
        return None
    
    if formats is None:
        formats = ["%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"]
    
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    
    # Tentar formato ISO
    try:
        return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
    except ValueError:
        return None

def get_date_range(period, reference_date=None):
    """
    Retorna o intervalo de datas baseado no período
    
    Args:
        period (str): Período ('day', 'week', 'month', 'quarter', 'year', 'all')
        reference_date (datetime): Data de referência
    
    Returns:
        tuple: (data_inicial, data_final)
    """
    if reference_date is None:
        reference_date = get_current_date()
    
    # Converter para data simples (sem hora)
    if isinstance(reference_date, datetime):
        ref_date = reference_date.date()
    else:
        ref_date = reference_date
    
    if period == 'day':
        return ref_date, ref_date
    
    elif period == 'week':
        # Semana começando na segunda-feira
        weekday = ref_date.weekday()
        start_date = ref_date - timedelta(days=weekday)
        end_date = start_date + timedelta(days=6)
        return start_date, end_date
    
    elif period == 'month':
        # Primeiro e último dia do mês
        first_day = date(ref_date.year, ref_date.month, 1)
        last_day = date(ref_date.year, ref_date.month, 
                        calendar.monthrange(ref_date.year, ref_date.month)[1])
        return first_day, last_day
    
    elif period == 'quarter':
        # Calcular trimestre
        quarter = (ref_date.month - 1) // 3
        first_month = quarter * 3 + 1
        last_month = first_month + 2
        
        first_day = date(ref_date.year, first_month, 1)
        last_day = date(ref_date.year, last_month, 
                        calendar.monthrange(ref_date.year, last_month)[1])
        return first_day, last_day
    
    elif period == 'year':
        # Ano completo
        first_day = date(ref_date.year, 1, 1)
        last_day = date(ref_date.year, 12, 31)
        return first_day, last_day
    
    elif period == 'all':
        # Período completo (10 anos atrás até hoje)
        start_date = ref_date - relativedelta(years=10)
        return start_date, ref_date
    
    else:
        # Padrão: mês atual
        first_day = date(ref_date.year, ref_date.month, 1)
        last_day = date(ref_date.year, ref_date.month, 
                        calendar.monthrange(ref_date.year, ref_date.month)[1])
        return first_day, last_day

def add_days(date_obj, days):
    """
    Adiciona dias a uma data
    
    Args:
        date_obj (datetime): Objeto de data
        days (int): Número de dias
    
    Returns:
        datetime: Nova data
    """
    return date_obj + timedelta(days=days)

def add_months(date_obj, months):
    """
    Adiciona meses a uma data
    
    Args:
        date_obj (datetime): Objeto de data
        months (int): Número de meses
    
    Returns:
        datetime: Nova data
    """
    return date_obj + relativedelta(months=months)

def add_years(date_obj, years):
    """
    Adiciona anos a uma data
    
    Args:
        date_obj (datetime): Objeto de data
        years (int): Número de anos
    
    Returns:
        datetime: Nova data
    """
    return date_obj + relativedelta(years=years)

def diff_in_days(date1, date2):
    """
    Calcula a diferença em dias entre duas datas
    
    Args:
        date1 (datetime): Primeira data
        date2 (datetime): Segunda data
    
    Returns:
        int: Diferença em dias
    """
    # Converter para date se for datetime
    if isinstance(date1, datetime):
        date1 = date1.date()
    if isinstance(date2, datetime):
        date2 = date2.date()
    
    return abs((date2 - date1).days)

def diff_in_months(date1, date2):
    """
    Calcula a diferença em meses entre duas datas
    
    Args:
        date1 (datetime): Primeira data
        date2 (datetime): Segunda data
    
    Returns:
        int: Diferença em meses
    """
    # Converter para date se for datetime
    if isinstance(date1, datetime):
        date1 = date1.date()
    if isinstance(date2, datetime):
        date2 = date2.date()
    
    # Garantir que date1 <= date2
    if date1 > date2:
        date1, date2 = date2, date1
    
    return (date2.year - date1.year) * 12 + date2.month - date1.month

def diff_in_years(date1, date2):
    """
    Calcula a diferença em anos entre duas datas
    
    Args:
        date1 (datetime): Primeira data
        date2 (datetime): Segunda data
    
    Returns:
        int: Diferença em anos
    """
    # Converter para date se for datetime
    if isinstance(date1, datetime):
        date1 = date1.date()
    if isinstance(date2, datetime):
        date2 = date2.date()
    
    # Usar relativedelta para cálculo preciso
    rd = relativedelta(date2, date1)
    return abs(rd.years)

def is_between(date_obj, start_date, end_date):
    """
    Verifica se uma data está entre duas outras
    
    Args:
        date_obj (datetime): Data a verificar
        start_date (datetime): Data de início
        end_date (datetime): Data de fim
    
    Returns:
        bool: Se a data está no intervalo
    """
    # Converter para date se for datetime
    if isinstance(date_obj, datetime):
        date_obj = date_obj.date()
    if isinstance(start_date, datetime):
        start_date = start_date.date()
    if isinstance(end_date, datetime):
        end_date = end_date.date()
    
    return start_date <= date_obj <= end_date

def get_month_name(month_number, short=False, locale='pt_BR'):
    """
    Retorna o nome do mês
    
    Args:
        month_number (int): Número do mês (1-12)
        short (bool): Se deve retornar nome abreviado
        locale (str): Localidade para formatação
    
    Returns:
        str: Nome do mês
    """
    # Criar data para o mês
    d = date(2000, month_number, 1)
    
    if locale == 'pt_BR':
        months_long = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ]
        months_short = [
            'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
            'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
        ]
        
        return months_short[month_number - 1] if short else months_long[month_number - 1]
    else:
        # Usar formatação de data padrão para outros locales
        format_str = '%b' if short else '%B'
        return d.strftime(format_str)

def get_weekday_name(weekday, short=False, locale='pt_BR'):
    """
    Retorna o nome do dia da semana
    
    Args:
        weekday (int): Dia da semana (0-6, com 0=segunda)
        short (bool): Se deve retornar nome abreviado
        locale (str): Localidade para formatação
    
    Returns:
        str: Nome do dia da semana
    """
    # Ajustar para começar em segunda = 0
    python_weekday = weekday if weekday < 7 else 0
    
    # Criar data para um dia da semana conhecido
    d = date(2023, 1, 2)  # 2023-01-02 foi uma segunda-feira
    d = d + timedelta(days=python_weekday)
    
    if locale == 'pt_BR':
        weekdays_long = [
            'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira',
            'Sexta-feira', 'Sábado', 'Domingo'
        ]
        weekdays_short = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
        
        return weekdays_short[python_weekday] if short else weekdays_long[python_weekday]
    else:
        # Usar formatação de data padrão para outros locales
        format_str = '%a' if short else '%A'
        return d.strftime(format_str)

def get_last_day_of_month(year, month):
    """
    Retorna o último dia do mês
    
    Args:
        year (int): Ano
        month (int): Mês
    
    Returns:
        int: Último dia do mês
    """
    return calendar.monthrange(year, month)[1]

def get_days_in_month(year, month):
    """
    Retorna o número de dias em um mês
    
    Args:
        year (int): Ano
        month (int): Mês
    
    Returns:
        int: Número de dias
    """
    return calendar.monthrange(year, month)[1]

def get_first_day_of_year(year):
    """
    Retorna o primeiro dia do ano
    
    Args:
        year (int): Ano
    
    Returns:
        date: Primeiro dia do ano
    """
    return date(year, 1, 1)

def get_last_day_of_year(year):
    """
    Retorna o último dia do ano
    
    Args:
        year (int): Ano
    
    Returns:
        date: Último dia do ano
    """
    return date(year, 12, 31)
