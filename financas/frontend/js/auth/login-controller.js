// /frontend/js/auth/login-controller.js
// Controlador da página de login

import { AuthManager } from './auth-manager.js';
import { StorageManager } from '../storage/storage-manager.js';

/**
 * Classe responsável por controlar a página de login
 */
class LoginController {
    constructor() {
        this.storageManager = new StorageManager();
        this.authManager = new AuthManager(this.storageManager);
        
        this.initElements();
        this.setupEventListeners();
    }
    
    /**
     * Inicializa referências para elementos do DOM
     */
    initElements() {
        this.loginForm = document.getElementById('loginForm');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.rememberMeCheckbox = document.getElementById('rememberMe');
        this.errorMessage = document.getElementById('loginError');
        this.demoAccountBtn = document.getElementById('demoAccountBtn');
    }
    
    /**
     * Configura listeners de eventos
     */
    setupEventListeners() {
        // Formulário de login
        this.loginForm.addEventListener('submit', this.handleLoginSubmit.bind(this));
        
        // Botão de conta demo
        this.demoAccountBtn.addEventListener('click', this.handleDemoAccount.bind(this));
        
        // Verificar se há credenciais salvas
        this.checkSavedCredentials();
    }
    
    /**
     * Manipula o envio do formulário de login
     * @param {Event} event - Evento de envio do formulário
     */
    async handleLoginSubmit(event) {
        event.preventDefault();
        
        // Limpar mensagem de erro anterior
        this.hideError();
        
        // Obter valores do formulário
        const email = this.emailInput.value.trim();
        const password = this.passwordInput.value;
        const rememberMe = this.rememberMeCheckbox.checked;
        
        try {
            // Validar campos
            if (!email || !password) {
                throw new Error('Por favor, preencha todos os campos.');
            }
            
            // Tentar fazer login
            const user = await this.authManager.login(email, password);
            
            // Salvar credenciais se a opção estiver marcada
            if (rememberMe) {
                this.saveCredentials(email, password);
            } else {
                this.clearSavedCredentials();
            }
            
            // Redirecionar para a página principal
            this.redirectToDashboard();
        } catch (error) {
            // Exibir mensagem de erro
            this.showError(error.message || 'Erro ao fazer login. Por favor, tente novamente.');
        }
    }
    
    /**
     * Manipula o clique no botão de conta demo
     */
    handleDemoAccount() {
        // Criar usuário anônimo/demo
        this.authManager.setAnonymousUser();
        
        // Redirecionar para a página principal
        this.redirectToDashboard();
    }
    
    /**
     * Exibe mensagem de erro
     * @param {string} message - Mensagem de erro
     */
    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.classList.remove('hidden');
    }
    
    /**
     * Oculta mensagem de erro
     */
    hideError() {
        this.errorMessage.textContent = '';
        this.errorMessage.classList.add('hidden');
    }
    
    /**
     * Salva credenciais para "lembrar de mim"
     * @param {string} email - Email do usuário
     * @param {string} password - Senha do usuário
     */
    saveCredentials(email, password) {
        // Usar localStorage para persistir entre sessões
        // Em uma aplicação real, não armazenar senha diretamente
        // Considerar usar um token de sessão ou outro mecanismo mais seguro
        const credentials = {
            email,
            password: btoa(password) // Codificação básica, não segura
        };
        localStorage.setItem('saved_credentials', JSON.stringify(credentials));
    }
    
    /**
     * Limpa credenciais salvas
     */
    clearSavedCredentials() {
        localStorage.removeItem('saved_credentials');
    }
    
    /**
     * Verifica se há credenciais salvas e preenche o formulário
     */
    checkSavedCredentials() {
        const savedCredentials = localStorage.getItem('saved_credentials');
        if (savedCredentials) {
            try {
                const { email, password } = JSON.parse(savedCredentials);
                this.emailInput.value = email;
                this.passwordInput.value = atob(password); // Decodificação básica
                this.rememberMeCheckbox.checked = true;
            } catch (error) {
                console.error('Erro ao recuperar credenciais salvas:', error);
                this.clearSavedCredentials();
            }
        }
    }
    
    /**
     * Redireciona para a página principal (dashboard)
     */
    redirectToDashboard() {
        window.location.href = '../index.html';
    }
}

// Inicializar controlador quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    new LoginController();
});
