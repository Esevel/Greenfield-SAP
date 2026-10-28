// Asset console: every row opens the (single prototype) asset detail page.
// With mdm-data.js loaded, an MDM column shows each device's enrolment state and the MDM chip filters rows.

function initAssetsList() {
  document.querySelectorAll('.asset-table tbody tr').forEach(row => {
    row.addEventListener('click', e => {
      if (e.target.closest('a, button, input')) return;
      // Pass the clicked asset's identity so the (single prototype) detail page reflects it
      const q = new URLSearchParams({
        serial: row.querySelector('.asset-serial')?.textContent.trim() || '',
        model: row.querySelector('.model-name')?.textContent.trim() || '',
        client: row.querySelector('.client-cell span:last-child')?.textContent.trim() || '',
        logo: row.querySelector('.client-logo')?.textContent.trim() || '',
        geo: row.querySelector('.asset-sub')?.textContent.trim() || '',
        category: row.children[2]?.textContent.trim() || '',
        status: row.children[3]?.textContent.trim() || ''
      });
      window.location.href = `/pages/assets/detail.html?${q}`;
    });
  });
  addMdmColumn();
  initMdmFilter();
  initClientFilter();
  renderAssetTiles();
}

/* ---------- Impact tiles: fleet at a glance, scoped to the selected client ---------- */

let assetClientFilter = '';

function assetNameToId() {
  return Object.fromEntries(WH_CLIENTS.map(c => [c.name, c.id]));
}

function renderAssetTiles() {
  const root = document.getElementById('assetTiles');
  if (!root || typeof MDM_DEVICES === 'undefined') return;
  const clientId = assetClientFilter ? assetNameToId()[assetClientFilter] : '';

  // Console rows in scope (what the user sees); warranty and repair read the row cells directly
  const rows = [...document.querySelectorAll('.asset-table tbody tr')].map(row => ({
    serial: row.querySelector('.asset-serial')?.textContent.trim(),
    client: row.querySelector('.client-cell span:last-child')?.textContent.trim(),
    category: row.children[2]?.textContent.trim(),
    status: row.children[3]?.textContent.trim(),
    warranty: row.children[6]?.querySelector('.badge')?.textContent.trim() || ''
  })).filter(r => r.serial && (!assetClientFilter || r.client === assetClientFilter));
  const gaps = rows.filter(r => !MDM_DEVICES.some(d => d.serial === r.serial)
    && mdmGapReason(assetNameToId()[r.client], r.category, r.status) === 'gap').length;
  const expiring = rows.filter(r => r.warranty === 'Expiring').length;
  const expired = rows.filter(r => r.warranty === 'Expired').length;
  const inRepair = rows.filter(r => r.status === 'In repair').length;
  const offFleet = rows.filter(r => r.status === 'In transit' || r.status === 'In storage').length;

  // Managed fleet in scope (seeded MDM records) for verified %
  const fleet = MDM_DEVICES.filter(d => !clientId || d.client === clientId);
  const verified = fleet.filter(d => d.state === 'verified').length;
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const noMdm = clientId && !CLIENT_MDM[clientId];

  const tile = (label, value, sub = '', cls = '') => `<div class="summary-tile ${cls}"><div class="summary-tile-label">${label}</div><div class="summary-tile-value">${value}</div>${sub ? `<div class="summary-tile-sub text-muted">${sub}</div>` : ''}</div>`;
  root.innerHTML =
    (noMdm
      ? tile('MDM verified', '—', 'Not in plan')
      : tile('MDM verified', fleet.length ? `${pct(verified, fleet.length)}%` : '—', fleet.length ? `${verified} of ${fleet.length} managed` : 'No managed devices', pct(verified, fleet.length) >= 80 ? 'summary-tile-ok' : ''))
    + tile('Not enrolled', gaps, gaps ? 'Deployed, needs action' : 'No coverage gaps', gaps ? 'summary-tile-breached' : 'summary-tile-ok')
    + tile('Warranty at risk', expiring + expired, expiring || expired ? [expiring ? `${expiring} expiring soon` : '', expired ? `${expired} expired` : ''].filter(Boolean).join(' · ') : 'All covered', expired ? 'summary-tile-breached' : expiring ? 'summary-tile-alert' : 'summary-tile-ok')
    + tile('In repair', inRepair, inRepair ? 'Loaners may be out' : 'None in repair', inRepair ? 'summary-tile-alert' : '')
    + tile('In transit / storage', offFleet, 'Not with an employee');
}

