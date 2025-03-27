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
  if ('serviceWorker' in navigator && config.serviceWorker.enabled) {
    window.addEventListener('load', async () => {
      try {  
        // Registrar o Service Worker
        const registration = await navigator.serviceWorker.register(config.serviceWorker.registrationPath);
        console.log('Service Worker registrado com sucesso', registration);

        // Armazena o registro para uso posterior
        window.serviceWorkerRegistration = registration;
        
        // Criar backup no IndexedDB para acesso pelo Service Worker
        setupBackupToIndexedDB();
        
        // Configurar comunicação com o Service Worker
        setupServiceWorkerCommunication();
        
      } catch (error) {
        console.error('Erro ao registrar Service Worker:', error);
      }
    });
  } else {
    console.warn('Service Worker não suportados neste navegador');
    updateServiceWorkerStatus(false, 'Service Worker não suportado');
  }
}

/**
 * Function to update service worker status in the UI
 */
function updateServiceWorkerStatus(isRegistered, errorMessage) {
  const statusElement = document.getElementById('sw-status');
  if (!statusElement) return;
  
  if (isRegistered) {
    statusElement.className = 'notification-status granted';
    statusElement.innerHTML = '<i class="fas fa-check-circle"></i> Service Worker ativo';
  } else {
    statusElement.className = 'notification-status denied';
    statusElement.innerHTML = `<i class="fas fa-times-circle"></i> Service Worker inativo: ${errorMessage || 'Erro desconhecido'}`;
  }
}

/**
 * Function to update notification status in the UI
 */
function updateNotificationStatus() {
  const statusElement = document.getElementById('notification-status');
  if (!statusElement) return;
  
  if (!('Notification' in window)) {
    statusElement.className = 'notification-status denied';
    statusElement.innerHTML = '<i class="fas fa-times-circle"></i> Este navegador não suporta notificações';
    return;
  }
  
  switch (Notification.permission) {
    case 'granted':
      statusElement.className = 'notification-status granted';
      statusElement.innerHTML = '<i class="fas fa-check-circle"></i> Notificações ativadas';
      break;
    case 'denied':
      statusElement.className = 'notification-status denied';
      statusElement.innerHTML = '<i class="fas fa-times-circle"></i> Notificações bloqueadas';
      showPermissionInstructions();
      break;
    default:
      statusElement.className = 'notification-status pending';
      statusElement.innerHTML = '<i class="fas fa-bell"></i> Notificações não configuradas';
  }
}

/**
 * Function to show instructions for resetting permissions
 */
function showPermissionInstructions() {
  // Remove existing instructions if any
  const existingInstructions = document.getElementById('permission-instructions');
  if (existingInstructions) {
    existingInstructions.remove();
  }
  
  const messageEl = document.createElement('div');
  messageEl.id = 'permission-instructions';
  messageEl.className = 'notification-status info';
  messageEl.innerHTML = `
    <i class="fas fa-info-circle"></i> Para reativar as notificações, você precisa:
    <ol>
      <li>Clicar no ícone de cadeado na barra de endereço</li>
      <li>Encontrar "Notificações" nas permissões do site</li>
      <li>Alterar de "Bloqueado" para "Perguntar" ou "Permitir"</li>
      <li>Recarregar a página</li>
    </ol>
  `;
  
  // Add to settings page
  const container = document.querySelector('.form-group:has(#enable-notifications-btn)');
  if (container && Notification.permission === 'denied') {
    container.appendChild(messageEl);
  }
}

/**
 * Initialize notification-related UI
 */
function initNotificationUI() {
  // Update initial status
  updateNotificationStatus();
  
  // Add event listener to the enable notifications button
  const enableBtn = document.getElementById('enable-notifications-btn');
  if (enableBtn) {
    enableBtn.addEventListener('click', async () => {
      const permissionGranted = await requestNotificationPermission();
      
      if (permissionGranted) {
        showNotification('Notificações ativadas com sucesso!', 'success');
        
        // Update UI to show permissions are enabled
        updateNotificationStatus();
        
        // Update settings
        const settings = persistenceAPI.getSettings() || {};
        settings.browserNotification = true;
        persistenceAPI.saveSettings(settings);
      } else {
        // Show status that indicates permissions are denied
        updateNotificationStatus();
      }
    });
  }
  
  // Add event listener to the test notification button
  const testBtn = document.getElementById('test-notification-btn');
  if (testBtn) {
    testBtn.addEventListener('click', () => {
      const result = notificationManager.sendTestNotification();
      
      const status = document.getElementById('test-notification-status');
      if (status) {
        if (result) {
          status.className = 'notification-status granted';
          status.innerHTML = '<i class="fas fa-check-circle"></i> Notificação enviada com sucesso!';
        } else {
          status.className = 'notification-status denied';
          status.innerHTML = '<i class="fas fa-times-circle"></i> Falha ao enviar notificação. Verifique as permissões.';
        }
        
        // Clear the status after 5 seconds
        setTimeout(() => {
          status.innerHTML = '';
          status.className = 'notification-status';
        }, 5000);
      }
    });
  }
}

/**
 * Returns a Promise that resolves to boolean indicating if permission is granted
 */
function requestNotificationPermission() {
  // Only proceed if Notification API is available
  if (!('Notification' in window)) {
    console.warn('Este navegador não suporta notificações desktop');
    return Promise.resolve(false);
  }
  
  // If already granted, return true
  if (Notification.permission === 'granted') {
    return Promise.resolve(true);
  }
  
  // If already denied, return false
  if (Notification.permission === 'denied') {
    console.warn('Notificações foram bloqueadas pelo usuário');
    return Promise.resolve(false);
  }
  
  // Otherwise, request permission (this must be triggered by user interaction)
  return Notification.requestPermission().then(permission => {
    return permission === 'granted';
  });
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
    
    // Initialize notification UI
    initNotificationUI();

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
 * Check and notify about reminders
 */
function checkAndNotify() {
  if (Notification.permission !== 'granted') return;
  
  console.log("Verificando lembretes para notificações...");
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Check today's appointments
  const appointments = persistenceAPI.getCollection('appointments');
  const todayAppointments = appointments.filter(a => 
    a.date === today.toISOString().split('T')[0]
  );
  
  if (todayAppointments.length > 0) {
    notificationManager.sendNotification('Compromissos hoje', {
      body: `Você tem ${todayAppointments.length} compromisso(s) agendado(s) para hoje`,
      tag: 'appointments-today'
    });
  }
  
  // Check upcoming bills
  const bills = persistenceAPI.getCollection('bills');
  const settings = persistenceAPI.getSettings() || {};
  const advanceDays = settings.advanceDays || 3;
  
  // Filter pending bills due in the next X days
  const pendingBills = bills.filter(bill => {
    if (bill.status !== 'pending') return false;
    
    const dueDate = new Date(bill.dueDate);
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays >= 0 && diffDays <= advanceDays;
  });
  
  if (pendingBills.length > 0) {
    // Calculate total amount
    const totalAmount = pendingBills.reduce((sum, bill) => sum + bill.amount, 0);
    
    notificationManager.sendNotification()('Contas próximas do vencimento', {
      body: `Você tem ${pendingBills.length} conta(s) para pagar nos próximos dias (R$ ${totalAmount.toFixed(2)})`,
      tag: 'bills-due-soon'
    });
  }
  
  console.log("Verificação de lembretes concluída.");
}

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