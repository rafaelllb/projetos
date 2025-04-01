// /frontend/js/analytics/finance-analytics.js
// Módulo de análise financeira para dashboard

import TransactionChart from '../components/transaction-chart.js';

/**
 * Classe para análise financeira avançada
 * Fornece insights sobre os dados financeiros do usuário
 */
class FinanceAnalytics {
    /**
     * @param {Object} transactionManager - Gerenciador de transações
     * @param {Object} storageManager - Gerenciador de armazenamento
     */
    constructor(transactionManager, storageManager) {
        this.transactionManager = transactionManager;
        this.storageManager = storageManager;
        this.charts = {};
        this.insights = [];
    }
    
    /**
     * Inicializa os componentes de análise
     * @param {Object} containers - Objeto com IDs dos containers
     */
    async init(containers = {}) {
        // Carregar transações
        const transactions = await this.transactionManager.getTransactions();
        
        if (!transactions || transactions.length === 0) {
            this.showEmptyState(containers);
            return;
        }
        
        // Inicializar gráficos se os containers forem fornecidos
        if (containers.expenseChart) {
            this.initExpenseChart(containers.expenseChart, transactions);
        }
        
        if (containers.timelineChart) {
            this.initTimelineChart(containers.timelineChart, transactions);
        }
        
        if (containers.categoryComparisonChart) {
            this.initCategoryComparisonChart(containers.categoryComparisonChart, transactions);
        }
        
        // Calcular insights
        this.calculateInsights(transactions);
        
        // Exibir insights se o container for fornecido
        if (containers.insightsContainer) {
            this.displayInsights(containers.insightsContainer);
        }
    }
    
    /**
     * Inicializa o gráfico de despesas por categoria
     * @param {string} containerId - ID do container
     * @param {Array} transactions - Lista de transações
     */
    initExpenseChart(containerId, transactions) {
        // Filtrar apenas despesas dos últimos 30 dias
        const recentDate = new Date();
        recentDate.setDate(recentDate.getDate() - 30);
        
        const recentTransactions = transactions.filter(t => 
            t.type === 'expense' && new Date(t.date) >= recentDate
        );
        
        // Criar gráfico
        this.charts.expense = new TransactionChart({
            containerId: containerId,
            type: 'category',
            options: {
                cutout: '60%',
                height: 250
            },
            onSegmentClick: (category) => {
                this.showCategoryDetails(category);
            }
        });
        
        // Inicializar com dados
        this.charts.expense.init(recentTransactions);
    }
    
    /**
     * Inicializa o gráfico de linha temporal
     * @param {string} containerId - ID do container
     * @param {Array} transactions - Lista de transações
     */
    initTimelineChart(containerId, transactions) {
        // Criar gráfico
        this.charts.timeline = new TransactionChart({
            containerId: containerId,
            type: 'timeline',
            options: {
                timeframe: 'month',
                height: 250
            }
        });
        
        // Inicializar com dados
        this.charts.timeline.init(transactions);
    }
    
    /**
     * Inicializa o gráfico de comparação de categorias
     * @param {string} containerId - ID do container
     * @param {Array} transactions - Lista de transações
     */
    initCategoryComparisonChart(containerId, transactions) {
        // Criar gráfico
        this.charts.comparison = new TransactionChart({
            containerId: containerId,
            type: 'comparison',
            options: {
                height: 250
            }
        });
        
        // Inicializar com dados
        this.charts.comparison.init(transactions);
    }
    
    /**
     * Calcula insights financeiros com base nas transações
     * @param {Array} transactions - Lista de transações
     */
    calculateInsights(transactions) {
        this.insights = [];
        
        // Verificar se há dados suficientes
        if (!transactions || transactions.length < 5) {
            this.insights.push({
                type: 'info',
                title: 'Dados insuficientes',
                description: 'Adicione mais transações para obter insights personalizados.',
                icon: 'fa-info-circle'
            });
            return;
        }
        
        // Ordenar transações por data
        const sortedTransactions = [...transactions].sort((a, b) => 
            new Date(a.date) - new Date(b.date)
        );
        
        // Calcular tendências mensais
        this.calculateMonthlyTrends(sortedTransactions);
        
        // Identificar categorias com maior gasto
        this.identifyTopExpenseCategories(sortedTransactions);
        
        // Analisar padrões de gastos
        this.analyzeSpendingPatterns(sortedTransactions);
        
        // Calcular taxa de poupança
        this.calculateSavingsRate(sortedTransactions);
        
        // Identificar transações incomuns
        this.identifyUnusualTransactions(sortedTransactions);
    }
    
