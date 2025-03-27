// Service Worker para o sistema de lembretes
const CACHE_NAME = 'reminders-app-v1';
const CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutos em milissegundos

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Força ativação imediata
  console.log('Service Worker instalado');
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker ativado');
  
  // Iniciar verificação periódica de lembretes
  if (self.registration.periodicSync) {
    // Usar Periodic Background Sync se disponível (mais eficiente)
    event.waitUntil(
      self.registration.periodicSync.register('check-reminders', {
        minInterval: CHECK_INTERVAL
      })
    );
  } else {
    // Fallback para setInterval se periodic sync não for suportado
    setInterval(() => {
      checkReminders();
    }, CHECK_INTERVAL);
  }
});

// Lidar com sincronização periódica
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-reminders') {
    event.waitUntil(checkReminders());
  }
});

// Verificar lembretes no localStorage
async function checkReminders() {
  try {
    console.log('Verificando lembretes...');
    
    const now = new Date();
    const storageKey = 'reminderSystem';
    
    // Abrir IndexedDB ou localStorage
    const storageData = await getStorageData(storageKey);
    
    if (!storageData) {
      console.log('Nenhum dado encontrado no armazenamento');
      return;
    }
    
    // Verificar compromissos
    if (storageData.appointments && Array.isArray(storageData.appointments)) {
      checkAppointments(storageData.appointments, now);
    }
    
    // Verificar contas a pagar
    if (storageData.bills && Array.isArray(storageData.bills)) {
      checkBills(storageData.bills, now);
    }
    
  } catch (error) {
    console.error('Erro ao verificar lembretes:', error);
  }
}

// Obter dados do localStorage
async function getStorageData(key) {
  try {
    // No Service Worker, podemos acessar localStorage apenas através de clients
    const clients = await self.clients.matchAll();
    
    if (clients.length > 0) {
      // Se houver algum client ativo, vamos pedir para ele ler o localStorage
      const client = clients[0];
      
      // Criamos uma promessa para aguardar a resposta
      return new Promise((resolve) => {
        // Listener temporário para mensagem de resposta
        const messageListener = (event) => {
          if (event.data && event.data.type === 'storage-data') {
            self.removeEventListener('message', messageListener);
            resolve(event.data.data);
          }
        };
        
        self.addEventListener('message', messageListener);
        
        // Solicitar dados ao client
        client.postMessage({
          type: 'get-storage-data',
          key: key
        });
        
        // Timeout para caso não haja resposta
        setTimeout(() => {
          self.removeEventListener('message', messageListener);
          resolve(null);
        }, 3000);
      });
    }
    
    // Se não houver clients, tentar ler diretamente do IndexedDB
    return await readFromIndexedDB(key);
    
  } catch (error) {
    console.error('Erro ao obter dados:', error);
    return null;
  }
}

// Ler dados do IndexedDB como fallback
async function readFromIndexedDB(key) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('RemindersBackup', 1);
    
    request.onerror = (event) => {
      reject('Erro ao abrir IndexedDB');
    };
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['data'], 'readonly');
      const objectStore = transaction.objectStore('data');
      const dataRequest = objectStore.get(key);
      
      dataRequest.onsuccess = (event) => {
        if (dataRequest.result) {
          resolve(dataRequest.result);
        } else {
          resolve(null);
        }
      };
      
      dataRequest.onerror = (event) => {
        reject('Erro ao ler dados do IndexedDB');
      };
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      db.createObjectStore('data', { keyPath: 'id' });
    };
  });
}

