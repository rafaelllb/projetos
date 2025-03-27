/**
 * Módulo para integração com Firebase
 * Gerencia autenticação e operações de backup/restauração
 */
import CompressionManager from './compression-module.js';

class FirebaseManager {
  constructor() {
    this.compression = new CompressionManager();
    this.auth = null;
    this.db = null;
    this.storage = null;
    this.user = null;
    this.initialized = false;
  }

  /**
   * Inicializa o Firebase com a configuração fornecida
   */
  async initialize() {
    if (this.initialized) return true;

    try {
      // Carrega os módulos necessários do Firebase
      const { initializeApp } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js');
      const { getAuth, onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js');
      const { getFirestore } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
      const { getStorage } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js');
      
      // Configuração do Firebase
      const firebaseConfig = {
        apiKey: "AIzaSyAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        authDomain: "lembre-me-app.firebaseapp.com",
        projectId: "lembre-me-app",
        storageBucket: "lembre-me-app.appspot.com",
        messagingSenderId: "123456789012",
        appId: "1:123456789012:web:abcdef1234567890abcdef"
      };
      
      // Inicializa o Firebase
      const app = initializeApp(firebaseConfig);
      this.auth = getAuth(app);
      this.db = getFirestore(app);
      this.storage = getStorage(app);
      
      // Verifica o estado de autenticação atual
      return new Promise((resolve) => {
        onAuthStateChanged(this.auth, (user) => {
          this.user = user;
          this.initialized = true;
          resolve(true);
        });
      });
    } catch (error) {
      console.error('Erro ao inicializar Firebase:', error);
      return false;
    }
  }

  /**
   * Registra um novo usuário com email e senha
   */
  async registerUser(email, password, nome) {
    if (!this.initialized) await this.initialize();
    
    try {
      const { createUserWithEmailAndPassword, updateProfile } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js');
      
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      
      // Atualiza o perfil do usuário com o nome
      await updateProfile(userCredential.user, {
        displayName: nome
      });
      
      this.user = userCredential.user;
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('Erro ao registrar usuário:', error);
      return { success: false, error: this._getErrorMessage(error) };
    }
  }

  /**
   * Realiza login com email e senha
   */
  async loginUser(email, password) {
    if (!this.initialized) await this.initialize();
    
    try {
      const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js');
      
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      this.user = userCredential.user;
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      return { success: false, error: this._getErrorMessage(error) };
    }
  }

  /**
   * Realiza logout
   */
  async logoutUser() {
    if (!this.initialized) await this.initialize();
    
    try {
      const { signOut } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js');
      
      await signOut(this.auth);
      this.user = null;
      return { success: true };
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Realiza backup dos dados no Firebase
   */
  async backupData(data) {
    if (!this.initialized) await this.initialize();
    if (!this.user) return { success: false, error: 'Usuário não autenticado' };
    
    try {
      const { doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
      
      // Comprime os dados para reduzir tamanho
      const compressedData = this.compression.compressData(data);
      
      // Cria um registro de backup
      const backupRef = doc(this.db, 'backups', this.user.uid);
      
      await setDoc(backupRef, {
        data: compressedData,
        timestamp: serverTimestamp(),
        userId: this.user.uid,
        email: this.user.email
      });
      
      // Também armazena versões históricas (mantém histórico)
      const backupHistoryRef = doc(this.db, 'backup_history', `${this.user.uid}_${Date.now()}`);
      
      await setDoc(backupHistoryRef, {
        data: compressedData,
        timestamp: serverTimestamp(),
        userId: this.user.uid
      });
      
      return { 
        success: true, 
        timestamp: new Date().toISOString(),
        compressionRate: this.compression.getCompressionRate(data, compressedData)
      };
    } catch (error) {
      console.error('Erro ao fazer backup:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Restaura dados do último backup
   */
  async restoreData() {
    if (!this.initialized) await this.initialize();
    if (!this.user) return { success: false, error: 'Usuário não autenticado' };
    
    try {
      const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
      
      // Obtém o backup mais recente
      const backupRef = doc(this.db, 'backups', this.user.uid);
      const backupSnap = await getDoc(backupRef);
      
      if (!backupSnap.exists()) {
        return { success: false, error: 'Nenhum backup encontrado' };
      }
      
      const backupData = backupSnap.data();
      const decompressedData = this.compression.decompressData(backupData.data);
      
      return { 
        success: true, 
        data: decompressedData,
        timestamp: backupData.timestamp?.toDate?.() || new Date()
      };
    } catch (error) {
      console.error('Erro ao restaurar dados:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtém lista de backups históricos do usuário
   */
  async getBackupHistory(limit = 10) {
    if (!this.initialized) await this.initialize();
    if (!this.user) return { success: false, error: 'Usuário não autenticado' };
    
    try {
      const { collection, query, where, orderBy, limit: limitQuery, getDocs } = 
        await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
      
      const backupsRef = collection(this.db, 'backup_history');
      const q = query(
        backupsRef,
        where('userId', '==', this.user.uid),
        orderBy('timestamp', 'desc'),
        limitQuery(limit)
      );
      
      const querySnapshot = await getDocs(q);
      const backups = [];
      
      querySnapshot.forEach(doc => {
        const data = doc.data();
        backups.push({
          id: doc.id,
          timestamp: data.timestamp?.toDate?.() || new Date(),
          size: data.data.length
        });
      });
      
      return { success: true, backups };
    } catch (error) {
      console.error('Erro ao obter histórico de backups:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Restaura dados de um backup específico pelo ID
   */
  async restoreFromBackupId(backupId) {
    if (!this.initialized) await this.initialize();
    if (!this.user) return { success: false, error: 'Usuário não autenticado' };
    
    try {
      const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
      
      const backupRef = doc(this.db, 'backup_history', backupId);
      const backupSnap = await getDoc(backupRef);
      
      if (!backupSnap.exists()) {
        return { success: false, error: 'Backup não encontrado' };
      }
      
      const backupData = backupSnap.data();
      
      // Verifica se o backup pertence ao usuário atual
      if (backupData.userId !== this.user.uid) {
        return { success: false, error: 'Acesso negado a este backup' };
      }
      
      const decompressedData = this.compression.decompressData(backupData.data);
      
      return { 
        success: true, 
        data: decompressedData,
        timestamp: backupData.timestamp?.toDate?.() || new Date()
      };
    } catch (error) {
      console.error('Erro ao restaurar dados de backup específico:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Retorna mensagens de erro amigáveis baseadas nos códigos do Firebase
   * @private
   */
  _getErrorMessage(error) {
    const errorCode = error?.code || '';
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'Este e-mail já está sendo utilizado por outra conta.';
      case 'auth/invalid-email':
        return 'O formato do e-mail é inválido.';
      case 'auth/user-not-found':
        return 'Usuário não encontrado.';
      case 'auth/wrong-password':
        return 'Senha incorreta.';
      case 'auth/weak-password':
        return 'A senha é muito fraca. Use pelo menos 6 caracteres.';
      case 'auth/network-request-failed':
        return 'Falha na conexão. Verifique sua internet.';
      default:
        return error.message || 'Ocorreu um erro desconhecido.';
    }
  }

  /**
   * Verifica se o usuário está autenticado
   */
  isUserLoggedIn() {
    return !!this.user;
  }

  /**
   * Obtém informações do usuário atual
   */
  getCurrentUser() {
    return this.user ? {
      uid: this.user.uid,
      email: this.user.email,
      displayName: this.user.displayName
    } : null;
  }
}

export default FirebaseManager;