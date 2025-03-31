// /frontend/js/budgets/budget-manager.js
// Gerenciador de orçamentos da aplicação

/**
 * Classe responsável por gerenciar os orçamentos financeiros
 */
export class BudgetManager {
    /**
     * @param {Object} storageManager - Instância do gerenciador de armazenamento
     * @param {Object} transactionManager - Instância do gerenciador de transações
     */
    constructor(storageManager, transactionManager) {
        this.storageManager = storageManager;
        this.transactionManager = transactionManager;
        this.charts = {};
        
        // Chave para armazenamento dos orçamentos
        this.STORAGE_KEY = 'fincontrol_budgets';
    }
    
    /**
     * Carrega todos os orçamentos
     * @returns {Promise<Array>} - Promise que resolve com a lista de orçamentos
     */
    async getBudgets() {
        // Tentar ler do IndexedDB primeiro
        if (this.storageManager.useIndexedDB && this.storageManager.db) {
            try {
                const budgets = await this.storageManager.getFromIndexedDB('budgets');
                return budgets || [];
            } catch (error) {
                console.error('Erro ao recuperar orçamentos do IndexedDB:', error);
                // Fallback para localStorage
                return this.storageManager.getLocalStorage(this.STORAGE_KEY) || [];
            }
        } else {
            // Usar localStorage como fallback
            return this.storageManager.getLocalStorage(this.STORAGE_KEY) || [];
        }
    }
    
