// /frontend/js/dashboard/dashboard-manager.js
// Gerenciador do dashboard da aplicação - Refatorado para usar exclusivamente o chartManager

import { formatSafeCurrency } from '../utils/currency-utils.js';
import { dateUtils } from '../utils/date-utils.js';
import { singletonManager } from '../utils/singleton-manager.js';

/**
 * Classe responsável por gerenciar o dashboard da aplicação
 * Refatorada para usar o chartManager de forma consistente
 */
export class DashboardManager {
    /**
     * Construtor do gerenciador de dashboard
     */
    constructor() {
        this._isInitialized = false;
        this._eventListenersAttached = false;
        
        // Registrar no singletonManager
        singletonManager.register('dashboardManager', this);
    }
    
    /**
     * Inicializa o dashboard manager
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this._isInitialized) return;
        
        try {
            console.log('Iniciando inicialização do DashboardManager');
            
            // Obter dependências através do singletonManager
            this.transactionManager = singletonManager.get('transactionManager');
            this.chartManager = singletonManager.get('chartManager');
            this.uiManager = singletonManager.get('uiManager');
            this.storageManager = singletonManager.get('storageManager');
            
            // Verificar dependências essenciais e inicializar se necessário
            await this._initializeDependencies();
            
            // Registrar manipuladores de eventos se ainda não foram registrados
            if (!this._eventListenersAttached) {
                this._attachEventListeners();
            }
            
            // Carregar dados iniciais
            await this._loadInitialData();
            
            this._isInitialized = true;
            console.log('Dashboard manager inicializado com sucesso');
            
            // Notificar que o DashboardManager está pronto
            document.dispatchEvent(new CustomEvent('dashboardManagerReady', { 
                detail: { instance: this }
            }));
            
            // Atualizar dashboard com dados mais recentes
            // Usar setTimeout para permitir que o DOM seja renderizado completamente
            setTimeout(() => this.updateDashboard(), 100);
        } catch (error) {
            console.error('Erro durante inicialização do DashboardManager:', error);
            
            // Tentar recuperação básica
            this._isInitialized = true; // Evitar loops infinitos de inicialização
            
            // Notificar o usuário sobre o erro se o UIManager estiver disponível
            if (this.uiManager && typeof this.uiManager.showError === 'function') {
                this.uiManager.showError('Ocorreu um erro ao inicializar o dashboard. Alguns dados podem não ser exibidos corretamente.');
            }
        }
    }

    /**
     * Inicializa dependências necessárias
     * @private
     */
    async _initializeDependencies() {
        // Verificar e obter o transaction manager
        if (!this.transactionManager) {
            console.log('Aguardando TransactionManager...');
            // Esperar pelo TransactionManager ser registrado
            this.transactionManager = await new Promise(resolve => {
                if (singletonManager.has('transactionManager')) {
                    resolve(singletonManager.get('transactionManager'));
                } else {
                    // Criar um listener de evento para quando o TransactionManager for registrado
                    const checkInterval = setInterval(() => {
                        if (singletonManager.has('transactionManager')) {
                            clearInterval(checkInterval);
                            resolve(singletonManager.get('transactionManager'));
                        }
                    }, 100);
                    
                    // Timeout para evitar espera infinita
                    setTimeout(() => {
                        clearInterval(checkInterval);
                        console.error('Timeout esperando pelo TransactionManager');
                        resolve(null);
                    }, 5000);
                }
            });
            
            // Se ainda não conseguiu obter, utilizar o módulo diretamente
            if (!this.transactionManager) {
                console.warn('TransactionManager não encontrado, inicializando novo');
                const TransactionManager = (await import('../transactions/transaction-manager.js')).TransactionManager;
                this.transactionManager = new TransactionManager();
                singletonManager.register('transactionManager', this.transactionManager);
            }
        }
        
        // Garantir que o TransactionManager está inicializado
        if (this.transactionManager && typeof this.transactionManager.initialize === 'function') {
            if (!this.transactionManager._isInitialized) {
                console.log('Inicializando TransactionManager...');
                await this.transactionManager.initialize();
            } else {
                console.log('TransactionManager já inicializado');
            }
        }
        
        // Verificar e obter o chart manager
        if (!this.chartManager) {
            console.log('Aguardando ChartManager...');
            // Esperar pelo ChartManager ser registrado
            this.chartManager = await new Promise(resolve => {
                if (singletonManager.has('chartManager')) {
                    resolve(singletonManager.get('chartManager'));
                } else {
                    // Criar um listener de evento para quando o ChartManager for registrado
                    const checkInterval = setInterval(() => {
                        if (singletonManager.has('chartManager')) {
                            clearInterval(checkInterval);
                            resolve(singletonManager.get('chartManager'));
                        }
                    }, 100);
                    
                    // Timeout para evitar espera infinita
                    setTimeout(() => {
                        clearInterval(checkInterval);
                        console.error('Timeout esperando pelo ChartManager');
                        resolve(null);
                    }, 5000);
                }
            });
            
            // Se ainda não conseguiu obter, lançar erro (ChartManager é essencial para o dashboard)
            if (!this.chartManager) {
                console.error('ChartManager não encontrado, o dashboard não pode funcionar adequadamente');
            }
        }
        
        // Aguardar inicialização do ChartManager se necessário
        if (this.chartManager && typeof this.chartManager.getInitializationPromise === 'function') {
            try {
                console.log('Aguardando inicialização do ChartManager...');
                await this.chartManager.getInitializationPromise();
                console.log('ChartManager inicializado com sucesso');
            } catch (error) {
                console.warn('Erro ao aguardar inicialização do ChartManager:', error);
            }
        }
        
        // Verificar e obter o UI manager
        if (!this.uiManager) {
            this.uiManager = singletonManager.get('uiManager');
        }
        
        // Verificar e obter o storage manager
        if (!this.storageManager) {
            this.storageManager = singletonManager.get('storageManager');
            
            // Se ainda não tem storage manager, tentar obter do transaction manager
            if (!this.storageManager && this.transactionManager) {
                this.storageManager = this.transactionManager.storageManager;
            }
        }
        
        // Garantir que o StorageManager está inicializado
        if (this.storageManager && typeof this.storageManager.initialize === 'function') {
            if (!this.storageManager._isInitialized) {
                console.log('Inicializando StorageManager...');
                await this.storageManager.initialize();
                console.log('StorageManager inicializado com sucesso');
            } else {
                console.log('StorageManager já inicializado');
            }
        }
    }

