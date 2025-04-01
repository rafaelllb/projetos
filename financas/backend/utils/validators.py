# /backend/utils/validators.py
# Funções de validação de dados

import re
from email_validator import validate_email, EmailNotValidError
from dateutil.parser import parse as parse_date
import bleach

def validate_required_fields(data, required_fields):
    """
    Valida a presença de campos obrigatórios
    
    Args:
        data (dict): Dados a serem validados
        required_fields (list): Lista de campos obrigatórios
    
    Returns:
        tuple: (valid, errors)
    """
    errors = {}
    
    for field in required_fields:
        if field not in data or data[field] is None or (isinstance(data[field], str) and data[field].strip() == ""):
            errors[field] = f"O campo {field} é obrigatório."
    
    return len(errors) == 0, errors

def validate_email_format(email):
    """
    Valida o formato do email
    
    Args:
        email (str): Email a ser validado
    
    Returns:
        tuple: (valid, error_message)
    """
    try:
        validation = validate_email(email)
        # Normalizar o email
        normalized_email = validation.email
        return True, normalized_email
    except EmailNotValidError as e:
        return False, str(e)

def validate_password_strength(password):
    """
    Valida a força da senha
    
    Args:
        password (str): Senha a ser validada
    
    Returns:
        tuple: (valid, error_message)
    """
    if len(password) < 8:
        return False, "A senha deve ter pelo menos 8 caracteres."
    
    # Verificar critérios de complexidade
    has_upper = bool(re.search(r'[A-Z]', password))
    has_lower = bool(re.search(r'[a-z]', password))
    has_digit = bool(re.search(r'\d', password))
    has_special = bool(re.search(r'[!@#$%^&*(),.?":{}|<>]', password))
    
    if not (has_upper and has_lower and has_digit and has_special):
        return False, "A senha deve conter letras maiúsculas, minúsculas, números e caracteres especiais."
    
    return True, ""

def validate_date_format(date_string):
    """
    Valida se a string é uma data válida
    
    Args:
        date_string (str): String com data
    
    Returns:
        tuple: (valid, parsed_date or error_message)
    """
    try:
        parsed_date = parse_date(date_string)
        return True, parsed_date
    except (ValueError, TypeError):
        return False, "Formato de data inválido."

def validate_number(value, min_value=None, max_value=None):
    """
    Valida se o valor é um número e está dentro do intervalo especificado
    
    Args:
        value: Valor a ser validado
        min_value: Valor mínimo permitido
        max_value: Valor máximo permitido
    
    Returns:
        tuple: (valid, parsed_value or error_message)
    """
    try:
        # Converter para float
        num_value = float(value)
        
        # Validar intervalo
        if min_value is not None and num_value < min_value:
            return False, f"O valor deve ser maior ou igual a {min_value}."
        
        if max_value is not None and num_value > max_value:
            return False, f"O valor deve ser menor ou igual a {max_value}."
        
        return True, num_value
    except (ValueError, TypeError):
        return False, "Valor numérico inválido."

def validate_text_length(text, min_length=None, max_length=None):
    """
    Valida o comprimento de um texto
    
    Args:
        text (str): Texto a ser validado
        min_length: Comprimento mínimo
        max_length: Comprimento máximo
    
    Returns:
        tuple: (valid, error_message)
    """
    if not isinstance(text, str):
        return False, "O valor deve ser um texto."
    
    if min_length is not None and len(text) < min_length:
        return False, f"O texto deve ter pelo menos {min_length} caracteres."
    
    if max_length is not None and len(text) > max_length:
        return False, f"O texto deve ter no máximo {max_length} caracteres."
    
    return True, ""

def sanitize_html(html_content, allowed_tags=None):
    """
    Sanitiza HTML para permitir apenas tags seguras
    
    Args:
        html_content (str): Conteúdo HTML
        allowed_tags (list): Lista de tags permitidas
    
    Returns:
        str: HTML sanitizado
    """
    if allowed_tags is None:
        allowed_tags = ['b', 'i', 'u', 'p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']
    
    return bleach.clean(html_content, tags=allowed_tags, strip=True)

def validate_registration_data(data):
    """
    Valida dados de registro de usuário
    
    Args:
        data (dict): Dados de registro
    
    Returns:
        dict: Resultado da validação {valid: bool, errors: dict}
    """
    errors = {}
    
    # Validar campos obrigatórios
    required, req_errors = validate_required_fields(data, ['name', 'email', 'password'])
    if not required:
        errors.update(req_errors)
    
    # Validar nome
    if 'name' in data and data['name']:
        name_valid, name_error = validate_text_length(data['name'], min_length=2, max_length=100)
        if not name_valid:
            errors['name'] = name_error
    
    # Validar email
    if 'email' in data and data['email']:
        email_valid, email_result = validate_email_format(data['email'])
        if not email_valid:
            errors['email'] = email_result
    
    # Validar senha
    if 'password' in data and data['password']:
        password_valid, password_error = validate_password_strength(data['password'])
        if not password_valid:
            errors['password'] = password_error
    
    return {
        'valid': len(errors) == 0,
        'errors': errors
    }

