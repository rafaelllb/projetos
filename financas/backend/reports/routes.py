# /backend/reports/routes.py
# Rotas para gerenciamento de relatórios

from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
import pandas as pd
import io
import json
from reports.controllers import (
    generate_report, save_report, get_user_reports, get_report,
    delete_report, create_report_schedule, get_user_report_schedules,
    update_report_schedule, delete_report_schedule
)
from utils.validators import validate_required_fields
from utils.sanitizers import sanitize_text

# Criar blueprint
reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/generate', methods=['POST'])
@jwt_required()
def generate_new_report():
    """
    Gera um novo relatório
    
    Request:
        - type: Tipo de relatório ('summary', 'category', 'monthly', etc.)
        - parameters: Parâmetros para geração (opcional)
        - save: Se deve salvar o relatório (opcional)
        - name: Nome para o relatório salvo (opcional)
    
    Returns:
        - Dados do relatório
    """
    current_user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    # Validar campos obrigatórios
    valid, errors = validate_required_fields(data, ['type'])
    if not valid:
        return jsonify({"error": "Validation error", "details": errors}), 400
    
    # Extrair parâmetros
    report_type = data.get('type')
    parameters = data.get('parameters', {})
    
    # Gerar relatório
    report_data = generate_report(current_user_id, report_type, parameters)
    
    # Verificar se houve erro na geração
    if 'error' in report_data:
        return jsonify({"error": report_data['error']}), 400
    
    # Salvar relatório se solicitado
    if data.get('save') and 'name' in data:
        report_name = sanitize_text(data['name'])
        saved_report = save_report(current_user_id, report_name, report_type, parameters, report_data)
        
        if saved_report:
            report_data['report_id'] = saved_report.id
            report_data['saved'] = True
    
    return jsonify(report_data), 200

@reports_bp.route('/saved', methods=['GET'])
@jwt_required()
def list_saved_reports():
    """
    Lista relatórios salvos
    
    Returns:
        - Lista de relatórios
    """
    current_user_id = get_jwt_identity()
    
    # Limite de relatórios a retornar
    limit = request.args.get('limit', 10, type=int)
    
    reports = get_user_reports(current_user_id, limit)
    
    # Formatar resposta sem incluir dados completos
    return jsonify([
        {
            'id': r.id,
            'name': r.name,
            'type': r.type,
            'parameters': r.parameters,
            'generated_at': r.generated_at.isoformat() if r.generated_at else None
        } for r in reports
    ]), 200

@reports_bp.route('/saved/<int:report_id>', methods=['GET'])
@jwt_required()
def get_saved_report(report_id):
    """
    Recupera um relatório salvo
    
    Parameters:
        - report_id: ID do relatório
    
    Returns:
        - Dados do relatório
    """
    current_user_id = get_jwt_identity()
    
    report = get_report(report_id, current_user_id)
    if not report:
        return jsonify({"error": "Report not found"}), 404
    
    return jsonify({
        'id': report.id,
        'name': report.name,
        'type': report.type,
        'parameters': report.parameters,
        'data': report.data,
        'generated_at': report.generated_at.isoformat() if report.generated_at else None
    }), 200

@reports_bp.route('/saved/<int:report_id>', methods=['DELETE'])
@jwt_required()
def delete_saved_report(report_id):
    """
    Remove um relatório salvo
    
    Parameters:
        - report_id: ID do relatório
    
    Returns:
        - Mensagem de sucesso
    """
    current_user_id = get_jwt_identity()
    
    success = delete_report(report_id, current_user_id)
    
    if not success:
        return jsonify({"error": "Report not found or delete failed"}), 404
    
    return jsonify({"message": "Report deleted successfully"}), 200

