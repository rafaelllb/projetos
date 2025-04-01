// /frontend/js/components/transaction-insights.js
// Componente avançado para visualização e análise de transações

/**
 * Classe TransactionInsights
 * Fornece visualização avançada e análise preditiva de transações financeiras
 */
class TransactionInsights {
    /**
     * @param {Object} options - Opções de configuração
     * @param {Object} options.transactionManager - Gerenciador de transações
     * @param {Object} options.storageManager - Gerenciador de armazenamento
     * @param {string} options.containerId - ID do container para renderizar os insights
     */
    constructor(options) {
        this.transactionManager = options.transactionManager;
        this.storageManager = options.storageManager;
        this.container = document.getElementById(options.containerId);
        this.transactions = [];
        this.categories = {};
        this.insights = [];
        this.chart = null;
        
        // Configurações padrão
        this.config = {
            timePeriod: 'month', // 'week', 'month', 'quarter', 'year'
            threshold: 0.25, // Limite para destacar variações significativas
            maxInsights: 5, // Máximo de insights exibidos
            predictMonths: 3 // Meses a prever no futuro
        };
        
        // Mesclar configurações personalizadas
        if (options.config) {
            this.config = { ...this.config, ...options.config };
        }
        
        // Verificar container
        if (!this.container) {
            console.error(`Container não encontrado: ${options.containerId}`);
            return;
        }
    }
    
    /**
     * Inicializa o componente de insights
     */
    async init() {
        try {
            // Carregar dados
            await this.loadData();
            
            if (this.transactions.length === 0) {
                this.renderEmptyState();
                return;
            }
            
            // Analisar dados
            this.analyzeTransactions();
            
            // Renderizar interface
            this.render();
            
            // Configurar eventos
            this.setupEvents();
            
        } catch (error) {
            console.error('Erro ao inicializar insights de transações:', error);
            this.renderError();
        }
    }
    
