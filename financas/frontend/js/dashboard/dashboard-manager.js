// /frontend/js/dashboard/dashboard-manager.js
// Gerenciador do dashboard da aplicação

/**
 * Classe responsável por gerenciar o dashboard da aplicação
 */
export class DashboardManager {
    /**
     * @param {Object} transactionManager - Instância do gerenciador de transações
     */
    constructor(transactionManager) {
        this.transactionManager = transactionManager;
        this.charts = {};
    }
    
    /**
     * Atualiza o resumo financeiro
     */
    async updateSummary() {
        // Obter elementos do DOM
        const monthlyIncomeElement = document.getElementById('monthlyIncome');
        const monthlyExpenseElement = document.getElementById('monthlyExpense');
        const monthlyBalanceElement = document.getElementById('monthlyBalance');
        
        if (!monthlyIncomeElement || !monthlyExpenseElement || !monthlyBalanceElement) {
            return;
        }
        
        // Calcular totais do mês atual
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        const transactions = await this.transactionManager.getTransactions();
        
        // Filtrar transações do mês atual
        const currentMonthTransactions = transactions.filter(transaction => {
            const transactionDate = new Date(transaction.date);
            return transactionDate >= firstDayOfMonth && transactionDate <= lastDayOfMonth;
        });
        
        // Calcular receitas e despesas
        const income = currentMonthTransactions
            .filter(transaction => transaction.type === 'income')
            .reduce((total, transaction) => total + transaction.amount, 0);
        
        const expense = currentMonthTransactions
            .filter(transaction => transaction.type === 'expense')
            .reduce((total, transaction) => total + transaction.amount, 0);
        
        const balance = income - expense;
        
        // Atualizar elementos
        monthlyIncomeElement.textContent = `R$ ${income.toFixed(2)}`;
        monthlyExpenseElement.textContent = `R$ ${expense.toFixed(2)}`;
        monthlyBalanceElement.textContent = `R$ ${balance.toFixed(2)}`;
        
        // Adicionar classe baseada no valor (positivo/negativo)
        monthlyBalanceElement.className = balance >= 0 ? 'value income' : 'value expense';
    }
    
    /**
     * Atualiza o gráfico de despesas por categoria
     */
    async updateExpensesByCategoryChart() {
        const chartContainer = document.getElementById('expensesByCategoryChart');
        
        if (!chartContainer) {
            return;
        }
        
        // Obter transações
        const transactions = await this.transactionManager.getTransactions();
        
        // Calcular despesas por categoria do mês atual
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        // Filtrar despesas do mês atual
        const currentMonthExpenses = transactions.filter(transaction => {
            const transactionDate = new Date(transaction.date);
            return (
                transaction.type === 'expense' && 
                transactionDate >= firstDayOfMonth && 
                transactionDate <= lastDayOfMonth
            );
        });
        
        // Agrupar despesas por categoria
        const expensesByCategory = currentMonthExpenses.reduce((acc, transaction) => {
            if (!acc[transaction.category]) {
                acc[transaction.category] = 0;
            }
            acc[transaction.category] += transaction.amount;
            return acc;
        }, {});
        
        // Preparar dados para o gráfico
        const categoryNames = {};
        const categories = this.transactionManager.storageManager.getCategories().expense;
        categories.forEach(category => {
            categoryNames[category.id] = category.name;
        });
        
        const chartData = {
            labels: Object.keys(expensesByCategory).map(categoryId => categoryNames[categoryId] || 'Sem categoria'),
            datasets: [{
                label: 'Despesas',
                data: Object.values(expensesByCategory),
                backgroundColor: [
                    '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
                    '#1abc9c', '#d35400', '#34495e', '#c0392b', '#7f8c8d'
                ],
                borderWidth: 1
            }]
        };
        
        // Criar ou atualizar gráfico
        if (this.charts.expensesByCategory) {
            this.charts.expensesByCategory.data = chartData;
            this.charts.expensesByCategory.update();
        } else {
            this.charts.expensesByCategory = new Chart(chartContainer, {
                type: 'doughnut',
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                boxWidth: 12,
                                font: {
                                    size: 10
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = context.raw;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((value / total) * 100).toFixed(1);
                                    return `${context.label}: R$ ${value.toFixed(2)} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }
    }
    
    /**
     * Atualiza o gráfico de fluxo de caixa
     */
    async updateCashFlowChart() {
        const chartContainer = document.getElementById('cashFlowChart');
        
        if (!chartContainer) {
            return;
        }
        
        // Obter transações
        const transactions = await this.transactionManager.getTransactions();
        
        // Preparar dados para os últimos 6 meses
        const now = new Date();
        const months = [];
        
        for (let i = 5; i >= 0; i--) {
            const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({
                date: month,
                key: month.toISOString().substring(0, 7), // YYYY-MM
                label: month.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
            });
        }
        
        // Calcular receitas e despesas por mês
        const monthlyData = months.map(month => {
            const startDate = new Date(month.date);
            const endDate = new Date(month.date.getFullYear(), month.date.getMonth() + 1, 0);
            
            // Filtrar transações do mês
            const monthTransactions = transactions.filter(transaction => {
                const transactionDate = new Date(transaction.date);
                return transactionDate >= startDate && transactionDate <= endDate;
            });
            
            // Calcular receitas e despesas
            const income = monthTransactions
                .filter(transaction => transaction.type === 'income')
                .reduce((total, transaction) => total + transaction.amount, 0);
            
            const expense = monthTransactions
                .filter(transaction => transaction.type === 'expense')
                .reduce((total, transaction) => total + transaction.amount, 0);
            
            return {
                month: month.label,
                income,
                expense,
                balance: income - expense
            };
        });
        
        // Preparar dados para o gráfico
        const chartData = {
            labels: monthlyData.map(data => data.month),
            datasets: [
                {
                    label: 'Receitas',
                    data: monthlyData.map(data => data.income),
                    backgroundColor: 'rgba(46, 204, 113, 0.2)',
                    borderColor: 'rgba(46, 204, 113, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(46, 204, 113, 1)',
                    pointRadius: 3
                },
                {
                    label: 'Despesas',
                    data: monthlyData.map(data => data.expense),
                    backgroundColor: 'rgba(231, 76, 60, 0.2)',
                    borderColor: 'rgba(231, 76, 60, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(231, 76, 60, 1)',
                    pointRadius: 3
                },
                {
                    label: 'Saldo',
                    data: monthlyData.map(data => data.balance),
                    backgroundColor: 'rgba(52, 152, 219, 0.2)',
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(52, 152, 219, 1)',
                    pointRadius: 3
                }
            ]
        };
        
        // Criar ou atualizar gráfico
        if (this.charts.cashFlow) {
            this.charts.cashFlow.data = chartData;
            this.charts.cashFlow.update();
        } else {
            this.charts.cashFlow = new Chart(chartContainer, {
                type: 'line',
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return 'R$ ' + value;
                                }
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                boxWidth: 12,
                                font: {
                                    size: 10
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `${context.dataset.label}: R$ ${context.raw.toFixed(2)}`;
                                }
                            }
                        }
                    }
                }
            });
        }
    }
}
