/**
 * Authentication module for Reminder System
 */
import { formatSize, showNotification } from './utils-module.js';

export class AuthManager {
  constructor(persistenceAPI) {
    this.persistenceAPI = persistenceAPI;
    this.backupInterval = null;
  }
  
  // Initialize authentication
  initializeAuth() {
    // Setup auth related UI events
    this.setupAuthUI();
    
    // Check if user is already logged in
    if (this.persistenceAPI.isUserLoggedIn()) {
      this.updateUserUI(this.persistenceAPI.getCurrentUser());
      // Restore latest backup if logged in
      this.restoreAndSetupBackup();
    } else {
      // Show login button or indicator in the UI
      this.updateGuestUI();
    }
    
    // Add listener for auth changes
    this.persistenceAPI.addListener('authChange', (user) => {
      if (user) {
        this.hideAuthContainer();
        this.updateUserUI(user);
        // Restore latest backup when logging in
        this.restoreAndSetupBackup();
      } else {
        this.updateGuestUI();
        this.clearBackupInterval();
      }
    });
    
    // Add listener for data changes
    this.persistenceAPI.addListener('dataChange', () => {
      this.updateAppUI();
    });
    
    // Add listener for backup completion
    this.persistenceAPI.addListener('backupComplete', (result) => {
      this.updateBackupIndicator(result);
    });
    
    // Set up page unload handler to backup data before closing
    window.addEventListener('beforeunload', () => {
      if (this.persistenceAPI.isUserLoggedIn()) {
        this.persistenceAPI.backupData();
      }
    });
  }
  
  // Restore data from latest backup and set up auto-backup
  async restoreAndSetupBackup() {
    // Verificar se existem dados no backup
    const hasCloudBackup = await this.persistenceAPI.hasCloudBackup();
    const hasLocalData = this.persistenceAPI.getData() && Object.keys(this.persistenceAPI.getData()).length > 0;
    
    if (hasCloudBackup) {
      // Se não houver dados locais ou se o usuário decidir restaurar
      if (!hasLocalData || await this.shouldRestoreCloudData()) {
        await this.persistenceAPI.restoreLatestBackup();
      }
    }
    
    // Set up automatic backup interval (every hour)
    this.setupBackupInterval(60); // 60 minutes
  }
  
  // Pergunta ao usuário se deve restaurar dados da nuvem
  async shouldRestoreCloudData() {
    // Se não houver dados locais, restaurar automaticamente
    if (!this.persistenceAPI.getData() || Object.keys(this.persistenceAPI.getData()).length === 0) {
      return true;
    }
    
    return new Promise(resolve => {
      const modal = document.createElement('div');
      modal.className = 'modal active';
      
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <div class="modal-title">Restaurar Backup</div>
            <button class="close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <p>Existem dados salvos na nuvem. Deseja restaurá-los?</p>
            <p>Isso substituirá quaisquer dados locais.</p>
            <div class="form-actions">
              <button class="btn btn-cancel" id="cancel-restore-btn">Não</button>
              <button class="btn btn-save" id="confirm-restore-btn">Sim</button>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      document.querySelector('#confirm-restore-btn').addEventListener('click', () => {
        document.body.removeChild(modal);
        resolve(true);
      });
      
      document.querySelector('#cancel-restore-btn').addEventListener('click', () => {
        document.body.removeChild(modal);
        resolve(false);
      });
      
      document.querySelector('.close-btn').addEventListener('click', () => {
        document.body.removeChild(modal);
        resolve(false);
      });
    });
  }
  
