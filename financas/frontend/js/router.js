// /frontend/js/router.js
// Gerenciador de navegação SPA - Preservando conteúdo original e melhorando navegação

import { singletonManager } from './utils/singleton-manager.js';

export class Router {
    constructor(options = {}) {
        // Configurações básicas
        this.routes = options.routes || {};
        this.onRouteChange = options.onRouteChange || (() => {});
        this.rootElement = options.rootElement ? document.querySelector(options.rootElement) : null;
        this.defaultRoute = options.defaultRoute || '/';
        this.basePath = options.basePath || '';
        this.currentRoute = null;
        this.params = {};
        
        // Armazenar conteúdo original para rotas
        this.originalContent = {};
        
        // Estado de renderização para evitar chamadas concorrentes
        this._isInitialized = false;
        this._isRendering = false;
        this._pendingRoute = null;
        this._renderTimeout = null;
        
        // Armazenar histórico de navegação
        this.navigationHistory = [];
        this.maxHistoryLength = 10;
        
        // Registrar no singletonManager
        singletonManager.register('router', this);
        
        // Inicializar gerenciadores necessários
        this._initDependencies();
        
        // Inicializar router se autoInit não for explicitamente false
        if (options.autoInit !== false) {
            this.init();
        }
    }
    
    _initDependencies() {
        // Obter dependências via singletonManager
        this.authManager = singletonManager.get('authManager');
        this.uiManager = singletonManager.get('uiManager');
        this.chartManager = singletonManager.get('chartManager');
        
        // Se o chartManager não estiver disponível, aguardar até que seja registrado
        if (!this.chartManager) {
            document.addEventListener('chartManagerReady', () => {
                this.chartManager = singletonManager.get('chartManager');
            });
        }
    }
    
    static navigateTo(route, params = {}) {
        // Obter instância do Router do singletonManager
        const router = singletonManager.get('router');
        
        if (router) {
            router.navigate(route, params);
        } else {
            console.error('Router: Nenhuma instância de Router encontrada para navegação');
        }
    }
    
