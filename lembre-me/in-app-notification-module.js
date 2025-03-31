/**
 * Módulo para gerenciar notificações em página com som
 * Funciona independentemente do service worker, usando a mesma lógica de detecção
 */
export class InAppNotificationManager {
  constructor(persistenceAPI) {
    this.persistenceAPI = persistenceAPI;
    this.notificationSound = new Audio('./notification-sound.mp3');
    this.notificationContainer = null;
    this.checkInterval = 60 * 1000; // Verificar a cada minuto
    this.lastCheckTime = 0;
    this.initialize();
  }
  
  /**
   * Inicializa o gerenciador de notificações em página
   */
  initialize() {
    // Criar container para notificações
    this.createNotificationContainer();
    
    // Carregar configurações de som
    this.loadSoundSettings();
    
    // Iniciar verificação periódica de lembretes
    this.setupPeriodicCheck();
    
    // Verificar imediatamente
    this.checkAndNotify();
  }
  
  /**
   * Cria container para exibir notificações
   */
  createNotificationContainer() {
    if (!this.notificationContainer) {
      this.notificationContainer = document.createElement('div');
      this.notificationContainer.className = 'in-app-notifications-container';
      document.body.appendChild(this.notificationContainer);
      
      // Adicionar estilos CSS necessários
      const style = document.createElement('style');
      style.textContent = `
        .in-app-notifications-container {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-width: 350px;
        }
        
        .in-app-notification {
          background: var(--glass-bg-dark);
          backdrop-filter: var(--glass-blur);
          border-radius: var(--border-radius);
          box-shadow: var(--shadow-lg);
          padding: 15px;
          animation: slideInRight 0.3s ease-out, glow 2s infinite;
          border-left: 4px solid var(--primary-color);
          display: flex;
          align-items: flex-start;
          overflow: hidden;
        }
        
        .in-app-notification.bill {
          border-left-color: var(--warning-color);
        }
        
        .in-app-notification.appointment {
          border-left-color: var(--info-color);
        }
        
        .notification-icon {
          font-size: 20px;
          margin-right: 12px;
          color: var(--primary-light);
        }
        
        .notification-content {
          flex: 1;
        }
        
        .notification-title {
          font-weight: 600;
          margin-bottom: 5px;
        }
        
        .notification-message {
          font-size: 0.9rem;
          color: var(--text-light-muted);
        }
        
        .notification-close {
          background: none;
          border: none;
          color: var(--text-light-muted);
          cursor: pointer;
          padding: 0;
          margin-left: 10px;
          transition: color 0.2s;
        }
        
        .notification-close:hover {
          color: var(--danger-color);
        }
        
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes glow {
          0% { box-shadow: 0 0 10px rgba(122, 103, 238, 0.5); }
          50% { box-shadow: 0 0 20px rgba(122, 103, 238, 0.8); }
          100% { box-shadow: 0 0 10px rgba(122, 103, 238, 0.5); }
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  /**
   * Configura verificação periódica de lembretes
   */
  setupPeriodicCheck() {
    // Verificar a cada minuto
    setInterval(() => {
      this.checkAndNotify();
    }, this.checkInterval);
    
    // Também verificar quando a janela recebe foco
    window.addEventListener('focus', () => {
      // Evitar verificações muito frequentes
      const now = Date.now();
      if (now - this.lastCheckTime > 30000) { // 30 segundos mínimo entre verificações
        this.checkAndNotify();
      }
    });
  }
  
  /**
   * Carrega configurações de som das notificações
   */
  loadSoundSettings() {
    const settings = this.persistenceAPI.getSettings() || {};
    this.soundEnabled = settings.notificationSound !== false;
    this.soundVolume = settings.notificationVolume || 0.5;
    
    // Configurar volume do som
    this.notificationSound.volume = this.soundVolume;
    
    // Pré-carregar o som para evitar atrasos
    this.notificationSound.load();
  }
  
  /**
   * Verifica e notifica sobre compromissos e contas pendentes
   * Esta função implementa a mesma lógica do Service Worker
   */
  checkAndNotify() {
    // Registrar tempo da última verificação
    this.lastCheckTime = Date.now();
    
    // Verificar se as notificações estão habilitadas
    const settings = this.persistenceAPI.getSettings() || {};
    if (settings.browserNotification === false) return;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Verificar compromissos de hoje
    this.checkAppointments(today);
    
    // Verificar contas próximas do vencimento
    this.checkBills(today, settings.advanceDays || 3);
  }
  
  /**
   * Verifica compromissos para a data especificada
   */
  checkAppointments(date) {
    const appointments = this.persistenceAPI.getCollection('appointments');
    const dateStr = date.toISOString().split('T')[0];
    
    // Obter compromissos de hoje
    const todayAppointments = appointments.filter(a => a.date === dateStr);
    
    if (todayAppointments.length > 0) {
      // Verificar compromissos próximos (nas próximas 2 horas)
      const now = new Date();
      const upcomingAppointments = todayAppointments.filter(appointment => {
        const appointmentTime = new Date(`${appointment.date}T${appointment.time}`);
        const timeDiff = (appointmentTime - now) / (1000 * 60); // diferença em minutos
        return timeDiff > 0 && timeDiff <= 120; // dentro das próximas 2 horas
      });
      
      if (upcomingAppointments.length > 0) {
        this.showNotification(
          'Compromissos Em Breve',
          `Você tem ${upcomingAppointments.length} compromisso(s) nas próximas 2 horas`,
          'appointment'
        );
      } else if (!this.hasShownTodayAppointments) {
        // Mostrar notificação geral de compromissos de hoje apenas uma vez
        this.showNotification(
          'Compromissos de Hoje',
          `Você tem ${todayAppointments.length} compromisso(s) agendado(s) para hoje`,
          'appointment'
        );
        this.hasShownTodayAppointments = true;
      }
    }
  }
  
  /**
   * Verifica contas próximas do vencimento
   */
  checkBills(today, advanceDays) {
    const bills = this.persistenceAPI.getCollection('bills');
    
    // Filtrar contas pendentes que vencem nos próximos X dias
    const pendingBills = bills.filter(bill => {
      if (bill.status !== 'pending') return false;
      
      const dueDate = new Date(`${bill.dueDate}T00:00:00`);
      const diffTime = dueDate - today;
      const diffDays = Math.ceil(diffTime / (24 * 60 * 60 * 1000));
      
      return diffDays >= 0 && diffDays <= advanceDays;
    });
    
    if (pendingBills.length > 0 && !this.hasShownPendingBills) {
      // Calcular valor total
      const totalAmount = pendingBills.reduce((sum, bill) => sum + bill.amount, 0);
      
      this.showNotification(
        'Contas Próximas do Vencimento',
        `Você tem ${pendingBills.length} conta(s) para pagar nos próximos dias (R$ ${totalAmount.toFixed(2)})`,
        'bill'
      );
      
      // Marcar como já mostrado para evitar notificações repetitivas
      this.hasShownPendingBills = true;
      
      // Redefinir o flag após 6 horas
      setTimeout(() => {
        this.hasShownPendingBills = false;
      }, 6 * 60 * 60 * 1000);
    }
  }
  
  /**
   * Exibe uma notificação na página e reproduz som
   */
  showNotification(title, message, type = 'default') {
    // Criar elemento de notificação
    const notification = document.createElement('div');
    notification.className = `in-app-notification ${type}`;
    
    // Determinar ícone baseado no tipo
    let icon = 'fa-bell';
    if (type === 'bill') icon = 'fa-file-invoice-dollar';
    if (type === 'appointment') icon = 'fa-calendar-check';
    
    notification.innerHTML = `
      <div class="notification-icon">
        <i class="fas ${icon}"></i>
      </div>
      <div class="notification-content">
        <div class="notification-title">${title}</div>
        <div class="notification-message">${message}</div>
      </div>
      <button class="notification-close">
        <i class="fas fa-times"></i>
      </button>
    `;
    
    // Adicionar ao container
    this.notificationContainer.appendChild(notification);
    
    // Reproduzir som se habilitado
    if (this.soundEnabled) {
      this.playNotificationSound();
    }
    
    // Configurar fechamento automático após 8 segundos
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }
    }, 8000);
    
    // Adicionar evento para fechar ao clicar no botão
    notification.querySelector('.notification-close').addEventListener('click', () => {
      notification.style.animation = 'fadeOut 0.3s forwards';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    });
    
    // Retornar a notificação para possível manipulação
    return notification;
  }
  
  /**
   * Reproduz o som de notificação
   */
  playNotificationSound() {
    // Reiniciar som se já estiver tocando
    this.notificationSound.pause();
    this.notificationSound.currentTime = 0;
    
    // Reproduzir som
    const playPromise = this.notificationSound.play();
    
    // Lidar com erros de reprodução (comum em alguns navegadores)
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.warn('Erro ao reproduzir som de notificação:', error);
      });
    }
  }
  
  /**
   * Ativa ou desativa o som das notificações
   */
  toggleSound(enabled) {
    this.soundEnabled = enabled;
    
    // Salvar configuração
    const settings = this.persistenceAPI.getSettings() || {};
    settings.notificationSound = enabled;
    this.persistenceAPI.saveSettings(settings);
  }
  
  /**
   * Ajusta o volume do som das notificações
   */
  setVolume(volume) {
    this.soundVolume = Math.max(0, Math.min(1, volume));
    this.notificationSound.volume = this.soundVolume;
    
    // Salvar configuração
    const settings = this.persistenceAPI.getSettings() || {};
    settings.notificationVolume = this.soundVolume;
    this.persistenceAPI.saveSettings(settings);
  }
  
  /**
   * Envia uma notificação de teste para verificar se está funcionando
   */
  sendTestNotification() {
    this.showNotification(
      'Teste de Notificação',
      'Esta é uma notificação de teste com som.',
      'default'
    );
    return true;
  }
}

// Exportar factory function
export default function createInAppNotificationManager(persistenceAPI) {
  return new InAppNotificationManager(persistenceAPI);
}