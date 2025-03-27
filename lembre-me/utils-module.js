/**
 * Utility functions for the Reminder System
 */

// Format a date string (YYYY-MM-DD) to localized date format
export function formatDateCorrectly(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('pt-BR');
}

// Check if a date string is today
export function isSameDay(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const targetDate = new Date(year, month - 1, day);
  
  const today = new Date();
  return targetDate.getDate() === today.getDate() &&
         targetDate.getMonth() === today.getMonth() &&
         targetDate.getFullYear() === today.getFullYear();
}

// Check if a date belongs to the current month
export function isCurrentMonth(dateStr) {
  const [year, month] = dateStr.split('-').map(Number);
  const today = new Date();
  return month - 1 === today.getMonth() && year === today.getFullYear();
}

// Show a temporary notification
export function showNotification(message, type = 'info') {
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
  
  // Add event listener to close
  notification.querySelector('.notification-close').addEventListener('click', () => {
    notification.classList.add('fade-out');
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 300);
  });
  
  // Automatically close after 5 seconds
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

// Format file size for display
export function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  else return (bytes / 1048576).toFixed(1) + ' MB';
}