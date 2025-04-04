// /frontend/js/ui/loading-manager.js
// Gerenciador de estados de carregamento e componentes de loading

/**
 * Classe responsável por gerenciar estados de carregamento e renderizar
 * indicadores visuais durante o carregamento de dados
 */
export class LoadingManager {
    /**
     * @param {Object} options - Opções de configuração
     * @param {boolean} options.useSkeletons - Usar esqueletos de carregamento (padrão: true)
     * @param {boolean} options.useOverlay - Usar overlay de carregamento (padrão: true)
     * @param {number} options.minDisplayTime - Tempo mínimo de exibição em ms (padrão: 500)
     */
    constructor(options = {}) {
        this.useSkeletons = options.useSkeletons !== undefined ? options.useSkeletons : true;
        this.useOverlay = options.useOverlay !== undefined ? options.useOverlay : true;
        this.minDisplayTime = options.minDisplayTime || 500;
        
        // Armazenar referências aos elementos de loading
        this.elements = {
            overlay: null,
            progressBar: null,
            statusText: null
        };
        
        // Estado atual de loading
        this.loadingState = {
            active: false,
            startTime: null,
            progress: 0,
            message: '',
            dataTypes: {}
        };
        
        // Mapeamento de elementos do dashboard para esqueletos
        this.skeletonMapping = {
            'monthlyIncome': 'skeleton-text',
            'monthlyExpense': 'skeleton-text',
            'monthlyBalance': 'skeleton-text',
            'overviewChart': 'skeleton-chart',
            'expensesByCategoryChart': 'skeleton-chart',
            'cashFlowChart': 'skeleton-chart',
            'savingGoalsList': 'skeleton-list',
            'recentTransactionsList': 'skeleton-list'
        };
    }
    
    /**
     * Inicializa o sistema de loading
     */
    init() {
        // Criar elementos de UI para loading
        this.createLoadingElements();
    }
    
    /**
     * Cria elementos necessários para loading
     */
    createLoadingElements() {
        // Criar overlay de carregamento
        if (this.useOverlay && !this.elements.overlay) {
            this.elements.overlay = document.createElement('div');
            this.elements.overlay.className = 'loading-overlay hidden';
            
            // Conteúdo do overlay
            this.elements.overlay.innerHTML = `
                <div class="loading-container">
                    <div class="loading-spinner">
                        <i class="fas fa-spinner fa-spin"></i>
                    </div>
                    <div class="loading-progress-container">
                        <div class="loading-progress-bar">
                            <div class="loading-progress-fill" style="width: 0%"></div>
                        </div>
                    </div>
                    <div class="loading-status">Carregando...</div>
                </div>
            `;
            
            // Adicionar ao body
            document.body.appendChild(this.elements.overlay);
            
            // Armazenar referências para elementos internos
            this.elements.progressBar = this.elements.overlay.querySelector('.loading-progress-fill');
            this.elements.statusText = this.elements.overlay.querySelector('.loading-status');
        }
        
        // Adicionar estilos CSS para loading e esqueletos
        this.addLoadingStyles();
    }
    
