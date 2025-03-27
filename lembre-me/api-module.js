/**
 * Módulo API que centraliza operações de persistência
 * Coordena o fluxo entre aplicação, localStorage e Firebase
 */
import StorageManager from './storage-module.js';
import FirebaseManager from './firebase-module.js';
import { UserDataManager } from './user-data-module.js';

class PersistenceAPI {
  constructor() {
    this.storage = new StorageManager();
    this.firebase = new FirebaseManager();
    this.autoBackupInterval = null;
    this.listeners = {
      authChange: [],
      dataChange: [],
      backupComplete: []
    };
    
    // Inicializa o gerenciador de dados do usuário
    this.userDataManager = new UserDataManager(this);
    
    // Inicializa o Firebase
    this.firebase.initialize().then(() => {
      this._notifyListeners('authChange', this.firebase.getCurrentUser());
      
      // Migra dados existentes para incluir userId
      this.userDataManager.migrateExistingData();
    });
  }

  /**
   * Registra um novo usuário
   */
  async registerUser(email, password, nome) {
    const result = await this.firebase.registerUser(email, password, nome);
    if (result.success) {
      this._notifyListeners('authChange', this.firebase.getCurrentUser());
      
      // Após registro bem-sucedido, verificar se há dados anônimos
      if (this.userDataManager.hasAnonymousData()) {
        await this.userDataManager.showTransferDataDialog(result.user.uid);
      }
      
      this._setupAutoBackup();
    }
    return result;
  }

  /**
   * Faz login de um usuário existente
   */
  async loginUser(email, password) {
    const result = await this.firebase.loginUser(email, password);
    if (result.success) {
      this._notifyListeners('authChange', this.firebase.getCurrentUser());
      
      // Verificar se existem dados no backup e no localStorage
      const hasCloudBackup = await this.hasCloudBackup();
      const localData = this.storage.getData();
      const hasLocalData = localData && Object.keys(localData).length > 0;
      
      if (hasCloudBackup && hasLocalData) {
        // Perguntar ao usuário o que fazer
        const decision = await this.userDataManager.showReplaceLocalDataDialog();
        
        if (decision === 'cloud') {
          // Restaurar dados do Firebase
          await this.restoreLatestBackup();
        } else if (decision === 'local') {
          // Fazer backup dos dados locais
          await this.backupData();
        }
      } else if (hasCloudBackup) {
        // Restaurar dados do Firebase se não houver dados locais
        await this.restoreLatestBackup();
      } else if (hasLocalData) {
        // Fazer backup dos dados locais
        await this.backupData();
      }
      
      this._setupAutoBackup();
    }
    return result;
  }

  /**
   * Verifica se existem backups na nuvem para o usuário atual
   */
  async hasCloudBackup() {
    if (!this.isUserLoggedIn()) return false;
    
    const backupHistory = await this.getBackupHistory(1);
    return backupHistory.success && backupHistory.backups.length > 0;
  }

  /**
   * Faz logout do usuário atual
   */
  async logoutUser() {
    const result = await this.firebase.logoutUser();
    if (result.success) {
      this._notifyListeners('authChange', null);
      this._clearAutoBackup();
    }
    return result;
  }

  /**
   * Verifica se o usuário está autenticado
   */
  isUserLoggedIn() {
    return this.firebase.isUserLoggedIn();
  }

  /**
   * Obtém informações do usuário atual
   */
  getCurrentUser() {
    return this.firebase.getCurrentUser();
  }

  /**
   * Realiza backup dos dados no Firebase
   */
  async backupData() {
    if (!this.isUserLoggedIn()) {
      return { success: false, error: 'Usuário não autenticado' };
    }
    
    const data = this.storage.getData();
    const result = await this.firebase.backupData(data);
    
    if (result.success) {
      // Atualiza a data do último backup no localStorage
      this.storage.updateLastBackup();
      this._notifyListeners('backupComplete', result);
    }
    
    return result;
  }

  /**
   * Restaura dados do último backup
   */
  async restoreLatestBackup() {
    if (!this.isUserLoggedIn()) {
      return { success: false, error: 'Usuário não autenticado' };
    }
    
    const result = await this.firebase.restoreData();
    
    if (result.success && result.data) {
      // Salva os dados restaurados no localStorage
      this.storage.saveData(result.data);
      this._notifyListeners('dataChange', result.data);
    }
    
    return result;
  }