    /**
     * Carrega dados de transações e categorias
     */
    async loadData() {
        // Carregar categorias
        this.categories = this.storageManager.getCategories() || { income: [], expense: [] };
        
        // Carregar transações
        this.transactions = await this.transactionManager.getTransactions();
        
        // Ordenar por data (mais recentes primeiro)
        this.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    
    /**
     * Analisa transações para gerar insights
     */
    analyzeTransactions() {
        this.insights = [];
        
        // Verificar quantidade mínima de dados
        if (this.transactions.length < 5) {
            this.insights.push({
                type: 'info',
                title: 'Dados insuficientes',
                description: 'Registre mais transações para obter insights personalizados.',
                icon: 'fa-info-circle'
            });
            return;
        }
        
        // Análises
        this.analyzeRecurringExpenses();
        this.analyzeSeasonalPatterns();
        this.analyzeUnusualTransactions();
        this.analyzeMonthOverMonth();
        this.predictFutureExpenses();
        
        // Limitar quantidade de insights
        this.insights = this.insights.slice(0, this.config.maxInsights);
    }
    
    /**
     * Identifica despesas recorrentes
     */
    analyzeRecurringExpenses() {
        // Agrupar transações por descrição e categoria
        const groups = {};
        
        this.transactions.forEach(transaction => {
            if (transaction.type !== 'expense') return;
            
            const key = `${transaction.description.toLowerCase()}_${transaction.category}`;
            if (!groups[key]) {
                groups[key] = {
                    description: transaction.description,
                    category: transaction.category,
                    transactions: [],
                    total: 0
                };
            }
            
            groups[key].transactions.push(transaction);
            groups[key].total += transaction.amount;
        });
        
        // Filtrar grupos com pelo menos 3 transações
        const recurringGroups = Object.values(groups).filter(g => g.transactions.length >= 3);
        
        // Ordenar por valor total
        recurringGroups.sort((a, b) => b.total - a.total);
        
        // Identificar despesas recorrentes significativas
        if (recurringGroups.length > 0) {
            const top = recurringGroups[0];
            const categoryName = this.getCategoryName(top.category, 'expense');
            
            // Calcular valor médio
            const avgAmount = top.total / top.transactions.length;
            
            // Adicionar insight
            this.insights.push({
                type: 'info',
                title: 'Despesa recorrente identificada',
                description: `${top.description} (${categoryName}) - média de R$ ${avgAmount.toFixed(2)} (${top.transactions.length}x)`,
                icon: 'fa-redo',
                data: top
            });
        }
    }
    
    /**
     * Analisa padrões sazonais nos gastos
     */
    analyzeSeasonalPatterns() {
        // Agrupar despesas por mês
        const monthlyExpenses = {};
        
        this.transactions.forEach(transaction => {
            if (transaction.type !== 'expense') return;
            
            const date = new Date(transaction.date);
            const monthKey = date.getMonth();
            
            if (!monthlyExpenses[monthKey]) {
                monthlyExpenses[monthKey] = {
                    month: monthKey,
                    name: this.getMonthName(monthKey),
                    total: 0,
                    count: 0
                };
            }
            
            monthlyExpenses[monthKey].total += transaction.amount;
            monthlyExpenses[monthKey].count++;
        });
        
        // Converter para array e calcular média
        const monthsArray = Object.values(monthlyExpenses);
        
        if (monthsArray.length < 3) return; // Dados insuficientes
        
        monthsArray.forEach(month => {
            month.average = month.total / month.count;
        });
        
        // Ordenar por média
        monthsArray.sort((a, b) => b.average - a.average);
        
        // Calcular média global
        const totalSum = monthsArray.reduce((sum, month) => sum + month.total, 0);
        const totalCount = monthsArray.reduce((sum, month) => sum + month.count, 0);
        const globalAverage = totalSum / totalCount;
        
        // Identificar meses com gastos acima da média
        const highExpenseMonths = monthsArray.filter(month => 
            month.average > (globalAverage * (1 + this.config.threshold))
        );
        
        if (highExpenseMonths.length > 0) {
            const topMonth = highExpenseMonths[0];
            const percent = ((topMonth.average - globalAverage) / globalAverage * 100).toFixed(0);
            
            this.insights.push({
                type: 'warning',
                title: 'Padrão sazonal detectado',
                description: `Seus gastos em ${topMonth.name} são tipicamente ${percent}% maiores que a média anual.`,
                icon: 'fa-calendar-alt',
                data: {
                    month: topMonth,
                    globalAverage,
                    allMonths: monthsArray
                }
            });
        }
    }
    
    /**
     * Identifica transações incomuns ou atípicas
     */
    analyzeUnusualTransactions() {
        // Obter transações recentes (últimos 90 dias)
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 90);
        
        const recentTransactions = this.transactions.filter(t => 
            new Date(t.date) >= cutoffDate && t.type === 'expense'
        );
        
        if (recentTransactions.length < 5) return;
        
        // Calcular média e desvio padrão
        const amounts = recentTransactions.map(t => t.amount);
        const avgAmount = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;
        
        // Calcular desvio padrão
        const variance = amounts.reduce((sum, val) => sum + Math.pow(val - avgAmount, 2), 0) / amounts.length;
        const stdDev = Math.sqrt(variance);
        
        // Definir limite para transações incomuns (2 desvios padrão acima da média)
        const threshold = avgAmount + (2 * stdDev);
        
        // Identificar transações acima do limite
        const unusualTransactions = recentTransactions
            .filter(t => t.amount > threshold)
            .sort((a, b) => b.amount - a.amount);
        
        if (unusualTransactions.length > 0) {
            const top = unusualTransactions[0];
            const categoryName = this.getCategoryName(top.category, 'expense');
            const date = new Date(top.date).toLocaleDateString('pt-BR');
            
            this.insights.push({
                type: 'alert',
                title: 'Transação incomum detectada',
                description: `Gasto de R$ ${top.amount.toFixed(2)} em ${categoryName} (${date}) está significativamente acima da média.`,
                icon: 'fa-exclamation-triangle',
                data: {
                    transaction: top,
                    average: avgAmount,
                    threshold
                }
            });
        }
    }
    
