// Shared Orders UI: page header actions, Board | List | Insights toggle, filters, CSV export, daily digest,
// templates, reason prompt and toast. Needs orders-engine.js.

const ORDER_VIEWS = [['board', 'Board', '/pages/tracker/orders.html'], ['list', 'List', '/pages/tracker/orders-list.html'], ['insights', 'Insights', '/pages/tracker/orders-insights.html']];

function orderViewToggleHtml(active) {
  return `<nav class="segmented-control view-toggle">${ORDER_VIEWS.map(([k, l, h]) => `<a href="${h}" class="segment-button${k === active ? ' active' : ''}">${l}</a>`).join('')}</nav>`;
}

function orderHeaderActionsHtml() {
  return `<button type="button" class="btn btn-secondary" data-order-digest>Digest</button>
    <button type="button" class="btn btn-secondary" data-order-export>Export</button>
    <button type="button" class="btn btn-secondary" data-order-templates>Templates</button>
    <a href="/pages/tracker/order-new.html" class="btn btn-primary">New order</a>`;
}

/* ---------- Filters ---------- */

const ORDER_STATUS_FILTERS = [['open', 'Open'], ['overdue', 'Overdue only'], ['attention', 'Needs attention'], ['cancelled', 'Cancelled'], ['all', 'All incl. done']];

function orderFilterBarHtml(f) {
  const opt = (v, l, cur) => `<option value="${v}"${v === cur ? ' selected' : ''}>${l}</option>`;
  const clients = WH_CLIENTS.filter(c => ORDERS.some(o => o.client === c.id));
  const vendors = [...new Set(ORDERS.map(o => o.vendor))];
  const ccs = [...new Set(ORDERS.map(o => o.cc))];
  return `<div class="filter-chips stock-filters order-filters">
    <div class="search-bar search-bar-sm"><span class="search-icon">🔍</span><input type="text" class="search-input" id="ofQ" value="${escapeHtml(f.q || '')}" placeholder="Order, client, recipient, PO" aria-label="Search orders"></div>
    <label class="filter-select"><span>Status</span><select id="ofStatus">${ORDER_STATUS_FILTERS.map(([v, l]) => opt(v, l, f.status)).join('')}</select></label>
    <label class="filter-select"><span>Priority</span><select id="ofPriority">${opt('', 'All', f.priority)}${ORDER_PRIORITIES.map(p => opt(p, p, f.priority)).join('')}</select></label>
    <label class="filter-select"><span>Client</span><select id="ofClient">${opt('', 'All', f.client)}${clients.map(c => opt(c.id, escapeHtml(c.name), f.client)).join('')}</select></label>
    <label class="filter-select"><span>Vendor</span><select id="ofVendor">${opt('', 'All', f.vendor)}${vendors.map(v => opt(v, escapeHtml(orderVendorName(v)), f.vendor)).join('')}</select></label>
    <label class="filter-select"><span>Country</span><select id="ofCountry">${opt('', 'All', f.cc)}${ccs.map(c => opt(c, WH_COUNTRIES[c][1], f.cc)).join('')}</select></label>
    <button type="button" class="btn-text" id="ofReset">Reset</button>
  </div>`;
}

const ORDER_FILTER_KEY = 'sap-order-filters-v1';
const orderFiltersDefault = () => ({ q: '', status: 'open', priority: '', client: '', vendor: '', cc: '' });
function orderFiltersLoad() {
  const params = new URLSearchParams(location.search);
  let f;
  try { f = { ...orderFiltersDefault(), ...JSON.parse(sessionStorage.getItem(ORDER_FILTER_KEY) || '{}') }; } catch { f = orderFiltersDefault(); }
  if (params.get('client')) f.client = params.get('client');
  if (params.get('status')) f.status = params.get('status');
  return f;
}
const orderFiltersSave = f => sessionStorage.setItem(ORDER_FILTER_KEY, JSON.stringify(f));

