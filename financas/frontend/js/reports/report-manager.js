// /frontend/js/reports/report-manager.js
// Gerenciador de relatórios financeiros

/**
 * Classe responsável por gerar relatórios financeiros
 */
export class ReportManager {
    /**
     * @param {Object} transactionManager - Instância do gerenciador de transações
     * @param {Object} budgetManager - Instância do gerenciador de orçamentos (opcional)
     * @param {Object} goalsManager - Instância do gerenciador de metas (opcional)
     */
    constructor(transactionManager, budgetManager = null, goalsManager = null) {
        this.transactionManager = transactionManager;
        this.budgetManager = budgetManager;
        this.goalsManager = goalsManager;
        this.charts = {};
    }
    
    /**
     * Gera um relatório de resumo financeiro
     * @param {Date} startDate - Data de início do período
     * @param {Date} endDate - Data de fim do período
     * @returns {Promise<Object>} - Promise que resolve com os dados do relatório
     */
    async generateSummaryReport(startDate, endDate) {
        try {
            // Obter transações do período
            const transactions = await this.transactionManager.filterTransactions({
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0]
            });
            
            // Calcular totais
            const income = transactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + t.amount, 0);
                
            const expense = transactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + t.amount, 0);
                
            const balance = income - expense;
            
            // Calcular totais por categoria
            const categories = {};
            const categoryTotals = {
                income: {},
                expense: {}
            };
            
            // Obter categorias
            if (this.transactionManager.storageManager) {
                const allCategories = this.transactionManager.storageManager.getCategories();
                categories.income = allCategories.income || [];
                categories.expense = allCategories.expense || [];
            }
            
            // Calcular totais por categoria
            transactions.forEach(transaction => {
                if (!categoryTotals[transaction.type][transaction.category]) {
                    categoryTotals[transaction.type][transaction.category] = 0;
                }
                categoryTotals[transaction.type][transaction.category] += transaction.amount;
            });
            
            // Calcular médias diárias
            const days = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
            const dailyAvgIncome = income / days;
            const dailyAvgExpense = expense / days;
            
            // Retornar dados do relatório
            return {
                period: {
                    startDate,
                    endDate,
                    days
                },
                summary: {
                    income,
                    expense,
                    balance,
                    savingsRate: income > 0 ? ((income - expense) / income) * 100 : 0
                },
                averages: {
                    dailyIncome: dailyAvgIncome,
                    dailyExpense: dailyAvgExpense
                },
                categories: categoryTotals,
                transactions: transactions.length,
                categoryMetadata: categories
            };
        } catch (error) {
            console.error('Erro ao gerar relatório de resumo:', error);
            throw error;
        }
    }
    
    /**
     * Gera um relatório de gastos por categoria
     * @param {Date} startDate - Data de início do período
     * @param {Date} endDate - Data de fim do período
     * @returns {Promise<Object>} - Promise que resolve com os dados do relatório
     */
    async generateCategoryReport(startDate, endDate) {
        try {
            // Obter transações do período
            const transactions = await this.transactionManager.filterTransactions({
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
                type: 'expense'
            });
            
            // Obter categorias
            let expenseCategories = [];
            if (this.transactionManager.storageManager) {
                const allCategories = this.transactionManager.storageManager.getCategories();
                expenseCategories = allCategories.expense || [];
            }
            
            // Mapear IDs de categoria para nomes
            const categoryNames = {};
            expenseCategories.forEach(category => {
                categoryNames[category.id] = category.name;
            });
            
            // Agrupar despesas por categoria
            const categoryTotals = {};
            const totalExpense = transactions.reduce((sum, transaction) => {
                const categoryId = transaction.category;
                
                if (!categoryTotals[categoryId]) {
                    categoryTotals[categoryId] = {
                        id: categoryId,
                        name: categoryNames[categoryId] || 'Sem categoria',
                        total: 0,
                        percentage: 0,
                        transactions: []
                    };
                }
                
                categoryTotals[categoryId].total += transaction.amount;
                categoryTotals[categoryId].transactions.push(transaction);
                
                return sum + transaction.amount;
            }, 0);
            
            // Calcular percentuais e ordenar por total
            const categoriesArray = Object.values(categoryTotals);
            categoriesArray.forEach(category => {
                category.percentage = totalExpense > 0 ? (category.percentage = (category.total / totalExpense) * 100) : 0;
            });
            
            categoriesArray.sort((a, b) => b.total - a.total);
            
            // Retornar dados do relatório
            return {
                period: {
                    startDate,
                    endDate
                },
                totalExpense,
                categories: categoriesArray,
                topCategories: categoriesArray.slice(0, 5),
                otherCategories: categoriesArray.slice(5)
            };
        } catch (error) {
            console.error('Erro ao gerar relatório por categoria:', error);
            throw error;
        }
    }
    
    /**
     * Gera um relatório de evolução mensal
     * @param {number} months - Número de meses a incluir no relatório
     * @returns {Promise<Object>} - Promise que resolve com os dados do relatório
     */
    async generateMonthlyReport(months = 12) {
        try {
            // Determinar período
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + 1); // Incluir hoje
            
            const startDate = new Date();
            startDate.setMonth(startDate.getMonth() - months + 1);
            startDate.setDate(1);
            
            // Obter todas as transações no período
            const transactions = await this.transactionManager.filterTransactions({
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0]
            });
            
            // Preparar estrutura de dados para meses
            const monthlyData = [];
            for (let i = 0; i < months; i++) {
                const date = new Date(startDate);
                date.setMonth(date.getMonth() + i);
                
                monthlyData.push({
                    year: date.getFullYear(),
                    month: date.getMonth() + 1,
                    key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
                    label: date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
                    income: 0,
                    expense: 0,
                    balance: 0,
                    transactions: []
                });
            }
            
            // Agrupar transações por mês
            transactions.forEach(transaction => {
                const date = new Date(transaction.date);
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                
                const monthData = monthlyData.find(m => m.key === key);
                if (monthData) {
                    monthData.transactions.push(transaction);
                    
                    if (transaction.type === 'income') {
                        monthData.income += transaction.amount;
                    } else {
                        monthData.expense += transaction.amount;
                    }
                }
            });
            
            // Calcular saldos
            monthlyData.forEach(month => {
                month.balance = month.income - month.expense;
            });
            
            // Calcular médias e totais
            const totalIncome = monthlyData.reduce((sum, month) => sum + month.income, 0);
            const totalExpense = monthlyData.reduce((sum, month) => sum + month.expense, 0);
            const avgMonthlyIncome = totalIncome / months;
            const avgMonthlyExpense = totalExpense / months;
            
            // Encontrar melhores e piores meses
            const bestMonth = [...monthlyData].sort((a, b) => b.balance - a.balance)[0];
            const worstMonth = [...monthlyData].sort((a, b) => a.balance - b.balance)[0];
            
            // Calcular tendências (comparando com média móvel de 3 meses)
            const incomeTrend = this.calculateTrend(monthlyData.map(m => m.income));
            const expenseTrend = this.calculateTrend(monthlyData.map(m => m.expense));
            
            // Retornar dados do relatório
            return {
                period: {
                    startDate,
                    endDate,
                    months
                },
                summary: {
                    totalIncome,
                    totalExpense,
                    totalBalance: totalIncome - totalExpense,
                    avgMonthlyIncome,
                    avgMonthlyExpense,
                    bestMonth,
                    worstMonth
                },
                trends: {
                    income: incomeTrend,
                    expense: expenseTrend
                },
                data: monthlyData
            };
        } catch (error) {
            console.error('Erro ao gerar relatório mensal:', error);
            throw error;
        }
    }
    
    /**
     * Calcula a tendência com base em dados históricos
     * @param {Array<number>} data - Array de valores numéricos
     * @returns {string} - Tendência ('up', 'down' ou 'stable')
     */
    calculateTrend(data) {
        if (data.length < 3) {
            return 'stable';
        }
        
        // Calcular média dos últimos 3 valores
        const recent = data.slice(-3);
        const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
        
        // Calcular média dos valores anteriores
        const previous = data.slice(-6, -3);
        if (previous.length === 0) {
            return 'stable';
        }
        
        const previousAvg = previous.reduce((sum, val) => sum + val, 0) / previous.length;
        
        // Determinar tendência com base na diferença percentual
        const percentChange = ((recentAvg - previousAvg) / previousAvg) * 100;
        
        if (percentChange > 5) {
            return 'up';
        } else if (percentChange < -5) {
            return 'down';
        } else {
            return 'stable';
        }
    }
    
    /**
     * Renderiza o gráfico de receitas vs despesas
     * @param {HTMLElement} chartContainer - Elemento do canvas para o gráfico
     * @param {Object} reportData - Dados do relatório mensal
     */
    renderIncomeExpenseChart(chartContainer, reportData) {
        // Verificar se Chart.js está disponível
        if (typeof Chart === 'undefined') {
            console.error('Chart.js não está disponível');
            return;
        }
        
        const monthlyData = reportData.data;
        
        // Preparar dados para o gráfico
        const labels = monthlyData.map(month => month.label);
        const incomeData = monthlyData.map(month => month.income);
        const expenseData = monthlyData.map(month => month.expense);
        const balanceData = monthlyData.map(month => month.balance);
        
        // Criar ou atualizar gráfico
        if (this.charts.incomeExpense) {
            this.charts.incomeExpense.data.labels = labels;
            this.charts.incomeExpense.data.datasets[0].data = incomeData;
            this.charts.incomeExpense.data.datasets[1].data = expenseData;
            this.charts.incomeExpense.data.datasets[2].data = balanceData;
            this.charts.incomeExpense.update();
        } else {
            this.charts.incomeExpense = new Chart(chartContainer, {
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
                            borderColor: 'rgba(52, 152, 219, 1)',
                            backgroundColor: 'rgba(52, 152, 219, 0.2)',
                            borderWidth: 2,
                            fill: false,
                            tension: 0.1,
                            pointRadius: 3
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            grid: {
                                display: false
                            }
                        },
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
                        },
                        legend: {
                            position: 'top'
                        }
                    }
                }
            });
        }
    }
    
    /**
     * Renderiza o gráfico de despesas por categoria
     * @param {HTMLElement} chartContainer - Elemento do canvas para o gráfico
     * @param {Object} reportData - Dados do relatório por categoria
     */
    renderCategoryExpensesChart(chartContainer, reportData) {
        // Verificar se Chart.js está disponível
        if (typeof Chart === 'undefined') {
            console.error('Chart.js não está disponível');
            return;
        }
        
        // Preparar dados para o gráfico
        const topCategories = reportData.topCategories;
        const labels = topCategories.map(category => category.name);
        const data = topCategories.map(category => category.total);
        
        // Adicionar "Outros" se necessário
        if (reportData.otherCategories.length > 0) {
            const otherTotal = reportData.otherCategories.reduce((sum, category) => sum + category.total, 0);
            if (otherTotal > 0) {
                labels.push('Outros');
                data.push(otherTotal);
            }
        }
        
        // Cores para as categorias
        const backgroundColor = [
            '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
            '#1abc9c', '#d35400', '#34495e', '#c0392b', '#7f8c8d'
        ];
        
        // Criar ou atualizar gráfico
        if (this.charts.categoryExpenses) {
            this.charts.categoryExpenses.data.labels = labels;
            this.charts.categoryExpenses.data.datasets[0].data = data;
            this.charts.categoryExpenses.update();
        } else {
            this.charts.categoryExpenses = new Chart(chartContainer, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: backgroundColor,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                padding: 15,
                                font: {
                                    size: 12
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = context.raw;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                    return `${context.label}: R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }
    }
    
    /**
     * Exporta os dados do relatório para CSV
     * @param {Object} reportData - Dados do relatório
     * @param {string} reportType - Tipo de relatório ('summary', 'category', 'monthly')
     * @returns {string} - Conteúdo CSV
     */
    exportReportToCSV(reportData, reportType) {
        let csvContent = '';
        
        switch (reportType) {
            case 'summary':
                // Cabeçalho
                csvContent += 'Relatório de Resumo Financeiro\n';
                csvContent += `Período: ${new Date(reportData.period.startDate).toLocaleDateString('pt-BR')} a ${new Date(reportData.period.endDate).toLocaleDateString('pt-BR')}\n\n`;
                
                // Resumo
                csvContent += 'Resumo\n';
                csvContent += `Receitas,R$ ${reportData.summary.income.toFixed(2)}\n`;
                csvContent += `Despesas,R$ ${reportData.summary.expense.toFixed(2)}\n`;
                csvContent += `Saldo,R$ ${reportData.summary.balance.toFixed(2)}\n`;
                csvContent += `Taxa de Poupança,${reportData.summary.savingsRate.toFixed(2)}%\n\n`;
                
                // Médias
                csvContent += 'Médias Diárias\n';
                csvContent += `Receita Diária,R$ ${reportData.averages.dailyIncome.toFixed(2)}\n`;
                csvContent += `Despesa Diária,R$ ${reportData.averages.dailyExpense.toFixed(2)}\n\n`;
                
                // Categorias de receita
                csvContent += 'Receitas por Categoria\n';
                csvContent += 'Categoria,Valor\n';
                Object.entries(reportData.categories.income).forEach(([categoryId, value]) => {
                    const categoryName = reportData.categoryMetadata.income.find(c => c.id === categoryId)?.name || 'Sem categoria';
                    csvContent += `${categoryName},R$ ${value.toFixed(2)}\n`;
                });
                csvContent += '\n';
                
                // Categorias de despesa
                csvContent += 'Despesas por Categoria\n';
                csvContent += 'Categoria,Valor\n';
                Object.entries(reportData.categories.expense).forEach(([categoryId, value]) => {
                    const categoryName = reportData.categoryMetadata.expense.find(c => c.id === categoryId)?.name || 'Sem categoria';
                    csvContent += `${categoryName},R$ ${value.toFixed(2)}\n`;
                });
                break;
                
            case 'category':
                // Cabeçalho
                csvContent += 'Relatório de Gastos por Categoria\n';
                csvContent += `Período: ${new Date(reportData.period.startDate).toLocaleDateString('pt-BR')} a ${new Date(reportData.period.endDate).toLocaleDateString('pt-BR')}\n`;
                csvContent += `Total de Despesas: R$ ${reportData.totalExpense.toFixed(2)}\n\n`;
                
                // Categorias
                csvContent += 'Categoria,Valor,Percentual\n';
                reportData.categories.forEach(category => {
                    csvContent += `${category.name},R$ ${category.total.toFixed(2)},${category.percentage.toFixed(2)}%\n`;
                });
                break;
                
            case 'monthly':
                // Cabeçalho
                csvContent += 'Relatório de Evolução Mensal\n';
                csvContent += `Período: ${new Date(reportData.period.startDate).toLocaleDateString('pt-BR')} a ${new Date(reportData.period.endDate).toLocaleDateString('pt-BR')}\n\n`;
                
                // Resumo
                csvContent += 'Resumo\n';
                csvContent += `Total de Receitas,R$ ${reportData.summary.totalIncome.toFixed(2)}\n`;
                csvContent += `Total de Despesas,R$ ${reportData.summary.totalExpense.toFixed(2)}\n`;
                csvContent += `Saldo Total,R$ ${reportData.summary.totalBalance.toFixed(2)}\n`;
                csvContent += `Média Mensal de Receitas,R$ ${reportData.summary.avgMonthlyIncome.toFixed(2)}\n`;
                csvContent += `Média Mensal de Despesas,R$ ${reportData.summary.avgMonthlyExpense.toFixed(2)}\n\n`;
                
                // Dados mensais
                csvContent += 'Mês,Receitas,Despesas,Saldo\n';
                reportData.data.forEach(month => {
                    csvContent += `${month.label},R$ ${month.income.toFixed(2)},R$ ${month.expense.toFixed(2)},R$ ${month.balance.toFixed(2)}\n`;
                });
                break;
                
            default:
                csvContent = 'Tipo de relatório não suportado para exportação.';
        }
        
        return csvContent;
    }
}
