// Catalogue Edit Page functionality

function initCatalogueEdit() {
  // Segmented control functionality
  const segmentButtons = document.querySelectorAll('.segment-button');
  
  segmentButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Remove active class from all buttons in the same control
      const control = this.closest('.segmented-control');
      control.querySelectorAll('.segment-button').forEach(btn => {
        btn.classList.remove('active');
      });
      
      // Add active class to clicked button
      this.classList.add('active');
      
      console.log('Status changed to:', this.dataset.value || this.textContent);
    });
  });
  
  // Expandable rows functionality
  const expandButtons = document.querySelectorAll('.expand-button');
  
  expandButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.stopPropagation();
      const row = this.closest('.expandable-row');
      row.classList.toggle('expanded');
      
      // Update button text
      this.textContent = row.classList.contains('expanded') ? '▼' : '▶';
    });
  });
  
  // Country row click to open pricing panel
  const countryRows = document.querySelectorAll('.country-row');
  const pricingPanel = document.getElementById('pricingPanel');
  const panelOverlay = document.getElementById('panelOverlay');
  const closePricingPanel = document.getElementById('closePricingPanel');
  const cancelPricingPanel = document.getElementById('cancelPricingPanel');
  
  if (countryRows.length && pricingPanel) {
    countryRows.forEach(row => {
      row.addEventListener('click', function(e) {
        // Don't open if clicking on expand button, toggle, or overflow menu
        if (e.target.closest('.expand-button') || 
            e.target.closest('.toggle-switch') || 
            e.target.closest('.btn-icon') ||
            e.target.closest('.stock-chip') ||
            e.target.closest('.inline-action')) {
          return;
        }
        
        openPricingPanel();
      });
    });
    
    function openPricingPanel() {
      pricingPanel.classList.add('open');
      panelOverlay.classList.add('show');
      document.body.style.overflow = 'hidden';
    }
    
    function closePricingPanelFn() {
      pricingPanel.classList.remove('open');
      panelOverlay.classList.remove('show');
      document.body.style.overflow = '';
    }
    
    closePricingPanel.addEventListener('click', closePricingPanelFn);
    cancelPricingPanel.addEventListener('click', closePricingPanelFn);
    panelOverlay.addEventListener('click', closePricingPanelFn);
  }
  
  // Override toggle in pricing panel
  const overrideToggle = document.getElementById('overrideToggle');
  const overrideSection = document.getElementById('overrideSection');
  
  if (overrideToggle && overrideSection) {
    overrideToggle.addEventListener('change', function() {
      overrideSection.style.display = this.checked ? 'block' : 'none';
    });
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCatalogueEdit);
} else {
  initCatalogueEdit();
}