def validate_transaction_data(data):
    """
    Valida dados de transação financeira
    
    Args:
        data (dict): Dados da transação
    
    Returns:
        dict: Resultado da validação {valid: bool, errors: dict}
    """
    errors = {}
    
    # Validar campos obrigatórios
    required, req_errors = validate_required_fields(
        data, ['type', 'description', 'amount', 'category', 'date'])
    if not required:
        errors.update(req_errors)
    
    # Validar tipo
    if 'type' in data and data['type']:
        if data['type'] not in ['income', 'expense']:
            errors['type'] = "O tipo deve ser 'income' ou 'expense'."
    
    # Validar descrição
    if 'description' in data and data['description']:
        desc_valid, desc_error = validate_text_length(
            data['description'], min_length=3, max_length=200)
        if not desc_valid:
            errors['description'] = desc_error
    
    # Validar valor
    if 'amount' in data and data['amount']:
        amount_valid, amount_result = validate_number(data['amount'], min_value=0.01)
        if not amount_valid:
            errors['amount'] = amount_result
    
    # Validar data
    if 'date' in data and data['date']:
        date_valid, date_result = validate_date_format(data['date'])
        if not date_valid:
            errors['date'] = date_result
    
    return {
        'valid': len(errors) == 0,
        'errors': errors
    }

def validate_budget_data(data):
    """
    Valida dados de orçamento
    
    Args:
        data (dict): Dados do orçamento
    
    Returns:
        dict: Resultado da validação {valid: bool, errors: dict}
    """
    errors = {}
    
    # Validar campos obrigatórios
    required, req_errors = validate_required_fields(
        data, ['name', 'amount', 'startDate', 'endDate'])
    if not required:
        errors.update(req_errors)
    
    # Validar nome
    if 'name' in data and data['name']:
        name_valid, name_error = validate_text_length(
            data['name'], min_length=3, max_length=100)
        if not name_valid:
            errors['name'] = name_error
    
    # Validar valor
    if 'amount' in data and data['amount']:
        amount_valid, amount_result = validate_number(data['amount'], min_value=0.01)
        if not amount_valid:
            errors['amount'] = amount_result
    
    # Validar datas
    if 'startDate' in data and data['startDate']:
        start_valid, start_result = validate_date_format(data['startDate'])
        if not start_valid:
            errors['startDate'] = start_result
    
    if 'endDate' in data and data['endDate']:
        end_valid, end_result = validate_date_format(data['endDate'])
        if not end_valid:
            errors['endDate'] = end_result
    
    # Verificar se data final é posterior à inicial
    if ('startDate' in data and 'endDate' in data and 
            'startDate' not in errors and 'endDate' not in errors):
        start_date = parse_date(data['startDate'])
        end_date = parse_date(data['endDate'])
        
        if end_date < start_date:
            errors['endDate'] = "A data final deve ser posterior à data inicial."
    
    return {
        'valid': len(errors) == 0,
        'errors': errors
    }

def validate_goal_data(data):
    """
    Valida dados de meta financeira
    
    Args:
        data (dict): Dados da meta
    
    Returns:
        dict: Resultado da validação {valid: bool, errors: dict}
    """
    errors = {}
    
    # Validar campos obrigatórios
    required, req_errors = validate_required_fields(
        data, ['name', 'targetAmount'])
    if not required:
        errors.update(req_errors)
    
    # Validar nome
    if 'name' in data and data['name']:
        name_valid, name_error = validate_text_length(
            data['name'], min_length=3, max_length=100)
        if not name_valid:
            errors['name'] = name_error
    
    # Validar valor alvo
    if 'targetAmount' in data and data['targetAmount']:
        target_valid, target_result = validate_number(data['targetAmount'], min_value=0.01)
        if not target_valid:
            errors['targetAmount'] = target_result
    
    # Validar valor atual (se fornecido)
    if 'currentAmount' in data and data['currentAmount']:
        current_valid, current_result = validate_number(data['currentAmount'], min_value=0)
        if not current_valid:
            errors['currentAmount'] = current_result
    
    # Validar data limite (se fornecida)
    if 'deadline' in data and data['deadline']:
        deadline_valid, deadline_result = validate_date_format(data['deadline'])
        if not deadline_valid:
            errors['deadline'] = deadline_result
    
    return {
        'valid': len(errors) == 0,
        'errors': errors
    }
