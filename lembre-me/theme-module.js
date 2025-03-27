/**
 * Módulo de gerenciamento de temas e estilos visuais
 * 
 * Este módulo permite centralizar a gestão de cores, fontes e elementos visuais
 * com base nas configurações globais
 */
import config from './config.js';

export class ThemeManager {
  constructor() {
    // Variáveis CSS definidas dinamicamente a partir da configuração
    this.cssVariables = this._generateCSSVariables();
  }
  
  /**
   * Inicializa o tema da aplicação
   */
  initializeTheme() {
    // Aplicar variáveis CSS ao elemento :root
    this._applyCSSVariables();
    
    // Adicionar estilos dinâmicos
    this._addDynamicStyles();
  }
  
  /**
   * Gera variáveis CSS a partir das configurações
   * @private
   */
  _generateCSSVariables() {
    const { theme } = config.ui;
    
    return {
      // Cores primárias
      '--primary-color': theme.primary,
      '--primary-light': theme.primaryLight,
      '--primary-dark': theme.primaryDark,
      
      // Cores secundárias
      '--secondary-color': theme.secondary,
      '--secondary-light': theme.secondaryLight,
      '--secondary-dark': theme.secondaryDark,
      
      // Cores de background e texto
      '--bg-gradient': theme.background,
      '--glass-bg': theme.glassBg,
      '--glass-bg-dark': theme.glassBgDark,
      '--glass-border': theme.glassBorder,
      '--glass-shadow': '0 8px 32px rgba(0, 0, 0, 0.2)',
      
      '--text-light': theme.textLight,
      '--text-light-muted': theme.textLightMuted,
      '--text-dark': theme.textDark,
      '--text-muted': theme.textMuted,
      
      // Cores de status
      '--success-color': theme.success,
      '--success-light': theme.successLight,
      '--warning-color': theme.warning,
      '--warning-light': theme.warningLight,
      '--danger-color': theme.danger,
      '--danger-light': theme.dangerLight,
      '--info-color': theme.info,
      '--info-light': theme.infoLight,
      
      // Sombras e efeitos
      '--shadow-sm': '0 2px 8px rgba(0, 0, 0, 0.1)',
      '--shadow': '0 4px 12px rgba(0, 0, 0, 0.15)',
      '--shadow-md': '0 6px 15px rgba(0, 0, 0, 0.2)',
      '--shadow-lg': '0 8px 25px rgba(0, 0, 0, 0.25)',
      
      '--glass-blur': 'blur(10px)',
      '--border-radius-sm': '8px',
      '--border-radius': '12px',
      '--border-radius-lg': '16px',
      '--border-color': 'rgba(255, 255, 255, 0.1)',
      
      // Layout
      '--sidebar-width': `${config.ui.layout.sidebarWidth}px`,
      '--navbar-height': `${config.ui.layout.navbarHeight}px`,
      '--mobile-breakpoint': `${config.ui.layout.mobileBreakpoint}px`,
      '--small-screen-breakpoint': `${config.ui.layout.smallScreenBreakpoint}px`,
      
      // Animações
      '--animation-duration': `${config.ui.animations.duration}ms`,
      '--fadeout-duration': `${config.ui.animations.fadeOutDuration}ms`
    };
  }
  
  /**
   * Aplica as variáveis CSS ao elemento :root
   * @private
   */
  _applyCSSVariables() {
    const root = document.documentElement;
    
    Object.entries(this.cssVariables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }
  
  /**
   * Adiciona estilos dinâmicos com base na configuração
   * @private
   */
  _addDynamicStyles() {
    const style = document.createElement('style');
    
    // Personalização de responsividade
    style.textContent = `
      /* Estilos dinâmicos baseados na configuração */
      @media (max-width: ${config.ui.layout.mobileBreakpoint}px) {
        #sidebar {
          position: fixed;
          z-index: 1000;
          left: -${config.ui.layout.sidebarWidth}px;
          transition: left 0.3s ease-in-out;
        }
        
        #sidebar.active {
          left: 0;
          box-shadow: var(--shadow-lg);
        }
        
        #content {
          width: 100%;
          margin-left: 0;
        }
      }
      
      @media (max-width: ${config.ui.layout.smallScreenBreakpoint}px) {
        .view-option span {
          display: none;
        }
        
        .view-option i {
          margin-right: 0;
          font-size: 18px;
        }
        
        .grid-container {
          grid-template-columns: 1fr;
        }
        
        .user-profile span {
          display: none;
        }
      }
      
      /* Animações configuráveis */
      ${config.ui.animations.enabled ? `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { transform: translateY(50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        .card, .reminder-item, .calendar-day {
          animation: fadeInUp ${config.ui.animations.duration}ms ease-out;
          animation-fill-mode: both;
        }
        
        .notification.fade-out {
          animation: fadeOut ${config.ui.animations.fadeOutDuration}ms ease-out forwards;
        }
      ` : '/* Animações desabilitadas */'}
    `;
    
    document.head.appendChild(style);
  }
  
  /**
   * Aplica um tema personalizado
   * @param {Object} customTheme - Cores personalizadas para o tema
   */
  applyCustomTheme(customTheme) {
    const { theme } = config.ui;
    const updatedTheme = { ...theme, ...customTheme };
    
    // Atualizar as variáveis CSS com o novo tema
    const root = document.documentElement;
    
    if (customTheme.primary) {
      root.style.setProperty('--primary-color', customTheme.primary);
    }
    
    if (customTheme.secondary) {
      root.style.setProperty('--secondary-color', customTheme.secondary);
    }
    
    // Atualizar outras propriedades relacionadas conforme necessário
    Object.entries(customTheme).forEach(([key, value]) => {
      const cssVariable = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      root.style.setProperty(cssVariable, value);
    });
  }
}

// Cria uma instância única exportável
const themeManager = new ThemeManager();
export default themeManager;