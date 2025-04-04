// /frontend/js/utils/validation-utils.js
// Utilitários para validação de dados

/**
 * Objeto com métodos utilitários para validação de dados
 */
export const validationUtils = {
    /**
     * Verifica se um valor é nulo ou indefinido
     * @param {any} value - Valor a verificar
     * @returns {boolean} - Se o valor é nulo ou indefinido
     */
    isNullOrUndefined(value) {
        return value === null || value === undefined;
    },
    
    /**
     * Verifica se uma string está vazia
     * @param {string} value - String a verificar
     * @returns {boolean} - Se a string está vazia
     */
    isEmptyString(value) {
        return typeof value === 'string' && value.trim() === '';
    },
    
    /**
     * Verifica se uma string é válida (não vazia)
     * @param {any} value - Valor a ser validado
     * @returns {boolean} - Resultado da validação
     */
    isValidString(value) {
        return typeof value === 'string' && value.trim() !== '';
    },
    
    /**
     * Verifica se um valor é um número válido
     * @param {any} value - Valor a verificar
     * @param {Object} options - Opções de validação
     * @param {number} options.min - Valor mínimo permitido
     * @param {number} options.max - Valor máximo permitido
     * @returns {boolean} - Se o valor é um número válido
     */
    isValidNumber(value, options = {}) {
        // Validar se é um número
        if (typeof value === 'number') {
            if (isNaN(value) || !isFinite(value)) {
                return false;
            }
        } else if (typeof value === 'string') {
            // Tentar converter string para número
            const parsed = parseFloat(value.replace(',', '.'));
            if (isNaN(parsed) || !isFinite(parsed)) {
                return false;
            }
            // Usar o valor convertido para verificações adicionais
            value = parsed;
        } else {
            return false;
        }
        
        // Verificar limites, se especificados
        if (options.min !== undefined && value < options.min) {
            return false;
        }
        
        if (options.max !== undefined && value > options.max) {
            return false;
        }
        
        return true;
    },
    
    /**
     * Verifica se um valor é um número positivo
     * @param {any} value - Valor a verificar
     * @returns {boolean} - Se o valor é um número positivo
     */
    isPositiveNumber(value) {
        return this.isValidNumber(value, { min: 0.000001 });
    },
    
    /**
     * Verifica se um valor é zero ou positivo
     * @param {any} value - Valor a verificar
     * @returns {boolean} - Se o valor é zero ou positivo
     */
    isZeroOrPositive(value) {
        return this.isValidNumber(value, { min: 0 });
    },
    
    /**
     * Verifica se uma data é válida
     * @param {string|Date} date - Data a verificar
     * @returns {boolean} - Se a data é válida
     */
    isValidDate(date) {
        if (!date) {
            return false;
        }
        
        if (date instanceof Date) {
            return !isNaN(date.getTime());
        }
        
        if (typeof date === 'string') {
            // Tentar criar um objeto Date
            const parsed = new Date(date);
            return !isNaN(parsed.getTime());
        }
        
        return false;
    },
    
    /**
     * Verifica se um e-mail é válido
     * @param {string} email - E-mail a verificar
     * @returns {boolean} - Se o e-mail é válido
     */
    isValidEmail(email) {
        if (this.isNullOrUndefined(email) || this.isEmptyString(email)) {
            return false;
        }
        
        // Expressão regular para validação básica de e-mail
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },
    
    /**
     * Verifica se uma senha atende aos requisitos mínimos
     * @param {string} password - Senha a verificar
     * @param {Object} options - Opções de validação
     * @param {number} options.minLength - Comprimento mínimo (padrão: 6)
     * @param {boolean} options.requireNumbers - Se deve exigir números (padrão: false)
     * @param {boolean} options.requireSpecialChars - Se deve exigir caracteres especiais (padrão: false)
     * @param {boolean} options.requireUppercase - Se deve exigir letras maiúsculas (padrão: false)
     * @returns {boolean} - Se a senha atende aos requisitos
     */
    isValidPassword(password, options = {}) {
        const defaultOptions = {
            minLength: 6,
            requireNumbers: false,
            requireSpecialChars: false,
            requireUppercase: false
        };
        
        const opt = { ...defaultOptions, ...options };
        
        if (this.isNullOrUndefined(password) || this.isEmptyString(password)) {
            return false;
        }
        
        // Verificar comprimento
        if (password.length < opt.minLength) {
            return false;
        }
        
        // Verificar números
        if (opt.requireNumbers && !/\d/.test(password)) {
            return false;
        }
        
        // Verificar caracteres especiais
        if (opt.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            return false;
        }
        
        // Verificar letras maiúsculas
        if (opt.requireUppercase && !/[A-Z]/.test(password)) {
            return false;
        }
        
        return true;
    },
    
    /**
     * Verifica se uma string atende a um comprimento mínimo
     * @param {string} value - String a verificar
     * @param {number} minLength - Comprimento mínimo
     * @returns {boolean} - Se a string atende ao comprimento mínimo
     */
    hasMinLength(value, minLength) {
        if (this.isNullOrUndefined(value) || typeof value !== 'string') {
            return false;
        }
        
        return value.length >= minLength;
    },
    
    /**
     * Verifica se uma string não excede um comprimento máximo
     * @param {string} value - String a verificar
     * @param {number} maxLength - Comprimento máximo
     * @returns {boolean} - Se a string não excede o comprimento máximo
     */
    hasMaxLength(value, maxLength) {
        if (this.isNullOrUndefined(value) || typeof value !== 'string') {
            return false;
        }
        
        return value.length <= maxLength;
    },
    
    /**
     * Verifica se um CPF é válido
     * @param {string} cpf - CPF a verificar
     * @returns {boolean} - Se o CPF é válido
     */
    isValidCPF(cpf) {
        if (this.isNullOrUndefined(cpf) || this.isEmptyString(cpf)) {
            return false;
        }
        
        // Remover caracteres não numéricos
        cpf = cpf.replace(/\D/g, '');
        
        // Verificar se tem 11 dígitos
        if (cpf.length !== 11) {
            return false;
        }
        
        // Verificar se todos os dígitos são iguais (CPF inválido, mas passa na regra de validação)
        if (/^(\d)\1{10}$/.test(cpf)) {
            return false;
        }
        
        // Validar dígitos verificadores
        let sum = 0;
        let remainder;
        
        // Verificar primeiro dígito
        for (let i = 1; i <= 9; i++) {
            sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
        }
        
        remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) {
            remainder = 0;
        }
        
        if (remainder !== parseInt(cpf.substring(9, 10))) {
            return false;
        }
        
        // Verificar segundo dígito
        sum = 0;
        for (let i = 1; i <= 10; i++) {
            sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
        }
        
        remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) {
            remainder = 0;
        }
        
        if (remainder !== parseInt(cpf.substring(10, 11))) {
            return false;
        }
        
        return true;
    },
    
    /**
     * Valida um objeto usando schema simples
     * @param {Object} obj - Objeto a validar
     * @param {Object} schema - Schema com regras de validação
     * @returns {Object} - Resultado da validação { isValid, errors }
     */
    validateObject(obj, schema) {
        if (!obj || !schema) {
            return {
                isValid: false,
                errors: { _general: 'Dados ou schema inválidos' }
            };
        }
        
        const errors = {};
        let isValid = true;
        
        // Verificar cada campo do schema
        for (const field in schema) {
            const rules = schema[field];
            const value = obj[field];
            
            // Se tem regra 'required' e o valor não está presente
            if (rules.required && (this.isNullOrUndefined(value) || this.isEmptyString(value))) {
                errors[field] = errors[field] || [];
                errors[field].push('Campo obrigatório');
                isValid = false;
                continue;
            }
            
            // Pular outras validações se o valor não está presente e não é obrigatório
            if (this.isNullOrUndefined(value) && !rules.required) {
                continue;
            }
            
            // Validar tipo
            if (rules.type && typeof value !== rules.type) {
                errors[field] = errors[field] || [];
                errors[field].push(`Deve ser do tipo ${rules.type}`);
                isValid = false;
            }
            
            // Validar número
            if (rules.type === 'number' || rules.isNumber) {
                if (!this.isValidNumber(value)) {
                    errors[field] = errors[field] || [];
                    errors[field].push('Deve ser um número válido');
                    isValid = false;
                } else {
                    // Converter para número
                    const numValue = typeof value === 'string' 
                        ? parseFloat(value.replace(',', '.')) 
                        : value;
                    
                    // Validar mínimo
                    if (rules.min !== undefined && numValue < rules.min) {
                        errors[field] = errors[field] || [];
                        errors[field].push(`Deve ser maior ou igual a ${rules.min}`);
                        isValid = false;
                    }
                    
                    // Validar máximo
                    if (rules.max !== undefined && numValue > rules.max) {
                        errors[field] = errors[field] || [];
                        errors[field].push(`Deve ser menor ou igual a ${rules.max}`);
                        isValid = false;
                    }
                }
            }
            
            // Validar string
            if (rules.type === 'string') {
                // Validar comprimento mínimo
                if (rules.minLength !== undefined && !this.hasMinLength(value, rules.minLength)) {
                    errors[field] = errors[field] || [];
                    errors[field].push(`Deve ter pelo menos ${rules.minLength} caracteres`);
                    isValid = false;
                }
                
                // Validar comprimento máximo
                if (rules.maxLength !== undefined && !this.hasMaxLength(value, rules.maxLength)) {
                    errors[field] = errors[field] || [];
                    errors[field].push(`Deve ter no máximo ${rules.maxLength} caracteres`);
                    isValid = false;
                }
                
                // Validar padrão (regex)
                if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
                    errors[field] = errors[field] || [];
                    errors[field].push(rules.patternMessage || 'Formato inválido');
                    isValid = false;
                }
                
                // Validar email
                if (rules.isEmail && !this.isValidEmail(value)) {
                    errors[field] = errors[field] || [];
                    errors[field].push('E-mail inválido');
                    isValid = false;
                }
                
                // Validar CPF
                if (rules.isCPF && !this.isValidCPF(value)) {
                    errors[field] = errors[field] || [];
                    errors[field].push('CPF inválido');
                    isValid = false;
                }
            }
            
            // Validar data
            if (rules.isDate && !this.isValidDate(value)) {
                errors[field] = errors[field] || [];
                errors[field].push('Data inválida');
                isValid = false;
            }
            
            // Validar função personalizada
            if (rules.validator && typeof rules.validator === 'function') {
                const result = rules.validator(value, obj);
                if (result !== true) {
                    errors[field] = errors[field] || [];
                    errors[field].push(result || 'Valor inválido');
                    isValid = false;
                }
            }
        }
        
        return { isValid, errors };
    }
};

