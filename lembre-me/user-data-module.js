/**
 * Módulo para gerenciar dados associados a usuários
 * Lida com a transição de dados anônimos para autenticados
 */
import { showNotification } from './utils-module.js';

export class UserDataManager {
  constructor(persistenceAPI) {
    this.persistenceAPI = persistenceAPI;
    this.anonymousUserId = this.getOrCreateAnonymousUserId();
  }
  
  /**
   * Obtém ou cria um ID de usuário anônimo
   */
  getOrCreateAnonymousUserId() {
    let anonymousId = localStorage.getItem('anonymousUserId');
    
    if (!anonymousId) {
      anonymousId = 'anonymous_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
      localStorage.setItem('anonymousUserId', anonymousId);
    }
    
    return anonymousId;
  }
  
  /**
   * Retorna o ID do usuário atual (anônimo ou autenticado)
   */
  getCurrentUserId() {
    const authenticatedUser = this.persistenceAPI.getCurrentUser();
    return authenticatedUser ? authenticatedUser.uid : this.anonymousUserId;
  }
  
  /**
   * Verifica se o usuário atual é anônimo
   */
  isAnonymousUser() {
    return !this.persistenceAPI.getCurrentUser();
  }
  
  /**
   * Verifica se existem dados anônimos
   */
  hasAnonymousData() {
    const data = this.persistenceAPI.storage.getData();
    if (!data) return false;
    
    const hasAnonymousBills = data.bills && data.bills.some(bill => 
      bill.userId && bill.userId.startsWith('anonymous_'));
    
    const hasAnonymousAppointments = data.appointments && data.appointments.some(appointment => 
      appointment.userId && appointment.userId.startsWith('anonymous_'));
    
    return hasAnonymousBills || hasAnonymousAppointments;
  }
  
  /**
   * Transfere dados anônimos para um usuário autenticado
   */
  transferAnonymousData(userId) {
    const data = this.persistenceAPI.storage.getData();
    if (!data) return false;
    
    let modified = false;
    
    if (data.bills) {
      data.bills.forEach(bill => {
        if (bill.userId && bill.userId.startsWith('anonymous_')) {
          bill.userId = userId;
          modified = true;
        }
      });
    }
    
    if (data.appointments) {
      data.appointments.forEach(appointment => {
        if (appointment.userId && appointment.userId.startsWith('anonymous_')) {
          appointment.userId = userId;
          modified = true;
        }
      });
    }
    
    if (modified) {
      this.persistenceAPI.storage.saveData(data);
    }
    
    return modified;
  }
  
  /**
   * Filtra dados para o usuário atual
   */
  filterDataForCurrentUser(items) {
    const currentUserId = this.getCurrentUserId();
    // Se o item não tiver userId, adiciona o userId atual para compatibilidade
    return items.filter(item => {
      if (!item.userId) {
        item.userId = currentUserId;
        return true;
      }
      return item.userId === currentUserId;
    });
  }
  
  /**
   * Adiciona ID de usuário a um novo item
   */
  addUserIdToItem(item) {
    if (!item.userId) {
      item.userId = this.getCurrentUserId();
    }
    return item;
  }
  
  /**
   * Mostra diálogo para transferir dados anônimos
   */
  showTransferDataDialog(userId) {
    return new Promise(resolve => {
      const modal = document.createElement('div');
      modal.className = 'modal active';
      
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <div class="modal-title">Transferir Dados</div>
            <button class="close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <p>Existem contas e compromissos não associados a nenhum usuário.</p>
            <p>Deseja transferir esses dados para sua conta?</p>
            <div class="form-actions">
              <button class="btn btn-cancel" id="transfer-cancel-btn">Não</button>
              <button class="btn btn-save" id="transfer-confirm-btn">Sim</button>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      document.querySelector('#transfer-confirm-btn').addEventListener('click', () => {
        const transferred = this.transferAnonymousData(userId);
        document.body.removeChild(modal);
        if (transferred) {
          showNotification('Dados transferidos com sucesso!', 'success');
        }
        resolve(true);
      });
      
      document.querySelector('#transfer-cancel-btn').addEventListener('click', () => {
        document.body.removeChild(modal);
        resolve(false);
      });
      
      document.querySelector('.close-btn').addEventListener('click', () => {
        document.body.removeChild(modal);
        resolve(false);
      });
    });
  }
  
  /**
   * Mostra diálogo de confirmação para substituição de dados locais
   */
  showReplaceLocalDataDialog() {
    return new Promise(resolve => {
      const modal = document.createElement('div');
      modal.className = 'modal active';
      
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <div class="modal-title">Dados Encontrados</div>
            <button class="close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <p>Foram encontrados dados locais e dados na nuvem.</p>
            <p>O que você deseja fazer?</p>
            <div class="form-actions">
              <button class="btn btn-cancel" id="keep-local-btn">Manter dados locais</button>
              <button class="btn btn-save" id="restore-cloud-btn">Restaurar da nuvem</button>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      document.querySelector('#keep-local-btn').addEventListener('click', () => {
        document.body.removeChild(modal);
        resolve('local');
      });
      
      document.querySelector('#restore-cloud-btn').addEventListener('click', () => {
        document.body.removeChild(modal);
        resolve('cloud');
      });
      
      document.querySelector('.close-btn').addEventListener('click', () => {
        document.body.removeChild(modal);
        resolve('cancel');
      });
    });
  }
  
  /**
   * Migra dados existentes para incluir userId
   * Para compatibilidade com dados existentes
   */
  migrateExistingData() {
    const data = this.persistenceAPI.storage.getData();
    if (!data) return false;
    
    let modified = false;
    const currentUserId = this.getCurrentUserId();
    
    if (data.bills) {
      data.bills.forEach(bill => {
        if (!bill.userId) {
          bill.userId = currentUserId;
          modified = true;
        }
      });
    }
    
    if (data.appointments) {
      data.appointments.forEach(appointment => {
        if (!appointment.userId) {
          appointment.userId = currentUserId;
          modified = true;
        }
      });
    }
    
    if (modified) {
      this.persistenceAPI.storage.saveData(data);
    }
    
    return modified;
  }
}