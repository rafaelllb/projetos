/**
 * Bills management module
 */
import { formatDateCorrectly } from './utils-module.js';
import { createDayDetailsModal } from './calendar-module.js';

export class BillsManager {
  constructor(persistenceAPI, dashboardManager) {
    this.persistenceAPI = persistenceAPI;
    this.dashboardManager = dashboardManager;
    this.currentViewMode = 'list';
    this.currentMonth = new Date().getMonth();
    this.currentYear = new Date().getFullYear();
    this.initEventListeners();
  }
  
  // Initialize event listeners
  initEventListeners() {
    // Add bill button
    const addBillBtn = document.getElementById('add-bill-btn');
    if (addBillBtn) {
      addBillBtn.addEventListener('click', () => this.openBillModal());
    }
    
    // Bill form
    const billForm = document.getElementById('bill-form');
    if (billForm) {
      billForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveBill();
      });
    }
    
    // Close modal
    document.querySelectorAll('#bill-modal .close-btn, #cancel-bill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('bill-modal').classList.remove('active');
      });
    });
    
    // Toggle view
    document.querySelectorAll('#bills-page .view-option').forEach(option => {
      option.addEventListener('click', (e) => {
        const viewMode = e.currentTarget.getAttribute('data-view');
        this.changeView(viewMode);
      });
    });
    
    // Calendar navigation
    const prevMonthBtn = document.getElementById('prev-month-btn');
    if (prevMonthBtn) {
      prevMonthBtn.addEventListener('click', () => {
        this.changeMonth(-1);
      });
    }
    
    const nextMonthBtn = document.getElementById('next-month-btn');
    if (nextMonthBtn) {
      nextMonthBtn.addEventListener('click', () => {
        this.changeMonth(1);
      });
    }
  }
  
  // Open modal to add/edit bill
  openBillModal(id = null) {
    const modal = document.getElementById('bill-modal');
    const form = document.getElementById('bill-form');
    
    if (!modal || !form) return;
    
    // Clear form
    form.reset();
    
    if (id) {
      // Edit mode
      const bills = this.persistenceAPI.getCollection('bills');
      const bill = bills.find(b => b.id === id);
      
      if (bill) {
        document.getElementById('bill-id').value = bill.id;
        document.getElementById('bill-title').value = bill.title;
        document.getElementById('bill-amount').value = bill.amount;
        document.getElementById('bill-due-date').value = bill.dueDate;
        document.getElementById('bill-category').value = bill.category;
        document.getElementById('bill-recurrence').value = bill.recurrence;
        document.getElementById('bill-status').value = bill.status;
        document.getElementById('bill-notes').value = bill.notes || '';
        
        document.querySelector('#bill-modal .modal-title').textContent = 'Editar Conta';
      }
    } else {
      // Add mode
      document.getElementById('bill-id').value = '';
      document.getElementById('bill-due-date').value = new Date().toISOString().split('T')[0];
      document.querySelector('#bill-modal .modal-title').textContent = 'Nova Conta';
    }
    
    modal.classList.add('active');
  }
  
  // Create next recurring bill
  createNextRecurringBill(currentBill) {
    // Create a copy of the current bill
    const nextBill = { ...currentBill };
    
    // Remove ID to generate a new one
    delete nextBill.id;
    
    // Set as pending
    nextBill.status = 'pending';
    
    // Calculate next due date based on recurrence
    const currentDueDate = new Date(currentBill.dueDate);
    let nextDueDate = new Date(currentDueDate);
    
    switch (currentBill.recurrence) {
      case 'monthly':
        nextDueDate.setMonth(currentDueDate.getMonth() + 1);
        break;
      case 'bimonthly':
        nextDueDate.setMonth(currentDueDate.getMonth() + 2);
        break;
      case 'quarterly':
        nextDueDate.setMonth(currentDueDate.getMonth() + 3);
        break;
      case 'yearly':
        nextDueDate.setFullYear(currentDueDate.getFullYear() + 1);
        break;
    }
    
    // Adjust if it's an invalid day (e.g., February 31)
    while (nextDueDate.getMonth() > (currentDueDate.getMonth() + 1) % 12 && 
           nextBill.recurrence === 'monthly') {
      nextDueDate.setDate(nextDueDate.getDate() - 1);
    }
    
    // Format date as YYYY-MM-DD
    nextBill.dueDate = nextDueDate.toISOString().split('T')[0];
    
    // Add the new recurring bill
    this.persistenceAPI.addItem('bills', nextBill);
    
    // Show notification
    this.showRecurrenceNotification(nextBill);
  }
  
  // Show recurring bill notification
  showRecurrenceNotification(bill) {
    // Create a temporary notification element
    const notification = document.createElement('div');
    notification.className = 'recurrence-notification';
    notification.innerHTML = `
      <div class="notification-content">
        <i class="fas fa-sync-alt"></i>
        <div class="notification-message">
          <strong>Conta recorrente criada</strong>
          <p>${bill.title} - Vencimento: ${formatDateCorrectly(bill.dueDate)}</p>
        </div>
        <button class="notification-close"><i class="fas fa-times"></i></button>
      </div>
    `;
    
    // Add to document body
    document.body.appendChild(notification);
    
    // Add event to close notification
    notification.querySelector('.notification-close').addEventListener('click', () => {
      notification.classList.add('fade-out');
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    });
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (document.body.contains(notification)) {
        notification.classList.add('fade-out');
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 300);
      }
    }, 5000);
  }
  
  // Save bill
  saveBill() {
    const id = document.getElementById('bill-id').value;
    const title = document.getElementById('bill-title').value;
    const amount = parseFloat(document.getElementById('bill-amount').value);
    const dueDate = document.getElementById('bill-due-date').value;
    const category = document.getElementById('bill-category').value;
    const recurrence = document.getElementById('bill-recurrence').value;
    const status = document.getElementById('bill-status').value;
    const notes = document.getElementById('bill-notes').value;
    
    const bill = {
      title,
      amount,
      dueDate,
      category,
      recurrence,
      status,
      notes
    };
    
    if (id) {
      // Update
      bill.id = id;
      this.persistenceAPI.updateItem('bills', bill);
    } else {
      // New bill
      this.persistenceAPI.addItem('bills', bill);
    }
    
    // Close modal
    document.getElementById('bill-modal').classList.remove('active');
    
    // Update views
    this.renderBills();
    this.dashboardManager.updateDashboard();
  }
  
  // Delete bill
  deleteBill(id) {
    if (confirm('Tem certeza que deseja excluir esta conta?')) {
      this.persistenceAPI.deleteItem('bills', id);
      this.renderBills();
      this.dashboardManager.updateDashboard();
    }
  }
  
  // Toggle bill status
  toggleBillStatus(id) {
    const bills = this.persistenceAPI.getCollection('bills');
    const bill = bills.find(b => b.id === id);
    
    if (bill) {
      const oldStatus = bill.status;
      bill.status = bill.status === 'pending' ? 'paid' : 'pending';
      this.persistenceAPI.updateItem('bills', bill);
      
      // If bill was marked as paid and is recurring, create the next one
      if (oldStatus === 'pending' && bill.status === 'paid' && bill.recurrence !== 'none') {
        this.createNextRecurringBill(bill);
      }
      
      this.renderBills();
      this.dashboardManager.updateDashboard();
    }
  }
  
  // Change view mode
  changeView(viewMode) {
    // Update buttons
    document.querySelectorAll('#bills-page .view-option').forEach(option => {
      option.classList.remove('active');
    });
    document.querySelector(`#bills-page .view-option[data-view="${viewMode}"]`).classList.add('active');
    
    // Hide all containers first
    document.querySelectorAll('#bills-page .reminders-container').forEach(container => {
      container.classList.remove('active');
    });
    
    // Show only the selected view
    document.getElementById(`bills-${viewMode}-view`).classList.add('active');
    
    this.currentViewMode = viewMode;
    
    // If calendar, render calendar
    if (viewMode === 'calendar') {
      this.renderCalendar();
    }
  }  
  
  // Render bills in all view modes
  renderBills() {
    // Only render the views based on current mode to avoid unnecessary DOM updates
    if (this.currentViewMode === 'list' || this.currentViewMode === 'grid') {
      this.renderListView();
      this.renderGridView();
    } else if (this.currentViewMode === 'calendar') {
      this.renderCalendar();
    }
  }
  
  // Render bills in list view
  renderListView() {
    const listContainer = document.getElementById('bills-list-view');
    if (!listContainer) return;
    
    const bills = this.persistenceAPI.getCollection('bills');
    
    // Sort by due date
    bills.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    let html = '';
    
    if (bills.length === 0) {
      html = '<p class="empty-message">Nenhuma conta cadastrada. Clique em "Nova Conta" para adicionar.</p>';
    } else {
      bills.forEach(bill => {
        const dueDate = new Date(bill.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let status = bill.status;
        if (status === 'pending' && dueDate < today) {
          status = 'late';
        }
        
        const statusText = {
          'pending': 'Pendente',
          'paid': 'Pago',
          'late': 'Atrasado'
        };
        
        html += `
        <div class="reminder-item" data-id="${bill.id}">
          <div class="status ${status}"></div>
          <div class="reminder-details">
            <div class="reminder-title">${bill.title}</div>
            <div class="reminder-date">Vencimento: ${formatDateCorrectly(bill.dueDate)}</div>
          </div>
          <div class="reminder-amount">R$ ${bill.amount.toFixed(2)}</div>
          <div class="reminder-actions">
            <button class="btn-toggle-status" title="${status === 'paid' ? 'Marcar como pendente' : 'Marcar como pago'}">
              <i class="fas ${status === 'paid' ? 'fa-times-circle' : 'fa-check-circle'}"></i>
            </button>
            <button class="btn-edit" title="Editar">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn-delete" title="Excluir">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        `;
      });
    }
    
    listContainer.innerHTML = html;
    
    // Add event listeners for action buttons
    document.querySelectorAll('#bills-list-view .btn-toggle-status').forEach((btn, index) => {
      btn.addEventListener('click', () => {
        const id = bills[index].id;
        this.toggleBillStatus(id);
      });
    });
    
    document.querySelectorAll('#bills-list-view .btn-edit').forEach((btn, index) => {
      btn.addEventListener('click', () => {
        const id = bills[index].id;
        this.openBillModal(id);
      });
    });
    
    document.querySelectorAll('#bills-list-view .btn-delete').forEach((btn, index) => {
      btn.addEventListener('click', () => {
        const id = bills[index].id;
        this.deleteBill(id);
      });
    });
  }
  
  // Render bills in grid view
  renderGridView() {
    const gridContainer = document.getElementById('bills-grid-view');
    if (!gridContainer) return;
    
    const bills = this.persistenceAPI.getCollection('bills');
    
    // Sort by due date
    bills.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    let html = '';
    
    if (bills.length === 0) {
      html = '<p class="empty-message">Nenhuma conta cadastrada. Clique em "Nova Conta" para adicionar.</p>';
    } else {
      html = '<div class="grid-container">';
      
      bills.forEach(bill => {
        const dueDate = new Date(bill.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let status = bill.status;
        if (status === 'pending' && dueDate < today) {
          status = 'late';
        }
        
        const statusText = {
          'pending': 'Pendente',
          'paid': 'Pago',
          'late': 'Atrasado'
        };
        
        const categoryIcons = {
          'moradia': 'fa-home',
          'transporte': 'fa-car',
          'alimentação': 'fa-utensils',
          'saúde': 'fa-heartbeat',
          'educação': 'fa-graduation-cap',
          'lazer': 'fa-gamepad',
          'outros': 'fa-box'
        };
        
        const icon = categoryIcons[bill.category] || 'fa-file-invoice-dollar';
        
        html += `
        <div class="reminder-item card-style" data-id="${bill.id}">
          <div class="status ${status}"></div>
          <div class="reminder-content">
            <div class="reminder-icon">
              <i class="fas ${icon}"></i>
            </div>
            <div class="reminder-details">
              <div class="reminder-title">${bill.title}</div>
              <div class="reminder-date">Vencimento: ${formatDateCorrectly(bill.dueDate)}</div>
              <div class="reminder-amount">R$ ${bill.amount.toFixed(2)}</div>
              <div class="reminder-status-tag ${status}">${statusText[status]}</div>
            </div>
            <div class="reminder-actions">
              <button class="btn-toggle-status" title="${status === 'paid' ? 'Marcar como pendente' : 'Marcar como pago'}">
                <i class="fas ${status === 'paid' ? 'fa-times-circle' : 'fa-check-circle'}"></i>
              </button>
              <button class="btn-edit" title="Editar">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn-delete" title="Excluir">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
        `;
      });
      
      html += '</div>';
    }
    
    gridContainer.innerHTML = html;
    
    // Add event listeners for action buttons
    document.querySelectorAll('#bills-grid-view .btn-toggle-status').forEach((btn, index) => {
      btn.addEventListener('click', () => {
        const id = bills[index].id;
        this.toggleBillStatus(id);
      });
    });
    
    document.querySelectorAll('#bills-grid-view .btn-edit').forEach((btn, index) => {
      btn.addEventListener('click', () => {
        const id = bills[index].id;
        this.openBillModal(id);
      });
    });
    
    document.querySelectorAll('#bills-grid-view .btn-delete').forEach((btn, index) => {
      btn.addEventListener('click', () => {
        const id = bills[index].id;
        this.deleteBill(id);
      });
    });
  }
  
  // Render calendar
  renderCalendar() {
    const calendarTitle = document.getElementById('calendar-title');
    const calendarGrid = document.getElementById('calendar-grid');
    if (!calendarTitle || !calendarGrid) return;
    
    const bills = this.persistenceAPI.getCollection('bills');
    
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    // Update calendar title
    calendarTitle.textContent = `${monthNames[this.currentMonth]} ${this.currentYear}`;
    
    // Get the first day of the month
    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    // Get the last day of the month
    const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
    
    // Get the day of the week for the first day (0 = Sunday, 6 = Saturday)
    const firstDayOfWeek = firstDay.getDay();
    
    // Get the day of the week for the last day
    const lastDayOfWeek = lastDay.getDay();
    
    // Days from previous month to fill the beginning of the calendar
    const daysFromPrevMonth = firstDayOfWeek;
    
    // Days from next month to fill the end of the calendar
    const daysFromNextMonth = 6 - lastDayOfWeek;
    
    // Get the last day of the previous month
    const prevMonthLastDay = new Date(this.currentYear, this.currentMonth, 0).getDate();
    
    let html = '';
    
    // Add weekday headers
    dayNames.forEach(day => {
      html += `<div class="calendar-day-header">${day}</div>`;
    });
    
    // Add days from previous month
    for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      const date = new Date(this.currentYear, this.currentMonth - 1, day);
      const dateStr = date.toISOString().split('T')[0];
      
      // Filter bills for this date
      const dayBills = bills.filter(bill => bill.dueDate === dateStr);
      
      html += `
      <div class="calendar-day other-month" data-date="${dateStr}">
        <div class="day-number">${day}</div>
        <div class="day-events">
      `;
      
      dayBills.forEach(bill => {
        html += `<div class="day-event payment" title="${bill.title}">R$ ${bill.amount.toFixed(2)}</div>`;
      });
      
      html += `
        </div>
      </div>
      `;
    }
    
    // Add days from current month
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(this.currentYear, this.currentMonth, day);
      const dateStr = date.toISOString().split('T')[0];
      
      // Check if it's today
      const isToday = date.getTime() === today.getTime();
      
      // Filter bills for this date
      const dayBills = bills.filter(bill => bill.dueDate === dateStr);
      
      html += `
      <div class="calendar-day ${isToday ? 'today' : ''}" data-date="${dateStr}">
        <div class="day-number">${day}</div>
        <div class="day-events">
      `;
      
      dayBills.forEach(bill => {
        const status = bill.status === 'paid' ? 'paid' : 'payment';
        html += `<div class="day-event ${status}" title="${bill.title}">R$ ${bill.amount.toFixed(2)}</div>`;
      });
      
      html += `
        </div>
      </div>
      `;
    }
    
    // Add days from next month
    for (let day = 1; day <= daysFromNextMonth; day++) {
      const date = new Date(this.currentYear, this.currentMonth + 1, day);
      const dateStr = date.toISOString().split('T')[0];
      
      // Filter bills for this date
      const dayBills = bills.filter(bill => bill.dueDate === dateStr);
      
      html += `
      <div class="calendar-day other-month" data-date="${dateStr}">
        <div class="day-number">${day}</div>
        <div class="day-events">
      `;
      
      dayBills.forEach(bill => {
        html += `<div class="day-event payment" title="${bill.title}">R$ ${bill.amount.toFixed(2)}</div>`;
      });
      
      html += `
        </div>
      </div>
      `;
    }
    
    calendarGrid.innerHTML = html;
    
    // Add event listeners for the days
    document.querySelectorAll('#calendar-grid .calendar-day').forEach(day => {
      day.addEventListener('click', () => {
        const date = day.getAttribute('data-date');
        this.openDayDetailsModal(date);
      });
    });
  }
  
  // Change month in calendar
  changeMonth(delta) {
    this.currentMonth += delta;
    
    if (this.currentMonth < 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else if (this.currentMonth > 11) {
      this.currentMonth = 0;
      this.currentYear++;
    }
    
    this.renderCalendar();
  }
  
  // Open day details modal
  openDayDetailsModal(dateStr) {
    const bills = this.persistenceAPI.getCollection('bills').filter(bill => bill.dueDate === dateStr);
    const appointments = this.persistenceAPI.getCollection('appointments').filter(
      appointment => appointment.date === dateStr
    );
    
    createDayDetailsModal(dateStr, bills, appointments, this, window.appointmentsManager);
  }
  
  // Get bills for a specific date
  getBills(dateStr) {
    return this.persistenceAPI.getCollection('bills').filter(bill => bill.dueDate === dateStr);
  }
}