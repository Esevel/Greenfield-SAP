// Raise request on a client's behalf: onboarding, offboarding, redeployment, storage or disposal.
// Onboarding/offboarding need the lifecycle-create permission (Customer Success, IT, Head of Ops, Super Admins)
// and are added to the live boards via staff-requests.js. Collection is a step inside the request when
// the device isn't already in a hub. Destinations and timing come from the client's assigned hub.
// Requires hub-data.js, stock-data.js, people-data.js (packages) and staff-requests.js.

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

  const canLifecycle = !!(window.RoleAccess && RoleAccess.canCreateLifecycle());
  if (canLifecycle) document.querySelectorAll('#reqType [data-lifecycle]').forEach(b => { b.hidden = false; });
  const isLifecycle = t => t === 'onboarding' || t === 'offboarding';

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
    if (type === 'offboarding') return (a.kind === 'employee' || a.kind === 'site') && (!$('offCountry').value || assetCountry(a) === $('offCountry').value);
    if (type === 'storage') return a.kind === 'employee' || a.kind === 'site';
    if (type === 'disposal') return true;
    if (type === 'resale') return a.icon === '💻'; // laptops and MacBooks only
    if (type === 'setup') return a.kind === 'employee';
    if (type === 'loaner') return false; // the loaner comes from hub stock, not the client's assets
    if (assetCountry(a) !== destCountry()) return false;
    if (source() === 'hub') {
      const hub = hubFor(clientId(), destCountry());
      return a.kind === 'hub' && !!hub && a.loc === hub.id;
    }
    return a.kind === source();
  }

  function fillCountries() {
    const active = clientId() ? Object.keys(HUB_ASSIGNMENTS[clientId()] || {}) : [];
    ['reqCountry', 'onbCountry', 'offCountry', 'loCountry'].forEach(id => {
      const keep = $(id).value;
      $(id).innerHTML = active.length
        ? active.map(cc => `<option value="${cc}">${countryLabel(cc)}</option>`).join('')
        : '<option value="">Select a client first</option>';
      $(id).disabled = !active.length;
      if (active.includes(keep)) $(id).value = keep;
    });
  }

  /* ---------- Onboarding / offboarding (lifecycle) fields ---------- */

  const onbRoute = () => (document.querySelector('input[name="onbRoute"]:checked') || {}).value || 'hub';
  const onbDeviceKeys = () => [...document.querySelectorAll('#onbDevices input:checked')].map(b => b.dataset.model);

  function fillPackages() {
    if ($('onbPkg').options.length) return;
    $('onbPkg').innerHTML = '<option value="">No package · pick devices below</option>'
      + Object.keys(JOINER_PACKAGES).map(k => `<option value="${escapeHtml(k)}">${escapeHtml(k)} · ${JOINER_PACKAGES[k].map(m => STOCK_MODELS[m].name).join(' + ')}</option>`).join('');
    $('onbDevices').innerHTML = Object.entries(STOCK_MODELS).map(([k, m]) =>
      `<label class="check-option"><input type="checkbox" data-model="${k}"> ${m.icon} ${escapeHtml(m.name)}</label>`).join('');
  }

  function applyPackage() {
    const models = JOINER_PACKAGES[$('onbPkg').value] || [];
    document.querySelectorAll('#onbDevices input').forEach(b => { b.checked = models.includes(b.dataset.model); });
    $('onbDeviceError').hidden = true;
  }

  // MDM enrolment choice: only when the client's plan includes device management (mdm-data.js)
  function updateOnbMdm() {
    const platform = clientId() ? mdmPlatform(clientId()) : null;
    $('onbMdmBlock').hidden = !platform;
    if (!platform) return;
    $('onbMdmNote').textContent = `· ${platform.name}`;
    const route = onbRoute();
    $('onbMdmHelp').textContent = route === 'direct'
      ? 'Vendor-direct devices enrol zero-touch (ABM / Autopilot) at first boot where supported; otherwise the employee follows the guide.'
      : `Hub devices can have the ${platform.agent} installed during provisioning.`;
  }

  let onbRouteChosen = false;
  function updateOnbRoute() {
    const hub = clientId() && $('onbCountry').value ? hubFor(clientId(), $('onbCountry').value) : null;
    const hubRadio = document.querySelector('input[name="onbRoute"][value="hub"]');
    hubRadio.disabled = !hub;
    $('onbHubNote').textContent = clientId() && $('onbCountry').value
      ? (hub ? `· ${hub.name}` : `· no assigned hub in ${WH_COUNTRIES[$('onbCountry').value][1]}`)
      : '';
    if (!hub && hubRadio.checked) document.querySelector('input[name="onbRoute"][value="direct"]').checked = true;
    // Unless the user picked a route, default back to the hub when one is available
    if (hub && !onbRouteChosen) hubRadio.checked = true;
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
    if (type === 'offboarding') return `No devices with employees or at client sites for ${clientName()}`;
    if (type === 'storage') return `No devices with employees or at client sites for ${clientName()}`;
    if (type === 'resale') return `No laptops for ${clientName()} — resale covers laptops and MacBooks only`;
    if (type === 'setup') return `No devices with employees for ${clientName()}`;
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
      if (type === 'offboarding') {
        const after = { store: 'stored', redeploy: 'held for redeployment', dispose: 'wiped and disposed' }[$('offDisposition').value];
        if ($('offDisposition').value === 'dispose') return { ...base, ok: true, name: hub ? hub.name : 'E-waste partner', note: `Collected, wiped, then ${after}` };
        if (hub) return { ...base, ok: true, name: hub.name, note: `Return hub · collected, wiped, then ${after}` };
        return { ...base, ok: false, name: 'No assigned hub', note: 'Storing or holding devices needs an Esevel hub.' };
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
    const onboarding = type === 'onboarding';
    const offboarding = type === 'offboarding';
    $('typeHelp').textContent = {
      onboarding: 'Kit a new hire: procure or pull from stock, provision and deliver before their start date.',
      offboarding: 'Collect a leaver\'s devices, wipe them and store, hold or dispose at the assigned hub.',
      redeployment: 'Send a device to an employee. Hub stock ships directly; anything else is collected first.',
      storage: 'Collect devices into Esevel storage at the client\'s assigned hub. Storage fees start at intake.',
      disposal: 'Wipe and dispose of devices with a certificate. Devices in storage or a hub skip collection.',
      resale: 'Sell used laptops through Esevel\'s resale partner: estimate, assessment, offer, then data erasure with certificate on acceptance.',
      loaner: 'Lend a device from the assigned hub while the employee\'s own device is in repair or delayed.',
      setup: 'Set up a device already with the employee: OS, standard apps, MDM agent, data migration.'
    }[type];
    $('onboardingFields').hidden = !onboarding;
    $('offboardingFields').hidden = !offboarding;
    $('redeployFields').hidden = !redeploy;
    $('resaleFields').hidden = type !== 'resale';
    $('loanerFields').hidden = type !== 'loaner';
    $('setupFields').hidden = type !== 'setup';
    $('planBlock').hidden = !redeploy;
    $('destBlock').hidden = redeploy || onboarding || type === 'resale' || type === 'loaner' || type === 'setup';
    $('assetBlock').hidden = onboarding || type === 'loaner';
    $('assetLabel').innerHTML = offboarding ? 'Devices to retrieve <span class="required">*</span>'
      : type === 'resale' ? 'Laptops to sell <span class="required">*</span>'
        : type === 'setup' ? 'Devices to set up <span class="required">*</span>'
          : 'Assets <span class="required">*</span>';
    fillCountries();
    if (onboarding) { fillPackages(); updateOnbRoute(); updateOnbMdm(); }
    updateSourceOptions();
    [...selected].forEach(id => { if (!eligible(findAsset(id))) selected.delete(id); });
    renderSelected();
    if (!$('assetResults').hidden) renderResults();
    renderDestination();
    renderPlan();
    $('submitBtn').textContent = `Create ${{ resale: 'resale request', loaner: 'loaner request', setup: 'setup request' }[type] || type}`;
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
  $('onbCountry').addEventListener('change', () => { updateOnbRoute(); updateOnbMdm(); });
  document.querySelectorAll('input[name="onbRoute"]').forEach(r => r.addEventListener('change', () => { onbRouteChosen = true; updateOnbMdm(); }));
  $('offCountry').addEventListener('change', renderAll);
  $('offDisposition').addEventListener('change', renderDestination);
  $('onbPkg').addEventListener('change', applyPackage);
  $('onbDevices').addEventListener('change', () => { $('onbDeviceError').hidden = !!onbDeviceKeys().length; });

  $('assetSearch').addEventListener('focus', () => { renderResults(); $('assetResults').hidden = false; });
  $('assetSearch').addEventListener('input', () => { renderResults(); $('assetResults').hidden = false; });
  document.addEventListener('click', e => { if (!e.target.closest('.asset-picker')) $('assetResults').hidden = true; });

  /* ---------- Create onboarding / offboarding on the live boards ---------- */

  function nowIso() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  const staffOwner = () => {
    const u = window.RoleAccess && RoleAccess.userById();
    const name = u ? u.name : 'Esevel Ops';
    return [name.split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join(''), name];
  };

  function createOnboarding() {
    const errors = {
      clientError: !clientId(),
      onbEmployeeError: !$('onbEmployee').value.trim(),
      onbStartError: !$('onbStart').value,
      onbAddressError: !$('onbAddress').value.trim(),
      onbDeviceError: !onbDeviceKeys().length
    };
    Object.entries(errors).forEach(([id, show]) => { $(id).hidden = !show; });
    if (Object.values(errors).some(Boolean)) return null;
    const devices = onbDeviceKeys().map(k => STOCK_MODELS[k].name);
    const item = {
      id: StaffRequests.nextId('ONB', 1194), client: clientId(), type: 'onboarding', cc: $('onbCountry').value,
      start: nowIso(), done: [], ...(onbRoute() === 'direct' ? { route: 'employee' } : {}),
      stage: 'Initiated · raised by Esevel', owner: staffOwner(), blocker: '',
      note: [staffOwner()[1], $('reqNotes').value.trim() || 'Raised by Esevel staff on the client\'s behalf'],
      onb: {
        employee: $('onbEmployee').value.trim(), role: $('onbRole').value.trim() || '—',
        startDate: $('onbStart').value, pkg: $('onbPkg').value || 'Custom',
        address: $('onbAddress').value.trim(), devices,
        ...(mdmPlatform(clientId()) ? { mdm: { platform: CLIENT_MDM[clientId()], method: (document.querySelector('input[name="onbMdm"]:checked') || {}).value || 'manual' } } : {})
      }
    };
    StaffRequests.add(item);
    return item;
  }

  function createOffboarding() {
    const errors = {
      clientError: !clientId(),
      offEmployeeError: !$('offEmployee').value.trim(),
      offLastDayError: !$('offLastDay').value,
      offAddressError: !$('offAddress').value.trim(),
      assetError: selected.size === 0
    };
    Object.entries(errors).forEach(([id, show]) => { $(id).hidden = !show; });
    const destBad = selected.size > 0 && destinations().some(d => !d.ok);
    $('destError').hidden = !destBad;
    if (Object.values(errors).some(Boolean) || destBad) return null;
    const after = { store: 'store at hub', redeploy: 'hold for redeployment', dispose: 'wipe and dispose' }[$('offDisposition').value];
    const item = {
      id: StaffRequests.nextId('OFF', 2061), client: clientId(), type: 'offboarding', cc: $('offCountry').value,
      start: nowIso(), done: [],
      stage: 'Notified · raised by Esevel', owner: staffOwner(), blocker: '',
      note: [staffOwner()[1], $('reqNotes').value.trim() || 'Raised by Esevel staff on the client\'s behalf'],
      off: {
        employee: $('offEmployee').value.trim(), lastDay: $('offLastDay').value,
        address: $('offAddress').value.trim(), disposition: $('offDisposition').value, after,
        devices: [...selected].map(id => { const a = findAsset(id); return `${a.model} · ${a.id}`; })
      },
      href: '/pages/services/offboarding-detail.html'
    };
    StaffRequests.add(item);
    return item;
  }

  $('requestForm').addEventListener('submit', e => {
    e.preventDefault();
    const redeploy = type === 'redeployment';

    if (isLifecycle(type)) {
      const item = type === 'onboarding' ? createOnboarding() : createOffboarding();
      if (!item) return;
      const who = type === 'onboarding' ? item.onb.employee : item.off.employee;
      const text = type === 'onboarding'
        ? `✓ Created ${item.id} for ${clientName()}: onboard ${who} (starts ${item.onb.startDate}) with ${item.onb.devices.length} device${item.onb.devices.length === 1 ? '' : 's'}.`
        : `✓ Created ${item.id} for ${clientName()}: collect ${item.off.devices.length} device${item.off.devices.length === 1 ? '' : 's'} from ${who} (last day ${item.off.lastDay}), then ${item.off.after}.`;
      $('successText').textContent = text;
      $('successLinks').innerHTML = `<a href="/pages/services/${type}.html" class="link-sm">Open ${type[0].toUpperCase()}${type.slice(1)}</a>`;
      $('requestSuccess').hidden = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      $('requestForm').reset();
      selected.clear();
      setType(type);
      return;
    }

    // Resale / loaner / device setup: simpler flows with their own validation and no destination panel
    if (['resale', 'loaner', 'setup'].includes(type)) {
      const errors = {
        clientError: !clientId(),
        ...(type === 'resale' ? { rsPayeeError: !$('rsPayee').value.trim(), assetError: selected.size === 0 } : {}),
        ...(type === 'loaner' ? { loRecipientError: !$('loRecipient').value.trim() } : {}),
        ...(type === 'setup' ? { suRecipientError: !$('suRecipient').value.trim(), assetError: selected.size === 0 } : {})
      };
      Object.entries(errors).forEach(([id, show]) => { $(id).hidden = !show; });
      if (Object.values(errors).some(Boolean)) return;
      const newId = p => `${p}-${Math.floor(1000 + Math.random() * 9000)}`;
      const n = selected.size;
      let text;
      const links = [];
      if (type === 'resale') {
        text = `✓ Created ${newId('RSL')} for ${clientName()}: resale estimate requested for ${n} laptop${n === 1 ? '' : 's'}. The partner's estimate goes to ${$('rsPayee').value.trim()} for confirmation before assessment.`;
      } else if (type === 'loaner') {
        const hub = $('loCountry').value ? hubFor(clientId(), $('loCountry').value) : null;
        text = `✓ Created ${newId('LNR')} for ${clientName()}: loaner for ${$('loRecipient').value.trim()} (${$('loReason').value.toLowerCase()})${hub ? `, shipping from ${hub.name}` : ''}${$('loUntil').value ? `, needed until ${$('loUntil').value}` : ''}.`;
        links.push(['/pages/stock/list.html', 'Check hub stock']);
      } else {
        const tasks = [...document.querySelectorAll('#suTasks input:checked')].length;
        text = `✓ Created ${newId('SET')} for ${clientName()}: ${$('suKind').value.toLowerCase()} device setup for ${$('suRecipient').value.trim()} · ${tasks} task${tasks === 1 ? '' : 's'} on ${n} device${n === 1 ? '' : 's'}.`;
      }
      $('successText').textContent = text;
      $('successLinks').innerHTML = links.map(([href, label]) => `<a href="${href}" class="link-sm">${label}</a>`).join('');
      $('requestSuccess').hidden = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      $('requestForm').reset();
      selected.clear();
      setType(type);
      return;
    }

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
      links.push(['/pages/services/storage.html', 'Open Storage']);
    } else if (type === 'disposal') {
      text = `✓ Created ${newId('DSP')} for ${clientName()}: dispose of ${devices}. The certificate will be shared with the client.`;
      links.push(['/pages/services/disposal.html', 'Open Disposal']);
    } else {
      const from = source() === 'hub' ? `from ${hubFor(clientId(), destCountry()).name}` : 'starting with collection';
      text = `✓ Created ${newId('RED')} for ${clientName()}: ${devices} to ${$('reqRecipient').value.trim()}, ${from}.`;
      links.push(['/pages/services/redeployments.html', 'Open Redeployments']);
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
  const types = ['redeployment', 'storage', 'disposal', 'resale', 'loaner', 'setup', ...(canLifecycle ? ['onboarding', 'offboarding'] : [])];
  setType(types.includes(preset) ? preset : 'redeployment');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRaiseRequest);
} else {
  initRaiseRequest();
}
