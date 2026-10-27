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
        <div><div class="detail-label">SLAs</div><div class="detail-value">${exc ? `${exc} client exception${exc === 1 ? '' : 's'}` : 'Standard SLAs'} · <a href="/pages/sla-config/exceptions.html?client=${client.id}" class="link-sm">SLA configuration</a></div></div>
      </div>`;
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
      : `New client · initial contract v1 was sent ${escapeHtml(v.publishedAt || '')} and is waiting for ${escapeHtml(clientAdminFor(k))} to accept. Terms are locked; withdraw it on the contract page to make changes.`) : {
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
    { id: 'billing', label: 'Billing', sections: ['entities', 'fx', 'fees', 'routing', 'splitting'] },
    { id: 'pricing', label: 'Pricing', sections: ['pricing', 'discounts'] },
    { id: 'users', label: 'Billable users', sections: ['managed'] },
    { id: 'disputes', label: 'Disputes', sections: ['disputes'] },
    { id: 'operations', label: 'Operations', sections: ['cap'/*, 'shipments'*/] }
  ];

  let activeTab = 'overview';

  function renderTabs() {
    $('cdTabs').innerHTML = TABS.map(tab => `<button type="button" class="tab-link ${tab.id === activeTab ? 'active' : ''}" data-tab="${tab.id}">${tab.label}</button>`).join('');
  }

  function renderSectionNav() {
    const tab = TABS.find(t => t.id === activeTab);
    const v = viewing();
    const t = termsOf(v);
    const SECTION_TITLES = {
      overview: 'Overview',
      entities: 'Billing entities',
      fx: 'Currency and FX',
      pricing: 'Device pricing',
      fees: 'Lifecycle fees',
      discounts: 'Discounts',
      routing: 'Charge routing',
      managed: 'Billable users',
      disputes: 'Client disputes',
      cap: 'Procurement cap',
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
      entities: section('entities', 'Billing entities', entitiesHtml(t, cmp), `${t.entities.length} entit${t.entities.length === 1 ? 'y' : 'ies'} · company structure`),
      fx: section('fx', 'Currency and FX', grid('fx', t, cmp) + '<div class="readonly-note">Invoice currency is set per billing entity. The FX source converts fees priced in another country\'s currency, and spend into the cap currency.</div>'),
      pricing: section('pricing', 'Device pricing', pricingHtml(t, cmp)),
      fees: section('fees', 'Lifecycle fees', feesHtml(t, cmp)),
      discounts: section('discounts', 'Discounts and rate overrides', discountsHtml(t, cmp), 'Time-limited'),
      routing: section('routing', 'Charge routing', routingHtml(t, cmp), 'Which entity pays'),
      managed: section('managed', 'Billable users', managedHtml(t, cmp)),
      disputes: section('disputes', 'Client disputes', disputesHtml(), 'Open and recent'),
      cap: section('cap', 'Procurement cap', capHtml(t, cmp), 'One cap across all entities'),
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
  const commit = () => { saveContracts(); const y = window.scrollY; renderSections(); window.scrollTo(0, y); };

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
    } else if (d.path) {
      const raw = d.kind === 'toggle' ? e.target.checked : d.kind === 'number' ? Math.max(0, Number(e.target.value) || 0) : e.target.value;
      setPath(t, d.path, raw);
    } else return;
    commit();
  });

  $('cdSections').addEventListener('click', e => {
    if (!editable()) return;
    const t = viewing().terms;
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.reset) { delete t.feeExceptions[b.dataset.reset]; return commit(); }
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
  if (params.get('created')) note(`${client.name} created with a draft initial contract (v1). Check the terms, then review and send it to ${clientAdminFor(k)}.`);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initClientDetail);
else initClientDetail();