    /**
     * Adiciona estilos CSS para componentes de loading
     */
    addLoadingStyles() {
        // Verificar se os estilos já existem
        if (document.getElementById('loading-styles')) {
            return;
        }
        
        // Criar elemento de estilo
        const styleEl = document.createElement('style');
        styleEl.id = 'loading-styles';
        
        // Definir estilos CSS
        styleEl.textContent = `
            /* Overlay de carregamento */
            .loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(255, 255, 255, 0.8);
                z-index: 9999;
                display: flex;
                justify-content: center;
                align-items: center;
                transition: opacity 0.3s ease-in-out;
            }
            
            .loading-overlay.hidden {
                opacity: 0;
                pointer-events: none;
            }
            
            .loading-container {
                background-color: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                text-align: center;
                max-width: 90%;
                width: 400px;
            }
            
            .loading-spinner {
                font-size: 3rem;
                color: #3498db;
                margin-bottom: 20px;
            }
            
            .loading-progress-container {
                margin-bottom: 15px;
            }
            
            .loading-progress-bar {
                height: 6px;
                background-color: #e0e0e0;
                border-radius: 3px;
                overflow: hidden;
            }
            
            .loading-progress-fill {
                height: 100%;
                background-color: #3498db;
                width: 0%;
                transition: width 0.3s ease-in-out;
            }
            
            .loading-status {
                color: #555;
                font-size: 1rem;
            }
            
            /* Esqueletos de carregamento */
            .skeleton-pulse {
                animation: skeleton-pulse 1.5s infinite;
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 200% 100%;
            }
            
            .skeleton-text {
                height: 1em;
                margin-bottom: 0.5em;
                border-radius: 3px;
            }
            
            .skeleton-chart {
                height: 200px;
                border-radius: 5px;
            }
            
            .skeleton-list-item {
                height: 60px;
                margin-bottom: 10px;
                border-radius: 5px;
            }
            
            .skeleton-list {
                display: flex;
                flex-direction: column;
            }
            
            /* Animações */
            @keyframes skeleton-pulse {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }
            
            /* Componentes específicos no modo esqueleto */
            .financial-summary.skeleton .summary-item {
                position: relative;
            }
            
            .financial-summary.skeleton .value,
            .financial-summary.skeleton .trend {
                color: transparent !important;
                position: relative;
            }
            
            .financial-summary.skeleton .value::before,
            .financial-summary.skeleton .trend::before {
                content: "";
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                border-radius: 3px;
            }
            
            .chart-container.skeleton {
                position: relative;
                min-height: 200px;
            }
            
            .chart-container.skeleton canvas {
                display: none;
            }
            
            .chart-container.skeleton::before {
                content: "";
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                border-radius: 5px;
            }
            
            .transactions-list.skeleton .transaction-item,
            .goals-list.skeleton .goal-item {
                background: transparent !important;
                position: relative;
            }
            
            .transactions-list.skeleton .transaction-item::before,
            .goals-list.skeleton .goal-item::before {
                content: "";
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                border-radius: 5px;
            }
        `;
        
        // Adicionar ao head
        document.head.appendChild(styleEl);
    }
    
    /**
     * Mostra o overlay de carregamento
     * @param {string} message - Mensagem inicial de carregamento
     */
    showOverlay(message = 'Carregando dados...') {
        if (!this.elements.overlay) {
            this.createLoadingElements();
        }
        
        // Definir mensagem e reset do progresso
        this.setProgress(0, message);
        
        // Registrar início do carregamento
        this.loadingState.active = true;
        this.loadingState.startTime = Date.now();
        
        // Mostrar overlay
        this.elements.overlay.classList.remove('hidden');
    }
    
    /**
     * Oculta o overlay de carregamento respeitando o tempo mínimo de exibição
     */
    hideOverlay() {
        if (!this.elements.overlay || !this.loadingState.active) {
            return;
        }
        
        const elapsedTime = Date.now() - this.loadingState.startTime;
        
        // Verificar se o tempo mínimo já passou
        if (elapsedTime >= this.minDisplayTime) {
            this._hideImmediately();
        } else {
            // Aguardar tempo restante
            setTimeout(() => {
                this._hideImmediately();
            }, this.minDisplayTime - elapsedTime);
        }
    }
    
    /**
     * Oculta o overlay imediatamente
     * @private
     */
    _hideImmediately() {
        if (this.elements.overlay) {
            this.elements.overlay.classList.add('hidden');
        }
        
        // Atualizar estado
        this.loadingState.active = false;
    }
    
    /**
     * Define o progresso e mensagem do carregamento
     * @param {number} percent - Percentual de progresso (0-100)
     * @param {string} message - Mensagem de status
     */
    setProgress(percent, message = null) {
        // Garantir que o percentual esteja entre 0 e 100
        const safePercent = Math.max(0, Math.min(100, percent));
        
        // Atualizar estado interno
        this.loadingState.progress = safePercent;
        if (message) {
            this.loadingState.message = message;
        }
        
        // Atualizar elementos visuais
        if (this.elements.progressBar) {
            this.elements.progressBar.style.width = `${safePercent}%`;
        }
        
        if (this.elements.statusText && message) {
            this.elements.statusText.textContent = message;
        }
    }
    
