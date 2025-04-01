// /frontend/service-worker.js
// Service Worker para funcionalidades offline e cache

const CACHE_NAME = 'fincontrol-cache-v1';
const OFFLINE_URL = '/offline.html';

// Recursos a serem cacheados para funcionamento offline
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/offline.html',
  '/css/normalize.css',
  '/css/main.css',
  '/css/components.css',
  '/css/dashboard.css',
  '/css/auth.css',
  '/js/app.js',
  '/js/router.js',
  '/js/storage/storage-manager.js',
  '/js/auth/auth-manager.js',
  '/js/ui/ui-manager.js',
  '/js/transactions/transaction-manager.js',
  '/js/dashboard/dashboard-manager.js',
  '/js/utils/currency-utils.js',
  '/js/utils/date-utils.js',
  '/js/utils/validation-utils.js',
  '/js/utils/sanitize-utils.js',
  '/js/components/transaction-chart.js',
  '/manifest.json',
  '/images/icons/icon-72x72.png',
  '/images/icons/icon-96x96.png',
  '/images/icons/icon-128x128.png',
  '/images/icons/icon-144x144.png',
  '/images/icons/icon-152x152.png',
  '/images/icons/icon-192x192.png',
  '/images/icons/icon-384x384.png',
  '/images/icons/icon-512x512.png',
  '/images/icons/maskable-icon.png',
  '/images/icons/transaction.png',
  '/images/icons/dashboard.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Instalando...');
  
  // Pré-cachear recursos essenciais
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Cacheando recursos');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        console.log('[Service Worker] Instalado com sucesso');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[Service Worker] Erro ao cachear recursos:', error);
      })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Ativando...');
  
  // Limpar caches antigos
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Excluindo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Ativado e controlando a página');
      return self.clients.claim();
    })
  );
});

// Interceptação de requisições
self.addEventListener('fetch', (event) => {
  // Ignorar requisições para o backend/API
  if (event.request.url.includes('/api/')) {
    return;
  }

  // Estratégia: Cache com fallback para rede, e offline page como último recurso
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Retornar do cache se existir
        if (cachedResponse) {
          return cachedResponse;
        }

        // Se não estiver no cache, buscar da rede
        return fetch(event.request)
          .then((response) => {
            // Verificar se a resposta é válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clonar a resposta para cachear e retornar
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch((error) => {
            console.error('[Service Worker] Erro de fetch:', error);
            
            // Se for uma requisição para uma página HTML, mostrar página offline
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
            
            // Para outros recursos, retornar um erro
            return new Response('Não foi possível conectar ao servidor.', {
              status: 503,
              statusText: 'Serviço indisponível',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Lidar com sincronização em segundo plano
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-transactions') {
    event.waitUntil(syncTransactions());
  } else if (event.tag === 'sync-settings') {
    event.waitUntil(syncSettings());
  }
});

// Sincronizar transações pendentes com o servidor
async function syncTransactions() {
  try {
    const db = await openDatabase();
    const pendingTransactions = await getPendingTransactions(db);
    
    if (pendingTransactions.length === 0) {
      return;
    }
    
    console.log('[Service Worker] Sincronizando transações pendentes:', pendingTransactions.length);
    
    for (const transaction of pendingTransactions) {
      try {
        const response = await fetch('/api/transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${transaction.authToken}`
          },
          body: JSON.stringify(transaction.data)
        });
        
        if (response.ok) {
          // Remover transação da lista de pendentes
          await markTransactionSynced(db, transaction.id);
          console.log('[Service Worker] Transação sincronizada com sucesso:', transaction.id);
        } else {
          console.error('[Service Worker] Erro ao sincronizar transação:', transaction.id);
        }
      } catch (error) {
        console.error('[Service Worker] Erro na sincronização da transação:', transaction.id, error);
      }
    }
  } catch (error) {
    console.error('[Service Worker] Erro na sincronização:', error);
  }
}

// Sincronizar configurações do usuário
async function syncSettings() {
  try {
    const db = await openDatabase();
    const pendingSettings = await getPendingSettings(db);
    
    if (pendingSettings.length === 0) {
      return;
    }
    
    console.log('[Service Worker] Sincronizando configurações pendentes');
    
    // Obter configurações mais recentes
    const settings = pendingSettings[0];
    
    const response = await fetch('/api/user/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.authToken}`
      },
      body: JSON.stringify(settings.data)
    });
    
    if (response.ok) {
      await clearPendingSettings(db);
      console.log('[Service Worker] Configurações sincronizadas com sucesso');
    } else {
      console.error('[Service Worker] Erro ao sincronizar configurações');
    }
  } catch (error) {
    console.error('[Service Worker] Erro na sincronização de configurações:', error);
  }
}

// Funções auxiliares para manipulação do IndexedDB
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('FinControlSync', 1);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('pendingTransactions')) {
        db.createObjectStore('pendingTransactions', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('pendingSettings')) {
        db.createObjectStore('pendingSettings', { keyPath: 'id' });
      }
    };
    
    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
    
    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

function getPendingTransactions(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingTransactions'], 'readonly');
    const store = transaction.objectStore('pendingTransactions');
    const request = store.getAll();
    
    request.onsuccess = () => {
      resolve(request.result);
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}

function markTransactionSynced(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingTransactions'], 'readwrite');
    const store = transaction.objectStore('pendingTransactions');
    const request = store.delete(id);
    
    request.onsuccess = () => {
      resolve();
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}

function getPendingSettings(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingSettings'], 'readonly');
    const store = transaction.objectStore('pendingSettings');
    const request = store.getAll();
    
    request.onsuccess = () => {
      resolve(request.result);
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}

function clearPendingSettings(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingSettings'], 'readwrite');
    const store = transaction.objectStore('pendingSettings');
    const request = store.clear();
    
    request.onsuccess = () => {
      resolve();
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Lidar com notificações push
self.addEventListener('push', (event) => {
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: '/images/icons/icon-192x192.png',
    badge: '/images/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url
    },
    actions: [
      {
        action: 'view',
        title: 'Visualizar'
      },
      {
        action: 'close',
        title: 'Fechar'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Lidar com cliques em notificações
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const action = event.action;
  
  notification.close();
  
  if (action === 'close') {
    return;
  }
  
  // Ao clicar na notificação, abrir a URL especificada ou a página principal
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then((clientList) => {
        const url = notification.data.url || '/';
        
        // Verificar se já existe uma janela aberta e focar nela
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Se não encontrar janela aberta, abrir uma nova
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});