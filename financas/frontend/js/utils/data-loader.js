// /frontend/js/utils/data-loader.js
// Gerenciador de carregamento de dados com suporte a carga paralela e estados de carregamento

/**
 * Classe responsável pelo carregamento eficiente de dados da aplicação
 * com suporte a carregamento paralelo, batch processing e recuperação de erros
 */
export class DataLoader {
    /**
     * @param {Object} storageManager - Instância do gerenciador de armazenamento
     * @param {Object} options - Opções de configuração
     * @param {number} options.batchSize - Tamanho do lote para processamento em batch (padrão: 100)
     * @param {number} options.retryAttempts - Número de tentativas após falha (padrão: 3)
     * @param {number} options.retryDelay - Atraso em ms entre tentativas (padrão: 1000)
     */
    constructor(storageManager, options = {}) {
        this.storageManager = storageManager;
        this.batchSize = options.batchSize || 100;
        this.retryAttempts = options.retryAttempts || 3;
        this.retryDelay = options.retryDelay || 1000;
        
        // Estado de carregamento
        this.loadingState = {
            categories: { status: 'idle', progress: 0, error: null },
            transactions: { status: 'idle', progress: 0, error: null },
            budgets: { status: 'idle', progress: 0, error: null },
            goals: { status: 'idle', progress: 0, error: null },
            settings: { status: 'idle', progress: 0, error: null }
        };
        
        // NOVO: Armazenamento para dados carregados
        this.loadedData = {
            categories: null,
            transactions: null,
            budgets: null,
            goals: null,
            settings: null
        };
        
        // Callbacks para atualização de estado
        this.stateUpdateCallbacks = [];
    }
    
    /**
     * NOVO: Retorna os dados atualmente carregados na memória
     * @returns {Object} - Objeto com todos os dados carregados
     */
    getLoadedData() {
        return {
            categories: this.loadedData.categories || {},
            transactions: this.loadedData.transactions || [],
            budgets: this.loadedData.budgets || [],
            goals: this.loadedData.goals || [],
            settings: this.loadedData.settings || {}
        };
    }
    
    /**
     * NOVO: Limpa os dados carregados da memória
     * Útil para forçar um recarregamento completo ou liberar memória
     */
    clearLoadedData() {
        this.loadedData = {
            categories: null,
            transactions: null,
            budgets: null,
            goals: null,
            settings: null
        };
        
        // Resetar estados para idle
        Object.keys(this.loadingState).forEach(key => {
            this.loadingState[key] = { status: 'idle', progress: 0, error: null };
        });
        
        // Notificar sobre limpeza
        this.notifyStateUpdate('all', { status: 'idle', progress: 0, error: null });
    }
    
    /**
     * Registra um callback para notificações de atualização de estado
     * @param {Function} callback - Função callback para receber atualizações
     */
    onStateUpdate(callback) {
        if (typeof callback === 'function') {
            this.stateUpdateCallbacks.push(callback);
        }
    }
    
    /**
     * Notifica todos os listeners sobre mudanças no estado de carregamento
     * @param {string} dataType - Tipo de dados sendo carregado
     * @param {Object} state - Estado atual do carregamento
     */
    notifyStateUpdate(dataType, state) {
        if (dataType !== 'all') {
            this.loadingState[dataType] = state;
        }
        
        // Notificar todos os callbacks registrados
        this.stateUpdateCallbacks.forEach(callback => {
            try {
                callback({
                    dataType,
                    state: { ...state },
                    allStates: { ...this.loadingState }
                });
            } catch (error) {
                console.error('Erro ao notificar atualização de estado:', error);
            }
        });
    }
    
    /**
     * Retorna o estado geral do carregamento
     * @returns {string} - Estado geral ('idle', 'loading', 'success', 'partial', 'error')
     */
    getOverallStatus() {
        const states = Object.values(this.loadingState).map(s => s.status);
        
        if (states.every(s => s === 'idle')) return 'idle';
        if (states.some(s => s === 'loading')) return 'loading';
        if (states.every(s => s === 'success')) return 'success';
        if (states.some(s => s === 'error')) return 'error';
        return 'partial'; // Alguns sucessos, alguns erros
    }
    
