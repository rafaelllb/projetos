// /frontend/js/auth/auth-manager.js
// Gerenciador de autenticação da aplicação

import { StorageManager } from '../storage/storage-manager.js';

/**
 * Classe responsável por gerenciar a autenticação e autorização de usuários
 */
export class AuthManager {
    /**
     * Construtor do AuthManager
     * @param {StorageManager} [storageManager] - Instância do gerenciador de armazenamento
     */
    constructor(storageManager) {
        this.storageManager = storageManager || new StorageManager();
        this.currentUser = null;
        
        // Carregar usuário da sessão
        this.loadUserFromSession();
    }
    
    /**
     * Carrega o usuário da sessão atual
     */
    loadUserFromSession() {
        try {
            this.currentUser = this.storageManager.getUser();
        } catch (error) {
            console.error('Erro ao carregar usuário da sessão:', error);
            this.currentUser = null;
        }
    }
    
    /**
     * Verifica se o usuário está autenticado
     * @returns {boolean} - Status de autenticação
     */
    isAuthenticated() {
        return !!this.currentUser;
    }
    
    /**
     * Verifica se é modo demo
     * @returns {boolean} - Se é modo demo
     */
    isDemoMode() {
        return this.currentUser && this.currentUser.isAnonymous;
    }
    
    /**
     * Verifica se é usuário premium
     * @returns {boolean} - Se é usuário premium
     */
    isPremiumUser() {
        return this.currentUser && this.currentUser.isPremium;
    }
    
    /**
     * Retorna o usuário atual
     * @returns {Object|null} - Usuário atual ou null se não autenticado
     */
    getCurrentUser() {
        return this.currentUser;
    }
    
    /**
     * Realiza o login do usuário
     * @param {string} email - Email do usuário
     * @param {string} password - Senha do usuário
     * @param {boolean} rememberMe - Se deve lembrar o usuário
     * @returns {Promise<boolean>} - Promise que resolve com o sucesso do login
     */
    async login(email, password, rememberMe = false) {
        // Sanitizar entradas
        email = this.sanitizeInput(email);
        
        try {
            // Em uma aplicação real, enviaríamos a solicitação para uma API
            // Por enquanto, apenas simulamos uma verificação local
            
            // Verificar se o usuário existe no armazenamento local
            const users = this.getLocalUsers();
            const user = users.find(u => u.email === email);
            
            if (!user) {
                return false;
            }
            
            // Verificar senha
            if (!this.verifyPassword(password, user.passwordHash)) {
                return false;
            }
            
            // Criar cópia do usuário sem a senha
            const userWithoutPassword = { ...user };
            delete userWithoutPassword.passwordHash;
            
            // Armazenar usuário na sessão
            this.storageManager.setUser(userWithoutPassword, rememberMe);
            this.currentUser = userWithoutPassword;
            
            return true;
        } catch (error) {
            console.error('Erro ao fazer login:', error);
            return false;
        }
    }
    
    /**
     * Realiza o registro de um novo usuário
     * @param {Object} userData - Dados do usuário
     * @returns {Promise<boolean>} - Promise que resolve com o sucesso do registro
     */
    async register(userData) {
        // Sanitizar entradas
        userData.name = this.sanitizeInput(userData.name);
        userData.email = this.sanitizeInput(userData.email);
        
        try {
            // Validar dados do usuário
            this.validateUserData(userData);
            
            // Em uma aplicação real, enviaríamos a solicitação para uma API
            // Por enquanto, apenas simulamos um registro local
            
            // Verificar se o email já está em uso
            const users = this.getLocalUsers();
            if (users.some(u => u.email === userData.email)) {
                throw new Error('EMAIL_ALREADY_EXISTS');
            }
            
            // Gerar hash da senha
            const passwordHash = this.hashPassword(userData.password);
            
            // Criar novo usuário
            const newUser = {
                id: Date.now().toString(),
                name: userData.name,
                email: userData.email,
                passwordHash,
                createdAt: new Date().toISOString()
            };
            
            // Adicionar à lista de usuários
            users.push(newUser);
            this.saveLocalUsers(users);
            
            // Criar cópia do usuário sem a senha
            const userWithoutPassword = { ...newUser };
            delete userWithoutPassword.passwordHash;
            
            // Armazenar usuário na sessão
            this.storageManager.setUser(userWithoutPassword);
            this.currentUser = userWithoutPassword;
            
            return true;
        } catch (error) {
            console.error('Erro ao registrar usuário:', error);
            throw error;
        }
    }
    
    /**
     * Realiza o logout do usuário
     */
    logout() {
        this.storageManager.clearAllData();
        this.currentUser = null;
    }
    
    /**
     * Define um usuário anônimo para demonstração
     * @returns {Promise<boolean>} - Promise que resolve com o sucesso da ativação
     */
    async activateDemoMode() {
        const anonymousUser = {
            id: 'guest',
            name: 'Convidado',
            email: 'convidado@exemplo.com',
            isAnonymous: true,
            createdAt: new Date().toISOString()
        };
        
        this.storageManager.setUser(anonymousUser);
        this.currentUser = anonymousUser;
        
        // Carregar dados de demonstração
        await this.storageManager.loadDemoData();
        
        return true;
    }

