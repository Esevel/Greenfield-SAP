// Hub assignments: client × country matrix with one hub (or none) per cell

function initHubAssignments() {
  const $ = id => document.getElementById(id);
  const table = $('assignMatrix');
  const countries = Object.keys(WH_COUNTRIES);
  const draft = {};

  const activeHubs = cc => WAREHOUSES.filter(w => w.type === 'esevel' && w.status === 'Active' && w.country === cc);
  const saved = (clientId, cc) => (cc in HUB_ASSIGNMENTS[clientId] ? HUB_ASSIGNMENTS[clientId][cc] : 'na');
  const current = (clientId, cc) => (draft[clientId] && cc in draft[clientId] ? draft[clientId][cc] : saved(clientId, cc));
  const isDirty = (clientId, cc) => current(clientId, cc) !== saved(clientId, cc);
  const clientLocations = (clientName, cc) => WAREHOUSES.filter(w => w.type === 'client' && w.client === clientName && w.country === cc && w.status === 'Active');

  function renderHead() {
    table.querySelector('thead').innerHTML = `<tr>
      <th>Client</th>
      ${countries.map(cc => {
        const hubs = activeHubs(cc);
        return `<th><span class="flag">${WH_COUNTRIES[cc][0]}</span> ${WH_COUNTRIES[cc][1]}
          <div class="assign-col-sub">${hubs.length ? `${hubs.length} hub${hubs.length === 1 ? '' : 's'}` : 'No active hub'}</div></th>`;
      }).join('')}
    </tr>`;
  }

  function cellHtml(client, cc) {
    const value = current(client.id, cc);
    const hubs = activeHubs(cc);
    const sites = clientLocations(client.name, cc);
    const kind = value === 'na' ? 'na' : value === 'none' ? 'none' : 'hub';
    const options = [
      `<option value="na" ${value === 'na' ? 'selected' : ''}>Not active</option>`,
      ...hubs.map(h => `<option value="${h.id}" ${value === h.id ? 'selected' : ''}>${escapeHtml(h.name)}</option>`),
      `<option value="none" ${value === 'none' ? 'selected' : ''}>No hub · client sites</option>`
    ].join('');
    const siteNote = kind === 'none'
      ? (sites.length ? `${sites.length} client site${sites.length === 1 ? '' : 's'}` : 'No client site listed')
      : '';
    return `<td><div class="assign-cell assign-${kind} ${isDirty(client.id, cc) ? 'dirty' : ''}">
      <select class="assign-select" data-client="${client.id}" data-country="${cc}" aria-label="${escapeHtml(client.name)} hub in ${WH_COUNTRIES[cc][1]}">${options}</select>
      ${siteNote ? `<span class="assign-note ${sites.length ? '' : 'warn'}">${siteNote}</span>` : ''}
    </div></td>`;
  }

  function render() {
    const q = $('assignSearch').value.trim().toLowerCase();
    const clients = WH_CLIENTS.filter(c => !q || c.name.toLowerCase().includes(q));
    const tbody = table.querySelector('tbody');
    if (!clients.length) {
      const td = document.createElement('td');
      td.colSpan = countries.length + 1;
      td.className = 'text-muted sla-empty';
      td.textContent = `No clients match "${$('assignSearch').value}"`;
      tbody.innerHTML = '';
      tbody.appendChild(document.createElement('tr')).appendChild(td);
    } else {
      tbody.innerHTML = clients.map(c => `<tr>
        <td><div class="client-cell"><div class="client-logo">${c.logo}</div><span>${escapeHtml(c.name)}</span></div></td>
        ${countries.map(cc => cellHtml(c, cc)).join('')}
      </tr>`).join('');
    }
    updateToolbar();
  }

  function changes() {
    const list = [];
    WH_CLIENTS.forEach(c => countries.forEach(cc => { if (isDirty(c.id, cc)) list.push([c, cc]); }));
    return list;
  }

  function updateToolbar() {
    const n = changes().length;
    $('assignSave').disabled = n === 0;
    $('assignDiscard').hidden = n === 0;
    $('assignStatus').textContent = n ? `${n} unsaved change${n === 1 ? '' : 's'}` : '';
  }

  table.addEventListener('change', e => {
    if (!e.target.classList.contains('assign-select')) return;
    const { client, country } = e.target.dataset;
    const raw = e.target.value;
    draft[client] = draft[client] || {};
    draft[client][country] = raw === 'na' || raw === 'none' ? raw : Number(raw);
    render();
  });

  $('assignSearch').addEventListener('input', render);

  $('assignDiscard').addEventListener('click', () => {
    Object.keys(draft).forEach(k => delete draft[k]);
    render();
  });

  $('assignSave').addEventListener('click', () => {
    const list = changes();
    list.forEach(([c, cc]) => {
      const v = current(c.id, cc);
      if (v === 'na') delete HUB_ASSIGNMENTS[c.id][cc];
      else HUB_ASSIGNMENTS[c.id][cc] = v;
    });
    Object.keys(draft).forEach(k => delete draft[k]);
    saveNewClients();
    const describe = ([c, cc]) => {
      const v = saved(c.id, cc);
      const target = v === 'na' ? 'not active' : v === 'none' ? 'no hub (client sites)' : WAREHOUSES.find(w => w.id === v).name;
      return `${c.name} · ${WH_COUNTRIES[cc][1]} → ${target}`;
    };
    $('assignSaved').hidden = false;
    $('assignSavedText').textContent = `✓ Saved ${list.length} assignment${list.length === 1 ? '' : 's'}: ${list.map(describe).join('; ')}. New deliveries, storage and Deploy timing use the new hub; stock already in the old hub stays until moved.`;
    render();
  });

  renderHead();
  render();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHubAssignments);
} else {
  initHubAssignments();
}
