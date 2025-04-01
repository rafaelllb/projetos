// /frontend/js/transactions/transaction-manager.js
// Gerenciador de transações da aplicação

/**
 * Classe responsável por gerenciar as transações financeiras
 */
export class TransactionManager {
    /**
     * @param {Object} storageManager - Instância do gerenciador de armazenamento
     */
    constructor(storageManager) {
        this.storageManager = storageManager;
    }
    
    /**
     * Adiciona uma nova transação
     * @param {Object} transaction - Dados da transação
     * @returns {Promise} - Promise que resolve com o resultado da operação
     */
    async addTransaction(transaction) {
        // Validar transação
        if (!this.validateTransaction(transaction)) {
            throw new Error('Dados da transação inválidos');
        }
        
        // Sanitizar transação
        const sanitizedTransaction = this.sanitizeTransaction(transaction);
        
        // Adicionar à lista de transações
        await this.storageManager.addTransaction(sanitizedTransaction);
        
        return sanitizedTransaction;
    }
    
    /**
     * Recupera todas as transações
     * @returns {Promise<Array>} - Promise que resolve com a lista de transações
     */
    async getTransactions() {
        try {
            // If using IndexedDB
            if (this.storageManager.useIndexedDB && this.storageManager.db) {
                try {
                    return await this.storageManager.getFromIndexedDB('transactions');
                } catch (error) {
                    console.error('Error retrieving transactions from IndexedDB:', error);
                    // Fallback to localStorage
                    return this.storageManager.getLocalStorage(this.storageManager.storageKeys.TRANSACTIONS) || [];
                }
            } else {
                // Use localStorage as fallback
                return this.storageManager.getLocalStorage(this.storageManager.storageKeys.TRANSACTIONS) || [];
            }
        } catch (error) {
            console.error('Error in getTransactions:', error);
            return []; // Return empty array as fallback
        }
    }
    
    /**
     * Recupera uma transação específica
     * @param {string} id - ID da transação
     * @returns {Promise<Object|null>} - Promise que resolve com a transação ou null
     */
    async getTransaction(id) {
        const transactions = await this.getTransactions();
        return transactions.find(transaction => transaction.id === id) || null;
    }
    
    /**
     * Atualiza uma transação existente
     * @param {string} id - ID da transação
     * @param {Object} updatedData - Novos dados da transação
     * @returns {Promise<Object>} - Promise que resolve com a transação atualizada
     */
    async updateTransaction(id, updatedData) {
        // Obter transação existente
        const transactions = await this.getTransactions();
        const index = transactions.findIndex(transaction => transaction.id === id);
        
        if (index === -1) {
            throw new Error('Transação não encontrada');
        }
        
        // Mesclar dados atuais com atualizações
        const updatedTransaction = {
            ...transactions[index],
            ...updatedData,
            updatedAt: new Date().toISOString()
        };
        
        // Validar transação atualizada
        if (!this.validateTransaction(updatedTransaction)) {
            throw new Error('Dados da transação inválidos');
        }
        
        // Sanitizar transação
        const sanitizedTransaction = this.sanitizeTransaction(updatedTransaction);
        
        // Atualizar transação na lista
        transactions[index] = sanitizedTransaction;
        
        // Salvar lista atualizada
        await this.storageManager.setTransactions(transactions);
        
        return sanitizedTransaction;
    }
    
    /**
     * Remove uma transação
     * @param {string} id - ID da transação
     * @returns {Promise<boolean>} - Promise que resolve com o resultado da operação
     */
    async removeTransaction(id) {
        // Obter transações
        const transactions = await this.getTransactions();
        const filteredTransactions = transactions.filter(transaction => transaction.id !== id);
        
        // Verificar se a transação foi encontrada
        if (filteredTransactions.length === transactions.length) {
            return false;
        }
        
        // Salvar lista atualizada
        await this.storageManager.setTransactions(filteredTransactions);
        
        return true;
    }
    