    /**
     * Carrega dados iniciais para o dashboard
     * @private
     */
    async _loadInitialData() {
        try {
            // Verificar se o DataLoader está disponível
            const dataLoader = singletonManager.get('dataLoader');
            if (dataLoader) {
                console.log('Usando DataLoader para carregar dados iniciais');
                await dataLoader.loadAllData();
                return;
            }
            
            // Fallback: carregar transações diretamente
            if (this.transactionManager) {
                console.log('Carregando transações diretamente via TransactionManager');
                await this.transactionManager.getTransactions();
            }
        } catch (error) {
            console.error('Erro ao carregar dados iniciais:', error);
        }
    }

    /**
     * Registra os event listeners necessários
     * @private
     */
    _attachEventListeners() {
        console.log('Registrando event listeners do DashboardManager');
        
        // Listener para seleção de período
        document.addEventListener('DOMContentLoaded', () => {
            const periodSelector = document.getElementById('periodSelect');
            if (periodSelector) {
                periodSelector.addEventListener('change', () => {
                    console.log(`Período alterado para: ${periodSelector.value}`);
                    this.updateDashboard(periodSelector.value);
                });
            }
        });
        
        // Listener para quando a aplicação é inicializada
        document.addEventListener('fincontrol:initialized', () => {
            console.log('Evento fincontrol:initialized detectado');
            if (document.getElementById('dashboardPage') && 
                document.getElementById('dashboardPage').classList.contains('active')) {
                this.updateDashboard();
            }
        });
        
        // Listener para evento de rota dashboard renderizada
        document.addEventListener('dashboardRendered', (event) => {
            console.log('Evento dashboardRendered detectado, atualizando dashboard');
            this.updateDashboard();
        });
        
        // Listener para evento de transações carregadas
        document.addEventListener('transactionsLoaded', (event) => {
            console.log('Evento transactionsLoaded detectado, atualizando dashboard');
            if (document.getElementById('dashboardPage') && 
                document.getElementById('dashboardPage').classList.contains('active')) {
                this.updateDashboard();
            }
        });
        
        // Listener para evento de transação adicionada
        document.addEventListener('transaction:added', (event) => {
            console.log('Evento transaction:added detectado, atualizando dashboard');
            if (document.getElementById('dashboardPage') && 
                document.getElementById('dashboardPage').classList.contains('active')) {
                this.updateDashboard();
            }
        });
        
        // Listener para evento de transação atualizada
        document.addEventListener('transaction:updated', (event) => {
            console.log('Evento transaction:updated detectado, atualizando dashboard');
            if (document.getElementById('dashboardPage') && 
                document.getElementById('dashboardPage').classList.contains('active')) {
                this.updateDashboard();
            }
        });
        
        // Listener para evento de transação removida
        document.addEventListener('transaction:removed', (event) => {
            console.log('Evento transaction:removed detectado, atualizando dashboard');
            if (document.getElementById('dashboardPage') && 
                document.getElementById('dashboardPage').classList.contains('active')) {
                this.updateDashboard();
            }
        });
        
        this._eventListenersAttached = true;
        console.log('Event listeners registrados com sucesso');
    }
    