@reports_bp.route('/export/<int:report_id>', methods=['GET'])
@jwt_required()
def export_report(report_id):
    """
    Exporta um relatório em formato específico
    
    Parameters:
        - report_id: ID do relatório
    
    Query Parameters:
        - format: Formato de exportação ('csv', 'json', 'excel')
    
    Returns:
        - Arquivo para download
    """
    current_user_id = get_jwt_identity()
    
    # Obter formato de exportação
    export_format = request.args.get('format', 'csv').lower()
    
    # Verificar formato suportado
    if export_format not in ['csv', 'json', 'excel']:
        return jsonify({"error": "Unsupported export format"}), 400
    
    # Buscar relatório
    report = get_report(report_id, current_user_id)
    if not report:
        return jsonify({"error": "Report not found"}), 404
    
    # Preparar dados para exportação
    report_data = report.data
    
    try:
        # Exportar de acordo com o formato
        if export_format == 'json':
            # Criar buffer de memória para JSON
            output = io.StringIO()
            json.dump(report_data, output, indent=2)
            output.seek(0)
            
            return send_file(
                io.BytesIO(output.getvalue().encode('utf-8')),
                mimetype='application/json',
                as_attachment=True,
                download_name=f"{report.name}.json"
            )
        
        elif export_format == 'excel':
            # Converter dados para DataFrame (de acordo com tipo de relatório)
            if report.type == 'summary':
                # Para relatório de resumo, criar múltiplas tabelas
                income_categories = pd.DataFrame(report_data.get('categories', {}).get('income', []))
                expense_categories = pd.DataFrame(report_data.get('categories', {}).get('expense', []))
                
                # Criar arquivo Excel com múltiplas abas
                output = io.BytesIO()
                with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
                    # Informações gerais
                    summary_data = {
                        'Período': [f"{report_data.get('period', {}).get('start_date')} a {report_data.get('period', {}).get('end_date')}"],
                        'Receitas': [report_data.get('summary', {}).get('income', 0)],
                        'Despesas': [report_data.get('summary', {}).get('expense', 0)],
                        'Saldo': [report_data.get('summary', {}).get('balance', 0)],
                        'Taxa de Poupança': [f"{report_data.get('summary', {}).get('savings_rate', 0):.2f}%"]
                    }
                    pd.DataFrame(summary_data).to_excel(writer, sheet_name='Resumo', index=False)
                    
                    # Categorias de receita
                    if not income_categories.empty:
                        income_categories.to_excel(writer, sheet_name='Receitas por Categoria', index=False)
                    
                    # Categorias de despesa
                    if not expense_categories.empty:
                        expense_categories.to_excel(writer, sheet_name='Despesas por Categoria', index=False)
            
            elif report.type == 'monthly':
                # Criar DataFrame com dados mensais
                monthly_data = pd.DataFrame(report_data.get('monthly_data', []))
                
                # Criar arquivo Excel
                output = io.BytesIO()
                with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
                    # Informações gerais
                    summary_data = {
                        'Período': [f"{report_data.get('period', {}).get('start_date')} a {report_data.get('period', {}).get('end_date')}"],
                        'Total de Receitas': [report_data.get('summary', {}).get('total_income', 0)],
                        'Total de Despesas': [report_data.get('summary', {}).get('total_expense', 0)],
                        'Saldo Total': [report_data.get('summary', {}).get('total_balance', 0)]
                    }
                    pd.DataFrame(summary_data).to_excel(writer, sheet_name='Resumo', index=False)
                    
                    # Dados mensais
                    if not monthly_data.empty:
                        monthly_data.to_excel(writer, sheet_name='Dados Mensais', index=False)
            
            else:
                # Para outros tipos, converter estrutura principal
                df = pd.DataFrame([report_data])
                
                # Criar arquivo Excel
                output = io.BytesIO()
                with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
                    df.to_excel(writer, sheet_name='Dados', index=False)
            
            output.seek(0)
            
            return send_file(
                output,
                mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                as_attachment=True,
                download_name=f"{report.name}.xlsx"
            )
        
        else:  # CSV
            # Converter dados para CSV (de acordo com tipo de relatório)
            if report.type == 'summary':
                # Para relatório de resumo, exportar categorias de despesa
                expense_categories = pd.DataFrame(report_data.get('categories', {}).get('expense', []))
                if expense_categories.empty:
                    expense_categories = pd.DataFrame({'category': [], 'amount': []})
                
                csv_data = expense_categories.to_csv(index=False)
            
            elif report.type == 'monthly':
                # Exportar dados mensais
                monthly_data = pd.DataFrame(report_data.get('monthly_data', []))
                if monthly_data.empty:
                    monthly_data = pd.DataFrame({'month': [], 'income': [], 'expense': [], 'balance': []})
                
                csv_data = monthly_data.to_csv(index=False)
            
            else:
                # Para outros tipos, converter estrutura principal para string
                csv_data = "Report Type,Generated At\n"
                csv_data += f"{report.type},{report.generated_at}\n\n"
                csv_data += "Full JSON data not available in CSV format. Please use JSON or Excel export."
            
            return send_file(
                io.BytesIO(csv_data.encode('utf-8')),
                mimetype='text/csv',
                as_attachment=True,
                download_name=f"{report.name}.csv"
            )
    
    except Exception as e:
        return jsonify({"error": f"Export failed: {str(e)}"}), 500