// Obter o ID do usuário ativo ou anônimo
async function getCurrentUserId() {
  try {
    // Tentar obter ID anônimo do localStorage
    let anonymousId = await getFromLocalStorage('anonymousUserId');
    
    // Se não tiver ID anônimo, criar um
    if (!anonymousId) {
      anonymousId = 'anonymous_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    // Verificar se há um usuário autenticado
    const clients = await self.clients.matchAll();
    if (clients.length > 0) {
      const client = clients[0];
      
      return new Promise((resolve) => {
        const messageListener = (event) => {
          if (event.data && event.data.type === 'user-id-response') {
            self.removeEventListener('message', messageListener);
            resolve(event.data.userId || anonymousId);
          }
        };
        
        self.addEventListener('message', messageListener);
        
        client.postMessage({
          type: 'get-current-user-id'
        });
        
        setTimeout(() => {
          self.removeEventListener('message', messageListener);
          resolve(anonymousId);
        }, 1000);
      });
    }
    
    return anonymousId;
  } catch (error) {
    console.error('Erro ao obter ID do usuário:', error);
    return null;
  }
}

// Obter valor do localStorage
async function getFromLocalStorage(key) {
  const clients = await self.clients.matchAll();
  if (clients.length === 0) return null;
  
  const client = clients[0];
  
  return new Promise((resolve) => {
    const messageListener = (event) => {
      if (event.data && event.data.type === 'localStorage-value') {
        self.removeEventListener('message', messageListener);
        resolve(event.data.value);
      }
    };
    
    self.addEventListener('message', messageListener);
    
    client.postMessage({
      type: 'get-localStorage-value',
      key: key
    });
    
    setTimeout(() => {
      self.removeEventListener('message', messageListener);
      resolve(null);
    }, 1000);
  });
}

// Verificar compromissos próximos
async function checkAppointments(appointments, now) {
  const userId = await getCurrentUserId();
  
  if (!userId) return;
  
  // Filtrar compromissos do usuário atual
  const userAppointments = appointments.filter(appointment => 
    !appointment.userId || appointment.userId === userId);
  
  userAppointments.forEach(appointment => {
    try {
      const appointmentDate = new Date(`${appointment.date}T${appointment.time}`);
      
      // Determinar o tempo antecipado para notificação com base na configuração
      let reminderTime = getNotificationTime(appointment.reminder, appointmentDate);
      
      // Se a hora atual estiver dentro da janela de notificação (últimos 5 minutos)
      if (now >= reminderTime && now <= new Date(reminderTime.getTime() + 5 * 60 * 1000)) {
        // Evitar múltiplas notificações para o mesmo compromisso
        const notificationId = `appointment-${appointment.id}`;
        
        // Mostrar notificação
        self.registration.showNotification('Lembrete de Compromisso', {
          body: `${appointment.title} às ${appointment.time}${appointment.location ? ` em ${appointment.location}` : ''}`,
          icon: '/favicon.ico',
          badge: '/badge-icon.png',
          tag: notificationId,
          requireInteraction: true,
          data: {
            id: appointment.id,
            type: 'appointment',
            url: self.location.origin
          }
        });
      }
    } catch (error) {
      console.error('Erro ao processar compromisso:', error);
    }
  });
}

// Verificar contas próximas do vencimento
async function checkBills(bills, now) {
  const userId = await getCurrentUserId();
  
  if (!userId) return;
  
  // Filtrar contas do usuário atual
  const userBills = bills.filter(bill => 
    !bill.userId || bill.userId === userId);
  
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  userBills.forEach(bill => {
    try {
      if (bill.status === 'pending') {
        const dueDate = new Date(`${bill.dueDate}T00:00:00`);
        const daysUntilDue = Math.ceil((dueDate - today) / (24 * 60 * 60 * 1000));
        
        // Notificar se vence hoje ou amanhã
        if (daysUntilDue === 0 || daysUntilDue === 1) {
          const notificationId = `bill-${bill.id}`;
          
          self.registration.showNotification('Conta Próxima do Vencimento', {
            body: `${bill.title} - R$ ${bill.amount.toFixed(2)} - Vence ${daysUntilDue === 0 ? 'hoje' : 'amanhã'}`,
            icon: '/favicon.ico',
            badge: '/badge-icon.png',
            tag: notificationId,
            requireInteraction: true,
            data: {
              id: bill.id,
              type: 'bill',
              url: self.location.origin
            }
          });
        }
      }
    } catch (error) {
      console.error('Erro ao processar conta:', error);
    }
  });
}

// Calcular tempo de notificação com base na configuração
function getNotificationTime(reminderSetting, appointmentDate) {
  let minutesBefore = 0;
  
  switch (reminderSetting) {
    case '15min':
      minutesBefore = 15;
      break;
    case '30min':
      minutesBefore = 30;
      break;
    case '1hour':
      minutesBefore = 60;
      break;
    case '1day':
      minutesBefore = 24 * 60;
      break;
    default:
      minutesBefore = 15; // Padrão: 15 minutos antes
  }
  
  return new Date(appointmentDate.getTime() - (minutesBefore * 60 * 1000));
}

// Lidar com cliques nas notificações
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const data = event.notification.data;
  
  if (data && data.url) {
    // Abrir a aplicação quando clicar na notificação
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        // Verificar se já existe uma janela aberta
        for (const client of clientList) {
          if (client.url === data.url && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Caso contrário, abrir uma nova
        if (clients.openWindow) {
          return clients.openWindow(data.url);
        }
      })
    );
  }
});

// Lidar com mensagens do cliente (página web)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'check-reminders-now') {
    checkReminders();
  }
  
  if (event.data && event.data.type === 'get-localStorage-value') {
    const key = event.data.key;
    
    // Responder com o valor do localStorage
    event.source.postMessage({
      type: 'localStorage-value',
      key: key,
      value: localStorage.getItem(key)
    });
  }
});