    init() {
        if (this._isInitialized) return;
        
        // Capturar conteúdo original do dashboard
        this._captureOriginalContent();
        
        // Interceptar cliques em links com atributos data-route
        document.addEventListener('click', (e) => {
            const routeLink = e.target.closest('[data-route]');
            if (routeLink) {
                e.preventDefault();
                
                const route = routeLink.getAttribute('data-route');
                console.log(`Router: Link clicado - rota: ${route}`);
                this.navigate(route);
            }
        });
        
        // Lidar com mudanças no histórico (botões voltar/avançar)
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.route) {
                this.handleRoute(e.state.route, false);
            }
        });
        
        // Processar rota inicial
        this.handleInitialRoute();
        
        this._isInitialized = true;
        console.log('Router: inicializado com sucesso');
    }
    
    _captureOriginalContent() {
        // Capturar conteúdo original das páginas que já estão no DOM
        if (this.rootElement) {
            const pages = this.rootElement.querySelectorAll('.page');
            pages.forEach(page => {
                const pageId = page.id;
                const route = pageId.replace('Page', '');
                
                // Preservar o conteúdo original
                this.originalContent[route] = page.outerHTML;
                console.log(`Router: Conteúdo original capturado para rota: ${route}`);
            });
        }
    }
    
    handleInitialRoute() {
        // Obter caminho da URL atual
        let path = window.location.pathname;
        
        // Se estamos em index.html, usar a rota padrão
        if (path.endsWith('index.html')) {
            console.log('Router: Detectado index.html, usando rota padrão');
            path = this.defaultRoute;
        } else {
            // Remover o caminho base da rota se estiver presente
            if (this.basePath && path.startsWith(this.basePath)) {
                path = path.substring(this.basePath.length);
            }
            
            // Se o caminho está vazio após remover o base path, usar a rota padrão
            if (!path || path === '/') {
                path = this.defaultRoute;
            }
        }
        
        console.log(`Router: Rota inicial: ${path}`);
        
        // Processar rota sem adicionar ao histórico
        this.handleRoute(path, false);
    }
    
    navigate(route, params = {}) {
        console.log(`Router: Navegando para: ${route}`);
        this.handleRoute(route, true, params);
    }
    
    handleRoute(route, addToHistory = true, params = {}) {
        console.log(`Router: Processando rota: ${route}, addToHistory: ${addToHistory}`);
        
        if (this._isRendering) {
            console.warn('Router: Já existe uma operação de renderização em andamento, enfileirando navegação');
            this._pendingRoute = { route, addToHistory, params };
            return;
        }
        
        this._isRendering = true;

        // Limpar timeout existente
        if (this._renderTimeout) {
            clearTimeout(this._renderTimeout);
        }
        
        try {
            // Mostrar loading se tiver um uiManager disponível
            if (this.uiManager && typeof this.uiManager.showLoading === 'function') {
                this.uiManager.showLoading('app-container');
            }
            
            // Normalizar a rota
            let finalRoute = route;
            
            // Se a rota termina com .html, extrair o nome da rota
            if (finalRoute.endsWith('.html')) {
                finalRoute = finalRoute.substring(0, finalRoute.length - 5);
                if (finalRoute === 'index') {
                    finalRoute = this.defaultRoute;
                }
            }
            
            // Verificar se a rota existe
            if (!this.routes[finalRoute]) {
                // Registrar o erro de rota não encontrada
                console.warn(`Router: Rota não encontrada: ${finalRoute}. Redirecionando para: ${this.defaultRoute}`);
                
                // Redirecionar para rota padrão
                if (finalRoute !== this.defaultRoute) {
                    this._isRendering = false; // Resetar flag antes de chamar recursivamente
                    this.handleRoute(this.defaultRoute, addToHistory);
                    return;
                }
            }
            
            // Armazenar rota anterior antes de atualizar
            const previousRoute = this.currentRoute;
            
            // Armazenar rota e parâmetros atuais
            this.currentRoute = finalRoute;
            this.params = params;
            
            // Adicionar ao histórico do navegador
            if (addToHistory) {
                const url = this.generateUrlFromRoute(finalRoute, params);
                window.history.pushState({ route: finalRoute, params }, '', url);
                
                // Adicionar ao histórico interno
                this.addToNavigationHistory(finalRoute, params);
            }
            
            // Executar callback de mudança de rota
            this.onRouteChange(finalRoute, params, previousRoute);
            
            // Atualizar links ativos
            this.updateActiveNavigation(finalRoute);

            // Limpar recursos da rota anterior
            this.cleanupBeforeRouteChange(previousRoute, finalRoute);
            
            // Renderizar a página
            this.renderRoute(finalRoute, params, previousRoute);
            
            // Esconder loading após um pequeno delay
            this._renderTimeout = setTimeout(() => {
                if (this.uiManager && typeof this.uiManager.hideLoading === 'function') {
                    this.uiManager.hideLoading('app-container');
                }
                
                // Definir flag de renderização como falso
                this._isRendering = false;
                
                // Processar rota pendente, se houver
                if (this._pendingRoute) {
                    const pendingRoute = this._pendingRoute;
                    this._pendingRoute = null;
                    this.handleRoute(pendingRoute.route, pendingRoute.addToHistory, pendingRoute.params);
                }
                
                // Emitir evento de rota completamente carregada
                window.dispatchEvent(new CustomEvent('routeFullyLoaded', {
                    detail: { route: finalRoute, params }
                }));
            }, 300);
        } catch (error) {
            console.error('Router: Erro ao processar rota:', error);
            
            if (this.uiManager) {
                if (typeof this.uiManager.showError === 'function') {
                    this.uiManager.showError('Não foi possível carregar a página solicitada.');
                }
                
                if (typeof this.uiManager.hideLoading === 'function') {
                    this.uiManager.hideLoading('app-container');
                }
            }
            
            // Resetar flag de renderização em caso de erro
            this._isRendering = false;
        }
    }
    
    addToNavigationHistory(route, params) {
        this.navigationHistory.unshift({
            route,
            params,
            timestamp: Date.now()
        });
        
        if (this.navigationHistory.length > this.maxHistoryLength) {
            this.navigationHistory = this.navigationHistory.slice(0, this.maxHistoryLength);
        }
    }
    
    cleanupBeforeRouteChange(previousRoute, newRoute) {
        // Limpeza simplificada - apenas notificação de log
        console.log(`Router: Mudando de ${previousRoute || 'nenhuma'} para ${newRoute}`);
    }
    
    updateActiveNavigation(activeRoute) {
        // Atualizar todos os links de navegação
        document.querySelectorAll('a[data-route]').forEach(link => {
            const route = link.getAttribute('data-route');
            
            if (route === activeRoute) {
                link.classList.add('active');
                link.setAttribute('aria-current', 'page');
            } else {
                link.classList.remove('active');
                link.removeAttribute('aria-current');
            }
        });
    }

    async renderRoute(route, params, previousRoute) {
        console.log(`Router: Renderizando rota: ${route} (anterior: ${previousRoute})`);
        const handler = this.routes[route];
        
        if (!this.rootElement) {
            console.error('Router: Elemento raiz não encontrado. A rota não pode ser renderizada.');
            return;
        }
        
        // Se não encontrou a rota, não tenta renderizar
        if (!handler) {
            console.warn(`Router: Nenhum handler encontrado para a rota: ${route}`);
            return;
        }
        
        try {
            if (route !== 'dashboard') {
                // Para rotas que não são dashboard, limpar todo o conteúdo
                this.rootElement.innerHTML = '';
                // Para dashboard, verificar se já existe e apenas ativá-lo
            } else {
                const dashboardPage = document.getElementById('dashboardPage');
                if (dashboardPage) {
                    // Limpar outras páginas, mas manter dashboard
                    Array.from(this.rootElement.children).forEach(child => {
                        if (child.id !== 'dashboardPage') {
                            child.remove();
                        }
                    });
                    
                    // Ativar dashboard
                    dashboardPage.classList.add('active');
                    dashboardPage.removeAttribute('aria-hidden');
                    
                    // Atualizar dashboard
                    const dashboardManager = singletonManager.get('dashboardManager');
                    if (dashboardManager && typeof dashboardManager.updateDashboard === 'function') {
                        setTimeout(() => {
                            dashboardManager.updateDashboard();
                        }, 100);
                    }
                    
                    // Disparar evento específico para o dashboard
                    document.dispatchEvent(new CustomEvent('dashboardRendered', { 
                        detail: { route, params, previousRoute } 
                    }));
                    
                    return;
                }
                // Se não existe dashboardPage, limpar todo o conteúdo
                this.rootElement.innerHTML = '';
            }

            // IMPORTANTE: Limpar completamente o conteúdo do elemento raiz
            // Isso garante que apenas a página atual será exibida
            this.rootElement.innerHTML = '';
            
            // Criar novo elemento de página
            let pageElement = document.createElement('section');
            pageElement.id = `${route}Page`;
            pageElement.className = 'page active'; // Já adiciona a classe active
            
            // Obter conteúdo da página
            let content = '';
            
            if (typeof handler === 'function') {
                // Handler é uma função
                try {
                    const result = handler(params);
                    content = result instanceof Promise ? await result : result;
                } catch (error) {
                    console.error(`Router: Erro ao executar handler da rota ${route}:`, error);
                    throw error;
                }
            } else if (typeof handler === 'string') {
                // Handler é uma string HTML
                content = handler;
            } else if (typeof handler === 'object') {
                // Handler é um objeto com template e controller
                if (handler.template) {
                    content = handler.template;
                } else if (handler.controller && typeof handler.controller === 'function') {
                    // Tentar obter via controller
                    try {
                        const result = handler.controller(params);
                        content = result instanceof Promise ? await result : result;
                    } catch (error) {
                        console.error(`Router: Erro ao executar controller da rota ${route}:`, error);
                        throw error;
                    }
                }
            }
            
            // Definir conteúdo na página
            if (content) {
                pageElement.innerHTML = content;
            } else if (route === 'dashboard' && this.originalContent && this.originalContent['dashboard']) {
                // Para dashboard sem conteúdo definido, usar original
                const tempContainer = document.createElement('div');
                tempContainer.innerHTML = this.originalContent['dashboard'];
                // CORREÇÃO: Usar let para pageElement permite reatribuição
                if (tempContainer.firstChild) {
                    pageElement = tempContainer.firstChild;
                }
            }
            
            // Adicionar ao elemento raiz (que agora está vazio)
            this.rootElement.appendChild(pageElement);
            
            // Executar controller se estiver disponível no objeto handler
            if (typeof handler === 'object' && handler.controller && typeof handler.controller === 'function') {
                try {
                    await Promise.resolve(handler.controller(pageElement, params));
                } catch (error) {
                    console.error(`Router: Erro ao executar controller após renderização da rota ${route}:`, error);
                }
            }
            
            // Inicializar componentes da página usando UIManager
            const uiManager = singletonManager.get('uiManager');
            if (uiManager && typeof uiManager.initializePageComponents === 'function') {
                uiManager.initializePageComponents(route, pageElement);
            }
            
            // Disparar evento de rota renderizada
            document.dispatchEvent(new CustomEvent('routeRendered', { 
                detail: { route, params, previousRoute } 
            }));
            
            // Evento específico para o dashboard
            if (route === 'dashboard') {
                document.dispatchEvent(new CustomEvent('dashboardRendered', { 
                    detail: { route, params, previousRoute } 
                }));
            }
            
            console.log(`Router: Rota ${route} renderizada com sucesso`);
            
        } catch (error) {
            console.error(`Router: Erro ao renderizar rota ${route}:`, error);
            
            // Criar página de erro
            const errorPage = document.createElement('section');
            errorPage.id = `${route}Page`;
            errorPage.className = 'page active error-page';
            errorPage.innerHTML = `
                <div class="error-container">
                    <h2>Erro ao carregar página</h2>
                    <p>Ocorreu um erro ao carregar o conteúdo solicitado. Por favor, tente novamente mais tarde.</p>
                    <p class="error-details">${error.message}</p>
                    <button class="btn btn-primary" onclick="window.location.reload()">Tentar Novamente</button>
                </div>
            `;
            
            // Limpar container e adicionar página de erro
            this.rootElement.innerHTML = '';
            this.rootElement.appendChild(errorPage);
        }
    }
    
    async _loadPageContent(route, pageElement, handler, params) {
        // Carregar conteúdo com base no tipo de handler
        let content = '';
        
        if (typeof handler === 'function') {
            // Handler é uma função
            try {
                const result = handler(params);
                content = result instanceof Promise ? await result : result;
            } catch (error) {
                console.error(`Router: Erro ao executar handler da rota ${route}:`, error);
                throw error;
            }
        } else if (typeof handler === 'string') {
            // Handler é uma string HTML
            content = handler;
        } else if (typeof handler === 'object') {
            // Handler é um objeto com template e controller
            if (handler.template) {
                content = handler.template;
            } else {
                // Tentar obter via controller
                if (handler.controller && typeof handler.controller === 'function') {
                    try {
                        const result = handler.controller(params);
                        content = result instanceof Promise ? await result : result;
                    } catch (error) {
                        console.error(`Router: Erro ao executar controller da rota ${route}:`, error);
                        throw error;
                    }
                }
            }
        }
        
        // Definir conteúdo na página
        if (content) {
            pageElement.innerHTML = content;
            
            // Executar controller se estiver disponível
            if (typeof handler === 'object' && handler.controller && typeof handler.controller === 'function') {
                try {
                    await Promise.resolve(handler.controller(pageElement, params));
                } catch (error) {
                    console.error(`Router: Erro ao executar controller após renderização da rota ${route}:`, error);
                }
            }
            
            // Inicializar componentes da página usando UIManager
            const uiManager = singletonManager.get('uiManager');
            if (uiManager && typeof uiManager.initializePageComponents === 'function') {
                uiManager.initializePageComponents(route, pageElement);
            }
        }
    }
    
    matchRoute(url) {
        // Simplificado para apenas retornar a rota diretamente
        return { route: url, params: {} };
    }
    
    generateUrlFromRoute(route, params) {
        // Simplificado para apenas retornar a rota como URL
        return route;
    }
    
    getCurrentRoute() {
        return this.currentRoute;
    }
    
    getParams() {
        return { ...this.params };
    }
    
    reloadCurrentRoute() {
        if (this.currentRoute) {
            this.navigate(this.currentRoute, this.getParams());
        }
    }
}

// Exportar classe Router e método estático para navegação fácil
export const navigateTo = Router.navigateTo;
export default Router;