    /**
     * Atualiza o progresso com base nos estados de carregamento dos diferentes tipos de dados
     * @param {Object} loadingStates - Estados de carregamento por tipo de dados
     */
    updateProgressFromStates(loadingStates) {
        // Armazenar estados de carregamento
        this.loadingState.dataTypes = { ...loadingStates };
        
        // Calcular progresso geral
        const dataTypes = Object.keys(loadingStates);
        if (dataTypes.length === 0) return;
        
        let totalProgress = 0;
        let activeCount = 0;
        let errors = [];
        let completedCount = 0;
        
        dataTypes.forEach(type => {
            const state = loadingStates[type];
            
            // Contabilizar apenas estados ativos
            if (state.status !== 'idle') {
                activeCount++;
                totalProgress += state.progress || 0;
                
                if (state.status === 'success') {
                    completedCount++;
                } else if (state.status === 'error' && state.error) {
                    errors.push(`${type}: ${state.error}`);
                }
            }
        });
        
        // Calcular percentual geral
        const overallProgress = activeCount > 0 ? Math.round(totalProgress / activeCount) : 0;
        
        // Gerar mensagem contextual
        let message;
        if (errors.length > 0) {
            message = `Erro ao carregar: ${errors[0]}`;
        } else if (completedCount === activeCount && activeCount > 0) {
            message = 'Carregamento concluído!';
        } else {
            message = `Carregando dados... ${overallProgress}%`;
        }
        
        // Atualizar progresso visual
        this.setProgress(overallProgress, message);
        
        // Se tudo estiver carregado, começar a contar para fechar
        if (completedCount === activeCount && activeCount > 0) {
            setTimeout(() => {
                // Verificar novamente antes de fechar (para casos onde novos carregamentos tenham iniciado)
                const allCurrentlyComplete = Object.values(this.loadingState.dataTypes).every(
                    state => state.status === 'success' || state.status === 'idle'
                );
                
                if (allCurrentlyComplete) {
                    this.hideOverlay();
                    this.removeSkeletons();
                }
            }, 500);
        }
    }
    
