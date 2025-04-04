/**
 * Configurações centralizadas da aplicação
 */
export const config = {
    /**
     * Configurações de armazenamento
     */
    storage: {
        useIndexedDB: true,
        fallbackToLocalStorage: true,
        keys: {
            transactions: 'fincontrol_transactions',
            categories: 'fincontrol_categories',
            goals: 'fincontrol_goals',
            budgets: 'fincontrol_budgets',
            user: 'fincontrol_user',
            settings: 'fincontrol_settings'
        }
    },
    
    /**
     * Configurações de interface
     */
    ui: {
        loadingMinTime: 800,
        animationsEnabled: true,
        defaultCurrency: 'BRL',
        dateFormat: 'DD/MM/YYYY',
        theme: 'light'
    },
    
    /**
     * Configurações da API
     */
    api: {
        baseUrl: '/api',
        timeout: 10000,
        retryAttempts: 3
    },
    
    /**
     * Configurações de rotas
     */
    routes: {
        defaultRoute: 'dashboard',
        loginRoute: 'login',
        publicRoutes: ['login', 'register', 'recover-password']
    }
};