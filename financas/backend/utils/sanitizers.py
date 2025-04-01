# /backend/utils/sanitizers.py
# Funções de sanitização de dados

import bleach
import re
import json
from datetime import datetime

def sanitize_text(text, max_length=None):
    """
    Sanitiza texto removendo HTML e limitando comprimento
    
    Args:
        text (str): Texto a ser sanitizado
        max_length (int, optional): Comprimento máximo
    
    Returns:
        str: Texto sanitizado
    """
    if not isinstance(text, str):
        return ""
    
    # Remover tags HTML
    clean_text = bleach.clean(text, tags=[], strip=True)
    
    # Limitar comprimento se especificado
    if max_length and len(clean_text) > max_length:
        clean_text = clean_text[:max_length]
    
    return clean_text.strip()

def sanitize_html(html, allowed_tags=None, allowed_attrs=None):
    """
    Sanitiza HTML permitindo apenas tags e atributos específicos
    
    Args:
        html (str): HTML a ser sanitizado
        allowed_tags (list): Lista de tags permitidas
        allowed_attrs (dict): Dicionário de atributos permitidos por tag
    
    Returns:
        str: HTML sanitizado
    """
    if not isinstance(html, str):
        return ""
    
    # Tags padrão permitidas
    if allowed_tags is None:
        allowed_tags = ['b', 'i', 'u', 'p', 'br', 'a', 'ul', 'ol', 'li', 'span']
    
    # Atributos padrão permitidos
    if allowed_attrs is None:
        allowed_attrs = {
            'a': ['href', 'title'],
            'span': ['class'],
            '*': ['class']
        }
    
    return bleach.clean(html, tags=allowed_tags, attributes=allowed_attrs, strip=True)

def sanitize_email(email):
    """
    Sanitiza endereço de email
    
    Args:
        email (str): Email a ser sanitizado
    
    Returns:
        str: Email sanitizado
    """
    if not isinstance(email, str):
        return ""
    
    # Converter para minúsculas e remover espaços
    return email.lower().strip()

def sanitize_number(value, default=0):
    """
    Sanitiza valor numérico
    
    Args:
        value: Valor a sanitizar
        default: Valor padrão se inválido
    
    Returns:
        float: Valor numérico sanitizado
    """
    try:
        # Converter strings para números
        if isinstance(value, str):
            # Remover caracteres não numéricos, exceto ponto e vírgula
            value = re.sub(r'[^\d.,\-]', '', value)
            # Substituir vírgula por ponto
            value = value.replace(',', '.')
        
        # Converter para float
        return float(value)
    except (ValueError, TypeError):
        return default

def sanitize_date(date_string, default=None):
    """
    Sanitiza string de data
    
    Args:
        date_string: String com data
        default: Valor padrão se inválido
    
    Returns:
        str: Data em formato ISO (YYYY-MM-DD)
    """
    if not date_string:
        if default:
            return default
        return datetime.now().strftime('%Y-%m-%d')
    
    try:
        # Tentar converter para objeto datetime
        if isinstance(date_string, str):
            formats = ['%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%Y/%m/%d']
            
            for fmt in formats:
                try:
                    date_obj = datetime.strptime(date_string, fmt)
                    return date_obj.strftime('%Y-%m-%d')
                except ValueError:
                    continue
            
            # Se nenhum formato funcionar, tentar parse genérico
            date_obj = datetime.fromisoformat(date_string.replace('Z', '+00:00'))
            return date_obj.strftime('%Y-%m-%d')
        elif isinstance(date_string, datetime):
            return date_string.strftime('%Y-%m-%d')
        else:
            return default or datetime.now().strftime('%Y-%m-%d')
    except (ValueError, TypeError):
        return default or datetime.now().strftime('%Y-%m-%d')

def sanitize_boolean(value, default=False):
    """
    Sanitiza valor booleano
    
    Args:
        value: Valor a sanitizar
        default: Valor padrão se inválido
    
    Returns:
        bool: Valor booleano sanitizado
    """
    if isinstance(value, bool):
        return value
    
    if isinstance(value, str):
        value = value.lower().strip()
        if value in ('true', 'yes', 'sim', '1', 'on'):
            return True
        if value in ('false', 'no', 'não', 'nao', '0', 'off'):
            return False
    
    if isinstance(value, (int, float)):
        return bool(value)
    
    return default

