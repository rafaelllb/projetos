// /frontend/js/components/transaction-chart.js
// Componente para visualização de transações no dashboard

/**
 * Classe para criação e gerenciamento de gráficos de transações
 * Fornece visualizações interativas para análise de dados financeiros
 */
class TransactionChart {
    /**
     * @param {Object} config - Configuração do gráfico
     * @param {string} config.containerId - ID do elemento HTML que conterá o gráfico
     * @param {string} config.type - Tipo de gráfico ('category', 'timeline', 'comparison')
     * @param {Object} config.options - Opções específicas do gráfico
     * @param {Function} config.onSegmentClick - Callback quando um segmento do gráfico é clicado
     */
    constructor(config) {
        this.containerId = config.containerId;
        this.type = config.type || 'category';
        this.options = config.options || {};
        this.onSegmentClick = config.onSegmentClick;
        this.chart = null;
        this.data = null;
        this.container = document.getElementById(this.containerId);
        
        // Validar container
        if (!this.container) {
            console.error(`Container com ID '${this.containerId}' não encontrado`);
            return;
        }
    }
    
    /**
     * Inicializa o gráfico
     * @param {Array} data - Dados para o gráfico
     */
    init(data) {
        if (!data || data.length === 0) {
            this.showEmptyState();
            return;
        }
        
        this.data = data;
        
        // Criar canvas para o gráfico
        const canvas = document.createElement('canvas');
        canvas.width = this.container.clientWidth;
        canvas.height = this.options.height || 300;
        
        // Limpar container e adicionar canvas
        this.container.innerHTML = '';
        this.container.appendChild(canvas);
        
        // Inicializar gráfico de acordo com o tipo
        switch (this.type) {
            case 'category':
                this.createCategoryChart(canvas, data);
                break;
            case 'timeline':
                this.createTimelineChart(canvas, data);
                break;
            case 'comparison':
                this.createComparisonChart(canvas, data);
                break;
            default:
                this.createCategoryChart(canvas, data);
        }
        
        // Adicionar tooltip para informações detalhadas
        this.initTooltip();
    }
    
