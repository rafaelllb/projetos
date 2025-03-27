/**
 * Módulo para gerenciar notificações
 * Permite enviar notificações mesmo com a aplicação fechada
 */
export class NotificationManager {
  constructor(persistenceAPI) {
    this.persistenceAPI = persistenceAPI;
    this.hasPermission = false;
    this.serviceWorkerRegistration = null;
    this.notificationSettings = {
      advanceDays: 1,
      browserNotification: true
    };
    
    // Adicionar badge de notificações na interface
    this.notificationBadge = this.createNotificationBadge();
    this.pendingNotificationsCount = 0;
  }
  
  /**
   * Inicializa o gerenciador de notificações
   */
  async initialize() {
    console.log("Inicializando gerenciador de notificações...");

    // Verificar se estamos em um contexto seguro (HTTPS)
    if (!window.isSecureContext) {
      console.warn('Notificações exigem um contexto seguro (HTTPS)');
      this.showSecurityWarningMessage();
      return false;
    }
    
    // Carregar configurações
    const settings = this.persistenceAPI.getSettings();
    if (settings) {
      this.notificationSettings = {
        advanceDays: settings.advanceDays || 1,
        browserNotification: settings.browserNotification !== false
      };
    }
    
    // Verificar suporte para notificações
    if (!('Notification' in window)) {
      console.warn('Este navegador não suporta notificações desktop');
      return false;
    }
    
    // Verificar permissão existente
    if (Notification.permission === 'granted') {
      this.hasPermission = true;
      this.showPermissionGrantedMessage();
    } else if (Notification.permission !== 'denied') {
      // Adicionar botão para solicitar permissão na interface
      this.addRequestPermissionButton();
    } else {
      this.showPermissionDeniedMessage();
    }
    
    // Verificar Service Worker
    if ('serviceWorker' in navigator) {
      try {
        // Tentar obter o registro atual
        this.serviceWorkerRegistration = await navigator.serviceWorker.getRegistration();
        
        if (this.serviceWorkerRegistration) {
          console.log("Service Worker encontrado e registrado para notificações");
          
          // Adicionar listener para mudanças de dados
          this.persistenceAPI.addListener('dataChange', () => {
            this.syncWithServiceWorker();
          });
          
          // Configurar verificação periódica
          this.setupPeriodicCheck();
          
          // Verificar notificações imediatamente
          this.checkAndNotify();
          
          return this.hasPermission;
        } else {
          console.warn("Service Worker não encontrado");
        }
      } catch (error) {
        console.error('Erro ao obter registro do Service Worker:', error);
      }
    }
    
    return this.hasPermission;
  }

  /**
 * Exibe mensagem de aviso sobre contexto não seguro
 */
showSecurityWarningMessage() {
  const messageEl = document.createElement('div');
  messageEl.className = 'notification-status denied';
  messageEl.innerHTML = `
    <i class="fas fa-lock"></i> As notificações requerem conexão HTTPS segura
  `;
  
  // Adicionar à página de configurações
  const settingsPage = document.getElementById('settings-page');
  if (settingsPage) {
    const container = settingsPage.querySelector('.form-group:has(#browser-notification)');
    if (container) {
      container.appendChild(messageEl);
    }
  }
}
  
  /**
   * Cria um badge de notificações na interface
   */
  createNotificationBadge() {
    const badge = document.createElement('div');
    badge.className = 'notification-badge';
    badge.style.display = 'none';
    
    // Adicionar ao cabeçalho
    const navbar = document.querySelector('.navbar');
    if (navbar) {
      navbar.appendChild(badge);
    }
    
    return badge;
  }
  
  /**
   * Adiciona botão para solicitar permissão na interface
   */
  addRequestPermissionButton() {
    const container = document.createElement('div');
    container.className = 'permission-prompt';
    container.innerHTML = `
      <div class="permission-content">
        <p>Ative as notificações para receber lembretes sobre suas contas e compromissos</p>
        <button class="btn btn-save" id="enable-notifications-btn">
          <i class="fas fa-bell"></i> Ativar Notificações
        </button>
      </div>
    `;
    
    document.body.appendChild(container);
    
    document.getElementById('enable-notifications-btn').addEventListener('click', async () => {
      const permission = await Notification.requestPermission();
      this.hasPermission = permission === 'granted';
      
      if (this.hasPermission) {
        this.showPermissionGrantedMessage();
        container.remove();
        
        // Atualizar configurações
        const settings = this.persistenceAPI.getSettings() || {};
        settings.browserNotification = true;
        this.persistenceAPI.saveSettings(settings);
        
        // Verificar notificações imediatamente
        this.checkAndNotify();
      } else {
        this.showPermissionDeniedMessage();
      }
    });
  }
  
  /**
   * Mostra mensagem quando a permissão é concedida
   */
  showPermissionGrantedMessage() {
    const messageEl = document.createElement('div');
    messageEl.className = 'notification-status granted';
    messageEl.innerHTML = `
      <i class="fas fa-check-circle"></i> Notificações ativadas
    `;
    
    // Adicionar à página de configurações
    const settingsPage = document.getElementById('settings-page');
    if (settingsPage) {
      const container = settingsPage.querySelector('.form-group:has(#browser-notification)');
      if (container) {
        container.appendChild(messageEl);
      }
    }
    
    // Atualizar checkbox de notificações
    const notificationCheckbox = document.getElementById('browser-notification');
    if (notificationCheckbox) {
      notificationCheckbox.checked = true;
    }
  }
  
