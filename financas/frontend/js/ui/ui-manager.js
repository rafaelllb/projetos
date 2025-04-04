// /frontend/js/ui/ui-manager.js
// Gerenciador de interface do usuário - Corrigido para usar data-route consistentemente

import { singletonManager } from '../utils/singleton-manager.js';

/**
 * Classe responsável por gerenciar a interface do usuário
 */
export class UIManager {
    constructor() {
        this.currentRoute = 'dashboard';
        this.activeModals = [];
        
        // Registrar no singletonManager
        singletonManager.register('uiManager', this);
    }
    
    /**
     * Inicializa o gerenciador de interface
     */
    init() {
        // Inicializar componentes da UI
        this.initializeTooltips();
        this.initializeModals();
        
        // Configurar handlers para responsividade
        this.setupResponsiveHandlers();
        
        console.log('UIManager: inicializado com sucesso');
    }
    
    /**
     * Inicializa tooltips
     */
    initializeTooltips() {
        // Implementação simples de tooltips
        document.querySelectorAll('[data-tooltip]').forEach(element => {
            element.addEventListener('mouseenter', () => {
                const tooltip = document.createElement('div');
                tooltip.className = 'tooltip';
                tooltip.textContent = element.dataset.tooltip;
                
                document.body.appendChild(tooltip);
                
                const rect = element.getBoundingClientRect();
                tooltip.style.left = `${rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2)}px`;
                tooltip.style.top = `${rect.top - tooltip.offsetHeight - 10}px`;
                
                element.dataset.tooltipElement = Date.now();
                tooltip.dataset.for = element.dataset.tooltipElement;
            });
            
            element.addEventListener('mouseleave', () => {
                const tooltipId = element.dataset.tooltipElement;
                if (tooltipId) {
                    const tooltip = document.querySelector(`.tooltip[data-for="${tooltipId}"]`);
                    if (tooltip) {
                        tooltip.remove();
                    }
                    delete element.dataset.tooltipElement;
                }
            });
        });
    }
    
