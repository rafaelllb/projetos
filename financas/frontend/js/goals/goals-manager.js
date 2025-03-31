// /frontend/js/goals/goals-manager.js
// Gerenciador de metas financeiras da aplicação

/**
 * Classe responsável por gerenciar as metas financeiras
 */
export class GoalsManager {
    /**
     * @param {Object} storageManager - Instância do gerenciador de armazenamento
     * @param {Object} transactionManager - Instância do gerenciador de transações (opcional)
     */
    constructor(storageManager, transactionManager = null) {
        this.storageManager = storageManager;
        this.transactionManager = transactionManager;
        
        // Chave para armazenamento das metas
        this.STORAGE_KEY = 'fincontrol_goals';
    }
    
    /**
     * Carrega todas as metas
     * @returns {Promise<Array>} - Promise que resolve com a lista de metas
     */
    async getGoals() {
        // Tentar ler do IndexedDB primeiro
        if (this.storageManager.useIndexedDB && this.storageManager.db) {
            try {
                const goals = await this.storageManager.getFromIndexedDB('goals');
                return goals || [];
            } catch (error) {
                console.error('Erro ao recuperar metas do IndexedDB:', error);
                // Fallback para localStorage
                return this.storageManager.getLocalStorage(this.STORAGE_KEY) || [];
            }
        } else {
            // Usar localStorage como fallback
            return this.storageManager.getLocalStorage(this.STORAGE_KEY) || [];
        }
    }
    
