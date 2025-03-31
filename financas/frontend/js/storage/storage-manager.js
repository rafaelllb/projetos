// /frontend/js/storage/storage-manager.js
// Gerenciador de armazenamento da aplicação

/**
 * Classe responsável por gerenciar o armazenamento de dados da aplicação
 * Implementa uma estratégia mista de armazenamento usando localStorage, 
 * sessionStorage e IndexedDB dependendo do tipo de dados e do usuário
 */
export class StorageManager {
    constructor() {
        this.storageKeys = {
            USER: 'fincontrol_user',
            TRANSACTIONS: 'fincontrol_transactions',
            CATEGORIES: 'fincontrol_categories',
            SETTINGS: 'fincontrol_settings',
            BUDGETS: 'fincontrol_budgets',
            GOALS: 'fincontrol_goals'
        };
        
        // Inicializar IndexedDB
        this.initIndexedDB();
    }
    
    /**
     * Inicializa o IndexedDB para armazenamento de dados mais complexos
     */
    async initIndexedDB() {
        try {
            // Verificar se o navegador suporta IndexedDB
            if (!window.indexedDB) {
                console.warn('Seu navegador não suporta IndexedDB. Usando localStorage como fallback.');
                this.useIndexedDB = false;
                return;
            }
            
            this.useIndexedDB = true;
            
            // Abrir ou criar o banco de dados
            const request = window.indexedDB.open('FinControlDB', 1);
            
            // Tratar erros
            request.onerror = (event) => {
                console.error('Erro ao abrir IndexedDB:', event.target.error);
                this.useIndexedDB = false;
            };
            
            // Atualizar estrutura se necessário
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Criar object stores
                if (!db.objectStoreNames.contains('transactions')) {
                    const transactionStore = db.createObjectStore('transactions', { keyPath: 'id' });
                    transactionStore.createIndex('date', 'date', { unique: false });
                    transactionStore.createIndex('type', 'type', { unique: false });
                    transactionStore.createIndex('category', 'category', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('categories')) {
                    db.createObjectStore('categories', { keyPath: 'id' });
                }
                
                if (!db.objectStoreNames.contains('budgets')) {
                    db.createObjectStore('budgets', { keyPath: 'id' });
                }
                
                if (!db.objectStoreNames.contains('goals')) {
                    db.createObjectStore('goals', { keyPath: 'id' });
                }
            };
            
            // Armazenar referência ao banco de dados após abertura bem-sucedida
            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('IndexedDB inicializado com sucesso');
            };
        } catch (error) {
            console.error('Erro ao inicializar IndexedDB:', error);
            this.useIndexedDB = false;
        }
    }
    
    /**
     * Armazena dados no IndexedDB
     * @param {string} storeName - Nome do object store
     * @param {Object} data - Dados a serem armazenados
     * @returns {Promise} - Promise que resolve quando a operação é concluída
     */
    storeInIndexedDB(storeName, data) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('IndexedDB não está disponível'));
                return;
            }
            
            try {
                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                
                // Adicionar ou atualizar dados
                const request = store.put(data);
                
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    }
    
    /**
     * Recupera dados do IndexedDB
     * @param {string} storeName - Nome do object store
     * @param {string|null} key - Chave do item (se null, recupera todos)
     * @returns {Promise} - Promise que resolve com os dados recuperados
     */
    getFromIndexedDB(storeName, key = null) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('IndexedDB não está disponível'));
                return;
            }
            
            try {
                const transaction = this.db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                
                let request;
                
                if (key !== null) {
                    // Recuperar item específico
                    request = store.get(key);
                    
                    request.onsuccess = () => resolve(request.result);
                } else {
                    // Recuperar todos os itens
                    const results = [];
                    request = store.openCursor();
                    
                    request.onsuccess = (event) => {
                        const cursor = event.target.result;
                        
                        if (cursor) {
                            results.push(cursor.value);
                            cursor.continue();
                        } else {
                            resolve(results);
                        }
                    };
                }
                
                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    }
    
    /**
     * Remove dados do IndexedDB
     * @param {string} storeName - Nome do object store
     * @param {string} key - Chave do item a ser removido
     * @returns {Promise} - Promise que resolve quando a operação é concluída
     */
    removeFromIndexedDB(storeName, key) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('IndexedDB não está disponível'));
                return;
            }
            
            try {
                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                
                const request = store.delete(key);
                
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    }
    
    /**
     * Armazena dados no localStorage
     * @param {string} key - Chave de armazenamento
     * @param {any} data - Dados a serem armazenados
     */
    setLocalStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error('Erro ao armazenar no localStorage:', error);
        }
    }
    
    /**
     * Recupera dados do localStorage
     * @param {string} key - Chave de armazenamento
     * @returns {any} - Dados recuperados ou null se não existirem
     */
    getLocalStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Erro ao recuperar do localStorage:', error);
            return null;
        }
    }
    
    /**
     * Armazena dados no sessionStorage
     * @param {string} key - Chave de armazenamento
     * @param {any} data - Dados a serem armazenados
     */
    setSessionStorage(key, data) {
        try {
            sessionStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error('Erro ao armazenar no sessionStorage:', error);
        }
    }
    
    /**
     * Recupera dados do sessionStorage
     * @param {string} key - Chave de armazenamento
     * @returns {any} - Dados recuperados ou null se não existirem
     */
    getSessionStorage(key) {
        try {
            const data = sessionStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Erro ao recuperar do sessionStorage:', error);
            return null;
        }
    }
    
    /**
     * Define o usuário atual
     * @param {Object} user - Informações do usuário
     */
    setUser(user) {
        // Armazenar no sessionStorage para persistir apenas durante a sessão
        this.setSessionStorage(this.storageKeys.USER, user);
    }
    
    /**
     * Recupera o usuário atual
     * @returns {Object|null} - Usuário atual ou null se não estiver autenticado
     */
    getUser() {
        return this.getSessionStorage(this.storageKeys.USER);
    }
    
    /**
     * Armazena ou atualiza transações
     * @param {Array} transactions - Lista de transações
     */
    async setTransactions(transactions) {
        if (this.useIndexedDB && this.db) {
            try {
                // Limpar todas as transações existentes
                const transaction = this.db.transaction(['transactions'], 'readwrite');
                const store = transaction.objectStore('transactions');
                store.clear();
                
                // Adicionar novas transações uma a uma
                const promises = transactions.map(transaction => 
                    this.storeInIndexedDB('transactions', transaction)
                );
                
                await Promise.all(promises);
            } catch (error) {
                console.error('Erro ao armazenar transações no IndexedDB:', error);
                // Fallback para localStorage
                this.setLocalStorage(this.storageKeys.TRANSACTIONS, transactions);
            }
        } else {
            // Usar localStorage como fallback
            this.setLocalStorage(this.storageKeys.TRANSACTIONS, transactions);
        }
    }
    
    /**
     * Adiciona uma nova transação
     * @param {Object} transaction - Transação a ser adicionada
     */
    async addTransaction(transaction) {
        // Sanitizar dados
        transaction = this.sanitizeData(transaction);
        
        if (this.useIndexedDB && this.db) {
            try {
                await this.storeInIndexedDB('transactions', transaction);
            } catch (error) {
                console.error('Erro ao adicionar transação no IndexedDB:', error);
                // Fallback para localStorage
                const transactions = this.getTransactions();
                transactions.push(transaction);
                this.setLocalStorage(this.storageKeys.TRANSACTIONS, transactions);
            }
        } else {
            // Usar localStorage como fallback
            const transactions = this.getTransactions();
            transactions.push(transaction);
            this.setLocalStorage(this.storageKeys.TRANSACTIONS, transactions);
        }
    }
    
    /**
     * Recupera todas as transações
     * @returns {Array} - Lista de transações
     */
    async getTransactions() {
        if (this.useIndexedDB && this.db) {
            try {
                return await this.getFromIndexedDB('transactions');
            } catch (error) {
                console.error('Erro ao recuperar transações do IndexedDB:', error);
                // Fallback para localStorage
                return this.getLocalStorage(this.storageKeys.TRANSACTIONS) || [];
            }
        } else {
            // Usar localStorage como fallback
            return this.getLocalStorage(this.storageKeys.TRANSACTIONS) || [];
        }
    }
    
    /**
     * Armazena ou atualiza categorias
     * @param {Object} categories - Objeto com categorias
     */
    setCategories(categories) {
        // Sanitizar dados
        categories = this.sanitizeData(categories);
        
        // Armazenar no localStorage para acesso rápido
        this.setLocalStorage(this.storageKeys.CATEGORIES, categories);
    }
    
    /**
     * Recupera todas as categorias
     * @returns {Object} - Objeto com categorias
     */
    getCategories() {
        return this.getLocalStorage(this.storageKeys.CATEGORIES) || { income: [], expense: [] };
    }
    
    /**
     * Sanitiza os dados antes de armazená-los
     * @param {any} data - Dados a serem sanitizados
     * @returns {any} - Dados sanitizados
     */
    sanitizeData(data) {
        if (typeof data === 'string') {
            // Remover scripts e tags HTML
            return data
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/<[^>]*>/g, '');
        } else if (Array.isArray(data)) {
            // Sanitizar cada item do array
            return data.map(item => this.sanitizeData(item));
        } else if (typeof data === 'object' && data !== null) {
            // Sanitizar cada propriedade do objeto
            const sanitized = {};
            for (const key in data) {
                if (Object.prototype.hasOwnProperty.call(data, key)) {
                    sanitized[key] = this.sanitizeData(data[key]);
                }
            }
            return sanitized;
        }
        
        // Retornar outros tipos de dados sem alterações
        return data;
    }
    
    /**
     * Limpa todos os dados armazenados
     */
    clearAllData() {
        // Limpar localStorage
        localStorage.removeItem(this.storageKeys.USER);
        localStorage.removeItem(this.storageKeys.TRANSACTIONS);
        localStorage.removeItem(this.storageKeys.CATEGORIES);
        localStorage.removeItem(this.storageKeys.SETTINGS);
        localStorage.removeItem(this.storageKeys.BUDGETS);
        localStorage.removeItem(this.storageKeys.GOALS);
        
        // Limpar sessionStorage
        sessionStorage.removeItem(this.storageKeys.USER);
        
        // Limpar IndexedDB
        if (this.useIndexedDB && this.db) {
            try {
                const transaction = this.db.transaction(['transactions', 'categories', 'budgets', 'goals'], 'readwrite');
                transaction.objectStore('transactions').clear();
                transaction.objectStore('categories').clear();
                transaction.objectStore('budgets').clear();
                transaction.objectStore('goals').clear();
            } catch (error) {
                console.error('Erro ao limpar IndexedDB:', error);
            }
        }
    }
}
