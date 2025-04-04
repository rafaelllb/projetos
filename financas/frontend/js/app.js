// /frontend/js/app.js
// Correção do sistema de rotas e inicialização da aplicação

import { StorageManager } from './storage/storage-manager.js';
import { AuthManager } from './auth/auth-manager.js';
import { UIManager } from './ui/ui-manager.js';
import { TransactionManager } from './transactions/transaction-manager.js';
import { DashboardManager } from './dashboard/dashboard-manager.js';
import { Router } from './router.js';
import { DataLoader } from './utils/data-loader.js';
import { LoadingManager } from './ui/loading-manager.js';
import { chartManager } from './utils/chart-manager.js';
import { singletonManager } from './utils/singleton-manager.js';

/**
 * Classe principal da aplicação
 * Corrigida para resolver problemas de navegação
 */
class FinControlApp {
    constructor() {
        // Inicializar gerenciadores de componentes
        this.storageManager = new StorageManager();
        this.authManager = new AuthManager();
        this.uiManager = new UIManager();
        this.transactionManager = new TransactionManager();
        this.dashboardManager = new DashboardManager();
        
        // Registrar todas as instâncias no singletonManager
        singletonManager.register('storageManager', this.storageManager);
        singletonManager.register('authManager', this.authManager);
        singletonManager.register('uiManager', this.uiManager);
        singletonManager.register('transactionManager', this.transactionManager);
        
        // Aguardar o DOM estar completamente carregado antes de inicializar o router
        setTimeout(() => {
            // Inicializar o router com configuração melhorada
            this.router = new Router({
                rootElement: '#pageContainer',
                defaultRoute: 'dashboard',
                basePath: '/financas/frontend',
                onRouteChange: (route, params, prevRoute) => {
                    console.log(`App: Rota alterada de ${prevRoute || 'nenhuma'} para ${route}`);
                    this.updateActiveNavLink(route);
                },
                routes: {
                    'dashboard': {
                        // Não fornecemos template ou controller específico para dashboard
                        // Usaremos o conteúdo original do HTML
                    },
                    'transactions': {
                        controller: async () => {
                            return await this.uiManager.fetchPageContent('transactions');
                        }
                    },
                    'budgets': {
                        controller: async () => {
                            return await this.uiManager.fetchPageContent('budgets');
                        }
                    },
                    'goals': {
                        controller: async () => {
                            return await this.uiManager.fetchPageContent('goals');
                        }
                    },
                    'reports': {
                        controller: async () => {
                            return await this.uiManager.fetchPageContent('reports');
                        }
                    },
                    'profile': {
                        controller: async () => {
                            return await this.uiManager.fetchPageContent('profile');
                        }
                    },
                    'settings': {
                        controller: async () => {
                            return await this.uiManager.fetchPageContent('settings');
                        }
                    }
                }
            });
            
            // Registrar router no singletonManager
            singletonManager.register('router', this.router);
        }, 100);  // Pequeno delay para garantir que o DOM está pronto

        // Inicializar gerenciador de loading
        this.loadingManager = new LoadingManager({
            useSkeletons: true,
            useOverlay: true,
            minDisplayTime: 800
        });
        
        // Inicializar data loader
        this.dataLoader = new DataLoader(this.storageManager, {
            batchSize: 150,
            retryAttempts: 2,
            retryDelay: 1000
        });
        
        // Registrar gerenciadores adicionais no singletonManager
        singletonManager.register('app', this);
        singletonManager.register('loadingManager', this.loadingManager);
        singletonManager.register('dataLoader', this.dataLoader);
        
        // Inicializar a aplicação
        this.init();
    }
    