    /**
     * Calcula tendências de receitas e despesas mensais
     * @param {Array} transactions - Lista de transações ordenadas por data
     */
    calculateMonthlyTrends(transactions) {
        const monthlyData = this.groupByMonth(transactions);
        
        // Verificar se há pelo menos 3 meses de dados
        if (Object.keys(monthlyData).length >= 3) {
            const months = Object.keys(monthlyData).sort();
            const lastThreeMonths = months.slice(-3);
            
            // Calcular tendências de receitas
            const incomeValues = lastThreeMonths.map(m => monthlyData[m].income);
            const incomeChange = this.calculateTrend(incomeValues);
            
            if (incomeChange.percentage > 10) {
                this.insights.push({
                    type: 'positive',
                    title: 'Receitas em alta',
                    description: `Suas receitas aumentaram ${incomeChange.percentage.toFixed(1)}% nos últimos 3 meses.`,
                    icon: 'fa-arrow-up'
                });
            } else if (incomeChange.percentage < -10) {
                this.insights.push({
                    type: 'warning',
                    title: 'Receitas em queda',
                    description: `Suas receitas diminuíram ${Math.abs(incomeChange.percentage).toFixed(1)}% nos últimos 3 meses.`,
                    icon: 'fa-arrow-down'
                });
            }
            
            // Calcular tendências de despesas
            const expenseValues = lastThreeMonths.map(m => monthlyData[m].expense);
            const expenseChange = this.calculateTrend(expenseValues);
            
            if (expenseChange.percentage > 15) {
                this.insights.push({
                    type: 'warning',
                    title: 'Despesas em alta',
                    description: `Suas despesas aumentaram ${expenseChange.percentage.toFixed(1)}% nos últimos 3 meses.`,
                    icon: 'fa-arrow-up'
                });
            } else if (expenseChange.percentage < -10) {
                this.insights.push({
                    type: 'positive',
                    title: 'Despesas em queda',
                    description: `Suas despesas diminuíram ${Math.abs(expenseChange.percentage).toFixed(1)}% nos últimos 3 meses.`,
                    icon: 'fa-arrow-down'
                });
            }
        }
    }
    
    /**
     * Identifica categorias com maiores despesas
     * @param {Array} transactions - Lista de transações ordenadas por data
     */
    identifyTopExpenseCategories(transactions) {
        // Filtrar transações recentes (últimos 30 dias)
        const recentDate = new Date();
        recentDate.setDate(recentDate.getDate() - 30);
        
        const recentTransactions = transactions.filter(t => 
            t.type === 'expense' && new Date(t.date) >= recentDate
        );
        
        // Agrupar por categoria
        const categories = {};
        
        recentTransactions.forEach(transaction => {
            const categoryId = transaction.category;
            if (!categories[categoryId]) {
                categories[categoryId] = {
                    id: categoryId,
                    name: this.getCategoryName(categoryId),
                    total: 0,
                    count: 0
                };
            }
            
            categories[categoryId].total += transaction.amount;
            categories[categoryId].count += 1;
        });
        
        // Converter para array e ordenar por valor
        const categoriesArray = Object.values(categories);
        categoriesArray.sort((a, b) => b.total - a.total);
        
        // Calcular total de despesas
        const totalExpenses = categoriesArray.reduce((sum, cat) => sum + cat.total, 0);
        
        // Identificar categoria com maior gasto
        if (categoriesArray.length > 0) {
            const topCategory = categoriesArray[0];
            const percentage = (topCategory.total / totalExpenses) * 100;
            
            if (percentage > 40) {
                this.insights.push({
                    type: 'warning',
                    title: 'Concentração de despesas',
                    description: `${percentage.toFixed(1)}% dos seus gastos recentes foram com ${topCategory.name}.`,
                    icon: 'fa-chart-pie'
                });
            }
        }
        
        // Identificar categoria com crescimento rápido
        if (categoriesArray.length > 0 && transactions.length > 10) {
            // Implementação simplificada - em um cenário real, compararíamos com período anterior
            const frequentCategory = categoriesArray.find(c => c.count >= 5);
            
            if (frequentCategory) {
                this.insights.push({
                    type: 'info',
                    title: 'Gasto frequente',
                    description: `Você teve ${frequentCategory.count} transações em ${frequentCategory.name} recentemente.`,
                    icon: 'fa-repeat'
                });
            }
        }
    }
    
