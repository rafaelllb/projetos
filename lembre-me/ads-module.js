/**
 * Módulo de gerenciamento de anúncios
 * Controla a exibição, configuração e integração de anúncios
 */
import config, { configHelper } from './config.js';

export class AdsManager {
  constructor(persistenceAPI) {
    this.persistenceAPI = persistenceAPI;
    this.adsEnabled = config.ads.enabled;
    this.adNetwork = config.ads.defaultNetwork;
    this.adUnits = config.ads.adUnits;
    this.adSlots = [];
    this.premiumUser = false;
    this.adsLoaded = false;
    this.footerTimeoutId = null;
    this.adObserver = null;
    
    // Inicializar configurações
    this.initializeSettings();
  }
  
  /**
   * Inicializa as configurações de anúncios
   */
  initializeSettings() {
    // Carregar configurações do persistenceAPI
    const settings = this.persistenceAPI.getSettings();
    
    if (settings && settings.adsSettings) {
      this.adsEnabled = settings.adsSettings.enabled !== false;
      this.premiumUser = settings.adsSettings.premiumUser === true;
    }
    
    // Verificar se o usuário é premium
    if (this.premiumUser) {
      this.adsEnabled = false; // Desabilita anúncios para usuários premium
    }
  }
  
  /**
   * Inicializa os scripts da rede de anúncios
   */
  initializeAdNetwork() {
    if (!this.adsEnabled) {
      this.removeAdContainers(); // Remove containers de anúncios para usuários premium
      return false;
    }
    
    try {
      switch (this.adNetwork) {
        case 'adsense':
          this.initializeAdSense();
          break;
        default:
          console.warn('Rede de anúncios não suportada');
          return false;
      }
      return true;
    } catch (error) {
      console.error('Erro ao inicializar rede de anúncios:', error);
      return false;
    }
  }
  
  /**
   * Inicializa Google AdSense
   */
  initializeAdSense() {
    // Adiciona o script do AdSense ao documento
    const adScript = document.createElement('script');
    adScript.src = config.ads.scriptSources.adsense;
    adScript.async = true;
    adScript.setAttribute('data-ad-client', this.adUnits.banner);
    document.head.appendChild(adScript);
    
    // Evento para quando AdSense estiver carregado
    adScript.onload = () => {
      this.adsLoaded = true;
      // Configurar observador para carregar anúncios quando visíveis
      this.setupVisibilityObserver();
      // Carregar anúncios visíveis com delay para garantir que DOM está pronto
      setTimeout(() => this.loadVisibleAds(), 1000);
    };
  }
  