    async init() {
        if (this._initializing || this._initialized) {
            console.log('Aplicação já está inicializada ou em processo de inicialização');
            return;
        }
        
        this._initializing = true;
        
        try {
            // Inicializar gerenciador de loading
            this.loadingManager.init();
            
            // Iniciar loading visual com feedback para o usuário
            this.loadingManager.startLoading('Inicializando aplicação...');
            
            // Configurar callback para atualização de estado de carregamento
            this.dataLoader.onStateUpdate(update => {
                this.loadingManager.updateProgressFromStates(update.allStates);
            });
            
            // Verificar estado de autenticação
            this.checkAuth();

            // Inicializar storage manager
            await this.storageManager.initialize();
            console.log('Storage inicializado com sucesso');
            
            // Verificar autenticação
            await this.authManager.checkAuthentication();            
            
            // Inicializar gerenciador de UI
            this.uiManager.init();

            // Inicializar dashboard manager
            if (this.dashboardManager.initialize) {
                await this.dashboardManager.initialize();
            }      
            
            // Configurar listeners de eventos
            if (!this._listenersConfigured) {
                this.setupEventListeners();
                this._listenersConfigured = true;
            }
            
            // Carregar dados iniciais com feedback visual
            await this.loadInitialDataWithFeedback();
            
            this._initialized = true;
            
            // Finalizar carregamento
            this.loadingManager.finishLoading();
            
            // Permitir que gerenciadores de componentes atualizem suas visualizações
            this.notifyInitializationComplete();
            
            // Adicionar método de emergência para navegação
            window.emergencyNavigate = (route) => {
                console.log(`Navegação de emergência para: ${route}`);
                
                // Ocultar todas as páginas
                const pageContainer = document.querySelector('#pageContainer');
                if (pageContainer) {
                    const pages = pageContainer.querySelectorAll('.page');
                    pages.forEach(page => {
                        page.classList.remove('active');
                    });
                    
                    // Mostrar a página solicitada
                    const targetPage = document.getElementById(`${route}Page`);
                    if (targetPage) {
                        targetPage.classList.add('active');
                        return true;
                    } else {
                        console.error(`Página ${route} não encontrada`);
                        return false;
                    }
                }
                return false;
            };
            
        } catch (error) {
            console.error('Erro ao inicializar aplicação:', error);
            
            this.loadingManager.showLoadingError(
                'Ocorreu um erro ao carregar os dados. Por favor, tente novamente.',
                true,
                () => {
                    window.location.reload();
                }
            );
            
            throw error;
        } finally {
            this._initializing = false;
        }
    }

    /**
     * Notifica os gerenciadores que a aplicação foi completamente inicializada
     * Isso permite atualização de componentes após carregamento de dados
     */
    notifyInitializationComplete() {
        // Notificar outros gerenciadores através do singletonManager
        const dashboardManager = singletonManager.get('dashboardManager');
        if (dashboardManager && dashboardManager.onAppInitialized) {
            dashboardManager.onAppInitialized();
        }
        
        // Eventos de ciclo de vida da aplicação
        document.dispatchEvent(new CustomEvent('fincontrol:initialized', {
            detail: { timestamp: Date.now() }
        }));
    }
    
    /**
     * Atualiza o link de navegação ativo
     * @param {string} route - Rota atual
     */
    updateActiveNavLink(route) {
        // Usar consistentemente data-route em vez de data-page
        document.querySelectorAll('.main-nav a[data-route]').forEach(link => {
            const linkRoute = link.getAttribute('data-route');
            if (linkRoute === route) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }
    
    /**
     * Verifica o estado de autenticação do usuário
     */
    checkAuth() {
        const isAuthenticated = this.authManager.isAuthenticated();
        
        if (!isAuthenticated) {
            // Redirecionar para página de login ou mostrar formulário de login
            // Por enquanto, vamos apenas definir um usuário anônimo para demonstração
            this.authManager.setAnonymousUser();
        }
        
        // Atualizar UI baseado no estado de autenticação
        const userElement = document.getElementById('userInfo')?.querySelector('span');
        if (userElement) {
            userElement.textContent = isAuthenticated ? this.authManager.getCurrentUser().name : 'Convidado';
        }
    }
    
    /**
     * Configura os listeners de eventos
     */
    setupEventListeners() {
        // Menu do usuário
        const userInfo = document.getElementById('userInfo');
        const userDropdown = document.getElementById('userDropdown');
        
        if (userInfo && userDropdown) {
            userInfo.addEventListener('click', () => {
                userDropdown.classList.toggle('hidden');
                userDropdown.classList.toggle('visible');
                userInfo.classList.toggle('active');
            });
            
            // Fechar dropdown ao clicar fora dele
            document.addEventListener('click', (e) => {
                if (!userInfo.contains(e.target) && !userDropdown.contains(e.target)) {
                    userDropdown.classList.add('hidden');
                    userDropdown.classList.remove('visible');
                    userInfo.classList.remove('active');
                }
            });
        }
        
        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                this.authManager.logout();
                // A redireção para a página de login já está configurada no href
            });
        }
        
