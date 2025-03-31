// /frontend/js/goals/goal-model.js
// Modelo de dados para metas financeiras

import { ValidationUtils } from '../utils/validation-utils.js';
import { SanitizeUtils } from '../utils/sanitize-utils.js';
import { DateUtils } from '../utils/date-utils.js';

/**
 * Classe que representa uma meta financeira
 */
export class Goal {
    /**
     * @param {Object} data - Dados da meta
     * @param {string} data.id - ID único da meta
     * @param {string} data.name - Nome da meta
     * @param {number} data.targetAmount - Valor alvo da meta
     * @param {number} data.currentAmount - Valor atual acumulado
     * @param {string} data.deadline - Data limite (formato ISO)
     * @param {string} data.description - Descrição da meta
     * @param {string} data.category - Categoria da meta (opcional)
     * @param {string} data.icon - Ícone para a meta (opcional)
     * @param {boolean} data.isActive - Se a meta está ativa
     * @param {boolean} data.isCompleted - Se a meta foi concluída
     * @param {string} data.createdAt - Data de criação (formato ISO)
     * @param {string} data.updatedAt - Data de atualização (formato ISO)
     */
    constructor(data = {}) {
        this.id = data.id || Date.now().toString();
        this.name = data.name || '';
        this.targetAmount = data.targetAmount || 0;
        this.currentAmount = data.currentAmount || 0;
        this.deadline = data.deadline || '';
        this.description = data.description || '';
        this.category = data.category || '';
        this.icon = data.icon || 'fa-bullseye';
        this.isActive = data.isActive !== undefined ? data.isActive : true;
        this.isCompleted = data.isCompleted || false;
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
        
        // Sanitizar dados
        this.sanitize();
    }
    
    /**
     * Sanitiza os dados da meta
     */
    sanitize() {
        this.id = SanitizeUtils.sanitizeIdentifier(this.id);
        this.name = SanitizeUtils.sanitizeText(this.name);
        this.targetAmount = SanitizeUtils.sanitizeNumber(this.targetAmount, { min: 0 });
        this.currentAmount = SanitizeUtils.sanitizeNumber(this.currentAmount, { min: 0 });
        this.description = SanitizeUtils.sanitizeText(this.description);
        this.category = SanitizeUtils.sanitizeText(this.category);
        this.icon = SanitizeUtils.sanitizeText(this.icon);
        this.isActive = SanitizeUtils.sanitizeBoolean(this.isActive);
        this.isCompleted = SanitizeUtils.sanitizeBoolean(this.isCompleted);
        
        // Verificar e sanitizar data limite
        if (this.deadline && !ValidationUtils.isValidDate(this.deadline)) {
            this.deadline = '';
        }
        
        // Verificar e sanitizar timestamps
        if (!ValidationUtils.isValidDate(this.createdAt)) {
            this.createdAt = new Date().toISOString();
        }
        
        if (!ValidationUtils.isValidDate(this.updatedAt)) {
            this.updatedAt = new Date().toISOString();
        }
        
        // Se o valor atual atingiu ou superou o valor alvo, marcar como concluída
        if (this.currentAmount >= this.targetAmount && this.targetAmount > 0) {
            this.isCompleted = true;
        }
    }
    
    /**
     * Valida os dados da meta
     * @returns {Object} - Resultado da validação { isValid, errors }
     */
    validate() {
        const errors = {};
        
        // Validar nome
        if (!this.name || this.name.trim() === '') {
            errors.name = 'O nome da meta é obrigatório.';
        }
        
        // Validar valor alvo
        if (!ValidationUtils.isPositiveNumber(this.targetAmount)) {
            errors.targetAmount = 'O valor alvo deve ser um número positivo.';
        }
        
        // Validar valor atual
        if (!ValidationUtils.isZeroOrPositive(this.currentAmount)) {
            errors.currentAmount = 'O valor atual não pode ser negativo.';
        }
        
        // Validar data limite
        if (this.deadline && !ValidationUtils.isValidDate(this.deadline)) {
            errors.deadline = 'Data limite inválida.';
        }
        
        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }
    
    /**
     * Adiciona um valor ao montante atual
     * @param {number} amount - Valor a ser adicionado
     * @returns {number} - Novo valor atual
     */
    addAmount(amount) {
        const value = SanitizeUtils.sanitizeNumber(amount, { min: 0 });
        this.currentAmount += value;
        this.updatedAt = new Date().toISOString();
        
        // Verificar se atingiu o valor alvo
        if (this.currentAmount >= this.targetAmount) {
            this.isCompleted = true;
            this.currentAmount = this.targetAmount; // Limitar ao valor alvo
        }
        
        return this.currentAmount;
    }
    
