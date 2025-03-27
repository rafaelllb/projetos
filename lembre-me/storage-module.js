/**
 * Módulo para gerenciar operações de armazenamento local
 * Fornece uma API genérica para salvar e recuperar quaisquer dados estruturados
 */
import config from './config.js';

class StorageManager {
  constructor(storageKey = config.app.storageKey) {
    this.storageKey = storageKey;
    this.initializeStorage();
  }

  // Inicializa o armazenamento com valores padrão se necessário
  initializeStorage() {
    try {
      const data = this.getData();
      if (!data) {
        this.resetToDefaultData();
      }
    } catch (error) {
      console.error('Erro na inicialização do armazenamento. Reiniciando com dados padrão:', error);
      this.resetToDefaultData();
    }
  }

  // Reinicia os dados com valores padrão
  resetToDefaultData() {
    // Usar valores de configuração
    const defaultData = config.storage.defaultData;
    this.saveData(defaultData);
    return defaultData;
  }

  // Retorna todos os dados armazenados
  getData() {
    try {
      const storedData = localStorage.getItem(this.storageKey);
      if (!storedData) return null;
      
      return JSON.parse(storedData);
    } catch (error) {
      console.error('Erro ao obter dados do localStorage:', error);
      
      // Tenta recuperar os dados, se possível
      try {
        return this.recoverCorruptedData(localStorage.getItem(this.storageKey));
      } catch (recoveryError) {
        console.error('Não foi possível recuperar os dados. Reiniciando armazenamento:', recoveryError);
        return this.resetToDefaultData();
      }
    }
  }

  // Tenta recuperar dados corrompidos
  recoverCorruptedData(dataString) {
    console.log('Tentando recuperar dados corrompidos...');
    
    if (!dataString) return this.resetToDefaultData();
    
    // Se o conteúdo parece ser corrompido, pode tentar aplicar alguns consertos
    // básicos antes de fazer reset completo
    try {
      // Verificar se é um problema de aspas não escapadas
      const fixedString = dataString
        .replace(/([^\\])(")([^,{\[\]}\s:][^"]*)(")(?=\s*[,}])/g, '$1$2$3$4')
        .replace(/([^\\])":"([^"]*?)\\"/g, '$1":"$2\\\\"')
        .replace(/([^\\])\\(?=[^"])/g, '$1\\\\');
        
      return JSON.parse(fixedString);
    } catch (error) {
      // Se não conseguiu recuperar, reinicia com dados padrão
      console.error('Tentativa de recuperação falhou:', error);
      return this.resetToDefaultData();
    }
  }

  // Salva todos os dados
  saveData(data) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Erro ao salvar dados no localStorage:', error);
      
      // Se for erro de quota, tentar limpar dados menos importantes
      if (error.name === 'QuotaExceededError') {
        return this.handleStorageQuotaExceeded(data);
      }
      
      return false;
    }
  }

  // Trata erro de cota excedida do localStorage
  handleStorageQuotaExceeded(data) {
    console.warn('Cota de armazenamento excedida. Tentando economizar espaço...');
    
    try {
      // Clonar os dados para não modificar o original
      const compressedData = JSON.parse(JSON.stringify(data));
      
      // Usar limites configuráveis para cada tipo de item
      const maxBills = config.storage.maxLocalItems.bills;
      const maxAppointments = config.storage.maxLocalItems.appointments;
      
      // Remover dados menos importantes que podem ser regenerados
      if (compressedData.bills && compressedData.bills.length > maxBills) {
        // Manter só as contas mais recentes
        compressedData.bills = compressedData.bills.slice(-maxBills);
      }
      
      if (compressedData.appointments && compressedData.appointments.length > maxAppointments) {
        // Manter só os compromissos mais recentes
        compressedData.appointments = compressedData.appointments.slice(-maxAppointments);
      }
      
      // Tentar salvar a versão comprimida
      localStorage.setItem(this.storageKey, JSON.stringify(compressedData));
      console.log('Dados comprimidos salvos com sucesso');
      return true;
    } catch (error) {
      console.error('Não foi possível salvar os dados mesmo após compressão:', error);
      
      // Último recurso: limpar tudo e salvar só o essencial
      try {
        localStorage.clear();
        return this.saveData({
          bills: data.bills?.slice(-5) || [],
          appointments: data.appointments?.slice(-5) || [],
          settings: data.settings || {}
        });
      } catch (finalError) {
        console.error('Falha completa ao salvar dados:', finalError);
        return false;
      }
    }
  }

  // Métodos genéricos para manipulação de coleções
  getCollection(collectionName) {
    try {
      const data = this.getData();
      return data?.[collectionName] || [];
    } catch (error) {
      console.error(`Erro ao obter coleção ${collectionName}:`, error);
      return [];
    }
  }

  saveCollection(collectionName, items) {
    try {
      const data = this.getData();
      if (data) {
        data[collectionName] = items;
        return this.saveData(data);
      }
      return false;
    } catch (error) {
      console.error(`Erro ao salvar coleção ${collectionName}:`, error);
      return false;
    }
  }

  // Métodos para manipulação de itens individuais em coleções
  addItem(collectionName, item) {
    try {
      const collection = this.getCollection(collectionName);
      // Gera um ID único para o item se não tiver
      if (!item.id) {
        item.id = Date.now().toString();
      }
      collection.push(item);
      return this.saveCollection(collectionName, collection) ? item : null;
    } catch (error) {
      console.error(`Erro ao adicionar item na coleção ${collectionName}:`, error);
      return null;
    }
  }

  updateItem(collectionName, updatedItem) {
    try {
      const collection = this.getCollection(collectionName);
      const index = collection.findIndex(item => item.id === updatedItem.id);
      
      if (index !== -1) {
        collection[index] = updatedItem;
        return this.saveCollection(collectionName, collection);
      }
      return false;
    } catch (error) {
      console.error(`Erro ao atualizar item na coleção ${collectionName}:`, error);
      return false;
    }
  }

  deleteItem(collectionName, id) {
    try {
      const collection = this.getCollection(collectionName);
      const filteredCollection = collection.filter(item => item.id !== id);
      
      if (filteredCollection.length !== collection.length) {
        return this.saveCollection(collectionName, filteredCollection);
      }
      return false;
    } catch (error) {
      console.error(`Erro ao excluir item da coleção ${collectionName}:`, error);
      return false;
    }
  }

  // Métodos de configuração
  getSettings() {
    try {
      const data = this.getData();
      return data?.settings || {};
    } catch (error) {
      console.error('Erro ao obter configurações:', error);
      return {};
    }
  }

  saveSettings(settings) {
    try {
      const data = this.getData();
      if (data) {
        data.settings = settings;
        return this.saveData(data);
      }
      return false; 
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      return false;
    }
  }

  // Atualiza a data do último backup
  updateLastBackup() {
    try {
      const data = this.getData();
      if (data) {
        data.lastBackup = new Date().toISOString();
        return this.saveData(data);
      }
      return false;
    } catch (error) {
      console.error('Erro ao atualizar data do último backup:', error);
      return false;
    }
  }

  getLastBackup() {
    try {
      const data = this.getData();
      return data?.lastBackup || null;
    } catch (error) {
      console.error('Erro ao obter data do último backup:', error);
      return null;
    }
  }

  // Limpa todos os dados no localStorage
  clearStorage() {
    try {
      localStorage.removeItem(this.storageKey);
      this.initializeStorage();
      return true;
    } catch (error) {
      console.error('Erro ao limpar armazenamento:', error);
      return false;
    }
  }
}

export default StorageManager;