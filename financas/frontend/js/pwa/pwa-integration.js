// /frontend/js/pwa/pwa-integration.js
// Integração PWA para a aplicação FinControl

/**
 * Classe responsável por gerenciar a integração PWA da aplicação
 */
class PWAIntegration {
    constructor() {
        this.swRegistration = null;
        this.isOnline = navigator.onLine;
        this.deferredInstallPrompt = null;
        this.syncManager = null;
    }
    
    /**
     * Inicializa a integração PWA
     */
    init() {
        // Registrar o Service Worker
        this.registerServiceWorker();
        
        // Configurar listeners de eventos
        this.setupEventListeners();
        
        // Configurar sincronização em segundo plano
        this.setupSyncManager();
        
        // Verificar se o app está instalado
        this.checkInstallation();
    }
    
    /**
     * Registra o Service Worker
     */
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/service-worker.js')
                    .then(registration => {
                        this.swRegistration = registration;
                        console.log('Service Worker registrado com sucesso:', registration);
                        
                        // Verificar por atualizações do SW
                        registration.addEventListener('updatefound', () => {
                            const newWorker = registration.installing;
                            
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    this.showUpdateNotification();
                                }
                            });
                        });
                    })
                    .catch(error => {
                        console.error('Erro ao registrar Service Worker:', error);
                    });
                    
                // Verificar se já existe um SW controlando a página
                if (navigator.serviceWorker.controller) {
                    console.log('Esta página é controlada por um Service Worker');
                }
            });
            
            // Lidar com mensagens do Service Worker
            navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));
        } else {
            console.warn('Service Workers não são suportados neste navegador');
        }
    }
    
    /**
     * Configura listeners de eventos para PWA
     */
    setupEventListeners() {
        // Monitorar estado da conexão
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.handleConnectivityChange(true);
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.handleConnectivityChange(false);
        });
        
        // Capturar evento beforeinstallprompt para instalação personalizada
        window.addEventListener('beforeinstallprompt', (event) => {
            // Prevenir o prompt automático
            event.preventDefault();
            
            // Guardar o evento para uso posterior
            this.deferredInstallPrompt = event;
            
            // Mostrar botão de instalação personalizado
            this.showInstallButton();
        });
        
        // Detectar se o app foi instalado
        window.addEventListener('appinstalled', () => {
            console.log('Aplicativo instalado com sucesso');
            this.hideInstallButton();
            
            // Registrar evento de analytics
            if (typeof gtag === 'function') {
                gtag('event', 'pwa_install');
            }
        });
    }
    
    /**
     * Configura o gerenciador de sincronização em segundo plano
     */
    setupSyncManager() {
        if ('SyncManager' in window) {
            this.syncManager = {
                registerSync: async (tag) => {
                    try {
                        if (this.swRegistration) {
                            await this.swRegistration.sync.register(tag);
                            console.log(`Sincronização em segundo plano registrada: ${tag}`);
                            return true;
                        }
                    } catch (error) {
                        console.error(`Erro ao registrar sincronização: ${tag}`, error);
                    }
                    return false;
                }
            };
        } else {
            console.warn('Sincronização em segundo plano não é suportada neste navegador');
            
            // Criar um gerenciador de sincronização alternativo
            this.syncManager = {
                registerSync: async (tag) => {
                    // Tentar sincronizar imediatamente se estiver online
                    if (navigator.onLine) {
                        try {
                            switch(tag) {
                                case 'sync-transactions':
                                    await this.syncTransactionsManually();
                                    break;
                                case 'sync-settings':
                                    await this.syncSettingsManually();
                                    break;
                            }
                            return true;
                        } catch (error) {
                            console.error(`Erro na sincronização manual: ${tag}`, error);
                        }
                    }
                    return false;
                }
            };
        }
    }
    
    /**
     * Verifica se o aplicativo já está instalado
     */
    checkInstallation() {
        // Verificar se está sendo executado como PWA
        if (window.matchMedia('(display-mode: standalone)').matches || 
            window.navigator.standalone === true) {
            // O aplicativo está sendo executado em modo standalone (instalado)
            console.log('O aplicativo está instalado');
            this.hideInstallButton();
        } else {
            // O aplicativo está sendo executado no navegador
            console.log('O aplicativo não está instalado');
        }
    }
    
    /**
     * Mostra o botão de instalação
     */
    showInstallButton() {
        // Verificar se o botão já existe
        let installButton = document.getElementById('pwaInstallButton');
        
        if (!installButton) {
            installButton = document.createElement('button');
            installButton.id = 'pwaInstallButton';
            installButton.className = 'pwa-install-button';
            installButton.innerHTML = `
                <i class="fas fa-download"></i>
                <span>Instalar App</span>
            `;
            
            // Adicionar botão ao DOM
            document.body.appendChild(installButton);