  /**
   * Mostra mensagem quando a permissão é negada
   */
  showPermissionDeniedMessage() {
    const messageEl = document.createElement('div');
    messageEl.className = 'notification-status denied';
    messageEl.innerHTML = `
      <i class="fas fa-times-circle"></i> Notificações bloqueadas nas configurações do navegador
    `;
    
    // Adicionar à página de configurações
    const settingsPage = document.getElementById('settings-page');
    if (settingsPage) {
      const container = settingsPage.querySelector('.form-group:has(#browser-notification)');
      if (container) {
        container.appendChild(messageEl);
      }
    }
  }
  
  /**
   * Configura verificação periódica de notificações
   */
  setupPeriodicCheck() {
    // Verificar a cada 15 minutos
    setInterval(() => {
      this.checkAndNotify();
    }, 15 * 60 * 1000);
  }
  
  /**
   * Sincroniza os dados do localStorage com o Service Worker
   */
  syncWithServiceWorker() {
    if (this.serviceWorkerRegistration?.active) {
      this.serviceWorkerRegistration.active.postMessage({
        type: 'check-reminders-now'
      });
      console.log("Solicitação enviada ao Service Worker para verificar lembretes");
    }
  }
  
  /**
   * Envia uma notificação imediata
   */
  sendNotification(title, options = {}) {
    if (!this.hasPermission) return false;
    
    try {
      // Gerar ID único para a notificação
      const notificationId = Date.now().toString();
      
      // Usar ServiceWorker para notificação se disponível
      if (this.serviceWorkerRegistration) {
        this.serviceWorkerRegistration.showNotification(title, {
          icon: '/favicon.ico',
          badge: '/badge-icon.png',
          requireInteraction: true,
          tag: notificationId,
          ...options
        });
        
        // Adicionar à lista de notificações pendentes
        this.updatePendingNotifications(1);
        
        console.log(`Notificação enviada via ServiceWorker: ${title}`);
      } else {
        // Fallback para notificação normal
        const notification = new Notification(title, {
          icon: '/favicon.ico',
          ...options
        });
        
        // Adicionar à lista de notificações pendentes
        this.updatePendingNotifications(1);
        
        // Adicionar evento de clique
        notification.onclick = function() {
          window.focus();
          this.close();
        };
        
        console.log(`Notificação enviada via API padrão: ${title}`);
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      return false;
    }
  }
  
  /**
   * Atualiza o contador de notificações pendentes
   */
  updatePendingNotifications(delta) {
    this.pendingNotificationsCount += delta;
    
    if (this.pendingNotificationsCount > 0) {
      this.notificationBadge.textContent = this.pendingNotificationsCount > 9 ? '9+' : this.pendingNotificationsCount;
      this.notificationBadge.style.display = 'flex';
    } else {
      this.notificationBadge.style.display = 'none';
    }
  }
  
  /**
   * Verifica e notifica sobre compromissos e contas pendentes
   */
  checkAndNotify() {
    if (!this.hasPermission || !this.notificationSettings.browserNotification) return;
    
    console.log("Verificando lembretes para notificações...");
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Verificar compromissos de hoje
    this.checkAppointments(today);
    
    // Verificar contas próximas do vencimento
    this.checkBills(today);
    
    // Verificar via Service Worker também
    this.syncWithServiceWorker();
  }
  
  /**
   * Verifica compromissos para a data especificada
   */
  checkAppointments(date) {
    const appointments = this.persistenceAPI.getCollection('appointments');
    const dateStr = date.toISOString().split('T')[0];
    
    const todayAppointments = appointments.filter(a => a.date === dateStr);
    
    if (todayAppointments.length > 0) {
      this.sendNotification('Compromissos hoje', {
        body: `Você tem ${todayAppointments.length} compromisso(s) agendado(s) para hoje`,
        tag: 'appointments-today',
        data: {
          type: 'appointments',
          date: dateStr
        }
      });
      
      // Notificar também no console para debug
      console.log(`Notificação de compromissos: ${todayAppointments.length} para hoje`);
    }
  }
  
  /**
   * Verifica contas próximas do vencimento
   */
  checkBills(today) {
    const bills = this.persistenceAPI.getCollection('bills');
    const advanceDays = this.notificationSettings.advanceDays;
    
    // Filtrar contas pendentes que vencem nos próximos X dias
    const pendingBills = bills.filter(bill => {
      if (bill.status !== 'pending') return false;
      
      const dueDate = new Date(bill.dueDate);
      const diffTime = dueDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays >= 0 && diffDays <= advanceDays;
    });
    
    if (pendingBills.length > 0) {
      // Calcular valor total
      const totalAmount = pendingBills.reduce((sum, bill) => sum + bill.amount, 0);
      
      this.sendNotification('Contas próximas do vencimento', {
        body: `Você tem ${pendingBills.length} conta(s) para pagar nos próximos dias (R$ ${totalAmount.toFixed(2)})`,
        tag: 'bills-due-soon',
        data: {
          type: 'bills',
          count: pendingBills.length
        }
      });
      
      // Notificar também no console para debug
      console.log(`Notificação de contas: ${pendingBills.length} contas próximas do vencimento`);
    }
  }
  
  /**
   * Envia uma notificação de teste para verificar se está funcionando
   */
  sendTestNotification() {
    return this.sendNotification('Teste de Notificação', {
      body: 'Esta é uma notificação de teste para verificar se o sistema está funcionando corretamente',
      tag: 'test-notification',
      data: {
        type: 'test'
      }
    });
  }
}

// Exportar factory function
export default function createNotificationManager(persistenceAPI) {
  return new NotificationManager(persistenceAPI);
}