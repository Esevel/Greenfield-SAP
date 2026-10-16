// Warehouses: table rendered from shared hub data, row menu, edit/add panel

function assignedCell(w) {
  if (w.type === 'client') return '<span class="text-muted">No Esevel fees</span>';
  const assigned = clientsAssignedTo(w.id);
  if (!assigned.length) return '<span class="text-muted">—</span>';
  const names = assigned.map(a => a.client.name).join(', ');
  return `<a href="/pages/warehouses/assignments.html" class="link-sm" title="${escapeHtml(names)}">${assigned.length} client${assigned.length === 1 ? '' : 's'}</a>`;
}

function warehouseRow(w) {
  const [flag, countryName] = WH_COUNTRIES[w.country];
  const active = w.status === 'Active';
  return `
    <tr data-id="${w.id}" class="${active ? '' : 'row-muted'}">
      <td><span class="vendor-name">${escapeHtml(w.name)}</span></td>
      <td>${w.type === 'esevel'
        ? '<span class="tag tag-hub">Esevel-managed hub</span>'
        : '<span class="tag tag-client-loc">Client-owned location</span>'}</td>
      <td>${w.type === 'client' ? escapeHtml(w.client) : '<span class="text-muted">—</span>'}</td>
      <td><span class="flag">${flag}</span> ${countryName}</td>
      <td>${assignedCell(w)}</td>
      <td class="num">${w.units.toLocaleString()}</td>
      <td>${active
        ? '<span class="badge badge-success badge-sm">Active</span>'
        : '<span class="badge badge-muted badge-sm">Decommissioned</span>'}</td>
      <td class="text-muted">${escapeHtml(w.updated)}</td>
      <td>
        <div class="dropdown">
          <button type="button" class="btn-icon row-menu-toggle" aria-label="Actions for ${escapeHtml(w.name)}">⋯</button>
          <div class="dropdown-menu dropdown-menu-right">
            <a href="#" class="dropdown-menu-item" data-action="edit">Edit</a>
            ${active ? '<a href="#" class="dropdown-menu-item" data-action="decommission">Decommission</a>' : ''}
          </div>
        </div>
      </td>
    </tr>`;
}

// Client × model stock in one warehouse, linking each client to their Stock page
function hubStockHtml(w) {
  const lines = STOCK_LINES.filter(l => l.loc === w.id && l.onHand);
  if (!lines.length) return '<div class="text-muted">No stock recorded here.</div>';
  const total = lines.reduce((s, l) => s + l.onHand, 0);
  const rows = lines.map(l => `<tr>
      <td><a href="/pages/stock/client.html?c=${l.client}&country=${w.country}" class="link-sm">${escapeHtml(stockClient(l.client).name)}</a></td>
      <td>${STOCK_MODELS[l.model].name}</td>
      <td class="num">${l.onHand}</td>
      <td class="num">${stockAvailable(l)}</td>
    </tr>`).join('');
  const fees = w.type === 'esevel' ? storageByCurrency(lines) : {};
  return `<table class="device-list-table">
      <thead><tr><th>Client</th><th>Model</th><th class="num">In stock</th><th class="num">Available</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="readonly-note">${total} units${Object.keys(fees).length ? ` · ${feesLabel(fees)} storage / month` : ''}</div>`;
}