        // Adicionar nova transação
        const addTransactionBtn = document.getElementById('addTransactionBtn');
        if (addTransactionBtn) {
            addTransactionBtn.addEventListener('click', () => {
                this.uiManager.openModal('addTransactionModal');
            });
        }
        
        // Adicionar nova meta
        const addGoalBtn = document.getElementById('addGoalBtn');
        if (addGoalBtn) {
            addGoalBtn.addEventListener('click', () => {
                this.uiManager.openModal('addGoalModal');
            });
        }
        
        // Fechar modais
        document.querySelectorAll('.close-modal').forEach(button => {
            button.addEventListener('click', () => {
                this.uiManager.closeAllModals();
            });
        });
        
        // Formulário de transação
        const transactionForm = document.getElementById('transactionForm');
        if (transactionForm) {
            transactionForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleTransactionFormSubmit();
            });
        }
        
        // Formulário de meta
        const goalForm = document.getElementById('goalForm');
        if (goalForm) {
            goalForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleGoalFormSubmit();
            });
        }
        
        // Seletor de período no dashboard
        const periodSelect = document.getElementById('periodSelect');
        if (periodSelect) {
            periodSelect.addEventListener('change', (e) => {
                // Obter dashboardManager do singletonManager para evitar dependência circular
                const dashboardManager = singletonManager.get('dashboardManager');
                if (dashboardManager) {
                    dashboardManager.updateDashboard(e.target.value);
                }
            });
        }
    }
    
    /**
     * Carrega os dados iniciais com feedback visual
     */
    async loadInitialDataWithFeedback() {
        try {
            // Carregar dados em paralelo
            const loadResult = await this.dataLoader.loadAllData();
            
            if (!loadResult.success && !loadResult.partial) {
                throw new Error('Falha ao carregar dados essenciais da aplicação');
            }
            
            const { results } = loadResult;
            
            // Processar categorias
            if (results.categories) {
                // Preencher select de categorias
                this.populateCategorySelect();
            } else {
                console.warn('Não foi possível carregar categorias');
            }
            
            // Notificar o dashboard manager que dados foram carregados
            // para atualizar a interface
            const router = singletonManager.get('router');
            const dashboardManager = singletonManager.get('dashboardManager');
            
            if (router && dashboardManager && router.getCurrentRoute() === 'dashboard') {
                dashboardManager.updateDashboard();
            }
            
            return results;
        } catch (error) {
            console.error('Erro ao carregar dados iniciais:', error);
            throw error;
        }
    }
    
    /**
     * Preenche o select de categorias
     */
    populateCategorySelect() {
        const categorySelect = document.getElementById('transactionCategory');
        const typeSelect = document.getElementById('transactionType');
        
        if (!categorySelect || !typeSelect) return;
        
        const updateCategories = () => {
            const type = typeSelect.value;
            const categories = this.storageManager.getCategories();
            
            // Limpar select
            categorySelect.innerHTML = '';
            
            // Adicionar categorias baseadas no tipo
            categories[type].forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                categorySelect.appendChild(option);
            });
        };
        
        // Atualizar categorias quando o tipo mudar
        typeSelect.addEventListener('change', updateCategories);
        
        // Carregar categorias iniciais
        updateCategories();
    }
    
    /**
     * Manipula o envio do formulário de transação
     */
    handleTransactionFormSubmit() {
        const type = document.getElementById('transactionType').value;
        const description = document.getElementById('transactionDescription').value;
        const amount = parseFloat(document.getElementById('transactionAmount').value);
        const category = document.getElementById('transactionCategory').value;
        const date = document.getElementById('transactionDate').value;
        const notes = document.getElementById('transactionNotes')?.value || '';
        
        // Validar dados
        if (!description || !amount || !category || !date) {
            // Exibir mensagem de erro
            this.uiManager.showError('Por favor, preencha todos os campos obrigatórios.');
            return;
        }
        
        // Criar objeto de transação
        const transaction = {
            id: Date.now().toString(),
            type,
            description,
            amount,
            category,
            date,
            notes,
            createdAt: new Date().toISOString()
        };
        
        // Adicionar transação
        this.transactionManager.addTransaction(transaction);
        
        // Fechar modal
        this.uiManager.closeAllModals();
        
        // Exibir mensagem de sucesso
        this.uiManager.showSuccess('Transação adicionada com sucesso!');
        
        // Resetar formulário
        document.getElementById('transactionForm').reset();
        
        // Atualizar dashboard se estiver na rota dashboard
        const router = singletonManager.get('router');
        const dashboardManager = singletonManager.get('dashboardManager');
        
        if (router && dashboardManager && router.getCurrentRoute() === 'dashboard') {
            dashboardManager.updateDashboard();
        }
    }
    
    /**
     * Manipula o envio do formulário de meta
     */
    handleGoalFormSubmit() {
        // [código existente mantido]
    }
    
    /**
     * Retorna as categorias padrão
     */
    getDefaultCategories() {
        return {
            income: [
                { id: 'salary', name: 'Salário', icon: 'fa-money-bill-wave' },
                { id: 'investment', name: 'Investimentos', icon: 'fa-chart-line' },
                { id: 'gift', name: 'Presentes', icon: 'fa-gift' },
                { id: 'other_income', name: 'Outros', icon: 'fa-plus-circle' }
            ],
            expense: [
                { id: 'housing', name: 'Moradia', icon: 'fa-home' },
                { id: 'food', name: 'Alimentação', icon: 'fa-utensils' },
                { id: 'transport', name: 'Transporte', icon: 'fa-car' },
                { id: 'utilities', name: 'Contas', icon: 'fa-file-invoice' },
                { id: 'healthcare', name: 'Saúde', icon: 'fa-heartbeat' },
                { id: 'entertainment', name: 'Lazer', icon: 'fa-film' },
                { id: 'education', name: 'Educação', icon: 'fa-graduation-cap' },
                { id: 'shopping', name: 'Compras', icon: 'fa-shopping-bag' },
                { id: 'personal', name: 'Pessoal', icon: 'fa-user' },
                { id: 'other_expense', name: 'Outros', icon: 'fa-minus-circle' }
            ]
        };
    }
}