def sanitize_json(json_string, default=None):
    """
    Sanitiza string JSON
    
    Args:
        json_string: String JSON a sanitizar
        default: Valor padrão se inválido
    
    Returns:
        dict: Objeto JSON sanitizado
    """
    if not default:
        default = {}
    
    if isinstance(json_string, dict):
        return json_string
    
    try:
        if isinstance(json_string, str):
            return json.loads(json_string)
        return default
    except (ValueError, TypeError):
        return default

def sanitize_user_data(data):
    """
    Sanitiza dados de usuário
    
    Args:
        data (dict): Dados do usuário
    
    Returns:
        dict: Dados sanitizados
    """
    sanitized = {}
    
    if 'name' in data:
        sanitized['name'] = sanitize_text(data['name'], max_length=100)
    
    if 'email' in data:
        sanitized['email'] = sanitize_email(data['email'])
    
    if 'password' in data:
        # Não sanitizamos a senha para não perder caracteres especiais
        # mas garantimos que é uma string
        sanitized['password'] = str(data['password']) if data['password'] else ""
    
    return sanitized

def sanitize_transaction_data(data):
    """
    Sanitiza dados de transação
    
    Args:
        data (dict): Dados da transação
    
    Returns:
        dict: Dados sanitizados
    """
    sanitized = {}
    
    if 'type' in data:
        # Garantir que o tipo é 'income' ou 'expense'
        type_value = str(data['type']).lower()
        sanitized['type'] = type_value if type_value in ('income', 'expense') else 'expense'
    
    if 'description' in data:
        sanitized['description'] = sanitize_text(data['description'], max_length=200)
    
    if 'amount' in data:
        sanitized['amount'] = sanitize_number(data['amount'], default=0)
    
    if 'category' in data:
        sanitized['category'] = sanitize_text(data['category'], max_length=50)
    
    if 'date' in data:
        sanitized['date'] = sanitize_date(data['date'])
    
    if 'notes' in data:
        sanitized['notes'] = sanitize_text(data['notes'], max_length=500)
    
    return sanitized

def sanitize_budget_data(data):
    """
    Sanitiza dados de orçamento
    
    Args:
        data (dict): Dados do orçamento
    
    Returns:
        dict: Dados sanitizados
    """
    sanitized = {}
    
    if 'name' in data:
        sanitized['name'] = sanitize_text(data['name'], max_length=100)
    
    if 'amount' in data:
        sanitized['amount'] = sanitize_number(data['amount'], default=0)
    
    if 'categoryId' in data:
        sanitized['categoryId'] = sanitize_text(data['categoryId'], max_length=50)
    
    if 'startDate' in data:
        sanitized['startDate'] = sanitize_date(data['startDate'])
    
    if 'endDate' in data:
        sanitized['endDate'] = sanitize_date(data['endDate'])
    
    if 'description' in data:
        sanitized['description'] = sanitize_text(data['description'], max_length=500)
    
    if 'isActive' in data:
        sanitized['isActive'] = sanitize_boolean(data['isActive'], default=True)
    
    return sanitized

def sanitize_goal_data(data):
    """
    Sanitiza dados de meta financeira
    
    Args:
        data (dict): Dados da meta
    
    Returns:
        dict: Dados sanitizados
    """
    sanitized = {}
    
    if 'name' in data:
        sanitized['name'] = sanitize_text(data['name'], max_length=100)
    
    if 'targetAmount' in data:
        sanitized['targetAmount'] = sanitize_number(data['targetAmount'], default=0)
    
    if 'currentAmount' in data:
        sanitized['currentAmount'] = sanitize_number(data['currentAmount'], default=0)
    
    if 'deadline' in data:
        sanitized['deadline'] = sanitize_date(data['deadline'])
    
    if 'description' in data:
        sanitized['description'] = sanitize_text(data['description'], max_length=500)
    
    if 'category' in data:
        sanitized['category'] = sanitize_text(data['category'], max_length=50)
    
    if 'icon' in data:
        sanitized['icon'] = sanitize_text(data['icon'], max_length=30)
    
    if 'isActive' in data:
        sanitized['isActive'] = sanitize_boolean(data['isActive'], default=True)
    
    return sanitized
