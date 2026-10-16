// Client exceptions: one row per client × SLA type × country that differs from the standard.
// Needs hub-data.js, supply-data.js, sla-data.js and sla-standard.js.

function initSlaExceptions() {
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const clientName = id => WH_CLIENTS.find(c => c.id === id).name;
  const fmtVal = (m, v) => (m.synced ? `${v}d fixed` : `${v}${SLA_UNITS[m.unit].short}`);
  const stdVal = (m, v) => (m.fixed ? m.fixed : m.synced ? `Vendor${v ? ` + ${v}d` : ''}` : `${v}${SLA_UNITS[m.unit].short}`);
  let editing = null;

  // Exceptions with a fixed vendor step shorter than a vendor's lead time in that country
  function conflictFor(e) {
    const i = slaSyncedIdx(e.type);
    const ov = SLA_OVERRIDES[e.key];
    if (i < 0 || ov[i] === null || ov[i] === undefined) return [];
    return supplyVendorsIn(e.cc).filter(v => v.range[1] > ov[i]);
  }

  const opt = (v, label) => `<option value="${v}">${label}</option>`;
  $('fClient').innerHTML = opt('', 'All') + WH_CLIENTS.map(c => opt(c.id, escapeHtml(c.name))).join('');
  $('fType').innerHTML = opt('', 'All') + SLA_TYPES.map(t => opt(t.key, t.name)).join('');
  $('fCountry').innerHTML = opt('', 'All') + Object.keys(WH_COUNTRIES).map(x => opt(x, WH_COUNTRIES[x][1])).join('');
  if (WH_CLIENTS.some(c => c.id === params.get('client'))) $('fClient').value = params.get('client');
  if (slaType(params.get('type'))) $('fType').value = params.get('type');
  if (WH_COUNTRIES[params.get('country')]) $('fCountry').value = params.get('country');

  function render() {
    const all = slaExceptionList();
    const rows = all.filter(e => (!$('fClient').value || e.client === $('fClient').value)
      && (!$('fType').value || e.type === $('fType').value)
      && (!$('fCountry').value || e.cc === $('fCountry').value));
    $('excRows').innerHTML = rows.map(e => {
      const t = slaType(e.type);
      const ov = SLA_OVERRIDES[e.key];
      const std = SLA_DEFAULTS[e.type][e.cc];
      const diffs = t.milestones.map((m, i) => (ov[i] === null || ov[i] === undefined ? '' :
        `<span class="exc-diff">${m.label} <strong>${fmtVal(m, ov[i])}</strong> <s>${stdVal(m, std[i])}</s></span>`)).join('');
      const bad = conflictFor(e);
      const v = SLA_CLIENT_VERSIONS[e.client];
      return `<tr class="${bad.length ? 'exc-row-bad' : ''}">
        <td><strong>${escapeHtml(clientName(e.client))}</strong></td>
        <td>${t.name}</td>
        <td><span class="flag">${WH_COUNTRIES[e.cc][0]}</span> ${WH_COUNTRIES[e.cc][1]}</td>
        <td><div class="exc-diffs">${diffs}</div>${bad.length ? `<div class="sla-conflict">⚠ Shorter than ${bad.map(b => `${escapeHtml(b.name)} ${supplyRangeLabel(b.range)}`).join(', ')}</div>` : ''}</td>
        <td class="text-muted">v${v.version} · ${v.date}</td>
        <td><button type="button" class="btn btn-secondary btn-sm" data-edit="${e.key}">Edit</button></td>
      </tr>`;
    }).join('') || '<tr><td colspan="6" class="text-muted sla-empty">No exceptions match. Clients here follow the standard.</td></tr>';

    const bad = all.filter(e => conflictFor(e).length);
    $('excBanner').hidden = !bad.length;
    $('excBanner').textContent = `⚠ ${bad.length} exception${bad.length === 1 ? ' is' : 's are'} shorter than a vendor's lead time, so orders with that vendor will breach.`;
    $('excCount').textContent = all.length;
    $('excFooter').textContent = `Showing ${rows.length} of ${all.length} exceptions · Everything not listed follows the standard`;
  }

  // Panel
  const panel = $('excPanel');
  const overlay = $('excOverlay');
  $('pClient').innerHTML = WH_CLIENTS.map(c => opt(c.id, escapeHtml(c.name))).join('');
  $('pType').innerHTML = SLA_TYPES.map(t => opt(t.key, t.name)).join('');

  function fillCountries() {
    const keep = $('pCountry').value;
    const ccs = Object.keys(HUB_ASSIGNMENTS[$('pClient').value] || {});
    $('pCountry').innerHTML = ccs.map(x => opt(x, `${WH_COUNTRIES[x][0]} ${WH_COUNTRIES[x][1]}`)).join('');
    if (ccs.includes(keep)) $('pCountry').value = keep;
  }

  const panelKey = () => slaKey($('pClient').value, $('pType').value, $('pCountry').value);

  function renderMilestones() {
    const t = slaType($('pType').value);
    const cc = $('pCountry').value;
    const std = SLA_DEFAULTS[t.key][cc];
    const ov = SLA_OVERRIDES[panelKey()] || slaNulls(t.key);
    $('excMilestones').innerHTML = t.milestones.map((m, i) => `
      <div class="exc-ms-row${ov[i] !== null && ov[i] !== undefined ? ' changed' : ''}">
        <label for="excMs${i}">${m.label}${m.synced ? ' <span class="synced-tag">From vendor</span>' : ''}</label>
        <span class="text-muted">${stdVal(m, std[i])}</span>
        <span>${m.fixed ? '<span class="text-muted">—</span>' : `<input type="number" class="form-input sla-input" id="excMs${i}" min="1" max="${SLA_UNITS[m.unit].max}" step="1" value="${ov[i] ?? ''}" placeholder="Std"> <span class="sla-unit">${m.synced ? 'd fixed' : SLA_UNITS[m.unit].short}</span>`}</span>
      </div>`).join('');
    const exists = !editing && SLA_OVERRIDES[panelKey()] && slaCustomCount(SLA_OVERRIDES[panelKey()]);
    $('pExists').hidden = !exists;
    $('pExists').textContent = exists ? 'This client already has an exception here; saving will replace it.' : '';
    validate();
  }

  function values() {
    const t = slaType($('pType').value);
    return t.milestones.map((m, i) => {
      if (m.fixed) return null;
      const raw = $(`excMs${i}`).value.trim();
      return raw === '' ? null : Number(raw);
    });
  }

  function validate() {
    const t = slaType($('pType').value);
    const vals = values();
    const ok = vals.every((v, i) => v === null || (Number.isInteger(v) && v >= 1 && v <= SLA_UNITS[t.milestones[i].unit].max));
    $('excError').hidden = ok;
    $('excSave').disabled = !ok || !vals.some(v => v !== null);
    document.querySelectorAll('#excMilestones .exc-ms-row').forEach((row, i) => row.classList.toggle('changed', vals[i] !== null));
    const si = slaSyncedIdx(t.key);
    const fixed = si >= 0 ? vals[si] : null;
    const over = fixed ? supplyVendorsIn($('pCountry').value).filter(v => v.range[1] > fixed) : [];
    $('excConflict').hidden = !over.length;
    $('excConflict').textContent = over.length ? `⚠ ${over.map(v => `${v.name} quotes ${supplyRangeLabel(v.range)}`).join(', ')}. Orders with ${over.length === 1 ? 'that vendor' : 'those vendors'} will breach a ${fixed}-day target.` : '';
  }

  function open(key) {
    editing = key || null;
    if (key) {
      const [client, type, cc] = key.split('|');
      $('pClient').value = client;
      fillCountries();
      $('pType').value = type;
      $('pCountry').value = cc;
    } else {
      $('pClient').value = $('fClient').value || WH_CLIENTS[0].id;
      fillCountries();
      if ($('fType').value) $('pType').value = $('fType').value;
      if ($('fCountry').value && [...$('pCountry').options].some(o => o.value === $('fCountry').value)) $('pCountry').value = $('fCountry').value;
    }
    $('excTitle').textContent = key ? 'Edit exception' : 'Add exception';
    $('excMeta').textContent = key ? `${clientName(key.split('|')[0])} · contract v${SLA_CLIENT_VERSIONS[key.split('|')[0]].version}` : 'Only change what differs from the standard';
    $('excPick').querySelectorAll('select').forEach(s => { s.disabled = !!key; });
    $('excRemove').hidden = !key;
    renderMilestones();
    panel.classList.add('open');
    overlay.classList.add('show');
  }

  function close() {
    panel.classList.remove('open');
    overlay.classList.remove('show');
  }

  function saved(text, clientId) {
    const v = SLA_CLIENT_VERSIONS[clientId];
    v.version += 1;
    v.date = 'Today';
    $('slaSaved').hidden = false;
    $('slaSavedText').textContent = `${text} New contract version v${v.version} for ${clientName(clientId)}.`;
    close();
    render();
  }

  $('excAdd').addEventListener('click', () => open(null));
  $('excRows').addEventListener('click', e => { const b = e.target.closest('[data-edit]'); if (b) open(b.dataset.edit); });
  $('pClient').addEventListener('change', () => { fillCountries(); renderMilestones(); });
  ['pType', 'pCountry'].forEach(id => $(id).addEventListener('change', renderMilestones));
  $('excMilestones').addEventListener('input', validate);
  $('excSave').addEventListener('click', () => {
    const key = panelKey();
    SLA_OVERRIDES[key] = values();
    const [client, type, cc] = key.split('|');
    saved(`Exception saved: ${slaType(type).name} · ${WH_COUNTRIES[cc][1]}.`, client);
  });
  $('excRemove').addEventListener('click', () => {
    const [client, type, cc] = editing.split('|');
    delete SLA_OVERRIDES[editing];
    saved(`Exception removed: ${slaType(type).name} · ${WH_COUNTRIES[cc][1]} now follows the standard.`, client);
  });
  $('excClose').addEventListener('click', close);
  $('excCancel').addEventListener('click', close);
  overlay.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && panel.classList.contains('open')) close(); });

  ['fClient', 'fType', 'fCountry'].forEach(id => $(id).addEventListener('change', render));
  render();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSlaExceptions);
else initSlaExceptions();
