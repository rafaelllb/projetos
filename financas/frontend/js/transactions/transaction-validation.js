// /frontend/js/transactions/transaction-validation.js
// Utilitário para validação de transações financeiras

import { ValidationUtils } from '../utils/validation-utils.js';

/**
 * Classe responsável por validar dados de transações financeiras
 */
export class TransactionValidation {
    /**
     * Valida os dados de uma transação
     * @param {Object} transaction - Objeto com dados da transação
     * @returns {Object} - Resultado da validação { isValid, errors }
     */
    static validateTransaction(transaction) {
        if (!transaction) {
            return {
                isValid: false,
                errors: { _general: 'Dados da transação não fornecidos' }
            };
        }
        
        // Schema de validação
        const schema = {
            type: {
                required: true,
                validator: (value) => {
                    if (!['income', 'expense'].includes(value)) {
                        return 'Tipo de transação inválido. Deve ser "income" ou "expense".';
                    }
                    return true;
                }
            },
            description: {
                required: true,
                type: 'string',
                minLength: 1,
                maxLength: 100,
                validator: (value) => {
                    if (!value || value.trim() === '') {
                        return 'A descrição é obrigatória.';
                    }
                    return true;
                }
            },
            amount: {
                required: true,
                isNumber: true,
                min: 0.01,
                validator: (value) => {
                    if (!ValidationUtils.isPositiveNumber(value)) {
                        return 'O valor deve ser um número positivo.';
                    }
                    return true;
                }
            },
            category: {
                required: true,
                type: 'string',
                validator: (value) => {
                    if (!value || value.trim() === '') {
                        return 'A categoria é obrigatória.';
                    }
                    return true;
                }
            },
            date: {
                required: true,
                isDate: true,
                validator: (value) => {
                    if (!ValidationUtils.isValidDate(value)) {
                        return 'Data inválida.';
                    }
                    
                    // Opcional: Verificar se a data não é futura
                    const inputDate = new Date(value);
                    const today = new Date();
                    today.setHours(23, 59, 59, 999);
                    
                    if (inputDate > today) {
                        return 'A data não pode ser futura.';
                    }
                    
                    // Opcional: Verificar se a data não é muito antiga
                    const minDate = new Date();
                    minDate.setFullYear(minDate.getFullYear() - 10);
                    
                    if (inputDate < minDate) {
                        return 'A data não pode ser anterior a 10 anos.';
                    }
                    
                    return true;
                }
            },
            notes: {
                required: false,
                type: 'string',
                maxLength: 500
            },
            isRecurring: {
                required: false,
                validator: (value) => {
                    if (value !== undefined && typeof value !== 'boolean') {
                        return 'Valor inválido para transação recorrente.';
                    }
                    return true;
                }
            },
            recurrencePattern: {
                required: false,
                type: 'string',
                validator: (value, obj) => {
                    // Se a transação for recorrente, o padrão de recorrência é obrigatório
                    if (obj.isRecurring && (!value || value.trim() === '')) {
                        return 'Padrão de recorrência obrigatório para transações recorrentes.';
                    }
                    return true;
                }
            }
        };
        
        return ValidationUtils.validateObject(transaction, schema);
    }
    
    /**
     * Valida apenas o tipo de uma transação
     * @param {string} type - Tipo da transação
     * @returns {boolean} - Se o tipo é válido
     */
    static isValidType(type) {
        return ['income', 'expense'].includes(type);
    }
    
    /**
     * Valida se a data está dentro de um intervalo permitido
     * @param {string|Date} date - Data a ser validada
     * @param {Object} options - Opções de validação
     * @param {Date} options.minDate - Data mínima permitida
     * @param {Date} options.maxDate - Data máxima permitida
     * @returns {boolean} - Se a data é válida
     */
    static isDateInRange(date, options = {}) {
        if (!ValidationUtils.isValidDate(date)) {
            return false;
        }
        
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        const today = new Date();
        
        // Definir opções padrão
        const defaultOptions = {
            minDate: new Date(today.getFullYear() - 10, 0, 1), // 10 anos atrás
            maxDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1) // Amanhã
        };
        
        const opts = { ...defaultOptions, ...options };
        
        return dateObj >= opts.minDate && dateObj <= opts.maxDate;
    }
    
    /**
     * Valida se o valor é consistente com o tipo
     * @param {number} amount - Valor da transação
     * @param {string} type - Tipo da transação
     * @returns {boolean} - Se o valor é consistente com o tipo
     */
    static isAmountConsistentWithType(amount, type) {
        if (!ValidationUtils.isValidNumber(amount) || !this.isValidType(type)) {
            return false;
        }
        
        // Valores devem ser sempre positivos, independente do tipo
        return amount > 0;
    }
    
    /**
     * Valida uma lista de transações
     * @param {Array} transactions - Lista de transações
     * @returns {Object} - Resultado da validação { valid: Array, invalid: Array }
     */
    static validateTransactionList(transactions) {
        if (!Array.isArray(transactions)) {
            return { valid: [], invalid: [] };
        }
        
        const valid = [];
        const invalid = [];
        
        transactions.forEach(transaction => {
            const validation = this.validateTransaction(transaction);
            
            if (validation.isValid) {
                valid.push(transaction);
            } else {
                invalid.push({
                    transaction,
                    errors: validation.errors
                });
            }
        });
        
        return { valid, invalid };
    }
    
    /**
     * Valida um filtro de busca de transações
     * @param {Object} filter - Objeto com critérios de filtro
     * @returns {Object} - Resultado da validação { isValid, errors }
     */
    static validateTransactionFilter(filter) {
        if (!filter || typeof filter !== 'object') {
            return {
                isValid: false,
                errors: { _general: 'Filtro inválido' }
            };
        }
        
        const errors = {};
        
        // Validar tipo
        if (filter.type && !['income', 'expense', 'all'].includes(filter.type)) {
            errors.type = 'Tipo de transação inválido.';
        }
        
        // Validar datas
        if (filter.startDate && !ValidationUtils.isValidDate(filter.startDate)) {
            errors.startDate = 'Data de início inválida.';
        }
        
        if (filter.endDate && !ValidationUtils.isValidDate(filter.endDate)) {
            errors.endDate = 'Data de fim inválida.';
        }
        
        // Verificar se a data de início não é posterior à data de fim
        if (filter.startDate && filter.endDate) {
            const start = new Date(filter.startDate);
            const end = new Date(filter.endDate);
            
            if (start > end) {
                errors.endDate = 'A data de fim não pode ser anterior à data de início.';
            }
        }
        
        // Validar valores mínimo e máximo
        if (filter.minAmount !== undefined && !ValidationUtils.isZeroOrPositive(filter.minAmount)) {
            errors.minAmount = 'O valor mínimo não pode ser negativo.';
        }
        
        if (filter.maxAmount !== undefined && !ValidationUtils.isPositiveNumber(filter.maxAmount)) {
            errors.maxAmount = 'O valor máximo deve ser positivo.';
        }
        
        // Verificar se o valor mínimo não é maior que o valor máximo
        if (filter.minAmount !== undefined && filter.maxAmount !== undefined) {
            if (parseFloat(filter.minAmount) > parseFloat(filter.maxAmount)) {
                errors.maxAmount = 'O valor máximo não pode ser menor que o valor mínimo.';
            }
        }
        
        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }
}