    /**
     * Analisa padrões de gasto
     * @param {Array} transactions - Lista de transações ordenadas por data
     */
    analyzeSpendingPatterns(transactions) {
        // Agrupar por dia da semana
        const weekdaySpending = {
            0: { day: 'Domingo', total: 0, count: 0 },
            1: { day: 'Segunda', total: 0, count: 0 },
            2: { day: 'Terça', total: 0, count: 0 },
            3: { day: 'Quarta', total: 0, count: 0 },
            4: { day: 'Quinta', total: 0, count: 0 },
            5: { day: 'Sexta', total: 0, count: 0 },
            6: { day: 'Sábado', total: 0, count: 0 }
        };
        
        // Contabilizar gastos por dia da semana
        transactions.forEach(transaction => {
            if (transaction.type === 'expense') {
                const date = new Date(transaction.date);
                const weekday = date.getDay();
                
                weekdaySpending[weekday].total += transaction.amount;
                weekdaySpending[weekday].count += 1;
            }
        });
        
        // Calcular média por dia
        Object.values(weekdaySpending).forEach(day => {
            day.average = day.count > 0 ? day.total / day.count : 0;
        });
        
        // Encontrar dia com maior média de gastos
        const sortedDays = Object.values(weekdaySpending).sort((a, b) => b.average - a.average);
        
        if (sortedDays[0].count >= 3 && sortedDays[0].average > 0) {
            this.insights.push({
                type: 'info',
                title: 'Padrão de gastos',
                description: `Seus maiores gastos costumam ocorrer às ${sortedDays[0].day}s.`,
                icon: 'fa-calendar-day'
            });
        }
    }
    
    /**
     * Calcula taxa de poupança
     * @param {Array} transactions - Lista de transações ordenadas por data
     */
    calculateSavingsRate(transactions) {
        // Filtrar transações do último mês
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        lastMonth.setDate(1);
        lastMonth.setHours(0, 0, 0, 0);
        
        const currentMonth = new Date();
        currentMonth.setDate(1);
        currentMonth.setHours(0, 0, 0, 0);
        
        const lastMonthTransactions = transactions.filter(t => {
            const date = new Date(t.date);
            return date >= lastMonth && date < currentMonth;
        });
        
        // Calcular receitas e despesas
        const income = lastMonthTransactions.reduce((sum, t) => 
            t.type === 'income' ? sum + t.amount : sum, 0
        );
        
        const expenses = lastMonthTransactions.reduce((sum, t) => 
            t.type === 'expense' ? sum + t.amount : sum, 0
        );
        
        // Calcular taxa de poupança
        if (income > 0) {
            const savingsRate = ((income - expenses) / income) * 100;
            
            if (savingsRate < 0) {
                this.insights.push({
                    type: 'negative',
                    title: 'Balanço negativo',
                    description: 'No último mês, suas despesas foram maiores que suas receitas.',
                    icon: 'fa-exclamation-triangle'
                });
            } else if (savingsRate < 10) {
                this.insights.push({
                    type: 'warning',
                    title: 'Baixa poupança',
                    description: `Sua taxa de poupança foi de ${savingsRate.toFixed(1)}% no último mês.`,
                    icon: 'fa-piggy-bank'
                });
            } else if (savingsRate > 30) {
                this.insights.push({
                    type: 'positive',
                    title: 'Boa poupança',
                    description: `Sua taxa de poupança foi de ${savingsRate.toFixed(1)}% no último mês. Continue assim!`,
                    icon: 'fa-piggy-bank'
                });
            }
        }
    }
    
    /**
     * Identifica transações incomuns ou atípicas
     * @param {Array} transactions - Lista de transações ordenadas por data
     */
    identifyUnusualTransactions(transactions) {
        // Filtrar apenas despesas
        const expenses = transactions.filter(t => t.type === 'expense');
        
        if (expenses.length < 10) return;
        
        // Calcular média e desvio padrão dos valores
        const values = expenses.map(t => t.amount);
        const average = values.reduce((sum, val) => sum + val, 0) / values.length;
        
        const variance = values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);
        
        // Identificar transações atípicas (valores acima de 2 desvios padrão)
        const threshold = average + (2 * stdDev);
        
