/**
 * Módulo para gerenciar as operações de pesquisa
 */
export class SearchManager {
  constructor(persistenceAPI) {
    this.persistenceAPI = persistenceAPI;
    this.searchInput = document.querySelector('.search-container input');
    this.searchResultsContainer = null;
    this.initializeSearch();
  }

  /**
   * Inicializa a funcionalidade de pesquisa
   */
  initializeSearch() {
    // Criar container de resultados se não existir
    if (!this.searchResultsContainer) {
      this.searchResultsContainer = document.createElement('div');
      this.searchResultsContainer.className = 'search-results-container';
      document.querySelector('.search-container').appendChild(this.searchResultsContainer);
    }

    // Adicionar listeners de eventos
    this.searchInput.addEventListener('input', this.debounce(() => {
      this.performSearch(this.searchInput.value);
    }, 300));

    // Fechar resultados quando clicar fora
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-container')) {
        this.hideResults();
      }
    });

    // Tecla Escape fecha os resultados
    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideResults();
        this.searchInput.blur();
      }
    });
  }

  /**
   * Realiza a pesquisa nos dados com base no termo fornecido
   * @param {string} term - O termo de pesquisa
   */
  performSearch(term) {
    if (!term || term.trim().length < 2) {
      this.hideResults();
      return;
    }

    term = term.toLowerCase().trim();
    
    // Pesquisar em contas
    const bills = this.persistenceAPI.getCollection('bills')
      .filter(bill => 
        bill.title.toLowerCase().includes(term) || 
        (bill.notes && bill.notes.toLowerCase().includes(term))
      )
      .slice(0, 5); // Limitar a 5 resultados
    
    // Pesquisar em compromissos
    const appointments = this.persistenceAPI.getCollection('appointments')
      .filter(appointment => 
        appointment.title.toLowerCase().includes(term) || 
        (appointment.notes && appointment.notes.toLowerCase().includes(term)) ||
        (appointment.location && appointment.location.toLowerCase().includes(term))
      )
      .slice(0, 5); // Limitar a 5 resultados
    
    this.renderResults(bills, appointments, term);
  }

  /**
   * Renderiza os resultados da pesquisa na interface
   */
  renderResults(bills, appointments, term) {
    if (bills.length === 0 && appointments.length === 0) {
      this.hideResults();
      return;
    }

    this.searchResultsContainer.innerHTML = '';
    this.searchResultsContainer.style.display = 'block';
    
    // Adicionar título da seção
    const resultsHeader = document.createElement('div');
    resultsHeader.className = 'search-results-header';
    resultsHeader.textContent = 'Resultados da pesquisa';
    this.searchResultsContainer.appendChild(resultsHeader);
    
    // Renderizar contas
    if (bills.length > 0) {
      const billsSection = document.createElement('div');
      billsSection.className = 'search-section';
      billsSection.innerHTML = '<h4>Contas</h4>';
      
      const billsList = document.createElement('ul');
      bills.forEach(bill => {
        const item = document.createElement('li');
        const dueDate = new Date(bill.dueDate);
        item.innerHTML = `
          <div class="search-item-title">${this.highlightTerm(bill.title, term)}</div>
          <div class="search-item-info">
            <span>R$ ${bill.amount.toFixed(2)}</span>
            <span>${dueDate.toLocaleDateString('pt-BR')}</span>
          </div>
        `;
        
        item.addEventListener('click', () => {
          this.navigateTo('bills-page', bill.id);
        });
        
        billsList.appendChild(item);
      });
      
      billsSection.appendChild(billsList);
      this.searchResultsContainer.appendChild(billsSection);
    }
    
    // Renderizar compromissos
    if (appointments.length > 0) {
      const appointmentsSection = document.createElement('div');
      appointmentsSection.className = 'search-section';
      appointmentsSection.innerHTML = '<h4>Compromissos</h4>';
      
      const appointmentsList = document.createElement('ul');
      appointments.forEach(appointment => {
        const item = document.createElement('li');
        const appointmentDate = new Date(appointment.date);
        item.innerHTML = `
          <div class="search-item-title">${this.highlightTerm(appointment.title, term)}</div>
          <div class="search-item-info">
            <span>${appointmentDate.toLocaleDateString('pt-BR')} às ${appointment.time}</span>
            ${appointment.location ? `<span>${this.highlightTerm(appointment.location, term)}</span>` : ''}
          </div>
        `;
        
        item.addEventListener('click', () => {
          this.navigateTo('appointments-page', appointment.id);
        });
        
        appointmentsList.appendChild(item);
      });
      
      appointmentsSection.appendChild(appointmentsList);
      this.searchResultsContainer.appendChild(appointmentsSection);
    }
  }

  /**
   * Destaca o termo de pesquisa no texto
   */
  highlightTerm(text, term) {
    if (!text) return '';
    const regex = new RegExp(`(${term})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
  }

  /**
   * Navega para a página e item específico
   */
  navigateTo(pageId, itemId) {
    // Mostrar a página correta
    window.uiManager.showPage(pageId);
    
    // Abrir o modal do item específico
    if (pageId === 'bills-page' && window.billsManager) {
      window.billsManager.openBillModal(itemId);
    } else if (pageId === 'appointments-page' && window.appointmentsManager) {
      window.appointmentsManager.openAppointmentModal(itemId);
    }
    
    // Esconder resultados
    this.hideResults();
    this.searchInput.value = '';
  }

  /**
   * Esconde os resultados da pesquisa
   */
  hideResults() {
    if (this.searchResultsContainer) {
      this.searchResultsContainer.style.display = 'none';
    }
  }

  /**
   * Função debounce para limitar chamadas repetidas
   */
  debounce(func, wait) {
    let timeout;
    return function() {
      const context = this;
      const args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        func.apply(context, args);
      }, wait);
    };
  }
}

// Exportar uma instância única
export default function createSearchManager(persistenceAPI) {
  return new SearchManager(persistenceAPI);
}