  // Set up authentication UI
  setupAuthUI() {
    // Add login button to header
    const userProfile = document.querySelector('.user-profile');
    if (userProfile) {
      userProfile.addEventListener('click', () => {
        if (this.persistenceAPI.isUserLoggedIn()) {
          this.showUserMenu();
        } else {
          this.showAuthContainer();
        }
      });
    }
    
    // Make auth container dismissable
    const authContainer = document.getElementById('auth-container');
    if (authContainer) {
      // Close when clicking outside the modal
      authContainer.addEventListener('click', (e) => {
        if (e.target === authContainer) {
          this.hideAuthContainer();
        }
      });
      
      // Add close button to auth modal header
      const closeBtn = document.createElement('button');
      closeBtn.className = 'close-btn';
      closeBtn.innerHTML = '&times;';
      closeBtn.addEventListener('click', () => {
        this.hideAuthContainer();
      });
      
      const authHeader = authContainer.querySelector('.auth-header');
      if (authHeader) {
        authHeader.appendChild(closeBtn);
      }
    }
    
    // Toggle between login and register tabs
    document.getElementById('login-tab').addEventListener('click', () => {
      this.switchAuthTab('login');
    });
    
    document.getElementById('register-tab').addEventListener('click', () => {
      this.switchAuthTab('register');
    });
    
    // Handle login form submission
    document.getElementById('login-button').addEventListener('click', async () => {
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      
      if (!email || !password) {
        this.showAuthError('login', 'Por favor, preencha todos os campos');
        return;
      }
      
      // Show loading indicator
      document.getElementById('login-button').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
      document.getElementById('login-button').disabled = true;
      
      const result = await this.persistenceAPI.loginUser(email, password);
      
      document.getElementById('login-button').innerHTML = 'Entrar';
      document.getElementById('login-button').disabled = false;
      
      if (!result.success) {
        this.showAuthError('login', result.error);
      }
    });
    
    // Handle register form submission
    document.getElementById('register-button').addEventListener('click', async () => {
      const name = document.getElementById('register-name').value;
      const email = document.getElementById('register-email').value;
      const password = document.getElementById('register-password').value;
      const confirmPassword = document.getElementById('register-password-confirm').value;
      
      if (!name || !email || !password || !confirmPassword) {
        this.showAuthError('register', 'Por favor, preencha todos os campos');
        return;
      }
      
      if (password !== confirmPassword) {
        this.showAuthError('register', 'As senhas não coincidem');
        return;
      }
      
      if (password.length < 6) {
        this.showAuthError('register', 'A senha deve ter pelo menos 6 caracteres');
        return;
      }
      
      // Show loading indicator
      document.getElementById('register-button').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cadastrando...';
      document.getElementById('register-button').disabled = true;
      
      const result = await this.persistenceAPI.registerUser(email, password, name);
      
      document.getElementById('register-button').innerHTML = 'Cadastrar';
      document.getElementById('register-button').disabled = false;
      
      if (!result.success) {
        this.showAuthError('register', result.error);
      }
    });
  }
  
  // Set up automatic backup interval
  setupBackupInterval(intervalMinutes = 60) {
    this.clearBackupInterval();
    
    // Convert minutes to milliseconds
    const interval = intervalMinutes * 60 * 1000;
    
    this.backupInterval = setInterval(() => {
      if (this.persistenceAPI.isUserLoggedIn()) {
        this.persistenceAPI.backupData();
      }
    }, interval);
    
    console.log(`Automatic backup scheduled every ${intervalMinutes} minutes`);
  }
  
