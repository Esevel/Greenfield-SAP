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
    { key: 'quantity', label: 'Total Units (Qty)', group: 'Request & client', type: 'number', min: 0, step: 1, computed: true, value: 0 },
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
  const PRODUCT_FIELD_KEYS = new Set(['vendor', 'productName', 'leadTime', 'buyingPrice', 'taxPercent', 'deliveryFees', 'unitPriceIncTax', 'targetMarkup', 'priceAfterMarkup', 'mrpLocal', 'unitPriceUsd', 'landedCostUnitUsd', 'marginUsd', 'actualMarkupUsd', 'mrpUsd', 'mrpVarianceLocal', 'mrpVarianceUsd']);
  const SAMPLE_SEED_KEY = 'sap-order-quotations-samples-v1';
  const MULTI_LINE_SAMPLE_KEY = 'sap-order-quotations-multi-samples-v2';

  function calculateProduct(line, fxRate, fxBuffer) {
    const qty = Math.max(1, number(line.quantity));
    const deliveryEach = number(line.deliveryFees) / qty;
    const unitPriceIncTax = (number(line.buyingPrice) + deliveryEach) * (1 + number(line.taxPercent) / 100);
    const priceAfterMarkup = unitPriceIncTax * (1 + number(line.targetMarkup) / 100);
    const landedCostUnitUsd = unitPriceIncTax / fxRate;
    const unitPriceUsd = (priceAfterMarkup / fxRate) * (1 + fxBuffer / 100);
    const totalQuotedUsd = unitPriceUsd * qty;
    const totalLandedUsd = landedCostUnitUsd * qty;
    const marginUsd = totalQuotedUsd - totalLandedUsd;
    const mrpUsd = number(line.mrpLocal) / fxRate;
    return {
      ...line, quantity: qty, unitPriceIncTax, priceAfterMarkup, landedCostUnitUsd,
      unitPriceUsd, totalQuotedUsd, totalLandedUsd, marginUsd,
      marginPercent: totalQuotedUsd ? marginUsd / totalQuotedUsd * 100 : 0,
      actualMarkupUsd: landedCostUnitUsd ? (unitPriceUsd / landedCostUnitUsd - 1) * 100 : 0,
      mrpUsd,
      mrpVarianceLocal: number(line.mrpLocal) ? (priceAfterMarkup / number(line.mrpLocal) - 1) * 100 : 0,
      mrpVarianceUsd: mrpUsd ? (unitPriceUsd / mrpUsd - 1) * 100 : 0
    };
  }

  function normalizeQuote(record) {
    if (Array.isArray(record.products) && record.products.length) {
      const products = record.products.map(line => calculateProduct(line, number(record.fxRate) || 1, number(record.fxBuffer)));
      const quantity = products.reduce((sum, line) => sum + line.quantity, 0);
      const totalQuotedUsd = products.reduce((sum, line) => sum + line.totalQuotedUsd, 0);
      const totalLandedUsd = products.reduce((sum, line) => sum + line.totalLandedUsd, 0);
      const localPriceTotal = products.reduce((sum, line) => sum + line.unitPriceIncTax * line.quantity, 0);
      const localMarkupTotal = products.reduce((sum, line) => sum + line.priceAfterMarkup * line.quantity, 0);
      const localMrpTotal = products.reduce((sum, line) => sum + number(line.mrpLocal) * line.quantity, 0);
      const vendorIds = [...new Set(products.map(line => line.vendor).filter(Boolean))];
      const marginUsd = totalQuotedUsd - totalLandedUsd;
      return {
        ...record, products, quantity, productName: products.map(line => line.productName).filter(Boolean).join(' · '),
        vendor: vendorIds.length > 1 ? 'multiple' : (vendorIds[0] || ''),
        totalQuotedUsd, totalLandedUsd, marginUsd,
        marginPercent: totalQuotedUsd ? marginUsd / totalQuotedUsd * 100 : 0,
        unitPriceIncTax: quantity ? localPriceTotal / quantity : 0,
        priceAfterMarkup: quantity ? localMarkupTotal / quantity : 0,
        unitPriceUsd: quantity ? totalQuotedUsd / quantity : 0,
        landedCostUnitUsd: quantity ? totalLandedUsd / quantity : 0,
        mrpUsd: quantity ? localMrpTotal / (number(record.fxRate) || 1) / quantity : 0,
        mrpVarianceLocal: localMrpTotal ? (localMarkupTotal / localMrpTotal - 1) * 100 : 0,
        mrpVarianceUsd: localMrpTotal ? (totalQuotedUsd / (localMrpTotal / (number(record.fxRate) || 1)) - 1) * 100 : 0,
        actualMarkupUsd: totalLandedUsd ? (totalQuotedUsd / totalLandedUsd - 1) * 100 : 0
      };
    }
    const line = calculateProduct({
      productName: record.productName || '', vendor: record.vendor || '', leadTime: record.leadTime || '',
      quantity: number(record.quantity) || 1, buyingPrice: number(record.buyingPrice),
      taxPercent: number(record.taxPercent), deliveryFees: number(record.deliveryFees),
      targetMarkup: number(record.targetMarkup), mrpLocal: number(record.mrpLocal)
    }, number(record.fxRate) || 1, number(record.fxBuffer));
    return { ...record, products: [line] };
  }

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

  function ensureMultiProductSample(records) {
    if (localStorage.getItem(MULTI_LINE_SAMPLE_KEY)) return records;
    const example = records.find(record => record.quoteNumber === 'QT-2026-0048' && record.client === 'Acme Tech' && record.comments?.includes('Volume pricing confirmed with supplier'));
    if (example && (example.products?.length || 0) < 2) {
      example.products = [
        ...(example.products || [normalizeQuote(example).products[0]]),
        calculateProduct({ productName: 'USB-C Dock · 100W', vendor: 'vendorA', quantity: 12, buyingPrice: 285, taxPercent: 9, deliveryFees: 96, targetMarkup: 8, mrpLocal: 369, leadTime: '2–3 business days' }, number(example.fxRate) || 1, number(example.fxBuffer))
      ];
      Object.assign(example, normalizeQuote(example));
    }

    const digitalQuote = records.find(record => record.quoteNumber === 'QT-2026-0047' && record.client === 'Digital Solutions');
    if (digitalQuote && (digitalQuote.products?.length || 0) < 2) {
      digitalQuote.products = [
        ...(digitalQuote.products || [normalizeQuote(digitalQuote).products[0]]),
        calculateProduct({ productName: 'USB-C Dock · 100W', vendor: 'vendorB', quantity: 4, buyingPrice: 235, taxPercent: 10, deliveryFees: 28, targetMarkup: 12, mrpLocal: 329, leadTime: '3–5 business days' }, number(digitalQuote.fxRate) || 1, number(digitalQuote.fxBuffer))
      ];
      Object.assign(digitalQuote, normalizeQuote(digitalQuote));
    }

    const mediaQuote = records.find(record => record.quoteNumber === 'QT-2026-0044' && record.client === 'MediaWorks');
    if (mediaQuote && (mediaQuote.products?.length || 0) < 2) {
      mediaQuote.products = [
        ...(mediaQuote.products || [normalizeQuote(mediaQuote).products[0]]),
        calculateProduct({ productName: 'MacBook Air 13-inch · M3', vendor: 'ingram', quantity: 2, buyingPrice: 4100, taxPercent: 10, deliveryFees: 40, targetMarkup: 7, mrpLocal: 5299, leadTime: '4–6 business days' }, number(mediaQuote.fxRate) || 1, number(mediaQuote.fxBuffer))
      ];
      Object.assign(mediaQuote, normalizeQuote(mediaQuote));
    }
    localStorage.setItem(MULTI_LINE_SAMPLE_KEY, '1');
    return records;
  }

  function loadQuotes() {
    try {
      const saved = localStorage.getItem(STORE_KEY);
      const stored = JSON.parse(saved || '[]');
      if (Array.isArray(stored) && stored.length) {
        localStorage.setItem(SAMPLE_SEED_KEY, '1');
        const normalized = ensureMultiProductSample(stored.map(normalizeQuote));
        if (JSON.stringify(normalized) !== JSON.stringify(stored)) localStorage.setItem(STORE_KEY, JSON.stringify(normalized));
        return normalized;
      }
      if (localStorage.getItem(SAMPLE_SEED_KEY)) return Array.isArray(stored) ? stored : [];
      const samples = ensureMultiProductSample(sampleQuotes().map(normalizeQuote));
      localStorage.setItem(STORE_KEY, JSON.stringify(samples));
      localStorage.setItem(SAMPLE_SEED_KEY, '1');
      return samples;
    } catch { return []; }
  }
  let quotes = loadQuotes();
  let toastTimer;
  let lastCurrency = 'SGD';
  let nextProductId = 1;
  let editingQuoteNumber = '';

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

  function blankProduct() {
    return { productName: '', vendor: '', quantity: 1, buyingPrice: '', taxPercent: 0, deliveryFees: 0, targetMarkup: 0, mrpLocal: '', leadTime: '' };
  }

  function productLineMarkup(lines = [blankProduct()]) {
    return lines.map((line, index) => `<article class="qt-product-line" data-product-line="${index}">
      <div class="qt-product-line-head"><strong>Product ${index + 1}</strong>${lines.length > 1 ? `<button type="button" class="qt-product-remove" data-remove-product="${index}" aria-label="Remove product ${index + 1}">Remove</button>` : ''}</div>
      <div class="qt-product-input-grid">
        <label class="qt-field qt-product-name"><span>Product Name <b>*</b></span><input data-product-field="productName" value="${html(line.productName)}" required placeholder="Enter product or model"></label>
        <label class="qt-field"><span>Vendor <b>*</b></span><select data-product-field="vendor" required><option value="">Choose…</option>${vendors.map(option => `<option value="${html(option.value)}" ${option.value === line.vendor ? 'selected' : ''}>${html(option.label)}</option>`).join('')}</select></label>
        <label class="qt-field"><span>Quantity <b>*</b></span><input data-product-field="quantity" type="number" min="1" step="1" required value="${html(line.quantity ?? 1)}"></label>
        <label class="qt-field"><span>Buying Price Exc Tax (Local) <b>*</b></span><input data-product-field="buyingPrice" type="number" min="0" step="0.01" required value="${html(line.buyingPrice)}"></label>
        <label class="qt-field"><span>Tax %</span><input data-product-field="taxPercent" type="number" min="0" step="0.01" value="${html(line.taxPercent ?? 0)}"></label>
        <label class="qt-field"><span>Delivery Fees (Local) · line total</span><input data-product-field="deliveryFees" type="number" min="0" step="0.01" value="${html(line.deliveryFees ?? 0)}"></label>
        <label class="qt-field"><span>Target Proc Markup %</span><input data-product-field="targetMarkup" type="number" min="0" step="0.01" value="${html(line.targetMarkup ?? 0)}"></label>
        <label class="qt-field"><span>MRP Price (Local)</span><input data-product-field="mrpLocal" type="number" min="0" step="0.01" value="${html(line.mrpLocal)}"></label>
        <label class="qt-field"><span>Lead Time</span><input data-product-field="leadTime" value="${html(line.leadTime)}" placeholder="e.g. 3–5 business days"></label>
      </div>
      <div class="qt-product-math" data-product-math="${index}"><span>Enter product pricing to see the breakdown.</span></div>
    </article>`).join('');
  }

  function readProductInputs() {
    return [...document.querySelectorAll('.qt-product-line')].map(row => {
      const line = {};
      row.querySelectorAll('[data-product-field]').forEach(input => { line[input.dataset.productField] = input.value; });
      ['quantity', 'buyingPrice', 'taxPercent', 'deliveryFees', 'targetMarkup', 'mrpLocal'].forEach(key => { line[key] = number(line[key]); });
      return line;
    });
  }

  function renderForm() {
    const groups = [...new Set(fields.map(field => field.group))];
    const productEditor = '<section class="qt-products-editor"><div class="qt-products-heading"><div><h3>Products</h3><p>Each product has its own vendor, quantity, tax, delivery, markup and MRP inputs.</p></div><button class="btn btn-secondary btn-sm" type="button" id="qtAddProduct">＋ Add product</button></div><div id="qtProductLines"></div></section>';
    $('qtFields').innerHTML = groups.map(group => {
      const groupFields = fields.filter(field => field.group === group && !PRODUCT_FIELD_KEYS.has(field.key));
      if (!groupFields.length) return '';
      return `<fieldset class="qt-field-group"><legend>${html(group)}</legend><div class="qt-fields-grid">${groupFields.map(field => `<label class="qt-field${field.type === 'textarea' ? ' qt-field-wide' : ''}${field.computed ? ' qt-field-computed' : ''}" for="qt-${field.key}"><span>${html(field.label)}${field.required ? ' <b>*</b>' : ''}${field.computed ? '<small>Auto</small>' : ''}</span>${inputMarkup(field)}</label>`).join('')}</div>${group === 'Product & vendor' ? productEditor : ''}</fieldset>`;
    }).join('') + '<section class="qt-live-breakdown" id="qtLiveBreakdown" aria-live="polite"></section>';
    $('qtProductLines').innerHTML = productLineMarkup();
    $('qtForm').addEventListener('input', updateCalculations);
    $('qtForm').addEventListener('change', updateCalculations);
    $('qtForm').addEventListener('click', event => {
      if (event.target.closest('#qtAddProduct')) {
        const current = readProductInputs();
        current.push(blankProduct());
        $('qtProductLines').innerHTML = productLineMarkup(current);
        updateCalculations();
      }
      const remove = event.target.closest('[data-remove-product]');
      if (remove) {
        const current = readProductInputs().filter((_, index) => index !== Number(remove.dataset.removeProduct));
        $('qtProductLines').innerHTML = productLineMarkup(current.length ? current : [blankProduct()]);
        updateCalculations();
      }
    });
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
    const fxRate = number(value('fxRate')) || number(FX_RATES[value('currency')]) || 1;
    const fxBuffer = number(value('fxBuffer')) / 100;
    const lines = readProductInputs().map(line => calculateProduct(line, fxRate, fxBuffer * 100));
    const totalQty = lines.reduce((sum, line) => sum + line.quantity, 0);
    const totalQuotedUsd = lines.reduce((sum, line) => sum + line.totalQuotedUsd, 0);
    const totalLandedUsd = lines.reduce((sum, line) => sum + line.totalLandedUsd, 0);
    const marginUsd = totalQuotedUsd - totalLandedUsd;
    const localPriceTotal = lines.reduce((sum, line) => sum + line.unitPriceIncTax * line.quantity, 0);
    const localMarkupTotal = lines.reduce((sum, line) => sum + line.priceAfterMarkup * line.quantity, 0);
    const localMrpTotal = lines.reduce((sum, line) => sum + number(line.mrpLocal) * line.quantity, 0);
    setCalc('quantity', totalQty);
    setCalc('unitPriceIncTax', totalQty ? localPriceTotal / totalQty : 0);
    setCalc('priceAfterMarkup', totalQty ? localMarkupTotal / totalQty : 0);
    setCalc('unitPriceUsd', totalQty ? totalQuotedUsd / totalQty : 0);
    setCalc('landedCostUnitUsd', totalQty ? totalLandedUsd / totalQty : 0);
    setCalc('totalQuotedUsd', totalQuotedUsd);
    setCalc('marginUsd', marginUsd);
    setCalc('totalLandedUsd', totalLandedUsd);
    setCalc('marginPercent', totalQuotedUsd ? marginUsd / totalQuotedUsd * 100 : 0);
    setCalc('actualMarkupUsd', totalLandedUsd ? (totalQuotedUsd / totalLandedUsd - 1) * 100 : 0);
    setCalc('mrpUsd', localMrpTotal / fxRate / (totalQty || 1));
    setCalc('mrpVarianceLocal', localMrpTotal ? (localMarkupTotal / localMrpTotal - 1) * 100 : 0);
    setCalc('mrpVarianceUsd', localMrpTotal ? (totalQuotedUsd / (localMrpTotal / fxRate) - 1) * 100 : 0);
    lines.forEach((line, index) => {
      const output = document.querySelector(`[data-product-math="${index}"]`);
      if (!output) return;
      const currency = html(value('currency') || 'SGD');
      output.innerHTML = `<span>Unit inc tax: <strong>${currency} ${money(line.unitPriceIncTax)}</strong></span><span>Delivery / unit: <strong>${currency} ${money(line.quantity ? line.deliveryFees / line.quantity : 0)}</strong></span><span>After markup: <strong>${currency} ${money(line.priceAfterMarkup)}</strong></span><span>Landed / unit: <strong>USD ${money(line.landedCostUnitUsd)}</strong></span><span>Quoted total: <strong>USD ${money(line.totalQuotedUsd)}</strong></span><span>Margin: <strong>USD ${money(line.marginUsd)} · ${money(line.marginPercent)}%</strong></span>`;
    });
    const breakdown = $('qtLiveBreakdown');
    if (breakdown) {
      breakdown.innerHTML = `<div class="qt-breakdown-title"><div><h3>Calculation breakdown</h3><p>Delivery fees are per line and distributed across that line’s units. Tax and procurement markup apply per product.</p></div><span class="qt-breakdown-total">USD ${money(totalQuotedUsd)}</span></div><div class="qt-breakdown-steps"><div><small>Product lines</small><strong>${lines.length}</strong></div><div><small>Total units</small><strong>${totalQty}</strong></div><div><small>Total landed cost</small><strong>USD ${money(totalLandedUsd)}</strong></div><div><small>Total margin</small><strong>USD ${money(marginUsd)} · ${money(totalQuotedUsd ? marginUsd / totalQuotedUsd * 100 : 0)}%</strong></div></div><ol><li>Local unit inc tax = (buying price + line delivery fees ÷ line quantity) × (1 + tax %)</li><li>Local price after markup = local unit inc tax × (1 + target procurement markup %)</li><li>USD unit price = local price after markup ÷ FX rate × (1 + FX buffer %)</li><li>Quote total = sum of (USD unit price × line quantity); landed cost = sum of (local unit inc tax ÷ FX rate × line quantity)</li><li>Margin = quote total − landed cost; margin % = margin ÷ quote total × 100</li></ol>`;
    }
  }

  function readForm() {
    const record = {};
    fields.forEach(field => { record[field.key] = value(field.key).trim(); });
    calculatedKeys.forEach(key => { record[key] = number(record[key]); });
    const fxRate = number(record.fxRate) || 1;
    const fxBuffer = number(record.fxBuffer);
    record.products = readProductInputs().map(line => calculateProduct(line, fxRate, fxBuffer)).filter(line => line.productName.trim());
    record.quantity = record.products.reduce((sum, line) => sum + line.quantity, 0);
    record.productName = record.products.map(line => line.productName).join(' · ');
    const vendorIds = [...new Set(record.products.map(line => line.vendor).filter(Boolean))];
    record.vendor = vendorIds.length > 1 ? 'multiple' : (vendorIds[0] || '');
    record.buyingPrice = record.quantity ? record.products.reduce((sum, line) => sum + line.buyingPrice * line.quantity, 0) / record.quantity : 0;
    record.taxPercent = record.quantity ? record.products.reduce((sum, line) => sum + line.taxPercent * line.quantity, 0) / record.quantity : 0;
    record.deliveryFees = record.products.reduce((sum, line) => sum + line.deliveryFees, 0);
    record.targetMarkup = record.quantity ? record.products.reduce((sum, line) => sum + line.targetMarkup * line.quantity, 0) / record.quantity : 0;
    record.mrpLocal = record.quantity ? record.products.reduce((sum, line) => sum + line.mrpLocal * line.quantity, 0) / record.quantity : 0;
    const totalQuotedUsd = record.products.reduce((sum, line) => sum + line.totalQuotedUsd, 0);
    const totalLandedUsd = record.products.reduce((sum, line) => sum + line.totalLandedUsd, 0);
    const marginUsd = totalQuotedUsd - totalLandedUsd;
    const localPriceTotal = record.products.reduce((sum, line) => sum + line.unitPriceIncTax * line.quantity, 0);
    const localMarkupTotal = record.products.reduce((sum, line) => sum + line.priceAfterMarkup * line.quantity, 0);
    const localMrpTotal = record.products.reduce((sum, line) => sum + line.mrpLocal * line.quantity, 0);
    record.unitPriceIncTax = record.quantity ? localPriceTotal / record.quantity : 0;
    record.priceAfterMarkup = record.quantity ? localMarkupTotal / record.quantity : 0;
    record.unitPriceUsd = record.quantity ? totalQuotedUsd / record.quantity : 0;
    record.landedCostUnitUsd = record.quantity ? totalLandedUsd / record.quantity : 0;
    record.totalQuotedUsd = totalQuotedUsd;
    record.totalLandedUsd = totalLandedUsd;
    record.marginUsd = marginUsd;
    record.marginPercent = totalQuotedUsd ? marginUsd / totalQuotedUsd * 100 : 0;
    record.actualMarkupUsd = totalLandedUsd ? (totalQuotedUsd / totalLandedUsd - 1) * 100 : 0;
    record.mrpUsd = record.quantity ? localMrpTotal / fxRate / record.quantity : 0;
    record.mrpVarianceLocal = localMrpTotal ? (localMarkupTotal / localMrpTotal - 1) * 100 : 0;
    record.mrpVarianceUsd = localMrpTotal ? (totalQuotedUsd / (localMrpTotal / fxRate) - 1) * 100 : 0;
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
    if (field.key === 'country') return WH_COUNTRIES[value]?.[1] || value;
    if (field.key === 'vendor') return SUPPLY_SUPPLIERS[value]?.name || value;
    if (['buyingPrice', 'deliveryFees', 'unitPriceIncTax', 'priceAfterMarkup', 'mrpLocal'].includes(field.key)) return `${record.currency || ''} ${money(value)}`.trim();
    if (field.key === 'fxRate') return `${money(value)} ${record.currency || ''} per USD`;
    if (field.key === 'fxBuffer' || field.key.includes('Percent') || field.key.toLowerCase().includes('markup') || field.key.toLowerCase().includes('variance')) return `${money(value)}%`;
    if (['unitPriceUsd', 'landedCostUnitUsd', 'totalQuotedUsd', 'marginUsd', 'totalLandedUsd', 'mrpUsd'].includes(field.key)) return `USD ${money(value)}`;
    if (calculatedKeys.has(field.key)) return money(value);
    return value;
  }

  function productBreakdown(products, record) {
    return `<section class="qt-detail-group qt-products-detail"><h3>Product lines & calculation breakdown</h3>${products.map((line, index) => `<article class="qt-saved-product"><div class="qt-saved-product-head"><strong>${index + 1}. ${html(line.productName || 'Product')}</strong><span>${html(line.quantity)} units · ${html(SUPPLY_SUPPLIERS[line.vendor]?.name || line.vendor || 'No vendor')}</span></div><div class="qt-saved-product-grid">
      <div><small>Buying price excl. tax</small><strong>${html(record.currency)} ${money(line.buyingPrice)}</strong></div>
      <div><small>Tax</small><strong>${money(line.taxPercent)}%</strong></div>
      <div><small>Delivery · line total</small><strong>${html(record.currency)} ${money(line.deliveryFees)}</strong></div>
      <div><small>Unit inc. tax</small><strong>${html(record.currency)} ${money(line.unitPriceIncTax)}</strong></div>
      <div><small>Target proc. markup</small><strong>${money(line.targetMarkup)}%</strong></div>
      <div><small>Price after markup</small><strong>${html(record.currency)} ${money(line.priceAfterMarkup)} / unit</strong></div>
      <div><small>FX rate · buffer</small><strong>${money(record.fxRate)} · ${money(record.fxBuffer)}%</strong></div>
      <div><small>Unit price after FX</small><strong>USD ${money(line.unitPriceUsd)}</strong></div>
      <div><small>Landed cost / unit</small><strong>USD ${money(line.landedCostUnitUsd)}</strong></div>
      <div><small>Line quote total</small><strong>USD ${money(line.totalQuotedUsd)}</strong></div>
      <div><small>Line landed total</small><strong>USD ${money(line.totalLandedUsd)}</strong></div>
      <div><small>Line margin · margin %</small><strong>USD ${money(line.marginUsd)} · ${money(line.marginPercent)}%</strong></div>
      <div><small>Actual markup (USD)</small><strong>${money(line.actualMarkupUsd)}%</strong></div>
      <div><small>MRP · local / USD</small><strong>${html(record.currency)} ${money(line.mrpLocal)} · USD ${money(line.mrpUsd)}</strong></div>
      <div><small>Above / below MRP · local / USD</small><strong>${money(line.mrpVarianceLocal)}% · ${money(line.mrpVarianceUsd)}%</strong></div>
      <div><small>Lead time</small><strong>${html(line.leadTime || '—')}</strong></div>
    </div><p class="qt-saved-formula">Unit inc. tax = (buy price + delivery ÷ quantity) × (1 + tax). After markup = unit inc. tax × (1 + target markup). USD unit = after-markup price ÷ FX rate × (1 + FX buffer).</p></article>`).join('')}<div class="qt-grand-total"><span>Quote total · landed cost · margin</span><strong>USD ${money(record.totalQuotedUsd)} · USD ${money(record.totalLandedUsd)} · USD ${money(record.marginUsd)} (${money(record.marginPercent)}%)</strong></div></section>`;
  }

  function quoteCard(record) {
    const status = record.quoteStatus || 'Draft';
    const products = (record.products?.length ? record.products : [normalizeQuote(record).products[0]]);
    const detailGroups = [...new Set(fields.map(field => field.group))];
    const productNames = products.map(line => line.productName).filter(Boolean).join(' · ') || record.productName || 'Product not specified';
    const productVendors = [...new Set(products.map(line => line.vendor).filter(Boolean))];
    const vendorNames = productVendors.map(id => SUPPLY_SUPPLIERS[id]?.name || id).join(' · ') || '—';
    const details = detailGroups.map(group => `<section class="qt-detail-group"><h3>${html(group)}</h3><dl>${fields.filter(field => field.group === group && !PRODUCT_FIELD_KEYS.has(field.key)).map(field => `<div><dt>${html(field.label)}</dt><dd>${html(fieldValue(field, record))}</dd></div>`).join('')}</dl></section>`).join('');
    return `<article class="qt-card"><div class="qt-card-top"><div><span class="qt-number">${html(record.quoteNumber || 'Unnumbered quote')}</span><span class="qt-date">${new Date(record.createdAt || Date.now()).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div><span class="qt-status" data-status="${html(status.toLowerCase())}">${html(status)}</span></div><div class="qt-card-main"><div><small>CLIENT</small><strong>${html(record.client || 'Client not selected')}</strong></div><div><small>PRODUCTS · ${products.length}</small><strong title="${html(productNames)}">${html(productNames)}</strong></div><div><small>VENDORS</small><strong title="${html(vendorNames)}">${html(vendorNames)}</strong></div><div><small>QUANTITY</small><strong>${html(record.quantity || 0)} units</strong></div><div><small>TOTAL QUOTED</small><strong>USD ${money(record.totalQuotedUsd)}</strong></div><div><small>MARGIN</small><strong>${money(record.marginPercent)}%</strong></div></div><details class="qt-details"><summary>View calculation breakdown & quotation fields <span>⌄</span></summary>${productBreakdown(products, record)}${details}</details><div class="qt-card-footer"><span>${html(record.finalStatus || 'Draft')}${record.orderNumber ? ` · Order ${html(record.orderNumber)}` : ''}</span><div class="qt-card-actions"><button type="button" class="qt-edit" data-edit-quote="${html(record.quoteNumber)}">Edit</button><button type="button" class="qt-delete" data-delete-quote="${html(record.quoteNumber)}">Delete</button></div></div></article>`;
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
      if (vendor && record.vendor !== vendor && !record.products?.some(line => line.vendor === vendor)) return false;
      if (product && record.productName !== product && !record.products?.some(line => line.productName === product)) return false;
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
    editingQuoteNumber = '';
    $('qtForm').reset();
    $('qtProductLines').innerHTML = productLineMarkup();
    $('qtEditorTitle').textContent = 'New quotation';
    $('qtSubmit').textContent = 'Save quotation';
    $('qtEditor').hidden = false;
    updateCalculations();
    $('qtEditor').scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('qt-opsPic').focus({ preventScroll: true });
  }
  function editQuote(quoteNumber) {
    const record = quotes.find(quote => quote.quoteNumber === quoteNumber);
    if (!record) return;
    editingQuoteNumber = quoteNumber;
    fields.filter(field => !PRODUCT_FIELD_KEYS.has(field.key)).forEach(field => {
      const input = $(`qt-${field.key}`);
      if (input) input.value = record[field.key] ?? '';
    });
    $('qtProductLines').innerHTML = productLineMarkup(record.products?.length ? record.products : [normalizeQuote(record).products[0]]);
    $('qtEditorTitle').textContent = `Edit quotation · ${quoteNumber}`;
    $('qtSubmit').textContent = 'Save changes';
    $('qtEditor').hidden = false;
    updateCalculations();
    $('qtEditor').scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('qt-opsPic').focus({ preventScroll: true });
  }
  function closeForm() {
    $('qtEditor').hidden = true;
    editingQuoteNumber = '';
    $('qtForm').reset();
    $('qtProductLines').innerHTML = productLineMarkup();
    $('qtEditorTitle').textContent = 'New quotation';
    $('qtSubmit').textContent = 'Save quotation';
    updateCalculations();
  }

  $('qtCreate').addEventListener('click', openForm);
  $('qtList').addEventListener('click', event => {
    if (event.target.closest('[data-empty-create]')) { openForm(); return; }
    const edit = event.target.closest('[data-edit-quote]');
    if (edit) { editQuote(edit.dataset.editQuote); return; }
    const remove = event.target.closest('[data-delete-quote]');
    if (!remove) return;
    const record = quotes.find(quote => quote.quoteNumber === remove.dataset.deleteQuote);
    if (!record || !window.confirm(`Delete quotation ${record.quoteNumber}?`)) return;
    quotes = quotes.filter(quote => quote !== record);
    if (editingQuoteNumber === record.quoteNumber) closeForm();
    persist(); refreshFilterOptions(); renderList(); showToast('Quotation deleted');
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
    fillFilter('qtVendorFilter', quotes.flatMap(quote => quote.products?.map(line => line.vendor) || [quote.vendor]), id => SUPPLY_SUPPLIERS[id]?.name || id);
    fillFilter('qtProductFilter', quotes.flatMap(quote => quote.products?.map(line => line.productName) || [quote.productName]));
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
    const wasEditing = !!editingQuoteNumber;
    const record = readForm();
    if (editingQuoteNumber) {
      const index = quotes.findIndex(quote => quote.quoteNumber === editingQuoteNumber);
      if (index >= 0) {
        record.quoteNumber = editingQuoteNumber;
        record.createdAt = quotes[index].createdAt;
        quotes[index] = record;
      }
    } else {
      quotes.unshift(record);
    }
    persist();
    refreshFilterOptions();
    renderList();
    closeForm();
    showToast(`Quotation ${record.quoteNumber} ${wasEditing ? 'updated' : 'saved'}`);
  });

  renderForm();
  refreshFilterOptions();
  renderList();
})();
