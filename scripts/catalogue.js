// Catalogue page functionality

function initCatalogue() {
  const selectAllCheckbox = document.getElementById('selectAll');
  const rowCheckboxes = document.querySelectorAll('.row-checkbox');
  const bulkActionBar = document.getElementById('bulkActionBar');
  const selectionCount = document.getElementById('selectionCount');
  const clearSelectionBtn = document.getElementById('clearSelection');
  
  if (!selectAllCheckbox || !bulkActionBar) return;
  
  // Select all functionality
  selectAllCheckbox.addEventListener('change', function() {
    const isChecked = this.checked;
    rowCheckboxes.forEach(checkbox => {
      checkbox.checked = isChecked;
      const row = checkbox.closest('.catalogue-row');
      if (row) {
        row.classList.toggle('selected', isChecked);
      }
    });
    updateBulkActionBar();
  });
  
  // Individual checkbox functionality
  rowCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      const row = this.closest('.catalogue-row');
      if (row) {
        row.classList.toggle('selected', this.checked);
      }
      
      // Update select all checkbox state
      const checkedCount = document.querySelectorAll('.row-checkbox:checked').length;
      selectAllCheckbox.checked = checkedCount === rowCheckboxes.length;
      selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < rowCheckboxes.length;
      
      updateBulkActionBar();
    });
  });
  
  // Clear selection
  if (clearSelectionBtn) {
    clearSelectionBtn.addEventListener('click', function() {
      rowCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
        const row = checkbox.closest('.catalogue-row');
        if (row) {
          row.classList.remove('selected');
        }
      });
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = false;
      updateBulkActionBar();
    });
  }
  
  function updateBulkActionBar() {
    const checkedCount = document.querySelectorAll('.row-checkbox:checked').length;
    
    if (checkedCount > 0) {
      bulkActionBar.classList.add('show');
      selectionCount.textContent = `${checkedCount} selected`;
    } else {
      bulkActionBar.classList.remove('show');
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCatalogue);
} else {
  initCatalogue();
}
