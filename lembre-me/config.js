/**
 * Sistema de Lembretes - Arquivo de Configuração Central
 * 
 * Este arquivo centraliza todas as configurações do sistema para facilitar
 * personalização e manutenção sem necessidade de modificar o código-fonte.
 */

const config = {
  /**
   * Configurações gerais da aplicação
   */
  app: {
    name: "Lembre-me",
    version: "1.0.0",
    description: "Sistema de gerenciamento de contas e compromissos",
    storageKey: "reminderSystem",
    defaultLanguage: "pt-BR",
    dateFormat: "DD/MM/YYYY"
  },

  /**
   * Configurações do Firebase
   */
  firebase: {
    apiKey: "AIzaSyAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    authDomain: "lembre-me-app.firebaseapp.com",
    projectId: "lembre-me-app",
    storageBucket: "lembre-me-app.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef1234567890abcdef"
  },

  /**
   * Configurações de anúncios
   */
  ads: {
    enabled: true,
    defaultNetwork: "adsense",
    adUnits: {
      banner: "ca-pub-XXXXXXXXXXXXXXXX",
      interstitial: "ca-pub-XXXXXXXXXXXXXXXX",
      native: "ca-pub-XXXXXXXXXXXXXXXX"
    },
    footerBannerTimeout: 5000, // ms
    visibilityThreshold: 0.1, // 10% visível para carregar
    interstitialDisplayChance: 0.2, // 20% de chance de mostrar intersticial
    interstitialCountdown: 5, // segundos
    adRefreshInterval: 60000, // 60 segundos
    scriptSources: {
      adsense: "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"
    },
    premium: {
      monthly: {
        price: 1.90,
        label: "Mensal"
      },
      yearly: {
        price: 10.90, 
        label: "Anual",
        savings: "25%"
      }
    },
    freeTierLimits: {
      totalItems: 20 // Limite de 20 itens para usuários gratuitos
    }
  },

  /**
   * Configurações de backup e armazenamento
   */
  storage: {
    autoBackupInterval: 30, // minutos
    backupThreshold: 24 * 60 * 60 * 1000, // 24 horas em ms
    maxBackupsToKeep: 10,
    compressionEnabled: true,
    maxLocalItems: {
      bills: 20,
      appointments: 20
    },
    defaultData: {
      bills: [],
      appointments: [],
      settings: {
        notificationTime: "08:00",
        advanceDays: 3,
        emailNotification: true,
        browserNotification: true
      },
      lastBackup: null
    }
  },

  /**
   * Configurações de notificações
   */
  notifications: {
    defaultReminderTime: "08:00",
    defaultAdvanceDays: 3,
    browserNotificationsEnabled: true,
    emailNotificationsEnabled: true,
    notificationDuration: 5000, // ms
    checkInterval: 30 * 60 * 1000, // 30 minutos
    reminderOptions: [
      { value: "none", label: "Sem lembrete" },
      { value: "15min", label: "15 minutos antes" },
      { value: "30min", label: "30 minutos antes" },
      { value: "1hour", label: "1 hora antes" },
      { value: "1day", label: "1 dia antes" }
    ],
    icons: {
      default: "/favicon.ico",
      badge: "/badge-icon.png"
    }
  },

  /**
   * Configurações de UI
   */
  ui: {
    itemsPerPage: 5,
    maxDisplayedItems: {
      dashboard: 5,
      list: 10,
      calendar: 31
    },
    animations: {
      enabled: true,
      duration: 300, // ms
      fadeOutDuration: 300 // ms para animações de desaparecimento
    },
    theme: {
      primary: "#7a67ee",
      primaryLight: "#9d8cff",
      primaryDark: "#5b43d6",
      secondary: "#33d2bc",
      secondaryLight: "#5ff7e0",
      secondaryDark: "#27a08d",
      success: "#48bb78",
      successLight: "rgba(72, 187, 120, 0.2)",
      warning: "#ed8936",
      warningLight: "rgba(237, 137, 54, 0.2)",
      danger: "#e53e3e",
      dangerLight: "rgba(229, 62, 62, 0.2)",
      info: "#4299e1",
      infoLight: "rgba(66, 153, 225, 0.2)",
      background: "linear-gradient(135deg, #2b2b58 0%, #16213E 100%)",
      glassBg: "rgba(255, 255, 255, 0.1)",
      glassBgDark: "rgba(30, 30, 60, 0.3)",
      glassBorder: "rgba(255, 255, 255, 0.12)",
      textLight: "#ffffff",
      textLightMuted: "rgba(255, 255, 255, 0.8)",
      textDark: "#2d3748",
      textMuted: "#718096"
    },
    layout: {
      sidebarWidth: 250,
      navbarHeight: 80,
      mobileBreakpoint: 992,
      smallScreenBreakpoint: 576
    }
  },

  /**
   * Configurações de formatação de data e tempo
   */
  dateTime: {
    monthNames: [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ],
    dayNames: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
    timeFormat: "HH:mm"
  },

  /**
   * Configurações de categorias
   */
  categories: {
    bills: [
      { value: "moradia", label: "Moradia", icon: "fa-home" },
      { value: "transporte", label: "Transporte", icon: "fa-car" },
      { value: "alimentação", label: "Alimentação", icon: "fa-utensils" },
      { value: "saúde", label: "Saúde", icon: "fa-heartbeat" },
      { value: "educação", label: "Educação", icon: "fa-graduation-cap" },
      { value: "lazer", label: "Lazer", icon: "fa-gamepad" },
      { value: "outros", label: "Outros", icon: "fa-box" }
    ],
    appointments: [
      { value: "pessoal", label: "Pessoal", icon: "fa-user" },
      { value: "trabalho", label: "Trabalho", icon: "fa-briefcase" },
      { value: "saúde", label: "Saúde", icon: "fa-heartbeat" },
      { value: "lazer", label: "Lazer", icon: "fa-gamepad" },
      { value: "outros", label: "Outros", icon: "fa-sticky-note" }
    ]
  },

  /**
   * Configurações de recorrência
   */
  recurrence: {
    options: [
      { value: "none", label: "Não se repete" },
      { value: "monthly", label: "Mensal" },
      { value: "bimonthly", label: "Bimestral" },
      { value: "quarterly", label: "Trimestral" },
      { value: "yearly", label: "Anual" }
    ]
  },

  /**
   * Configurações de status
   */
  status: {
    bills: {
      pending: { value: "pending", label: "Pendente" },
      paid: { value: "paid", label: "Pago" },
      late: { value: "late", label: "Atrasado" }
    },
    appointments: {
      soon: { value: "soon", label: "Em breve", thresholdHours: 3 },
      today: { value: "today", label: "Hoje" },
      past: { value: "past", label: "Passado" },
      future: { value: "future", label: "Futuro" }
    }
  },

  /**
   * Configurações do service worker
   */
  serviceWorker: {
    cacheName: "reminders-app-v1",
    checkInterval: 30 * 60 * 1000, // 30 minutos
    enabled: true,
    registrationPath: "/lembre-me/service-worker.js",
    indexedDBName: "RemindersBackup",
    indexedDBVersion: 1,
    indexedDBStore: "data",
    backupInterval: 5 * 60 * 1000 // 5 minutos
  }
};

// Funções auxiliares para acessar configurações
const configHelper = {
  /**
   * Obtém um valor de configuração pelo caminho 
   * @param {String} path - Caminho para a configuração, ex: "ui.theme.primary"
   * @param {any} defaultValue - Valor padrão se a configuração não existir
   * @returns {any} - Valor da configuração ou valor padrão
   */
  get(path, defaultValue = null) {
    const keys = path.split('.');
    let result = config;
    
    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = result[key];
      } else {
        return defaultValue;
      }
    }
    
    return result;
  },
  
  /**
   * Mescla configurações customizadas com as configurações padrão
   * @param {Object} customConfig - Configurações personalizadas
   */
  merge(customConfig) {
    function deepMerge(target, source) {
      for (const key in source) {
        if (source.hasOwnProperty(key)) {
          if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            // Se for um objeto e não um array, mescla recursivamente
            target[key] = target[key] || {};
            deepMerge(target[key], source[key]);
          } else {
            // Caso contrário, substitui o valor
            target[key] = source[key];
          }
        }
      }
      return target;
    }
    
    return deepMerge(config, customConfig);
  }
};

// Exporta a configuração e os helpers
export { config as default, configHelper };