    /**
     * Analisa variações mês a mês
     */
    analyzeMonthOverMonth() {
        // Agrupar por mês
        const monthlyData = {};
        
        this.transactions.forEach(transaction => {
            const date = new Date(transaction.date);
            const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            
            if (!monthlyData[key]) {
                monthlyData[key] = {
                    year: date.getFullYear(),
                    month: date.getMonth(),
                    income: 0,
                    expense: 0,
                    timestamp: date.getTime()
                };
            }
            
            if (transaction.type === 'income') {
                monthlyData[key].income += transaction.amount;
            } else {
                monthlyData[key].expense += transaction.amount;
            }
        });
        
        // Converter para array e ordenar por data
        const months = Object.values(monthlyData).sort((a, b) => b.timestamp - a.timestamp);
        
        // Precisamos de pelo menos 2 meses de dados
        if (months.length < 2) return;
        
        // Comparar os dois meses mais recentes
        const currentMonth = months[0];
        const previousMonth = months[1];
        
        // Calcular variações percentuais
        const incomeChange = previousMonth.income > 0 
            ? ((currentMonth.income - previousMonth.income) / previousMonth.income) * 100 
            : 100;
            
        const expenseChange = previousMonth.expense > 0 
            ? ((currentMonth.expense - previousMonth.expense) / previousMonth.expense) * 100 
            : 100;
        
        // Verificar variações significativas
        if (Math.abs(incomeChange) > this.config.threshold * 100) {
            const trend = incomeChange > 0 ? 'aumento' : 'redução';
            const type = incomeChange > 0 ? 'positive' : 'warning';
            
            this.insights.push({
                type: type,
                title: `${trend} de receitas`,
                description: `Suas receitas tiveram ${trend} de ${Math.abs(incomeChange).toFixed(1)}% em relação ao mês anterior.`,
                icon: incomeChange > 0 ? 'fa-arrow-up' : 'fa-arrow-down',
                data: {
                    currentMonth,
                    previousMonth,
                    change: incomeChange
                }
            });
        }
        
        if (Math.abs(expenseChange) > this.config.threshold * 100) {
            const trend = expenseChange > 0 ? 'aumento' : 'redução';
            const type = expenseChange > 0 ? 'warning' : 'positive';
            
            this.insights.push({
                type: type,
                title: `${trend} de despesas`,
                description: `Suas despesas tiveram ${trend} de ${Math.abs(expenseChange).toFixed(1)}% em relação ao mês anterior.`,
                icon: expenseChange > 0 ? 'fa-arrow-up' : 'fa-arrow-down',
                data: {
                    currentMonth,
                    previousMonth,
                    change: expenseChange
                }
            });
        }
    }
    
    /**
     * Prediz despesas futuras com base em padrões históricos
     */
    predictFutureExpenses() {
        // Precisamos de pelo menos 6 meses de dados para previsão
        if (this.transactions.length < 20) return;
        
        // Agrupar despesas por mês e categoria
        const monthlyExpensesByCategory = {};
        
        this.transactions.forEach(transaction => {
            if (transaction.type !== 'expense') return;
            
            const date = new Date(transaction.date);
            const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            
            if (!monthlyExpensesByCategory[monthKey]) {
                monthlyExpensesByCategory[monthKey] = {
                    month: date.getMonth(),
                    year: date.getFullYear(),
                    timestamp: date.getTime(),
                    categories: {}
                };
            }
            
            const categoryId = transaction.category;
            if (!monthlyExpensesByCategory[monthKey].categories[categoryId]) {
                monthlyExpensesByCategory[monthKey].categories[categoryId] = 0;
            }
            
            monthlyExpensesByCategory[monthKey].categories[categoryId] += transaction.amount;
        });
        
        // Converter para array e ordenar por data
        const monthsData = Object.values(monthlyExpensesByCategory)
            .sort((a, b) => a.timestamp - b.timestamp);
        
        // Precisamos de pelo menos 6 meses para previsão
        if (monthsData.length < 6) return;
        
        // Obter últimos 6 meses
        const recentMonths = monthsData.slice(-6);
        
        // Identificar categoria com maior crescimento
        const categoryGrowth = {};
        
        // Inicializar com todas as categorias
        this.categories.expense.forEach(category => {
            categoryGrowth[category.id] = {
                id: category.id,
                name: category.name,
                values: [],
                growth: 0
            };
        });
        
        // Coletar valores para cada categoria nos últimos meses
        recentMonths.forEach(month => {
            Object.keys(categoryGrowth).forEach(categoryId => {
                const value = month.categories[categoryId] || 0;
                categoryGrowth[categoryId].values.push(value);
            });
        });
        
        // Calcular taxa de crescimento mensal para cada categoria
        Object.values(categoryGrowth).forEach(category => {
            if (category.values.length < 3) return;
            
            // Calcular taxa utilizando regressão linear simples
            const n = category.values.length;
            
            // Calcular médias
            let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
            
            for (let i = 0; i < n; i++) {
                sumX += i;
                sumY += category.values[i];
                sumXY += i * category.values[i];
                sumXX += i * i;
            }
            
            const avgX = sumX / n;
            const avgY = sumY / n;
            
            // Calcular coeficiente angular (slope)
            const slope = (sumXY - sumX * avgY) / (sumXX - sumX * avgX);
            
            // Calcular taxa de crescimento médio
            if (avgY > 0) {
                category.growth = (slope / avgY) * 100;
            }
        });
        
        // Ordenar por taxa de crescimento (decrescente)
        const sortedCategories = Object.values(categoryGrowth)
            .filter(c => c.values.some(v => v > 0)) // Apenas categorias com dados
            .sort((a, b) => b.growth - a.growth);
        
        // Identificar categoria com maior crescimento
        if (sortedCategories.length > 0 && sortedCategories[0].growth > 10) {
            const topCategory = sortedCategories[0];
            
            // Calcular previsão para próximos meses
            const lastValue = topCategory.values[topCategory.values.length - 1];
            const monthlyIncrease = (topCategory.growth / 100) * lastValue;
            const prediction = lastValue + (monthlyIncrease * this.config.predictMonths);
            
            this.insights.push({
                type: 'forecast',
                title: 'Previsão de aumento de gastos',
                description: `Seus gastos com ${topCategory.name} podem aumentar em ${topCategory.growth.toFixed(1)}% ao mês, atingindo R$ ${prediction.toFixed(2)} em ${this.config.predictMonths} meses.`,
                icon: 'fa-chart-line',
                data: {
                    category: topCategory,
                    prediction,
                    months: this.config.predictMonths
                }
            });
        }
    }
    
