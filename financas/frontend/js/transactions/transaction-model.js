// /frontend/js/transactions/transaction-model.js
// Modelo de dados para transações financeiras

import { ValidationUtils } from '../utils/validation-utils.js';
import { SanitizeUtils } from '../utils/sanitize-utils.js';

/**
 * Classe que representa uma transação financeira
 */
export class Transaction {
    /**
     * @param {Object} data - Dados da transação
     * @param {string} data.id - ID único da transação
     * @param {string} data.type - Tipo da transação ('income' ou 'expense')
     * @param {string} data.description - Descrição da transação
     * @param {number} data.amount - Valor da transação
     * @param {string} data.category - ID da categoria
     * @param {string} data.date - Data da transação (formato ISO)
     * @param {string} data.notes - Observações adicionais (opcional)
     * @param {boolean} data.isRecurring - Se é uma transação recorrente (opcional)
     * @param {string} data.recurrencePattern - Padrão de recorrência (opcional)
     * @param {string} data.createdAt - Data de criação (formato ISO)
     * @param {string} data.updatedAt - Data de atualização (formato ISO)
     */
    constructor(data = {}) {
        this.id = data.id || Date.now().toString();
        this.type = data.type || 'expense';
        this.description = data.description || '';
        this.amount = data.amount || 0;
        this.category = data.category || '';
        this.date = data.date || new Date().toISOString().split('T')[0];
        this.notes = data.notes || '';
        this.isRecurring = data.isRecurring || false;
        this.recurrencePattern = data.recurrencePattern || '';
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
        
        // Sanitizar dados
        this.sanitize();
    }
    
    /**
     * Sanitiza os dados da transação
     */
    sanitize() {
        this.id = SanitizeUtils.sanitizeIdentifier(this.id);
        this.type = ['income', 'expense'].includes(this.type) ? this.type : 'expense';
        this.description = SanitizeUtils.sanitizeText(this.description);
        this.amount = SanitizeUtils.sanitizeNumber(this.amount, { min: 0 });
        this.category = SanitizeUtils.sanitizeIdentifier(this.category);
        this.notes = SanitizeUtils.sanitizeText(this.notes);
        this.isRecurring = SanitizeUtils.sanitizeBoolean(this.isRecurring);
        this.recurrencePattern = SanitizeUtils.sanitizeText(this.recurrencePattern);
        
        // Verificar e sanitizar data
        if (!ValidationUtils.isValidDate(this.date)) {
            this.date = new Date().toISOString().split('T')[0];
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
     * Valida os dados da transação
     * @returns {Object} - Resultado da validação { isValid, errors }
     */
    validate() {
        const errors = {};
        
        // Validar tipo
        if (!['income', 'expense'].includes(this.type)) {
            errors.type = 'Tipo de transação inválido. Deve ser "income" ou "expense".';
        }
        
        // Validar descrição
        if (!this.description || this.description.trim() === '') {
            errors.description = 'A descrição é obrigatória.';
        }
        
        // Validar valor
        if (!ValidationUtils.isPositiveNumber(this.amount)) {
            errors.amount = 'O valor deve ser um número positivo.';
        }
        
        // Validar categoria
        if (!this.category || this.category.trim() === '') {
            errors.category = 'A categoria é obrigatória.';
        }
        
        // Validar data
        if (!ValidationUtils.isValidDate(this.date)) {
            errors.date = 'Data inválida.';
        }
        
        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }
    
    /**
     * Converte a transação para um objeto simples
     * @returns {Object} - Objeto com os dados da transação
     */
    toObject() {
        return {
            id: this.id,
            type: this.type,
            description: this.description,
            amount: this.amount,
            category: this.category,
            date: this.date,
            notes: this.notes,
            isRecurring: this.isRecurring,
            recurrencePattern: this.recurrencePattern,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
    
    /**
     * Cria uma instância de Transaction a partir de um objeto
     * @param {Object} obj - Objeto com dados da transação
     * @returns {Transaction} - Nova instância de Transaction
     */
    static fromObject(obj) {
        return new Transaction(obj);
    }
    
    /**
     * Cria uma instância de Transaction para uma receita
     * @param {string} description - Descrição da receita
     * @param {number} amount - Valor da receita
     * @param {string} category - Categoria da receita
     * @param {string} date - Data da receita
     * @returns {Transaction} - Nova instância de Transaction
     */
    static createIncome(description, amount, category, date = null) {
        return new Transaction({
            type: 'income',
            description,
            amount,
            category,
            date: date || new Date().toISOString().split('T')[0]
        });
    }
    
    /**
     * Cria uma instância de Transaction para uma despesa
     * @param {string} description - Descrição da despesa
     * @param {number} amount - Valor da despesa
     * @param {string} category - Categoria da despesa
     * @param {string} date - Data da despesa
     * @returns {Transaction} - Nova instância de Transaction
     */
    static createExpense(description, amount, category, date = null) {
        return new Transaction({
            type: 'expense',
            description,
            amount,
            category,
            date: date || new Date().toISOString().split('T')[0]
        });
    }
}