  /**
   * Configura um observador para carregar anúncios quando containers ficam visíveis
   */
  setupVisibilityObserver() {
    if ('IntersectionObserver' in window) {
      // Criar um observador para detectar quando elementos são visíveis
      this.adObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const contentId = entry.target.querySelector('.ad-content')?.id;
            if (contentId) {
              const contentElement = document.getElementById(contentId);
              if (contentElement && !contentElement.querySelector('.adsbygoogle')) {
                this.loadAdInElement(contentElement);
              }
            }
            // Parar de observar depois de carregar
            this.adObserver.unobserve(entry.target);
          }
        });
      }, {
        threshold: config.ads.visibilityThreshold // Configurável: % visível para iniciar carregamento
      });
    }
  }
  
  /**
   * Carrega anúncios nos containers atualmente visíveis
   */
  loadVisibleAds() {
    if (!this.adsEnabled || !this.adsLoaded) return;
    
    this.adSlots.forEach(slotId => {
      const container = document.getElementById(slotId);
      if (container) {
        // Verificar se o container está visível no DOM
        if (this.isVisible(container)) {
          const adElement = document.getElementById(`${slotId}-content`);
          if (adElement && !adElement.querySelector('.adsbygoogle')) {
            this.loadAdInElement(adElement);
          }
        } else if (this.adObserver) {
          // Se não for visível, observar para carregar quando ficar visível
          this.adObserver.observe(container);
        }
      }
    });
  }
  
  /**
   * Verifica se um elemento está visível na página
   */
  isVisible(element) {
    if (!element) return false;
    
    // Verificar se o elemento tem dimensões
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;
    
    // Verificar se é visível no viewport
    const viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);
    if (!(rect.bottom < 0 || rect.top - viewHeight >= 0)) {
      // Verificar se não está escondido por CSS
      const style = window.getComputedStyle(element);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    }
    
    return false;
  }
  
  /**
   * Cria containers de anúncios nas páginas
   */
  createAdContainers() {
    if (!this.adsEnabled) return;
    
    // Adicionar container no dashboard (acima dos cards)
    this.createDashboardAdContainer();
    
    // Adicionar container na lista de contas
    this.createAdContainer('bills-ad', document.getElementById('bills-list-view'), 'bills-ad-container');
    
    // Adicionar container na lista de compromissos
    this.createAdContainer('appointments-ad', document.getElementById('appointments-list-view'), 'appointments-ad-container');
    
    // Adicionar container no sidebar
    this.createSidebarAdContainer();
    
    // Banner inferior com comportamento de hover
    this.createFooterBanner();
    
    // Iniciar o carregamento dos anúncios visíveis após containers serem criados
    setTimeout(() => this.loadVisibleAds(), 500);
  }
  
  /**
   * Cria um container de anúncio para o dashboard
   */
  createDashboardAdContainer() {
    const dashboardPage = document.querySelector('#dashboard-page');
    if (!dashboardPage) return;
    
    // Verificar se já existe
    if (document.getElementById('dashboard-ad')) return;
    
    const adContainer = document.createElement('div');
    adContainer.id = 'dashboard-ad';
    adContainer.className = 'top-banner-ad';
    adContainer.innerHTML = `
      <div class="ad-label">Anúncio</div>
      <div class="ad-content" id="dashboard-ad-content"></div>
    `;
    
    // Inserir no início do dashboard-page, antes dos cards
    if (dashboardPage.firstChild) {
      dashboardPage.insertBefore(adContainer, dashboardPage.firstChild);
    } else {
      dashboardPage.appendChild(adContainer);
    }
    
    // Adicionar ao controle
    this.adSlots.push('dashboard-ad');
  }
  
  /**
   * Cria um container de anúncio para o sidebar
   */
  createSidebarAdContainer() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    
    // Verificar se já existe
    if (document.getElementById('sidebar-ad')) return;
    
    const adContainer = document.createElement('div');
    adContainer.id = 'sidebar-ad';
    adContainer.className = 'sidebar-ad-container';
    adContainer.innerHTML = `
      <div class="ad-label">Anúncio</div>
      <div class="ad-content" id="sidebar-ad-content"></div>
    `;
    
    // Adicionar no final do sidebar, após os itens de menu
    sidebar.appendChild(adContainer);
    
    // Adicionar ao controle
    this.adSlots.push('sidebar-ad');
  }
  
  /**
   * Cria um container de anúncio específico
   */
  createAdContainer(id, parentElement, className) {
    if (!parentElement) return;
    
    // Verificar se já existe
    if (document.getElementById(id)) return;
    
    const adContainer = document.createElement('div');
    adContainer.id = id;
    adContainer.className = `ad-container ${className}`;
    adContainer.innerHTML = `
      <div class="ad-label">Anúncio</div>
      <div class="ad-content" id="${id}-content"></div>
    `;
    
    // Adicionar o container ao elemento pai
    if (parentElement.children.length > 1) {
      // Inserir após o primeiro elemento
      parentElement.insertBefore(adContainer, parentElement.children[1]);
    } else {
      parentElement.appendChild(adContainer);
    }
    
    // Adicionar ao controle
    this.adSlots.push(id);
  }
  
  /**
   * Cria um banner de anúncio no rodapé com comportamento de hover
   */
  createFooterBanner() {
    if (document.getElementById('footer-ad')) return;
    
    const footerAd = document.createElement('div');
    footerAd.id = 'footer-ad';
    footerAd.className = 'footer-ad-container minimized';
    footerAd.innerHTML = `
      <div class="ad-label">Anúncio</div>
      <div class="ad-content" id="footer-ad-content"></div>
      <button class="premium-btn" id="get-premium-btn">
        <i class="fas fa-crown"></i> Remover Anúncios
      </button>
    `;
    
    document.body.appendChild(footerAd);
    
    // Adicionar evento ao botão de premium
    document.getElementById('get-premium-btn').addEventListener('click', () => {
      this.showPremiumOffer();
    });
    
    // Adicionar comportamento de hover
    footerAd.addEventListener('mouseenter', () => {
      footerAd.classList.remove('minimized');
      // Limpar o timeout existente se houver
      if (this.footerTimeoutId) {
        clearTimeout(this.footerTimeoutId);
        this.footerTimeoutId = null;
      }
    });
    
    footerAd.addEventListener('mouseleave', () => {
      // Configurar timeout para minimizar após X segundos (configurável)
      this.footerTimeoutId = setTimeout(() => {
        footerAd.classList.add('minimized');
      }, config.ads.footerBannerTimeout);
    });
    
    // Detectar movimento do mouse próximo ao rodapé
    document.addEventListener('mousemove', (event) => {
      const viewportHeight = window.innerHeight;
      const mouseY = event.clientY;
      
      // Se o mouse estiver próximo ao rodapé (últimos 50px da tela)
      if (mouseY > viewportHeight - 50) {
        footerAd.classList.remove('minimized');
        
        // Limpar o timeout existente se houver
        if (this.footerTimeoutId) {
          clearTimeout(this.footerTimeoutId);
          this.footerTimeoutId = null;
        }
      } else if (!this.footerTimeoutId && !footerAd.matches(':hover')) {
        // Configurar timeout para minimizar se o mouse não estiver sobre o banner
        this.footerTimeoutId = setTimeout(() => {
          footerAd.classList.add('minimized');
        }, config.ads.footerBannerTimeout);
      }
    });
    
    // Iniciar minimizado e configurar timeout inicial
    footerAd.classList.add('minimized');
    this.footerTimeoutId = setTimeout(() => {
      footerAd.classList.add('minimized');
    }, config.ads.footerBannerTimeout);
    
    this.adSlots.push('footer-ad');
  }
  
  /**
   * Carrega um anúncio em um elemento específico
   */
  loadAdInElement(element) {
    try {
      // Verificar se o elemento tem dimensões visíveis
      const rect = element.getBoundingClientRect();
      if (rect.width <= 10 || rect.height <= 10) {
        console.warn('Container de anúncio muito pequeno:', rect.width, rect.height);
        // Esconder o container pai se for muito pequeno
        const parentContainer = element.closest('.ad-container, .footer-ad-container, .top-banner-ad, .sidebar-ad-container');
        if (parentContainer) {
          parentContainer.style.display = 'none';
        }
        return;
      }
      
      // Simular verificação se há anúncios disponíveis
      const adsAvailable = this.checkAdsAvailability();
      
      if (!adsAvailable) {
        // Se não houver anúncios disponíveis, esconder o container pai
        const parentContainer = element.closest('.ad-container, .footer-ad-container, .top-banner-ad, .sidebar-ad-container');
        if (parentContainer) {
          parentContainer.style.display = 'none';
        }
        return;
      }
      
      // Limpar o conteúdo anterior
      element.innerHTML = '';
      
      // Implementação específica para AdSense
      const adInsElement = document.createElement('ins');
      adInsElement.className = 'adsbygoogle';
      adInsElement.style.display = 'block';
      adInsElement.style.width = '100%';
      adInsElement.style.height = '100%';
      adInsElement.setAttribute('data-ad-client', this.adUnits.banner);
      adInsElement.setAttribute('data-ad-slot', this.adUnits.banner);
      adInsElement.setAttribute('data-ad-format', 'auto');
      adInsElement.setAttribute('data-full-width-responsive', 'true');
      
      element.appendChild(adInsElement);
      
      // Solicitar anúncio
      if (window.adsbygoogle) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (error) {
      console.error('Erro ao carregar anúncio:', error);
      element.innerHTML = '<div class="ad-placeholder">Anúncio indisponível</div>';
      
      // Esconder o container pai se houver erro
      const parentContainer = element.closest('.ad-container, .footer-ad-container, .top-banner-ad, .sidebar-ad-container');
      if (parentContainer) {
        parentContainer.style.display = 'none';
      }
    }
  }
  
  /**
   * Verifica se há anúncios disponíveis para exibição
   * (Simulação - no ambiente real, isso seria verificado com a rede de anúncios)
   */
  checkAdsAvailability() {
    // Simulação - no ambiente real, isso seria verificado com a API da rede de anúncios
    // Retorna true se há anúncios disponíveis, false caso contrário
    return false; // Para testar a lógica de esconder/mostrar, troque para false
  }
  
  /**
   * Mostra anúncio intersticial entre transições
   */
  showInterstitial() {
    if (!this.adsEnabled || this.premiumUser) return;
    
    // Verificar chance de exibição (configurável)
    if (Math.random() > config.ads.interstitialDisplayChance) return;
    
    // Verificar se há anúncios disponíveis
    if (!this.checkAdsAvailability()) return;
    
    // Implementação básica de intersticial com timeout
    const interstitial = document.createElement('div');
    interstitial.className = 'interstitial-ad';
    interstitial.innerHTML = `
      <div class="interstitial-content">
        <div class="ad-label">Anúncio</div>
        <div class="ad-content" id="interstitial-ad-content"></div>
        <div class="countdown">Fechando em <span id="countdown-timer">${config.ads.interstitialCountdown}</span>...</div>
      </div>
    `;
    
    document.body.appendChild(interstitial);
    
    // Garantir que o elemento esteja renderizado antes de carregar o anúncio
    setTimeout(() => {
      // Carregar anúncio
      this.loadAdInElement(document.getElementById('interstitial-ad-content'));
    }, 100);
    
    // Countdown para fechar
    let timeLeft = config.ads.interstitialCountdown;
    const countdownTimer = document.getElementById('countdown-timer');
    
    const countdown = setInterval(() => {
      timeLeft--;
      if (countdownTimer) {
        countdownTimer.textContent = timeLeft;
      }
      
      if (timeLeft <= 0) {
        clearInterval(countdown);
        document.body.removeChild(interstitial);
      }
    }, 1000);
  }
  
  /**
   * Remove containers de anúncios (para usuários premium)
   */
  removeAdContainers() {
    document.querySelectorAll('.ad-container, .footer-ad-container, .top-banner-ad, .sidebar-ad-container').forEach(container => {
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    });
    
    this.adSlots = [];
  }
  
  /**
   * Exibe oferta premium para remover anúncios
   */
  showPremiumOffer() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'premium-modal';
    
    // Usar configurações de preços do arquivo de configuração
    const monthlyPrice = config.ads.premium.monthly.price.toFixed(2);
    const yearlyPrice = config.ads.premium.yearly.price.toFixed(2);
    const yearlySavings = config.ads.premium.yearly.savings;
    
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header premium-header">
          <div class="modal-title"><i class="fas fa-crown"></i> Seja Premium</div>
          <button class="close-btn">&times;</button>
        </div>
        <div class="modal-body premium-body">
          <h3>Aproveite o Lembre-me sem anúncios!</h3>
          <div class="premium-features">
            <div class="premium-feature">
              <i class="fas fa-ban"></i>
              <span>Sem anúncios</span>
            </div>
            <div class="premium-feature">
              <i class="fas fa-bolt"></i>
              <span>Experiência mais rápida</span>
            </div>
            <div class="premium-feature">
              <i class="fas fa-cloud-upload-alt"></i>
              <span>Backup ilimitado</span>
            </div>
            <div class="premium-feature">
              <i class="fas fa-palette"></i>
              <span>Temas exclusivos</span>
            </div>
          </div>
          <div class="premium-pricing">
            <div class="price-option">
              <h4>${config.ads.premium.monthly.label}</h4>
              <div class="price">R$ ${monthlyPrice}</div>
              <button class="btn btn-premium" data-plan="monthly">Assinar</button>
            </div>
            <div class="price-option recommended">
              <div class="best-value">Melhor valor</div>
              <h4>${config.ads.premium.yearly.label}</h4>
              <div class="price">R$ ${yearlyPrice}</div>
              <div class="price-savings">Economize ${yearlySavings}</div>
              <button class="btn btn-premium" data-plan="yearly">Assinar</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Eventos
    modal.querySelector('.close-btn').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    modal.querySelectorAll('.btn-premium').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const plan = e.currentTarget.getAttribute('data-plan');
        this.processPremiumSubscription(plan);
        document.body.removeChild(modal);
      });
    });
  }
  
  /**
   * Processa assinatura premium
   */
  processPremiumSubscription(plan) {
    // Implementar integração com gateway de pagamento
    console.log(`Processando assinatura ${plan}`);
    
    // Simulação de sucesso para propósitos de demonstração
    this.setPremiumStatus(true);
    
    // Notificar o usuário
    this.showNotification('Parabéns! Você agora é um usuário Premium!');
  }
  
  /**
   * Define status premium do usuário
   */
  setPremiumStatus(isPremium) {
    this.premiumUser = isPremium;
    
    // Atualizar configurações no persistenceAPI
    const settings = this.persistenceAPI.getSettings() || {};
    settings.adsSettings = settings.adsSettings || {};
    settings.adsSettings.premiumUser = isPremium;
    settings.adsSettings.enabled = !isPremium;
    
    this.persistenceAPI.saveSettings(settings);
    
    if (isPremium) {
      this.adsEnabled = false;
      this.removeAdContainers();
      
      // Adicionar badge premium ao perfil
      const userProfile = document.querySelector('.user-profile');
      if (userProfile && !userProfile.querySelector('.premium-badge')) {
        const badge = document.createElement('span');
        badge.className = 'premium-badge';
        badge.innerHTML = '<i class="fas fa-crown"></i>';
        userProfile.appendChild(badge);
      }
    }
  }
  
  /**
   * Exibe notificação ao usuário
   */
  showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    notification.innerHTML = `
      <div class="notification-content">
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
        <div class="notification-message">${message}</div>
        <button class="notification-close"><i class="fas fa-times"></i></button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Eventos
    notification.querySelector('.notification-close').addEventListener('click', () => {
      notification.classList.add('fade-out');
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, config.ui.animations.fadeOutDuration);
    });
    
    // Auto-remover após o tempo configurado
    setTimeout(() => {
      if (document.body.contains(notification)) {
        notification.classList.add('fade-out');
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, config.ui.animations.fadeOutDuration);
      }
    }, config.notifications.notificationDuration);
  }
  
  /**
   * Limita recursos para usuários não premium
   */
  enforceFreeUserLimits() {
    if (this.premiumUser) return true;
    
    // Verificar limites de uso para usuários gratuitos
    const bills = this.persistenceAPI.getCollection('bills');
    const appointments = this.persistenceAPI.getCollection('appointments');
    
    // Obtém limite configurável
    const freeTierLimit = config.ads.freeTierLimits.totalItems;
    
    if (bills.length + appointments.length > freeTierLimit) {
      this.showPremiumOffer();
      return false;
    }
    
    return true;
  }
}

// Exportar estilos CSS para os anúncios (os estilos seriam movidos para um arquivo separado)
export const adsStyles = `
.top-banner-ad {
  width: 100%;
  height: 120px;
  margin-bottom: 25px;
  background: ${config.ui.theme.glassBg};
  border-radius: var(--border-radius);
  border: 1px solid ${config.ui.theme.glassBorder};
  text-align: center;
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 300px; /* Tamanho mínimo para anúncios */
}

/* Resto dos estilos CSS mantidos... */
`;