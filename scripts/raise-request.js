// Raise request on a client's behalf: redeployment, storage or disposal. Collection is a step inside the request when
// the device isn't already in a hub. Destinations and timing come from the client's assigned hub. Requires hub-data.js.

const REQUEST_ASSETS = [
  { id: 'C02XK4M9MD6T', client: 'acme', model: 'MacBook Pro 14" M3', icon: '💻', kind: 'employee', who: 'Priya Raman', country: 'SG' },
  { id: 'C02WR9T6MD6T', client: 'acme', model: 'MacBook Pro 14" M3', icon: '💻', kind: 'hub', loc: 1 },
  { id: 'C02XK5A1MD6T', client: 'acme', model: 'MacBook Pro 14" M3', icon: '💻', kind: 'site', loc: 5 },
  { id: 'F0T3291AB2CD', client: 'acme', model: 'Apple Magic Keyboard', icon: '⌨️', kind: 'site', loc: 5 },
  { id: 'FVFHG2LMQ6L4', client: 'acme', model: 'MacBook Air 13" M2', icon: '💻', kind: 'hub', loc: 2 },
  { id: '2241LZ0A9C11', client: 'acme', model: 'Logitech MX Master 3S', icon: '🖱', kind: 'hub', loc: 1 },
  { id: '8HJ2KM4', client: 'acme', model: 'Dell XPS 15', icon: '💻', kind: 'hub', loc: 4 },
  { id: '8HJ2KL3', client: 'techglobal', model: 'Dell XPS 15', icon: '💻', kind: 'employee', who: 'Daniel Ortiz', country: 'US' },
  { id: '2241LZ0A7K58', client: 'techglobal', model: 'Logitech MX Master 3S', icon: '🖱', kind: 'employee', who: 'Daniel Ortiz', country: 'US' },
  { id: '8HJ2KQ7', client: 'techglobal', model: 'Dell XPS 15', icon: '💻', kind: 'site', loc: 6 },
  { id: 'CN-0H8W2K-74512', client: 'techglobal', model: 'Dell UltraSharp U2723QE', icon: '🖥', kind: 'hub', loc: 4 },
  { id: 'PF3QW8ZN', client: 'digital', model: 'Lenovo ThinkPad X1 Carbon', icon: '💻', kind: 'employee', who: 'Hannah Clarke', country: 'GB' },
  { id: 'JB65-0093321', client: 'digital', model: 'Jabra Evolve2 65', icon: '🎧', kind: 'employee', who: 'Tom Fielding', country: 'GB' },
  { id: 'PF2QR4LM', client: 'digital', model: 'Lenovo ThinkPad X1 Carbon', icon: '💻', kind: 'hub', loc: 3 },
  { id: 'F0T3290XJ1MH', client: 'mediaworks', model: 'Apple Magic Keyboard', icon: '⌨️', kind: 'employee', who: 'Mei Lin Tan', country: 'SG' },
  { id: 'C02XK4W5MD6T', client: 'mediaworks', model: 'MacBook Pro 14" M3', icon: '💻', kind: 'hub', loc: 1 },
  { id: 'C02YH7N2MD6T', client: 'northwind', model: 'MacBook Pro 14" M3', icon: '💻', kind: 'employee', who: 'Grace Lim', country: 'US' },
  { id: 'CN-0H8W2K-74390', client: 'cloud', model: 'Dell UltraSharp U2723QE', icon: '🖥', kind: 'hub', loc: 8 },
  { id: 'C02ZP3Q8MD6T', client: 'brightpath', model: 'MacBook Pro 14" M3', icon: '💻', kind: 'employee', who: 'Aiden Lee', country: 'MY' }
];

const KIND_LABEL = { employee: 'With employee', hub: 'Esevel hub', site: 'Client site' };

