// Client (commercial) page: contract terms as stacked sections with a version selector.
// Billing entities carry their own currency, tax and billable user rate. Fees show the Settings standard with this client's exceptions.
// Needs hub-data.js, sla-data.js, sla-standard.js, billing-data.js, contract-terms.js and markup-data.js.

function initClientDetail() {
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const client = WH_CLIENTS.find(c => c.id === params.get('c')) || WH_CLIENTS[0];
  const k = CONTRACTS[client.id];
  const VERSION_LABEL = { active: 'Active', pending: 'Awaiting acceptance', draft: 'Draft', superseded: 'Superseded', withdrawn: 'Withdrawn' };
  const baseV = () => (activeVersion(k) || pendingVersion(k)).v;
  let viewV = k.versions.some(v => v.v === Number(params.get('v'))) ? Number(params.get('v')) : baseV();

  document.title = `${client.name} - Clients - Admin Portal`;
  $('cdCrumb').textContent = client.name;
  $('cdTitle').textContent = client.name;

  const viewing = () => k.versions.find(v => v.v === viewV);
  const editable = () => viewing().status === 'draft';
  const termsOf = v => (v.status === 'draft' ? v.terms : contractTerms(k, v.v));
  const amendHref = v => `/pages/clients/amendment.html?c=${client.id}&v=${v}`;
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const changedTag = '<span class="changed-tag">Changed</span>';
  const optHtml = (opts, sel, lab) => opts.map(o => `<option value="${o}" ${o === sel ? 'selected' : ''}>${lab ? lab(o) : o}</option>`).join('');

  function controlHtml(f, v, path, ctx) {
    if (!editable()) {
      const text = f.fmt ? f.fmt(v, ctx) : f.optLabel ? f.optLabel(v) : (v === '' || v === undefined ? '—' : String(v));
      return `<div class="detail-value">${escapeHtml(text)}</div>`;
    }
    if (f.type === 'select') return `<select class="form-select" data-path="${path}">${optHtml(f.options(), v, f.optLabel)}</select>`;
    if (f.type === 'multi') return `<div class="multi-checks">${f.options().map(o => `<label class="sla-check"><input type="checkbox" data-multi="${path}" value="${o}" ${v.includes(o) ? 'checked' : ''}> ${f.optLabel ? f.optLabel(o) : o}</label>`).join('')}</div>`;
    if (f.type === 'toggle') return `<label class="toggle-switch"><input type="checkbox" data-path="${path}" data-kind="toggle" ${v ? 'checked' : ''}><span class="toggle-slider"></span></label>`;
    if (f.type === 'textarea') return `<textarea class="form-textarea" rows="2" data-path="${path}">${escapeHtml(v)}</textarea>`;
    return `<input class="form-input" type="${f.type}" data-path="${path}" ${f.type === 'number' ? 'min="0" step="any" data-kind="number"' : ''} value="${escapeHtml(String(v))}">`;
  }

  function fieldHtml(f, t, cmp) {
    const v = termGet(t, f.path);
    const changed = cmp && !same(termGet(cmp, f.path), v);
    return `<div class="${f.wide ? 'field-wide' : ''} ${changed ? 'field-changed' : ''}"><div class="detail-label">${f.label}${changed ? ` ${changedTag}` : ''}</div>${controlHtml(f, v, f.path, t)}</div>`;
  }

  const section = (id, title, body, note = '') => `<section class="card mb-lg contract-section" id="sec-${id}" data-section="${id}">
      <div class="card-header"><h3 class="card-title">${title}</h3>${note ? `<span class="text-muted section-note">${note}</span>` : ''}</div>
      <div class="card-body">${body}</div>
    </section>`;
  const grid = (key, t, cmp) => `<div class="detail-grid">${CONTRACT_FIELDS[key].map(f => fieldHtml(f, t, cmp)).join('')}</div>`;

  /* Billing entities: company tree + per-entity currency, tax, importer of record, billable user rate */
  function entitiesHtml(t, cmp) {
    const node = (e, depth) => {
      const i = t.entities.indexOf(e);
      const was = cmp && cmp.entities.find(x => x.id === e.id);
      const fields = ENTITY_FIELDS.filter(f => f.key !== 'muRate' || t.managedUsers.enabled).map(f => {
        const changed = was && !same(was[f.key], e[f.key]);
        return `<div class="${changed ? 'field-changed' : ''}"><div class="detail-label">${f.label}${changed ? ` ${changedTag}` : ''}</div>${controlHtml(f, e[f.key], `entities.${i}.${f.key}`, e)}</div>`;
      }).join('');
      const nonLocal = e.currency !== COUNTRY_CURRENCY[e.country];
      return `<li class="entity-node" style="--depth:${depth}">
          <div class="entity-name">${depth ? '<span class="entity-branch">└</span>' : ''}${escapeHtml(e.name)} ${depth ? '' : '<span class="tag tag-parent">Parent</span>'} <span class="cur-pill">${e.currency}</span>${nonLocal ? ` <span class="text-muted entity-flag">billed in ${e.currency}, not local ${COUNTRY_CURRENCY[e.country]}</span>` : ''}</div>
          <div class="entity-meta">${WH_COUNTRIES[e.country][0]} ${WH_COUNTRIES[e.country][1]} · ${escapeHtml(e.taxId)} · ${escapeHtml(e.contact)}${e.taxNote ? ` · ${escapeHtml(e.taxNote)}` : ''}</div>
          <div class="entity-fields">${fields}</div>
        </li>${t.entities.filter(c => c.parent === e.id).map(c => node(c, depth + 1)).join('')}`;
    };
    return `<ul class="entity-tree">${t.entities.filter(e => !e.parent).map(e => node(e, 0)).join('')}</ul>
      <div class="readonly-note">Each entity is invoiced in its own currency. Tax rates per country: <a href="/pages/settings/billing.html?tab=tax">Settings › Billing › Tax and duties</a>; exemptions and importer of record are set here per entity.</div>`;
  }

  /* Lifecycle fees: standard per country with this client's exceptions and switched-off events */
  function feesHtml(t, cmp) {
    const ed = editable();
    const rows = FEE_EVENTS.map(e => {
      const on = isBillable(t, e.key);
      const billChanged = cmp && isBillable(cmp, e.key) !== on;
      const cells = t.countries.map(cc => {
        const f = contractFee(t, e.key, cc);
        const was = cmp && contractFee(cmp, e.key, cc);
        const ch = was && (was.base !== f.base || was.custom !== f.custom);
        const cell = ed
          ? `<span class="fee-input"><span class="text-muted">${f.cur}</span><input type="number" class="form-input ${f.custom ? 'fee-custom' : ''}" min="0" step="${e.key === 'storage' ? '0.01' : '1'}" data-fee="${e.key}.${cc}" value="${f.base}" aria-label="${e.label} fee ${cc}" ${on ? '' : 'disabled'}>${f.custom ? `<button type="button" class="fee-reset" data-reset="${e.key}.${cc}" title="Back to standard ${fmtAmount(f.cur, f.std)}">↺</button>` : ''}</span>`
          : (on ? `${fmtAmount(f.cur, f.base)}${f.custom ? `<div class="stock-sub">std ${fmtAmount(f.cur, f.std)}</div>` : ''}` : '—');
        return `<td class="num ${f.custom && on ? 'cell-custom' : ''} ${ch ? 'cell-changed' : ''}" ${ch ? `title="Was ${was.custom ? fmtAmount(was.cur, was.base) : 'standard'}"` : ''}>${cell}</td>`;
      }).join('');
      return `<tr class="${on ? '' : 'row-muted'}">
          <td>${e.label}<div class="stock-sub">${e.unit} · on ${e.trigger.toLowerCase()}</div></td>
          <td class="${billChanged ? 'cell-changed' : ''}">${ed
            ? `<label class="toggle-switch"><input type="checkbox" data-billable="${e.key}" ${on ? 'checked' : ''} aria-label="${e.label} billable"><span class="toggle-slider"></span></label>`
            : (on ? 'Yes' : 'No')}</td>
          ${cells}
        </tr>`;
    }).join('');
    const n = Object.keys(t.feeExceptions).length + t.offEvents.length;
    return `<div class="fee-toolbar"><span class="text-muted">Each country priced in its local currency. Charges convert to the paying entity's currency at the contract FX source.</span></div>
      <table class="device-list-table fee-grid">
        <thead><tr><th>Event</th><th>Billable</th>${t.countries.map(cc => `<th class="num">${WH_COUNTRIES[cc][0]} ${cc}</th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="readonly-note"><span class="legend-custom"></span> Client exception · ${n ? `${n} exception${n === 1 ? '' : 's'} to the standard` : 'All standard'} · <a href="/pages/settings/billing.html">Standard fees</a>. Only exceptions are stored on the contract, so standard changes flow through automatically.</div>`;
  }

  /* Client pricing adjustments apply to Retail price; final price never falls below vendor cost. */
  function pricingHtml(t, cmp) {
    const ed = editable();
    const markChanged = cmp && !same(cmp.pricing.markup, t.pricing.markup);
    const rows = t.pricing.markup.map((m, i) => {
        const def = markupCurrent(m.category, m.tier);
        return `<tr><td>${m.category}</td><td>${VOLUME_TIERS[m.tier].split(' ·')[0]}</td>
          <td class="num">${def ? `${def.markup > 0 ? '+' : ''}${def.markup}%` : '—'}</td>
          <td class="num">${ed ? `<input type="number" class="form-input mk-input" min="-100" max="100" step="0.5" data-markup="${i}" value="${m.markup}" aria-label="Retail price adjustment">` : `<strong>${m.markup > 0 ? '+' : ''}${m.markup}%</strong>`}</td>
          <td>${ed ? `<button type="button" class="link-sm btn-text" data-markup-rm="${i}">Remove</button>` : ''}</td></tr>`;
      }).join('');
      const free = [];
      DEVICE_CATEGORIES.forEach(c => Object.keys(VOLUME_TIERS).forEach(tr => { if (!t.pricing.markup.some(m => m.category === c && m.tier === tr)) free.push(`${c}|${tr}`); }));
    const body = `<div class="detail-label">Retail price percentage adjustments${markChanged ? ` ${changedTag}` : ''}</div>
        <table class="device-list-table mk-exc ${markChanged ? 'field-changed' : ''}"><thead><tr><th>Category</th><th>Tier</th><th class="num">Suggested default</th><th class="num">Contract adjustment</th><th></th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5" class="text-muted">No custom adjustments · clients use retail. <a href="/pages/catalogue/markup.html">View suggested defaults</a>.</td></tr>'}</tbody></table>
        ${ed && free.length ? `<div class="inline-add"><select class="form-select" id="mkAddSel">${free.map(x => { const [c, tr] = x.split('|'); return `<option value="${x}">${c} · ${VOLUME_TIERS[tr].split(' ·')[0]}</option>`; }).join('')}</select><button type="button" class="btn btn-secondary btn-sm" id="mkAdd">Add exception</button></div>` : ''}
        <div class="readonly-note">A listed percentage creates a custom price for this client and category/tier. Without a contract adjustment, the client pays retail. Negative adjustments are allowed; the final price is never below vendor cost.</div>`;
    return `<div class="detail-grid">${CONTRACT_FIELDS.pricing.map(f => fieldHtml(f, t, cmp)).join('')}</div><div class="pricing-body">${body}</div>
      <div class="readonly-note">Vendor cost and retail price are maintained in each model's Country listings. Contract adjustments are applied only where explicitly listed. <a href="/pages/catalogue/model/country-listings.html">Open Country listings</a>.</div>`;
  }

  /* Discounts and rate overrides: time-limited, agreed with the client through the amendment flow */
  function discountsHtml(t, cmp) {
    const ed = editable();
    const list = t.discounts || [];
    const changed = cmp && !same(cmp.discounts || [], list);
    const state = d => (d.to && d.to < BILLING_TODAY ? ['Ended', 'badge-neutral'] : d.from > BILLING_TODAY ? ['Scheduled', 'badge-info'] : ['Active', 'badge-success']);
    const rows = list.map((d, i) => `<tr>
        <td>${d.event ? FEE_EVENTS.find(e => e.key === d.event).label : 'All lifecycle fees'}</td>
        <td>${d.cc ? `${WH_COUNTRIES[d.cc][0]} ${WH_COUNTRIES[d.cc][1]}` : 'All countries'}</td>
        <td class="num"><strong>${d.kind === 'percent' ? `${d.value}% off` : fmtAmount(COUNTRY_CURRENCY[d.cc], d.value)}</strong></td>
        <td>${billingDate(d.from)} – ${d.to ? billingDate(d.to) : 'open-ended'}</td>
        <td class="text-muted">${escapeHtml(d.note || '')}</td>
        <td><span class="badge ${state(d)[1]} badge-sm">${state(d)[0]}</span></td>
        <td>${ed ? `<button type="button" class="link-sm btn-text" data-disc-rm="${i}">Remove</button>` : ''}</td>
      </tr>`).join('');
    const opt = (v, l) => `<option value="${v}">${l}</option>`;
    return `<table class="device-list-table ${changed ? 'field-changed' : ''}"><thead><tr><th>Fee</th><th>Country</th><th class="num">Discount</th><th>Dates</th><th>Note</th><th>Status</th><th></th></tr></thead>
      <tbody>${rows || '<tr><td colspan="7" class="text-muted">None. Fees bill at the rates above.</td></tr>'}</tbody></table>
      ${changed ? `<div class="readonly-note">${changedTag} against v${activeVersion(k).v}</div>` : ''}
      ${ed ? `<div class="inline-add disc-add">
        <select class="form-select" id="dcEvent" aria-label="Fee">${opt('', 'All lifecycle fees')}${FEE_EVENTS.map(e => opt(e.key, e.label)).join('')}</select>
        <select class="form-select" id="dcCc" aria-label="Country">${opt('', 'All countries')}${t.countries.map(cc => opt(cc, WH_COUNTRIES[cc][1])).join('')}</select>
        <select class="form-select" id="dcKind" aria-label="Type">${opt('percent', '% off')}${opt('rate', 'Fixed rate (one fee, one country)')}</select>
        <input type="number" class="form-input" id="dcValue" min="0" step="0.01" placeholder="Value" aria-label="Value">
        <input type="date" class="form-input" id="dcFrom" aria-label="From" value="${BILLING_TODAY}">
        <input type="date" class="form-input" id="dcTo" aria-label="To">
        <input type="text" class="form-input" id="dcNote" placeholder="Reason" aria-label="Reason">
        <button type="button" class="btn btn-secondary btn-sm" id="dcAdd">Add</button>
      </div><div class="form-error" id="dcError" hidden></div>` : ''}
      <div class="readonly-note">Applied automatically when a charge is priced, on the date the step completes. A fixed rate replaces the fee in that country's currency; % off applies to the contract fee. If both match, the fixed rate wins. Agreed with the client through the amendment.</div>`;
  }

  /* Charge routing: which entity pays */
  function routingHtml(t, cmp) {
    const ed = editable();
    const changed = cmp && !same(cmp.routing, t.routing);
    const def = t.countries.map(cc => { const p = payingEntity(t, cc); return `<tr><td>${WH_COUNTRIES[cc][0]} ${WH_COUNTRIES[cc][1]}</td><td>${escapeHtml(p.entity.name)} <span class="cur-pill">${p.entity.currency}</span></td><td class="text-muted">${escapeHtml(p.why)}</td></tr>`; }).join('');
    const rules = t.routing.map((r, i) => `<tr><td>${r.match === 'po' ? 'PO' : 'Cost centre'}</td><td>${escapeHtml(r.value)}</td><td>${escapeHtml((entityById(t, r.entity) || {}).name || '—')}</td><td>${ed ? `<button type="button" class="link-sm btn-text" data-route-rm="${i}">Remove</button>` : ''}</td></tr>`).join('');
    return `<div class="detail-label">Default: work country, then parent</div>
      <table class="device-list-table"><thead><tr><th>Work in</th><th>Paying entity</th><th>Why</th></tr></thead><tbody>${def}</tbody></table>
      <div class="detail-label route-label">Overrides${changed ? ` ${changedTag}` : ''}</div>
      <table class="device-list-table ${changed ? 'field-changed' : ''}"><thead><tr><th>Match</th><th>Value</th><th>Billed to</th><th></th></tr></thead>
      <tbody>${rules || '<tr><td colspan="4" class="text-muted">No overrides</td></tr>'}</tbody></table>
      ${ed ? `<div class="inline-add"><select class="form-select" id="rtMatch"><option value="costCentre">Cost centre</option><option value="po">PO</option></select><input type="text" class="form-input" id="rtValue" placeholder="e.g. CC-2100 Sales"><select class="form-select" id="rtEntity">${t.entities.map(e => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('')}</select><button type="button" class="btn btn-secondary btn-sm" id="rtAdd">Add override</button></div>` : ''}`;
  }

  function managedHtml(t, cmp) {
    // The live count uses the active contract; a draft or old version only changes the rule fields above it
    const live = !isOnboarding(k) && t.managedUsers.enabled && k.terms.managedUsers.enabled;
    return `<div class="detail-grid">${CONTRACT_FIELDS.managed.map(f => fieldHtml(f, t, cmp)).join('')}</div>
      <div class="readonly-note">A user counts once a month if they held at least one Assigned laptop at any point in it, however many laptops. A laptop in repair still counts; loaners and peripherals never do. No proration. Each user bills to the entity in their work country at its rate (set under Billing entities).</div>
      ${live ? '<div id="buPanel" class="bu-panel"></div>' : ''}`;
  }

  // Device management rollup (mdm-data.js): client-level enrolment %, MFA %, SSO apps and password manager adoption
  function mdmRollupHtml() {
    if (typeof CLIENT_MDM === 'undefined' || !CLIENT_MDM[client.id]) {
      return '<div class="readonly-note">Device management is part of the Secure and Complete plans. This client\'s plan doesn\'t include it.</div>';
    }
    const p = MDM_PLATFORMS[CLIENT_MDM[client.id]];
    const devices = mdmClientDevices(client.id);
    const verified = devices.filter(d => d.state === 'verified').length;
    const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
    const bar = (a, b) => {
      const v = pct(a, b);
      return `<div class="util cap-inline"><div class="util-bar"><div class="util-fill util-${v >= 80 ? 'healthy' : 'near'}" style="width:${v}%"></div></div><span class="util-pct">${v}%</span></div>`;
    };
    const idn = CLIENT_IDENTITY[client.id];
    const mfa = MFA_ROSTERS[client.id];
    const sso = (SSO_APPS[client.id] || []);
    const line = (label, value, barHtml = '') => `<div><div class="detail-label">${label}</div><div class="detail-value">${value}</div>${barHtml}</div>`;
    return `<div class="detail-grid">
        ${line('Platform', p.name)}
        ${line('Devices enrolled', `${verified} of ${devices.length} verified`, bar(verified, devices.length))}
        ${idn.mfaPurchased && mfa
          ? line('MFA enrolment', `${mfa.enrolled} of ${mfa.total} users`, bar(mfa.enrolled, mfa.total))
          : line('MFA enrolment', `Not purchased · add-on on the ${idn.plan} plan`)}
        ${line('SSO applications', sso.length ? `${sso.filter(a => a.status === 'Active').length} active${sso.some(a => a.status === 'Pending') ? ` · ${sso.filter(a => a.status === 'Pending').length} pending` : ''}` : 'None connected')}
        ${CLIENT_MDM[client.id] === 'jumpcloud' && idn.pmUsers
          ? line('Password manager', `${idn.pmEnrolled} of ${idn.pmUsers} users enrolled`, bar(idn.pmEnrolled, idn.pmUsers))
          : ''}
      </div>
      <div class="readonly-note">Synced from ${p.name} (${MDM_LAST_SYNC[CLIENT_MDM[client.id]]}). Per-device state is on the <a href="/pages/assets/list.html" class="link-sm">Asset console</a> (MDM column and filter); sync health is in <a href="/pages/integrations/list.html" class="link-sm">Integrations</a>.</div>`;
  }

  function capHtml(t, cmp) {
    if (!CAP_SPEND[client.id] || isOnboarding(k)) return grid('cap', t, cmp);
    const i = capInfo(client.id);
    return grid('cap', t, cmp) + `<div class="util cap-inline"><div class="util-bar"><div class="util-fill util-${i.status}" style="width:${Math.min(100, i.pct)}%"></div><div class="util-mark"></div></div><span class="util-pct">${Math.round(i.pct)}%</span></div>
      <div class="readonly-note">${fmtAmount(i.cur, i.spent, 0)} spent this period across entities, converted at ${escapeHtml(i.fxSource)} · ${CAP_STATUS[i.status][0]} · <a href="/pages/clients/caps.html">Procurement caps</a>${editable() ? '' : ` · <a href="/pages/clients/caps.html?set=${client.id}">Set cap</a>`}</div>`;
  }

  function disputesHtml() {
    const items = DISPUTES.filter(d => d.client === client.id).sort((a, b) => b.raised.localeCompare(a.raised));
    const rows = items.map(d => {
      const { inv, line } = disputeLine(d);
      const [label, tone] = DISPUTE_STATE[d.status];
      return `<tr>
        <td><a href="/pages/billing/needs-action.html?id=${d.id}" class="link-sm">${d.id}</a></td>
        <td>${d.wo === 'Billable users' ? 'Billable users' : escapeHtml(d.wo)}${line ? `<div class="stock-sub">${LEDGER_EVENT_LABEL[line.event]} · ${escapeHtml(line.asset)}</div>` : ''}</td>
        <td>${inv ? `<a href="/pages/billing/invoice.html?id=${inv.id}" class="link-sm">${inv.id}</a>` : '—'}</td>
        <td>${billingDate(d.raised)}</td>
        <td><span class="badge ${tone} badge-sm">${label}</span></td>
      </tr>`;
    }).join('');
    const open = items.some(d => !disputeClosed(d));
    const charges = LEDGER.filter(e => e.client === client.id && canRaiseDispute(e)).slice(0, 8);
    return `<h4 class="panel-section-title">Client disputes</h4>
      ${rows ? `<div class="table-container"><table class="table device-list-table"><thead><tr><th>Dispute</th><th>Work / charge</th><th>Invoice</th><th>Raised</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<div class="text-muted">No disputes recorded for this client.</div>'}
      ${open ? '' : `<div class="readonly-note">Raise a dispute from an invoiced charge below. Open disputes are worked in <a href="/pages/billing/needs-action.html" class="link-sm">Billing · Needs action</a>.</div>`}
      ${charges.length ? `<div class="detail-label dispute-eligible-title">Invoiced charges</div><div class="table-container"><table class="table device-list-table"><thead><tr><th>Charge</th><th>Work order</th><th>Invoice</th><th class="num">Amount</th><th></th></tr></thead><tbody>${charges.map(e => `<tr>
        <td><a href="/pages/billing/ledger.html?entry=${e.id}" class="link-sm">${e.id}</a><div class="stock-sub">${LEDGER_EVENT_LABEL[e.event]}</div></td>
        <td>${escapeHtml(e.wo)} · ${escapeHtml(e.step)}<div class="stock-sub">${escapeHtml(e.asset)}</div></td>
        <td><a href="/pages/billing/invoice.html?id=${e.invoice}" class="link-sm">${e.invoice}</a></td>
        <td class="num">${fmtAmount(e.cur, e.amount)}</td>
        <td><a href="/pages/billing/ledger.html?entry=${e.id}&reduce=dispute" class="btn btn-secondary btn-sm">Raise dispute</a></td>
      </tr>`).join('')}</tbody></table></div>` : ''}`;
  }

  function overviewHtml(t, cmp) {
    const exc = slaExceptionList().filter(e => e.client === client.id).length;
    return `<div class="detail-grid">
        ${fieldHtml(CONTRACT_FIELDS.overview[0], t, cmp)}
        <div><div class="detail-label">Term starts</div><div class="detail-value">${billingDate(k.start)}</div></div>
        ${fieldHtml(CONTRACT_FIELDS.overview[1], t, cmp)}
        <div><div class="detail-label">Countries</div><div class="detail-value">${t.countries.map(cc => `${WH_COUNTRIES[cc][0]} ${cc}`).join(' · ')}</div></div>
        <div><div class="detail-label">Invoice currencies</div><div class="detail-value">${contractCurrencies(t).join(' · ')}</div></div>
        <div><div class="detail-label">Billing model</div><div class="detail-value">${t.subscription ? `${t.subscription.blocks.reduce((n, b) => n + b.qty, 0)} seats · ${PLANS[t.tier].free ? 'no charge' : `${fmtAmount(subCurrency(t), subAnnualRate(t, [SUB_TODAY, t.subscription.term.start].sort().pop()).amount)} / year in advance`} + lifecycle fees · <a href="#sec-subscription" class="link-sm">Plan & seats</a>` : 'Per lifecycle event (no seat subscription)'}</div></div>
        <div><div class="detail-label">SLAs</div><div class="detail-value">${exc ? `${exc} client exception${exc === 1 ? '' : 's'}` : 'Standard SLAs'} · <a href="/pages/sla-config/exceptions.html?client=${client.id}" class="link-sm">SLA configuration</a></div></div>
      </div>`;
  }

  /* Seat ledger, subscription status and seat orders (live view of the active contract) */
  function subStatusHtml(st, t) {
    const pending = pendingVersion(k);
    const renewBtn = !pending ? '<button type="button" class="btn btn-primary btn-sm" data-sub-renew>Renew subscription…</button>' : `<a class="btn btn-secondary btn-sm" href="${amendHref(pending.v)}">Open v${pending.v}</a>`;
    if (st.key === 'active') return `<div class="sub-status sub-status-ok"><span class="badge ${st.cls} badge-sm">${st.label}</span> ${escapeHtml(st.text)}</div>`;
    const msg = {
      due: `Renewal due · ${escapeHtml(st.text)}. The client keeps working until the term ends. Agree renewal terms (seats can go down here) or turn on auto-renew.`,
      expired: `${escapeHtml(st.text)}. Password and MFA expiry notifications are paused until the subscription is renewed. Only available seats can be assigned; seats can’t be ordered.`,
      restricted: `${escapeHtml(st.text)}${PLANS[t.tier].free ? ' (Free plans restrict at the renewal date)' : ` since ${billingDate(addDays(st.graceEnd, 1))}`}. New users can’t be added and notifications are paused. The client has been asked to contact support@esevel.com about their JumpCloud users and devices.`
    }[st.key];
    return `<div class="sub-status sub-status-${st.key}"><span class="badge ${st.cls} badge-sm">${st.label}</span><span>${msg}</span>${renewBtn}</div>`;
  }

  function seatsHtml(c, cur) {
    const tile = (label, value, sub, cls = '') => `<div class="seat-tile ${cls}"><div class="seat-tile-label">${label}</div><div class="seat-tile-value">${value}</div><div class="seat-tile-sub">${sub}</div></div>`;
    const led = SEATS[client.id];
    const pct = x => (c.total ? (x / c.total) * 100 : 0);
    return `<div class="seat-tiles">
        ${tile('Initial seats', c.initial, 'Bought at the start of the term')}
        ${tile('Total seats', c.total, c.added ? `${c.initial} initial + ${c.added} added` : 'No seats added this term')}
        ${tile('Active', c.active, 'Active, onboarding or offboarding users')}
        ${tile('Available', c.available, 'Assign without an order', c.available ? '' : 'seat-tile-alert')}
        ${tile('Used', c.used, 'Used twice; cleared at renewal')}
      </div>
      <div class="seat-bar" aria-label="${c.active} active, ${c.available} available, ${c.used} used of ${c.total}">
        <span class="seat-bar-active" style="width:${pct(c.active)}%"></span><span class="seat-bar-used" style="width:${pct(c.used)}%"></span>
      </div>
      <div class="seat-legend"><span><i class="seat-dot seat-dot-active"></i>Active ${c.active}</span><span><i class="seat-dot seat-dot-available"></i>Available ${c.available}</span><span><i class="seat-dot seat-dot-used"></i>Used ${c.used}</span><span class="text-muted">Total ${c.total} = ${c.active} + ${c.available} + ${c.used}</span>${led.cleared ? `<span class="text-muted">· ${led.cleared} used seats cleared at renewal</span>` : ''}</div>
      <details class="seat-roster"><summary>Seat roster (${c.total}) · plan price per user</summary>
        <div class="readonly-note">Plan price shows <strong>-</strong> when the seat was already paid for: bought in the initial subscription, reused after its first user left, or covered by the renewal. It shows the order amount when this user's seat or extra devices were bought this term. Renewal resets every user to -.</div>
        <table class="device-list-table"><thead><tr><th>Seat</th><th>Status</th><th>Current user</th><th class="num">Devices</th><th class="num">Plan price</th><th>Uses</th><th>History</th></tr></thead><tbody>${led.seats.map(s => {
          const h = seatHolder(s);
          const [l, cls] = SEAT_STATUS[seatState(s)];
          const p = h && h.pid ? personById(h.pid) : null;
          return `<tr><td class="asset-serial">${s.id}</td><td><span class="badge ${cls} badge-sm">${l}</span></td>
            <td>${h ? (p ? `<a href="/pages/people/person.html?id=${p.id}" class="link-sm">${escapeHtml(h.name)}</a> <span class="text-muted">· ${PERSON_STATE[p.state][0]}</span>` : escapeHtml(h.name)) : '<span class="text-muted">—</span>'}</td>
            <td class="num">${p ? `${personDevices(p)} / ${subDeviceLimit(k.tier) + (s.extra || 0)}` : h ? `≤ ${subDeviceLimit(k.tier) + (s.extra || 0)}` : '—'}</td>
            <td class="num" title="${h && h.paid ? `Order ${h.paid.order}` : 'Seat already paid for (initial subscription, reused seat or renewal)'}">${h ? (h.paid ? fmtAmount(h.paid.cur, h.paid.seat + h.paid.devices) : '-') : ''}</td>
            <td class="num">${s.uses.length} / 2</td>
            <td class="stock-sub">${s.uses.map(u => `${escapeHtml(u.name)} ${billingDate(u.from)}${u.to ? ` – ${billingDate(u.to)}` : ' – now'}`).join('<br>') || 'Never used'}</td></tr>`;
        }).join('')}</tbody></table>
      </details>`;
  }

  function seatOrdersHtml(cur) {
    const orders = seatOrdersFor(client.id).slice().sort((a, b) => (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1) || b.created.localeCompare(a.created));
    if (!orders.length) return '<h4 class="panel-section-title">Subscription orders</h4><div class="text-muted">No seat orders yet. One is raised when a new user joins and no seat is available.</div>';
    return `<h4 class="panel-section-title">Subscription orders</h4>
      <table class="device-list-table seat-orders"><thead><tr><th>Order</th><th>For</th><th>Ordered</th><th class="num">One-off amount</th><th>Status</th><th></th></tr></thead><tbody>${orders.map(o => {
        const [l, cls] = SEAT_ORDER_STATUS[o.status];
        const p = o.pid ? personById(o.pid) : null;
        return `<tr><td><span class="card-id">${o.id}</span><div class="stock-sub">Raised ${billingDate(o.created)}</div></td>
          <td>${p ? `<a href="/pages/people/joiners.html?open=${p.id}" class="link-sm">${escapeHtml(o.name)}</a>` : escapeHtml(o.name)}</td>
          <td>${seatOrderLabel(o)}</td><td class="num"><strong>${fmtAmount(o.cur, o.amount)}</strong>${o.lines.map(l => `<div class="stock-sub">${l.qty} × ${fmtAmount(o.cur, l.monthly)} / mo × ${l.days} d ÷ 30</div>`).join('')}</td>
          <td><span class="badge ${cls} badge-sm">${l}</span>${o.decided ? `<div class="stock-sub">${o.status === 'approved' ? 'Approved' : 'Rejected'} by ${escapeHtml(o.by || '—')} ${billingDate(o.decided)}${o.reason ? ` · ${escapeHtml(o.reason)}` : ''}</div>` : `<div class="stock-sub">${escapeHtml(o.admin)}</div>`}</td>
          <td>${o.status === 'pending' ? `<div class="seat-order-actions"><button type="button" class="btn btn-secondary btn-sm" data-so-approve="${o.id}" title="Prototype: simulate the client admin">Simulate approval</button><button type="button" class="btn-text" data-so-reject="${o.id}">Reject</button></div>` : ''}</td></tr>`;
      }).join('')}</tbody></table>
      <div class="readonly-note">The client admin approves orders in their portal. An order is charged once: monthly price × days left in the subscription year ÷ 30 (at most 360 days, so never more than 12 months). The seat or devices are then committed until the term ends and included in the annual fee from the next subscription year.</div>`;
  }

  /* Seat subscription: committed seats per block, add-ons, usage vs seats, renewal. Enterprise shows its event model instead. */
  function subscriptionHtml(t, cmp) {
    const ed = editable();
    const sub = t.subscription;
    const was = cmp && cmp.subscription;
    const changed = cmp && JSON.stringify(was || null) !== JSON.stringify(sub || null);
    if (!sub) {
      return isSeatPlan(t.tier) ? '<div class="text-muted">This seat plan has no subscription yet.</div>'
        : `<div class="sub-event-model"><strong>Event-based billing.</strong> ${escapeHtml(PLANS.Enterprise.blurb)}: lifecycle fees, billable users and device sales as set on the Billing, Pricing and Billable users tabs. Moving to Support, Secure or Complete adds a seat subscription.</div>`;
    }
    const cur = subCurrency(t);
    // Before the term starts, show the rate it will start at
    const run = subAnnualRate(t, [SUB_TODAY, sub.term.start].sort().pop());
    const dlim = subDeviceLimit(t.tier);
    const live = !isOnboarding(k) && viewing().status === 'active' && typeof seatCounts === 'function';
    const counts = live ? seatCounts(client.id) : null;
    const status = live ? subStatus(k) : null;
    const free = PLANS[t.tier].free;
    const committedIds = new Set((activeVersion(k) && contractTerms(k, activeVersion(k).v).subscription || { blocks: [] }).blocks.map(b => b.id));
    const midTerm = SUB_TODAY <= sub.term.end && activeVersion(k);
    const blockRow = (b, i) => {
      const committed = committedIds.has(b.id) && midTerm && viewing().status !== 'active';
      const prev = was && was.blocks.find(x => x.id === b.id);
      const ch = cmp && (!prev || prev.qty !== b.qty || prev.price !== b.price);
      return `<tr class="${ch ? 'field-changed' : ''}">
        <td>${ed && !committed ? `<input type="date" class="form-input" data-sub-block="${i}" data-k="from" value="${b.from}" min="${sub.term.start}" max="${sub.term.end}" aria-label="Seats start">` : billingDate(b.from)}${committed ? '<div class="stock-sub">Committed</div>' : ''}</td>
        <td class="num">${ed ? `<input type="number" class="form-input qty-input" min="${committed ? prev?.qty || b.qty : 1}" step="1" data-sub-block="${i}" data-k="qty" value="${b.qty}" aria-label="Seats">` : `<strong>${b.qty}</strong>`}</td>
        <td class="num">${ed ? `<span class="fee-input"><span class="text-muted">${cur}</span><input type="number" class="form-input" min="0" step="0.5" data-sub-block="${i}" data-k="price" value="${b.price}" aria-label="Price per seat"></span>` : fmtAmount(cur, b.price)}</td>
        <td class="num">${fmtAmount(cur, b.qty * b.price * 12)}${b.charge != null ? `<div class="stock-sub">${fmtAmount(cur, b.charge)} one-off this year</div>` : ''}</td>
        <td>${ed ? `<input class="form-input" data-sub-block="${i}" data-k="note" value="${escapeHtml(b.note || '')}" placeholder="Note" aria-label="Note">` : escapeHtml(b.note || '')}</td>
        <td>${ed && !committed && sub.blocks.length > 1 ? `<button type="button" class="btn-text" data-sub-rm="${i}">Remove</button>` : ''}</td>
      </tr>`;
    };
    const addonRows = Object.entries(PLAN_ADDONS).map(([key, a]) => {
      const av = addonAvailability(t.tier, key);
      const on = sub.addOns.find(x => x.key === key);
      const state = av === 'included' ? '<span class="tag tag-hub">Included</span>' : !av ? '<span class="text-muted">Not available on this plan</span>' : on ? `${fmtAmount(cur, on.price)} / seat / month` : '<span class="text-muted">Off</span>';
      return `<tr><td>${a.label}</td><td>${state}</td><td>${ed && av === 'addon' ? (on ? `<span class="fee-input"><span class="text-muted">${cur}</span><input type="number" class="form-input" min="0" step="0.5" data-sub-addon="${key}" value="${on.price}" aria-label="${a.label} price"></span> <button type="button" class="btn-text" data-sub-addon-off="${key}">Remove</button>` : `<button type="button" class="btn btn-secondary btn-sm" data-sub-addon-on="${key}">Add · list ${fmtAmount(cur, planListPrice(a.listUSD, cur))}</button>`) : ''}</td></tr>`;
    }).join('');
    const nx = sub.next;
    return `${changed ? `<div class="readonly-note">${changedTag} against v${activeVersion(k)?.v}</div>` : ''}
      <div class="sub-summary">
        <div><div class="detail-label">Plan</div><div class="detail-value"><strong>${t.tier}</strong> · ${escapeHtml(PLANS[t.tier].blurb)}</div></div>
        <div><div class="detail-label">Term</div><div class="detail-value">${ed ? `${billingDate(sub.term.start)} – <input type="date" class="form-input sub-end" data-sub-term="end" value="${sub.term.end}" min="${sub.term.start}" aria-label="Term ends">` : subTermText(sub)}</div></div>
        <div><div class="detail-label">Committed seats</div><div class="detail-value"><strong>${run.seats || sub.blocks.reduce((n, b) => n + b.qty, 0)}</strong>${run.seats !== sub.blocks.reduce((n, b) => n + b.qty, 0) ? ` <span class="text-muted">(${sub.blocks.reduce((n, b) => n + b.qty, 0)} incl. scheduled)</span>` : ''}</div></div>
        <div><div class="detail-label">Annual fee</div><div class="detail-value"><strong>${free ? 'No charge' : fmtAmount(cur, run.amount)}</strong>${run.agreed ? ` <span class="tag">Agreed</span> <span class="text-muted">calculated ${fmtAmount(cur, run.calc)}</span>` : ''} <span class="text-muted">${free ? '' : `per subscription year, in advance${run.year ? ` (next ${billingDate(addDays(run.year.end, 1))})` : ''} · `}billed to ${escapeHtml((entityById(t, sub.billTo) || {}).name || '—')}</span></div></div>
      </div>
      ${status ? subStatusHtml(status, t) : ''}
      ${counts ? seatsHtml(counts, cur) : ''}
      <h4 class="panel-section-title">Seat blocks</h4>
      <table class="device-list-table sub-blocks"><thead><tr><th>From</th><th class="num">Seats</th><th class="num">Price / seat / month</th><th class="num">Per year</th><th>Note</th><th></th></tr></thead><tbody>${sub.blocks.map(blockRow).join('')}</tbody></table>
      ${ed ? `<div class="inline-add sub-add">
          <input type="number" class="form-input qty-input" id="sbQty" min="1" step="1" value="5" aria-label="Seats to add">
          <span class="fee-input"><span class="text-muted">${cur}</span><input type="number" class="form-input" id="sbPrice" min="0" step="0.5" value="${subLastPrice(sub)}" aria-label="Price per added seat"></span>
          <input type="date" class="form-input" id="sbFrom" value="${[firstOfNextMonth(), sub.term.start].sort().pop()}" min="${sub.term.start}" max="${sub.term.end}" aria-label="Seats start">
          <button type="button" class="btn btn-secondary btn-sm" id="sbAdd">Add seats</button>
        </div><div class="form-error" id="sbError" hidden></div>` : ''}
      <div class="readonly-note">Seats are committed until ${billingDate(sub.term.end)}: they can be added at any time, at their own price, but not removed or reduced before then. Each subscription year is billed in advance (seats × monthly price × 12). Seats added mid-year are charged once for the rest of that year (monthly price × days left ÷ 30, at most 360 days), then join the annual fee. Lower the count in the renewal.</div>
      ${free ? '' : `<h4 class="panel-section-title">Annual total</h4>
      <div class="sub-overage-price">${ed ? `<span class="fee-input"><span class="text-muted">${cur}</span><input type="number" class="form-input" min="0" step="1" data-sub-total value="${sub.agreedTotal ?? ''}" placeholder="${run.calc}" aria-label="Agreed annual total"></span> per subscription year · leave blank to bill the calculated ${fmtAmount(cur, run.calc)}` : sub.agreedTotal != null ? `<strong>${fmtAmount(cur, sub.agreedTotal)}</strong> agreed per subscription year (calculated ${fmtAmount(cur, run.calc)})` : `Calculated from seats, add-ons and devices: <strong>${fmtAmount(cur, run.calc)}</strong> per year`}</div>
      <div class="readonly-note">An agreed total replaces the calculated annual fee on the invoice. Seats and devices ordered mid-year are still charged pro rata at the per-seat rates; set a new total in the renewal to include them. It can't be lowered mid-term.</div>`}
      <h4 class="panel-section-title">Devices per user</h4>
      <div class="sub-overage-price">Each seat covers <strong>${dlim} device${dlim === 1 ? '' : 's'}</strong> (laptops and peripherals) on ${t.tier}. ${free ? 'Extra devices are added at no charge.' : `Extra devices: ${ed ? `<span class="fee-input"><span class="text-muted">${cur}</span><input type="number" class="form-input" min="0" step="0.5" data-sub-devprice value="${subDevicePrice(t)}" aria-label="Extra device price"></span>` : `<strong>${fmtAmount(cur, subDevicePrice(t))}</strong>`} per device per month${sub.devicePrice == null ? ` <span class="text-muted">· list USD ${PLANS[t.tier].deviceUSD}</span>` : ''}, ordered as an upgrade and charged pro rata like seats.`}</div>
      ${subDeviceBlocks(sub).length ? `<table class="device-list-table"><thead><tr><th>From</th><th class="num">Extra devices</th><th class="num">Price / device / month</th><th class="num">Per year</th><th>Note</th></tr></thead><tbody>${subDeviceBlocks(sub).map(d => `<tr><td>${billingDate(d.from)}</td><td class="num">${d.qty}</td><td class="num">${fmtAmount(cur, d.price)}</td><td class="num">${fmtAmount(cur, d.qty * d.price * 12)}${d.charge != null ? `<div class="stock-sub">${fmtAmount(cur, d.charge)} one-off this year</div>` : ''}</td><td>${escapeHtml(d.note || '')}</td></tr>`).join('')}</tbody></table>` : '<div class="text-muted">No extra devices this term.</div>'}
      <h4 class="panel-section-title">Add-ons</h4>
      <table class="device-list-table"><tbody>${addonRows}</tbody></table>
      <h4 class="panel-section-title">Additional seats</h4>
      <div class="sub-overage-price">${free ? 'Free plan: seats are added at no charge when a new user joins and no seat is available. No order needed.' : `${ed ? `<span class="fee-input"><span class="text-muted">${cur}</span><input type="number" class="form-input" min="0" step="0.5" data-sub-addprice value="${subAddPrice(sub)}" aria-label="Additional seat price"></span>` : `<strong>${fmtAmount(cur, subAddPrice(sub))}</strong>`} per seat per month${sub.addPrice == null ? ' <span class="text-muted">· defaults to the latest seat price</span>' : ''}`}</div>
      ${free ? '' : `<div class="readonly-note">When a new user joins and no seat is available, the client admin approves a subscription order for one seat at this price plus add-ons, charged once for the rest of the subscription year. Today that is ${fmtAmount(cur, (subQuote({ ...t, tier: t.tier }, 'seats', 1) || { amount: 0 }).amount)} (${(subQuote({ ...t, tier: t.tier }, 'seats', 1) || {}).days || 0} days). The price can be raised mid-term, not lowered.</div>`}
      ${live ? seatOrdersHtml(cur) : ''}
      <h4 class="panel-section-title">Renewal</h4>
      ${nx ? `<table class="device-list-table"><thead><tr><th>Renewal term</th><th class="num">Seats</th><th class="num">Price / seat</th><th></th></tr></thead><tbody>${nx.blocks.map((b, i) => `<tr><td>${subTermText(nx)}</td>
          <td class="num">${ed ? `<input type="number" class="form-input qty-input" min="1" step="1" data-sub-next="${i}" data-k="qty" value="${b.qty}" aria-label="Renewal seats">` : b.qty}</td>
          <td class="num">${ed ? `<span class="fee-input"><span class="text-muted">${cur}</span><input type="number" class="form-input" min="0" step="0.5" data-sub-next="${i}" data-k="price" value="${b.price}" aria-label="Renewal price"></span>` : fmtAmount(cur, b.price)}</td>
          <td>${ed ? '<button type="button" class="btn-text" data-sub-next-rm>Remove renewal</button>' : ''}</td></tr>`).join('')}</tbody></table>
          <div class="readonly-note">From ${billingDate(nx.term.start)} the subscription bills ${nx.blocks.reduce((n, b) => n + b.qty, 0)} seats. This is where the seat count can go down.</div>`
        : `<div class="detail-value">${sub.autoRenew ? `Auto-renews for 12 months on ${sub.blocks.reduce((n, b) => n + b.qty, 0)} seats from ${billingDate(addDays(sub.term.end, 1))}.` : 'Ends at term end.'}</div>
          ${ed ? `<div class="sub-renew-actions"><label class="sla-check"><input type="checkbox" data-sub-auto ${sub.autoRenew ? 'checked' : ''}> Auto-renew</label><button type="button" class="btn btn-secondary btn-sm" data-sub-next-add>Set renewal terms…</button></div>` : ''}`}`;
  }

  function splitShipmentsHtml() {
    return `<label class="toggle-switch-label">
        <span class="toggle-switch"><input type="checkbox" id="cdSplitShip" ${SLA_SPLIT_DELIVERY[client.id] ? 'checked' : ''}><span class="toggle-slider"></span></span>
        <span>Allow split shipments</span>
      </label>
      <div class="input-helper">Off: each kit ships complete once everything reaches the hub. On: ready items ship separately (extra courier cost). Ops setting; changes apply immediately and don't create a contract version.</div>`;
  }

  function renderHeader() {
    const v = viewing();
    const [sLabel, sCls] = CONTRACT_STATUS[k.status];
    $('cdTags').innerHTML = `<span class="badge ${sCls}">${sLabel}</span><span class="text-muted">· ${k.tier} · ${contractCurrencies(k.terms).join(' · ')}</span>`;
    $('cdVersion').innerHTML = k.versions.map(x => `<option value="${x.v}" ${x.v === viewV ? 'selected' : ''}>v${x.v} · ${VERSION_LABEL[x.status]}${x.effective ? ` · from ${billingDate(x.effective)}` : ''}</option>`).join('');
    const pending = pendingVersion(k);
    const actions = [];
    if (isOnboarding(k) && v.status === 'draft') actions.push('<button class="btn btn-secondary" id="cdDeleteClient">Delete client</button>', `<a class="btn btn-primary" href="${amendHref(v.v)}">Review and send</a>`);
    else if (isOnboarding(k)) actions.push(`<a class="btn btn-primary" href="${amendHref(v.v)}">Open initial contract</a>`);
    else if (v.status === 'draft') actions.push('<button class="btn btn-secondary" id="cdDiscard">Discard draft</button>', `<a class="btn btn-primary" href="${amendHref(v.v)}">Review and publish</a>`);
    else if (v.status === 'pending') actions.push(`<a class="btn btn-primary" href="${amendHref(v.v)}">Open amendment</a>`);
    else if (!pending && v.status === 'active') actions.push('<button class="btn btn-primary" id="cdEdit">Edit terms</button>');
    else if (!pending) actions.push(`<button class="btn btn-secondary" id="cdGoActive">View active v${activeVersion(k).v}</button>`);
    else actions.push(`<button class="btn btn-secondary" id="cdGoPending">View v${pending.v} ${pending.status === 'draft' ? 'draft' : 'amendment'}</button>`);
    $('cdActions').innerHTML = actions.join('');
    const banner = isOnboarding(k) ? (v.status === 'draft'
      ? `New client · initial contract v1 is a draft. Edit any section below, then review and send it to ${escapeHtml(clientAdminFor(k))} to accept. Nothing is billed until then.`
      : k.registeredAt ? `Pending subscription · ${escapeHtml(clientAdminFor(k))} registered ${escapeHtml(k.registeredAt)} and still needs to accept contract v1. Terms are locked; withdraw it on the contract page to make changes.`
        : `Pending subscription · registration link sent ${escapeHtml(k.linkSentAt || v.publishedAt || '')} to ${escapeHtml(clientAdminFor(k))}${k.adminEmail ? ` (${escapeHtml(k.adminEmail)})` : ''}. They complete company registration and set a password, then accept contract v1. Terms are locked.`) : {
      superseded: `Read-only · v${v.v} was replaced by a later version. Accepted by ${escapeHtml(v.acceptedBy || '—')} on ${escapeHtml(v.acceptedAt || '—')}. <a href="${amendHref(v.v)}">See what changed</a>`,
      withdrawn: `Read-only · v${v.v} was withdrawn before the client accepted it.`,
      pending: `Locked · v${v.v} was published ${escapeHtml(v.publishedAt || '')} and is waiting for ${escapeHtml(clientAdminFor(k))} to accept. Changes are highlighted against v${activeVersion(k).v}.`,
      draft: `Draft v${v.v} · only staff can see this. Changes are highlighted against v${activeVersion(k).v}. Review and publish to send it to the client admin.`
    }[v.status];
    $('cdBanner').hidden = !banner;
    $('cdBanner').className = `version-banner version-${v.status}`;
    $('cdBanner').innerHTML = banner || '';
  }

  const TABS = [
    { id: 'overview', label: 'Overview', sections: ['overview'] },
    { id: 'subscription', label: 'Plan & seats', sections: ['subscription'] },
    { id: 'billing', label: 'Billing', sections: ['entities', 'fx', 'fees', 'routing', 'splitting'] },
    { id: 'pricing', label: 'Pricing', sections: ['pricing', 'discounts'] },
    { id: 'users', label: 'Billable users', sections: ['managed'] },
    { id: 'disputes', label: 'Disputes', sections: ['disputes'] },
    { id: 'operations', label: 'Operations', sections: ['cap', 'mdm'/*, 'shipments'*/] }
  ];

  let activeTab = 'overview';

  // Billable users are Enterprise only
  const visibleTabs = () => TABS.filter(tb => tb.id !== 'users' || !isSeatPlan(termsOf(viewing()).tier));
  function renderTabs() {
    if (!visibleTabs().some(tb => tb.id === activeTab)) activeTab = 'overview';
    $('cdTabs').innerHTML = visibleTabs().map(tab => `<button type="button" class="tab-link ${tab.id === activeTab ? 'active' : ''}" data-tab="${tab.id}">${tab.label}</button>`).join('');
  }

  function renderSectionNav() {
    const tab = TABS.find(t => t.id === activeTab);
    const v = viewing();
    const t = termsOf(v);
    const SECTION_TITLES = {
      overview: 'Overview',
      subscription: 'Plan & seats',
      entities: 'Billing entities',
      fx: 'Currency and FX',
      pricing: 'Device pricing',
      fees: 'Lifecycle fees',
      discounts: 'Discounts',
      routing: 'Charge routing',
      managed: 'Billable users',
      disputes: 'Client disputes',
      cap: 'Procurement cap',
      mdm: 'Device management',
      splitting: 'Invoice splitting'
      // shipments: 'Split shipments'
    };
    const links = tab.sections.map(s => `<a href="#sec-${s}">${SECTION_TITLES[s]}</a>`).join('');
    $('cdSectionNav').innerHTML = links;
    $('cdNav').hidden = tab.sections.length === 1;
  }

  function renderSections() {
    const v = viewing();
    const t = termsOf(v);
    const cmp = (v.status === 'draft' || v.status === 'pending') && activeVersion(k) ? contractTerms(k, activeVersion(k).v) : null;
    const allSections = {
      overview: section('overview', 'Overview', overviewHtml(t, cmp)),
      subscription: section('subscription', t.subscription ? `${t.tier} · seat subscription` : `${t.tier} · event-based`, subscriptionHtml(t, cmp), t.subscription ? 'Committed for the term' : ''),
      entities: section('entities', 'Billing entities', entitiesHtml(t, cmp), `${t.entities.length} entit${t.entities.length === 1 ? 'y' : 'ies'} · company structure`),
      fx: section('fx', 'Currency and FX', grid('fx', t, cmp) + '<div class="readonly-note">Invoice currency is set per billing entity. The FX source converts fees priced in another country\'s currency, and spend into the cap currency.</div>'),
      pricing: section('pricing', 'Device pricing', pricingHtml(t, cmp)),
      fees: section('fees', 'Lifecycle fees', feesHtml(t, cmp)),
      discounts: section('discounts', 'Discounts and rate overrides', discountsHtml(t, cmp), 'Time-limited'),
      routing: section('routing', 'Charge routing', routingHtml(t, cmp), 'Which entity pays'),
      managed: section('managed', 'Billable users', managedHtml(t, cmp)),
      disputes: section('disputes', 'Client disputes', disputesHtml(), 'Open and recent'),
      cap: section('cap', 'Procurement cap', capHtml(t, cmp), 'One cap across all entities'),
      mdm: section('mdm', 'Device management', mdmRollupHtml(), 'Ops status · not a contract term'),
      splitting: section('splitting', 'Invoice splitting', grid('splitting', t, cmp))
      // shipments: section('shipments', 'Split shipments', splitShipmentsHtml(), 'Ops setting · not versioned')
    };
    const tab = TABS.find(t => t.id === activeTab);
    $('cdSections').innerHTML = tab.sections.map(s => allSections[s]).join('');
    renderBillableUsers(client.id);
    renderSectionNav();
  }

  function renderHistory() {
    $('cdHistory').innerHTML = k.versions.map(x => `<li class="history-item ${x.v === viewV ? 'current' : ''}">
        <button type="button" class="history-link" data-v="${x.v}">v${x.v} · ${VERSION_LABEL[x.status]}</button>
        <div class="location-dates">${x.effective ? `From ${billingDate(x.effective)} · ` : ''}${escapeHtml(x.note || 'No note yet')}</div>
        ${x.acceptedBy ? `<div class="location-dates">Accepted by ${escapeHtml(x.acceptedBy)} · ${escapeHtml(x.acceptedAt)}</div>` : ''}
      </li>`).join('');
  }

  function switchTab(tab) {
    activeTab = tab;
    renderTabs();
    renderSections();
  }

  function checkHash() {
    const hash = location.hash.slice(1);
    if (hash.startsWith('sec-')) {
      const section = hash.slice(4);
      const tab = TABS.find(t => t.sections.includes(section));
      if (tab && tab.id !== activeTab) switchTab(tab.id);
    }
  }

  const render = () => { renderHeader(); renderTabs(); renderSections(); renderHistory(); checkHash(); };
  const show = v => { viewV = v; history.replaceState(null, '', `?c=${client.id}&v=${v}`); render(); };
  const note = text => { $('cdSaved').textContent = `✓ ${text}`; $('cdSaved').hidden = false; };
  // Re-render after the event finishes: a change fired by blur can't replace the node it came from
  const commit = () => { saveContracts(); setTimeout(() => { const y = window.scrollY; renderSections(); window.scrollTo(0, y); }); };

  $('cdSections').addEventListener('change', e => {
    // if (e.target.id === 'cdSplitShip') {
    //   SLA_SPLIT_DELIVERY[client.id] = e.target.checked;
    //   return note(`Split shipments ${e.target.checked ? 'allowed' : 'off'} for ${client.name}.`);
    // }
    if (!editable()) return;
    const t = viewing().terms;
    const d = e.target.dataset;
    if (d.multi) setPath(t, d.multi, [...$('cdSections').querySelectorAll(`[data-multi="${d.multi}"]:checked`)].map(i => i.value));
    else if (d.fee) {
      const [ev, cc] = d.fee.split('.');
      const v = Math.max(0, Number(e.target.value) || 0);
      if (v === standardFeeVersion(cc).rates[ev]) delete t.feeExceptions[d.fee];
      else t.feeExceptions[d.fee] = v;
    } else if (d.billable) {
      t.offEvents = e.target.checked ? t.offEvents.filter(x => x !== d.billable) : [...t.offEvents, d.billable];
    } else if (d.markup !== undefined) {
      t.pricing.markup[Number(d.markup)].markup = Math.max(-100, Math.min(100, Number(e.target.value) || 0));
    } else if (d.subBlock !== undefined) {
      const b = t.subscription.blocks[Number(d.subBlock)];
      b[d.k] = d.k === 'qty' ? Math.max(1, Math.round(Number(e.target.value) || 1)) : d.k === 'price' ? Math.max(0, Number(e.target.value) || 0) : e.target.value;
    } else if (d.subNext !== undefined) {
      const b = t.subscription.next.blocks[Number(d.subNext)];
      b[d.k] = d.k === 'qty' ? Math.max(1, Math.round(Number(e.target.value) || 1)) : Math.max(0, Number(e.target.value) || 0);
    } else if (d.subAddon) {
      t.subscription.addOns.find(a => a.key === d.subAddon).price = Math.max(0, Number(e.target.value) || 0);
    } else if (d.subAddprice !== undefined) {
      const v = Math.max(0, Number(e.target.value) || 0);
      if (v === subLastPrice(t.subscription)) delete t.subscription.addPrice;
      else t.subscription.addPrice = v;
    } else if (d.subTotal !== undefined) {
      if (e.target.value === '') delete t.subscription.agreedTotal;
      else t.subscription.agreedTotal = Math.max(0, Number(e.target.value) || 0);
    } else if (d.subDevprice !== undefined) {
      const v = Math.max(0, Number(e.target.value) || 0);
      if (v === planListPrice(PLANS[t.tier].deviceUSD || 0, subCurrency(t))) delete t.subscription.devicePrice;
      else t.subscription.devicePrice = v;
    } else if (d.subTerm) {
      t.subscription.term.end = e.target.value;
    } else if (d.subAuto !== undefined) {
      t.subscription.autoRenew = e.target.checked;
    } else if (d.path) {
      const raw = d.kind === 'toggle' ? e.target.checked : d.kind === 'number' ? Math.max(0, Number(e.target.value) || 0) : e.target.value;
      const before = d.path === 'tier' ? { tier: t.tier, subscription: t.subscription ? JSON.parse(JSON.stringify(t.subscription)) : null } : null;
      setPath(t, d.path, raw);
      if (before) {
        subNormalize(t, activeVersion(k) ? contractTerms(k, activeVersion(k).v) : before, client.id);
        note(isSeatPlan(t.tier) ? `${t.tier}: seats and add-ons updated in the draft. Check Plan & seats.` : `${t.tier}: event-based billing. The seat subscription ends at the current term.`);
      }
    } else return;
    commit();
  });

  $('cdSections').addEventListener('click', e => {
    const sb = e.target.closest('[data-so-approve], [data-so-reject], [data-sub-renew]');
    if (sb && sb.dataset.subRenew !== undefined) {
      // Renewal opens a draft with next-term seats prefilled from the current term
      const next = Math.max(...k.versions.map(x => x.v)) + 1;
      const t = contractTerms(k, activeVersion(k).v);
      if (!t.subscription.next) t.subscription.next = subRenewalDraft(t.subscription);
      k.versions.unshift({ v: next, status: 'draft', effective: '', note: '', terms: t, createdBy: 'You' });
      saveContracts();
      note(`Draft v${next} created with renewal terms from ${billingDate(t.subscription.next.term.start)}. Adjust seats, then review and publish for the client admin to accept.`);
      return show(next);
    }
    if (sb) {
      const id = sb.dataset.soApprove || sb.dataset.soReject;
      const reason = sb.dataset.soReject ? (prompt('Reason for rejecting (shown on the joiner)', 'Hire on hold') ?? null) : '';
      if (reason === null) return;
      const o = seatOrderDecide(id, !!sb.dataset.soApprove, reason);
      if (o) note(o.status === 'approved' ? `${o.id} approved by ${o.by}. ${seatOrderLabel(o)} for ${o.name} from ${billingDate(o.decided)}, charged ${fmtAmount(o.cur, o.amount)} once.` : `${o.id} rejected. ${o.name} can’t be onboarded without a seat.`);
      return setTimeout(() => { const y = window.scrollY; renderSections(); window.scrollTo(0, y); });
    }
    if (!editable()) return;
    const t = viewing().terms;
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.reset) { delete t.feeExceptions[b.dataset.reset]; return commit(); }
    if (b.id === 'sbAdd') {
      const qty = Math.round(Number($('sbQty').value));
      const price = Number($('sbPrice').value);
      const from = $('sbFrom').value;
      const sub = t.subscription;
      const err = !(qty > 0) ? 'Enter how many seats to add.' : !(price >= 0) ? 'Enter a price per seat.' : !from || from < sub.term.start || from > sub.term.end ? `Start date must be within the term (${subTermText(sub)}).` : '';
      if (err) { $('sbError').textContent = err; $('sbError').hidden = false; return; }
      sub.blocks.push({ id: subNextBlockId(sub), qty, price, from, note: 'Added seats' });
      note(`${qty} seats added from ${billingDate(from)} at ${fmtAmount(subCurrency(t), price)}. They bill once the client accepts this version.`);
      return commit();
    }
    if (b.dataset.subRm !== undefined) { t.subscription.blocks.splice(Number(b.dataset.subRm), 1); return commit(); }
    if (b.dataset.subAddonOn) { t.subscription.addOns.push({ key: b.dataset.subAddonOn, price: planListPrice(PLAN_ADDONS[b.dataset.subAddonOn].listUSD, subCurrency(t)), from: [firstOfNextMonth(), t.subscription.term.start].sort().pop() }); return commit(); }
    if (b.dataset.subAddonOff) { t.subscription.addOns = t.subscription.addOns.filter(a => a.key !== b.dataset.subAddonOff); return commit(); }
    if (b.dataset.subNextAdd !== undefined) { t.subscription.next = subRenewalDraft(t.subscription); return commit(); }
    if (b.dataset.subNextRm !== undefined) { delete t.subscription.next; return commit(); }
    if (b.dataset.markupRm !== undefined) { t.pricing.markup.splice(Number(b.dataset.markupRm), 1); return commit(); }
    if (b.dataset.routeRm !== undefined) { t.routing.splice(Number(b.dataset.routeRm), 1); return commit(); }
    if (b.dataset.discRm !== undefined) { t.discounts.splice(Number(b.dataset.discRm), 1); return commit(); }
    if (b.id === 'dcAdd') {
      const d = { id: `d${Date.now()}`, kind: $('dcKind').value, event: $('dcEvent').value, cc: $('dcCc').value, value: Number($('dcValue').value), from: $('dcFrom').value, to: $('dcTo').value, note: $('dcNote').value.trim() };
      const err = !(d.value > 0) ? 'Enter a value above zero.' : d.kind === 'percent' && d.value >= 100 ? 'A percentage must be under 100.' : d.kind === 'rate' && (!d.event || !d.cc) ? 'A fixed rate needs one fee and one country (it is in that country\'s currency).' : !d.from ? 'Pick a start date.' : d.to && d.to < d.from ? 'End date is before the start.' : '';
      if (err) { $('dcError').textContent = err; $('dcError').hidden = false; return; }
      t.discounts = [...(t.discounts || []), d];
      return commit();
    }
    if (b.id === 'mkAdd') {
      const [category, tier] = $('mkAddSel').value.split('|');
      t.pricing.markup.push({ category, tier, markup: 0 });
      return commit();
    }
    if (b.id === 'rtAdd') {
      const value = $('rtValue').value.trim();
      if (!value) return $('rtValue').focus();
      t.routing.push({ match: $('rtMatch').value, value, entity: $('rtEntity').value });
      return commit();
    }
  });

  $('cdVersion').addEventListener('change', e => show(Number(e.target.value)));
  $('cdHistory').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) show(Number(b.dataset.v)); });
  $('cdTabs').addEventListener('click', e => {
    const tab = e.target.dataset.tab;
    if (tab) switchTab(tab);
  });

  window.addEventListener('hashchange', checkHash);

  $('cdActions').addEventListener('click', e => {
    const id = e.target.id;
    if (id === 'cdEdit') {
      const next = Math.max(...k.versions.map(x => x.v)) + 1;
      k.versions.unshift({ v: next, status: 'draft', effective: '', note: '', terms: contractTerms(k, activeVersion(k).v), createdBy: 'You' });
      saveContracts();
      note(`Draft v${next} created from v${activeVersion(k).v}. The active contract is unchanged until the client accepts.`);
      show(next);
    } else if (id === 'cdDiscard') {
      k.versions.splice(k.versions.indexOf(viewing()), 1);
      saveContracts();
      note('Draft discarded.');
      show(activeVersion(k).v);
    } else if (id === 'cdDeleteClient') {
      if (!confirm(`Delete ${client.name}? The draft contract and hub assignments are removed.`)) return;
      delete CONTRACTS[client.id];
      delete HUB_ASSIGNMENTS[client.id];
      WH_CLIENTS.splice(WH_CLIENTS.indexOf(client), 1);
      saveContracts();
      saveNewClients();
      location.href = '/pages/clients/list.html';
    } else if (id === 'cdGoPending') show(pendingVersion(k).v);
    else if (id === 'cdGoActive') show(activeVersion(k).v);
  });

  render();
  if (params.get('quick')) note(`${client.name} created with quick setup: ${k.tier}, ${k.terms.subscription.blocks[0].qty} seats, ${billingDate(k.start)} – ${billingDate(k.end)}. Login credentials sent to ${k.adminEmail}. The company is active and ready to use; adjust seats, prices and entities with Edit terms.`);
  if (params.get('created')) note(`${client.name} created with a draft initial contract (v1). Check the terms, then review and send it to ${clientAdminFor(k)}.`);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initClientDetail);
else initClientDetail();