    /**
     * Carrega todos os dados necessários em paralelo
     * @returns {Promise<Object>} - Promise com resultados do carregamento
     */
    async loadAllData() {
        try {
            // Iniciar carregamento paralelo
            const promises = [
                this.loadCategories(),
                this.loadTransactions(),
                this.loadBudgets(),
                this.loadGoals(),
                this.loadSettings()
            ];
            
            // Await em paralelo
            const results = await Promise.allSettled(promises);
            
            // Processar resultados
            const finalResults = {
                categories: results[0].status === 'fulfilled' ? results[0].value : null,
                transactions: results[1].status === 'fulfilled' ? results[1].value : null,
                budgets: results[2].status === 'fulfilled' ? results[2].value : null,
                goals: results[3].status === 'fulfilled' ? results[3].value : null,
                settings: results[4].status === 'fulfilled' ? results[4].value : null
            };
            
            // NOVO: Armazenar resultados para acesso futuro
            this.loadedData = {
                categories: finalResults.categories,
                transactions: finalResults.transactions,
                budgets: finalResults.budgets,
                goals: finalResults.goals,
                settings: finalResults.settings
            };
            
            // Retornar resultados combinados
            return {
                success: results.every(r => r.status === 'fulfilled'),
                partial: results.some(r => r.status === 'fulfilled'),
                results: finalResults
            };
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            return {
                success: false,
                partial: false,
                error
            };
        }
    }
    
    /**
     * Carrega categorias com suporte a estados de carregamento
     * @returns {Promise<Array>} - Promise com categorias carregadas
     */
    async loadCategories() {
        return await this.loadDataWithRetry('categories', async () => {
            const categories = this.storageManager.getCategories();
            
            // Se não existirem categorias, carregar padrões
            if (!categories || Object.keys(categories).length === 0 || 
                !categories.income || !categories.expense || 
                categories.income.length === 0 || categories.expense.length === 0) {
                
                // Gerar categorias padrão (usando método existente da aplicação)
                const defaultCategories = this.getDefaultCategories();
                
                // Armazenar categorias padrão
                this.storageManager.setCategories(defaultCategories);
                
                // NOVO: Armazenar em memória
                this.loadedData.categories = defaultCategories;
                
                return defaultCategories;
            }
            
            // NOVO: Armazenar em memória
            this.loadedData.categories = categories;
            
            return categories;
        });
    }
    
    /**
     * Carrega transações com suporte a processamento em lotes e estados de carregamento
     * @returns {Promise<Array>} - Promise com transações carregadas
     */
    async loadTransactions() {
        return await this.loadDataWithRetry('transactions', async () => {
            // Atualizar estado
            this.notifyStateUpdate('transactions', { 
                status: 'loading', 
                progress: 10, 
                error: null 
            });
            
            // Obter quantidade de transações
            const count = await this.storageManager.getTransactionCount();
            
            // Se não houver muitas transações, carregar tudo de uma vez
            if (count <= this.batchSize) {
                const transactions = await this.storageManager.getTransactions();
                this.notifyStateUpdate('transactions', { 
                    status: 'loading', 
                    progress: 100, 
                    error: null 
                });
                
                // NOVO: Armazenar em memória
                this.loadedData.transactions = transactions;
                
                return transactions;
            }
            
            // Carregar em lotes para conjuntos maiores de dados
            const transactions = [];
            const totalBatches = Math.ceil(count / this.batchSize);
            
            for (let i = 0; i < totalBatches; i++) {
                // Atualizar progresso
                const progress = Math.round((i / totalBatches) * 100);
                this.notifyStateUpdate('transactions', { 
                    status: 'loading', 
                    progress, 
                    error: null 
                });
                
                // Carregar lote
                const batch = await this.storageManager.getTransactionBatch(i * this.batchSize, this.batchSize);
                transactions.push(...batch);
                
                // Permitir que a interface atualize entre lotes
                await new Promise(resolve => setTimeout(resolve, 0));
            }
            
            // Concluído
            this.notifyStateUpdate('transactions', { 
                status: 'loading', 
                progress: 100, 
                error: null 
            });
            
            // NOVO: Armazenar em memória
            this.loadedData.transactions = transactions;
            
            return transactions;
        });
    }
    
    /**
     * Carrega orçamentos com suporte a estados de carregamento
     * @returns {Promise<Array>} - Promise com orçamentos carregados
     */
    async loadBudgets() {
        return await this.loadDataWithRetry('budgets', async () => {
            // Implementar quando o StorageManager tiver o método correspondente
            // Por enquanto, retornar uma array vazia
            const budgets = [];
            
            // NOVO: Armazenar em memória
            this.loadedData.budgets = budgets;
            
            return budgets;
        });
    }
    