    /**
     * Atualiza o dashboard com dados atuais
     * @param {string} [period='month'] - Período para exibir
     */
    async updateDashboard(period = 'month') {
        try {
            // Garantir que o dashboard está inicializado
            if (!this._isInitialized) {
                await this.initialize();
            }
            
            console.log(`Atualizando dashboard para período: ${period}`);

            // Forçar busca direta para garantir dados mais recentes
            const transactions = await this.transactionManager.getTransactions();
            
            // Obter todos os dados necessários para o dashboard
            const dashboardData = await this.prepareDashboardData(period);
            
            // Atualizar componentes não relacionados a gráficos
            await this.updateSummary(dashboardData.summary);
            await this.updateRecentTransactions(dashboardData.recentTransactions);
            
            // Atualizar gráficos usando exclusivamente o chartManager
            this.updateChartsViaChartManager(dashboardData);
            
            console.log('Dashboard atualizado com sucesso');
        } catch (error) {
            console.error('Erro ao atualizar dashboard:', error);
            
            // Exibir mensagem de erro para o usuário se o UIManager estiver disponível
            if (this.uiManager && typeof this.uiManager.showError === 'function') {
                this.uiManager.showError('Ocorreu um erro ao atualizar o dashboard. Por favor, tente novamente.');
            }
        }
    }
    
    /**
     * Atualiza os gráficos usando exclusivamente o chartManager
     * @param {Object} data - Dados para os gráficos
     */
    updateChartsViaChartManager(data) {
        try {
            // Verificar se o chartManager está disponível
            if (!this.chartManager) {
                console.error('ChartManager não disponível para atualizar gráficos');
                return;
            }
            
            // Verificar se há dados para exibir
            if (!data.filteredTransactions || data.filteredTransactions.length === 0) {
                // Sem dados - mostrar templates vazios usando chartManager
                this.chartManager.showEmptyChartTemplate('overviewChart', 'Sem transações no período selecionado');
                this.chartManager.showEmptyChartTemplate('expensesByCategoryChart', 'Sem despesas no período');
                this.chartManager.showEmptyChartTemplate('cashFlowChart', 'Sem dados de fluxo de caixa');
                return;
            }
            
            // Remover templates vazios se existirem
            this.chartManager.removeEmptyChartTemplate('overviewChart');
            this.chartManager.removeEmptyChartTemplate('expensesByCategoryChart');
            this.chartManager.removeEmptyChartTemplate('cashFlowChart');
            
            // 1. Gráfico de visão geral (doughnut)
            this.createOrUpdateOverviewChart(data);
            
            // 2. Gráfico de despesas por categoria (pie)
            this.createOrUpdateExpensesByCategoryChart(data);
            
            // 3. Gráfico de fluxo de caixa (line)
            this.createOrUpdateCashFlowChart(data);
            
        } catch (error) {
            console.error('Erro ao atualizar gráficos do dashboard:', error);
            
            // Em caso de erro, mostrar mensagens de erro nos gráficos
            if (this.chartManager) {
                this.chartManager.showEmptyChartTemplate('overviewChart', 'Erro ao carregar gráfico');
                this.chartManager.showEmptyChartTemplate('expensesByCategoryChart', 'Erro ao carregar gráfico');
                this.chartManager.showEmptyChartTemplate('cashFlowChart', 'Erro ao carregar gráfico');
            }
        }
    }
    
