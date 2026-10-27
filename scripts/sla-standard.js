// Standard SLAs: one card per SLA type for the chosen country, with milestones as a timeline.
// Needs hub-data.js, supply-data.js, sla-data.js and sla-default-panel.js.

function slaExceptionList() {
  return Object.keys(SLA_OVERRIDES)
    .filter(k => slaCustomCount(SLA_OVERRIDES[k]) > 0)
    .map(k => { const [client, type, cc] = k.split('|'); return { key: k, client, type, cc }; });
}

function initSlaStandard() {
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  let cc = WH_COUNTRIES[params.get('country')] ? params.get('country') : 'SG';

  $('stdCountry').innerHTML = Object.keys(WH_COUNTRIES).map(x => `<option value="${x}">${WH_COUNTRIES[x][0]} ${WH_COUNTRIES[x][1]}</option>`).join('');
  $('stdCountry').value = cc;

  function chipHtml(m, v) {
    const cls = m.hubOnly ? ' std-chip-hub' : m.conditional ? ' std-chip-cond' : '';
    let value;
    if (m.fixed) value = m.fixed;
    else if (m.synced) value = `Vendor${v ? ` + ${v}d` : ''}`;
    else value = `${v}${SLA_UNITS[m.unit].short}`;
    return `<li class="std-chip${cls}">
      <span class="std-chip-label">${m.label}</span>
      <span class="std-chip-value">${value}</span>
      ${m.synced ? '<span class="synced-tag">From vendor</span>' : ''}
    </li>`;
  }

  function cardHtml(t) {
    const d = SLA_DEFAULTS[t.key][cc];
    const clients = slaClientsIn(cc);
    const exc = slaExceptionList().filter(e => e.type === t.key && e.cc === cc).length;
    const meta = SLA_DEFAULT_META[t.key];
    const synced = t.milestones.find(m => m.synced);
    const vendors = synced ? supplyVendorsIn(cc) : [];
    return `<section class="card std-card">
      <div class="std-card-head">
        <div>
          <h3 class="std-card-title">${t.name}</h3>
          <div class="std-card-note">${t.note}</div>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" data-edit="${t.key}">Edit</button>
      </div>
      <ol class="std-timeline">${t.milestones.map((m, i) => chipHtml(m, d[i])).join('')}</ol>
      <div class="std-card-foot">
        <span>End-to-end <strong>${slaTotalText(t, d)}</strong>${vendors.length ? ` <span class="text-muted">· vendors here: ${vendors.map(v => `${escapeHtml(v.name)} ${supplyRangeLabel(v.range)}`).join(', ')}</span>` : ''}</span>
        <span class="text-muted">${clients.length ? `${clients.length - exc} client${clients.length - exc === 1 ? '' : 's'} on standard${exc ? ` · <a href="/pages/sla-config/exceptions.html?type=${t.key}&country=${cc}" class="link-sm">${exc} exception${exc === 1 ? '' : 's'}</a>` : ''}` : 'No clients in this country'} · v${meta.version}</span>
      </div>
    </section>`;
  }

  function render() {
    const group = (title, key) => `<h2 class="std-group-title">${title}</h2>${SLA_TYPES.filter(t => t.group === key).map(cardHtml).join('')}`;
    $('stdGroups').innerHTML = group('Orders', 'order') + group('Services', 'service');
    $('excCount').textContent = slaExceptionList().length;
  }

  $('stdCountry').addEventListener('change', e => { cc = e.target.value; render(); });

  const panel = initSlaDefaultPanel(text => {
    $('slaSaved').hidden = false;
    $('slaSavedText').textContent = text;
    render();
  });
  $('stdGroups').addEventListener('click', e => {
    const b = e.target.closest('[data-edit]');
    if (b) panel.open(b.dataset.edit, cc);
  });

  render();
}

// Single plain-text total: every step counted, vendor and collection steps described in words.
// Business-hour types (orders) show hours plus the business-day equivalent and the direct-route total.
function slaTotalText(type, values) {
  let d = 0, h = 0, hub = 0;
  type.milestones.forEach((m, i) => {
    const v = Number(values[i]);
    if (m.fixed || m.conditional || !Number.isFinite(v)) return;
    if (type.bizHours && m.hubOnly) hub += v;
    else if (m.unit === 'h') h += v; else d += v;
  });
  if (type.bizHours) {
    const days = x => `${Math.round(x / 9 * 10) / 10} business days`;
    return `${h + hub}h via hub (≈ ${days(h + hub)}) · ${h}h direct`;
  }
  const parts = [d ? `${d}d` : '', h ? `${h}h` : ''].filter(Boolean).join(' ') || '0';
  const prefix = type.milestones.some(m => m.fixed) ? 'vendor date + ' : type.milestones.some(m => m.synced) ? 'vendor lead time + ' : '';
  return prefix + parts;
}

if (document.getElementById('stdGroups')) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSlaStandard);
  else initSlaStandard();
}