// Inicializar aplicação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM carregado, inicializando aplicação...');
    try {
        const app = new FinControlApp();
        await app.init();
        window.app = app;
        
        // Adicionar função de fallback diretamente no objeto window
        window.debugNavigate = function(route) {
            console.log(`Navegação de depuração para ${route}`);
            
            // Verificar se a aplicação está inicializada
            if (!window.app || !window.app._initialized) {
                console.warn('Aplicação não está completamente inicializada');
            }
            
            // Tentar vários métodos de navegação
            
            // 1. Usar o router via singletonManager
            const router = singletonManager.get('router');
            if (router) {
                console.log('Tentando navegação via Router');
                try {
                    router.navigate(route);
                    return;
                } catch (e) {
                    console.error('Falha ao navegar via Router:', e);
                }
            }
            
            // 2. Tentar alterar página diretamente
            console.log('Tentando navegação direta via DOM');
            const allPages = document.querySelectorAll('.page');
            const targetPage = document.getElementById(`${route}Page`);
            
            if (allPages.length > 0 && targetPage) {
                allPages.forEach(page => page.classList.remove('active'));
                targetPage.classList.add('active');
                
                // Atualizar links ativos
                document.querySelectorAll('a[data-route]').forEach(link => {
                    if (link.getAttribute('data-route') === route) {
                        link.classList.add('active');
                    } else {
                        link.classList.remove('active');
                    }
                });
                
                console.log(`Navegação direta para ${route} bem-sucedida`);
                return;
            }
            
            console.error(`Navegação falhou. Não foi possível encontrar a página: ${route}`);
        };
    } catch (error) {
        console.error('Erro fatal ao inicializar aplicação:', error);
        document.body.innerHTML = `
            <div class="error-container" style="padding: 2rem; text-align: center; margin: 2rem auto; max-width: 600px; background: #fff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                <h2 style="color: #e74c3c;">Erro ao Inicializar Aplicação</h2>
                <p>Ocorreu um erro ao carregar a aplicação. Por favor, tente novamente.</p>
                <pre style="text-align: left; background: #f8f8f8; padding: 1rem; border-radius: 4px; overflow: auto;">${error.message}</pre>
                <button onclick="window.location.reload()" style="background: #3498db; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 4px; cursor: pointer; margin-top: 1rem;">Recarregar Página</button>
            </div>
        `;
    }
});

// Exportar classe para uso em outros módulos
export default FinControlApp;