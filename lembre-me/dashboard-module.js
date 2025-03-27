/**
 * Dashboard management module
 */
import { formatDateCorrectly, isCurrentMonth } from './utils-module.js';

export class DashboardManager {
  constructor(persistenceAPI) {
    this.persistenceAPI = persistenceAPI;
  }
  
  // Update dashboard information
  updateDashboard() {
    this.updateFinancialSummary();
    this.updateUpcomingBills();
    this.updateUpcomingAppointments();
  }
  
  // Update financial summary
  updateFinancialSummary() {
    const bills = this.persistenceAPI.getCollection('bills');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Calculate total pending for current month
    const pendingBills = bills.filter(bill => 
      bill.status === 'pending' && isCurrentMonth(bill.dueDate)
    );
    const totalPending = pendingBills.reduce((sum, bill) => sum + bill.amount, 0);
    
    // Calculate total paid in current month
    const paidBills = bills.filter(bill => 
      bill.status === 'paid' && isCurrentMonth(bill.dueDate)
    );
    
    const totalPaid = paidBills.reduce((sum, bill) => sum + bill.amount, 0);
    
    // Calculate total late for current month
    const lateBills = bills.filter(bill => {
      if (bill.status !== 'pending') return false;
      const dueDate = new Date(bill.dueDate);
      return dueDate < today && isCurrentMonth(bill.dueDate);
    });
    
    const totalLate = lateBills.reduce((sum, bill) => sum + bill.amount, 0);
    
    // Update elements on the page
    const pendingElement = document.getElementById('total-pending');
    if (pendingElement) {
      pendingElement.textContent = `R$ ${totalPending.toFixed(2)}`;
    }
    
    const paidElement = document.getElementById('total-paid');
    if (paidElement) {
      paidElement.textContent = `R$ ${totalPaid.toFixed(2)}`;
    }
    
    const lateElement = document.getElementById('total-late');
    if (lateElement) {
      lateElement.textContent = `R$ ${totalLate.toFixed(2)}`;
    }
  }
  
  // Update upcoming bills list
  updateUpcomingBills() {
    const upcomingBillsList = document.getElementById('upcoming-bills');
    if (!upcomingBillsList) return;
    
    const bills = this.persistenceAPI.getCollection('bills');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Filter pending bills for current month
    const pendingBills = bills.filter(bill => 
      bill.status === 'pending' && isCurrentMonth(bill.dueDate)
    );
    
    // Sort by due date
    pendingBills.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    // Limit to 5 bills
    const upcomingBills = pendingBills.slice(0, 5);
    
    let html = '';
    
    if (upcomingBills.length === 0) {
      html = '<li class="empty-message">Nenhuma conta pendente.</li>';
    } else {
      upcomingBills.forEach(bill => {
        const dueDate = new Date(bill.dueDate);
        const isLate = dueDate < today;
        
        html += `
        <li class="reminder-item" data-id="${bill.id}">
          <div class="status ${isLate ? 'late' : 'pending'}"></div>
          <div class="reminder-details">
            <div class="reminder-title">${bill.title}</div>
            <div class="reminder-date">Vencimento: ${formatDateCorrectly(bill.dueDate)}</div>
          </div>
          <div class="reminder-amount">R$ ${bill.amount.toFixed(2)}</div>
        </li>
        `;
      });
    }
    
    upcomingBillsList.innerHTML = html;
    
    // Add event listeners for items
    document.querySelectorAll('#upcoming-bills .reminder-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.getAttribute('data-id');
        // Show bills page
        this.showPage('bills-page');
        // Open bill edit modal
        window.billsManager.openBillModal(id);
      });
    });
  }
  
  // Update upcoming appointments list
  updateUpcomingAppointments() {
    const upcomingAppointmentsList = document.getElementById('upcoming-appointments');
    if (!upcomingAppointmentsList) return;
    
    const appointments = this.persistenceAPI.getCollection('appointments');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Filter future appointments for current month
    const futureAppointments = appointments.filter(appointment => {
      const appointmentDate = new Date(appointment.date);
      return appointmentDate >= today && isCurrentMonth(appointment.date);
    });
    
    // Sort by date
    futureAppointments.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA - dateB;
    });
    
    // Limit to 5 appointments
    const upcomingAppointments = futureAppointments.slice(0, 5);
    
    let html = '';
    
    if (upcomingAppointments.length === 0) {
      html = '<li class="empty-message">Nenhum compromisso agendado.</li>';
    } else {
      upcomingAppointments.forEach(appointment => {
        const appointmentDate = new Date(appointment.date);
        const isToday = appointmentDate.getTime() === today.getTime();
        
        html += `
        <li class="reminder-item" data-id="${appointment.id}">
          <div class="reminder-details">
            <div class="reminder-title">${appointment.title}</div>
            <div class="reminder-date">
              ${isToday ? 'Hoje' : formatDateCorrectly(appointment.date)} às ${appointment.time}
            </div>
            ${appointment.location ? `<div class="reminder-location">Local: ${appointment.location}</div>` : ''}
          </div>
        </li>
        `;
      });
    }
    
    upcomingAppointmentsList.innerHTML = html;
    
    // Add event listeners for items
    document.querySelectorAll('#upcoming-appointments .reminder-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.getAttribute('data-id');
        // Show appointments page
        this.showPage('appointments-page');
        // Open appointment edit modal
        window.appointmentsManager.openAppointmentModal(id);
      });
    });
  }
  
  // Show a specific page
  showPage(pageId) {
    // Update menu
    document.querySelectorAll('.menu-item').forEach(item => {
      item.classList.remove('active');
    });
    document.querySelector(`.menu-item[data-page="${pageId}"]`).classList.add('active');
    
    // Update pages
    document.querySelectorAll('.page').forEach(page => {
      page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
  }
}