function initRaiseRequest() {
  const $ = id => document.getElementById(id);
  const selected = new Set();
  let type = 'redeployment';

  const clientId = () => $('reqClient').value;
  const clientName = () => (WH_CLIENTS.find(c => c.id === clientId()) || {}).name || '';
  const source = () => (document.querySelector('input[name="source"]:checked') || {}).value;
  const destCountry = () => $('reqCountry').value;
  const findAsset = id => REQUEST_ASSETS.find(a => a.id === id);
  const locOf = id => WAREHOUSES.find(w => w.id === id);
  const assetCountry = a => (a.kind === 'employee' ? a.country : locOf(a.loc).country);
  const assetWhere = a => (a.kind === 'employee' ? `With ${a.who}` : locOf(a.loc).name);
  const countryLabel = cc => `${WH_COUNTRIES[cc][0]} ${WH_COUNTRIES[cc][1]}`;
  const hubFor = (cid, cc) => {
    const v = (HUB_ASSIGNMENTS[cid] || {})[cc];
    return typeof v === 'number' ? locOf(v) : null;
  };

  $('reqClient').innerHTML = '<option value="">Select a client</option>' + WH_CLIENTS.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  function eligible(a) {
    if (a.client !== clientId()) return false;
    if (type === 'storage') return a.kind === 'employee' || a.kind === 'site';
    if (type === 'disposal') return true;
    if (assetCountry(a) !== destCountry()) return false;
    if (source() === 'hub') {
      const hub = hubFor(clientId(), destCountry());
      return a.kind === 'hub' && !!hub && a.loc === hub.id;
    }
    return a.kind === source();
  }

  function fillCountries() {
    const keep = destCountry();
    const active = clientId() ? Object.keys(HUB_ASSIGNMENTS[clientId()] || {}) : [];
    $('reqCountry').innerHTML = active.length
      ? active.map(cc => `<option value="${cc}">${countryLabel(cc)}</option>`).join('')
      : '<option value="">Select a client first</option>';
    $('reqCountry').disabled = !active.length;
    if (active.includes(keep)) $('reqCountry').value = keep;
  }

  // The hub source only exists if the client has an assigned hub in the destination country
  function updateSourceOptions() {
    const hub = clientId() && destCountry() ? hubFor(clientId(), destCountry()) : null;
    const hubRadio = document.querySelector('input[name="source"][value="hub"]');
    hubRadio.disabled = !hub;
    $('srcHubNote').textContent = clientId() && destCountry()
      ? (hub ? `· ${hub.name}` : `· no assigned hub in ${WH_COUNTRIES[destCountry()][1]}`)
      : '';
    if (hubRadio.disabled && hubRadio.checked) document.querySelector('input[name="source"][value="site"]').checked = true;
  }

  function renderSelected() {
    $('selectedAssets').innerHTML = '';
    selected.forEach(id => {
      const a = findAsset(id);
      const chip = document.createElement('span');
      chip.className = 'asset-chip';
      chip.textContent = `${a.icon} ${a.model} · ${a.id}`;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'asset-chip-remove';
      remove.setAttribute('aria-label', `Remove ${a.model} ${a.id}`);
      remove.textContent = '×';
      remove.addEventListener('click', () => { selected.delete(id); renderAll(); });
      chip.appendChild(remove);
      $('selectedAssets').appendChild(chip);
    });
  }

  function emptyMessage() {
    if (!clientId()) return 'Select a client first';
    if (type === 'storage') return `No devices with employees or at client sites for ${clientName()}`;
    if (type === 'disposal') return `No devices for ${clientName()}`;
    const where = { hub: 'in the assigned hub', site: 'at client sites', employee: 'with employees' }[source()];
    return `No ${clientName()} devices ${where} in ${WH_COUNTRIES[destCountry()][1]}`;
  }

  function renderResults() {
    const q = $('assetSearch').value.trim().toLowerCase();
    const matches = REQUEST_ASSETS.filter(a => eligible(a) && (!q || `${a.model} ${a.id} ${assetWhere(a)}`.toLowerCase().includes(q)));
    const results = $('assetResults');
    results.innerHTML = '';
    if (!matches.length) {
      const empty = document.createElement('div');
      empty.className = 'asset-result-empty';
      empty.textContent = q ? 'No assets match' : emptyMessage();
      results.appendChild(empty);
      return;
    }
    matches.forEach(a => {
      const item = document.createElement('label');
      item.className = 'asset-result';
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = selected.has(a.id);
      box.addEventListener('change', () => {
        box.checked ? selected.add(a.id) : selected.delete(a.id);
        $('assetError').hidden = true;
        renderSelected();
        renderDestination();
        renderPlan();
      });
      const icon = document.createElement('span');
      icon.className = 'asset-result-icon';
      icon.textContent = a.icon;
      const text = document.createElement('span');
      text.className = 'asset-result-text';
      const name = document.createElement('span');
      name.className = 'asset-result-name';
      name.textContent = a.model;
      const meta = document.createElement('span');
      meta.className = 'asset-result-meta';
      meta.textContent = `${a.id} · ${assetWhere(a)} · ${WH_COUNTRIES[assetCountry(a)][1]}`;
      text.append(name, meta);
      const kind = document.createElement('span');
      kind.className = `asset-kind kind-${a.kind}`;
      kind.textContent = KIND_LABEL[a.kind];
      item.append(box, icon, text, kind);
      results.appendChild(item);
    });
  }

  // One destination per country of the selected devices
  function destinations() {
    const byCountry = {};
    [...selected].map(findAsset).forEach(a => { (byCountry[assetCountry(a)] = byCountry[assetCountry(a)] || []).push(a); });
    return Object.entries(byCountry).map(([cc, assets]) => {
      const hub = hubFor(clientId(), cc);
      const base = { cc, count: assets.length };
      if (type === 'disposal') {
        const collect = assets.filter(a => a.kind !== 'hub').length;
        return { ...base, ok: true, name: hub ? hub.name : 'E-waste partner', note: `${collect ? `${collect} collected first` : 'Already in a hub, no collection'} · wipe, dispose, certificate` };
      }
      if (hub) return { ...base, ok: true, name: hub.name, note: 'Assigned hub · storage fees from intake' };
      if (type === 'storage') return { ...base, ok: false, name: 'No assigned hub', note: 'Storage needs an Esevel hub.' };
      const site = WAREHOUSES.find(w => w.type === 'client' && w.client === clientName() && w.country === cc && w.status === 'Active'
        && !assets.some(a => a.loc === w.id));
      if (site) return { ...base, ok: true, name: site.name, note: 'No assigned hub · goes to a client site, no Esevel fees' };
      return { ...base, ok: false, name: 'No destination', note: 'No assigned hub or client site in this country.' };
    });
  }

  function renderDestination() {
    const list = $('destList');
    if (!selected.size) {
      list.innerHTML = '<div class="dest-empty">Set automatically from the client\'s assigned hub in each country</div>';
      $('destError').hidden = true;
      return;
    }
    const dests = destinations();
    list.innerHTML = dests.map(d => `<div class="dest-line ${d.ok ? '' : 'dest-bad'}">
      <span class="dest-country">${countryLabel(d.cc)} <span class="text-muted">· ${d.count} device${d.count === 1 ? '' : 's'}</span></span>
      <span class="dest-arrow">→</span>
      <span><strong>${escapeHtml(d.name)}</strong><span class="dest-note">${d.note}${d.ok ? '' : ' <a href="/pages/warehouses/assignments.html" class="link-sm">Assign a hub</a>'}</span></span>
    </div>`).join('');
    $('destError').hidden = true;
  }

  function renderPlan() {
    const plan = $('planBox');
    if (!clientId() || !destCountry()) {
      plan.innerHTML = '<div class="dest-empty">Choose a client and destination to see the plan</div>';
      return;
    }
    const hub = hubFor(clientId(), destCountry());
    const country = WH_COUNTRIES[destCountry()][1];
    const viaCollection = source() !== 'hub';

    const steps = (viaCollection ? ['Collection'] : []).concat(['Refurbish', 'Reimage', 'Repackage', 'Dispatch']);
    let intro;
    let estimate;
    if (!viaCollection) {
      intro = `Ships from <strong>${escapeHtml(hub.name)}</strong>, ${escapeHtml(clientName())}'s assigned hub in ${country}.`;
      estimate = 'Estimated delivery: 2–3 business days';
    } else {
      const from = source() === 'site' ? 'at a client site' : 'with an employee';
      intro = `The devices are ${from}, so the request starts with a <strong>Collection</strong> step into ${hub ? `<strong>${escapeHtml(hub.name)}</strong>` : 'Esevel'}.`;
      if (!hub) intro += ` ${escapeHtml(clientName())} has no assigned hub in ${country}, so deploys here always start with collection.`;
      estimate = 'Estimated delivery: collection 2–4 days + redeploy 3–4 days';
    }
    plan.innerHTML = `<p class="plan-intro">${intro}</p>
      <ol class="steps-list">${steps.map(s => `<li class="${s === 'Collection' ? 'step-collect' : ''}">${s}</li>`).join('')}</ol>
      <div class="plan-estimate">${estimate}</div>`;
  }

  function renderAll() {
    const redeploy = type === 'redeployment';
    $('typeHelp').textContent = {
      redeployment: 'Send a device to an employee. Hub stock ships directly; anything else is collected first.',
      storage: 'Collect devices into Esevel storage at the client\'s assigned hub. Storage fees start at intake.',
      disposal: 'Wipe and dispose of devices with a certificate. Devices in storage or a hub skip collection.'
    }[type];
    $('redeployFields').hidden = !redeploy;
    $('planBlock').hidden = !redeploy;
    $('destBlock').hidden = redeploy;
    fillCountries();
    updateSourceOptions();
    [...selected].forEach(id => { if (!eligible(findAsset(id))) selected.delete(id); });
    renderSelected();
    if (!$('assetResults').hidden) renderResults();
    renderDestination();
    renderPlan();
    $('submitBtn').textContent = `Create ${type}`;
  }

  function setType(t) {
    type = t;
    document.querySelectorAll('#reqType .segment-button').forEach(b => b.classList.toggle('active', b.dataset.type === t));
    renderAll();
  }

  document.querySelectorAll('#reqType .segment-button').forEach(b => b.addEventListener('click', () => setType(b.dataset.type)));
  $('reqClient').addEventListener('change', () => { $('clientError').hidden = true; renderAll(); });
  $('reqCountry').addEventListener('change', renderAll);
  document.querySelectorAll('input[name="source"]').forEach(r => r.addEventListener('change', renderAll));

  $('assetSearch').addEventListener('focus', () => { renderResults(); $('assetResults').hidden = false; });
  $('assetSearch').addEventListener('input', () => { renderResults(); $('assetResults').hidden = false; });
  document.addEventListener('click', e => { if (!e.target.closest('.asset-picker')) $('assetResults').hidden = true; });

  $('requestForm').addEventListener('submit', e => {
    e.preventDefault();
    const redeploy = type === 'redeployment';
    const errors = {
      clientError: !clientId(),
      assetError: selected.size === 0,
      recipientError: redeploy && !$('reqRecipient').value.trim()
    };
    Object.entries(errors).forEach(([id, show]) => { $(id).hidden = !show; });
    const destBad = !redeploy && selected.size > 0 && destinations().some(d => !d.ok);
    $('destError').hidden = !destBad;
    if (Object.values(errors).some(Boolean) || destBad) return;

    const newId = p => `${p}-${Math.floor(1000 + Math.random() * 9000)}`;
    const n = selected.size;
    const devices = `${n} device${n === 1 ? '' : 's'}`;
    const links = [];
    let text;
    if (type === 'storage') {
      text = `✓ Created ${newId('STO')} for ${clientName()}: collect ${devices} into storage at ${destinations().map(d => d.name).join(', ')}. Storage fees start at intake.`;
      links.push(['/pages/tracker/storage.html', 'Open Storage']);
    } else if (type === 'disposal') {
      text = `✓ Created ${newId('DSP')} for ${clientName()}: dispose of ${devices}. The certificate will be shared with the client.`;
      links.push(['/pages/tracker/disposal.html', 'Open Disposal']);
    } else {
      const from = source() === 'hub' ? `from ${hubFor(clientId(), destCountry()).name}` : 'starting with collection';
      text = `✓ Created ${newId('RED')} for ${clientName()}: ${devices} to ${$('reqRecipient').value.trim()}, ${from}.`;
      links.push(['/pages/tracker/redeployments.html', 'Open Redeployments']);
    }
    $('successText').textContent = text;
    $('successLinks').innerHTML = links.map(([href, label]) => `<a href="${href}" class="link-sm">${label}</a>`).join('');
    $('requestSuccess').hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    $('requestForm').reset();
    selected.clear();
    setType('redeployment');
  });

  const preset = new URLSearchParams(window.location.search).get('type');
  setType(['redeployment', 'storage', 'disposal'].includes(preset) ? preset : 'redeployment');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRaiseRequest);
} else {
  initRaiseRequest();
}