    /**
     * Adiciona esqueletos de carregamento aos elementos do dashboard
     */
    addSkeletons() {
        if (!this.useSkeletons) return;
        
        // Adicionar classe de esqueleto a elementos mapeados
        Object.entries(this.skeletonMapping).forEach(([elementId, skeletonClass]) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.classList.add('skeleton');
                
                // Adicionar esqueletos com base no tipo
                if (skeletonClass === 'skeleton-list') {
                    // Para listas, criar itens de esqueleto
                    if (element.children.length === 0) {
                        for (let i = 0; i < 3; i++) {
                            const skeletonItem = document.createElement('div');
                            skeletonItem.className = 'skeleton-list-item skeleton-pulse';
                            element.appendChild(skeletonItem);
                        }
                    } else {
                        // Se já houver itens, apenas adicionar a classe
                        Array.from(element.children).forEach(child => {
                            child.classList.add('skeleton-pulse');
                        });
                    }
                } else if (skeletonClass === 'skeleton-chart') {
                    // Para gráficos, adicionar elemento de esqueleto
                    const container = element.closest('.chart-container');
                    if (container) {
                        container.classList.add('skeleton');
                        
                        // Adicionar um placeholder de esqueleto
                        const skeleton = document.createElement('div');
                        skeleton.className = 'skeleton-chart skeleton-pulse';
                        container.appendChild(skeleton);
                    }
                } else if (skeletonClass === 'skeleton-text') {
                    // Para textos, adicionar classe de pulso
                    element.classList.add('skeleton-pulse');
                    element.setAttribute('data-original-text', element.textContent);
                    element.textContent = '';
                }
            }
        });
        
        // Adicionar classe de esqueleto ao resumo financeiro
        const financialSummary = document.querySelector('.financial-summary');
        if (financialSummary) {
            financialSummary.classList.add('skeleton');
            
            // Adicionar classe de pulso aos valores e tendências
            financialSummary.querySelectorAll('.value, .trend').forEach(element => {
                element.classList.add('skeleton-pulse');
                element.setAttribute('data-original-text', element.textContent);
            });
        }
    }
    
    /**
     * Remove esqueletos de carregamento
     */
    removeSkeletons() {
        if (!this.useSkeletons) return;
        
        // Remover classes de esqueleto dos elementos mapeados
        Object.entries(this.skeletonMapping).forEach(([elementId, skeletonClass]) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.classList.remove('skeleton');
                
                // Remover itens de esqueleto com base no tipo
                if (skeletonClass === 'skeleton-list') {
                    // Remover itens de esqueleto
                    element.querySelectorAll('.skeleton-list-item').forEach(item => {
                        item.remove();
                    });
                    
                    // Remover classe de pulso dos itens existentes
                    Array.from(element.children).forEach(child => {
                        child.classList.remove('skeleton-pulse');
                    });
                } else if (skeletonClass === 'skeleton-chart') {
                    // Remover esqueleto de gráfico
                    const container = element.closest('.chart-container');
                    if (container) {
                        container.classList.remove('skeleton');
                        
                        // Remover placeholder de esqueleto
                        container.querySelectorAll('.skeleton-chart').forEach(skeleton => {
                            skeleton.remove();
                        });
                    }
                } else if (skeletonClass === 'skeleton-text') {
                    // Remover classe de pulso e restaurar texto original
                    element.classList.remove('skeleton-pulse');
                    if (element.hasAttribute('data-original-text')) {
                        element.textContent = element.getAttribute('data-original-text');
                        element.removeAttribute('data-original-text');
                    }
                }
            }
        });
        
        // Remover classe de esqueleto do resumo financeiro
        const financialSummary = document.querySelector('.financial-summary');
        if (financialSummary) {
            financialSummary.classList.remove('skeleton');
            
            // Remover classe de pulso e restaurar texto original
            financialSummary.querySelectorAll('.value, .trend').forEach(element => {
                element.classList.remove('skeleton-pulse');
                if (element.hasAttribute('data-original-text')) {
                    element.textContent = element.getAttribute('data-original-text');
                    element.removeAttribute('data-original-text');
                }
            });
        }
    }
    
    /**
     * Inicia o processo de carregamento com overlay e esqueletos
     * @param {string} message - Mensagem inicial
     */
    startLoading(message = 'Carregando dados da aplicação...') {
        // Adicionar esqueletos
        this.addSkeletons();
        
        // Mostrar overlay
        this.showOverlay(message);
    }
    
    /**
     * Finaliza o processo de carregamento
     */
    finishLoading() {
        // Ocultar overlay
        this.hideOverlay();
        
        // Remover esqueletos
        this.removeSkeletons();
    }
    
    /**
     * Exibe uma mensagem de erro durante o carregamento
     * @param {string} message - Mensagem de erro
     * @param {boolean} canRetry - Se o erro permite nova tentativa
     * @param {Function} retryCallback - Função para tentar novamente
     */
    showLoadingError(message, canRetry = false, retryCallback = null) {
        // Mudar a mensagem no overlay
        if (this.elements.statusText) {
            this.elements.statusText.innerHTML = `
                <div class="loading-error">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>${message}</p>
                    ${canRetry ? '<button class="btn btn-primary btn-sm retry-btn">Tentar Novamente</button>' : ''}
                </div>
            `;
            
            // Adicionar event listener ao botão de retry
            if (canRetry && retryCallback) {
                const retryBtn = this.elements.statusText.querySelector('.retry-btn');
                if (retryBtn) {
                    retryBtn.addEventListener('click', retryCallback);
                }
            }
        }
    }
}