    /**
     * Cria um gráfico de categorias (pizza/donut)
     * @param {HTMLElement} canvas - Elemento canvas para o gráfico
     * @param {Array} data - Dados para o gráfico
     */
    createCategoryChart(canvas, data) {
        // Agrupar transações por categoria
        const categoryData = this.groupByCategory(data);
        
        // Preparar dados para o gráfico
        const chartData = {
            labels: categoryData.map(item => item.name),
            datasets: [{
                data: categoryData.map(item => item.total),
                backgroundColor: this.generateColors(categoryData.length),
                borderWidth: 1
            }]
        };
        
        // Opções do gráfico
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            cutout: this.options.cutout || '60%', // Para gráfico de donut
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
                            return `${context.label}: R$ ${value.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            }
        };
        
        // Criar gráfico
        this.chart = new Chart(canvas.getContext('2d'), {
            type: 'doughnut',
            data: chartData,
            options: options
        });
        
        // Adicionar evento de clique
        if (this.onSegmentClick) {
            canvas.onclick = (evt) => {
                const segments = this.chart.getElementsAtEventForMode(
                    evt, 'nearest', { intersect: true }, true
                );
                
                if (segments.length > 0) {
                    const segment = segments[0];
                    const categoryIndex = segment.index;
                    const category = categoryData[categoryIndex];
                    this.onSegmentClick(category);
                }
            };
        }
    }
    
    /**
     * Cria um gráfico de linha temporal
     * @param {HTMLElement} canvas - Elemento canvas para o gráfico
     * @param {Array} data - Dados para o gráfico
     */
    createTimelineChart(canvas, data) {
        // Agrupar transações por data
        const timeData = this.groupByTime(data, this.options.timeframe || 'month');
        
        // Separar receitas e despesas
        const incomeData = [];
        const expenseData = [];
        const balanceData = [];
        
        timeData.forEach(item => {
            incomeData.push(item.income);
            expenseData.push(item.expense);
            balanceData.push(item.income - item.expense);
        });
        
        // Preparar dados para o gráfico
        const chartData = {
            labels: timeData.map(item => item.label),
            datasets: [
                {
                    label: 'Receitas',
                    data: incomeData,
                    borderColor: 'rgba(46, 204, 113, 1)',
                    backgroundColor: 'rgba(46, 204, 113, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Despesas',
                    data: expenseData,
                    borderColor: 'rgba(231, 76, 60, 1)',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Saldo',
                    data: balanceData,
                    borderColor: 'rgba(52, 152, 219, 1)',
                    backgroundColor: 'rgba(52, 152, 219, 0.0)',
                    borderDash: [5, 5],
                    tension: 0.4
                }
            ]
        };
        
        // Opções do gráfico
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
                            return 'R$ ' + value.toLocaleString('pt-BR');
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            return `${context.dataset.label}: R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                        }
                    }
                }
            }
        };
        
        // Criar gráfico
        this.chart = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: chartData,
            options: options
        });
    }
    
    /**
     * Cria um gráfico de comparação (barras)
     * @param {HTMLElement} canvas - Elemento canvas para o gráfico
     * @param {Array} data - Dados para o gráfico
     */
    createComparisonChart(canvas, data) {
        // Agrupar transações por categoria e separar por tipo
        const categoryData = this.groupByCategoryAndType(data);
        
        // Preparar dados para o gráfico
        const chartData = {
            labels: categoryData.categories,
            datasets: [
                {
                    label: 'Receitas',
                    data: categoryData.incomeValues,
                    backgroundColor: 'rgba(46, 204, 113, 0.7)',
                    borderColor: 'rgba(46, 204, 113, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Despesas',
                    data: categoryData.expenseValues,
                    backgroundColor: 'rgba(231, 76, 60, 0.7)',
                    borderColor: 'rgba(231, 76, 60, 1)',
                    borderWidth: 1
                }
            ]
        };
        
        // Opções do gráfico
        const options = {
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
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            return `${context.dataset.label}: R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                        }
                    }
                }
            }
        };
        
        // Criar gráfico
        this.chart = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: chartData,
            options: options
        });
    }
    
    /**
     * Agrupa transações por categoria
     * @param {Array} transactions - Lista de transações
     * @returns {Array} - Dados agrupados por categoria
     */
    groupByCategory(transactions) {
        const categories = {};
        
        // Filtrar apenas despesas se não especificado
        const filteredTransactions = this.options.includeIncome 
            ? transactions 
            : transactions.filter(t => t.type === 'expense');
        
        // Agrupar por categoria
        filteredTransactions.forEach(transaction => {
            const categoryId = transaction.category;
            if (!categories[categoryId]) {
                categories[categoryId] = {
                    id: categoryId,
                    name: this.getCategoryName(categoryId),
                    total: 0,
                    transactions: []
                };
            }
            
            categories[categoryId].total += transaction.amount;
            categories[categoryId].transactions.push(transaction);
        });
        
        // Converter para array e ordenar por valor
        const result = Object.values(categories);
        result.sort((a, b) => b.total - a.total);
        
        return result;
    }
    
    /**
     * Agrupa transações por período de tempo
     * @param {Array} transactions - Lista de transações
     * @param {string} timeframe - Período ('day', 'week', 'month', 'year')
     * @returns {Array} - Dados agrupados por tempo
     */
    groupByTime(transactions, timeframe) {
        const timePeriods = {};
        
        // Agrupar por período
        transactions.forEach(transaction => {
            const date = new Date(transaction.date);
            let periodKey;
            let periodLabel;
            
            switch (timeframe) {
                case 'day':
                    periodKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
                    periodLabel = date.toLocaleDateString('pt-BR');
                    break;
                case 'week':
                    const weekStart = new Date(date);
                    weekStart.setDate(date.getDate() - date.getDay());
                    periodKey = `${weekStart.getFullYear()}-W${Math.floor((weekStart.getDate() - 1) / 7) + 1}`;
                    periodLabel = `${weekStart.toLocaleDateString('pt-BR')} - ${new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}`;
                    break;
                case 'year':
                    periodKey = date.getFullYear().toString();
                    periodLabel = periodKey;
                    break;
                case 'month':
                default:
                    periodKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                    periodLabel = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
            }
            
            if (!timePeriods[periodKey]) {
                timePeriods[periodKey] = {
                    key: periodKey,
                    label: periodLabel,
                    income: 0,
                    expense: 0,
                    transactions: []
                };
            }
            
            if (transaction.type === 'income') {
                timePeriods[periodKey].income += transaction.amount;
            } else {
                timePeriods[periodKey].expense += transaction.amount;
            }
            
            timePeriods[periodKey].transactions.push(transaction);
        });
        
        // Converter para array e ordenar por período
        const result = Object.values(timePeriods);
        result.sort((a, b) => a.key.localeCompare(b.key));
        
        return result;
    }
    
    /**
     * Agrupa transações por categoria e tipo
     * @param {Array} transactions - Lista de transações
     * @returns {Object} - Dados agrupados por categoria e tipo
     */
    groupByCategoryAndType(transactions) {
        const categories = {};
        
        // Agrupar por categoria e tipo
        transactions.forEach(transaction => {
            const categoryId = transaction.category;
            if (!categories[categoryId]) {
                categories[categoryId] = {
                    id: categoryId,
                    name: this.getCategoryName(categoryId),
                    income: 0,
                    expense: 0
                };
            }
            
            if (transaction.type === 'income') {
                categories[categoryId].income += transaction.amount;
            } else {
                categories[categoryId].expense += transaction.amount;
            }
        });
        
        // Converter para arrays separados
        const result = {
            categories: [],
            incomeValues: [],
            expenseValues: []
        };
        
        // Obter top categorias baseado na soma de receitas e despesas
        const categoriesArray = Object.values(categories);
        categoriesArray.sort((a, b) => (b.income + b.expense) - (a.income + a.expense));
        
        const topCategories = categoriesArray.slice(0, 10); // Limitar a 10 categorias
        
        topCategories.forEach(cat => {
            result.categories.push(cat.name);
            result.incomeValues.push(cat.income);
            result.expenseValues.push(cat.expense);
        });
        
        return result;
    }
    
    /**
     * Obtém o nome da categoria a partir do ID
     * @param {string} categoryId - ID da categoria
     * @returns {string} - Nome da categoria
     */
    getCategoryName(categoryId) {
        // Em uma implementação real, isso buscaria o nome da categoria do armazenamento
        // Por enquanto, retornaremos o ID como nome ou um nome genérico
        
        // Tentar obter categorias do armazenamento
        const categoriesData = window.app?.storageManager?.getCategories();
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
     * Gera cores para os segmentos do gráfico
     * @param {number} count - Quantidade de cores necessárias
     * @returns {Array} - Lista de cores
     */
    generateColors(count) {
        const baseColors = [
            'rgba(52, 152, 219, 0.8)', // Azul
            'rgba(231, 76, 60, 0.8)',  // Vermelho
            'rgba(46, 204, 113, 0.8)', // Verde
            'rgba(155, 89, 182, 0.8)', // Roxo
            'rgba(241, 196, 15, 0.8)', // Amarelo
            'rgba(230, 126, 34, 0.8)', // Laranja
            'rgba(26, 188, 156, 0.8)', // Turquesa
            'rgba(149, 165, 166, 0.8)', // Cinza
            'rgba(211, 84, 0, 0.8)',   // Laranja escuro
            'rgba(41, 128, 185, 0.8)'  // Azul escuro
        ];
        
        // Se precisar de mais cores do que as disponíveis, gerar cores adicionais
        if (count <= baseColors.length) {
            return baseColors.slice(0, count);
        } else {
            const colors = [...baseColors];
            
            for (let i = baseColors.length; i < count; i++) {
                // Gerar cor aleatória
                const r = Math.floor(Math.random() * 200 + 30);
                const g = Math.floor(Math.random() * 200 + 30);
                const b = Math.floor(Math.random() * 200 + 30);
                colors.push(`rgba(${r}, ${g}, ${b}, 0.8)`);
            }
            
            return colors;
        }
    }
    
    /**
     * Inicializa tooltip customizado para o gráfico
     */
    initTooltip() {
        // Verificar se já existe um tooltip
        let tooltip = document.getElementById('chart-tooltip');
        
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'chart-tooltip';
            tooltip.className = 'chart-tooltip hidden';
            document.body.appendChild(tooltip);
            
            // Estilizar tooltip
            const style = document.createElement('style');
            style.textContent = `
                .chart-tooltip {
                    position: absolute;
                    background-color: rgba(255, 255, 255, 0.95);
                    color: #333;
                    padding: 10px;
                    border-radius: 4px;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
                    pointer-events: none;
                    z-index: 1000;
                    font-size: 12px;
                    max-width: 250px;
                    transition: opacity 0.3s ease;
                }
                .chart-tooltip.hidden {
                    opacity: 0;
                    visibility: hidden;
                }
                .chart-tooltip h4 {
                    margin: 0 0 5px 0;
                    font-size: 14px;
                }
                .chart-tooltip .tooltip-value {
                    font-weight: bold;
                }
                .chart-tooltip .tooltip-percent {
                    color: #666;
                    font-size: 11px;
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    /**
     * Atualiza os dados do gráfico
     * @param {Array} data - Novos dados para o gráfico
     */
    updateData(data) {
        if (!this.chart) {
            this.init(data);
            return;
        }
        
        this.data = data;
        
        // Atualizar dados de acordo com o tipo de gráfico
        switch (this.type) {
            case 'category':
                const categoryData = this.groupByCategory(data);
                this.chart.data.labels = categoryData.map(item => item.name);
                this.chart.data.datasets[0].data = categoryData.map(item => item.total);
                break;
                
            case 'timeline':
                const timeData = this.groupByTime(data, this.options.timeframe || 'month');
                this.chart.data.labels = timeData.map(item => item.label);
                this.chart.data.datasets[0].data = timeData.map(item => item.income);
                this.chart.data.datasets[1].data = timeData.map(item => item.expense);
                this.chart.data.datasets[2].data = timeData.map(item => item.income - item.expense);
                break;
                
            case 'comparison':
                const compData = this.groupByCategoryAndType(data);
                this.chart.data.labels = compData.categories;
                this.chart.data.datasets[0].data = compData.incomeValues;
                this.chart.data.datasets[1].data = compData.expenseValues;
                break;
        }
        
        this.chart.update();
    }
    
    /**
     * Exibe estado vazio quando não há dados
     */
    showEmptyState() {
        this.container.innerHTML = `
            <div class="empty-chart-state">
                <i class="fas fa-chart-pie"></i>
                <p>Não há dados suficientes para exibir o gráfico</p>
            </div>
            <style>
                .empty-chart-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 40px 20px;
                    text-align: center;
                    color: #999;
                    height: 200px;
                }
                
                .empty-chart-state i {
                    font-size: 48px;
                    margin-bottom: 15px;
                    opacity: 0.3;
                }
            </style>
        `;
    }
    
    /**
     * Destrói o gráfico e limpa recursos
     */
    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }
}

export default TransactionChart;
