// /frontend/js/utils/sanitize-utils.js
// Utilitários para sanitização de dados

/**
 * Objeto com métodos utilitários para sanitização de dados
 */
export const sanitizeUtils = {
    /**
     * Sanitiza texto removendo tags HTML e scripts
     * @param {string} text - Texto a ser sanitizado
     * @returns {string} - Texto sanitizado
     */
    sanitizeText(text) {
        if (typeof text !== 'string') {
            return '';
        }
        
        // Remover tags HTML e scripts
        return text
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<[^>]*>/g, '')
            .trim();
    },
    
    /**
     * Sanitiza HTML preservando tags seguras
     * @param {string} html - HTML a ser sanitizado
     * @returns {string} - HTML sanitizado
     */
    sanitizeHTML(html) {
        if (typeof html !== 'string') {
            return '';
        }
        
        // Remover scripts e eventos inline
        return html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=\s*["']?[^"']*["']?/gi, '')
            .replace(/data-\w+\s*=\s*["']?[^"']*["']?/gi, '')
            .trim();
    },
    
    /**
     * Sanitiza objeto removendo tags HTML e scripts de propriedades string
     * @param {Object} obj - Objeto a ser sanitizado
     * @returns {Object} - Objeto sanitizado
     */
    sanitizeObject(obj) {
        if (!obj || typeof obj !== 'object') {
            return obj;
        }
        
        const sanitized = Array.isArray(obj) ? [] : {};
        
        // Sanitizar cada propriedade do objeto
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const value = obj[key];
                
                if (typeof value === 'string') {
                    sanitized[key] = this.sanitizeText(value);
                } else if (typeof value === 'object' && value !== null) {
                    sanitized[key] = this.sanitizeObject(value);
                } else {
                    sanitized[key] = value;
                }
            }
        }
        
        return sanitized;
    },
    
    /**
     * Sanitiza valores numéricos
     * @param {any} value - Valor a ser sanitizado
     * @param {Object} options - Opções de sanitização
     * @param {number} options.min - Valor mínimo permitido
     * @param {number} options.max - Valor máximo permitido
     * @param {number} options.default - Valor padrão se inválido
     * @returns {number} - Valor numérico sanitizado
     */
    sanitizeNumber(value, options = {}) {
        // Definir opções padrão
        const defaultOptions = {
            min: Number.MIN_SAFE_INTEGER,
            max: Number.MAX_SAFE_INTEGER,
            default: 0
        };
        
        const opts = { ...defaultOptions, ...options };
        
        // Tentar converter para número
        let num;
        
        if (typeof value === 'string') {
            // Remover caracteres não numéricos, exceto ponto e vírgula
            const cleaned = value.replace(/[^\d,.+-]/g, '')
                .replace(',', '.'); // Converter vírgula para ponto
            num = parseFloat(cleaned);
        } else {
            num = Number(value);
        }
        
        // Verificar se é um número válido
        if (isNaN(num) || !isFinite(num)) {
            return opts.default;
        }
        
        // Aplicar limites
        return Math.min(Math.max(num, opts.min), opts.max);
    },
    
    /**
     * Sanitiza uma data
     * @param {any} value - Valor a ser sanitizado
     * @param {Object} options - Opções de sanitização
     * @param {Date} options.min - Data mínima permitida
     * @param {Date} options.max - Data máxima permitida
     * @param {Date} options.default - Data padrão se inválida
     * @returns {Date} - Data sanitizada
     */
    sanitizeDate(value, options = {}) {
        // Definir opções padrão
        const defaultOptions = {
            min: new Date(1900, 0, 1),
            max: new Date(2100, 11, 31),
            default: new Date()
        };
        
        const opts = { ...defaultOptions, ...options };
        
        // Tentar converter para data
        let date;
        
        if (value instanceof Date) {
            date = new Date(value);
        } else if (typeof value === 'string' || typeof value === 'number') {
            date = new Date(value);
        } else {
            return opts.default;
        }
        
        // Verificar se é uma data válida
        if (isNaN(date.getTime())) {
            return opts.default;
        }
        
        // Aplicar limites
        if (date < opts.min) {
            return new Date(opts.min);
        }
        
        if (date > opts.max) {
            return new Date(opts.max);
        }
        
        return date;
    },
    
    /**
     * Sanitiza um e-mail
     * @param {string} email - E-mail a ser sanitizado
     * @returns {string} - E-mail sanitizado
     */
    sanitizeEmail(email) {
        if (typeof email !== 'string') {
            return '';
        }
        
        // Remover espaços e converter para minúsculas
        const sanitized = email.trim().toLowerCase();
        
        // Verificar se parece um e-mail válido
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        return emailRegex.test(sanitized) ? sanitized : '';
    },
    
    /**
     * Sanitiza uma URL
     * @param {string} url - URL a ser sanitizada
     * @param {Object} options - Opções de sanitização
     * @param {Array<string>} options.allowedProtocols - Protocolos permitidos
     * @param {string} options.default - URL padrão se inválida
     * @returns {string} - URL sanitizada
     */
    sanitizeURL(url, options = {}) {
        // Definir opções padrão
        const defaultOptions = {
            allowedProtocols: ['http:', 'https:'],
            default: ''
        };
        
        const opts = { ...defaultOptions, ...options };
        
        if (typeof url !== 'string') {
            return opts.default;
        }
        
        // Remover espaços
        const sanitized = url.trim();
        
        try {
            const urlObj = new URL(sanitized);
            
            // Verificar se o protocolo é permitido
            if (!opts.allowedProtocols.includes(urlObj.protocol)) {
                return opts.default;
            }
            
            return sanitized;
        } catch (error) {
            // URL inválida
            return opts.default;
        }
    },
    
    /**
     * Sanitiza valores booleanos
     * @param {any} value - Valor a ser sanitizado
     * @param {boolean} defaultValue - Valor padrão se não for booleano
     * @returns {boolean} - Valor booleano sanitizado
     */
    sanitizeBoolean(value, defaultValue = false) {
        if (typeof value === 'boolean') {
            return value;
        }
        
        if (typeof value === 'string') {
            const lowercased = value.toLowerCase().trim();
            if (lowercased === 'true' || lowercased === '1' || lowercased === 'sim' || lowercased === 'yes') {
                return true;
            }
            
            if (lowercased === 'false' || lowercased === '0' || lowercased === 'não' || lowercased === 'no') {
                return false;
            }
        }
        
        if (typeof value === 'number') {
            return value !== 0;
        }
        
        return defaultValue;
    },
    
    /**
     * Sanitiza um CPF removendo caracteres não numéricos
     * @param {string} cpf - CPF a ser sanitizado
     * @returns {string} - CPF sanitizado
     */
    sanitizeCPF(cpf) {
        if (typeof cpf !== 'string') {
            return '';
        }
        
        // Remover todos os caracteres não numéricos
        return cpf.replace(/\D/g, '');
    },
    
    /**
     * Sanitiza um número de telefone removendo caracteres não numéricos
     * @param {string} phone - Telefone a ser sanitizado
     * @returns {string} - Telefone sanitizado
     */
    sanitizePhone(phone) {
        if (typeof phone !== 'string') {
            return '';
        }
        
        // Remover todos os caracteres não numéricos
        return phone.replace(/\D/g, '');
    },
    
    /**
     * Sanitiza um CEP removendo caracteres não numéricos
     * @param {string} cep - CEP a ser sanitizado
     * @returns {string} - CEP sanitizado
     */
    sanitizeCEP(cep) {
        if (typeof cep !== 'string') {
            return '';
        }
        
        // Remover todos os caracteres não numéricos
        return cep.replace(/\D/g, '');
    },
    
    /**
     * Sanitiza um nome para evitar caracteres inválidos
     * @param {string} name - Nome a ser sanitizado
     * @returns {string} - Nome sanitizado
     */
    sanitizeName(name) {
        if (typeof name !== 'string') {
            return '';
        }
        
        // Remover caracteres especiais, permitindo apenas letras, espaços e alguns caracteres
        return name.replace(/[^\p{L}\p{M}\s\-'.]/gu, '').trim();
    },
    
    /**
     * Sanitiza um identificador (ID, slug, etc.)
     * @param {string} id - Identificador a ser sanitizado
     * @returns {string} - Identificador sanitizado
     */
    sanitizeIdentifier(id) {
        if (typeof id !== 'string') {
            return '';
        }
        
        // Remover caracteres especiais, permitindo apenas letras, números, traços e sublinhados
        return id.replace(/[^a-zA-Z0-9\-_]/g, '').trim();
    }
};

// Exportando também a versão de classe para compatibilidade com código legado
export class SanitizeUtils {
    static sanitizeText(text) {
        return sanitizeUtils.sanitizeText(text);
    }
    
    static sanitizeHTML(html) {
        return sanitizeUtils.sanitizeHTML(html);
    }
    
    static sanitizeObject(obj) {
        return sanitizeUtils.sanitizeObject(obj);
    }
    
    static sanitizeNumber(value, options = {}) {
        return sanitizeUtils.sanitizeNumber(value, options);
    }
    
    static sanitizeDate(value, options = {}) {
        return sanitizeUtils.sanitizeDate(value, options);
    }
    
    static sanitizeEmail(email) {
        return sanitizeUtils.sanitizeEmail(email);
    }
    
    static sanitizeURL(url, options = {}) {
        return sanitizeUtils.sanitizeURL(url, options);
    }
    
    static sanitizeBoolean(value, defaultValue = false) {
        return sanitizeUtils.sanitizeBoolean(value, defaultValue);
    }
    
    static sanitizeCPF(cpf) {
        return sanitizeUtils.sanitizeCPF(cpf);
    }
    
    static sanitizePhone(phone) {
        return sanitizeUtils.sanitizePhone(phone);
    }
    
    static sanitizeCEP(cep) {
        return sanitizeUtils.sanitizeCEP(cep);
    }
    
    static sanitizeName(name) {
        return sanitizeUtils.sanitizeName(name);
    }
    
    static sanitizeIdentifier(id) {
        return sanitizeUtils.sanitizeIdentifier(id);
    }
}

export default sanitizeUtils;