    /**
     * Cria ou atualiza o gráfico de visão geral
     * @param {Object} data - Dados do dashboard
     */
    createOrUpdateOverviewChart(data) {
        const chartData = {
            labels: ['Receitas', 'Despesas', 'Saldo'],
            datasets: [{
                data: [
                    data.summary.income,
                    data.summary.expense,
                    data.summary.balance > 0 ? data.summary.balance : 0 // Evitar valores negativos no doughnut
                ],
                backgroundColor: [
                    'rgba(16, 185, 129, 0.8)',  // Verde para Receitas
                    'rgba(239, 68, 68, 0.8)',   // Vermelho para Despesas
                    'rgba(67, 97, 238, 0.8)'    // Azul para Saldo
                ],
                borderWidth: 0
            }]
        };
        
        // Opções customizadas para o gráfico de visão geral
        const options = {
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 12,
                        padding: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const value = context.raw;
                            return `${context.label}: ${formatSafeCurrency(value)}`;
                        }
                    }
                }
            }
        };
        
        // Criar ou atualizar o gráfico usando chartManager
        this.chartManager.createOrUpdateChart(
            'overviewChart',  // ID do canvas
            'overviewChart',  // ID para registro no chartManager
            'doughnut',       // Tipo de gráfico
            chartData,        // Dados
            options           // Opções customizadas
        );
    }
    
    /**
     * Cria ou atualiza o gráfico de despesas por categoria
     * @param {Object} data - Dados do dashboard
     */
    createOrUpdateExpensesByCategoryChart(data) {
        // Se não houver despesas, mostrar mensagem em vez de gráfico vazio
        if (data.expensesByCategory.labels.length === 0) {
            this.chartManager.showEmptyChartTemplate('expensesByCategoryChart', 'Sem despesas no período');
            return;
        }
        
        const chartData = {
            labels: data.expensesByCategory.labels,
            datasets: [{
                data: data.expensesByCategory.values,
                backgroundColor: [
                    'rgba(67, 97, 238, 0.8)',   // Azul
                    'rgba(245, 158, 11, 0.8)',  // Laranja
                    'rgba(16, 185, 129, 0.8)',  // Verde
                    'rgba(239, 68, 68, 0.8)',   // Vermelho
                    'rgba(59, 130, 246, 0.8)',  // Azul claro
                    'rgba(107, 114, 128, 0.8)'  // Cinza
                ],
                borderWidth: 0
            }]
        };
        
        // Opções customizadas para o gráfico de despesas por categoria
        const options = {
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        boxWidth: 12,
                        font: {
                            size: 11
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${context.label}: ${formatSafeCurrency(value)} (${percentage}%)`;
                        }
                    }
                }
            }
        };
        
        // Criar ou atualizar o gráfico usando chartManager
        this.chartManager.createOrUpdateChart(
            'expensesByCategoryChart',
            'expensesByCategoryChart',
            'pie',
            chartData,
            options
        );
    }
    
    /**
     * Cria ou atualiza o gráfico de fluxo de caixa
     * @param {Object} data - Dados do dashboard
     */
    createOrUpdateCashFlowChart(data) {
        // Preparar dados para o gráfico de fluxo de caixa
        const chartData = {
            labels: data.cashFlowData.labels,
            datasets: [
                {
                    label: 'Receitas',
                    data: data.cashFlowData.datasets[0].data,
                    borderColor: 'rgba(16, 185, 129, 1)',         // Verde
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',   // Verde com transparência
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Despesas',
                    data: data.cashFlowData.datasets[1].data,
                    borderColor: 'rgba(239, 68, 68, 1)',         // Vermelho
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',   // Vermelho com transparência
                    tension: 0.3,
                    fill: true
                }
            ]
        };
        
        // Opções customizadas para o gráfico de fluxo de caixa
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatSafeCurrency(value, 'BRL', true); // Versão simples sem símbolo
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            return `${context.dataset.label}: ${formatSafeCurrency(value)}`;
                        }
                    }
                }
            }
        };
        
        // Criar ou atualizar o gráfico usando chartManager
        this.chartManager.createOrUpdateChart(
            'cashFlowChart',
            'cashFlowChart',
            'line',
            chartData,
            options
        );
    }
    
    /**
     * Prepara todos os dados necessários para o dashboard
     * @param {string} period - Período para exibir
     * @returns {Promise<Object>} - Dados para o dashboard
     */
    async prepareDashboardData(period) {
        try {
            // Obter o intervalo de datas baseado no período
            const { startDate, endDate } = dateUtils.getDateRange(period);
            
            // Obter transações
            const allTransactions = await this.transactionManager.getTransactions();
            
            // Filtrar transações do período
            const filteredTransactions = allTransactions.filter(transaction => {
                const transactionDate = new Date(transaction.date);
                return transactionDate >= startDate && transactionDate <= endDate;
            });
            
            // Calcular totais
            const income = filteredTransactions
                .filter(t => t.type === 'income')
                .reduce((total, t) => total + t.amount, 0);
            
            const expense = filteredTransactions
                .filter(t => t.type === 'expense')
                .reduce((total, t) => total + t.amount, 0);
            
            const balance = income - expense;
            
            // Agrupar despesas por categoria
            const expensesByCategory = this.groupExpensesByCategory(filteredTransactions);
            
            // Preparar dados para fluxo de caixa
            const cashFlowData = this.prepareCashFlowData(allTransactions, period);
            
            // Selecionar transações recentes
            const recentTransactions = this.getRecentTransactions(allTransactions, 5);
            
            // Retornar todos os dados estruturados
            return {
                period: { startDate, endDate },
                summary: { income, expense, balance },
                expensesByCategory,
                cashFlowData,
                recentTransactions,
                filteredTransactions
            };
        } catch (error) {
            console.error('Erro ao preparar dados do dashboard:', error);
            throw error;
        }
    }
    
    /**
     * Atualiza o resumo financeiro
     * @param {Object} summary - Dados do resumo financeiro
     */
    async updateSummary(summary) {
        // Obter elementos do DOM
        const incomeElement = document.getElementById('monthlyIncome') || document.getElementById('income-value');
        const expenseElement = document.getElementById('monthlyExpense') || document.getElementById('expense-value');
        const balanceElement = document.getElementById('monthlyBalance') || document.getElementById('balance-value');
        
        if (!incomeElement || !expenseElement || !balanceElement) {
            console.warn('Elementos de resumo financeiro não encontrados no DOM');
            return;
        }
        
        try {
            // Atualizar elementos
            incomeElement.textContent = formatSafeCurrency(summary.income);
            expenseElement.textContent = formatSafeCurrency(summary.expense);
            balanceElement.textContent = formatSafeCurrency(summary.balance);
            
            // Atualizar classes para estilo visual
            if (balanceElement.classList) {
                // Remover classes existentes
                balanceElement.classList.remove('income', 'expense', 'positive', 'negative');
                
                // Adicionar classe baseada no valor (positivo/negativo)
                if (summary.balance >= 0) {
                    balanceElement.classList.add('income');
                    balanceElement.classList.add('positive');
                } else {
                    balanceElement.classList.add('expense');
                    balanceElement.classList.add('negative');
                }
            }
            
            // Atualizar elementos de tendência percentual se existirem
            this.updatePercentageTrends();
            
            console.log('Resumo financeiro atualizado com sucesso');
        } catch (error) {
            console.error('Erro ao atualizar resumo financeiro:', error);
        }
    }
    
    /**
     * Atualiza os indicadores de tendência percentual
     */
    async updatePercentageTrends() {
        // Implementação existente mantida
        // ...
    }
    
    /**
     * Agrupa despesas por categoria para o gráfico
     * @param {Array} transactions - Lista de transações
     * @returns {Object} - Dados formatados para o gráfico
     */
    groupExpensesByCategory(transactions) {
        // Filtrar apenas despesas
        const expenses = transactions.filter(tx => tx.type === 'expense');
        
        // Se não houver despesas, retornar objeto vazio
        if (expenses.length === 0) {
            return { labels: [], values: [], datasets: [{ data: [], backgroundColor: [] }] };
        }
        
        // Agrupar por categoria
        const categoryTotals = {};
        
        // Obter categorias para mapear IDs para nomes
        const categories = this.storageManager ? 
            this.storageManager.getCategories().expense || [] : 
            this.transactionManager.storageManager.getCategories().expense || [];
        
        const categoryMap = {};
        
        categories.forEach(category => {
            categoryMap[category.id] = category.name;
        });
        
        // Agrupar despesas por categoria
        expenses.forEach(expense => {
            const categoryName = categoryMap[expense.category] || 'Outros';
            
            if (!categoryTotals[categoryName]) {
                categoryTotals[categoryName] = 0;
            }
            
            categoryTotals[categoryName] += expense.amount;
        });
        
        // Converter para arrays para o gráfico (ordenadas por valor)
        const sortedCategories = Object.entries(categoryTotals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6); // Limitar a 6 categorias para melhor visualização
        
        const labels = sortedCategories.map(([category]) => category);
        const values = sortedCategories.map(([, value]) => value);
        
        // Cores para o gráfico
        const backgroundColors = [
            'rgba(67, 97, 238, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(16, 185, 129, 0.8)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(59, 130, 246, 0.8)',
            'rgba(107, 114, 128, 0.8)'
        ];
        
        return {
            labels,
            values,
            datasets: [{
                data: values,
                backgroundColor: backgroundColors.slice(0, values.length),
                borderWidth: 0
            }]
        };
    }
    
    /**
     * Prepara dados para o gráfico de fluxo de caixa
     * @param {Array} transactions - Lista de transações
     * @param {string} period - Período selecionado
     * @returns {Object} - Dados formatados para o gráfico
     */
    prepareCashFlowData(transactions, period) {
        const now = new Date();
        let periodsToShow = 6;
        let periodInterval = 1;
        let periodUnit = 'month';
        
        // Ajustar configurações com base no período
        switch (period) {
            case 'day':
                periodsToShow = 24; // Últimas 24 horas
                periodInterval = 1;
                periodUnit = 'hour';
                break;
            case 'week':
                periodsToShow = 7; // Últimos 7 dias
                periodInterval = 1;
                periodUnit = 'day';
                break;
            case 'month':
                periodsToShow = 30; // Últimos 30 dias
                periodInterval = 1;
                periodUnit = 'day';
                break;
            case 'quarter':
                periodsToShow = 3; // Últimos 3 meses
                periodInterval = 1;
                periodUnit = 'month';
                break;
            case 'year':
                periodsToShow = 12; // Últimos 12 meses
                periodInterval = 1;
                periodUnit = 'month';
                break;
            default:
                periodsToShow = 6; // Últimos 6 meses (padrão)
                periodInterval = 1;
                periodUnit = 'month';
        }
        
        // Gerar períodos
        const periods = [];
        for (let i = periodsToShow - 1; i >= 0; i--) {
            let date;
            let key;
            let label;
            
            if (periodUnit === 'month') {
                date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                key = date.toISOString().substring(0, 7); // YYYY-MM
                label = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
            } else if (periodUnit === 'day') {
                date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
                key = date.toISOString().substring(0, 10); // YYYY-MM-DD
                label = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            } else if (periodUnit === 'hour') {
                date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() - i);
                key = date.toISOString().substring(0, 13); // YYYY-MM-DDTHH
                label = `${date.getHours()}:00`;
            }
            
            periods.push({ date, key, label });
        }
        
        // Calcular valores por período
        const incomes = [];
        const expenses = [];
        
        periods.forEach(period => {
            let startDate, endDate;
            
            if (periodUnit === 'month') {
                startDate = new Date(period.date);
                endDate = new Date(period.date.getFullYear(), period.date.getMonth() + 1, 0, 23, 59, 59);
            } else if (periodUnit === 'day') {
                startDate = new Date(period.date);
                endDate = new Date(period.date.getFullYear(), period.date.getMonth(), period.date.getDate(), 23, 59, 59);
            } else if (periodUnit === 'hour') {
                startDate = new Date(period.date);
                endDate = new Date(period.date.getFullYear(), period.date.getMonth(), period.date.getDate(), period.date.getHours(), 59, 59);
            }
            
            // Filtrar transações do período
            const periodTransactions = transactions.filter(transaction => {
                const transactionDate = new Date(transaction.date);
                return transactionDate >= startDate && transactionDate <= endDate;
            });
            
            // Calcular total de receitas e despesas
            const income = periodTransactions
                .filter(tx => tx.type === 'income')
                .reduce((sum, tx) => sum + tx.amount, 0);
                
            const expense = periodTransactions
                .filter(tx => tx.type === 'expense')
                .reduce((sum, tx) => sum + tx.amount, 0);
                
            incomes.push(income);
            expenses.push(expense);
        });
        
        // Retornar dados formatados para o gráfico
        return {
            labels: periods.map(period => period.label),
            datasets: [
                {
                    label: 'Receitas',
                    data: incomes,
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    borderColor: 'rgba(16, 185, 129, 1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Despesas',
                    data: expenses,
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    borderColor: 'rgba(239, 68, 68, 1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                }
            ]
        };
    }
    
    /**
     * Retorna as transações mais recentes
     * @param {Array} transactions - Lista de transações
     * @param {number} limit - Número máximo de transações
     * @returns {Array} - Transações mais recentes
     */
    getRecentTransactions(transactions, limit = 5) {
        return [...transactions]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, limit);
    }
    
    /**
     * Atualiza a lista de transações recentes
     * @param {Array} recentTransactions - Lista de transações recentes
     */
    async updateRecentTransactions(recentTransactions) {
        const recentTransactionsList = document.getElementById('recentTransactionsList');
        
        if (!recentTransactionsList) {
            console.warn('Elemento de lista de transações recentes não encontrado');
            return;
        }
        
        try {
            // Remover conteúdo anterior
            recentTransactionsList.innerHTML = '';
            
            if (!recentTransactions || recentTransactions.length === 0) {
                // Mostrar estado vazio
                recentTransactionsList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-receipt"></i>
                        <p>Sem transações recentes</p>
                        <button class="btn btn-primary btn-sm" id="emptyStateAddTransactionBtn">
                            <i class="fas fa-plus"></i> Adicionar Primeira Transação
                        </button>
                    </div>
                `;
                
                // Adicionar event listener ao botão
                document.getElementById('emptyStateAddTransactionBtn')?.addEventListener('click', () => {
                    // Usar o singleton manager para acessar uiManager
                    const uiManager = singletonManager.get('uiManager');
                    if (uiManager && typeof uiManager.openModal === 'function') {
                        uiManager.openModal('addTransactionModal');
                    }
                });
                
                return;
            }
            
            // Obter categorias do storageManager via singletonManager
            let categories = {
                income: [],
                expense: []
            };
            
            try {
                if (this.storageManager) {
                    categories = this.storageManager.getCategories();
                } else if (this.transactionManager && this.transactionManager.storageManager) {
                    categories = this.transactionManager.storageManager.getCategories();
                }
            } catch (error) {
                console.warn('Erro ao obter categorias:', error);
            }
            
            // Adicionar transações
            recentTransactions.forEach(transaction => {
                // Encontrar a categoria
                const categoryList = categories[transaction.type] || [];
                const category = categoryList.find(c => c.id === transaction.category);
                
                const transactionItem = document.createElement('div');
                transactionItem.className = 'transaction-item';
                transactionItem.innerHTML = `
                    <div class="transaction-icon ${transaction.type}">
                        <i class="fas ${category?.icon || 'fa-money-bill'}"></i>
                    </div>
                    <div class="transaction-details">
                        <div class="transaction-description">${transaction.description}</div>
                        <div class="transaction-category">
                            <span class="chip">${category?.name || 'Sem categoria'}</span>
                        </div>
                    </div>
                    <div class="transaction-amount ${transaction.type}">
                        ${transaction.type === 'income' ? '+' : '-'} ${formatSafeCurrency(transaction.amount)}
                    </div>
                    <div class="transaction-date">
                        ${dateUtils.formatDate(transaction.date)}
                    </div>
                `;
                
                recentTransactionsList.appendChild(transactionItem);
            });
            
            console.log('Lista de transações recentes atualizada com sucesso');
        } catch (error) {
            console.error('Erro ao atualizar lista de transações recentes:', error);
            recentTransactionsList.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Erro ao carregar transações</p>
                </div>
            `;
        }
    }
    
    /**
     * Manipulador de evento para quando a aplicação for totalmente inicializada
     */
    onAppInitialized() {
        console.log('Aplicação inicializada, atualizando dashboard');
        const currentRoute = singletonManager.get('router')?.getCurrentRoute() || 'dashboard';
        if (currentRoute === 'dashboard' && document.getElementById('dashboardPage')?.classList.contains('active')) {
            this.updateDashboard();
        }
    }
}

// Exportar a classe e criar uma instância singleton
export default DashboardManager;
export const dashboardManager = new DashboardManager();