    /**
     * Filtra transações por critérios
     * @param {Object} filters - Critérios de filtragem
     * @returns {Promise<Array>} - Promise que resolve com a lista de transações filtradas
     */
    async filterTransactions(filters = {}) {
        const transactions = await this.getTransactions();
        
        return transactions.filter(transaction => {
            // Filtrar por tipo
            if (filters.type && transaction.type !== filters.type) {
                return false;
            }
            
            // Filtrar por categoria
            if (filters.category && transaction.category !== filters.category) {
                return false;
            }
            
            // Filtrar por data de início
            if (filters.startDate) {
                const startDate = new Date(filters.startDate);
                const transactionDate = new Date(transaction.date);
                if (transactionDate < startDate) {
                    return false;
                }
            }
            
            // Filtrar por data de fim
            if (filters.endDate) {
                const endDate = new Date(filters.endDate);
                const transactionDate = new Date(transaction.date);
                if (transactionDate > endDate) {
                    return false;
                }
            }
            
            // Filtrar por valor mínimo
            if (filters.minAmount !== undefined && transaction.amount < filters.minAmount) {
                return false;
            }
            
            // Filtrar por valor máximo
            if (filters.maxAmount !== undefined && transaction.amount > filters.maxAmount) {
                return false;
            }
            
            // Filtrar por texto na descrição
            if (filters.searchText) {
                const searchText = filters.searchText.toLowerCase();
                const description = transaction.description.toLowerCase();
                if (!description.includes(searchText)) {
                    return false;
                }
            }
            
            return true;
        });
    }
    
    /**
     * Valida os dados de uma transação
     * @param {Object} transaction - Dados da transação
     * @returns {boolean} - Resultado da validação
     */
    validateTransaction(transaction) {
        // Verificar campos obrigatórios
        if (!transaction || 
            !transaction.type || 
            !transaction.description || 
            !transaction.amount || 
            !transaction.category || 
            !transaction.date) {
            return false;
        }
        
        // Validar tipo
        if (transaction.type !== 'income' && transaction.type !== 'expense') {
            return false;
        }
        
        // Validar descrição
        if (typeof transaction.description !== 'string' || transaction.description.trim() === '') {
            return false;
        }
        
        // Validar valor
        if (typeof transaction.amount !== 'number' || isNaN(transaction.amount) || transaction.amount <= 0) {
            return false;
        }
        
        // Validar categoria
        if (typeof transaction.category !== 'string' || transaction.category.trim() === '') {
            return false;
        }
        
        // Validar data
        try {
            const date = new Date(transaction.date);
            if (isNaN(date.getTime())) {
                return false;
            }
        } catch (error) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Sanitiza os dados de uma transação
     * @param {Object} transaction - Dados da transação
     * @returns {Object} - Dados sanitizados
     */
    sanitizeTransaction(transaction) {
        // Fazer cópia para evitar modificar o original
        const sanitized = { ...transaction };
        
        // Sanitizar campos de texto
        if (sanitized.description) {
            sanitized.description = this.sanitizeText(sanitized.description);
        }
        
        if (sanitized.notes) {
            sanitized.notes = this.sanitizeText(sanitized.notes);
        }
        
        // Sanitizar valores numéricos
        if (sanitized.amount) {
            sanitized.amount = Math.abs(parseFloat(sanitized.amount));
        }
        
        return sanitized;
    }
    
    /**
     * Sanitiza texto para evitar injeção de código
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
    }
    
    /**
     * Calcula o saldo total de todas as transações
     * @returns {Promise<number>} - Promise que resolve com o saldo
     */
    async calculateBalance() {
        const transactions = await this.getTransactions();
        
        return transactions.reduce((balance, transaction) => {
            if (transaction.type === 'income') {
                return balance + transaction.amount;
            } else {
                return balance - transaction.amount;
            }
        }, 0);
    }
    
    /**
     * Calcula receitas e despesas em um período
     * @param {Date} startDate - Data de início
     * @param {Date} endDate - Data de fim
     * @returns {Promise<Object>} - Promise que resolve com receitas e despesas
     */
    async calculatePeriodSummary(startDate, endDate) {
        const transactions = await this.filterTransactions({
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
        });
        
        let income = 0;
        let expense = 0;
        
        transactions.forEach(transaction => {
            if (transaction.type === 'income') {
                income += transaction.amount;
            } else {
                expense += transaction.amount;
            }
        });
        
        return {
            income,
            expense,
            balance: income - expense
        };
    }
    
    /**
     * Exporta transações em formato CSV
     * @param {Array} transactions - Lista de transações a serem exportadas
     * @returns {string} - Conteúdo CSV
     */
    exportTransactionsToCSV(transactions) {
        if (!transactions || transactions.length === 0) {
            return '';
        }
        
        // Cabeçalhos
        const headers = ['ID', 'Tipo', 'Descrição', 'Valor', 'Categoria', 'Data', 'Criado Em'];
        
        // Linhas
        const rows = transactions.map(transaction => [
            transaction.id,
            transaction.type === 'income' ? 'Receita' : 'Despesa',
            `"${transaction.description.replace(/"/g, '""')}"`,
            transaction.amount.toFixed(2),
            transaction.category,
            new Date(transaction.date).toLocaleDateString('pt-BR'),
            new Date(transaction.createdAt).toLocaleString('pt-BR')
        ]);
        
        // Juntar tudo
        return [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');
    }
}