function orderMatches(o, f) {
  const st = orderState(o);
  const statusOk = {
    open: !['complete', 'cancelled'].includes(st),
    overdue: st === 'overdue',
    attention: ['overdue', 'pending', 'hold'].includes(st) || (st === 'progress' && orderSla(o).health === 'risk'),
    cancelled: st === 'cancelled',
    all: true
  }[f.status || 'open'];
  if (!statusOk) return false;
  if (f.priority && o.priority !== f.priority) return false;
  if (f.client && o.client !== f.client) return false;
  if (f.vendor && o.vendor !== f.vendor) return false;
  if (f.cc && o.cc !== f.cc) return false;
  if (f.q) {
    const q = f.q.toLowerCase();
    const hay = [o.id, orderClient(o.client).name, o.recipient, o.po, o.ticket, orderVendorName(o.vendor), ...o.products.map(l => l.name)].join(' ').toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

// Wire a filter bar rendered with orderFilterBarHtml; calls onChange(filters)
function orderBindFilters(root, f, onChange) {
  const map = { ofQ: 'q', ofStatus: 'status', ofPriority: 'priority', ofClient: 'client', ofVendor: 'vendor', ofCountry: 'cc' };
  root.addEventListener('input', e => { if (map[e.target.id]) { f[map[e.target.id]] = e.target.value; orderFiltersSave(f); onChange(f); } });
  root.addEventListener('change', e => { if (map[e.target.id] && e.target.tagName === 'SELECT') { f[map[e.target.id]] = e.target.value; orderFiltersSave(f); onChange(f); } });
  root.addEventListener('click', e => {
    if (e.target.id !== 'ofReset') return;
    Object.assign(f, orderFiltersDefault());
    orderFiltersSave(f);
    Object.entries(map).forEach(([id, k]) => { const el = document.getElementById(id); if (el) el.value = f[k]; });
    onChange(f);
  });
}

/* ---------- Toast and prompt ---------- */

function orderToast(text, kind = 'ok') {
  let el = document.getElementById('orderToast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'orderToast';
    el.className = 'order-toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.className = `order-toast show ${kind === 'error' ? 'order-toast-error' : ''}`;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), kind === 'error' ? 5000 : 3500);
}

// Run an action that may throw; toast the result
function orderTry(fn, after) {
  try {
    const msg = fn();
    if (msg) orderToast(msg);
    if (after) after();
    return true;
  } catch (e) {
    orderToast(e.message, 'error');
    return false;
  }
}

// Modal dialog. fields: [{ id, label, type: 'textarea'|'datetime'|'select', options, value, required }]
// Resolves with values, or null when cancelled.
function orderDialog({ title, text = '', fields = [], confirm = 'Confirm', danger = false, wide = false, body = '' }) {
  return new Promise(resolve => {
    const wrap = document.createElement('div');
    wrap.className = 'modal-overlay show';
    const field = f => {
      const req = f.required ? ' <span class="req">*</span>' : '';
      if (f.type === 'textarea') return `<div class="form-group"><label class="form-label" for="dlg-${f.id}">${f.label}${req}</label><textarea class="form-textarea" id="dlg-${f.id}" rows="3" placeholder="${escapeHtml(f.placeholder || '')}">${escapeHtml(f.value || '')}</textarea></div>`;
      if (f.type === 'select') return `<div class="form-group"><label class="form-label" for="dlg-${f.id}">${f.label}${req}</label><select class="form-select" id="dlg-${f.id}">${f.options.map(o => `<option${o === f.value ? ' selected' : ''}>${escapeHtml(o)}</option>`).join('')}</select></div>`;
      return `<div class="form-group"><label class="form-label" for="dlg-${f.id}">${f.label}${req}</label><input class="form-input" type="${f.type === 'datetime' ? 'datetime-local' : f.type || 'text'}" id="dlg-${f.id}" value="${escapeHtml(f.value || '')}" placeholder="${escapeHtml(f.placeholder || '')}"></div>`;
    };
    wrap.innerHTML = `<div class="modal${wide ? ' modal-wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="dlgTitle">
      <div class="modal-header"><h3 class="modal-title" id="dlgTitle">${escapeHtml(title)}</h3><button type="button" class="modal-close" data-x aria-label="Close">&times;</button></div>
      <div class="modal-body">${text ? `<p class="dlg-text">${text}</p>` : ''}${body}${fields.map(field).join('')}<div class="form-error" id="dlgErr" hidden></div></div>
      <div class="modal-footer">${confirm ? `<button type="button" class="btn btn-secondary" data-x>Cancel</button><button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${escapeHtml(confirm)}</button>` : '<button type="button" class="btn btn-secondary" data-x>Close</button>'}</div>
    </div>`;
    document.body.appendChild(wrap);
    const close = v => { wrap.remove(); document.removeEventListener('keydown', key); resolve(v); };
    const key = e => { if (e.key === 'Escape') close(null); };
    document.addEventListener('keydown', key);
    wrap.addEventListener('click', e => {
      if (e.target === wrap || e.target.closest('[data-x]')) close(null);
      if (e.target.closest('[data-ok]')) {
        const vals = Object.fromEntries(fields.map(f => [f.id, wrap.querySelector(`#dlg-${f.id}`).value.trim()]));
        const missing = fields.find(f => f.required && !vals[f.id]);
        if (missing) { const err = wrap.querySelector('#dlgErr'); err.hidden = false; err.textContent = `${missing.label} is required.`; return; }
        close(vals);
      }
    });
    (wrap.querySelector('input, textarea, select') || wrap.querySelector('[data-ok]'))?.focus();
  });
}

/* ---------- Export (CSV for Excel) ---------- */

function orderCsv(rows) {
  const cell = v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return '\ufeff' + rows.map(r => r.map(cell).join(',')).join('\r\n');
}

function orderDownload(name, text, type = 'text/csv') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function orderExportDialog(scope) {
  const v = await orderDialog({
    title: 'Export orders',
    text: 'CSV opens in Excel. Amounts are in each order’s currency, with SGD equivalents for internal reporting.',
    fields: [
      { id: 'range', label: 'Orders', type: 'select', options: [scope ? `Current filter (${scope.length})` : 'Open orders', 'Created in the last 30 days', 'Created in the last 90 days', 'All orders'], value: scope ? `Current filter (${scope.length})` : 'Open orders' },
      { id: 'what', label: 'Include', type: 'select', options: ['Orders (one row each)', 'Orders + stage timestamps', 'Line items', 'Audit log'], value: 'Orders (one row each)' }
    ],
    confirm: 'Download CSV'
  });
  if (!v) return;
  const since = days => ORDERS.filter(o => new Date(o.createdAt) >= new Date(ORDER_NOW.getTime() - days * 864e5));
  const list = v.range.startsWith('Current') ? scope : v.range.includes('30') ? since(30) : v.range.includes('90') ? since(90) : v.range === 'All orders' ? ORDERS : openOrders();
  let rows;
  if (v.what === 'Line items') {
    rows = [['Order', 'Client', 'Category', 'Item', 'Qty', 'Currency', 'Unit cost', 'Unit revenue', 'Line cost', 'Line revenue', 'Margin %']];
    list.forEach(o => o.products.forEach(l => rows.push([o.id, orderClient(o.client).name, l.cat, l.name, l.qty, o.currency, l.unitCost, l.unitRev, orderRound(l.qty * l.unitCost), orderRound(l.qty * l.unitRev), marginPct(l.unitCost, l.unitRev)])));
  } else if (v.what === 'Audit log') {
    rows = [['Order', 'When', 'Who', 'What']];
    list.forEach(o => o.audit.forEach(a => rows.push([o.id, a.at.replace('T', ' '), a.who, a.text])));
  } else {
    const ms = slaType('regular').milestones;
    rows = [['Order', 'Type', 'Client', 'Billing entity', 'Country', 'Vendor', 'Priority', 'Channel', 'Recipient', 'Status', 'Current stage', 'SLA health', 'Created', 'Delivered', 'Currency', 'Total cost', 'Total revenue (incl. tax)', 'Margin', 'Margin %', 'Revenue SGD', 'PO', 'Ticket', 'Owner',
      ...(v.what.includes('stage') ? ms.map(m => m.label) : [])]];
    list.forEach(o => {
      const p = orderPricing(o);
      const s = orderSla(o);
      rows.push([o.id, slaType(o.type).name, orderClient(o.client).name, orderEntity(o).name, o.cc, orderVendorName(o.vendor), o.priority, o.channel, o.recipient, ORDER_STATE[orderState(o)][0], orderCurrentStage(o), ORDER_HEALTH_PILL[s.health][1],
        o.createdAt.replace('T', ' '), (o.deliveredAt || '').replace('T', ' '), o.currency, p.totalCost, p.totalRev, p.margin, p.pct, orderRound(orderToSGD(p.subRev, o.currency)), o.po, o.ticket, o.owner,
        ...(v.what.includes('stage') ? ms.map(m => (o.stages[m.key]?.skipped ? 'Skipped' : (o.stages[m.key]?.at || '').replace('T', ' '))) : [])]);
    });
  }
  orderDownload(`orders-${calIso(ORDER_NOW)}-${v.what.split(' ')[0].toLowerCase()}.csv`, orderCsv(rows));
  orderToast(`Exported ${list.length} order${list.length === 1 ? '' : 's'}.`);
}

/* ---------- Daily digest ---------- */

function orderDigestText() {
  const open = openOrders();
  const by = st => open.filter(o => orderState(o) === st);
  const risk = open.filter(o => orderState(o) === 'progress' && orderSla(o).health === 'risk');
  const today = calIso(ORDER_NOW);
  const delivered = ORDERS.filter(o => o.deliveredAt && o.deliveredAt.startsWith(today));
  const created = ORDERS.filter(o => o.createdAt.startsWith(today));
  const line = o => `• ${o.id} · ${orderClient(o.client).name} · ${orderCurrentStage(o)} · ${orderClockText(o) || ORDER_STATE[orderState(o)][0]}${o.blocker ? ` · ${o.blocker}` : ''} · ${o.owner}`;
  const sec = (title, list) => (list.length ? `\n${title} (${list.length})\n${list.map(line).join('\n')}\n` : '');
  return `Orders digest · ${ORDER_NOW.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}\n`
    + `Open ${open.length} · Overdue ${by('overdue').length} · At risk ${risk.length} · Pending approval ${by('pending').length} · On hold ${by('hold').length} · Paused ${by('paused').length}\n`
    + `Created today ${created.length} · Delivered today ${delivered.length}\n`
    + sec('Overdue', by('overdue'))
    + sec('At risk', risk)
    + sec('Pending approval', by('pending'))
    + sec('Payment hold', by('hold'))
    + sec('SLA paused', by('paused'))
    + (delivered.length ? `\nDelivered today\n${delivered.map(o => `• ${o.id} · ${orderClient(o.client).name} · ${o.recipient}`).join('\n')}\n` : '');
}

async function orderDigestDialog() {
  const text = orderDigestText();
  const wrap = orderDialog({ title: 'Daily digest', body: `<pre class="digest-pre" id="digestPre">${escapeHtml(text)}</pre>
    <div class="dlg-actions"><button type="button" class="btn btn-secondary btn-sm" id="digestCopy">Copy</button><button type="button" class="btn btn-secondary btn-sm" id="digestDl">Download .txt</button></div>`, confirm: '' });
  document.getElementById('digestCopy').addEventListener('click', () => {
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => orderToast('Digest copied. Paste it into Slack or email.'), () => orderToast('Copy isn’t available here. Use Download instead.', 'error'));
  });
  document.getElementById('digestDl').addEventListener('click', () => orderDownload(`orders-digest-${calIso(ORDER_NOW)}.txt`, text, 'text/plain'));
  await wrap;
}

/* ---------- Templates ---------- */

const orderTemplateSummary = t => t.lines.map(([m, q]) => `${q} × ${orderModelName(m)}`).join(', ');

async function orderTemplatesDialog() {
  const render = () => (ORDER_TEMPLATES.length ? `<table class="table doc-table tpl-table"><thead><tr><th>Template</th><th>Items</th><th>Type</th><th></th></tr></thead><tbody>${ORDER_TEMPLATES.map(t => `<tr>
      <td><strong>${escapeHtml(t.name)}</strong><div class="stock-sub">by ${escapeHtml(t.by)}</div></td>
      <td>${escapeHtml(orderTemplateSummary(t))}${t.fees.length ? `<div class="stock-sub">+ ${t.fees.map(escapeHtml).join(', ')}</div>` : ''}</td>
      <td>${slaType(t.type).name}${t.priority !== 'Normal' ? ` · ${t.priority}` : ''}</td>
      <td class="tpl-actions"><a href="/pages/tracker/order-new.html?template=${t.id}" class="btn btn-primary btn-sm">Use</a><button type="button" class="btn-text" data-tpl-del="${t.id}">Delete</button></td>
    </tr>`).join('')}</tbody></table>` : '<p class="text-muted">No templates yet. Save one from the New order form.</p>');
  const p = orderDialog({ title: 'Order templates', wide: true, body: `<p class="dlg-text">Templates prefill items, type, priority and fees on a new order. Prices come from the client’s contract when used.</p><div id="tplBody">${render()}</div>`, confirm: '' });
  document.getElementById('tplBody').addEventListener('click', e => {
    const b = e.target.closest('[data-tpl-del]');
    if (!b) return;
    const i = ORDER_TEMPLATES.findIndex(t => t.id === b.dataset.tplDel);
    const [gone] = ORDER_TEMPLATES.splice(i, 1);
    saveOrderTemplates();
    document.getElementById('tplBody').innerHTML = render();
    orderToast(`Template “${gone.name}” deleted.`);
  });
  await p;
}

/* ---------- Header wiring ---------- */

function orderBindHeader(getScope) {
  document.addEventListener('click', e => {
    if (e.target.closest('[data-order-export]')) orderExportDialog(getScope ? getScope() : null);
    if (e.target.closest('[data-order-digest]')) orderDigestDialog();
    if (e.target.closest('[data-order-templates]')) orderTemplatesDialog();
  });
}

// Small "time in stage" bar used on cards and rows
function orderRunwayHtml(o) {
  const s = orderSla(o);
  if (!s.cur) return '';
  const cls = s.health === 'breached' ? 'overdue' : s.health === 'risk' ? 'risk' : '';
  return `<div class="runway order-runway"><div class="runway-label ${cls}">${escapeHtml(orderClockText(o))}</div><div class="runway-bar"><div class="runway-fill ${cls}" style="width: ${Math.min(100, Math.round(s.ratio * 100))}%;"></div></div></div>`;
}

function orderFlagsHtml(o) {
  const st = orderState(o);
  return [
    st === 'pending' ? '<span class="order-flag flag-pending">⏳ Pending approval</span>' : '',
    o.approvalRequired && o.approval === 'rejected' ? '<span class="order-flag flag-rejected">Rejected</span>' : '',
    o.paymentHold ? '<span class="order-flag flag-hold">⚠ Payment hold</span>' : '',
    orderIsPaused(o) ? '<span class="order-flag flag-paused">⏸ SLA paused</span>' : '',
    o.blocker ? `<span class="blocked-flag">Blocked: ${escapeHtml(o.blocker.toLowerCase())}</span>` : ''
  ].join('');
}
