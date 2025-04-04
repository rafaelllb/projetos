/**
 * Gerenciador de instâncias singleton para toda a aplicação
 */
class SingletonManager {
    /**
     * @constructor
     */
    constructor() {
        this.instances = {};
    }
    
    /**
     * Registra uma instância singleton
     * @param {string} key - Chave de identificação
     * @param {Object} instance - Instância do objeto
     */
    register(key, instance) {
        this.instances[key] = instance;
    }
    
    /**
     * Obtém uma instância singleton
     * @param {string} key - Chave de identificação
     * @returns {Object|null} - Instância registrada ou null
     */
    get(key) {
        return this.instances[key] || null;
    }
    
    /**
     * Verifica se uma instância está registrada
     * @param {string} key - Chave de identificação
     * @returns {boolean} - Se a instância existe
     */
    has(key) {
        return !!this.instances[key];
    }
}

// Exportar uma instância singleton do gerenciador
export const singletonManager = new SingletonManager();