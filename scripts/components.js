// Tab component functionality
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabGroup = button.closest('.tabs').dataset.tabGroup || 'default';
      const targetId = button.dataset.tab;
      
      // Remove active class from all tabs in this group
      document.querySelectorAll(`[data-tab-group="${tabGroup}"] .tab-button`).forEach(btn => {
        btn.classList.remove('active');
      });
      
      document.querySelectorAll(`[data-tab-group="${tabGroup}"] .tab-content`).forEach(content => {
        content.classList.remove('active');
      });
      
      // Add active class to clicked tab and corresponding content
      button.classList.add('active');
      const targetContent = document.getElementById(targetId);
      if (targetContent) {
        targetContent.classList.add('active');
      }
    });
  });
}

// Modal functionality
function initModals() {
  // Open modal
  document.querySelectorAll('[data-modal-open]').forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const modalId = trigger.dataset.modalOpen;
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
      }
    });
  });
  
  // Close modal
  document.querySelectorAll('[data-modal-close]').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
      const modal = closeBtn.closest('.modal-overlay');
      if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
      }
    });
  });
  
  // Close modal on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('show');
        document.body.style.overflow = '';
      }
    });
  });
}

// Pagination functionality (demo)
function initPagination() {
  document.querySelectorAll('.pagination-button').forEach(button => {
    button.addEventListener('click', () => {
      if (button.disabled) return;
      
      const pagination = button.closest('.pagination');
      pagination.querySelectorAll('.pagination-button').forEach(btn => {
        btn.classList.remove('active');
      });
      
      if (!button.classList.contains('pagination-prev') && !button.classList.contains('pagination-next')) {
        button.classList.add('active');
      }
      
      // In a real app, this would fetch new data
      console.log('Page changed to:', button.textContent);
    });
  });
}

// Initialize all components
function initComponents() {
  initTabs();
  initModals();
  initPagination();
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initComponents);
} else {
  initComponents();
}
