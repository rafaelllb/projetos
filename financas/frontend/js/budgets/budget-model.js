// /frontend/js/budgets/budget-model.js
// Modelo de dados para orçamentos financeiros

import { ValidationUtils } from '../utils/validation-utils.js';
import { SanitizeUtils } from '../utils/sanitize-utils.js';
import { DateUtils } from '../utils/date-utils.js';

/**
 * Classe que representa um orçamento financeiro
 */
export class Budget {
    /**
     * @param {Object} data - Dados do orçamento
     * @param {string} data.id - ID único do orçamento
     * @param {string} data.name - Nome do orçamento
     * @param {number} data.amount - Valor do orçamento
     * @param {string} data.startDate - Data de início (formato ISO)
     * @param {string} data.endDate - Data de fim (formato ISO)
     * @param {string} data.categoryId - ID da categoria (opcional, 'all' para todas)
     * @param {string} data.description - Descrição do orçamento (opcional)
     * @param {boolean} data.isActive - Se o orçamento está ativo
     * @param {string} data.createdAt - Data de criação (formato ISO)
     * @param {string} data.updatedAt - Data de atualização (formato ISO)
     */
    constructor(data = {}) {
        this.id = data.id || Date.now().toString();
        this.name = data.name || '';
        this.amount = data.amount || 0;
        this.startDate = data.startDate || DateUtils.getFirstDayOfMonth().toISOString().split('T')[0];
        this.endDate = data.endDate || DateUtils.getLastDayOfMonth().toISOString().split('T')[0];
        this.categoryId = data.categoryId || 'all';
        this.description = data.description || '';
        this.isActive = data.isActive !== undefined ? data.isActive : true;
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
        
        // Sanitizar dados
        this.sanitize();
    }
    
    /**
     * Sanitiza os dados do orçamento
     */
    sanitize() {
        this.id = SanitizeUtils.sanitizeIdentifier(this.id);
        this.name = SanitizeUtils.sanitizeText(this.name);
        this.amount = SanitizeUtils.sanitizeNumber(this.amount, { min: 0 });
        this.categoryId = SanitizeUtils.sanitizeIdentifier(this.categoryId);
        this.description = SanitizeUtils.sanitizeText(this.description);
        this.isActive = SanitizeUtils.sanitizeBoolean(this.isActive);
        
        // Verificar e sanitizar datas
        if (!ValidationUtils.isValidDate(this.startDate)) {
            this.startDate = DateUtils.getFirstDayOfMonth().toISOString().split('T')[0];
        }
        
        if (!ValidationUtils.isValidDate(this.endDate)) {
            this.endDate = DateUtils.getLastDayOfMonth().toISOString().split('T')[0];
        }
        
        // Garantir que a data de início não seja posterior à data de fim
        const start = new Date(this.startDate);
        const end = new Date(this.endDate);
        
        if (start > end) {
            this.endDate = this.startDate;
        }
        
        // Verificar e sanitizar timestamps
        if (!ValidationUtils.isValidDate(this.createdAt)) {
            this.createdAt = new Date().toISOString();
        }
        
        if (!ValidationUtils.isValidDate(this.updatedAt)) {
            this.updatedAt = new Date().toISOString();
        }
    }
    
    /**
     * Valida os dados do orçamento
     * @returns {Object} - Resultado da validação { isValid, errors }
     */
    validate() {
        const errors = {};
        
        // Validar nome
        if (!this.name || this.name.trim() === '') {
            errors.name = 'O nome do orçamento é obrigatório.';
        }
        
        // Validar valor
        if (!ValidationUtils.isPositiveNumber(this.amount)) {
            errors.amount = 'O valor deve ser um número positivo.';
        }
        
        // Validar datas
        if (!ValidationUtils.isValidDate(this.startDate)) {
            errors.startDate = 'Data de início inválida.';
        }
        
        if (!ValidationUtils.isValidDate(this.endDate)) {
            errors.endDate = 'Data de fim inválida.';
        }
        
        // Verificar se a data de início não é posterior à data de fim
        if (ValidationUtils.isValidDate(this.startDate) && ValidationUtils.isValidDate(this.endDate)) {
            const start = new Date(this.startDate);
            const end = new Date(this.endDate);
            
            if (start > end) {
                errors.endDate = 'A data de fim não pode ser anterior à data de início.';
            }
        }
        
        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }
    
