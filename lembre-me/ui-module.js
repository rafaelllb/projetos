/**
 * UI management module
 */
export class UIManager {
    constructor(persistenceAPI) {
      this.persistenceAPI = persistenceAPI;
      this.initEventListeners();
      this.setupMobileNavigation();
    }
    
    // Initialize event listeners
    initEventListeners() {
      // Menu navigation
      document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => {
          const pageId = item.getAttribute('data-page');
          this.showPage(pageId);
        });
      });
      
      // Settings button
      document.getElementById('save-settings-btn').addEventListener('click', () => {
        this.saveSettings();
      });
    }
    
    // Configure mobile navigation
    setupMobileNavigation() {
      const toggleBtn = document.querySelector('.toggle-btn');
      const sidebar = document.getElementById('sidebar');
      
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('active');
      });
      
      // Close menu when clicking outside
      document.addEventListener('click', (e) => {
        if (window.innerWidth <= 992) {
          if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
            sidebar.classList.remove('active');
          }
        }
      });
      
      // Adjust view on window resize
      window.addEventListener('resize', () => {
        if (window.innerWidth > 992) {
          sidebar.classList.remove('active');
        }
      });
    }
    
    // Show a specific page
    showPage(pageId) {
      // Update menu
      document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
      });
      document.querySelector(`.menu-item[data-page="${pageId}"]`).classList.add('active');
      
      // Update pages
      document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
      });
      document.getElementById(pageId).classList.add('active');
      
      // Fechar sidebar no mobile
      if (window.innerWidth <= 992) {
        document.getElementById('sidebar').classList.remove('active');
      }

      if (window.adsManager && Math.random() < 0.2) { // 20% de chance
        window.adsManager.showInterstitial();
      }
    }
    
    // Save settings
    saveSettings() {
      const settings = {
        notificationTime: document.getElementById('notification-time').value,
        advanceDays: parseInt(document.getElementById('advance-days').value),
        emailNotification: document.getElementById('email-notification').checked,
        browserNotification: document.getElementById('browser-notification').checked
      };
      
      this.persistenceAPI.saveSettings(settings);
      
      alert('Configurações salvas com sucesso!');
    }
    
    // Setup browser notifications
    setupNotifications() {
      if ('Notification' in window) {
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
          // Request permission for notifications
          Notification.requestPermission();
        }
      }
    }
  }