function initClientFilter() {
  const menu = document.getElementById('clientFilterMenu');
  if (!menu) return;
  menu.addEventListener('click', e => {
    const item = e.target.closest('[data-client]');
    if (!item) return;
    e.preventDefault();
    assetClientFilter = item.dataset.client;
    document.getElementById('clientFilterChip').firstChild.textContent = (assetClientFilter || 'Client') + ' ';
    applyAssetFilters();
    renderAssetTiles();
  });
}

let assetMdmFilter = '';

function applyAssetFilters() {
  document.querySelectorAll('.asset-table tbody tr').forEach(row => {
    const name = row.querySelector('.client-cell span:last-child')?.textContent.trim();
    const serial = row.querySelector('.asset-serial')?.textContent.trim();
    const d = serial && MDM_DEVICES.find(x => x.serial === serial);
    const clientOk = !assetClientFilter || name === assetClientFilter;
    const mdmOk = !assetMdmFilter
      || (assetMdmFilter === 'verified' && d && d.state === 'verified')
      || (assetMdmFilter === 'pipeline' && d && d.state !== 'verified')
      || (assetMdmFilter === 'unmanaged' && !d);
    row.hidden = !(clientOk && mdmOk);
  });
}

function initMdmFilter() {
  const menu = document.getElementById('mdmFilterMenu');
  if (!menu || typeof MDM_DEVICES === 'undefined') return;
  menu.addEventListener('click', e => {
    const item = e.target.closest('[data-mdm]');
    if (!item) return;
    e.preventDefault();
    assetMdmFilter = item.dataset.mdm;
    document.getElementById('mdmFilterChip').firstChild.textContent = (item.textContent.trim() === 'All devices' ? 'MDM' : `MDM: ${item.textContent.trim()}`) + ' ';
    applyAssetFilters();
  });
}

function addMdmColumn() {
  if (typeof MDM_DEVICES === 'undefined') return;
  const table = document.querySelector('.asset-table');
  if (!table) return;
  const head = table.querySelector('thead tr');
  const statusTh = [...head.children].findIndex(th => th.textContent.trim() === 'Status');
  head.children[statusTh].insertAdjacentHTML('afterend', '<th>MDM</th>');
  const nameToId = Object.fromEntries(WH_CLIENTS.map(c => [c.name, c.id]));
  table.querySelectorAll('tbody tr').forEach(row => {
    const serial = row.querySelector('.asset-serial')?.textContent.trim();
    const d = serial && MDM_DEVICES.find(x => x.serial === serial);
    let cell;
    if (d) {
      const [label, badge] = MDM_STATES[d.state];
      cell = `<td><span class="badge ${badge} badge-sm">${label}</span><div class="asset-sub">${MDM_PLATFORMS[CLIENT_MDM[d.client]].name}</div></td>`;
    } else {
      const clientId = nameToId[row.querySelector('.client-cell span:last-child')?.textContent.trim()];
      const reason = mdmGapReason(clientId, row.children[2]?.textContent.trim(), row.children[3]?.textContent.trim());
      cell = {
        gap: '<td><span class="badge badge-error badge-sm">Not enrolled</span><div class="asset-sub">Action needed</div></td>',
        'pre-deployment': '<td class="text-muted">Enrols at deployment</td>',
        'not-applicable': '<td class="text-muted">—</td>',
        'no-plan': '<td class="text-muted">—</td>'
      }[reason];
    }
    row.children[statusTh].insertAdjacentHTML('afterend', cell);
  });
}

/* ---------- Add asset: single device or bulk CSV (help center: Inventory › Add / Bulk Upload) ---------- */

const AA_MODELS = {
  Laptops: ['MacBook Pro 14" M3', 'MacBook Pro 16" M3 Max', 'MacBook Air 13" M2', 'Dell XPS 15', 'Lenovo ThinkPad X1 Carbon'],
  Monitors: ['Dell UltraSharp U2723QE', 'Apple Studio Display'],
  Peripherals: ['Logitech MX Master 3S', 'Apple Magic Keyboard', 'Jabra Evolve2 65', 'Dell WD19S dock']
};
const AA_ICON = { Laptops: '💻', Monitors: '🖥', Peripherals: '🖱' };
const AA_GRADIENT = { Laptops: '#667eea 0%, #764ba2 100%', Monitors: '#fa709a 0%, #fee140 100%', Peripherals: '#a8edea 0%, #fed6e3 100%' };

