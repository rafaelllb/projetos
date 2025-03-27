/**
 * Main script for the Reminder System
 * Coordinates the modules and initializes the application
 */
import config, { configHelper } from './config.js';
import persistenceAPI from './api-module.js';
import { BillsManager } from './bills-module.js';
import { AppointmentsManager } from './appointments-module.js';
import { DashboardManager } from './dashboard-module.js';
import { UIManager } from './ui-module.js';
import { AuthManager } from './auth-module.js';
import { AdsManager, adsStyles } from './ads-module.js';
import themeManager from './theme-module.js';
import createSearchManager from './search-module.js';
import createNotificationManager from './notification-module.js';

// Global instance
window.persistenceAPI = persistenceAPI;

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Registrar Service Worker durante a inicialização da aplicação
function registerServiceWorker() {
  if ('serviceWorker' in navigator && 'Notification' in window && config.serviceWorker.enabled) {
    window.addEventListener('load', async () => {
      try {
        // Solicitar permissão para notificações
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            console.log('Permissão para notificações negada pelo usuário');
            return;
          }
        }
        
        // Registrar o Service Worker
        const registration = await navigator.serviceWorker.register(config.serviceWorker.registrationPath);
        console.log('Service Worker registrado com sucesso', registration);
        
        // Criar backup no IndexedDB para acesso pelo Service Worker
        setupBackupToIndexedDB();
        
        // Configurar comunicação com o Service Worker
        setupServiceWorkerCommunication();
        
      } catch (error) {
        console.error('Erro ao registrar Service Worker:', error);
      }
    });
  } else {
    console.warn('Service Worker ou API de Notificações não suportados neste navegador');
  }
}

// Configurar backup periódico dos dados para IndexedDB
function setupBackupToIndexedDB() {
  // Backup inicial
  backupToIndexedDB();
  
  // Configurar backup periódico (intervalo configurável)
  setInterval(() => {
    backupToIndexedDB();
  }, config.serviceWorker.backupInterval);
  
  // Adicionar backup quando os dados forem alterados
  window.persistenceAPI.addListener('dataChange', () => {
    backupToIndexedDB();
  });
}

// Fazer backup dos dados do localStorage para IndexedDB
function backupToIndexedDB() {
  try {
    const storageKey = config.app.storageKey;
    const data = JSON.parse(localStorage.getItem(storageKey));
    
    if (!data) return;
    
    const request = indexedDB.open(
      config.serviceWorker.indexedDBName, 
      config.serviceWorker.indexedDBVersion
    );
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(config.serviceWorker.indexedDBStore)) {
        db.createObjectStore(config.serviceWorker.indexedDBStore, { keyPath: 'id' });
      }
    };
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction([config.serviceWorker.indexedDBStore], 'readwrite');
      const objectStore = transaction.objectStore(config.serviceWorker.indexedDBStore);
      
      // Armazenar dados com id para identificação
      objectStore.put({
        id: storageKey,
        ...data,
        timestamp: new Date().toISOString()
      });
      
      console.log('Dados de lembretes foram copiados para IndexedDB');
    };
    
    request.onerror = (event) => {
      console.error('Erro ao abrir IndexedDB para backup:', event.target.error);
    };
    
  } catch (error) {
    console.error('Erro ao fazer backup para IndexedDB:', error);
  }
}

// Configurar comunicação com o Service Worker
function setupServiceWorkerCommunication() {
  // Ouvir pedidos de dados do Service Worker
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'get-storage-data') {
      const key = event.data.key;
      let data = null;
      
      try {
        data = JSON.parse(localStorage.getItem(key));
      } catch (error) {
        console.error('Erro ao ler localStorage:', error);
      }
      
      // Enviar dados de volta para o Service Worker
      event.source.postMessage({
        type: 'storage-data',
        data: data
      });
    }
  });
}

// Main initialization function
async function initializeApp() {
  console.log(`Inicializando sistema de lembretes v${config.app.version}...`);
  
  try {
    // Inicializar tema primeiro
    themeManager.initializeTheme();
    
    // Always initialize modules first - app should work without login
    initializeModules();
    
    // Register Service Worker for background notifications
    registerServiceWorker();
    
    // Then initialize auth module to handle optional login
    const authManager = new AuthManager(persistenceAPI);
    window.authManager = authManager;
    
    // Initialize authentication and handle auth state
    authManager.initializeAuth();

    // Initialize ads manager
    const adsManager = new AdsManager(persistenceAPI);
    window.adsManager = adsManager;

    // Inicializar gerenciador de notificações
    const notificationManager = createNotificationManager(persistenceAPI);
    await notificationManager.initialize();
    window.notificationManager = notificationManager;
    
    // Listen for Firebase errors and handle gracefully
    window.addEventListener('error', (event) => {
      // Check if error is related to Firebase
      if (event.message && (
          event.message.includes('firebase') || 
          event.message.includes('firestore') || 
          event.message.includes('auth'))) {
        console.warn('Firebase error encountered - app will continue in local-only mode:', event.message);
        // Don't prevent default to allow error to be logged
      }
    });

    // Adicionar estilos de anúncios
    addAdsStyles();

    // Criar containers de anúncios após carregar a UI
    setTimeout(() => {
      adsManager.createAdContainers();
      adsManager.initializeAdNetwork();
    }, 1000);
    
    console.log('Application initialized successfully');
  } catch (error) {
    console.error('Error during application initialization:', error);
    // Continue with app in localStorage-only mode
    showErrorNotification();
  }
}

