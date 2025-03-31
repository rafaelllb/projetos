// /frontend/js/ui/ui-manager.js
// Gerenciador de interface do usuário

/**
 * Classe responsável por gerenciar a interface do usuário
 */
export class UIManager {
    constructor() {
        this.currentPage = 'dashboard';
        this.activeModals = [];
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
        // Ajustar navegação principal
        const navItems = document.querySelectorAll('.main-nav a');
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
        // Restaurar texto dos itens de navegação
        const navItems = document.querySelectorAll('.main-nav a');
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
     * Navega para uma página específica
     * @param {string} pageName - Nome da página
     */
    navigateTo(pageName) {
        // Validar página
        if (!pageName) {
            return;
        }
        
        // Atualizar links da navegação
        document.querySelectorAll('.main-nav a').forEach(link => {
            if (link.dataset.page === pageName) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
        
        // Armazenar página atual
        this.currentPage = pageName;
        
        // Carregar conteúdo da página
        this.loadPage(pageName);
    }
    
    /**
     * Carrega o conteúdo de uma página
     * @param {string} pageName - Nome da página
     */
    async loadPage(pageName) {
        const pageContainer = document.getElementById('pageContainer');
        
        if (!pageContainer) {
            return;
        }
        
        // Verificar se a página já está no DOM
        const existingPage = document.getElementById(`${pageName}Page`);
        
        if (existingPage) {
            // Ocultar todas as páginas
            document.querySelectorAll('.page').forEach(page => {
                page.classList.remove('active');
            });
            
            // Mostrar página selecionada
            existingPage.classList.add('active');
            return;
        }
        
        try {
            // Carregar página via AJAX (simulado para demo)
            const pageContent = await this.fetchPageContent(pageName);
            
            // Criar elemento da página
            const pageElement = document.createElement('section');
            pageElement.id = `${pageName}Page`;
            pageElement.className = 'page';
            pageElement.innerHTML = pageContent;
            
            // Ocultar todas as páginas
            document.querySelectorAll('.page').forEach(page => {
                page.classList.remove('active');
            });
            
            // Adicionar nova página
            pageContainer.appendChild(pageElement);
            pageElement.classList.add('active');
            
            // Inicializar componentes na nova página
            this.initializePageComponents(pageName);
        } catch (error) {
            console.error(`Erro ao carregar página ${pageName}:`, error);
            this.showError('Erro ao carregar página. Por favor, tente novamente.');
        }
    }
    
    /**
     * Busca o conteúdo de uma página (simulado)
     * @param {string} pageName - Nome da página
     * @returns {Promise<string>} - Promise com o HTML da página
     */
    async fetchPageContent(pageName) {
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
        
        return templates[pageName] || `<h2>${pageName.charAt(0).toUpperCase() + pageName.slice(1)}</h2><p>Conteúdo em desenvolvimento.</p>`;
    }
    
    /**
     * Inicializa componentes específicos de uma página
     * @param {string} pageName - Nome da página
     */
    initializePageComponents(pageName) {
        // Inicializar componentes específicos de cada página
        switch (pageName) {
            case 'transactions':
                this.initializeTransactionsPage();
                break;
            case 'budgets':
                this.initializeBudgetsPage();
                break;
            case 'goals':
                this.initializeGoalsPage();
                break;
            case 'reports':
                this.initializeReportsPage();
                break;
            case 'settings':
                this.initializeSettingsPage();
                break;
            default:
                // Nada a fazer para outras páginas
                break;
        }
    }
    
    /**
     * Inicializa componentes da página de transações
     */
    initializeTransactionsPage() {
        // Botão de nova transação
        document.getElementById('newTransactionBtn')?.addEventListener('click', () => {
            this.openModal('addTransactionModal');
        });
        
        // Eventos para filtros e paginação seriam adicionados aqui
        // Este é um exemplo simplificado
    }
    
    /**
     * Inicializa componentes da página de orçamentos
     */
    initializeBudgetsPage() {
        // Implementação dos componentes da página de orçamentos
    }
    
    /**
     * Inicializa componentes da página de metas
     */
    initializeGoalsPage() {
        // Implementação dos componentes da página de metas
    }
    
    /**
     * Inicializa componentes da página de relatórios
     */
    initializeReportsPage() {
        // Implementação dos componentes da página de relatórios
    }
    
    /**
     * Inicializa componentes da página de configurações
     */
    initializeSettingsPage() {
        // Implementação dos componentes da página de configurações
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
        // Implementação simples para exibir erro
        alert(message);
    }
    
    /**
     * Exibe uma mensagem de sucesso
     * @param {string} message - Mensagem de sucesso
     */
    showSuccess(message, duration = 3000) {
        // Criar elemento de toast
        const toast = document.createElement('div');
        toast.className = 'toast toast-success';
        toast.innerHTML = `
            <i class="fas fa-check-circle"></i>
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
}