    /**
     * Adiciona um novo orçamento
     * @param {Object} budget - Dados do orçamento
     * @returns {Promise<Object>} - Promise que resolve com o orçamento adicionado
     */
    async addBudget(budget) {
        // Validar orçamento
        if (!this.validateBudget(budget)) {
            throw new Error('Dados do orçamento inválidos');
        }
        
        // Adicionar ID e timestamps
        const newBudget = {
            ...budget,
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Sanitizar dados
        const sanitizedBudget = this.sanitizeBudget(newBudget);
        
        try {
            // Obter orçamentos existentes
            const budgets = await this.getBudgets();
            
            // Adicionar novo orçamento
            budgets.push(sanitizedBudget);
            
            // Salvar orçamentos atualizados
            await this.saveBudgets(budgets);
            
            return sanitizedBudget;
        } catch (error) {
            console.error('Erro ao adicionar orçamento:', error);
            throw error;
        }
    }
    
    /**
     * Atualiza um orçamento existente
     * @param {string} id - ID do orçamento
     * @param {Object} updatedData - Novos dados do orçamento
     * @returns {Promise<Object>} - Promise que resolve com o orçamento atualizado
     */
    async updateBudget(id, updatedData) {
        try {
            // Obter orçamentos existentes
            const budgets = await this.getBudgets();
            
            // Encontrar índice do orçamento
            const index = budgets.findIndex(budget => budget.id === id);
            
            if (index === -1) {
                throw new Error('Orçamento não encontrado');
            }
            
            // Mesclar dados atuais com atualizações
            const updatedBudget = {
                ...budgets[index],
                ...updatedData,
                updatedAt: new Date().toISOString()
            };
            
            // Validar orçamento atualizado
            if (!this.validateBudget(updatedBudget)) {
                throw new Error('Dados do orçamento atualizados são inválidos');
            }
            
            // Sanitizar dados
            const sanitizedBudget = this.sanitizeBudget(updatedBudget);
            
            // Atualizar orçamento na lista
            budgets[index] = sanitizedBudget;
            
            // Salvar orçamentos atualizados
            await this.saveBudgets(budgets);
            
            return sanitizedBudget;
        } catch (error) {
            console.error('Erro ao atualizar orçamento:', error);
            throw error;
        }
    }
    
    /**
     * Remove um orçamento
     * @param {string} id - ID do orçamento
     * @returns {Promise<boolean>} - Promise que resolve com o resultado da operação
     */
    async removeBudget(id) {
        try {
            // Obter orçamentos existentes
            const budgets = await this.getBudgets();
            
            // Filtrar orçamento a ser removido
            const updatedBudgets = budgets.filter(budget => budget.id !== id);
            
            // Verificar se o orçamento foi encontrado
            if (updatedBudgets.length === budgets.length) {
                return false;
            }
            
            // Salvar orçamentos atualizados
            await this.saveBudgets(updatedBudgets);
            
            return true;
        } catch (error) {
            console.error('Erro ao remover orçamento:', error);
            throw error;
        }
    }
    
    /**
     * Salva os orçamentos no armazenamento
     * @param {Array} budgets - Lista de orçamentos
     * @returns {Promise<void>} - Promise que resolve quando a operação for concluída
     */
    async saveBudgets(budgets) {
        // Tentar salvar no IndexedDB primeiro
        if (this.storageManager.useIndexedDB && this.storageManager.db) {
            try {
                // Limpar todos os orçamentos existentes
                const transaction = this.storageManager.db.transaction(['budgets'], 'readwrite');
                const store = transaction.objectStore('budgets');
                await store.clear();
                
                // Adicionar novos orçamentos
                const promises = budgets.map(budget => 
                    this.storageManager.storeInIndexedDB('budgets', budget)
                );
                
                await Promise.all(promises);
            } catch (error) {
                console.error('Erro ao salvar orçamentos no IndexedDB:', error);
                // Fallback para localStorage
                this.storageManager.setLocalStorage(this.STORAGE_KEY, budgets);
            }
        } else {
            // Usar localStorage como fallback
            this.storageManager.setLocalStorage(this.STORAGE_KEY, budgets);
        }
    }
    
    /**
     * Calcula o progresso dos orçamentos
     * @returns {Promise<Array>} - Promise que resolve com a lista de orçamentos com progresso
     */
    async calculateBudgetProgress() {
        try {
            // Obter orçamentos e transações
            const budgets = await this.getBudgets();
            const transactions = await this.transactionManager.getTransactions();
            
            // Se não houver orçamentos, retornar array vazio
            if (!budgets.length) {
                return [];
            }
            
            // Mapear orçamentos com progresso
            return budgets.map(budget => {
                // Determinar período do orçamento
                const start = new Date(budget.startDate);
                const end = new Date(budget.endDate);
                
                // Filtrar transações do período e categoria (se aplicável)
                const relevantTransactions = transactions.filter(transaction => {
                    const transactionDate = new Date(transaction.date);
                    const isInPeriod = transactionDate >= start && transactionDate <= end;
                    const isExpense = transaction.type === 'expense';
                    
                    // Se o orçamento for para uma categoria específica, filtrar por categoria
                    if (budget.categoryId && budget.categoryId !== 'all') {
                        return isInPeriod && isExpense && transaction.category === budget.categoryId;
                    }
                    
                    // Se for orçamento geral, incluir todas as despesas do período
                    return isInPeriod && isExpense;
                });
                
                // Calcular total gasto
                const spent = relevantTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
                
                // Calcular porcentagem de progresso
                const percentage = (spent / budget.amount) * 100;
                
                // Determinar status do orçamento
                let status = 'ok';
                if (percentage >= 100) {
                    status = 'exceeded';
                } else if (percentage >= 80) {
                    status = 'warning';
                }
                
                // Retornar orçamento com informações de progresso
                return {
                    ...budget,
                    spent,
                    remaining: Math.max(0, budget.amount - spent),
                    percentage: Math.min(100, percentage),
                    status
                };
            });
        } catch (error) {
            console.error('Erro ao calcular progresso dos orçamentos:', error);
            throw error;
        }
    }
    
    /**
     * Valida os dados de um orçamento
     * @param {Object} budget - Dados do orçamento
     * @returns {boolean} - Resultado da validação
     */
    validateBudget(budget) {
        // Verificar campos obrigatórios
        if (!budget || 
            !budget.name || 
            !budget.amount || 
            !budget.startDate || 
            !budget.endDate) {
            return false;
        }
        
        // Validar nome
        if (typeof budget.name !== 'string' || budget.name.trim() === '') {
            return false;
        }
        
        // Validar valor
        if (typeof budget.amount !== 'number' || isNaN(budget.amount) || budget.amount <= 0) {
            return false;
        }
        
        // Validar datas
        try {
            const startDate = new Date(budget.startDate);
            const endDate = new Date(budget.endDate);
            
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                return false;
            }
            
            // Data de início deve ser anterior à data de fim
            if (startDate > endDate) {
                return false;
            }
        } catch (error) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Sanitiza os dados de um orçamento
     * @param {Object} budget - Dados do orçamento
     * @returns {Object} - Dados sanitizados
     */
    sanitizeBudget(budget) {
        // Fazer cópia para evitar modificar o original
        const sanitized = { ...budget };
        
        // Sanitizar campos de texto
        if (sanitized.name) {
            sanitized.name = this.sanitizeText(sanitized.name);
        }
        
        if (sanitized.description) {
            sanitized.description = this.sanitizeText(sanitized.description);
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
     * Renderiza o resumo dos orçamentos em um elemento HTML
     * @param {HTMLElement} container - Elemento onde o resumo será renderizado
     */
    async renderBudgetSummary(container) {
        try {
            // Calcular progresso dos orçamentos
            const budgetsWithProgress = await this.calculateBudgetProgress();
            
            // Se não houver orçamentos, mostrar estado vazio
            if (!budgetsWithProgress.length) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-piggy-bank"></i>
                        <p>Você não tem orçamentos definidos</p>
                        <button class="btn btn-primary" id="addBudgetBtn">Adicionar Orçamento</button>
                    </div>
                `;
                return;
            }
            
            // Renderizar cada orçamento
            const budgetHTML = budgetsWithProgress.map(budget => {
                // Determinar classe de status
                let statusClass = 'budget-status-ok';
                if (budget.status === 'warning') {
                    statusClass = 'budget-status-warning';
                } else if (budget.status === 'exceeded') {
                    statusClass = 'budget-status-danger';
                }
                
                // Formatação de valores
                const formatter = new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                });
                
                return `
                    <div class="budget-item ${statusClass}">
                        <div class="budget-header">
                            <h4 class="budget-name">${budget.name}</h4>
                            <div class="budget-period">
                                ${new Date(budget.startDate).toLocaleDateString('pt-BR')} - 
                                ${new Date(budget.endDate).toLocaleDateString('pt-BR')}
                            </div>
                        </div>
                        <div class="budget-progress">
                            <div class="progress-bar">
                                <div class="progress-bar-fill" style="width: ${budget.percentage}%"></div>
                            </div>
                            <div class="progress-info">
                                <span>${budget.percentage.toFixed(1)}% utilizado</span>
                                <span>${formatter.format(budget.spent)} / ${formatter.format(budget.amount)}</span>
                            </div>
                        </div>
                        <div class="budget-footer">
                            <span class="budget-remaining">
                                ${budget.status === 'exceeded' 
                                    ? 'Excedido em ' + formatter.format(budget.spent - budget.amount)
                                    : 'Restante: ' + formatter.format(budget.remaining)
                                }
                            </span>
                            <div class="budget-actions">
                                <button class="btn-action edit-budget" data-id="${budget.id}">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn-action delete-budget" data-id="${budget.id}">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            
            // Adicionar ao container
            container.innerHTML = budgetHTML;
            
            // Adicionar listeners para botões de edição e exclusão
            container.querySelectorAll('.edit-budget').forEach(button => {
                button.addEventListener('click', (e) => {
                    const budgetId = e.currentTarget.dataset.id;
                    // Disparar evento customizado para edição de orçamento
                    container.dispatchEvent(new CustomEvent('editBudget', { detail: { budgetId } }));
                });
            });
            
            container.querySelectorAll('.delete-budget').forEach(button => {
                button.addEventListener('click', (e) => {
                    const budgetId = e.currentTarget.dataset.id;
                    // Disparar evento customizado para exclusão de orçamento
                    container.dispatchEvent(new CustomEvent('deleteBudget', { detail: { budgetId } }));
                });
            });
        } catch (error) {
            console.error('Erro ao renderizar resumo dos orçamentos:', error);
            container.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle"></i>
                    <span>Erro ao carregar orçamentos. Por favor, tente novamente.</span>
                </div>
            `;
        }
    }
    
    /**
     * Renderiza o gráfico de distribuição de orçamentos
     * @param {HTMLElement} chartContainer - Elemento do canvas para o gráfico
     */
    async renderBudgetDistributionChart(chartContainer) {
        try {
            // Obter dados de orçamentos com progresso
            const budgetsWithProgress = await this.calculateBudgetProgress();
            
            // Se não houver orçamentos, não renderizar gráfico
            if (!budgetsWithProgress.length) {
                return;
            }
            
            // Preparar dados para o gráfico
            const labels = budgetsWithProgress.map(budget => budget.name);
            const spentData = budgetsWithProgress.map(budget => budget.spent);
            const remainingData = budgetsWithProgress.map(budget => budget.remaining);
            
            // Criar ou atualizar gráfico
            if (this.charts.budgetDistribution) {
                this.charts.budgetDistribution.data.labels = labels;
                this.charts.budgetDistribution.data.datasets[0].data = spentData;
                this.charts.budgetDistribution.data.datasets[1].data = remainingData;
                this.charts.budgetDistribution.update();
            } else {
                // Verificar se Chart.js está disponível
                if (typeof Chart === 'undefined') {
                    console.error('Chart.js não está disponível');
                    return;
                }
                
                this.charts.budgetDistribution = new Chart(chartContainer, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                label: 'Gasto',
                                data: spentData,
                                backgroundColor: 'rgba(231, 76, 60, 0.7)',
                                borderColor: 'rgba(231, 76, 60, 1)',
                                borderWidth: 1
                            },
                            {
                                label: 'Restante',
                                data: remainingData,
                                backgroundColor: 'rgba(46, 204, 113, 0.7)',
                                borderColor: 'rgba(46, 204, 113, 1)',
                                borderWidth: 1
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            x: {
                                stacked: true,
                                grid: {
                                    display: false
                                }
                            },
                            y: {
                                stacked: true,
                                beginAtZero: true,
                                ticks: {
                                    callback: function(value) {
                                        return 'R$ ' + value;
                                    }
                                }
                            }
                        },
                        plugins: {
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const value = context.raw;
                                        return `${context.dataset.label}: R$ ${value.toFixed(2)}`;
                                    }
                                }
                            }
                        }
                    }
                });
            }
        } catch (error) {
            console.error('Erro ao renderizar gráfico de distribuição de orçamentos:', error);
        }
    }
}
