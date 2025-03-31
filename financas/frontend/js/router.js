// /frontend/js/router.js
// Sistema de roteamento para Single Page Application (SPA)

/**
 * Classe responsável por gerenciar o roteamento da aplicação SPA
 */
export class Router {
    /**
     * @param {Object} options - Opções de configuração do router
     * @param {Object} options.routes - Mapeamento de rotas para handlers ou templates
     * @param {Function} options.onRouteChange - Callback executado quando a rota muda
     * @param {string} options.rootElement - Seletor do elemento raiz onde as páginas serão renderizadas
     * @param {string} options.defaultRoute - Rota padrão quando nenhuma é especificada
     */
    constructor(options = {}) {
        this.routes = options.routes || {};
        this.onRouteChange = options.onRouteChange || (() => {});
        this.rootElement = options.rootElement ? document.querySelector(options.rootElement) : null;
        this.defaultRoute = options.defaultRoute || '/';
        this.currentRoute = null;
        this.params = {};
        
        this.init();
    }
    
    /**
     * Inicializa o router
     */
    init() {
        // Interceptar cliques em links
        document.addEventListener('click', (e) => {
            // Verificar se é um link com atributo data-route
            const routeLink = e.target.closest('[data-route]');
            if (routeLink) {
                e.preventDefault();
                const route = routeLink.getAttribute('data-route');
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
    }
    
    /**
     * Processa a rota inicial ao carregar a página
     */
    handleInitialRoute() {
        // Obter caminho da URL atual
        const path = window.location.pathname;
        const route = path || this.defaultRoute;
        
        // Processar rota sem adicionar ao histórico
        this.handleRoute(route, false);
    }
    
    /**
     * Navega para uma nova rota
     * @param {string} route - Rota para navegação
     * @param {Object} params - Parâmetros opcionais para passar para o handler da rota
     */
    navigate(route, params = {}) {
        this.handleRoute(route, true, params);
    }
    
    /**
     * Processa uma rota
     * @param {string} route - Rota a ser processada
     * @param {boolean} addToHistory - Se deve adicionar a navegação ao histórico
     * @param {Object} params - Parâmetros para o handler da rota
     */
    handleRoute(route, addToHistory = true, params = {}) {
        // Se a rota já tiver parâmetros na URL (formato /users/:id)
        const routeInfo = this.matchRoute(route);
        const finalRoute = routeInfo.route;
        
        // Mesclar parâmetros da URL com os fornecidos manualmente
        const finalParams = { ...routeInfo.params, ...params };
        
        // Verificar se a rota existe
        if (!this.routes[finalRoute]) {
            // Redirecionar para rota 404 ou rota padrão
            console.warn(`Rota não encontrada: ${finalRoute}`);
            this.handleRoute(this.routes['404'] ? '404' : this.defaultRoute, addToHistory);
            return;
        }
        
        // Armazenar rota e parâmetros atuais
        this.currentRoute = finalRoute;
        this.params = finalParams;
        
        // Adicionar ao histórico do navegador
        if (addToHistory) {
            const url = this.generateUrlFromRoute(finalRoute, finalParams);
            window.history.pushState({ route: finalRoute, params: finalParams }, '', url);
        }
        
        // Executar callback de mudança de rota
        this.onRouteChange(finalRoute, finalParams);
        
        // Renderizar a página
        this.renderRoute(finalRoute, finalParams);
    }
    
    /**
     * Renderiza a página para a rota atual
     * @param {string} route - Rota a ser renderizada
     * @param {Object} params - Parâmetros para o handler da rota
     */
    renderRoute(route, params) {
        const handler = this.routes[route];
        
        if (!this.rootElement) {
            console.error('Elemento raiz não encontrado. A rota não pode ser renderizada.');
            return;
        }
        
        // Handler pode ser uma função, string (HTML) ou objeto com template e controller
        if (typeof handler === 'function') {
            // Função handler (recebe params e retorna HTML ou Promise)
            const result = handler(params);
            
            if (result instanceof Promise) {
                // Se for uma Promise, esperar resolução
                result.then(html => {
                    this.rootElement.innerHTML = html;
                }).catch(error => {
                    console.error('Erro ao renderizar rota:', error);
                });
            } else {
                // Se for HTML direto
                this.rootElement.innerHTML = result;
            }
        } else if (typeof handler === 'string') {
            // String HTML direta
            this.rootElement.innerHTML = handler;
        } else if (typeof handler === 'object') {
            // Objeto com template e controller
            if (handler.template) {
                // Renderizar template
                this.rootElement.innerHTML = handler.template;
                
                // Executar controller se existir
                if (handler.controller) {
                    handler.controller(this.rootElement, params);
                }
            }
        }
    }
    
    /**
     * Identifica se a rota contém parâmetros e extrai seus valores
     * @param {string} url - URL a ser analisada
     * @returns {Object} - Objeto com a rota normalizada e parâmetros extraídos
     */
    matchRoute(url) {
        // Remover query string e hash
        const cleanUrl = url.split('?')[0].split('#')[0];
        
        // Dividir em segmentos
        const urlSegments = cleanUrl.split('/').filter(Boolean);
        
        // Verificar cada rota registrada
        for (const route in this.routes) {
            const routeSegments = route.split('/').filter(Boolean);
            
            // Se o número de segmentos não for igual, não é uma correspondência
            if (routeSegments.length !== urlSegments.length) {
                continue;
            }
            
            const params = {};
            let isMatch = true;
            
            // Verificar cada segmento
            for (let i = 0; i < routeSegments.length; i++) {
                const routeSegment = routeSegments[i];
                const urlSegment = urlSegments[i];
                
                // Se o segmento começa com ':', é um parâmetro
                if (routeSegment.startsWith(':')) {
                    const paramName = routeSegment.substring(1);
                    params[paramName] = urlSegment;
                } else if (routeSegment !== urlSegment) {
                    // Se não é um parâmetro e não corresponde, não é uma correspondência
                    isMatch = false;
                    break;
                }
            }
            
            if (isMatch) {
                return { route, params };
            }
        }
        
        // Se não encontrou correspondência, retorna a URL original sem parâmetros
        return { route: cleanUrl || '/', params: {} };
    }
    
    /**
     * Gera uma URL com base na rota e parâmetros
     * @param {string} route - Rota base
     * @param {Object} params - Parâmetros a serem inseridos na URL
     * @returns {string} - URL completa
     */
    generateUrlFromRoute(route, params) {
        let url = route;
        
        // Substituir parâmetros na rota
        for (const param in params) {
            url = url.replace(`:${param}`, params[param]);
        }
        
        return url;
    }
    
    /**
     * Adiciona ou atualiza uma rota
     * @param {string} route - Caminho da rota
     * @param {Function|string|Object} handler - Handler ou template da rota
     */
    addRoute(route, handler) {
        this.routes[route] = handler;
    }
    
    /**
     * Remove uma rota
     * @param {string} route - Caminho da rota a ser removida
     */
    removeRoute(route) {
        delete this.routes[route];
    }
    
    /**
     * Retorna a rota atual
     * @returns {string} - Rota atual
     */
    getCurrentRoute() {
        return this.currentRoute;
    }
    
    /**
     * Retorna os parâmetros da rota atual
     * @returns {Object} - Parâmetros da rota
     */
    getParams() {
        return { ...this.params };
    }
}