    /**
     * Renderiza o componente de insights
     */
    render() {
        // Limpar container
        this.container.innerHTML = '';
        
        // Criar estrutura base
        const wrapper = document.createElement('div');
        wrapper.className = 'transaction-insights';
        
        // Cabeçalho
        const header = document.createElement('div');
        header.className = 'insights-header';
        header.innerHTML = `
            <h3>Insights Financeiros</h3>
            <div class="insights-controls">
                <select id="insightsPeriod">
                    <option value="month">Último Mês</option>
                    <option value="quarter">Último Trimestre</option>
                    <option value="year">Último Ano</option>
                    <option value="all">Todo o Período</option>
                </select>
            </div>
        `;
        
        // Lista de insights
        const insightsList = document.createElement('div');
        insightsList.className = 'insights-list';
        
        // Renderizar cada insight
        this.insights.forEach(insight => {
            const insightCard = document.createElement('div');
            insightCard.className = `insight-card insight-${insight.type}`;
            insightCard.innerHTML = `
                <div class="insight-icon">
                    <i class="fas ${insight.icon}"></i>
                </div>
                <div class="insight-content">
                    <h4>${insight.title}</h4>
                    <p>${insight.description}</p>
                </div>
                <div class="insight-action">
                    <button class="btn-action" data-action="details">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            `;
            
            // Armazenar dados para uso em eventos
            insightCard.dataset.insightIndex = this.insights.indexOf(insight);
            
            insightsList.appendChild(insightCard);
        });
        
        // Área para gráfico
        const chartArea = document.createElement('div');
        chartArea.className = 'insights-chart-area';
        chartArea.innerHTML = `
            <canvas id="insightsChart"></canvas>
        `;
        
        // Montar estrutura completa
        wrapper.appendChild(header);
        wrapper.appendChild(insightsList);
        wrapper.appendChild(chartArea);
        
        // Adicionar ao container
        this.container.appendChild(wrapper);
        
        // Adicionar estilos
        this.addStyles();
        
        // Inicializar gráfico padrão
        this.initChart();
    }
    
    /**
     * Configura eventos de interação
     */
    setupEvents() {
        // Manipular cliques em insights
        const insightCards = this.container.querySelectorAll('.insight-card');
        
        insightCards.forEach(card => {
            card.addEventListener('click', () => {
                const index = parseInt(card.dataset.insightIndex);
                if (!isNaN(index) && this.insights[index]) {
                    this.showInsightDetails(this.insights[index]);
                }
            });
        });
        
        // Manipular mudança de período
        const periodSelect = this.container.querySelector('#insightsPeriod');
        if (periodSelect) {
            periodSelect.addEventListener('change', () => {
                this.config.timePeriod = periodSelect.value;
                this.init(); // Reinicializar com novo período
            });
        }
    }
    
