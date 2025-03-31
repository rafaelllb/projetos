// /frontend/js/auth/register-controller.js
// Controlador da página de registro

import { AuthManager } from './auth-manager.js';
import { StorageManager } from '../storage/storage-manager.js';

/**
 * Classe responsável por controlar a página de registro
 */
class RegisterController {
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
        this.registerForm = document.getElementById('registerForm');
        this.nameInput = document.getElementById('name');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.confirmPasswordInput = document.getElementById('confirmPassword');
        this.termsAgreeCheckbox = document.getElementById('termsAgree');
        this.errorMessage = document.getElementById('registerError');
        this.demoAccountBtn = document.getElementById('demoAccountBtn');
        this.passwordStrength = document.getElementById('passwordStrength');
        this.strengthFill = this.passwordStrength.querySelector('.strength-fill');
        this.strengthText = this.passwordStrength.querySelector('.strength-text span');
    }
    
    /**
     * Configura listeners de eventos
     */
    setupEventListeners() {
        // Formulário de registro
        this.registerForm.addEventListener('submit', this.handleRegisterSubmit.bind(this));
        
        // Botão de conta demo
        this.demoAccountBtn.addEventListener('click', this.handleDemoAccount.bind(this));
        
        // Validação de força de senha
        this.passwordInput.addEventListener('input', this.checkPasswordStrength.bind(this));
        
        // Validação de confirmação de senha
        this.confirmPasswordInput.addEventListener('input', this.checkPasswordMatch.bind(this));
    }
    
    /**
     * Manipula o envio do formulário de registro
     * @param {Event} event - Evento de envio do formulário
     */
    async handleRegisterSubmit(event) {
        event.preventDefault();
        
        // Limpar mensagem de erro anterior
        this.hideError();
        
        // Obter valores do formulário
        const name = this.nameInput.value.trim();
        const email = this.emailInput.value.trim();
        const password = this.passwordInput.value;
        const confirmPassword = this.confirmPasswordInput.value;
        const termsAgree = this.termsAgreeCheckbox.checked;
        
        try {
            // Validar campos
            if (!name || !email || !password || !confirmPassword) {
                throw new Error('Por favor, preencha todos os campos.');
            }
            
            // Validar força da senha
            const strengthScore = this.calculatePasswordStrength(password);
            if (strengthScore < 30) {
                throw new Error('A senha é muito fraca. Por favor, escolha uma senha mais segura.');
            }
            
            // Validar confirmação de senha
            if (password !== confirmPassword) {
                throw new Error('As senhas não coincidem.');
            }
            
            // Validar aceitação dos termos
            if (!termsAgree) {
                throw new Error('Você precisa aceitar os Termos de Serviço e Política de Privacidade.');
            }
            
            // Tentar registrar usuário
            const userData = {
                name,
                email,
                password
            };
            
            await this.authManager.register(userData);
            
            // Redirecionar para a página principal
            this.redirectToDashboard();
        } catch (error) {
            // Exibir mensagem de erro
            this.showError(error.message || 'Erro ao criar conta. Por favor, tente novamente.');
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
     * Verifica e atualiza o indicador de força da senha
     */
    checkPasswordStrength() {
        const password = this.passwordInput.value;
        const score = this.calculatePasswordStrength(password);
        
        // Atualizar barra de força
        this.strengthFill.style.width = `${score}%`;
        
        // Atualizar classe e texto baseado na pontuação
        if (score < 30) {
            this.strengthFill.className = 'strength-fill';
            this.strengthText.textContent = 'Fraca';
        } else if (score < 70) {
            this.strengthFill.className = 'strength-fill medium';
            this.strengthText.textContent = 'Média';
        } else {
            this.strengthFill.className = 'strength-fill strong';
            this.strengthText.textContent = 'Forte';
        }
    }
    
    /**
     * Calcula a pontuação de força da senha
     * @param {string} password - Senha a ser avaliada
     * @returns {number} - Pontuação de 0 a 100
     */
    calculatePasswordStrength(password) {
        if (!password) {
            return 0;
        }
        
        let score = 0;
        
        // Comprimento básico
        score += Math.min(password.length * 4, 40);
        
        // Caracteres especiais
        if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            score += 20;
        }
        
        // Números
        if (/\d/.test(password)) {
            score += 10;
        }
        
        // Letras maiúsculas e minúsculas
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
            score += 20;
        }
        
        // Limitar a 100
        return Math.min(score, 100);
    }
    
    /**
     * Verifica se as senhas coincidem
     */
    checkPasswordMatch() {
        const password = this.passwordInput.value;
        const confirmPassword = this.confirmPasswordInput.value;
        
        if (confirmPassword && password !== confirmPassword) {
            this.confirmPasswordInput.setCustomValidity('As senhas não coincidem');
        } else {
            this.confirmPasswordInput.setCustomValidity('');
        }
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
     * Redireciona para a página principal (dashboard)
     */
    redirectToDashboard() {
        window.location.href = '../index.html';
    }
}

// Inicializar controlador quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    new RegisterController();
});
