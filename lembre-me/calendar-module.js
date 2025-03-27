/**
 * Calendar module to manage and render calendar views
 */
import { formatDateCorrectly } from './utils-module.js';

export class CalendarManager {
  constructor(config) {
    this.currentMonth = new Date().getMonth();
    this.currentYear = new Date().getFullYear();
    this.config = {
      calendarId: config.calendarId,
      calendarGridId: config.calendarGridId, 
      calendarTitleId: config.calendarTitleId,
      prevBtnId: config.prevBtnId,
      nextBtnId: config.nextBtnId,
      onDayClick: config.onDayClick || this.defaultDayClickHandler,
      getEvents: config.getEvents || (() => []),
      eventClassName: config.eventClassName || 'day-event',
      renderEventContent: config.renderEventContent || this.defaultRenderEventContent
    };
    
    this.initEventListeners();
  }
  
  // Initialize event listeners for navigation
  initEventListeners() {
    document.getElementById(this.config.prevBtnId).addEventListener('click', () => {
      this.changeMonth(-1);
    });
    
    document.getElementById(this.config.nextBtnId).addEventListener('click', () => {
      this.changeMonth(1);
    });
  }
  
  // Default handler for day click
  defaultDayClickHandler(dateStr) {
    console.log('Day clicked:', dateStr);
  }
  
  // Default event renderer
  defaultRenderEventContent(event) {
    return `${event.title || 'Event'}`;
  }
  
  // Render the calendar
  renderCalendar() {
    const calendarTitle = document.getElementById(this.config.calendarTitleId);
    const calendarGrid = document.getElementById(this.config.calendarGridId);
    
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
      
      // Get events for this date
      const dayEvents = this.config.getEvents(dateStr);
      
      html += `
      <div class="calendar-day other-month" data-date="${dateStr}">
        <div class="day-number">${day}</div>
        <div class="day-events">
      `;
      
      dayEvents.forEach(event => {
        html += `<div class="${this.config.eventClassName}" title="${event.title || ''}">${this.config.renderEventContent(event)}</div>`;
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
      
      // Get events for this date
      const dayEvents = this.config.getEvents(dateStr);
      
      html += `
      <div class="calendar-day ${isToday ? 'today' : ''}" data-date="${dateStr}">
        <div class="day-number">${day}</div>
        <div class="day-events">
      `;
      
      dayEvents.forEach(event => {
        html += `<div class="${this.config.eventClassName}" title="${event.title || ''}">${this.config.renderEventContent(event)}</div>`;
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
      
      // Get events for this date
      const dayEvents = this.config.getEvents(dateStr);
      
      html += `
      <div class="calendar-day other-month" data-date="${dateStr}">
        <div class="day-number">${day}</div>
        <div class="day-events">
      `;
      
      dayEvents.forEach(event => {
        html += `<div class="${this.config.eventClassName}" title="${event.title || ''}">${this.config.renderEventContent(event)}</div>`;
      });
      
      html += `
        </div>
      </div>
      `;
    }
    
    calendarGrid.innerHTML = html;
    
    // Add event listeners for the days
    document.querySelectorAll(`#${this.config.calendarGridId} .calendar-day`).forEach(day => {
      day.addEventListener('click', () => {
        const date = day.getAttribute('data-date');
        this.config.onDayClick(date);
      });
    });
  }
  
  // Change the month
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
}

// Helper to create a day details modal shared between bills and appointments
export function createDayDetailsModal(dateStr, bills, appointments, billsManager, appointmentsManager) {
  const modal = document.getElementById('day-details-modal');
  const dateTitle = document.getElementById('day-details-date');
  const billsList = document.getElementById('day-bills-list');
  const appointmentsList = document.getElementById('day-appointments-list');
  
  dateTitle.textContent = formatDateCorrectly(dateStr);
  
  // Create bills list HTML
  let billsHtml = '';
  
  if (bills.length === 0) {
    billsHtml = '<li class="empty-message">Nenhuma conta para este dia.</li>';
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
      
      billsHtml += `
      <li class="reminder-item" data-id="${bill.id}">
        <div class="status ${status}"></div>
        <div class="reminder-details">
          <div class="reminder-title">${bill.title}</div>
          <div class="reminder-status">${statusText[status]}</div>
        </div>
        <div class="reminder-amount">R$ ${bill.amount.toFixed(2)}</div>
        <div class="reminder-actions">
          <button class="btn-toggle-status" title="${status === 'paid' ? 'Marcar como pendente' : 'Marcar como pago'}">
            <i class="fas ${status === 'paid' ? 'fa-times-circle' : 'fa-check-circle'}"></i>
          </button>
          <button class="btn-edit" title="Editar">
            <i class="fas fa-edit"></i>
          </button>
        </div>
      </li>
      `;
    });
  }
  
  billsList.innerHTML = billsHtml;
  
  // Create appointments list HTML
  let appointmentsHtml = '';
  
  if (appointments.length === 0) {
    appointmentsHtml = '<li class="empty-message">Nenhum compromisso para este dia.</li>';
  } else {
    appointments.forEach(appointment => {
      appointmentsHtml += `
      <li class="reminder-item" data-id="${appointment.id}">
        <div class="reminder-details">
          <div class="reminder-title">${appointment.title}</div>
          <div class="reminder-date">Horário: ${appointment.time}</div>
          <div class="reminder-location">Local: ${appointment.location || 'Não especificado'}</div>
        </div>
        <div class="reminder-actions">
          <button class="btn-edit-appointment" title="Editar">
            <i class="fas fa-edit"></i>
          </button>
        </div>
      </li>
      `;
    });
  }
  
  appointmentsList.innerHTML = appointmentsHtml;
  
  // Add event listeners for bills buttons
  document.querySelectorAll('#day-bills-list .btn-toggle-status').forEach((btn, index) => {
    btn.addEventListener('click', () => {
      const id = bills[index].id;
      billsManager.toggleBillStatus(id);
      createDayDetailsModal(dateStr, billsManager.getBills(dateStr), appointmentsManager.getAppointments(dateStr), billsManager, appointmentsManager);
    });
  });
  
  document.querySelectorAll('#day-bills-list .btn-edit').forEach((btn, index) => {
    btn.addEventListener('click', () => {
      const id = bills[index].id;
      document.getElementById('day-details-modal').classList.remove('active');
      billsManager.openBillModal(id);
    });
  });
  
  // Add event listeners for appointments buttons
  document.querySelectorAll('#day-appointments-list .btn-edit-appointment').forEach((btn, index) => {
    btn.addEventListener('click', () => {
      const id = appointments[index].id;
      document.getElementById('day-details-modal').classList.remove('active');
      appointmentsManager.openAppointmentModal(id);
    });
  });
  
  // Close the modal when clicking the close button
  document.querySelector('#day-details-modal .close-btn').addEventListener('click', () => {
    modal.classList.remove('active');
  });
  
  modal.classList.add('active');
}