// /frontend/js/transactions/transaction-manager.js
// Gerenciador de transações da aplicação - Refatorado para usar singletonManager

import { sanitizeUtils } from '../utils/sanitize-utils.js';
import { validationUtils } from '../utils/validation-utils.js';
import { dateUtils } from '../utils/date-utils.js';
import { singletonManager } from '../utils/singleton-manager.js';

/**
 * Classe responsável por gerenciar as transações financeiras
 */
export class TransactionManager {
    /**
     * Construtor do TransactionManager
     */
    constructor() {
        this._isInitialized = false;
        this._initializationPromise = null;
        
        // Registrar no singletonManager
        singletonManager.register('transactionManager', this);
        
        // Inicializar assincronamente
        this._initializationPromise = this.initialize();
    }
    
    /**
     * Inicializa o gerenciador de transações
     * @returns {Promise<void>} Promise que resolve quando a inicialização for concluída
     */
    async initialize() {
        if (this._isInitialized) return;
        
        try {
            // Obter storageManager via singletonManager
            this.storageManager = singletonManager.get('storageManager');
            
            // Se o storageManager não foi encontrado, aguardar por ele
            if (!this.storageManager) {
                console.log('TransactionManager: Aguardando StorageManager...');
                this.storageManager = await this._waitForDependency('storageManager', 5000);
                
                // Se ainda não conseguiu obter, importar e criar uma nova instância
                if (!this.storageManager) {
                    console.warn('TransactionManager: StorageManager não encontrado, importando dinamicamente');
                    const StorageManager = (await import('../storage/storage-manager.js')).StorageManager;
                    this.storageManager = new StorageManager();
                    singletonManager.register('storageManager', this.storageManager);
                }
            }
            
            // Garantir que o StorageManager esteja inicializado
            if (typeof this.storageManager.initialize === 'function' && !this.storageManager._isInitialized) {
                await this.storageManager.initialize();
            }
            
            // Verificar se as categorias padrão existem, caso contrário, criar
            const categories = this.storageManager.getCategories();
            if (!categories || !categories.income || !categories.expense) {
                await this.setupDefaultCategories();
            }
            
            this._isInitialized = true;
            console.log('TransactionManager inicializado com sucesso');
            
            // Notificar que o TransactionManager está pronto
            document.dispatchEvent(new CustomEvent('transactionManagerReady', {
                detail: { instance: this }
            }));
        } catch (error) {
            console.error('Erro ao inicializar TransactionManager:', error);
            throw error;
        }
    }
    
    /**
     * Aguarda pela disponibilidade de uma dependência no singletonManager
     * @param {string} dependencyName - Nome da dependência
     * @param {number} timeout - Tempo máximo de espera em ms
     * @returns {Promise<any>} - A dependência ou null se não for encontrada
     * @private
     */
    async _waitForDependency(dependencyName, timeout = 3000) {
        return new Promise(resolve => {
            // Verificar se já está disponível
            const dependency = singletonManager.get(dependencyName);
            if (dependency) {
                return resolve(dependency);
            }
            
            let checkInterval;
            let timeoutId;
            
            // Função para limpar os timers
            const cleanup = () => {
                if (checkInterval) clearInterval(checkInterval);
                if (timeoutId) clearTimeout(timeoutId);
            };
            
            // Verificar periodicamente
            checkInterval = setInterval(() => {
                const dependency = singletonManager.get(dependencyName);
                if (dependency) {
                    cleanup();
                    resolve(dependency);
                }
            }, 100);
            
            // Definir timeout
            timeoutId = setTimeout(() => {
                cleanup();
                console.warn(`TransactionManager: Timeout esperando por ${dependencyName}`);
                resolve(null);
            }, timeout);
        });
    }
    