// Exportando também a versão de classe para compatibilidade com código legado
export class ValidationUtils {
    static isNullOrUndefined(value) {
        return validationUtils.isNullOrUndefined(value);
    }
    
    static isEmptyString(value) {
        return validationUtils.isEmptyString(value);
    }
    
    static isValidString(value) {
        return validationUtils.isValidString(value);
    }
    
    static isValidNumber(value, options = {}) {
        return validationUtils.isValidNumber(value, options);
    }
    
    static isPositiveNumber(value) {
        return validationUtils.isPositiveNumber(value);
    }
    
    static isZeroOrPositive(value) {
        return validationUtils.isZeroOrPositive(value);
    }
    
    static isValidDate(date) {
        return validationUtils.isValidDate(date);
    }
    
    static isValidEmail(email) {
        return validationUtils.isValidEmail(email);
    }
    
    static isValidPassword(password, options = {}) {
        return validationUtils.isValidPassword(password, options);
    }
    
    static hasMinLength(value, minLength) {
        return validationUtils.hasMinLength(value, minLength);
    }
    
    static hasMaxLength(value, maxLength) {
        return validationUtils.hasMaxLength(value, maxLength);
    }
    
    static isValidCPF(cpf) {
        return validationUtils.isValidCPF(cpf);
    }
    
    static validateObject(obj, schema) {
        return validationUtils.validateObject(obj, schema);
    }
}

export default validationUtils;