function initAddAsset() {
  const $ = id => document.getElementById(id);
  if (!$('addAssetBtn')) return;
  let mode = 'single';
  let file = null;

  $('aaClient').innerHTML = '<option value="">Select a client</option>' + WH_CLIENTS.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');

  const open = () => { $('aaPanel').classList.add('open'); $('aaOverlay').classList.add('show'); };
  const close = () => { $('aaPanel').classList.remove('open'); $('aaOverlay').classList.remove('show'); };
  $('addAssetBtn').addEventListener('click', open);
  $('aaClose').addEventListener('click', close);
  $('aaCancel').addEventListener('click', close);
  $('aaOverlay').addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('aaPanel').classList.contains('open')) close(); });

  const fillModels = () => {
    const type = document.querySelector('input[name="aaType"]:checked').value;
    $('aaModel').innerHTML = AA_MODELS[type].map(m => `<option>${escapeHtml(m)}</option>`).join('');
  };
  fillModels();
  document.querySelectorAll('input[name="aaType"]').forEach(r => r.addEventListener('change', fillModels));
  document.querySelectorAll('input[name="aaLoc"]').forEach(r => r.addEventListener('change', () => {
    $('aaAssigneeGroup').hidden = document.querySelector('input[name="aaLoc"]:checked').value !== 'employee';
  }));

  $('aaClient').addEventListener('change', () => {
    $('aaClientError').hidden = true;
    const p = typeof mdmPlatform === 'function' ? mdmPlatform($('aaClient').value) : null;
    $('aaMdmNote').textContent = $('aaClient').value
      ? (p ? `${p.name} client — deployed computers show as Not enrolled until the ${p.agent} reports in.` : 'Record keeping only — this client\'s plan doesn\'t include device management.')
      : '';
  });

  $('aaMode').addEventListener('click', e => {
    const b = e.target.closest('[data-mode]');
    if (!b) return;
    mode = b.dataset.mode;
    document.querySelectorAll('#aaMode .segment-button').forEach(x => x.classList.toggle('active', x === b));
    $('aaSingleFields').hidden = mode !== 'single';
    $('aaBulkFields').hidden = mode !== 'bulk';
    $('aaSubmit').textContent = mode === 'single' ? 'Add asset' : 'Upload and add';
  });

  $('aaFile').addEventListener('change', () => {
    file = $('aaFile').files[0] || null;
    $('aaDropText').innerHTML = file ? `📄 ${escapeHtml(file.name)}` : 'Drop a .csv here or <span class="link-sm">browse</span>';
    $('aaFileError').hidden = true;
  });
  $('aaSample').addEventListener('click', e => {
    e.preventDefault();
    const csv = 'serial,model,category,client,location,assignee,warranty\nC02ZZ1234A,MacBook Pro 14" M3,Laptops,Acme Tech,employee,Jane Tan,2028-03\n2241LZ9999B,Logitech MX Master 3S,Peripherals,Acme Tech,hub,,';
    const a = Object.assign(document.createElement('a'), { href: `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`, download: 'assets-sample.csv' });
    a.click();
  });

  const existingSerials = () => [...document.querySelectorAll('.asset-table .asset-serial')].map(s => s.textContent.trim());

  function addRow({ serial, model, category, clientName, logo, loc, assignee, warranty }) {
    const wBadge = warranty ? `<span class="badge badge-success badge-sm">Active</span> <span class="text-muted">to ${warranty}</span>` : '<span class="badge badge-muted badge-sm">Unknown</span>';
    const locHtml = { employee: '<span class="asset-loc loc-employee">With employee</span>', site: '<span class="asset-loc loc-site">Client site</span>', hub: '<span class="asset-loc loc-hub">Esevel hub</span>' }[loc];
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><div class="model-cell">
        <div class="model-thumbnail"><div class="thumbnail-placeholder" style="background: linear-gradient(135deg, ${AA_GRADIENT[category] || AA_GRADIENT.Peripherals});">${AA_ICON[category] || '🖱'}</div></div>
        <div class="model-info"><div class="model-name">${escapeHtml(model)}</div><div class="asset-serial">${escapeHtml(serial)}</div></div>
      </div></td>
      <td><div class="client-cell"><div class="client-logo">${escapeHtml(logo)}</div><span>${escapeHtml(clientName)}</span></div></td>
      <td>${escapeHtml(category)}</td>
      <td><span class="badge ${loc === 'employee' ? 'badge-success' : 'badge-info'}">${loc === 'employee' ? 'Deployed' : 'In storage'}</span></td>
      <td>${escapeHtml(document.getElementById('aaGrade')?.value || 'B (Good)')}</td>
      <td>${wBadge}<div class="asset-sub">New</div></td>
      <td>${escapeHtml(assignee || '—')}</td>
      <td><span class="asset-tag">New</span></td>
      <td>${locHtml}</td>
      <td class="source-label">Added by Esevel</td>`;
    // MDM cell at the same index the column was injected
    const clientId = assetNameToId()[clientName];
    const reason = mdmGapReason(clientId, category, loc === 'employee' ? 'Deployed' : 'In storage');
    const mdmCell = {
      gap: '<td><span class="badge badge-error badge-sm">Not enrolled</span><div class="asset-sub">Action needed</div></td>',
      'pre-deployment': '<td class="text-muted">Enrols at deployment</td>',
      'not-applicable': '<td class="text-muted">—</td>',
      'no-plan': '<td class="text-muted">—</td>'
    }[reason];
    tr.children[3].insertAdjacentHTML('afterend', mdmCell);
    tr.addEventListener('click', e => {
      if (e.target.closest('a, button, input')) return;
      const q = new URLSearchParams({ serial, model, client: clientName, logo, geo: '', category, status: loc === 'employee' ? 'Deployed' : 'In storage' });
      window.location.href = `/pages/assets/detail.html?${q}`;
    });
    document.querySelector('.asset-table tbody').prepend(tr);
  }

  function submitSingle() {
    const clientSel = $('aaClient');
    const serial = $('aaSerial').value.trim();
    const loc = document.querySelector('input[name="aaLoc"]:checked').value;
    const errors = {
      aaClientError: !clientSel.value,
      aaSerialError: !serial || existingSerials().includes(serial),
      aaAssigneeError: loc === 'employee' && !$('aaAssignee').value.trim()
    };
    $('aaSerialError').textContent = serial && existingSerials().includes(serial) ? `${serial} is already in the console.` : 'Enter the serial number.';
    Object.entries(errors).forEach(([id, show]) => { $(id).hidden = !show; });
    if (Object.values(errors).some(Boolean)) return;
    const warranty = $('aaWarranty').value ? new Date(`${$('aaWarranty').value}-01`).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '';
    addRow({
      serial, model: $('aaModel').value, category: document.querySelector('input[name="aaType"]:checked').value,
      clientName: clientSel.options[clientSel.selectedIndex].text, logo: (WH_CLIENTS.find(c => c.id === clientSel.value) || {}).logo || '?',
      loc, assignee: loc === 'employee' ? $('aaAssignee').value.trim() : '', warranty
    });
    finish(`✓ ${serial} added to ${clientSel.options[clientSel.selectedIndex].text}.`);
  }

  function submitBulk() {
    $('aaClientError').hidden = !!$('aaClient').value;
    $('aaFileError').hidden = !!file;
    if (!$('aaClient').value || !file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const lines = reader.result.split(/\r?\n/).filter(l => l.trim());
      const header = lines[0].toLowerCase().split(',').map(h => h.trim());
      const idx = f => header.indexOf(f);
      const known = existingSerials();
      let added = 0, skipped = 0;
      lines.slice(1).forEach(line => {
        const cols = line.split(',').map(c => c.trim());
        const serial = cols[idx('serial')];
        if (!serial || known.includes(serial)) { skipped++; return; }
        known.push(serial);
        const clientSel = $('aaClient');
        addRow({
          serial, model: cols[idx('model')] || 'Unknown model', category: cols[idx('category')] || 'Laptops',
          clientName: clientSel.options[clientSel.selectedIndex].text, logo: (WH_CLIENTS.find(c => c.id === clientSel.value) || {}).logo || '?',
          loc: ['employee', 'site', 'hub'].includes(cols[idx('location')]) ? cols[idx('location')] : 'hub',
          assignee: cols[idx('assignee')] || '', warranty: cols[idx('warranty')] || ''
        });
        added++;
      });
      finish(`✓ ${added} asset${added === 1 ? '' : 's'} added from ${file.name}.${skipped ? ` ${skipped} skipped (missing or duplicate serial).` : ''}`);
    };
    reader.readAsText(file);
  }

  function finish(message) {
    close();
    $('aaForm').reset();
    fillModels();
    $('aaAssigneeGroup').hidden = false;
    $('aaMdmNote').textContent = '';
    file = null;
    $('aaDropText').innerHTML = 'Drop a .csv here or <span class="link-sm">browse</span>';
    renderAssetTiles();
    applyAssetFilters();
    let note = document.getElementById('aaToast');
    if (!note) {
      note = Object.assign(document.createElement('div'), { id: 'aaToast', className: 'asset-add-success' });
      document.querySelector('.asset-toolbar').before(note);
    }
    note.textContent = message;
    note.hidden = false;
    setTimeout(() => { note.hidden = true; }, 6000);
  }

  $('aaSubmit').addEventListener('click', () => (mode === 'single' ? submitSingle() : submitBulk()));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { initAssetsList(); initAddAsset(); });
} else {
  initAssetsList();
  initAddAsset();
}