    /**
     * Inicializa modais
     */
    initializeModals() {
        // Fechar modais ao clicar fora do conteúdo
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });
        
        // Fechar modais com Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModals.length > 0) {
                this.closeModal(this.activeModals[this.activeModals.length - 1]);
            }
        });
    }
    
    /**
     * Configura handlers para responsividade
     */
    setupResponsiveHandlers() {
        // Manipular mudanças de tamanho da tela
        window.addEventListener('resize', () => {
            this.handleResponsiveLayout();
        });
        
        // Aplicar layout responsivo inicialmente
        this.handleResponsiveLayout();
    }
    
    /**
     * Gerencia o layout responsivo
     */
    handleResponsiveLayout() {
        const windowWidth = window.innerWidth;
        
        if (windowWidth <= 768) {
            // Layout mobile
            document.body.classList.add('mobile-layout');
            document.body.classList.remove('desktop-layout');
            
            // Ajustes específicos para mobile
            this.adjustForMobileLayout();
        } else {
            // Layout desktop
            document.body.classList.add('desktop-layout');
            document.body.classList.remove('mobile-layout');
            
            // Ajustes específicos para desktop
            this.adjustForDesktopLayout();
        }
    }
    
    /**
     * Faz ajustes específicos para layout mobile
     */
    adjustForMobileLayout() {
        // Ajustar navegação principal - agora usando data-route consistentemente
        const navItems = document.querySelectorAll('.main-nav a[data-route]');
        navItems.forEach(item => {
            const icon = item.querySelector('i');
            const text = item.textContent.trim();
            
            // Guardar texto original se ainda não estiver salvo
            if (!item.dataset.originalText) {
                item.dataset.originalText = text;
            }
            
            // Mostrar apenas ícones em mobile
            if (icon) {
                item.innerHTML = '';
                item.appendChild(icon);
            }
        });
    }
    
    /**
     * Faz ajustes específicos para layout desktop
     */
    adjustForDesktopLayout() {
        // Restaurar texto dos itens de navegação - agora usando data-route consistentemente
        const navItems = document.querySelectorAll('.main-nav a[data-route]');
        navItems.forEach(item => {
            const icon = item.querySelector('i');
            
            // Restaurar texto original se existir
            if (item.dataset.originalText && icon) {
                const span = document.createElement('span');
                span.textContent = item.dataset.originalText;
                
                item.innerHTML = '';
                item.appendChild(icon);
                item.appendChild(document.createTextNode(' '));
                item.appendChild(span);
            }
        });
    }
    
    /**
     * Navega para uma página específica - MÉTODO REMOVIDO
     * Agora toda navegação é feita através do Router via data-route
     * @deprecated Use Router.navigateTo() em vez disso
     */
    navigateTo(routeName) {
        console.warn('UIManager.navigateTo() está depreciado. Use Router.navigateTo() em vez disso.');
        // Obter o router do singletonManager
        const router = singletonManager.get('router');
        if (router) {
            router.navigate(routeName);
        }
    }
    
    /**
     * Busca o conteúdo de uma página
     * @param {string} pageName - Nome da página
     * @returns {Promise<string>} - Promise com o HTML da página
     */
    async fetchPageContent(pageName) {
        console.log(`UIManager: Buscando conteúdo da página ${pageName}`);
        
        try {
            // Em uma aplicação real, isso faria uma requisição AJAX para buscar o conteúdo
            // Por simplicidade, estamos retornando templates fixos
            
            // Simular delay de rede
            await new Promise(resolve => setTimeout(resolve, 300));
        
            // Templates básicos para demonstração
            const templates = {
                transactions: `
                    <h2>Gerenciar Transações</h2>
                    <div class="page-actions">
                        <button class="btn btn-primary" id="newTransactionBtn">
                            <i class="fas fa-plus"></i> Nova Transação
                        </button>
                        <div class="filters">
                            <div class="filter-group">
                                <label for="filterPeriod">Período</label>
                                <select id="filterPeriod">
                                    <option value="month">Este Mês</option>
                                    <option value="quarter">Este Trimestre</option>
                                    <option value="year">Este Ano</option>
                                    <option value="custom">Personalizado</option>
                                </select>
                            </div>
                            <div class="filter-group">
                                <label for="filterType">Tipo</label>
                                <select id="filterType">
                                    <option value="all">Todos</option>
                                    <option value="income">Receitas</option>
                                    <option value="expense">Despesas</option>
                                </select>
                            </div>
                            <div class="filter-group">
                                <label for="filterCategory">Categoria</label>
                                <select id="filterCategory">
                                    <option value="all">Todas</option>
                                    <!-- Categorias serão carregadas dinamicamente -->
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div class="transactions-table-container">
                        <table class="data-table transactions-table">
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Descrição</th>
                                    <th>Categoria</th>
                                    <th>Valor</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody id="transactionsTableBody">
                                <!-- Transações serão carregadas dinamicamente -->
                                <tr class="empty-row">
                                    <td colspan="5">Carregando transações...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="pagination">
                        <button class="btn btn-secondary" id="prevPageBtn" disabled>
                            <i class="fas fa-chevron-left"></i> Anterior
                        </button>
                        <span class="pagination-info">Página <span id="currentPage">1</span> de <span id="totalPages">1</span></span>
                        <button class="btn btn-secondary" id="nextPageBtn" disabled>
                            Próxima <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                `,
                budgets: `
                    <h2>Orçamentos</h2>
                    <div class="page-actions">
                        <button class="btn btn-primary" id="newBudgetBtn">
                            <i class="fas fa-plus"></i> Novo Orçamento
                        </button>
                    </div>
                    
                    <div class="budget-overview">
                        <div class="progress-card">
                            <h3>Orçamento do Mês</h3>
                            <div class="progress-bar">
                                <div class="progress-bar-fill" style="width: 65%"></div>
                            </div>
                            <div class="progress-info">
                                <span>65% utilizado</span>
                                <span>R$ 3.250,00 / R$ 5.000,00</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="budget-categories">
                        <h3>Categorias</h3>
                        <div class="budget-cards">
                            <!-- Orçamentos por categoria serão carregados dinamicamente -->
                            <div class="empty-state">
                                <i class="fas fa-piggy-bank"></i>
                                <p>Você não definiu orçamentos por categoria</p>
                                <button class="btn btn-primary" id="addCategoryBudgetBtn">Adicionar Categoria</button>
                            </div>
                        </div>
                    </div>
                `,
                goals: `
                    <h2>Metas Financeiras</h2>
                    <div class="page-actions">
                        <button class="btn btn-primary" id="newGoalBtn">
                            <i class="fas fa-plus"></i> Nova Meta
                        </button>
                    </div>
                    
                    <div class="goals-grid">
                        <!-- Metas serão carregadas dinamicamente -->
                        <div class="empty-state">
                            <i class="fas fa-bullseye"></i>
                            <p>Você não tem metas definidas</p>
                            <button class="btn btn-primary" id="addFirstGoalBtn">Adicionar Meta</button>
                        </div>
                    </div>
                `,
                reports: `
                    <h2>Relatórios</h2>
                    
                    <div class="report-filters">
                        <div class="filter-group">
                            <label for="reportType">Tipo de Relatório</label>
                            <select id="reportType">
                                <option value="income-expense">Receitas vs Despesas</option>
                                <option value="categories">Gastos por Categoria</option>
                                <option value="monthly">Evolução Mensal</option>
                                <option value="yearly">Comparativo Anual</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label for="reportPeriod">Período</label>
                            <select id="reportPeriod">
                                <option value="month">Este Mês</option>
                                <option value="quarter">Este Trimestre</option>
                                <option value="year">Este Ano</option>
                                <option value="custom">Personalizado</option>
                            </select>
                        </div>
                        <button class="btn btn-primary" id="generateReportBtn">
                            <i class="fas fa-chart-bar"></i> Gerar Relatório
                        </button>
                    </div>
                    
                    <div class="report-container">
                        <div class="report-loading hidden">
                            <i class="fas fa-spinner fa-spin"></i>
                            <p>Gerando relatório...</p>
                        </div>
                        
                        <div class="report-content hidden">
                            <!-- O conteúdo do relatório será carregado aqui -->
                        </div>
                        
                        <div class="report-empty-state">
                            <i class="fas fa-chart-line"></i>
                            <p>Selecione um tipo de relatório e clique em "Gerar Relatório"</p>
                        </div>
                    </div>
                `,
                profile: `
                    <h2>Perfil do Usuário</h2>
                    
                    <div class="profile-container">
                        <div class="profile-section">
                            <h3>Informações Pessoais</h3>
                            <form id="profileForm">
                                <div class="form-group">
                                    <label for="userName">Nome</label>
                                    <input type="text" id="userName" value="Usuário">
                                </div>
                                <div class="form-group">
                                    <label for="userEmail">Email</label>
                                    <input type="email" id="userEmail" value="usuario@exemplo.com">
                                </div>
                                <div class="form-actions">
                                    <button type="submit" class="btn btn-primary">Salvar Alterações</button>
                                </div>
                            </form>
                        </div>
                        
                        <div class="profile-section">
                            <h3>Alterar Senha</h3>
                            <form id="passwordForm">
                                <div class="form-group">
                                    <label for="currentPassword">Senha Atual</label>
                                    <input type="password" id="currentPassword">
                                </div>
                                <div class="form-group">
                                    <label for="newPassword">Nova Senha</label>
                                    <input type="password" id="newPassword">
                                </div>
                                <div class="form-group">
                                    <label for="confirmPassword">Confirmar Nova Senha</label>
                                    <input type="password" id="confirmPassword">
                                </div>
                                <div class="form-actions">
                                    <button type="submit" class="btn btn-primary">Alterar Senha</button>
                                </div>
                            </form>
                        </div>
                    </div>
                `,
                settings: `
                    <h2>Configurações</h2>
                    
                    <div class="settings-container">
                        <div class="settings-section">
                            <h3>Preferências Gerais</h3>
                            <div class="form-group">
                                <label for="dateFormat">Formato de Data</label>
                                <select id="dateFormat">
                                    <option value="dd/mm/yyyy">DD/MM/AAAA</option>
                                    <option value="mm/dd/yyyy">MM/DD/AAAA</option>
                                    <option value="yyyy-mm-dd">AAAA-MM-DD</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="currency">Moeda</label>
                                <select id="currency">
                                    <option value="BRL">Real Brasileiro (R$)</option>
                                    <option value="USD">Dólar Americano ($)</option>
                                    <option value="EUR">Euro (€)</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="theme">Tema</label>
                                <select id="theme">
                                    <option value="light">Claro</option>
                                    <option value="dark">Escuro</option>
                                    <option value="system">Sistema</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="settings-section">
                            <h3>Gerenciar Categorias</h3>
                            <div class="category-tabs">
                                <button class="category-tab active" data-type="income">Receitas</button>
                                <button class="category-tab" data-type="expense">Despesas</button>
                            </div>
                            <div class="category-list" id="categoryList">
                                <!-- Categorias serão carregadas dinamicamente -->
                            </div>
                            <button class="btn btn-primary" id="addCategoryBtn">
                                <i class="fas fa-plus"></i> Nova Categoria
                            </button>
                        </div>
                        
                        <div class="settings-section">
                            <h3>Exportar / Importar Dados</h3>
                            <div class="export-import-buttons">
                                <button class="btn btn-secondary" id="exportDataBtn">
                                    <i class="fas fa-download"></i> Exportar Dados
                                </button>
                                <button class="btn btn-secondary" id="importDataBtn">
                                    <i class="fas fa-upload"></i> Importar Dados
                                </button>
                            </div>
                        </div>
                    </div>
                `
            };
            const template = templates[pageName] || `<h2>${pageName.charAt(0).toUpperCase() + pageName.slice(1)}</h2><p>Conteúdo em desenvolvimento.</p>`;
        
            console.log(`UIManager: Conteúdo da página ${pageName} carregado com sucesso`);
            return template;
        } catch (error) {
            console.error(`UIManager: Erro ao buscar conteúdo da página ${pageName}:`, error);
            return `<div class="error-container"><h2>Erro</h2><p>Não foi possível carregar a página ${pageName}.</p></div>`;
        }
    }
    
    /**
     * Inicializa componentes específicos de uma página
     * @param {string} pageName - Nome da página
     * @param {HTMLElement} pageElement - Elemento da página
     */
    initializePageComponents(pageName, pageElement) {
        if (!pageElement) return;
        
        // Inicializar componentes específicos de cada página
        switch (pageName) {
            case 'transactions':
                this.initializeTransactionsPage(pageElement);
                break;
            case 'budgets':
                this.initializeBudgetsPage(pageElement);
                break;
            case 'goals':
                this.initializeGoalsPage(pageElement);
                break;
            case 'reports':
                this.initializeReportsPage(pageElement);
                break;
            case 'settings':
                this.initializeSettingsPage(pageElement);
                break;
            default:
                // Nada a fazer para outras páginas
                break;
        }
    }
    
    /**
     * Inicializa componentes da página de transações
     * @param {HTMLElement} pageElement - Elemento da página
     */
    initializeTransactionsPage(pageElement) {
        // Botão de nova transação
        const newTransactionBtn = pageElement.querySelector('#newTransactionBtn');
        if (newTransactionBtn) {
            newTransactionBtn.addEventListener('click', () => {
                this.openModal('addTransactionModal');
            });
        }
        
        // Eventos para filtros e paginação seriam adicionados aqui
        // Este é um exemplo simplificado
    }
    
    /**
     * Inicializa componentes da página de orçamentos
     * @param {HTMLElement} pageElement - Elemento da página
     */
    initializeBudgetsPage(pageElement) {
        // Implementação dos componentes da página de orçamentos
        const newBudgetBtn = pageElement.querySelector('#newBudgetBtn');
        if (newBudgetBtn) {
            newBudgetBtn.addEventListener('click', () => {
                // Implementar abertura do modal de orçamento
                this.showInfo('Funcionalidade em desenvolvimento');
            });
        }
    }
    
    /**
     * Inicializa componentes da página de metas
     * @param {HTMLElement} pageElement - Elemento da página
     */
    initializeGoalsPage(pageElement) {
        // Implementação dos componentes da página de metas
        const newGoalBtn = pageElement.querySelector('#newGoalBtn');
        if (newGoalBtn) {
            newGoalBtn.addEventListener('click', () => {
                this.openModal('addGoalModal');
            });
        }
        
        const addFirstGoalBtn = pageElement.querySelector('#addFirstGoalBtn');
        if (addFirstGoalBtn) {
            addFirstGoalBtn.addEventListener('click', () => {
                this.openModal('addGoalModal');
            });
        }
    }
    
    /**
     * Inicializa componentes da página de relatórios
     * @param {HTMLElement} pageElement - Elemento da página
     */
    initializeReportsPage(pageElement) {
        // Implementação dos componentes da página de relatórios
        const generateReportBtn = pageElement.querySelector('#generateReportBtn');
        if (generateReportBtn) {
            generateReportBtn.addEventListener('click', () => {
                // Simulação de geração de relatório
                const reportLoading = pageElement.querySelector('.report-loading');
                const reportContent = pageElement.querySelector('.report-content');
                const emptyState = pageElement.querySelector('.report-empty-state');
                
                if (reportLoading && reportContent && emptyState) {
                    // Mostrar loading
                    emptyState.classList.add('hidden');
                    reportLoading.classList.remove('hidden');
                    
                    // Simular carregamento
                    setTimeout(() => {
                        reportLoading.classList.add('hidden');
                        reportContent.classList.remove('hidden');
                        reportContent.innerHTML = '<h3>Relatório Gerado</h3><p>Conteúdo do relatório será exibido aqui.</p>';
                    }, 1500);
                }
            });
        }
    }
    
    /**
     * Inicializa componentes da página de configurações
     * @param {HTMLElement} pageElement - Elemento da página
     */
    initializeSettingsPage(pageElement) {
        // Implementação dos componentes da página de configurações
        if (!pageElement) return;
        
        // Alternar entre abas de categorias
        const categoryTabs = pageElement.querySelectorAll('.category-tab');
        if (categoryTabs.length > 0) {
            categoryTabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    // Remover classe active de todas as abas
                    categoryTabs.forEach(t => t.classList.remove('active'));
                    
                    // Adicionar classe active na aba clicada
                    tab.classList.add('active');
                    
                    // Carregar categorias do tipo selecionado
                    const type = tab.dataset.type;
                    this.loadCategories(type);
                });
            });
        }
    }
    
    /**
     * Carrega categorias por tipo
     * @param {string} type - Tipo de categoria ('income' ou 'expense')
     */
    loadCategories(type) {
        // Obter categorias do storageManager
        const storageManager = singletonManager.get('storageManager');
        if (!storageManager) return;
        
        const categories = storageManager.getCategories();
        if (!categories || !categories[type]) return;
        
        // Obter elemento da lista de categorias
        const categoryList = document.getElementById('categoryList');
        if (!categoryList) return;
        
        // Limpar lista atual
        categoryList.innerHTML = '';
        
        // Adicionar categorias
        categories[type].forEach(category => {
            const categoryItem = document.createElement('div');
            categoryItem.className = 'category-item';
            categoryItem.innerHTML = `
                <div class="category-icon">
                    <i class="fas ${category.icon}"></i>
                </div>
                <div class="category-name">
                    ${category.name}
                </div>
                <div class="category-actions">
                    <button class="btn btn-icon" data-action="edit" data-id="${category.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-icon" data-action="delete" data-id="${category.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            categoryList.appendChild(categoryItem);
        });
    }
    
    /**
     * Abre um modal
     * @param {string} modalId - ID do modal
     */
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        
        if (!modal) {
            return;
        }
        
        // Adicionar classe active para mostrar o modal
        modal.classList.add('active');
        
        // Adicionar ao array de modais ativos
        if (!this.activeModals.includes(modalId)) {
            this.activeModals.push(modalId);
        }
        
        // Impedir rolagem do body
        document.body.style.overflow = 'hidden';
    }
    
    /**
     * Fecha um modal
     * @param {string} modalId - ID do modal
     */
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        
        if (!modal) {
            return;
        }
        
        // Remover classe active
        modal.classList.remove('active');
        
        // Remover do array de modais ativos
        this.activeModals = this.activeModals.filter(id => id !== modalId);
        
        // Restaurar rolagem se não houver mais modais ativos
        if (this.activeModals.length === 0) {
            document.body.style.overflow = '';
        }
    }
    
    /**
     * Fecha todos os modais ativos
     */
    closeAllModals() {
        // Clonar array para evitar problemas ao modificar durante a iteração
        const modalsToClose = [...this.activeModals];
        
        modalsToClose.forEach(modalId => {
            this.closeModal(modalId);
        });
    }
    
    /**
     * Exibe uma mensagem de erro
     * @param {string} message - Mensagem de erro
     */
    showError(message) {
        this.showToast(message, 'error');
    }
    
    /**
     * Exibe uma mensagem de sucesso
     * @param {string} message - Mensagem de sucesso
     * @param {number} duration - Duração em ms
     */
    showSuccess(message, duration = 3000) {
        this.showToast(message, 'success', duration);
    }
    
    /**
     * Exibe uma mensagem informativa
     * @param {string} message - Mensagem informativa
     * @param {number} duration - Duração em ms
     */
    showInfo(message, duration = 3000) {
        this.showToast(message, 'info', duration);
    }
    
    /**
     * Exibe um toast (notificação)
     * @param {string} message - Mensagem a exibir
     * @param {string} type - Tipo de toast ('success', 'error', 'info')
     * @param {number} duration - Duração em ms
     */
    showToast(message, type = 'info', duration = 3000) {
        // Criar elemento de toast
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        // Adicionar ícone conforme o tipo
        let icon;
        switch (type) {
            case 'success':
                icon = 'fa-check-circle';
                break;
            case 'error':
                icon = 'fa-exclamation-circle';
                break;
            default:
                icon = 'fa-info-circle';
        }
        
        toast.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        `;
        
        // Adicionar ao DOM
        document.body.appendChild(toast);
        
        // Mostrar com animação
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Remover após duração
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, duration);
    }

    /**
     * Mostra um indicador de carregamento em um container
     * @param {string} containerId - ID do container
     */
    showLoading(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        // Verificar se já existe um loading overlay
        let loadingOverlay = container.querySelector('.loading-overlay');
        
        if (!loadingOverlay) {
            // Criar overlay de loading
            loadingOverlay = document.createElement('div');
            loadingOverlay.className = 'loading-overlay';
            loadingOverlay.innerHTML = '<div class="spinner"></div>';
            
            // Adicionar ao container
            container.style.position = 'relative';
            container.appendChild(loadingOverlay);
        }
        
        // Garantir que o overlay é visível
        loadingOverlay.style.display = 'flex';
    }
    
    /**
     * Oculta o indicador de carregamento de um container
     * @param {string} containerId - ID do container
     */
    hideLoading(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        // Buscar overlay de loading
        const loadingOverlay = container.querySelector('.loading-overlay');
        
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }
}

// Exportar classe para ser usada em módulos
export default UIManager;