  /**
   * Restaura dados de um backup específico
   */
  async restoreFromBackupId(backupId) {
    if (!this.isUserLoggedIn()) {
      return { success: false, error: 'Usuário não autenticado' };
    }
    
    const result = await this.firebase.restoreFromBackupId(backupId);
    
    if (result.success && result.data) {
      // Salva os dados restaurados no localStorage
      this.storage.saveData(result.data);
      this._notifyListeners('dataChange', result.data);
    }
    
    return result;
  }

  /**
   * Obtém o histórico de backups do usuário
   */
  async getBackupHistory(limit = 10) {
    return await this.firebase.getBackupHistory(limit);
  }

  /**
   * Configura o intervalo para backups automáticos
   * @private
   */
  _setupAutoBackup(intervalMinutes = 30) {
    this._clearAutoBackup();
    
    // Converte minutos em milissegundos
    const interval = intervalMinutes * 60 * 1000;
    
    this.autoBackupInterval = setInterval(async () => {
      // Verifica se é necessário fazer backup
      const lastBackup = this.storage.getLastBackup();
      
      if (!lastBackup || this._shouldPerformBackup(lastBackup)) {
        await this.backupData();
      }
    }, interval);
  }

  /**
   * Limpa o intervalo de backup automático
   * @private
   */
  _clearAutoBackup() {
    if (this.autoBackupInterval) {
      clearInterval(this.autoBackupInterval);
      this.autoBackupInterval = null;
    }
  }

  /**
   * Verifica se é necessário fazer backup com base na data do último backup
   * @private
   */
  _shouldPerformBackup(lastBackupDate) {
    if (!lastBackupDate) return true;
    
    const lastBackup = new Date(lastBackupDate);
    const now = new Date();
    
    // Define o limite como 24 horas
    const limit = 24 * 60 * 60 * 1000; // 24 horas em milissegundos
    
    return (now - lastBackup) > limit;
  }

  /**
   * Adiciona um listener para determinado evento
   */
  addListener(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  /**
   * Remove um listener
   */
  removeListener(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  /**
   * Notifica todos os listeners de um evento
   * @private
   */
  _notifyListeners(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Erro ao executar listener:', error);
        }
      });
    }
  }

  // Métodos proxy para acesso ao StorageManager
  getData() {
    return this.storage.getData();
  }

  saveData(data) {
    const result = this.storage.saveData(data);
    if (result) {
      this._notifyListeners('dataChange', data);
    }
    return result;
  }

  getCollection(collectionName) {
    const items = this.storage.getCollection(collectionName);
    return this.userDataManager.filterDataForCurrentUser(items);
  }

  saveCollection(collectionName, items) {
    const result = this.storage.saveCollection(collectionName, items);
    if (result) {
      this._notifyListeners('dataChange', this.storage.getData());
    }
    return result;
  }

  addItem(collectionName, item) {
    const itemWithUserId = this.userDataManager.addUserIdToItem(item);
    const result = this.storage.addItem(collectionName, itemWithUserId);
    if (result) {
      this._notifyListeners('dataChange', this.storage.getData());
    }
    return result;
  }

  updateItem(collectionName, item) {
    // Garantir que o userId seja mantido
    if (!item.userId) {
      item.userId = this.userDataManager.getCurrentUserId();
    }
    const result = this.storage.updateItem(collectionName, item);
    if (result) {
      this._notifyListeners('dataChange', this.storage.getData());
    }
    return result;
  }

  deleteItem(collectionName, id) {
    const result = this.storage.deleteItem(collectionName, id);
    if (result) {
      this._notifyListeners('dataChange', this.storage.getData());
    }
    return result;
  }

  getSettings() {
    return this.storage.getSettings();
  }

  saveSettings(settings) {
    return this.storage.saveSettings(settings);
  }

  clearStorage() {
    this.storage.clearStorage();
    this._notifyListeners('dataChange', this.storage.getData());
  }
}

// Exporta uma instância única da API
const persistenceAPI = new PersistenceAPI();
export default persistenceAPI;