    /**
     * Adiciona uma nova meta
     * @param {Object} goal - Dados da meta
     * @returns {Promise<Object>} - Promise que resolve com a meta adicionada
     */
    async addGoal(goal) {
        // Validar meta
        if (!this.validateGoal(goal)) {
            throw new Error('Dados da meta inválidos');
        }
        
        // Adicionar ID e timestamps
        const newGoal = {
            ...goal,
            id: Date.now().toString(),
            currentAmount: goal.currentAmount || 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Sanitizar dados
        const sanitizedGoal = this.sanitizeGoal(newGoal);
        
        try {
            // Obter metas existentes
            const goals = await this.getGoals();
            
            // Adicionar nova meta
            goals.push(sanitizedGoal);
            
            // Salvar metas atualizadas
            await this.saveGoals(goals);
            
            return sanitizedGoal;
        } catch (error) {
            console.error('Erro ao adicionar meta:', error);
            throw error;
        }
    }
    
    /**
     * Atualiza uma meta existente
     * @param {string} id - ID da meta
     * @param {Object} updatedData - Novos dados da meta
     * @returns {Promise<Object>} - Promise que resolve com a meta atualizada
     */
    async updateGoal(id, updatedData) {
        try {
            // Obter metas existentes
            const goals = await this.getGoals();
            
            // Encontrar índice da meta
            const index = goals.findIndex(goal => goal.id === id);
            
            if (index === -1) {
                throw new Error('Meta não encontrada');
            }
            
            // Mesclar dados atuais com atualizações
            const updatedGoal = {
                ...goals[index],
                ...updatedData,
                updatedAt: new Date().toISOString()
            };
            
            // Validar meta atualizada
            if (!this.validateGoal(updatedGoal)) {
                throw new Error('Dados da meta atualizados são inválidos');
            }
            
            // Sanitizar dados
            const sanitizedGoal = this.sanitizeGoal(updatedGoal);
            
            // Atualizar meta na lista
            goals[index] = sanitizedGoal;
            
            // Salvar metas atualizadas
            await this.saveGoals(goals);
            
            return sanitizedGoal;
        } catch (error) {
            console.error('Erro ao atualizar meta:', error);
            throw error;
        }
    }
    
    /**
     * Atualiza o progresso de uma meta
     * @param {string} id - ID da meta
     * @param {number} amount - Valor a ser adicionado (positivo) ou removido (negativo)
     * @returns {Promise<Object>} - Promise que resolve com a meta atualizada
     */
    async updateGoalProgress(id, amount) {
        try {
            // Obter metas existentes
            const goals = await this.getGoals();
            
            // Encontrar índice da meta
            const index = goals.findIndex(goal => goal.id === id);
            
            if (index === -1) {
                throw new Error('Meta não encontrada');
            }
            
            // Calcular novo valor atual
            const currentAmount = (goals[index].currentAmount || 0) + amount;
            
            // Garantir que o valor não seja negativo
            const newCurrentAmount = Math.max(0, currentAmount);
            
            // Atualizar meta
            return this.updateGoal(id, { currentAmount: newCurrentAmount });
        } catch (error) {
            console.error('Erro ao atualizar progresso da meta:', error);
            throw error;
        }
    }
    
    /**
     * Remove uma meta
     * @param {string} id - ID da meta
     * @returns {Promise<boolean>} - Promise que resolve com o resultado da operação
     */
    async removeGoal(id) {
        try {
            // Obter metas existentes
            const goals = await this.getGoals();
            
            // Filtrar meta a ser removida
            const updatedGoals = goals.filter(goal => goal.id !== id);
            
            // Verificar se a meta foi encontrada
            if (updatedGoals.length === goals.length) {
                return false;
            }
            
            // Salvar metas atualizadas
            await this.saveGoals(updatedGoals);
            
            return true;
        } catch (error) {
            console.error('Erro ao remover meta:', error);
            throw error;
        }
    }
    
    /**
     * Salva as metas no armazenamento
     * @param {Array} goals - Lista de metas
     * @returns {Promise<void>} - Promise que resolve quando a operação for concluída
     */
    async saveGoals(goals) {
        // Tentar salvar no IndexedDB primeiro
        if (this.storageManager.useIndexedDB && this.storageManager.db) {
            try {
                // Limpar todas as metas existentes
                const transaction = this.storageManager.db.transaction(['goals'], 'readwrite');
                const store = transaction.objectStore('goals');
                await store.clear();
                
                // Adicionar novas metas
                const promises = goals.map(goal => 
                    this.storageManager.storeInIndexedDB('goals', goal)
                );
                
                await Promise.all(promises);
            } catch (error) {
                console.error('Erro ao salvar metas no IndexedDB:', error);
                // Fallback para localStorage
                this.storageManager.setLocalStorage(this.STORAGE_KEY, goals);
            }
        } else {
            // Usar localStorage como fallback
            this.storageManager.setLocalStorage(this.STORAGE_KEY, goals);
        }
    }
    
    /**
     * Calcula o progresso das metas
     * @returns {Promise<Array>} - Promise que resolve com a lista de metas com informações de progresso
     */
    async calculateGoalsProgress() {
        try {
            // Obter metas
            const goals = await this.getGoals();
            
            // Se não houver metas, retornar array vazio
            if (!goals.length) {
                return [];
            }
            
            // Mapear metas com progresso
            return goals.map(goal => {
                // Calcular porcentagem de progresso
                const percentage = ((goal.currentAmount || 0) / goal.targetAmount) * 100;
                
                // Calcular valor restante
                const remainingAmount = Math.max(0, goal.targetAmount - (goal.currentAmount || 0));
                
                // Determinar status da meta
                let status = 'inProgress';
                if (percentage >= 100) {
                    status = 'completed';
                } else if (goal.deadline) {
                    // Verificar se o prazo está próximo
                    const now = new Date();
                    const deadline = new Date(goal.deadline);
                    const daysRemaining = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
                    
                    if (daysRemaining <= 0) {
                        status = 'overdue';
                    } else if (daysRemaining <= 30 && percentage < 80) {
                        status = 'atRisk';
                    }
                }
                
                // Retornar meta com informações de progresso
                return {
                    ...goal,
                    percentage: Math.min(100, percentage),
                    remainingAmount,
                    status
                };
            });
        } catch (error) {
            console.error('Erro ao calcular progresso das metas:', error);
            throw error;
        }
    }
    
    /**
     * Valida os dados de uma meta
     * @param {Object} goal - Dados da meta
     * @returns {boolean} - Resultado da validação
     */
    validateGoal(goal) {
        // Verificar campos obrigatórios
        if (!goal || !goal.name || !goal.targetAmount) {
            return false;
        }
        
        // Validar nome
        if (typeof goal.name !== 'string' || goal.name.trim() === '') {
            return false;
        }
        
        // Validar valor alvo
        if (typeof goal.targetAmount !== 'number' || isNaN(goal.targetAmount) || goal.targetAmount <= 0) {
            return false;
        }
        
        // Validar valor atual (se fornecido)
        if (goal.currentAmount !== undefined && 
            (typeof goal.currentAmount !== 'number' || isNaN(goal.currentAmount) || goal.currentAmount < 0)) {
            return false;
        }
        
        // Validar data limite (se fornecida)
        if (goal.deadline) {
            try {
                const deadline = new Date(goal.deadline);
                if (isNaN(deadline.getTime())) {
                    return false;
                }
            } catch (error) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Sanitiza os dados de uma meta
     * @param {Object} goal - Dados da meta
     * @returns {Object} - Dados sanitizados
     */
    sanitizeGoal(goal) {
        // Fazer cópia para evitar modificar o original
        const sanitized = { ...goal };
        
        // Sanitizar campos de texto
        if (sanitized.name) {
            sanitized.name = this.sanitizeText(sanitized.name);
        }
        
        if (sanitized.description) {
            sanitized.description = this.sanitizeText(sanitized.description);
        }
        
        // Sanitizar valores numéricos
        if (sanitized.targetAmount) {
            sanitized.targetAmount = Math.abs(parseFloat(sanitized.targetAmount));
        }
        
        if (sanitized.currentAmount !== undefined) {
            sanitized.currentAmount = Math.max(0, parseFloat(sanitized.currentAmount) || 0);
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
     * Renderiza a lista de metas em um elemento HTML
     * @param {HTMLElement} container - Elemento onde a lista será renderizada
     */
    async renderGoalsList(container) {
        try {
            // Calcular progresso das metas
            const goalsWithProgress = await this.calculateGoalsProgress();
            
            // Se não houver metas, mostrar estado vazio
            if (!goalsWithProgress.length) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-bullseye"></i>
                        <p>Você não tem metas definidas</p>
                        <button class="btn btn-primary" id="addGoalBtn">Adicionar Meta</button>
                    </div>
                `;
                return;
            }
            
            // Renderizar cada meta
            const goalsHTML = goalsWithProgress.map(goal => {
                // Determinar classe de status
                let statusClass = 'goal-status-inProgress';
                let statusText = 'Em progresso';
                
                if (goal.status === 'completed') {
                    statusClass = 'goal-status-completed';
                    statusText = 'Concluída';
                } else if (goal.status === 'overdue') {
                    statusClass = 'goal-status-overdue';
                    statusText = 'Prazo vencido';
                } else if (goal.status === 'atRisk') {
                    statusClass = 'goal-status-atRisk';
                    statusText = 'Em risco';
                }
                
                // Formatação de valores
                const formatter = new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                });
                
                // Formatação da data limite
                let deadlineHTML = '';
                if (goal.deadline) {
                    const deadline = new Date(goal.deadline);
                    deadlineHTML = `
                        <div class="goal-deadline">
                            <i class="fas fa-calendar-alt"></i>
                            ${deadline.toLocaleDateString('pt-BR')}
                        </div>
                    `;
                }
                
                return `
                    <div class="goal-item ${statusClass}">
                        <div class="goal-header">
                            <h4 class="goal-name">${goal.name}</h4>
                            <div class="goal-status">${statusText}</div>
                        </div>
                        
                        <div class="goal-progress">
                            <div class="progress-bar">
                                <div class="progress-bar-fill" style="width: ${goal.percentage}%"></div>
                            </div>
                            <div class="progress-info">
                                <span>${goal.percentage.toFixed(1)}% concluído</span>
                                <span>${formatter.format(goal.currentAmount || 0)} / ${formatter.format(goal.targetAmount)}</span>
                            </div>
                        </div>
                        
                        <div class="goal-details">
                            ${deadlineHTML}
                            <div class="goal-remaining">
                                Falta: ${formatter.format(goal.remainingAmount)}
                            </div>
                        </div>
                        
                        <div class="goal-footer">
                            <div class="goal-actions">
                                <button class="btn btn-sm btn-primary update-goal-progress" data-id="${goal.id}">
                                    <i class="fas fa-plus"></i> Atualizar
                                </button>
                                <button class="btn-action edit-goal" data-id="${goal.id}">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn-action delete-goal" data-id="${goal.id}">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            
            // Adicionar ao container
            container.innerHTML = goalsHTML;
            
            // Adicionar listeners para botões de ação
            container.querySelectorAll('.update-goal-progress').forEach(button => {
                button.addEventListener('click', (e) => {
                    const goalId = e.currentTarget.dataset.id;
                    // Disparar evento customizado para atualização de progresso
                    container.dispatchEvent(new CustomEvent('updateGoalProgress', { detail: { goalId } }));
                });
            });
            
            container.querySelectorAll('.edit-goal').forEach(button => {
                button.addEventListener('click', (e) => {
                    const goalId = e.currentTarget.dataset.id;
                    // Disparar evento customizado para edição de meta
                    container.dispatchEvent(new CustomEvent('editGoal', { detail: { goalId } }));
                });
            });
            
            container.querySelectorAll('.delete-goal').forEach(button => {
                button.addEventListener('click', (e) => {
                    const goalId = e.currentTarget.dataset.id;
                    // Disparar evento customizado para exclusão de meta
                    container.dispatchEvent(new CustomEvent('deleteGoal', { detail: { goalId } }));
                });
            });
        } catch (error) {
            console.error('Erro ao renderizar lista de metas:', error);
            container.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle"></i>
                    <span>Erro ao carregar metas. Por favor, tente novamente.</span>
                </div>
            `;
        }
    }
}
