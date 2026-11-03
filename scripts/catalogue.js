// Catalogue page functionality

function initCatalogue() {
  const addModelButton = document.getElementById('addModelButton');
  const addModelModal = document.getElementById('addModelModal');
  const newModelName = document.getElementById('newModelName');
  const newModelNameError = document.getElementById('newModelNameError');
  const addModelNext = document.getElementById('addModelNext');

  if (addModelButton && addModelModal && newModelName && newModelNameError && addModelNext) {
    const steps = [...addModelModal.querySelectorAll('[data-step]')];
    const indicators = [...addModelModal.querySelectorAll('[data-step-indicator]')];
    const backButton = document.getElementById('addModelBack');
    const ramInput = document.getElementById('newModelRam');
    const storageInput = document.getElementById('newModelStorage');
    const defaultRam = document.getElementById('newModelDefaultRam');
    const defaultStorage = document.getElementById('newModelDefaultStorage');
    const matrix = document.getElementById('newModelMatrix');
    const combinationCount = document.getElementById('newModelCombinationCount');
    const marketSummary = document.getElementById('newModelMarketSummary');
    const review = document.getElementById('newModelReview');
    let activeStep = 1;
    let validCombinations = new Set();
    let knownCombinations = new Set();

    const parseOptions = input => [...new Set(input.value.split(',').map(option => option.trim()).filter(Boolean))];
    const setSelectOptions = (select, values, placeholder) => {
      const previous = select.value;
      select.replaceChildren(new Option(placeholder, ''));
      values.forEach(value => select.add(new Option(value, value)));
      select.disabled = values.length === 0;
      select.value = values.includes(previous) ? previous : values[0] || '';
    };
    const combinationKey = (ram, storage) => JSON.stringify([ram, storage]);

    function renderMatrix() {
      const ramOptions = parseOptions(ramInput);
      const storageOptions = parseOptions(storageInput);
      const rams = ramOptions.length ? ramOptions : ['—'];
      const storages = storageOptions.length ? storageOptions : ['—'];
      const combinations = rams.flatMap(ram => storages.map(storage => [ram, storage]));
      const currentKeys = combinations.map(([ram, storage]) => combinationKey(ram, storage));
      const nextValid = new Set(currentKeys.filter(key => !knownCombinations.has(key) || validCombinations.has(key)));
      validCombinations = nextValid;
      knownCombinations = new Set(currentKeys);

      setSelectOptions(defaultRam, ramOptions, ramOptions.length ? 'Select default RAM' : 'No RAM options');
      setSelectOptions(defaultStorage, storageOptions, storageOptions.length ? 'Select default storage' : 'No storage options');

      const table = document.createElement('table');
      table.className = 'table add-model-combination-table';
      const thead = document.createElement('thead');
      const heading = document.createElement('tr');
      ['RAM', 'Storage', 'Valid'].forEach(label => {
        const th = document.createElement('th');
        th.textContent = label;
        heading.append(th);
      });
      thead.append(heading);
      const tbody = document.createElement('tbody');
      combinations.forEach(([ram, storage]) => {
        const key = combinationKey(ram, storage);
        const row = document.createElement('tr');
        [ram, storage].forEach(value => {
          const cell = document.createElement('td');
          cell.textContent = value;
          row.append(cell);
        });
        const validCell = document.createElement('td');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = validCombinations.has(key);
        checkbox.dataset.combination = key;
        checkbox.setAttribute('aria-label', `Mark ${ram} / ${storage} valid`);
        validCell.append(checkbox);
        row.append(validCell);
        tbody.append(row);
      });
      table.append(thead, tbody);
      matrix.replaceChildren(table);
      updateCombinationCount();
    }

    function updateCombinationCount() {
      const validCount = validCombinations.size;
      const total = [...matrix.querySelectorAll('[data-combination]')].length;
      combinationCount.textContent = total ? `${validCount} of ${total} valid` : 'Enter options to build the matrix';
    }

    function updateMarkets() {
      const selected = [...addModelModal.querySelectorAll('[data-model-country]:checked')];
      marketSummary.textContent = selected.length
        ? `${selected.length} market draft${selected.length === 1 ? '' : 's'} selected. Each starts without vendor mappings or approved prices.`
        : 'No country listings selected. The model can be set up without markets and configured later.';
    }

    function showStep(step) {
      activeStep = step;
      steps.forEach(section => { section.hidden = Number(section.dataset.step) !== step; });
      indicators.forEach(indicator => {
        const index = Number(indicator.dataset.stepIndicator);
        indicator.classList.toggle('active', index === step);
        indicator.classList.toggle('complete', index < step);
        if (index === step) indicator.setAttribute('aria-current', 'step');
        else indicator.removeAttribute('aria-current');
      });
      backButton.hidden = step === 1;
      addModelNext.textContent = step === 4 ? 'Close preview' : step === 3 ? 'Review setup' : 'Continue';
      if (step === 4) renderReview();
    }

    function renderReview() {
      const name = newModelName.value.trim();
      const brand = document.getElementById('newModelBrand').value || 'Brand not set';
      const category = document.getElementById('newModelCategory').value || 'Category not set';
      const specs = document.getElementById('newModelSpecs').value.trim() || 'No shared specs entered';
      const ram = parseOptions(ramInput);
      const storage = parseOptions(storageInput);
      const defaults = [defaultRam.value, defaultStorage.value].filter(Boolean).join(' / ') || 'Base configuration';
      const countries = [...addModelModal.querySelectorAll('[data-model-country]:checked')].map(input => input.parentElement.textContent.trim());
      const validCount = validCombinations.size;
      const total = [...matrix.querySelectorAll('[data-combination]')].length;
      const lines = [
        ['Base model', name],
        ['Brand / category', `${brand} · ${category}`],
        ['Shared specifications', specs],
        ['Configuration options', ram.length || storage.length ? `${ram.join(', ') || '—'} RAM · ${storage.join(', ') || '—'} storage` : 'Single base configuration'],
        ['Valid configurations', `${validCount} of ${total}`],
        ['Default configuration', defaults],
        ['Country listings', countries.length ? countries.join(', ') : 'None selected; can be added later'],
        ['Sourcing status', countries.length ? 'Vendor mappings and local pricing still need to be configured per market' : 'No sourcing offers configured']
      ];
      const list = document.createElement('dl');
      list.className = 'add-model-review-list';
      lines.forEach(([label, value]) => {
        const term = document.createElement('dt');
        const description = document.createElement('dd');
        term.textContent = label;
        description.textContent = value;
        list.append(term, description);
      });
      review.replaceChildren(list);
    }

    const closeAddModel = () => {
      addModelModal.classList.remove('show');
      document.body.style.overflow = '';
      addModelButton.focus();
    };

    addModelButton.addEventListener('click', () => {
      addModelModal.classList.add('show');
      document.body.style.overflow = 'hidden';
      newModelNameError.hidden = true;
      showStep(1);
      newModelName.focus();
    });

    addModelModal.querySelectorAll('[data-add-model-close]').forEach(button => {
      button.addEventListener('click', closeAddModel);
    });

    addModelModal.addEventListener('click', event => {
      if (event.target === addModelModal) closeAddModel();
    });

    addModelModal.addEventListener('change', event => {
      if (event.target.matches('[data-combination]')) {
        if (event.target.checked) validCombinations.add(event.target.dataset.combination);
        else validCombinations.delete(event.target.dataset.combination);
        updateCombinationCount();
      }
      if (event.target.matches('[data-model-country]')) updateMarkets();
    });

    ramInput.addEventListener('input', renderMatrix);
    storageInput.addEventListener('input', renderMatrix);
    backButton.addEventListener('click', () => showStep(activeStep - 1));

    addModelNext.addEventListener('click', () => {
      if (activeStep === 4) {
        closeAddModel();
        return;
      }
      if (activeStep === 1 && !newModelName.value.trim()) {
        newModelNameError.hidden = false;
        newModelName.focus();
        return;
      }
      if (activeStep === 2) {
        const ramOptions = parseOptions(ramInput);
        const storageOptions = parseOptions(storageInput);
        const defaultKey = combinationKey(defaultRam.value || '—', defaultStorage.value || '—');
        if (validCombinations.size === 0 || ((defaultRam.value || defaultStorage.value) && !validCombinations.has(defaultKey))) {
          combinationCount.textContent = 'Keep at least one valid configuration and a valid default.';
          return;
        }
        if ((ramOptions.length && defaultRam.value === '') || (storageOptions.length && defaultStorage.value === '')) {
          combinationCount.textContent = 'Choose a default for each specification option.';
          return;
        }
      }
      showStep(activeStep + 1);
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && addModelModal.classList.contains('show')) closeAddModel();
    });
    renderMatrix();
    updateMarkets();
  }

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