function initWarehouses() {
  const tbody = document.getElementById('warehouseRows');
  const panel = document.getElementById('whPanel');
  const overlay = document.getElementById('whOverlay');
  const form = document.getElementById('whForm');
  const field = id => document.getElementById(id);
  let editingId = null;
  let currentType = 'esevel';

  function render() {
    tbody.innerHTML = WAREHOUSES.map(warehouseRow).join('');
    field('warehouseCount').textContent = `Showing ${WAREHOUSES.length} of ${WAREHOUSES.length} warehouses`;
    if (editingId !== null && panel.classList.contains('open')) {
      tbody.querySelector(`tr[data-id="${editingId}"]`)?.classList.add('selected');
    }
  }

  function closeMenus() {
    document.querySelectorAll('.dropdown-menu.show').forEach(m => m.classList.remove('show'));
  }

  function setType(type) {
    currentType = type;
    document.querySelectorAll('#whType .segment-button').forEach(b => {
      b.classList.toggle('active', b.dataset.type === type);
    });
    field('whClientGroup').hidden = type !== 'client';
    field('whBufferGroup').hidden = type !== 'esevel';
    field('whTypeNote').textContent = type === 'client'
      ? 'Devices here stay with the client. No Esevel storage fees, and redeployments from this site start with a collection step.'
      : 'Storage fees apply from intake. Clients are assigned to this hub in Clients › Hub assignments.';
  }

  function openPanel(w) {
    editingId = w ? w.id : null;
    field('whPanelTitle').textContent = w ? 'Edit warehouse' : 'Add warehouse';
    field('whName').value = w ? w.name : '';
    setType(w ? w.type : 'esevel');
    field('whClient').value = w ? w.client : '';
    field('whCountry').value = w ? w.country : 'SG';
    field('whAddress').value = w ? w.address : '';
    field('whContact').value = w ? w.contact : '';
    field('whHours').value = w ? w.hours : '';
    field('whBuffer').value = w && w.id in SUPPLY_HUB_BUFFER ? SUPPLY_HUB_BUFFER[w.id] : 1;
    field('whStatus').value = w ? w.status : 'Active';
    field('whNameError').hidden = true;
    field('whClientError').hidden = true;
    field('whStock').hidden = !w;
    field('whStockBody').innerHTML = w ? hubStockHtml(w) : '';

    tbody.querySelectorAll('tr').forEach(r => r.classList.toggle('selected', w && r.dataset.id === String(w.id)));
    panel.classList.add('open');
    overlay.classList.add('show');
  }

  function closePanel() {
    panel.classList.remove('open');
    overlay.classList.remove('show');
    tbody.querySelectorAll('tr.selected').forEach(r => r.classList.remove('selected'));
    editingId = null;
  }

  tbody.addEventListener('click', e => {
    if (e.target.closest('a[href^="/"]')) return;
    const row = e.target.closest('tr');
    const warehouse = WAREHOUSES.find(w => String(w.id) === row.dataset.id);

    const toggle = e.target.closest('.row-menu-toggle');
    if (toggle) {
      // Stop the document handler in navigation.js from closing it straight away
      e.stopPropagation();
      const menu = toggle.nextElementSibling;
      const wasOpen = menu.classList.contains('show');
      closeMenus();
      menu.classList.toggle('show', !wasOpen);
      return;
    }

    const action = e.target.closest('[data-action]');
    if (action) {
      e.preventDefault();
      closeMenus();
      if (action.dataset.action === 'decommission') {
        warehouse.status = 'Decommissioned';
        warehouse.updated = 'Just now';
        render();
      } else {
        openPanel(warehouse);
      }
      return;
    }

    openPanel(warehouse);
  });

  document.querySelectorAll('#whType .segment-button').forEach(b => {
    b.addEventListener('click', () => setType(b.dataset.type));
  });

  field('addWarehouse').addEventListener('click', () => openPanel(null));
  field('whClose').addEventListener('click', closePanel);
  field('whCancel').addEventListener('click', closePanel);
  overlay.addEventListener('click', closePanel);

  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = field('whName').value.trim();
    const client = field('whClient').value;
    const nameMissing = !name;
    const clientMissing = currentType === 'client' && !client;
    field('whNameError').hidden = !nameMissing;
    field('whClientError').hidden = !clientMissing;
    if (nameMissing || clientMissing) return;

    const values = {
      name,
      type: currentType,
      client: currentType === 'client' ? client : '',
      country: field('whCountry').value,
      address: field('whAddress').value.trim(),
      contact: field('whContact').value.trim(),
      hours: field('whHours').value.trim(),
      status: field('whStatus').value,
      updated: 'Just now'
    };

    let id = editingId;
    if (editingId !== null) {
      Object.assign(WAREHOUSES.find(w => w.id === editingId), values);
    } else {
      id = Math.max(...WAREHOUSES.map(w => w.id)) + 1;
      WAREHOUSES.push({ id, units: 0, ...values });
    }
    if (currentType === 'esevel') SUPPLY_HUB_BUFFER[id] = Math.max(0, parseInt(field('whBuffer').value, 10) || 0);
    closePanel();
    render();
  });

  render();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWarehouses);
} else {
  initWarehouses();
}