// Função para adicionar estilos CSS de anúncios
function addAdsStyles() {
  const styleElement = document.createElement('style');
  styleElement.textContent = adsStyles;
  document.head.appendChild(styleElement);
}

function checkRemindersNow() {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'check-reminders-now'
    });
  }
}

// Atalho global para verificação manual
window.checkRemindersNow = checkRemindersNow;

// Show error notification when Firebase fails to load
function showErrorNotification() {
  const notification = document.createElement('div');
  notification.className = 'notification info';
  notification.innerHTML = `
    <div class="notification-content">
      <i class="fas fa-info-circle"></i>
      <div class="notification-message">
        Aplicativo rodando no modo offline (somente armazenamento local).
      </div>
      <button class="notification-close"><i class="fas fa-times"></i></button>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  notification.querySelector('.notification-close').addEventListener('click', () => {
    notification.classList.add('fade-out');
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, config.ui.animations.fadeOutDuration);
  });
  
  setTimeout(() => {
    if (document.body.contains(notification)) {
      notification.classList.add('fade-out');
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, config.ui.animations.fadeOutDuration);
    }
  }, config.notifications.notificationDuration);
}

// Initialize application modules
function initializeModules() {
  console.log('Loading application modules...');
  
  try {
    // Create dashboard manager first (needed by other modules)
    const dashboardManager = new DashboardManager(persistenceAPI);
    window.dashboardManager = dashboardManager;
    
    // Create other managers
    const billsManager = new BillsManager(persistenceAPI, dashboardManager);
    window.billsManager = billsManager;
    
    const appointmentsManager = new AppointmentsManager(persistenceAPI, dashboardManager);
    window.appointmentsManager = appointmentsManager;
    
    const uiManager = new UIManager(persistenceAPI);
    window.uiManager = uiManager;

    const searchManager = createSearchManager(persistenceAPI);
    window.searchManager = searchManager;
    
    // Set up notifications
    if (uiManager.setupNotifications) {
      uiManager.setupNotifications();
    }
    
    // Render the views
    billsManager.renderBills();
    appointmentsManager.renderAppointments();
    dashboardManager.updateDashboard();

    // Handler para o botão de teste:
    document.getElementById('test-notification-btn')?.addEventListener('click', () => {
      const status = document.getElementById('notification-status');
      const result = window.notificationManager.sendTestNotification();
      
      if (result) {
        status.className = 'notification-status granted';
        status.innerHTML = '<i class="fas fa-check-circle"></i> Notificação enviada com sucesso!';
      } else {
        status.className = 'notification-status denied';
        status.innerHTML = '<i class="fas fa-times-circle"></i> Falha ao enviar notificação. Verifique as permissões.';
      }
      
      // Limpar a mensagem após 5 segundos
      setTimeout(() => {
        status.innerHTML = '';
        status.className = 'notification-status';
      }, 5000);
    });
    
    console.log('Application modules loaded successfully');
  } catch (error) {
    console.error('Error loading modules:', error);
  }
}

// Expor função global para verificar notificações
window.checkRemindersNow = function() {
  if (window.notificationManager) {
    window.notificationManager.checkAndNotify();
    return "Verificação de lembretes iniciada. Verifique o console para mais detalhes.";
  }
  return "Gerenciador de notificações não inicializado.";
};

/**
 * Função para carregar configurações personalizadas
 * Permite sobrescrever valores padrão sem modificar o arquivo de configuração
 */
function loadCustomConfig() {
  try {
    // Tentar carregar configurações customizadas do localStorage
    const customConfigStr = localStorage.getItem('lembremeCustonConfig');
    if (customConfigStr) {
      const customConfig = JSON.parse(customConfigStr);
      configHelper.merge(customConfig);
      console.log('Configurações personalizadas carregadas');
    }
  } catch (error) {
    console.error('Erro ao carregar configurações personalizadas:', error);
  }
}

// Carregar configurações personalizadas no início
loadCustomConfig();