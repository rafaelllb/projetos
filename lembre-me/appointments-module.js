/**
 * Appointments management module
 */
import { formatDateCorrectly } from './utils-module.js';
import { createDayDetailsModal } from './calendar-module.js';

export class AppointmentsManager {
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
    // Add appointment button
    const addAppointmentBtn = document.getElementById('add-appointment-btn');
    if (addAppointmentBtn) {
      addAppointmentBtn.addEventListener('click', () => this.openAppointmentModal());
    }
    
    // Appointment form
    const appointmentForm = document.getElementById('appointment-form');
    if (appointmentForm) {
      appointmentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveAppointment();
      });
    }
    
    // Close modal
    document.querySelectorAll('#appointment-modal .close-btn, #cancel-appointment-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('appointment-modal').classList.remove('active');
      });
    });
    
    // Toggle view
    document.querySelectorAll('#appointments-page .view-option').forEach(option => {
      option.addEventListener('click', (e) => {
        const viewMode = e.currentTarget.getAttribute('data-view');
        this.changeView(viewMode);
      });
    });
    
    // Calendar navigation
    const prevMonthBtn = document.getElementById('appointments-prev-month-btn');
    if (prevMonthBtn) {
      prevMonthBtn.addEventListener('click', () => {
        this.changeMonth(-1);
      });
    }
    
    const nextMonthBtn = document.getElementById('appointments-next-month-btn');
    if (nextMonthBtn) {
      nextMonthBtn.addEventListener('click', () => {
        this.changeMonth(1);
      });
    }
  }
  
  // Open modal to add/edit appointment
  openAppointmentModal(id = null) {
    const modal = document.getElementById('appointment-modal');
    const form = document.getElementById('appointment-form');
    
    if (!modal || !form) return;
    
    // Clear form
    form.reset();
    
    if (id) {
      // Edit mode
      const appointments = this.persistenceAPI.getCollection('appointments');
      const appointment = appointments.find(a => a.id === id);
      
      if (appointment) {
        document.getElementById('appointment-id').value = appointment.id;
        document.getElementById('appointment-title').value = appointment.title;
        document.getElementById('appointment-date').value = appointment.date;
        document.getElementById('appointment-time').value = appointment.time;
        document.getElementById('appointment-location').value = appointment.location || '';
        document.getElementById('appointment-category').value = appointment.category;
        document.getElementById('appointment-reminder').value = appointment.reminder;
        document.getElementById('appointment-notes').value = appointment.notes || '';
        
        document.querySelector('#appointment-modal .modal-title').textContent = 'Editar Compromisso';
      }
    } else {
      // Add mode
      document.getElementById('appointment-id').value = '';
      document.getElementById('appointment-date').value = new Date().toISOString().split('T')[0];
      document.getElementById('appointment-time').value = '09:00';
      document.querySelector('#appointment-modal .modal-title').textContent = 'Novo Compromisso';
    }
    
    modal.classList.add('active');
  }
  
  // Save appointment
  saveAppointment() {
    const id = document.getElementById('appointment-id').value;
    const title = document.getElementById('appointment-title').value;
    const date = document.getElementById('appointment-date').value;
    const time = document.getElementById('appointment-time').value;
    const location = document.getElementById('appointment-location').value;
    const category = document.getElementById('appointment-category').value;
    const reminder = document.getElementById('appointment-reminder').value;
    const notes = document.getElementById('appointment-notes').value;
    
    const appointment = {
      title,
      date,
      time,
      location,
      category,
      reminder,
      notes
    };
    
    if (id) {
      // Update
      appointment.id = id;
      this.persistenceAPI.updateItem('appointments', appointment);
    } else {
      // New appointment
      this.persistenceAPI.addItem('appointments', appointment);
    }
    
    // Close modal
    document.getElementById('appointment-modal').classList.remove('active');
    
    // Update views
    this.renderAppointments();
    this.dashboardManager.updateDashboard();
  }
  
  // Delete appointment
  deleteAppointment(id) {
    if (confirm('Tem certeza que deseja excluir este compromisso?')) {
      this.persistenceAPI.deleteItem('appointments', id);
      this.renderAppointments();
      this.dashboardManager.updateDashboard();
    }
  }
  
  // Change view mode
  changeView(viewMode) {
    // Update buttons
    document.querySelectorAll('#appointments-page .view-option').forEach(option => {
      option.classList.remove('active');
    });
    document.querySelector(`#appointments-page .view-option[data-view="${viewMode}"]`).classList.add('active');
    
    // Hide all containers first
    document.querySelectorAll('#appointments-page .reminders-container').forEach(container => {
      container.classList.remove('active');
    });
    
    // Show only the selected view
    document.getElementById(`appointments-${viewMode}-view`).classList.add('active');
    
    this.currentViewMode = viewMode;
    
    // If calendar, render calendar
    if (viewMode === 'calendar') {
      this.renderCalendar();
    }
  }
  
  // Render appointments in all view modes
  renderAppointments() {
    // Only render the views based on current mode to avoid unnecessary DOM updates
    if (this.currentViewMode === 'list' || this.currentViewMode === 'grid') {
      this.renderListView();
      this.renderGridView();
    } else if (this.currentViewMode === 'calendar') {
      this.renderCalendar();
    }
  }
  
  /**
   * Verifica se um compromisso é passado, presente, em breve ou futuro
   * considerando tanto a data quanto o horário
   */
  getAppointmentStatus(appointment) {
    const appointmentDate = new Date(appointment.date);
    const appointmentDateTime = new Date(`${appointment.date}T${appointment.time}`);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Diferença em milissegundos
    const diffMs = appointmentDateTime - now;
    // Diferença em horas
    const diffHours = diffMs / (1000 * 60 * 60);
    
    // Verificar se já passou
    if (appointmentDateTime < now) {
      // O compromisso já passou
      return {
        isPast: true,
        isToday: appointmentDate.getTime() === today.getTime(),
        isSoon: false,
        isFuture: false,
        statusClass: 'past',
        statusText: 'Passado'
      };
    } 
    // Verificar se é em breve (menos de 3 horas) independente se é hoje
    else if (diffHours <= 3) {
      return {
        isPast: false,
        isToday: appointmentDate.getTime() === today.getTime(),
        isSoon: true,
        isFuture: false,
        statusClass: 'soon',
        statusText: 'Em breve'
      };
    }
    // Verificar se é hoje (mas não tão próximo)
    else if (appointmentDate.getTime() === today.getTime()) {
      return {
        isPast: false,
        isToday: true,
        isSoon: false,
        isFuture: false,
        statusClass: 'today',
        statusText: 'Hoje'
      };
    } 
    // É uma data futura
    else {
      return {
        isPast: false,
        isToday: false,
        isSoon: false,
        isFuture: true,
        statusClass: 'future',
        statusText: 'Futuro'
      };
    }
  }
  
  // Render appointments in list view
  renderListView() {
    const listContainer = document.getElementById('appointments-list-view');
    if (!listContainer) return;
    
    const appointments = this.persistenceAPI.getCollection('appointments');
    
    // Sort by date and time
    appointments.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA - dateB;
    });
    
    let html = '';
    
    if (appointments.length === 0) {
      html = '<p class="empty-message">Nenhum compromisso cadastrado. Clique em "Novo Compromisso" para adicionar.</p>';
    } else {
      appointments.forEach(appointment => {
        const status = this.getAppointmentStatus(appointment);
        
        html += `
        <div class="reminder-item" data-id="${appointment.id}">
          <div class="reminder-details">
            <div class="reminder-title">${appointment.title}</div>
            <div class="reminder-date">
              <span class="date-label ${status.statusClass}">${status.statusText}:</span> 
              ${formatDateCorrectly(appointment.date)} às ${appointment.time}
            </div>
            ${appointment.location ? `<div class="reminder-location">Local: ${appointment.location}</div>` : ''}
          </div>
          <div class="reminder-actions">
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
    document.querySelectorAll('#appointments-list-view .btn-edit').forEach((btn, index) => {
      btn.addEventListener('click', () => {
        const id = appointments[index].id;
        this.openAppointmentModal(id);
      });
    });
    
    document.querySelectorAll('#appointments-list-view .btn-delete').forEach((btn, index) => {
      btn.addEventListener('click', () => {
        const id = appointments[index].id;
        this.deleteAppointment(id);
      });
    });
  }
  
  // Render appointments in grid view
  renderGridView() {
    const gridContainer = document.getElementById('appointments-grid-view');
    if (!gridContainer) return;
    
    const appointments = this.persistenceAPI.getCollection('appointments');
    
    // Sort by date and time
    appointments.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA - dateB;
    });
    
    let html = '';
    
    if (appointments.length === 0) {
      html = '<p class="empty-message">Nenhum compromisso cadastrado. Clique em "Novo Compromisso" para adicionar.</p>';
    } else {
      html = '<div class="grid-container">';
      
      appointments.forEach(appointment => {
        const status = this.getAppointmentStatus(appointment);
        
        const categoryIcons = {
          'pessoal': 'fa-user',
          'trabalho': 'fa-briefcase',
          'saúde': 'fa-heartbeat',
          'lazer': 'fa-gamepad',
          'outros': 'fa-sticky-note'
        };
        
        const icon = categoryIcons[appointment.category] || 'fa-calendar-check';
        
        html += `
        <div class="reminder-item card-style" data-id="${appointment.id}">
          <div class="reminder-content">
            <div class="reminder-icon">
              <i class="fas ${icon}"></i>
            </div>
            <div class="reminder-details">
              <div class="reminder-title">${appointment.title}</div>
              <div class="reminder-date">
                <span class="date-label ${status.statusClass}">${status.statusText}</span><br>
                ${formatDateCorrectly(appointment.date)} às ${appointment.time}
              </div>
              ${appointment.location ? `<div class="reminder-location">Local: ${appointment.location}</div>` : ''}
            </div>
            <div class="reminder-actions">
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
    document.querySelectorAll('#appointments-grid-view .btn-edit').forEach((btn, index) => {
      btn.addEventListener('click', () => {
        const id = appointments[index].id;
        this.openAppointmentModal(id);
      });
    });
    
    document.querySelectorAll('#appointments-grid-view .btn-delete').forEach((btn, index) => {
      btn.addEventListener('click', () => {
        const id = appointments[index].id;
        this.deleteAppointment(id);
      });
    });
  }
  
  // Render calendar
  renderCalendar() {
    const calendarTitle = document.getElementById('appointments-calendar-title');
    const calendarGrid = document.getElementById('appointments-calendar-grid');
    if (!calendarTitle || !calendarGrid) return;
    
    const appointments = this.persistenceAPI.getCollection('appointments');
    
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
      
      // Filter appointments for this date
      const dayAppointments = appointments.filter(appointment => appointment.date === dateStr);
      
      html += `
      <div class="calendar-day other-month" data-date="${dateStr}">
        <div class="day-number">${day}</div>
        <div class="day-events">
      `;
      
      dayAppointments.forEach(appointment => {
        html += `<div class="day-event appointment" title="${appointment.title}">${appointment.title}</div>`;
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
      
      // Filter appointments for this date
      const dayAppointments = appointments.filter(appointment => appointment.date === dateStr);
      
      html += `
      <div class="calendar-day ${isToday ? 'today' : ''}" data-date="${dateStr}">
        <div class="day-number">${day}</div>
        <div class="day-events">
      `;
      
      dayAppointments.forEach(appointment => {
        html += `<div class="day-event appointment" title="${appointment.title}">${appointment.time} - ${appointment.title}</div>`;
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
      
      // Filter appointments for this date
      const dayAppointments = appointments.filter(appointment => appointment.date === dateStr);
      
      html += `
      <div class="calendar-day other-month" data-date="${dateStr}">
        <div class="day-number">${day}</div>
        <div class="day-events">
      `;
      
      dayAppointments.forEach(appointment => {
        html += `<div class="day-event appointment" title="${appointment.title}">${appointment.time} - ${appointment.title}</div>`;
      });
      
      html += `
        </div>
      </div>
      `;
    }
    
    calendarGrid.innerHTML = html;
    
    // Add event listeners for the days
    document.querySelectorAll('#appointments-calendar-grid .calendar-day').forEach(day => {
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
    
    createDayDetailsModal(dateStr, bills, appointments, window.billsManager, this);
  }
  
  // Get appointments for a specific date
  getAppointments(dateStr) {
    return this.persistenceAPI.getCollection('appointments').filter(appointment => appointment.date === dateStr);
  }
}