@reports_bp.route('/schedules', methods=['GET'])
@jwt_required()
def list_report_schedules():
    """
    Lista agendamentos de relatórios
    
    Returns:
        - Lista de agendamentos
    """
    current_user_id = get_jwt_identity()
    
    schedules = get_user_report_schedules(current_user_id)
    
    return jsonify([s.to_dict() for s in schedules]), 200

@reports_bp.route('/schedules', methods=['POST'])
@jwt_required()
def add_report_schedule():
    """
    Adiciona um novo agendamento de relatório
    
    Request:
        - name: Nome do agendamento
        - report_type: Tipo de relatório
        - frequency: Frequência ('daily', 'weekly', 'monthly')
        - delivery_method: Método de entrega ('email', 'download')
        - email: Email para envio (obrigatório se delivery_method='email')
        - parameters: Parâmetros para geração (opcional)
    
    Returns:
        - Agendamento criado
    """
    current_user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    # Validar campos obrigatórios
    required_fields = ['name', 'report_type', 'frequency', 'delivery_method']
    valid, errors = validate_required_fields(data, required_fields)
    
    if not valid:
        return jsonify({"error": "Validation error", "details": errors}), 400
    
    # Validar campos específicos
    if data['delivery_method'] == 'email' and ('email' not in data or not data['email']):
        return jsonify({"error": "Email is required for email delivery method"}), 400
    
    if data['frequency'] not in ['daily', 'weekly', 'monthly']:
        return jsonify({"error": "Invalid frequency. Must be 'daily', 'weekly', or 'monthly'"}), 400
    
    # Criar agendamento
    schedule = create_report_schedule(current_user_id, data)
    
    if not schedule:
        return jsonify({"error": "Failed to create report schedule"}), 400
    
    return jsonify(schedule.to_dict()), 201

@reports_bp.route('/schedules/<int:schedule_id>', methods=['PUT'])
@jwt_required()
def update_schedule(schedule_id):
    """
    Atualiza um agendamento de relatório existente
    
    Parameters:
        - schedule_id: ID do agendamento
    
    Request:
        - Campos a serem atualizados
    
    Returns:
        - Agendamento atualizado
    """
    current_user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    # Validar campos específicos
    if 'delivery_method' in data and data['delivery_method'] == 'email' and 'email' in data and not data['email']:
        return jsonify({"error": "Email is required for email delivery method"}), 400
    
    if 'frequency' in data and data['frequency'] not in ['daily', 'weekly', 'monthly']:
        return jsonify({"error": "Invalid frequency. Must be 'daily', 'weekly', or 'monthly'"}), 400
    
    # Atualizar agendamento
    schedule = update_report_schedule(schedule_id, current_user_id, data)
    
    if not schedule:
        return jsonify({"error": "Schedule not found or update failed"}), 404
    
    return jsonify(schedule.to_dict()), 200

@reports_bp.route('/schedules/<int:schedule_id>', methods=['DELETE'])
@jwt_required()
def delete_schedule(schedule_id):
    """
    Remove um agendamento de relatório
    
    Parameters:
        - schedule_id: ID do agendamento
    
    Returns:
        - Mensagem de sucesso
    """
    current_user_id = get_jwt_identity()
    
    success = delete_report_schedule(schedule_id, current_user_id)
    
    if not success:
        return jsonify({"error": "Schedule not found or delete failed"}), 404
    
    return jsonify({"message": "Schedule deleted successfully"}), 200