        const unusualTransactions = expenses
            .filter(t => t.amount > threshold)
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 3); // Limitar a 3 transações
        
        if (unusualTransactions.length > 0) {
            const transaction = unusualTransactions[0];
            const category = this.getCategoryName(transaction.category);
            
            this.insights.push({
                type: 'info',
                title: 'Transação incomum',
                description: `Gasto de R$ ${transaction.amount.toFixed(2)} em ${category} foi maior que o normal.`,
                icon: 'fa-exclamation-circle'
            });
        }
    }
    
    /**
     * Agrupa transações por mês
     * @param {Array} transactions - Lista de transações
     * @returns {Object} - Dados agrupados por mês
     */
    groupByMonth(transactions) {
        const months = {};
        
        transactions.forEach(transaction => {
            const date = new Date(transaction.date);
            const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            
            if (!months[monthKey]) {
                months[monthKey] = {
                    year: date.getFullYear(),
                    month: date.getMonth() + 1,
                    income: 0,
                    expense: 0,
                    transactions: []
                };
            }
            
            if (transaction.type === 'income') {
                months[monthKey].income += transaction.amount;
            } else {
                months[monthKey].expense += transaction.amount;
            }
            
            months[monthKey].transactions.push(transaction);
        });
        
        return months;
    }
    
    /**
     * Calcula a tendência com base em valores sequenciais
     * @param {Array} values - Lista de valores
     * @returns {Object} - Dados da tendência
     */
    calculateTrend(values) {
        if (values.length < 2) {
            return { trend: 'stable', percentage: 0 };
        }
        
        const first = values[0];
        const last = values[values.length - 1];
        
        if (first === 0) return { trend: 'up', percentage: 100 };
        
        const change = ((last - first) / first) * 100;
        
        let trend = 'stable';
        if (change > 5) {
            trend = 'up';
        } else if (change < -5) {
            trend = 'down';
        }
        
        return { trend, percentage: change };
    }
    
    /**
     * Mostra detalhes de uma categoria quando clicada no gráfico
     * @param {Object} category - Dados da categoria
     */
    showCategoryDetails(category) {
        const modalId = 'categoryDetailsModal';
        
        // Verificar se o modal já existe
        let modal = document.getElementById(modalId);
        
        if (!modal) {
            // Criar modal
            modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'modal';
            
            document.body.appendChild(modal);
        }
        
        // Formatar lista de transações
        const transactionsList = category.transactions
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map(t => `
                <li class="transaction-item">
                    <div class="transaction-date">${new Date(t.date).toLocaleDateString('pt-BR')}</div>
                    <div class="transaction-desc">${t.description}</div>
                    <div class="transaction-amount">R$ ${t.amount.toFixed(2)}</div>
                </li>
            `)
            .join('');
        
        // Preencher conteúdo
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Detalhes da Categoria: ${category.name}</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="category-summary">
                        <div class="summary-item">
                            <span class="label">Total Gasto</span>
                            <span class="value">R$ ${category.total.toFixed(2)}</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Transações</span>
                            <span class="value">${category.transactions.length}</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Média por Transação</span>
                            <span class="value">R$ ${(category.total / category.transactions.length).toFixed(2)}</span>
                        </div>
                    </div>
                    
                    <h4>Transações</h4>
                    <ul class="transactions-list">
                        ${transactionsList}
                    </ul>
                </div>
            </div>
        `;
        
        // Adicionar eventos
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.classList.remove('active');
        });
        
        // Exibir modal
        modal.classList.add('active');
    }
    
    /**
     * Obtém o nome da categoria a partir do ID
     * @param {string} categoryId - ID da categoria
     * @returns {string} - Nome da categoria
     */
    getCategoryName(categoryId) {
        // Tentar obter categorias do armazenamento
        const categoriesData = this.storageManager?.getCategories();
        if (categoriesData) {
            // Buscar em categorias de receita e despesa
            const incomeCategory = categoriesData.income?.find(c => c.id === categoryId);
            if (incomeCategory) return incomeCategory.name;
            
            const expenseCategory = categoriesData.expense?.find(c => c.id === categoryId);
            if (expenseCategory) return expenseCategory.name;
        }
        
        return categoryId || 'Sem categoria';
    }
    
    /**
     * Exibe os insights calculados
     * @param {string} containerId - ID do container
     */
    displayInsights(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        if (this.insights.length === 0) {
            container.innerHTML = `
                <div class="empty-insights">
                    <i class="fas fa-lightbulb"></i>
                    <p>Insights serão exibidos à medida que mais dados forem adicionados.</p>
                </div>
            `;
            return;
        }
        
        // Limitar a 3 insights
        const displayInsights = this.insights.slice(0, 3);
        
        // Criar HTML
        const insightsHTML = displayInsights.map(insight => `
            <div class="insight-card insight-${insight.type}">
                <div class="insight-icon">
                    <i class="fas ${insight.icon}"></i>
                </div>
                <div class="insight-content">
                    <h4>${insight.title}</h4>
                    <p>${insight.description}</p>
                </div>
            </div>
        `).join('');
        
        // Adicionar ao container
        container.innerHTML = `
            <h3>Insights Financeiros</h3>
            <div class="insights-list">
                ${insightsHTML}
            </div>
            <style>
                .insights-list {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                
                .insight-card {
                    display: flex;
                    padding: 15px;
                    border-radius: var(--border-radius-sm);
                    background-color: white;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    border-left: 4px solid transparent;
                }
                
                .insight-positive {
                    border-left-color: var(--income-color);
                }
                
                .insight-warning {
                    border-left-color: var(--warning-color);
                }
                
                .insight-negative {
                    border-left-color: var(--expense-color);
                }
                
                .insight-info {
                    border-left-color: var(--info-color);
                }
                
                .insight-icon {
                    flex-shrink: 0;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background-color: rgba(0,0,0,0.05);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 15px;
                }
                
                .insight-positive .insight-icon {
                    color: var(--income-color);
                }
                
                .insight-warning .insight-icon {
                    color: var(--warning-color);
                }
                
                .insight-negative .insight-icon {
                    color: var(--expense-color);
                }
                
                .insight-info .insight-icon {
                    color: var(--info-color);
                }
                
                .insight-content h4 {
                    margin: 0 0 5px 0;
                    font-size: var(--font-size-md);
                }
                
                .insight-content p {
                    margin: 0;
                    font-size: var(--font-size-sm);
                    color: var(--text-light);
                }
                
                .empty-insights {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 30px 20px;
                    text-align: center;
                    color: var(--text-light);
                }
                
                .empty-insights i {
                    font-size: 32px;
                    margin-bottom: 10px;
                    opacity: 0.3;
                }
            </style>
        `;
    }
    
    /**
     * Exibe estado vazio quando não há dados suficientes
     * @param {Object} containers - Objeto com IDs dos containers
     */
    showEmptyState(containers) {
        Object.values(containers).forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = `
                    <div class="empty-analytics-state">
                        <i class="fas fa-chart-line"></i>
                        <p>Adicione transações para visualizar suas análises financeiras</p>
                        <button class="btn btn-primary" id="addFirstTransactionBtn">
                            <i class="fas fa-plus"></i> Adicionar Transação
                        </button>
                    </div>
                    <style>
                        .empty-analytics-state {
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            padding: 40px 20px;
                            text-align: center;
                            color: var(--text-light);
                        }
                        
                        .empty-analytics-state i {
                            font-size: 48px;
                            margin-bottom: 15px;
                            opacity: 0.3;
                        }
                        
                        .empty-analytics-state p {
                            margin-bottom: 20px;
                        }
                    </style>
                `;
            }
        });
        
        // Adicionar evento ao botão de adicionar transação
        const addTransactionBtn = document.getElementById('addFirstTransactionBtn');
        if (addTransactionBtn) {
            addTransactionBtn.addEventListener('click', () => {
                const uiManager = window.app?.uiManager;
                if (uiManager) {
                    uiManager.openModal('addTransactionModal');
                }
            });
        }
    }
    
    /**
     * Atualiza os gráficos e insights com novos dados
     */
    async update() {
        // Carregar transações atualizadas
        const transactions = await this.transactionManager.getTransactions();
        
        // Atualizar cada gráfico
        Object.values(this.charts).forEach(chart => {
            chart.updateData(transactions);
        });
        
        // Recalcular insights
        this.calculateInsights(transactions);
        
        // Atualizar exibição de insights
        const insightsContainer = document.getElementById('financialInsights');
        if (insightsContainer) {
            this.displayInsights('financialInsights');
        }
    }
    
    /**
     * Destrói todas as instâncias e limpa recursos
     */
    destroy() {
        Object.values(this.charts).forEach(chart => {
            chart.destroy();
        });
        
        this.charts = {};
        this.insights = [];
    }
}

export default FinanceAnalytics;