    /**
     * Define um usuário anônimo padrão
     * @returns {Object} - Usuário anônimo
    */
    setAnonymousUser() {
        const anonymousUser = {
            id: 'guest',
            name: 'Convidado',
            email: 'convidado@exemplo.com',
            isAnonymous: true,
            createdAt: new Date().toISOString()
        };
        
        this.storageManager.setUser(anonymousUser);
        this.currentUser = anonymousUser;
        
        return anonymousUser;
    }
    
    /**
     * Verifica o estado de autenticação atual
     * @returns {Promise<boolean>} - Promise que resolve com o status de autenticação
     */
    async checkAuthentication() {
        // Recarregar usuário do armazenamento (localStorage ou sessionStorage)
        this.loadUserFromSession();
        
        // Verificar se o token está expirado (em caso de implementação com JWT)
        if (this.currentUser && this.isTokenExpired()) {
            this.logout();
            return false;
        }
        
        return this.isAuthenticated();
    }
    
    /**
     * Verifica se o token está expirado
     * @returns {boolean} - Se o token está expirado
     */
    isTokenExpired() {
        // Simulação - Em uma implementação real, verificaria a expiração do JWT
        return false;
    }
    
    /**
     * Atualiza dados do usuário
     * @param {Object} userData - Novos dados do usuário
     * @returns {Promise<Object>} - Promise que resolve com os dados atualizados
     */
    async updateUserData(userData) {
        if (!this.isAuthenticated()) {
            throw new Error('Usuário não autenticado');
        }
        
        // Sanitizar entradas
        if (userData.name) {
            userData.name = this.sanitizeInput(userData.name);
        }
        
        try {
            // Em uma aplicação real, enviaríamos a solicitação para uma API
            // Por enquanto, apenas simulamos atualização local
            
            // Atualizar usuário na lista local
            const users = this.getLocalUsers();
            const userIndex = users.findIndex(u => u.id === this.currentUser.id);
            
            if (userIndex === -1) {
                throw new Error('Usuário não encontrado');
            }
            
            // Mesclar dados atuais com novos dados
            const updatedUser = {
                ...users[userIndex],
                ...userData,
                updatedAt: new Date().toISOString()
            };
            
            // Se a senha foi alterada, atualizar hash
            if (userData.password) {
                updatedUser.passwordHash = this.hashPassword(userData.password);
            }
            
            // Atualizar na lista
            users[userIndex] = updatedUser;
            this.saveLocalUsers(users);
            
            // Criar cópia do usuário sem a senha
            const userWithoutPassword = { ...updatedUser };
            delete userWithoutPassword.passwordHash;
            
            // Atualizar usuário na sessão
            this.storageManager.setUser(userWithoutPassword);
            this.currentUser = userWithoutPassword;
            
            return userWithoutPassword;
        } catch (error) {
            console.error('Erro ao atualizar dados do usuário:', error);
            throw error;
        }
    }
    
    /**
     * Recupera a lista de usuários local
     * @returns {Array} - Lista de usuários
     */
    getLocalUsers() {
        try {
            return JSON.parse(localStorage.getItem('fincontrol_users') || '[]');
        } catch (error) {
            console.error('Erro ao recuperar usuários locais:', error);
            return [];
        }
    }
    
    /**
     * Salva a lista de usuários local
     * @param {Array} users - Lista de usuários
     */
    saveLocalUsers(users) {
        try {
            localStorage.setItem('fincontrol_users', JSON.stringify(users));
        } catch (error) {
            console.error('Erro ao salvar usuários locais:', error);
        }
    }
    
    /**
     * Gera um hash simples para a senha
     * @param {string} password - Senha em texto plano
     * @returns {string} - Hash da senha
     * 
     * IMPORTANTE: Em produção, use uma função de hash robusta como bcrypt
     * Esta é apenas uma implementação simplificada para demonstração
     */
    hashPassword(password) {
        // Simulação simples de hash
        // Em produção, use uma função de hash robusta!
        return btoa(`${password}:${navigator.userAgent}`);
    }
    
    /**
     * Verifica se a senha corresponde ao hash
     * @param {string} password - Senha em texto plano
     * @param {string} hash - Hash armazenado
     * @returns {boolean} - Resultado da verificação
     */
    verifyPassword(password, hash) {
        return this.hashPassword(password) === hash;
    }
    
    /**
     * Sanitiza entrada de texto
     * @param {string} input - Texto a ser sanitizado
     * @returns {string} - Texto sanitizado
     */
    sanitizeInput(input) {
        if (typeof input !== 'string') {
            return '';
        }
        
        // Remover tags HTML e scripts
        return input
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<[^>]*>/g, '')
            .trim();
    }
    
    /**
     * Valida os dados do usuário
     * @param {Object} userData - Dados do usuário
     * @throws {Error} - Erro se os dados forem inválidos
     */
    validateUserData(userData) {
        // Verificar campos obrigatórios
        if (!userData.name || !userData.email || !userData.password) {
            throw new Error('Todos os campos são obrigatórios');
        }
        
        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userData.email)) {
            throw new Error('Email inválido');
        }
        
        // Validar força da senha
        if (userData.password.length < 6) {
            throw new Error('A senha deve ter pelo menos 6 caracteres');
        }
        
        // Validar nome
        if (userData.name.length < 2) {
            throw new Error('O nome deve ter pelo menos 2 caracteres');
        }
    }
}

// Exportar uma instância singleton
export const authManager = new AuthManager();