  // Clear backup interval
  clearBackupInterval() {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
    }
  }
  
  // Toggle between login and register tabs
  switchAuthTab(tab) {
    document.getElementById('login-tab').classList.toggle('active', tab === 'login');
    document.getElementById('register-tab').classList.toggle('active', tab === 'register');
    
    document.getElementById('login-form').classList.toggle('active', tab === 'login');
    document.getElementById('register-form').classList.toggle('active', tab === 'register');
    
    // Clear errors
    document.getElementById('login-error').textContent = '';
    document.getElementById('register-error').textContent = '';
  }
  
  // Show error message in auth forms
  showAuthError(form, message) {
    document.getElementById(`${form}-error`).textContent = message;
  }
  
  // Show auth container
  showAuthContainer() {
    const authContainer = document.getElementById('auth-container');
    if (authContainer) {
      authContainer.classList.add('active');
    }
  }
  
  // Hide auth container
  hideAuthContainer() {
    const authContainer = document.getElementById('auth-container');
    if (authContainer) {
      authContainer.classList.remove('active');
    }
  }
  
  // Update UI for guest users
  updateGuestUI() {
    const userSpan = document.querySelector('.user-profile span');
    
    if (userSpan) {
      userSpan.textContent = 'Entrar';
    }
    
    // Remove backup indicator if exists
    const backupIndicator = document.getElementById('backup-indicator');
    if (backupIndicator) {
      backupIndicator.remove();
    }
    
    // Atualizar informação do usuário anônimo
    if (this.persistenceAPI.userDataManager) {
      const isAnonymous = this.persistenceAPI.userDataManager.isAnonymousUser();
      
      if (isAnonymous) {
        showNotification('Usando modo anônimo. Faça login para sincronizar seus dados.', 'info');
      }
    }
  }
  
  // Update UI with user information
  updateUserUI(user) {
    if (!user) return;
    
    const userSpan = document.querySelector('.user-profile span');
    
    if (userSpan) {
      userSpan.textContent = `Olá, ${user.displayName || 'Usuário'}`;
    }
    
    // Add backup indicator to top bar
    const userProfile = document.querySelector('.user-profile');
    
    if (!document.querySelector('.backup-indicator') && userProfile) {
      const backupIndicator = document.createElement('div');
      backupIndicator.className = 'backup-indicator';
      backupIndicator.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Sincronizado';
      backupIndicator.id = 'backup-indicator';
      
      userProfile.appendChild(backupIndicator);
    }
  }
  
  // Show user menu with backup and logout options
  showUserMenu() {
    // Remove existing menu if any
    const existingMenu = document.getElementById('user-menu');
    if (existingMenu) {
      existingMenu.remove();
      return;
    }
    
    // Create menu
    const userMenu = document.createElement('div');
    userMenu.id = 'user-menu';
    userMenu.className = 'user-menu';
    
    // Add options to menu
    userMenu.innerHTML = `
      <div class="user-menu-header">
        <div>${this.persistenceAPI.getCurrentUser()?.email || 'Usuário'}</div>
      </div>
      <div class="user-menu-item" id="backup-now">
        <i class="fas fa-cloud-upload-alt"></i> Fazer backup agora
      </div>
      <div class="user-menu-item" id="restore-backup">
        <i class="fas fa-cloud-download-alt"></i> Restaurar backup
      </div>
      <div class="user-menu-item" id="logout-button">
        <i class="fas fa-sign-out-alt"></i> Sair
      </div>
    `;
    
    // Add menu to page
    document.body.appendChild(userMenu);
    
    // Position menu
    const userProfile = document.querySelector('.user-profile');
    const rect = userProfile.getBoundingClientRect();
    
    userMenu.style.position = 'absolute';
    userMenu.style.top = `${rect.bottom + 10}px`;
    userMenu.style.right = `${window.innerWidth - rect.right}px`;
    
    // Add events
    document.getElementById('backup-now').addEventListener('click', async () => {
      const indicator = document.getElementById('backup-indicator');
      if (indicator) {
        indicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sincronizando...';
      }
      
      await this.persistenceAPI.backupData();
      userMenu.remove();
    });
    
    document.getElementById('restore-backup').addEventListener('click', async () => {
      this.showBackupRestoreDialog();
      userMenu.remove();
    });
    
    document.getElementById('logout-button').addEventListener('click', async () => {
      await this.persistenceAPI.logoutUser();
      userMenu.remove();
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function closeMenu(e) {
      if (!userMenu.contains(e.target) && e.target !== userProfile && !userProfile.contains(e.target)) {
        userMenu.remove();
        document.removeEventListener('click', closeMenu);
      }
    });
  }
  
  // Update backup indicator
  updateBackupIndicator(result) {
    const indicator = document.getElementById('backup-indicator');
    
    if (indicator) {
      if (result.success) {
        indicator.className = 'backup-indicator success';
        indicator.innerHTML = '<i class="fas fa-check-circle"></i> Sincronizado';
        
        // Back to normal state after a few seconds
        setTimeout(() => {
          indicator.className = 'backup-indicator';
          indicator.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Sincronizado';
        }, 3000);
      } else {
        indicator.className = 'backup-indicator error';
        indicator.innerHTML = '<i class="fas fa-exclamation-circle"></i> Falha';
        
        // Back to normal state after a few seconds
        setTimeout(() => {
          indicator.className = 'backup-indicator';
          indicator.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Sincronizado';
        }, 3000);
      }
    }
  }
  
  // Show dialog to restore backups
  async showBackupRestoreDialog() {
    // Create dialog
    const dialog = document.createElement('div');
    dialog.className = 'modal active';
    
    dialog.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <div class="modal-title">Restaurar Backup</div>
          <button class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <p>Selecione um backup para restaurar:</p>
          <div class="auth-backup-list" id="backup-list">
            <div style="padding: 20px; text-align: center;">
              <i class="fas fa-spinner fa-spin"></i> Carregando backups...
            </div>
          </div>
          <div id="restore-error" class="auth-error"></div>
          <div class="form-actions">
            <button class="btn btn-cancel" id="cancel-restore">Cancelar</button>
            <button class="btn btn-save" id="restore-button" disabled>Restaurar</button>
          </div>
        </div>
      </div>
    `;
    
    // Add dialog to page
    document.body.appendChild(dialog);
    
    // Setup events
    document.querySelector('.close-btn').addEventListener('click', () => {
      dialog.remove();
    });
    
    document.getElementById('cancel-restore').addEventListener('click', () => {
      dialog.remove();
    });
    
    // Load backup list
    const backupsResult = await this.persistenceAPI.getBackupHistory();
    const backupList = document.getElementById('backup-list');
    let selectedBackupId = null;
    
    if (backupsResult.success && backupsResult.backups.length > 0) {
      backupList.innerHTML = '';
      
      backupsResult.backups.forEach(backup => {
        const backupItem = document.createElement('div');
        backupItem.className = 'backup-item';
        backupItem.setAttribute('data-id', backup.id);
        
        const date = new Date(backup.timestamp);
        const formattedDate = date.toLocaleDateString('pt-BR') + ' ' + 
                          date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        backupItem.innerHTML = `
          <div class="backup-date">${formattedDate}</div>
          <div class="backup-size">${formatSize(backup.size)}</div>
        `;
        
        backupItem.addEventListener('click', () => {
          document.querySelectorAll('.backup-item').forEach(item => {
            item.classList.remove('selected');
          });
          
          backupItem.classList.add('selected');
          selectedBackupId = backup.id;
          document.getElementById('restore-button').disabled = false;
        });
        
        backupList.appendChild(backupItem);
      });
    } else {
      backupList.innerHTML = '<div style="padding: 20px; text-align: center;">Nenhum backup encontrado</div>';
    }
    
    // Set up restoration
    document.getElementById('restore-button').addEventListener('click', async () => {
      if (!selectedBackupId) return;
      
      document.getElementById('restore-button').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Restaurando...';
      document.getElementById('restore-button').disabled = true;
      document.getElementById('restore-error').textContent = '';
      
      const result = await this.persistenceAPI.restoreFromBackupId(selectedBackupId);
      
      if (result.success) {
        dialog.remove();
        showNotification('Backup restaurado com sucesso!', 'success');
        this.updateAppUI();
      } else {
        document.getElementById('restore-error').textContent = result.error;
        document.getElementById('restore-button').innerHTML = 'Restaurar';
        document.getElementById('restore-button').disabled = false;
      }
    });
  }
  
  // Update application UI after data changes
  updateAppUI() {
    // Update application UI when data changes
    // For example, after restoring a backup
    
    if (window.billsManager) {
      window.billsManager.renderBills();
    }
    
    if (window.appointmentsManager) {
      window.appointmentsManager.renderAppointments();
    }
    
    if (window.dashboardManager) {
      window.dashboardManager.updateDashboard();
    }
  }
  
  // Configure browser notifications
  setupNotifications() {
    if ('Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        // Request permission for notifications
        Notification.requestPermission();
      }
    }
  }
}