    /**
     * Configura as categorias padrão
     * @returns {Promise<void>}
     */
    async setupDefaultCategories() {
        const defaultCategories = {
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
        
        try {
            await this.storageManager.setCategories(defaultCategories);
            console.log('Categorias padrão configuradas com sucesso');
        } catch (error) {
            console.error('Erro ao configurar categorias padrão:', error);
            throw error;
        }
    }
    
    /**
     * Retorna a promessa de inicialização
     * @returns {Promise<void>} - Promessa que resolve quando o TransactionManager estiver inicializado
     */
    getInitializationPromise() {
        return this._initializationPromise || Promise.resolve();
    }
    
    /**
     * Adiciona uma nova transação
     * @param {Object} transaction - Dados da transação
     * @returns {Promise} - Promise que resolve com o resultado da operação
     */
    async addTransaction(transaction) {
        // Garantir que o gerenciador esteja inicializado
        if (!this._isInitialized) {
            await this.initialize();
        }
        
        // Validar transação
        if (!this.validateTransaction(transaction)) {
            throw new Error('Dados da transação inválidos');
        }
        
        // Sanitizar transação
        const sanitizedTransaction = this.sanitizeTransaction(transaction);
        
        // Adicionar ID único se não existir
        if (!sanitizedTransaction.id) {
            sanitizedTransaction.id = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        
        // Adicionar timestamp de criação
        sanitizedTransaction.createdAt = new Date().toISOString();
        
        // Adicionar à lista de transações
        try {
            const result = await this.storageManager.addTransaction(sanitizedTransaction);
            
            // Disparar evento de transação adicionada
            document.dispatchEvent(new CustomEvent('transaction:added', {
                detail: { transaction: sanitizedTransaction }
            }));
            
            return result;
        } catch (error) {
            console.error('Erro ao adicionar transação:', error);
            throw error;
        }
    }
    
    /**
     * Recupera todas as transações
     * @returns {Promise<Array>} - Promise que resolve com a lista de transações
     */
    async getTransactions() {
        try {
            // Garantir que o gerenciador esteja inicializado
            if (!this._isInitialized) {
                await this.initialize();
            }
            
            // Usar método de recuperação do StorageManager
            return await this.storageManager.getTransactions();
        } catch (error) {
            console.error('Erro ao recuperar transações:', error);
            return []; // Retornar array vazio como fallback
        }
    }
    
    /**
     * Recupera uma transação específica
     * @param {string} id - ID da transação
     * @returns {Promise<Object|null>} - Promise que resolve com a transação ou null
     */
    async getTransaction(id) {
        try {
            const transactions = await this.getTransactions();
            return transactions.find(transaction => transaction.id === id) || null;
        } catch (error) {
            console.error('Erro ao recuperar transação específica:', error);
            return null;
        }
    }
    
    /**
     * Atualiza uma transação existente
     * @param {string} id - ID da transação
     * @param {Object} updatedData - Novos dados da transação
     * @returns {Promise<Object>} - Promise que resolve com a transação atualizada
     */
    async updateTransaction(id, updatedData) {
        try {
            // Garantir que o gerenciador esteja inicializado
            if (!this._isInitialized) {
                await this.initialize();
            }
            
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
            
            // Disparar evento de transação atualizada
            document.dispatchEvent(new CustomEvent('transaction:updated', {
                detail: { 
                    transaction: sanitizedTransaction,
                    previousTransaction: transactions[index]
                }
            }));
            
            return sanitizedTransaction;
        } catch (error) {
            console.error('Erro ao atualizar transação:', error);
            throw error;
        }
    }
    
    /**
     * Remove uma transação
     * @param {string} id - ID da transação
     * @returns {Promise<boolean>} - Promise que resolve com o resultado da operação
     */
    async removeTransaction(id) {
        try {
            // Garantir que o gerenciador esteja inicializado
            if (!this._isInitialized) {
                await this.initialize();
            }
            
            // Obter transações
            const transactions = await this.getTransactions();
            const transactionToRemove = transactions.find(t => t.id === id);
            
            if (!transactionToRemove) {
                return false;
            }
            
            const filteredTransactions = transactions.filter(transaction => transaction.id !== id);
            
            // Salvar lista atualizada
            await this.storageManager.setTransactions(filteredTransactions);
            
            // Disparar evento de transação removida
            document.dispatchEvent(new CustomEvent('transaction:removed', {
                detail: { transaction: transactionToRemove }
            }));
            
            return true;
        } catch (error) {
            console.error('Erro ao remover transação:', error);
            return false;
        }
    }
    
    /**
     * Filtra transações por critérios
     * @param {Object} filters - Critérios de filtragem
     * @returns {Promise<Array>} - Promise que resolve com a lista de transações filtradas
     */
    async filterTransactions(filters = {}) {
        try {
            // Garantir que o gerenciador esteja inicializado
            if (!this._isInitialized) {
                await this.initialize();
            }
            
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
                    const description = (transaction.description || '').toLowerCase();
                    const notes = (transaction.notes || '').toLowerCase();
                    
                    // Verifica se o texto está na descrição ou nas notas
                    if (!description.includes(searchText) && !notes.includes(searchText)) {
                        return false;
                    }
                }
                
                return true;
            });
        } catch (error) {
            console.error('Erro ao filtrar transações:', error);
            return [];
        }
    }
    
    /**
     * Valida os dados de uma transação
     * @param {Object} transaction - Dados da transação
     * @returns {boolean} - Resultado da validação
     */
    validateTransaction(transaction) {
        // Usar utilitários centralizados para validação
        
        // Verificar campos obrigatórios
        if (!transaction) return false;
        
        // Verificar tipo
        if (!transaction.type || (transaction.type !== 'income' && transaction.type !== 'expense')) {
            return false;
        }
        
        // Verificar descrição
        if (!validationUtils.isValidString(transaction.description)) {
            return false;
        }
        
        // Verificar valor
        if (!validationUtils.isValidNumber(transaction.amount, { min: 0 })) {
            return false;
        }
        
        // Verificar categoria
        if (!validationUtils.isValidString(transaction.category)) {
            return false;
        }
        
        // Verificar data
        if (!validationUtils.isValidDate(transaction.date)) {
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
        // Usar utilitários centralizados para sanitização
        
        // Fazer cópia para evitar modificar o original
        const sanitized = { ...transaction };
        
        // Sanitizar campos de texto
        if (sanitized.description) {
            sanitized.description = sanitizeUtils.sanitizeText(sanitized.description);
        }
        
        if (sanitized.notes) {
            sanitized.notes = sanitizeUtils.sanitizeText(sanitized.notes);
        }
        
        // Sanitizar valores numéricos
        if (sanitized.amount) {
            sanitized.amount = sanitizeUtils.sanitizeNumber(sanitized.amount, { min: 0 });
        }
        
        // Garantir que a data está em formato ISO
        if (sanitized.date && validationUtils.isValidDate(sanitized.date)) {
            const date = new Date(sanitized.date);
            if (!sanitized.date.includes('T')) {
                // Se a data não incluir hora, definir para o início do dia
                sanitized.date = date.toISOString().split('T')[0];
            }
        }
        
        return sanitized;
    }
    
    /**
     * Calcula o saldo total de todas as transações
     * @returns {Promise<number>} - Promise que resolve com o saldo
     */
    async calculateBalance() {
        try {
            const transactions = await this.getTransactions();
            
            return transactions.reduce((balance, transaction) => {
                if (transaction.type === 'income') {
                    return balance + transaction.amount;
                } else {
                    return balance - transaction.amount;
                }
            }, 0);
        } catch (error) {
            console.error('Erro ao calcular saldo:', error);
            return 0;
        }
    }
    
    /**
     * Calcula receitas e despesas em um período
     * @param {Date|string} startDate - Data de início
     * @param {Date|string} endDate - Data de fim
     * @returns {Promise<Object>} - Promise que resolve com receitas e despesas
     */
    async calculatePeriodSummary(startDate, endDate) {
        try {
            // Converter datas para objetos Date se forem strings
            const start = startDate instanceof Date ? startDate : new Date(startDate);
            const end = endDate instanceof Date ? endDate : new Date(endDate);
            
            // Garantir que endDate é o final do dia
            end.setHours(23, 59, 59, 999);
            
            const transactions = await this.filterTransactions({
                startDate: start.toISOString(),
                endDate: end.toISOString()
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
            
            const balance = income - expense;
            const savingsRate = income > 0 ? (balance / income) * 100 : 0;
            
            return {
                startDate: start,
                endDate: end,
                income,
                expense,
                balance,
                savingsRate,
                transactionCount: transactions.length
            };
        } catch (error) {
            console.error('Erro ao calcular resumo do período:', error);
            return { 
                income: 0, 
                expense: 0, 
                balance: 0, 
                savingsRate: 0,
                transactionCount: 0
            };
        }
    }
    
    /**
     * Calcula totais por categoria para um determinado período
     * @param {string} type - Tipo da transação ('income' ou 'expense')
     * @param {Date|string} startDate - Data de início
     * @param {Date|string} endDate - Data de fim
     * @returns {Promise<Object>} - Promise que resolve com totais por categoria
     */
    async calculateCategoryTotals(type, startDate, endDate) {
        try {
            const transactions = await this.filterTransactions({
                type,
                startDate: startDate instanceof Date ? startDate.toISOString() : startDate,
                endDate: endDate instanceof Date ? endDate.toISOString() : endDate
            });
            
            // Agrupar totais por categoria
            const categoryTotals = {};
            const categories = this.storageManager.getCategories()[type] || [];
            
            // Inicializar todas as categorias com zero para garantir que todas apareçam no resultado
            categories.forEach(category => {
                categoryTotals[category.id] = {
                    id: category.id,
                    name: category.name,
                    icon: category.icon,
                    total: 0,
                    count: 0
                };
            });
            
            // Calcular totais
            let totalAmount = 0;
            transactions.forEach(transaction => {
                const categoryId = transaction.category;
                
                if (!categoryTotals[categoryId]) {
                    // Categoria desconhecida, criar entrada
                    categoryTotals[categoryId] = {
                        id: categoryId,
                        name: 'Desconhecida',
                        icon: 'fa-question-circle',
                        total: 0,
                        count: 0
                    };
                }
                
                categoryTotals[categoryId].total += transaction.amount;
                categoryTotals[categoryId].count += 1;
                totalAmount += transaction.amount;
            });
            
            // Calcular percentuais
            Object.values(categoryTotals).forEach(category => {
                category.percentage = totalAmount > 0 ? (category.total / totalAmount) * 100 : 0;
            });
            
            // Converter para array e ordenar por total (maior para menor)
            const result = Object.values(categoryTotals).sort((a, b) => b.total - a.total);
            
            return {
                totalAmount,
                categories: result
            };
        } catch (error) {
            console.error(`Erro ao calcular totais por categoria para ${type}:`, error);
            return {
                totalAmount: 0,
                categories: []
            };
        }
    }
    
    /**
     * Exporta transações em formato CSV
     * @param {Array} transactions - Lista de transações a serem exportadas (opcional)
     * @returns {Promise<string>} - Promise que resolve com o conteúdo CSV
     */
    async exportTransactionsToCSV(transactions = null) {
        try {
            // Se não foram fornecidas transações, usar todas
            const data = transactions || await this.getTransactions();
            
            if (!data || data.length === 0) {
                return '';
            }
            
            // Obter categorias para usar nomes em vez de IDs
            const categories = this.storageManager.getCategories();
            const categoryMap = {};
            
            // Criar mapa de IDs para nomes de categorias
            if (categories && categories.income && categories.expense) {
                categories.income.forEach(cat => {
                    categoryMap[cat.id] = cat.name;
                });
                
                categories.expense.forEach(cat => {
                    categoryMap[cat.id] = cat.name;
                });
            }
            
            // Cabeçalhos
            const headers = ['ID', 'Tipo', 'Descrição', 'Valor', 'Categoria', 'Data', 'Criado Em', 'Notas'];
            
            // Linhas
            const rows = data.map(transaction => [
                transaction.id,
                transaction.type === 'income' ? 'Receita' : 'Despesa',
                `"${(transaction.description || '').replace(/"/g, '""')}"`,
                transaction.amount.toFixed(2),
                categoryMap[transaction.category] || transaction.category,
                dateUtils.formatDate(transaction.date),
                dateUtils.formatDate(transaction.createdAt || new Date(), true),
                `"${(transaction.notes || '').replace(/"/g, '""')}"`
            ]);
            
            // Juntar tudo
            return [
                headers.join(','),
                ...rows.map(row => row.join(','))
            ].join('\n');
        } catch (error) {
            console.error('Erro ao exportar transações para CSV:', error);
            throw error;
        }
    }
    
    /**
     * Importa transações de um CSV
     * @param {string} csvContent - Conteúdo CSV
     * @returns {Promise<Object>} - Promise que resolve com estatísticas de importação
     */
    async importTransactionsFromCSV(csvContent) {
        try {
            // Garantir que o gerenciador esteja inicializado
            if (!this._isInitialized) {
                await this.initialize();
            }
            
            // Dividir CSV em linhas
            const lines = csvContent.split('\n').filter(line => line.trim());
            if (lines.length <= 1) {
                throw new Error('CSV vazio ou inválido');
            }
            
            // Analisar cabeçalhos
            const headers = lines[0].split(',');
            const typeIndex = headers.findIndex(h => h.toLowerCase().includes('tipo'));
            const descriptionIndex = headers.findIndex(h => h.toLowerCase().includes('descri'));
            const amountIndex = headers.findIndex(h => h.toLowerCase().includes('valor'));
            const categoryIndex = headers.findIndex(h => h.toLowerCase().includes('categ'));
            const dateIndex = headers.findIndex(h => h.toLowerCase().includes('data'));
            const notesIndex = headers.findIndex(h => h.toLowerCase().includes('nota') || h.toLowerCase().includes('obs'));
            
            // Verificar se os cabeçalhos mínimos estão presentes
            if (typeIndex === -1 || descriptionIndex === -1 || amountIndex === -1 || dateIndex === -1) {
                throw new Error('Cabeçalhos obrigatórios não encontrados no CSV');
            }
            
            // Obter categorias para mapeamento
            const categories = this.storageManager.getCategories();
            const categoryMap = {
                income: {},
                expense: {}
            };
            
            // Criar mapa reverso de nomes para IDs de categorias
            categories.income.forEach(cat => {
                categoryMap.income[cat.name.toLowerCase()] = cat.id;
            });
            
            categories.expense.forEach(cat => {
                categoryMap.expense[cat.name.toLowerCase()] = cat.id;
            });
            
            // Processar linhas de dados
            const dataLines = lines.slice(1);
            const importedTransactions = [];
            const errors = [];
            
            for (let i = 0; i < dataLines.length; i++) {
                try {
                    const line = dataLines[i];
                    
                    // Analisar os valores da linha considerando possíveis aspas
                    let values = [];
                    let inQuotes = false;
                    let currentValue = '';
                    
                    for (let j = 0; j < line.length; j++) {
                        const char = line[j];
                        
                        if (char === '"') {
                            inQuotes = !inQuotes;
                        } else if (char === ',' && !inQuotes) {
                            values.push(currentValue);
                            currentValue = '';
                        } else {
                            currentValue += char;
                        }
                    }
                    
                    // Adicionar o último valor
                    values.push(currentValue);
                    
                    // Extrair dados da linha
                    const typeValue = values[typeIndex].trim().toLowerCase();
                    const type = typeValue.includes('receita') || typeValue.includes('income') ? 'income' : 'expense';
                    const description = values[descriptionIndex].replace(/^"|"$/g, '').trim();
                    
                    // Tratar valor (remover R$, pontos, etc.)
                    const amountStr = values[amountIndex].replace(/[^\d.,]/g, '').replace('.', '').replace(',', '.');
                    const amount = parseFloat(amountStr);
                    
                    // Tratar data
                    let dateValue = values[dateIndex].trim();
                    let date;
                    
                    // Suportar diferentes formatos de data
                    if (dateValue.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                        // DD/MM/YYYY
                        const [day, month, year] = dateValue.split('/');
                        date = new Date(`${year}-${month}-${day}`);
                    } else if (dateValue.match(/^\d{2}-\d{2}-\d{4}$/)) {
                        // DD-MM-YYYY
                        const [day, month, year] = dateValue.split('-');
                        date = new Date(`${year}-${month}-${day}`);
                    } else {
                        // Tentar interpretar com Date()
                        date = new Date(dateValue);
                    }
                    
                    // Verificar se a data é válida
                    if (isNaN(date.getTime())) {
                        throw new Error(`Data inválida: ${dateValue}`);
                    }
                    
                    // Formatar a data como YYYY-MM-DD
                    const formattedDate = date.toISOString().split('T')[0];
                    
                    // Tratar categoria
                    let categoryValue = categoryIndex !== -1 ? values[categoryIndex].trim() : '';
                    let categoryId;
                    
                    if (categoryValue) {
                        categoryId = categoryMap[type][categoryValue.toLowerCase()];
                        
                        // Se não encontrou a categoria, usar a primeira categoria padrão do tipo
                        if (!categoryId) {
                            categoryId = categories[type][0].id;
                        }
                    } else {
                        // Categoria não fornecida, usar a primeira categoria padrão do tipo
                        categoryId = categories[type][0].id;
                    }
                    
                    // Notas (opcional)
                    const notes = notesIndex !== -1 ? values[notesIndex].replace(/^"|"$/g, '').trim() : '';
                    
                    // Criar objeto de transação
                    const transaction = {
                        type,
                        description,
                        amount,
                        category: categoryId,
                        date: formattedDate,
                        notes,
                        importedAt: new Date().toISOString()
                    };
                    
                    // Validar transação
                    if (this.validateTransaction(transaction)) {
                        importedTransactions.push(transaction);
                    } else {
                        throw new Error('Dados de transação inválidos');
                    }
                } catch (lineError) {
                    errors.push({
                        line: i + 2, // +2 porque i começa em 0 e já pulamos a linha de cabeçalho
                        error: lineError.message
                    });
                }
            }
            
            // Adicionar as transações válidas
            const addPromises = importedTransactions.map(transaction => 
                this.addTransaction(transaction)
            );
            
            await Promise.all(addPromises);
            
            return {
                totalProcessed: dataLines.length,
                imported: importedTransactions.length,
                errors: errors
            };
        } catch (error) {
            console.error('Erro ao importar transações do CSV:', error);
            throw error;
        }
    }
}

// Exportar uma instância singleton do gerenciador
export const transactionManager = new TransactionManager();

// Exportar a classe para uso em módulos que precisem estendê-la
export default TransactionManager;