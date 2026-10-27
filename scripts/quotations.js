// Orders · Quotation submodule. Browser-local prototype storage; pricing calculations are estimates for review.
(() => {
  const STORE_KEY = 'sap-order-quotations-v1';
  const $ = id => document.getElementById(id);
  const html = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const money = value => number(value).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const countries = Object.entries(WH_COUNTRIES).map(([code, value]) => ({ value: code, label: `${value[0]} ${value[1]}` }));
  const currencies = Object.keys(FX_RATES).map(code => ({ value: code, label: code }));
  const vendors = Object.entries(SUPPLY_SUPPLIERS).map(([id, vendor]) => ({ value: id, label: vendor.name }));
  const locations = WAREHOUSES.filter(location => location.status !== 'Decommissioned').map(location => ({ value: location.name, label: location.name }));
  const clients = WH_CLIENTS.map(client => ({ value: client.name, label: client.name }));
  const fields = [
    { key: 'ticket', label: 'FD Ticket #', group: 'Request & client' },
    { key: 'opsPic', label: 'OPS PIC', group: 'Request & client', required: true },
    { key: 'client', label: 'Client Name', group: 'Request & client', type: 'select', options: clients, required: true },
    { key: 'country', label: 'Country', group: 'Request & client', type: 'select', options: countries, required: true },
    { key: 'storageLocation', label: 'Storage Location', group: 'Request & client', type: 'select', options: locations },
    { key: 'quantity', label: 'Total Units (Qty)', group: 'Request & client', type: 'number', min: 1, step: 1, required: true, value: 1 },
    { key: 'vendor', label: 'Vendor', group: 'Product & vendor', type: 'select', options: vendors, required: true },
    { key: 'currency', label: 'Currency', group: 'Product & vendor', type: 'select', options: currencies, value: 'SGD', required: true },
    { key: 'productName', label: 'Product Name', group: 'Product & vendor', required: true },
    { key: 'leadTime', label: 'Lead Time', group: 'Product & vendor', placeholder: 'e.g. 3–5 business days' },
    { key: 'buyingPrice', label: 'Buying Price Exc Tax (Local)', group: 'Local pricing', type: 'number', min: 0, step: '0.01', required: true },
    { key: 'taxPercent', label: 'Tax %', group: 'Local pricing', type: 'number', min: 0, step: '0.01', value: 0 },
    { key: 'deliveryFees', label: 'Delivery Fees (Local)', group: 'Local pricing', type: 'number', min: 0, step: '0.01', value: 0 },
    { key: 'unitPriceIncTax', label: 'Unit Price Inc Tax (Local)', group: 'Local pricing', type: 'number', computed: true },
    { key: 'targetMarkup', label: 'Target Proc Markup %', group: 'Local pricing', type: 'number', min: 0, step: '0.01', value: 0 },
    { key: 'priceAfterMarkup', label: 'Price after Markup (Local)', group: 'Local pricing', type: 'number', computed: true },
    { key: 'mrpLocal', label: 'MRP Price (Local)', group: 'Local pricing', type: 'number', min: 0, step: '0.01' },
    { key: 'fxRate', label: 'FX Rate (Local→USD)', group: 'USD pricing & margin', type: 'number', min: 0.000001, step: '0.000001', required: true, value: FX_RATES.SGD },
    { key: 'fxBuffer', label: 'FX Buffer Markup', group: 'USD pricing & margin', type: 'number', min: 0, step: '0.01', value: 0 },
    { key: 'unitPriceUsd', label: 'Unit Price USD (after markup)', group: 'USD pricing & margin', type: 'number', computed: true },
    { key: 'landedCostUnitUsd', label: 'Landed Cost USD (unit, pre-markup)', group: 'USD pricing & margin', type: 'number', computed: true },
    { key: 'totalQuotedUsd', label: 'Total Quoted Price (USD)', group: 'USD pricing & margin', type: 'number', computed: true },
    { key: 'marginUsd', label: '$ Margin (USD)', group: 'USD pricing & margin', type: 'number', computed: true },
    { key: 'totalLandedUsd', label: 'Total Landed Cost (USD)', group: 'USD pricing & margin', type: 'number', computed: true },
    { key: 'marginPercent', label: 'Margin % (USD)', group: 'USD pricing & margin', type: 'number', computed: true },
    { key: 'actualMarkupUsd', label: 'Markup % (USD, actual)', group: 'USD pricing & margin', type: 'number', computed: true },
    { key: 'mrpUsd', label: 'MRP Price (USD)', group: 'USD pricing & margin', type: 'number', computed: true },
    { key: 'mrpVarianceLocal', label: 'Above/Below MRP % (Local, pre-FX)', group: 'USD pricing & margin', type: 'number', computed: true },
    { key: 'mrpVarianceUsd', label: 'Above/Below MRP % (USD)', group: 'USD pricing & margin', type: 'number', computed: true },
    { key: 'review', label: 'Review', group: 'Review & approval', type: 'select', options: ['Pending', 'In review', 'Approved', 'Needs revision', 'Rejected'].map(value => ({ value, label: value })), value: 'Pending' },
    { key: 'hodPolicyFlag', label: 'HOD Policy Flag', group: 'Review & approval', type: 'select', options: ['Not reviewed', 'Within policy', 'Policy exception'].map(value => ({ value, label: value })), value: 'Not reviewed' },
    { key: 'hodApprovalStatus', label: 'HOD Approval Status', group: 'Review & approval', type: 'select', options: ['Awaiting approval', 'Approved', 'Rejected', 'Not required'].map(value => ({ value, label: value })), value: 'Awaiting approval' },
    { key: 'approvalDate', label: 'Approval Date', group: 'Review & approval', type: 'date' },
    { key: 'comments', label: 'Comments', group: 'Review & approval', type: 'textarea' },
    { key: 'finalStatus', label: 'Final Status', group: 'Review & approval', type: 'select', options: ['Draft', 'Pending review', 'Approved', 'Rejected', 'Converted to order'].map(value => ({ value, label: value })), value: 'Draft' },
    { key: 'quoteNumber', label: 'Quote Number', group: 'Quote & fulfilment' },
    { key: 'quoteStatus', label: 'Quote Status', group: 'Quote & fulfilment', type: 'select', options: ['Draft', 'Sent', 'Accepted', 'Declined', 'Expired'].map(value => ({ value, label: value })), value: 'Draft' },
    { key: 'orderNumber', label: 'Order Number', group: 'Quote & fulfilment' },
    { key: 'eta', label: 'ETA', group: 'Quote & fulfilment', type: 'date' }
  ];
  const calculatedKeys = new Set(fields.filter(field => field.computed).map(field => field.key));
  const SAMPLE_SEED_KEY = 'sap-order-quotations-samples-v1';

  function sampleQuote(data) {
    const qty = data.quantity;
    const perUnitDelivery = data.deliveryFees / qty;
    const unitPriceIncTax = (data.buyingPrice + perUnitDelivery) * (1 + data.taxPercent / 100);
    const priceAfterMarkup = unitPriceIncTax * (1 + data.targetMarkup / 100);
    const landedCostUnitUsd = unitPriceIncTax / data.fxRate;
    const unitPriceUsd = (priceAfterMarkup / data.fxRate) * (1 + data.fxBuffer / 100);
    const totalQuotedUsd = unitPriceUsd * qty;
    const totalLandedUsd = landedCostUnitUsd * qty;
    const mrpUsd = data.mrpLocal / data.fxRate;
    return {
      ticket: '', opsPic: '', client: '', country: '', storageLocation: '', quantity: 1,
      vendor: '', currency: 'USD', productName: '', leadTime: '', buyingPrice: 0,
      taxPercent: 0, deliveryFees: 0, unitPriceIncTax, targetMarkup: 0,
      priceAfterMarkup, mrpLocal: 0, fxRate: 1, fxBuffer: 0, unitPriceUsd,
      landedCostUnitUsd, totalQuotedUsd, marginUsd: totalQuotedUsd - totalLandedUsd,
      totalLandedUsd, marginPercent: totalQuotedUsd ? (totalQuotedUsd - totalLandedUsd) / totalQuotedUsd * 100 : 0,
      actualMarkupUsd: landedCostUnitUsd ? (unitPriceUsd / landedCostUnitUsd - 1) * 100 : 0,
      mrpUsd, mrpVarianceLocal: data.mrpLocal ? (priceAfterMarkup / data.mrpLocal - 1) * 100 : 0,
      mrpVarianceUsd: mrpUsd ? (unitPriceUsd / mrpUsd - 1) * 100 : 0,
      review: 'Pending', hodPolicyFlag: 'Not reviewed', hodApprovalStatus: 'Awaiting approval',
      approvalDate: '', comments: '', finalStatus: 'Draft', quoteNumber: '',
      quoteStatus: 'Draft', orderNumber: '', eta: '', ...data,
      unitPriceIncTax, priceAfterMarkup, unitPriceUsd, landedCostUnitUsd,
      totalQuotedUsd, totalLandedUsd, mrpUsd,
      marginUsd: totalQuotedUsd - totalLandedUsd,
      marginPercent: totalQuotedUsd ? (totalQuotedUsd - totalLandedUsd) / totalQuotedUsd * 100 : 0,
      actualMarkupUsd: landedCostUnitUsd ? (unitPriceUsd / landedCostUnitUsd - 1) * 100 : 0,
      mrpVarianceLocal: data.mrpLocal ? (priceAfterMarkup / data.mrpLocal - 1) * 100 : 0,
      mrpVarianceUsd: mrpUsd ? (unitPriceUsd / mrpUsd - 1) * 100 : 0
    };
  }

  function sampleQuotes() {
    return [
      sampleQuote({ ticket: 'FD-4821', opsPic: 'Aisha Rahman', client: 'Acme Tech', country: 'SG', storageLocation: 'Singapore Hub', quantity: 12, vendor: 'ingram', currency: 'SGD', productName: 'MacBook Pro 14-inch · M3 Pro', leadTime: '4–6 business days', buyingPrice: 2780, taxPercent: 9, deliveryFees: 240, targetMarkup: 8, mrpLocal: 3499, fxRate: 1.34, fxBuffer: 2, review: 'Approved', hodPolicyFlag: 'Within policy', hodApprovalStatus: 'Approved', approvalDate: '2026-10-21', comments: 'Volume pricing confirmed with supplier. Delivery to Singapore Hub.', finalStatus: 'Approved', quoteNumber: 'QT-2026-0048', quoteStatus: 'Sent', eta: '2026-11-18', createdAt: '2026-10-24T09:30:00.000Z' }),
      sampleQuote({ ticket: 'FD-4810', opsPic: 'Hannah Clarke', client: 'Digital Solutions', country: 'AU', storageLocation: 'Sydney Hub', quantity: 4, vendor: 'vendorB', currency: 'AUD', productName: 'ThinkPad X1 Carbon Gen 12', leadTime: '3–5 business days', buyingPrice: 1890, taxPercent: 10, deliveryFees: 80, targetMarkup: 12, mrpLocal: 2599, fxRate: 1.52, fxBuffer: 3, review: 'In review', hodPolicyFlag: 'Policy exception', hodApprovalStatus: 'Awaiting approval', approvalDate: '', comments: 'Markup is above standard target; HOD review requested before sending.', finalStatus: 'Pending review', quoteNumber: 'QT-2026-0047', quoteStatus: 'Draft', eta: '2026-11-06', createdAt: '2026-10-23T04:15:00.000Z' }),
      sampleQuote({ ticket: 'FD-4776', opsPic: 'Marcus Lee', client: 'TechGlobal Inc', country: 'US', storageLocation: 'US East Hub', quantity: 25, vendor: 'vendorC', currency: 'USD', productName: 'Dell UltraSharp 27-inch Monitor', leadTime: '3–5 business days', buyingPrice: 1220, taxPercent: 8.25, deliveryFees: 375, targetMarkup: 10, mrpLocal: 1699, fxRate: 1, fxBuffer: 0.5, review: 'Approved', hodPolicyFlag: 'Within policy', hodApprovalStatus: 'Approved', approvalDate: '2026-10-20', comments: 'Bulk quote accepted. Linked order created for the rollout.', finalStatus: 'Converted to order', quoteNumber: 'QT-2026-0046', quoteStatus: 'Accepted', orderNumber: 'ORD-58839', eta: '2026-11-12', createdAt: '2026-10-20T13:00:00.000Z' }),
      sampleQuote({ ticket: 'FD-4742', opsPic: 'Olivia Hart', client: 'FinanceExperts', country: 'GB', storageLocation: 'London Hub (Park Royal)', quantity: 6, vendor: 'vendorB', currency: 'GBP', productName: 'MacBook Air 13-inch · M3', leadTime: '3–4 business days', buyingPrice: 1640, taxPercent: 20, deliveryFees: 125, targetMarkup: 5, mrpLocal: 1999, fxRate: 0.79, fxBuffer: 2.5, review: 'Rejected', hodPolicyFlag: 'Policy exception', hodApprovalStatus: 'Rejected', approvalDate: '2026-10-17', comments: 'Declined: revised vendor price exceeded the approved client budget.', finalStatus: 'Rejected', quoteNumber: 'QT-2026-0045', quoteStatus: 'Declined', eta: '', createdAt: '2026-10-17T08:45:00.000Z' }),
      sampleQuote({ ticket: 'FD-4708', opsPic: 'Mei Lin Tan', client: 'MediaWorks', country: 'MY', storageLocation: 'Kuala Lumpur Hub', quantity: 8, vendor: 'vendorA', currency: 'MYR', productName: 'Logitech MX Master 3S · Business', leadTime: '3–4 business days', buyingPrice: 420, taxPercent: 10, deliveryFees: 96, targetMarkup: 7, mrpLocal: 599, fxRate: 4.45, fxBuffer: 2, review: 'Pending', hodPolicyFlag: 'Not reviewed', hodApprovalStatus: 'Awaiting approval', approvalDate: '', comments: 'Initial procurement estimate. Awaiting vendor confirmation of available stock.', finalStatus: 'Draft', quoteNumber: 'QT-2026-0044', quoteStatus: 'Draft', eta: '2026-11-10', createdAt: '2026-10-15T02:20:00.000Z' })
    ];
  }

  function loadQuotes() {
    try {
      const saved = localStorage.getItem(STORE_KEY);
      const stored = JSON.parse(saved || '[]');
      if (Array.isArray(stored) && stored.length) {
        localStorage.setItem(SAMPLE_SEED_KEY, '1');
        return stored;
      }
      if (localStorage.getItem(SAMPLE_SEED_KEY)) return Array.isArray(stored) ? stored : [];
      const samples = sampleQuotes();
      localStorage.setItem(STORE_KEY, JSON.stringify(samples));
      localStorage.setItem(SAMPLE_SEED_KEY, '1');
      return samples;
    } catch { return []; }
  }
  let quotes = loadQuotes();
  let toastTimer;
  let lastCurrency = 'SGD';

  function persist() { localStorage.setItem(STORE_KEY, JSON.stringify(quotes)); }
  function inputMarkup(field) {
    const id = `qt-${field.key}`;
    const common = `id="${id}" name="${field.key}" ${field.required ? 'required' : ''} ${field.computed ? 'readonly aria-readonly="true"' : ''}`;
    if (field.type === 'select') {
      return `<select ${common}><option value="">Choose…</option>${field.options.map(option => `<option value="${html(option.value)}" ${option.value === field.value ? 'selected' : ''}>${html(option.label)}</option>`).join('')}</select>`;
    }
    if (field.type === 'textarea') return `<textarea ${common} rows="3" placeholder="Add context, assumptions or approval notes"></textarea>`;
    const type = field.type || 'text';
    const numeric = type === 'number' ? `min="${field.min ?? ''}" step="${field.step || 'any'}"` : '';
    const computedPlaceholder = field.computed ? 'Calculated automatically' : (field.placeholder || '');
    return `<input ${common} type="${type}" ${numeric} placeholder="${html(computedPlaceholder)}" ${field.value !== undefined ? `value="${field.value}"` : ''}>`;
  }

  function renderForm() {
    const groups = [...new Set(fields.map(field => field.group))];
    $('qtFields').innerHTML = groups.map(group => `<fieldset class="qt-field-group"><legend>${html(group)}</legend><div class="qt-fields-grid">${fields.filter(field => field.group === group).map(field => `<label class="qt-field${field.type === 'textarea' ? ' qt-field-wide' : ''}${field.computed ? ' qt-field-computed' : ''}" for="qt-${field.key}"><span>${html(field.label)}${field.required ? ' <b>*</b>' : ''}${field.computed ? '<small>Auto</small>' : ''}</span>${inputMarkup(field)}</label>`).join('')}</div></fieldset>`).join('');
    $('qtForm').addEventListener('input', updateCalculations);
    $('qtForm').addEventListener('change', updateCalculations);
    updateCalculations();
  }

  const value = key => $(`qt-${key}`)?.value ?? '';
  const setCalc = (key, result) => { const input = $(`qt-${key}`); if (input) input.value = Number.isFinite(result) ? result.toFixed(2) : ''; };
  function updateCalculations() {
    if (!$('qtForm')) return;
    const currency = value('currency') || 'SGD';
    const fxInput = $('qt-fxRate');
    if (fxInput && (!fxInput.value || number(fxInput.value) === number(FX_RATES[lastCurrency]))) {
      fxInput.value = String(FX_RATES[currency] || 1);
    }
    lastCurrency = currency;
    const qty = Math.max(1, number(value('quantity')));
    const buy = number(value('buyingPrice'));
    const tax = number(value('taxPercent')) / 100;
    const deliveryEach = number(value('deliveryFees')) / qty;
    const fxRate = number(value('fxRate')) || number(FX_RATES[value('currency')]) || 1;
    const fxBuffer = number(value('fxBuffer')) / 100;
    const priceLocal = (buy + deliveryEach) * (1 + tax);
    const markupLocal = priceLocal * (1 + number(value('targetMarkup')) / 100);
    const landedUsd = priceLocal / fxRate;
    const unitUsd = (markupLocal / fxRate) * (1 + fxBuffer);
    const quoteUsd = unitUsd * qty;
    const landedTotal = landedUsd * qty;
    const margin = quoteUsd - landedTotal;
    const mrpLocal = number(value('mrpLocal'));
    const mrpUsd = mrpLocal / fxRate;
    setCalc('unitPriceIncTax', priceLocal);
    setCalc('priceAfterMarkup', markupLocal);
    setCalc('unitPriceUsd', unitUsd);
    setCalc('landedCostUnitUsd', landedUsd);
    setCalc('totalQuotedUsd', quoteUsd);
    setCalc('marginUsd', margin);
    setCalc('totalLandedUsd', landedTotal);
    setCalc('marginPercent', quoteUsd ? margin / quoteUsd * 100 : 0);
    setCalc('actualMarkupUsd', landedUsd ? (unitUsd / landedUsd - 1) * 100 : 0);
    setCalc('mrpUsd', mrpUsd);
    setCalc('mrpVarianceLocal', mrpLocal ? (markupLocal / mrpLocal - 1) * 100 : 0);
    setCalc('mrpVarianceUsd', mrpUsd ? (unitUsd / mrpUsd - 1) * 100 : 0);
  }

  function readForm() {
    const record = {};
    fields.forEach(field => { record[field.key] = value(field.key).trim(); });
    calculatedKeys.forEach(key => { record[key] = number(record[key]); });
    record.quantity = number(record.quantity);
    record.createdAt = new Date().toISOString();
    if (!record.quoteNumber) {
      const seq = String(quotes.length + 1).padStart(4, '0');
      record.quoteNumber = `QT-${new Date().getFullYear()}-${seq}`;
      $('qt-quoteNumber').value = record.quoteNumber;
    }
    return record;
  }

  function fieldValue(field, record) {
    const value = record[field.key];
    if (value === '' || value === null || value === undefined) return '—';
    if (calculatedKeys.has(field.key) || ['buyingPrice', 'deliveryFees', 'unitPriceIncTax', 'priceAfterMarkup', 'mrpLocal'].includes(field.key)) return money(value);
    if (field.key === 'country') return WH_COUNTRIES[value]?.[1] || value;
    if (field.key === 'vendor') return SUPPLY_SUPPLIERS[value]?.name || value;
    return value;
  }

  function quoteCard(record) {
    const status = record.quoteStatus || 'Draft';
    const detailGroups = [...new Set(fields.map(field => field.group))];
    return `<article class="qt-card"><div class="qt-card-top"><div><span class="qt-number">${html(record.quoteNumber || 'Unnumbered quote')}</span><span class="qt-date">${new Date(record.createdAt || Date.now()).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div><span class="qt-status" data-status="${html(status.toLowerCase())}">${html(status)}</span></div><div class="qt-card-main"><div><small>CLIENT</small><strong>${html(record.client || 'Client not selected')}</strong></div><div><small>PRODUCT</small><strong>${html(record.productName || 'Product not specified')}</strong></div><div><small>VENDOR</small><strong>${html(SUPPLY_SUPPLIERS[record.vendor]?.name || record.vendor || '—')}</strong></div><div><small>QUANTITY</small><strong>${html(record.quantity || 0)} units</strong></div><div><small>TOTAL QUOTED</small><strong>USD ${money(record.totalQuotedUsd)}</strong></div><div><small>MARGIN</small><strong>${money(record.marginPercent)}%</strong></div></div><details class="qt-details"><summary>View all quotation fields <span>⌄</span></summary>${detailGroups.map(group => `<section class="qt-detail-group"><h3>${html(group)}</h3><dl>${fields.filter(field => field.group === group).map(field => `<div><dt>${html(field.label)}</dt><dd>${html(fieldValue(field, record))}</dd></div>`).join('')}</dl></section>`).join('')}</details><div class="qt-card-footer"><span>${html(record.finalStatus || 'Draft')}${record.orderNumber ? ` · Order ${html(record.orderNumber)}` : ''}</span><button type="button" class="qt-delete" data-delete-quote="${html(record.quoteNumber)}">Delete</button></div></article>`;
  }

  function renderList() {
    const query = $('qtSearch').value.trim().toLowerCase();
    const status = $('qtStatusFilter').value;
    const client = $('qtClientFilter').value;
    const vendor = $('qtVendorFilter').value;
    const product = $('qtProductFilter').value;
    const filtered = quotes.filter(record => {
      if (status && record.quoteStatus !== status) return false;
      if (client && record.client !== client) return false;
      if (vendor && record.vendor !== vendor) return false;
      if (product && record.productName !== product) return false;
      return !query || fields.some(field => String(record[field.key] ?? '').toLowerCase().includes(query));
    }).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    $('qtCount').textContent = `${filtered.length} quotation${filtered.length === 1 ? '' : 's'}${filtered.length !== quotes.length ? ` · ${quotes.length} total` : ''}`;
    $('qtList').innerHTML = filtered.map(quoteCard).join('') || `<div class="qt-empty"><span>▤</span><strong>${quotes.length ? 'No matching quotations' : 'No quotations yet'}</strong><p>${quotes.length ? 'Try another search or status filter.' : 'Create a quotation to capture pricing, margin and approvals.'}</p>${quotes.length ? '' : '<button type="button" class="btn btn-primary" data-empty-create>Create first quotation</button>'}</div>`;
  }

  function showToast(message) {
    const toast = $('qtToast');
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2500);
  }

  function openForm() {
    $('qtEditor').hidden = false;
    $('qtEditor').scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('qt-opsPic').focus({ preventScroll: true });
  }
  function closeForm() { $('qtEditor').hidden = true; $('qtForm').reset(); updateCalculations(); }

  $('qtCreate').addEventListener('click', openForm);
  $('qtList').addEventListener('click', event => {
    if (event.target.closest('[data-empty-create]')) { openForm(); return; }
    const remove = event.target.closest('[data-delete-quote]');
    if (!remove) return;
    const record = quotes.find(quote => quote.quoteNumber === remove.dataset.deleteQuote);
    if (!record || !window.confirm(`Delete quotation ${record.quoteNumber}?`)) return;
    quotes = quotes.filter(quote => quote !== record);
    persist(); renderList(); showToast('Quotation deleted');
  });
  $('qtClose').addEventListener('click', closeForm);
  $('qtCancel').addEventListener('click', closeForm);
  $('qtSearch').addEventListener('input', renderList);
  const fillFilter = (id, entries, labelForValue = value => value) => {
    const select = $(id);
    const current = select.value;
    const values = [...new Set(entries.filter(value => value !== null && value !== undefined && String(value).trim() !== ''))].sort((a, b) => String(labelForValue(a)).localeCompare(String(labelForValue(b))));
    select.innerHTML = `<option value="">${id === 'qtClientFilter' ? 'All clients' : id === 'qtVendorFilter' ? 'All vendors' : 'All products'}</option>${values.map(value => `<option value="${html(value)}">${html(labelForValue(value))}</option>`).join('')}`;
    if (values.includes(current)) select.value = current;
  };
  const refreshFilterOptions = () => {
    fillFilter('qtClientFilter', quotes.map(quote => quote.client));
    fillFilter('qtVendorFilter', quotes.map(quote => quote.vendor), id => SUPPLY_SUPPLIERS[id]?.name || id);
    fillFilter('qtProductFilter', quotes.map(quote => quote.productName));
  };
  ['qtClientFilter', 'qtVendorFilter', 'qtProductFilter'].forEach(id => $(id).addEventListener('change', renderList));
  $('qtClearFilters').addEventListener('click', () => {
    $('qtSearch').value = '';
    ['qtClientFilter', 'qtVendorFilter', 'qtProductFilter', 'qtStatusFilter'].forEach(id => { $(id).value = ''; });
    renderList();
  });
  const statuses = fields.find(field => field.key === 'quoteStatus').options;
  $('qtStatusFilter').innerHTML += statuses.map(({ value, label }) => `<option value="${html(value)}">${html(label)}</option>`).join('');
  $('qtStatusFilter').addEventListener('change', renderList);

  $('qtForm').addEventListener('submit', event => {
    event.preventDefault();
    updateCalculations();
    if (!event.currentTarget.reportValidity()) return;
    const record = readForm();
    quotes.unshift(record);
    persist();
    refreshFilterOptions();
    renderList();
    closeForm();
    showToast(`Quotation ${record.quoteNumber} saved`);
  });

  renderForm();
  refreshFilterOptions();
  renderList();
})();