    /**
     * Inicializa o gráfico padrão
     */
    initChart() {
        const ctx = document.getElementById('insightsChart');
        if (!ctx) return;
        
        // Agrupar por mês
        const monthlyData = this.groupTransactionsByMonth();
        
        // Pegar últimos 12 meses (ou menos se não houver dados suficientes)
        const months = Object.values(monthlyData)
            .sort((a, b) => a.timestamp - b.timestamp)
            .slice(-12);
            
        // Preparar dados para o gráfico
        const labels = months.map(m => m.label);
        const incomeData = months.map(m => m.income);
        const expenseData = months.map(m => m.expense);
        const balanceData = months.map(m => m.income - m.expense);
        
        // Configuração do gráfico
        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Receitas',
                        data: incomeData,
                        backgroundColor: 'rgba(46, 204, 113, 0.7)',
                        borderColor: 'rgba(46, 204, 113, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Despesas',
                        data: expenseData,
                        backgroundColor: 'rgba(231, 76, 60, 0.7)',
                        borderColor: 'rgba(231, 76, 60, 1)',
                        borderWidth: 1
                    },
                    {
                        type: 'line',
                        label: 'Saldo',
                        data: balanceData,
                        backgroundColor: 'transparent',
                        borderColor: 'rgba(52, 152, 219, 1)',
                        borderWidth: 2,
                        pointBackgroundColor: 'rgba(52, 152, 219, 1)',
                        pointRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'R$ ' + value.toLocaleString('pt-BR');
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                return `${context.dataset.label}: R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Mostra detalhes de um insight específico
     * @param {Object} insight - Insight selecionado
     */
    showInsightDetails(insight) {
        // Destruir gráfico anterior se existir
        if (this.chart) {
            this.chart.destroy();
        }
        
        const ctx = document.getElementById('insightsChart');
        if (!ctx) return;
        
        // Renderizar gráfico específico para o tipo de insight
        switch (insight.type) {
            case 'forecast':
                this.renderPredictionChart(ctx, insight.data);
                break;
                
            case 'warning':
            case 'positive':
                if (insight.icon.includes('arrow')) {
                    this.renderComparisonChart(ctx, insight.data);
                } else {
                    this.renderCategoryBreakdownChart(ctx, insight.data);
                }
                break;
                
            case 'info':
                if (insight.data && insight.data.transactions) {
                    this.renderRecurringExpenseChart(ctx, insight.data);
                } else {
                    this.renderDefaultChart(ctx);
                }
                break;
                
            case 'alert':
                this.renderUnusualTransactionChart(ctx, insight.data);
                break;
                
            default:
                this.renderDefaultChart(ctx);
        }
    }
    
    /**
     * Renderiza gráfico padrão
     */
    renderDefaultChart(ctx) {
        this.initChart();
    }
    
    /**
     * Renderiza gráfico para despesas recorrentes
     */
    renderRecurringExpenseChart(ctx, data) {
        // Extrair transações e ordenar por data
        const transactions = [...data.transactions].sort((a, b) => 
            new Date(a.date) - new Date(b.date)
        );
        
        // Formatar datas e valores
        const labels = transactions.map(t => new Date(t.date).toLocaleDateString('pt-BR'));
        const amounts = transactions.map(t => t.amount);
        
        // Calcular média
        const average = data.total / data.transactions.length;
        const averageLine = Array(transactions.length).fill(average);
        
        // Configurar gráfico
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Valor',
                        data: amounts,
                        borderColor: 'rgba(52, 152, 219, 1)',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        pointBackgroundColor: 'rgba(52, 152, 219, 1)',
                        pointRadius: 5,
                        fill: true
                    },
                    {
                        label: 'Média',
                        data: averageLine,
                        borderColor: 'rgba(231, 76, 60, 0.7)',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        pointRadius: 0,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `Histórico: ${data.description}`,
                        font: {
                            size: 16
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                return `${context.dataset.label}: R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'R$ ' + value.toLocaleString('pt-BR');
                            }
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Renderiza gráfico para transação incomum
     */
    renderUnusualTransactionChart(ctx, data) {
        // Obter transações da mesma categoria
        const categoryId = data.transaction.category;
        const categoryTransactions = this