    /**
     * Carrega metas com suporte a estados de carregamento
     * @returns {Promise<Array>} - Promise com metas carregadas
     */
    async loadGoals() {
        return await this.loadDataWithRetry('goals', async () => {
            // Implementar quando o StorageManager tiver o método correspondente
            // Por enquanto, retornar uma array vazia
            const goals = [];
            
            // NOVO: Armazenar em memória
            this.loadedData.goals = goals;
            
            return goals;
        });
    }
    
    /**
     * Carrega configurações com suporte a estados de carregamento
     * @returns {Promise<Object>} - Promise com configurações carregadas
     */
    async loadSettings() {
        return await this.loadDataWithRetry('settings', async () => {
            // Implementar quando o StorageManager tiver o método correspondente
            // Por enquanto, retornar um objeto vazio
            const settings = {};
            
            // NOVO: Armazenar em memória
            this.loadedData.settings = settings;
            
            return settings;
        });
    }
    
    /**
     * Carrega dados com suporte a retentativas e notificações de estado
     * @param {string} dataType - Tipo de dados sendo carregado
     * @param {Function} loadFunction - Função que realiza o carregamento
     * @returns {Promise<any>} - Dados carregados
     */
    async loadDataWithRetry(dataType, loadFunction) {
        let attempts = 0;
        
        // Atualizar estado para 'carregando'
        this.notifyStateUpdate(dataType, { 
            status: 'loading', 
            progress: 0, 
            error: null 
        });
        
        while (attempts < this.retryAttempts) {
            try {
                // Tentar carregar dados
                const data = await loadFunction();
                
                // Sucesso - atualizar estado e retornar dados
                this.notifyStateUpdate(dataType, { 
                    status: 'success', 
                    progress: 100, 
                    error: null 
                });
                
                return data;
            } catch (error) {
                attempts++;
                
                // Atualizar estado com erro
                this.notifyStateUpdate(dataType, { 
                    status: 'error', 
                    progress: 0, 
                    error: error.message,
                    attemptCount: attempts
                });
                
                if (attempts >= this.retryAttempts) {
                    // Falha final após todas as tentativas
                    throw error;
                }
                
                // Esperar antes de tentar novamente
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
            }
        }
    }
    
    /**
     * NOVO: Recarrega um tipo específico de dados
     * @param {string} dataType - Tipo de dados a recarregar ('categories', 'transactions', etc.)
     * @returns {Promise<any>} - Dados recarregados
     */
    async reloadData(dataType) {
        // Limpar apenas os dados específicos
        if (this.loadedData[dataType]) {
            this.loadedData[dataType] = null;
        }
        
        // Chamar o método de carregamento apropriado
        switch (dataType) {
            case 'categories':
                return await this.loadCategories();
            case 'transactions':
                return await this.loadTransactions();
            case 'budgets':
                return await this.loadBudgets();
            case 'goals':
                return await this.loadGoals();
            case 'settings':
                return await this.loadSettings();
            default:
                throw new Error(`Tipo de dados desconhecido: ${dataType}`);
        }
    }
    
    /**
     * Retorna categorias padrão
     * Esta é uma cópia do método na classe FinControlApp para facilitar a independência
     * @returns {Object} - Categorias padrão
     */
    getDefaultCategories() {
        return {
            income: [
                { id: 'salary', name: 'Salário', icon: 'fa-money-bill-wave' },
                { id: 'investment', name: 'Investimentos', icon: 'fa-chart-line' },
                { id: 'gift', name: 'Presentes', icon: 'fa-gift' },
                { id: 'other_income', name: 'Outros', icon: 'fa-plus-circle' }
            ],
            expense: [
                { id: 'housing', name: 'Moradia', icon: 'fa-home' },
                { id: 'food', name: 'Alimentação', icon: 'fa-utensils' },
                { id: 'transport', name: 'Transporte', icon: 'fa-car' },
                { id: 'utilities', name: 'Contas', icon: 'fa-file-invoice' },
                { id: 'healthcare', name: 'Saúde', icon: 'fa-heartbeat' },
                { id: 'entertainment', name: 'Lazer', icon: 'fa-film' },
                { id: 'education', name: 'Educação', icon: 'fa-graduation-cap' },
                { id: 'shopping', name: 'Compras', icon: 'fa-shopping-bag' },
                { id: 'personal', name: 'Pessoal', icon: 'fa-user' },
                { id: 'other_expense', name: 'Outros', icon: 'fa-minus-circle' }
            ]
        };
    }
}