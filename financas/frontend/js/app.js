// /frontend/js/app.js
// Módulo principal da aplicação

import { StorageManager } from './storage/storage-manager.js';
import { AuthManager } from './auth/auth-manager.js';
import { UIManager } from './ui/ui-manager.js';
import { TransactionManager } from './transactions/transaction-manager.js';
import { DashboardManager } from './dashboard/dashboard-manager.js';

/**
 * Classe principal da aplicação
 */
class FinControlApp {
    constructor() {
        this.storageManager = new StorageManager();
        this.authManager = new AuthManager(this.storageManager);
        this.uiManager = new UIManager();
        this.transactionManager = new TransactionManager(this.storageManager);
        this.dashboardManager = new DashboardManager(this.transactionManager);
        
        this.init();
    }
    
    /**
     * Inicializa a aplicação
     */
    async init() {
        // Verificar estado de autenticação
        this.checkAuth();
        
        // Inicializar gerenciadores
        this.uiManager.init();
        
        // Configurar listeners de eventos
        this.setupEventListeners();
        
        // Carregar dados iniciais
        await this.loadInitialData();
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
        document.getElementById('userInfo').querySelector('span').textContent = 
            isAuthenticated ? this.authManager.getCurrentUser().name : 'Convidado';
    }
    
    /**
     * Configura os listeners de eventos
     */
    setupEventListeners() {
        // Navegação principal
        document.querySelectorAll('.main-nav a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.uiManager.navigateTo(link.dataset.page);
            });
        });
        
        // Menu do usuário
        const userInfo = document.getElementById('userInfo');
        const userDropdown = document.getElementById('userDropdown');
        
        userInfo.addEventListener('click', () => {
            userDropdown.classList.toggle('hidden');
        });
        
        // Fechar dropdown ao clicar fora dele
        document.addEventListener('click', (e) => {
            if (!userInfo.contains(e.target) && !userDropdown.contains(e.target)) {
                userDropdown.classList.add('hidden');
            }
        });
        
        // Logout
        document.getElementById('logoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.authManager.logout();
            window.location.reload();
        });
        
        // Adicionar nova transação
        document.getElementById('addTransactionBtn')?.addEventListener('click', () => {
            this.uiManager.openModal('addTransactionModal');
        });
        
        // Fechar modais
        document.querySelectorAll('.close-modal').forEach(button => {
            button.addEventListener('click', () => {
                this.uiManager.closeAllModals();
            });
        });
        
        // Formulário de transação
        document.getElementById('transactionForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleTransactionFormSubmit();
        });
    }
    
    /**
     * Carrega os dados iniciais da aplicação
     */
    async loadInitialData() {
        // Carregar categorias
        const categories = this.storageManager.getCategories();
        if (!categories || categories.length === 0) {
            // Carregar categorias padrão se não existirem
            this.storageManager.setCategories(this.getDefaultCategories());
        }
        
        // Preencher select de categorias
        this.populateCategorySelect();
        
        // Carregar transações
        await this.loadTransactions();
        
        // Atualizar dashboard
        this.updateDashboard();
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
     * Carrega as transações
     */
    async loadTransactions() {
        const transactions = this.transactionManager.getTransactions();
        const recentTransactionsList = document.getElementById('recentTransactionsList');
        
        if (!recentTransactionsList) return;
        
        if (transactions.length === 0) {
            // Mostrar estado vazio
            recentTransactionsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-receipt"></i>
                    <p>Nenhuma transação registrada</p>
                    <button class="btn btn-primary" id="addTransactionBtn">Adicionar Transação</button>
                </div>
            `;
            
            // Adicionar evento ao botão
            document.getElementById('addTransactionBtn')?.addEventListener('click', () => {
                this.uiManager.openModal('addTransactionModal');
            });
            
            return;
        }
        
        // Ordenar transações por data (mais recentes primeiro)
        const sortedTransactions = [...transactions].sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );
        
        // Pegar apenas as 5 transações mais recentes
        const recentTransactions = sortedTransactions.slice(0, 5);
        
        // Limpar lista
        recentTransactionsList.innerHTML = '';
        
        // Adicionar transações
        recentTransactions.forEach(transaction => {
            const categories = this.storageManager.getCategories();
            const category = categories[transaction.type].find(c => c.id === transaction.category);
            
            const transactionItem = document.createElement('div');
            transactionItem.className = 'transaction-item';
            transactionItem.innerHTML = `
                <div class="transaction-icon ${transaction.type}">
                    <i class="fas ${category?.icon || 'fa-money-bill'}"></i>
                </div>
                <div class="transaction-details">
                    <div class="transaction-description">${transaction.description}</div>
                    <div class="transaction-category">${category?.name || 'Sem categoria'}</div>
                </div>
                <div class="transaction-amount ${transaction.type}">
                    ${transaction.type === 'income' ? '+' : '-'} R$ ${transaction.amount.toFixed(2)}
                </div>
                <div class="transaction-date">
                    ${new Date(transaction.date).toLocaleDateString('pt-BR')}
                </div>
            `;
            
            recentTransactionsList.appendChild(transactionItem);
        });
    }
    
    /**
     * Atualiza os dados do dashboard
     */
    updateDashboard() {
        this.dashboardManager.updateSummary();
        this.dashboardManager.updateExpensesByCategoryChart();
        this.dashboardManager.updateCashFlowChart();
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
        
        // Validar dados
        if (!description || !amount || !category || !date) {
            alert('Por favor, preencha todos os campos.');
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
            createdAt: new Date().toISOString()
        };
        
        // Adicionar transação
        this.transactionManager.addTransaction(transaction);
        
        // Recarregar transações e atualizar dashboard
        this.loadTransactions();
        this.updateDashboard();
        
        // Fechar modal
        this.uiManager.closeAllModals();
        
        // Resetar formulário
        document.getElementById('transactionForm').reset();
    }
}

// Inicializar aplicação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', async () => {
    const app = new FinControlApp();
    await app.init();
    window.app = app;
});

// Exportar classe para uso em outros módulos
export default FinControlApp;