    /**
     * Verifica se o orçamento está ativo para a data atual
     * @returns {boolean} - Se o orçamento está ativo
     */
    isActiveNow() {
        if (!this.isActive) {
            return false;
        }
        
        const now = new Date();
        const start = new Date(this.startDate);
        const end = new Date(this.endDate);
        
        // Ajustar para comparar apenas datas (sem horas)
        now.setHours(0, 0, 0, 0);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        
        return now >= start && now <= end;
    }
    
    /**
     * Calcula a duração do orçamento em dias
     * @returns {number} - Duração em dias
     */
    getDurationInDays() {
        const start = new Date(this.startDate);
        const end = new Date(this.endDate);
        
        return DateUtils.diffInDays(start, end) + 1; // Incluir o dia final
    }
    
    /**
     * Calcula o valor diário do orçamento
     * @returns {number} - Valor diário
     */
    getDailyAmount() {
        const duration = this.getDurationInDays();
        
        if (duration <= 0) {
            return 0;
        }
        
        return this.amount / duration;
    }
    
    /**
     * Converte o orçamento para um objeto simples
     * @returns {Object} - Objeto com os dados do orçamento
     */
    toObject() {
        return {
            id: this.id,
            name: this.name,
            amount: this.amount,
            startDate: this.startDate,
            endDate: this.endDate,
            categoryId: this.categoryId,
            description: this.description,
            isActive: this.isActive,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
    
    /**
     * Cria uma instância de Budget a partir de um objeto
     * @param {Object} obj - Objeto com dados do orçamento
     * @returns {Budget} - Nova instância de Budget
     */
    static fromObject(obj) {
        return new Budget(obj);
    }
    
    /**
     * Cria um orçamento mensal
     * @param {string} name - Nome do orçamento
     * @param {number} amount - Valor do orçamento
     * @param {string} categoryId - ID da categoria (opcional)
     * @param {Date} referenceDate - Data de referência (padrão: data atual)
     * @returns {Budget} - Nova instância de Budget
     */
    static createMonthlyBudget(name, amount, categoryId = 'all', referenceDate = new Date()) {
        const { firstDay, lastDay } = DateUtils.getMonthBounds(referenceDate);
        
        return new Budget({
            name,
            amount,
            startDate: DateUtils.toISODate(firstDay),
            endDate: DateUtils.toISODate(lastDay),
            categoryId
        });
    }
    
    /**
     * Cria um orçamento trimestral
     * @param {string} name - Nome do orçamento
     * @param {number} amount - Valor do orçamento
     * @param {string} categoryId - ID da categoria (opcional)
     * @param {Date} referenceDate - Data de referência (padrão: data atual)
     * @returns {Budget} - Nova instância de Budget
     */
    static createQuarterlyBudget(name, amount, categoryId = 'all', referenceDate = new Date()) {
        const { firstDay, lastDay } = DateUtils.getQuarterBounds(referenceDate);
        
        return new Budget({
            name,
            amount,
            startDate: DateUtils.toISODate(firstDay),
            endDate: DateUtils.toISODate(lastDay),
            categoryId
        });
    }
    
    /**
     * Cria um orçamento anual
     * @param {string} name - Nome do orçamento
     * @param {number} amount - Valor do orçamento
     * @param {string} categoryId - ID da categoria (opcional)
     * @param {Date} referenceDate - Data de referência (padrão: data atual)
     * @returns {Budget} - Nova instância de Budget
     */
    static createYearlyBudget(name, amount, categoryId = 'all', referenceDate = new Date()) {
        const { firstDay, lastDay } = DateUtils.getYearBounds(referenceDate);
        
        return new Budget({
            name,
            amount,
            startDate: DateUtils.toISODate(firstDay),
            endDate: DateUtils.toISODate(lastDay),
            categoryId
        });
    }
}