    /**
     * Remove um valor do montante atual
     * @param {number} amount - Valor a ser removido
     * @returns {number} - Novo valor atual
     */
    removeAmount(amount) {
        const value = SanitizeUtils.sanitizeNumber(amount, { min: 0 });
        this.currentAmount = Math.max(0, this.currentAmount - value);
        this.updatedAt = new Date().toISOString();
        
        // Se estava completa e agora não está mais
        if (this.isCompleted && this.currentAmount < this.targetAmount) {
            this.isCompleted = false;
        }
        
        return this.currentAmount;
    }
    
    /**
     * Calcula o percentual de progresso da meta
     * @returns {number} - Percentual de progresso (0-100)
     */
    getProgressPercentage() {
        if (this.targetAmount <= 0) {
            return 0;
        }
        
        const percentage = (this.currentAmount / this.targetAmount) * 100;
        return Math.min(100, percentage);
    }
    
    /**
     * Calcula o valor restante para atingir a meta
     * @returns {number} - Valor restante
     */
    getRemainingAmount() {
        return Math.max(0, this.targetAmount - this.currentAmount);
    }
    
    /**
     * Verifica se a meta está em atraso
     * @returns {boolean} - Se a meta está em atraso
     */
    isOverdue() {
        if (!this.deadline || this.isCompleted) {
            return false;
        }
        
        const deadlineDate = new Date(this.deadline);
        const today = new Date();
        
        // Comparar apenas as datas (sem horas)
        today.setHours(0, 0, 0, 0);
        deadlineDate.setHours(0, 0, 0, 0);
        
        return today > deadlineDate;
    }
    
    /**
     * Calcula a quantidade de dias restantes até o prazo
     * @returns {number|null} - Número de dias restantes ou null se não houver prazo
     */
    getDaysRemaining() {
        if (!this.deadline) {
            return null;
        }
        
        const deadlineDate = new Date(this.deadline);
        const today = new Date();
        
        // Comparar apenas as datas (sem horas)
        today.setHours(0, 0, 0, 0);
        deadlineDate.setHours(0, 0, 0, 0);
        
        if (today > deadlineDate) {
            return 0;
        }
        
        return DateUtils.diffInDays(today, deadlineDate);
    }
    
    /**
     * Calcula o valor diário necessário para atingir a meta no prazo
     * @returns {number|null} - Valor diário necessário ou null se não houver prazo ou meta já concluída
     */
    getDailyAmountNeeded() {
        if (!this.deadline || this.isCompleted) {
            return null;
        }
        
        const daysRemaining = this.getDaysRemaining();
        
        if (daysRemaining <= 0) {
            return null;
        }
        
        const remainingAmount = this.getRemainingAmount();
        return remainingAmount / daysRemaining;
    }
    
    /**
     * Converte a meta para um objeto simples
     * @returns {Object} - Objeto com os dados da meta
     */
    toObject() {
        return {
            id: this.id,
            name: this.name,
            targetAmount: this.targetAmount,
            currentAmount: this.currentAmount,
            deadline: this.deadline,
            description: this.description,
            category: this.category,
            icon: this.icon,
            isActive: this.isActive,
            isCompleted: this.isCompleted,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
    
    /**
     * Cria uma instância de Goal a partir de um objeto
     * @param {Object} obj - Objeto com dados da meta
     * @returns {Goal} - Nova instância de Goal
     */
    static fromObject(obj) {
        return new Goal(obj);
    }
    
    /**
     * Cria uma meta com prazo
     * @param {string} name - Nome da meta
     * @param {number} targetAmount - Valor alvo
     * @param {Date|string} deadline - Data limite
     * @param {string} description - Descrição da meta (opcional)
     * @returns {Goal} - Nova instância de Goal
     */
    static createWithDeadline(name, targetAmount, deadline, description = '') {
        let deadlineStr = '';
        
        if (deadline instanceof Date) {
            deadlineStr = DateUtils.toISODate(deadline);
        } else if (typeof deadline === 'string') {
            deadlineStr = deadline;
        }
        
        return new Goal({
            name,
            targetAmount,
            deadline: deadlineStr,
            description
        });
    }
    
    /**
     * Cria uma meta sem prazo
     * @param {string} name - Nome da meta
     * @param {number} targetAmount - Valor alvo
     * @param {string} description - Descrição da meta (opcional)
     * @returns {Goal} - Nova instância de Goal
     */
    static createWithoutDeadline(name, targetAmount, description = '') {
        return new Goal({
            name,
            targetAmount,
            description
        });
    }
}
