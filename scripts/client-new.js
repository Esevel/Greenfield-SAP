// New client: a step-by-step form that creates the client, its hub per country and a first contract (v1).
// v1 is saved as a draft (edit further on the client page) or sent as a registration link: the company owner registers,
// sets a password and accepts. Free / Support / Secure / Complete are seat subscriptions whose term is the contract term
// (billed yearly in advance); Enterprise has a contract term and is billed per event.
// Needs hub-data.js, billing-data.js, contract-terms.js, billing-settings-data.js and markup-data.js.

(function initClientNew() {
  const root = document.getElementById('cnRoot');
  const $ = id => document.getElementById(id);
  const STEPS = [
    { id: 'company', label: 'Company and owner' },
    { id: 'countries', label: 'Countries and hubs' },
    { id: 'entities', label: 'Billing entities' },
    { id: 'plan', label: 'Plan and subscription' },
    { id: 'pricing', label: 'Pricing and fees' },
    { id: 'billing', label: 'Billing settings' },
    { id: 'review', label: 'Review' }
  ];
  const TERMS = [12, 24, 36];

  const addMonths = (iso, months, dayShift = 0) => {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1 + months, d + dayShift));
    return dt.toISOString().slice(0, 10);
  };
  const initials = name => name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';
  const opt = (v, l, cur) => `<option value="${escapeHtml(v)}"${String(v) === String(cur) ? ' selected' : ''}>${escapeHtml(l)}</option>`;
  const ccLabel = cc => `${WH_COUNTRIES[cc][0]} ${WH_COUNTRIES[cc][1]}`;
  const hubsIn = cc => WAREHOUSES.filter(w => w.type === 'esevel' && w.status === 'Active' && w.country === cc);

  const d = {
    step: 0, seen: 0, errors: {},
    name: '', logo: '', logoEdited: false, tier: 'Secure', start: '2026-11-01', seats: 10, seatPrice: null, total: null, addOns: [], addonPrices: {}, devicePrice: null, autoRenew: true, term: 12, end: '',
    admin: '', adminEmail: '',
    hubs: {},
    entities: [],
    markup: [], pricingNote: '', feeExceptions: {}, offEvents: [], managed: false,
    fxSource: 'ecb', fxLock: 'milestone', splitBy: ['entity'],
    cap: { limit: 100000, currency: '', period: 'Annual', renewal: '' }, capCurEdited: false, capRenewalEdited: false,
    note: 'Initial contract'
  };
  const countries = () => Object.keys(WH_COUNTRIES).filter(cc => cc in d.hubs);
  const endDate = () => (d.term === 'custom' ? d.end : addMonths(d.start, d.term, -1));
  const parent = () => d.entities[0];
  let entSeq = 0;
  const newEntity = cc => ({ id: `e${++entSeq}`, name: '', country: cc, taxId: '', contact: '', parent: d.entities.length ? 'e1' : null, currency: COUNTRY_CURRENCY[cc], settlement: [COUNTRY_CURRENCY[cc]], taxStatus: 'Registered', taxNote: '', ior: 'esevel', muRate: 0 });

  // Keep derived defaults in step: parent entity name, cap currency and first renewal
  function syncDefaults() {
    if (!d.logoEdited) d.logo = initials(d.name);
    const ccs = countries();
    if (!d.entities.length && ccs.length) { d.entities.push(newEntity(ccs[0])); d.entities[0].name = d.name; }
    if (parent() && !d.capCurEdited) d.cap.currency = parent().currency;
    if (!d.capRenewalEdited) d.cap.renewal = addMonths(d.start, { Annual: 12, Quarterly: 3, Monthly: 1 }[d.cap.period]);
  }

  /* ---------- Validation ---------- */

  function validate(step) {
    const e = {};
    if (step === 'company') {
      const n = d.name.trim();
      if (!n) e.name = 'Enter the client name.';
      else if (WH_CLIENTS.some(c => c.name.toLowerCase() === n.toLowerCase())) e.name = `${n} is already a client.`;
      if (!d.logo.trim()) e.logo = 'Enter 1–3 letters.';
      if (!d.admin.trim()) e.admin = 'Who is the company owner?';
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.adminEmail.trim())) e.adminEmail = 'Enter a valid email.';
    }
    if (step === 'countries' && !countries().length) e.countries = 'Choose at least one country.';
    if (step === 'entities') {
      if (!d.entities.length) e.entities = 'Add at least one billing entity.';
      d.entities.forEach((x, i) => {
        if (!x.name.trim()) e[`ent${i}name`] = 'Enter the legal name.';
        if (!countries().includes(x.country)) e[`ent${i}country`] = 'This country is no longer selected.';
        if (!x.settlement.length) e[`ent${i}settlement`] = 'Choose at least one.';
        if (x.contact && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x.contact)) e[`ent${i}contact`] = 'Enter a valid email.';
      });
    }
    if (step === 'plan') {
      if (!d.start) e.start = 'Pick a start date.';
      if (d.term === 'custom' && (!d.end || d.end <= d.start)) e.end = 'The end date must be after the start.';
      if (isSeatPlan(d.tier) && !(Number.isInteger(Number(d.seats)) && Number(d.seats) > 0)) e.seats = 'Enter a whole number of seats.';
    }
    if (step === 'billing') {
      if (!(d.cap.limit > 0)) e.capLimit = 'Enter a cap above zero.';
      if (!d.cap.renewal) e.capRenewal = 'Pick the first renewal date.';
    }
    if (step === 'review' && !d.note.trim()) e.note = 'Add a note for the company owner.';
    return e;
  }
  const err = k => (d.errors[k] ? `<div class="form-error">${escapeHtml(d.errors[k])}</div>` : '');
  const req = '<span class="required">*</span>';

  /* ---------- Contract terms built from the form ---------- */

  function buildTerms() {
    const ccs = countries();
    const fee = {};
    Object.entries(d.feeExceptions).forEach(([k, v]) => { if (ccs.includes(k.split('.')[1])) fee[k] = v; });
    return {
      tier: d.tier, end: endDate(),
      countries: ccs, fxSource: d.fxSource, fxLock: d.fxLock,
      entities: d.entities.map((x, i) => ({ ...x, name: x.name.trim(), parent: i === 0 ? null : x.parent, muRate: managedOn() ? Number(x.muRate) || 0 : 0 })),
      feeExceptions: fee, offEvents: [...d.offEvents],
      pricing: { markup: d.markup.map(m => ({ ...m })), note: d.pricingNote.trim() },
      routing: [], managedUsers: { enabled: managedOn() },
      cap: { ...d.cap }, splitBy: [...d.splitBy], discounts: [],
      ...(isSeatPlan(d.tier) ? { subscription: {
        term: { start: d.start, end: endDate() }, billTo: d.entities[0]?.id || 'e1', autoRenew: d.autoRenew,
        blocks: [{ id: 'b1', qty: Number(d.seats), price: Number(seatPrice()), from: d.start, note: 'Initial commitment' }],
        addOns: d.addOns.filter(key => addonAvailability(d.tier, key) === 'addon').map(key => ({ key, price: addonPrice(key), from: d.start })),
        ...(d.devicePrice != null && !PLANS[d.tier].free ? { devicePrice: d.devicePrice } : {}),
        ...(d.total != null && !PLANS[d.tier].free ? { agreedTotal: d.total } : {})
      } } : {})
    };
  }

  /* ---------- Steps ---------- */

  function companyHtml() {
    return `<div class="cn-grid">
      <div class="form-group cn-wide"><label class="form-label" for="cnName">Client name ${req}</label><input class="form-input" id="cnName" data-f="name" value="${escapeHtml(d.name)}" placeholder="e.g. Orbit Labs">${err('name')}</div>
      <div class="form-group"><label class="form-label" for="cnLogo">Logo initials ${req}</label>
        <div class="cn-logo-row"><div class="client-logo" id="cnLogoPrev">${escapeHtml(d.logo || '?')}</div><input class="form-input" id="cnLogo" data-f="logo" maxlength="3" value="${escapeHtml(d.logo)}"></div>${err('logo')}</div>
      <div class="form-group"><label class="form-label" for="cnAdmin">Company owner (client admin) ${req}</label><input class="form-input" id="cnAdmin" data-f="admin" value="${escapeHtml(d.admin)}" placeholder="Full name">${err('admin')}
        <div class="input-helper">Completes company registration, sets a password and accepts the subscription and later amendments in the company portal.</div></div>
      <div class="form-group"><label class="form-label" for="cnAdminEmail">Owner email ${req}</label><input type="email" class="form-input" id="cnAdminEmail" data-f="adminEmail" value="${escapeHtml(d.adminEmail)}" placeholder="owner@client.com">${err('adminEmail')}<div class="input-helper">The registration link is sent here.</div></div>
    </div>`;
  }

  function countriesHtml() {
    const rows = Object.keys(WH_COUNTRIES).map(cc => {
      const on = cc in d.hubs;
      const hubs = hubsIn(cc);
      return `<tr class="${on ? '' : 'row-muted'}">
        <td><label class="sla-check"><input type="checkbox" data-cc="${cc}" ${on ? 'checked' : ''}> ${ccLabel(cc)}</label></td>
        <td>${on ? `<select class="form-select" data-hub="${cc}" aria-label="Hub in ${WH_COUNTRIES[cc][1]}">${hubs.map(w => opt(w.id, w.name, d.hubs[cc])).join('')}${opt('none', 'No hub · stock stays at client sites', d.hubs[cc])}</select>` : '<span class="text-muted">Not active</span>'}</td>
        <td class="text-muted">${COUNTRY_CURRENCY[cc]} · standard fees from ${escapeHtml(standardFeeVersion(cc).note)}</td>
      </tr>`;
    }).join('');
    return `<p class="text-muted cn-intro">Where the client has employees. Each country gets lifecycle fees in its local currency and, optionally, an Esevel hub for storage and deployment.</p>
      <table class="device-list-table"><thead><tr><th>Country</th><th>Hub</th><th>Pricing</th></tr></thead><tbody>${rows}</tbody></table>
      ${err('countries')}
      <div class="readonly-note">Hubs can be changed later in <a href="/pages/warehouses/assignments.html">Warehouses › Hub assignments</a>. Countries are contract terms and change through an amendment.</div>`;
  }

  function entitiesHtml() {
    const ccs = countries();
    const curOpts = Object.keys(FX_RATES);
    const cards = d.entities.map((x, i) => {
      const nonLocal = x.currency !== COUNTRY_CURRENCY[x.country];
      return `<div class="cn-entity">
        <div class="cn-entity-head"><strong>${escapeHtml(x.name || `Entity ${i + 1}`)}</strong> ${i === 0 ? '<span class="tag tag-parent">Parent</span>' : ''}
          ${i > 0 && !d.entities.some(c => c.parent === x.id) ? `<button type="button" class="btn-text" data-ent-rm="${i}">Remove</button>` : ''}</div>
        <div class="cn-grid cn-grid-3">
          <div class="form-group cn-wide2"><label class="form-label">Legal name ${req}</label><input class="form-input" data-ent="${i}" data-k="name" value="${escapeHtml(x.name)}" placeholder="e.g. Orbit Labs Pte Ltd">${err(`ent${i}name`)}</div>
          <div class="form-group"><label class="form-label">Country</label><select class="form-select" data-ent="${i}" data-k="country">${[...new Set([...ccs, x.country])].map(cc => opt(cc, ccLabel(cc), x.country)).join('')}</select>${err(`ent${i}country`)}</div>
          <div class="form-group"><label class="form-label">Tax ID</label><input class="form-input" data-ent="${i}" data-k="taxId" value="${escapeHtml(x.taxId)}" placeholder="UEN, EIN, VAT…"></div>
          <div class="form-group"><label class="form-label">Billing contact</label><input type="email" class="form-input" data-ent="${i}" data-k="contact" value="${escapeHtml(x.contact)}" placeholder="ap@client.com">${err(`ent${i}contact`)}</div>
          <div class="form-group"><label class="form-label">Parent</label>${i === 0 ? '<div class="detail-value">Top of the company tree</div>' : `<select class="form-select" data-ent="${i}" data-k="parent">${d.entities.filter(o => o.id !== x.id).map(o => opt(o.id, o.name || o.id, x.parent)).join('')}</select>`}</div>
          <div class="form-group"><label class="form-label">Invoice currency</label><select class="form-select" data-ent="${i}" data-k="currency">${curOpts.map(c => opt(c, c, x.currency)).join('')}</select>${nonLocal ? `<div class="input-helper">Billed in ${x.currency}, not local ${COUNTRY_CURRENCY[x.country]}</div>` : ''}</div>
          <div class="form-group"><label class="form-label">Tax status</label><select class="form-select" data-ent="${i}" data-k="taxStatus">${TAX_STATUSES.map(s => opt(s, s, x.taxStatus)).join('')}</select></div>
          <div class="form-group"><label class="form-label">Importer of record</label><select class="form-select" data-ent="${i}" data-k="ior">${Object.entries(IOR_LABEL).map(([k, l]) => opt(k, l, x.ior)).join('')}</select></div>
          <div class="form-group cn-wide"><label class="form-label">Accepted settlement currencies</label><div class="multi-checks">${curOpts.map(c => `<label class="sla-check"><input type="checkbox" data-ent="${i}" data-settle="${c}" ${x.settlement.includes(c) ? 'checked' : ''}> ${c}</label>`).join('')}</div>${err(`ent${i}settlement`)}</div>
          <div class="form-group cn-wide"><label class="form-label">Tax note</label><input class="form-input" data-ent="${i}" data-k="taxNote" value="${escapeHtml(x.taxNote)}" placeholder="e.g. GST registered; resale certificate on file"></div>
        </div>
      </div>`;
    }).join('');
    return `<p class="text-muted cn-intro">Legal entities that receive invoices. Each is invoiced in its own currency. Work is billed to the entity in the work country, otherwise to the parent.</p>
      ${cards}${err('entities')}
      <button type="button" class="btn btn-secondary btn-sm" id="cnEntAdd">+ Add subsidiary</button>
      <div class="readonly-note">Sales tax per country comes from <a href="/pages/settings/billing.html?tab=tax">Settings › Billing › Tax and duties</a>. Routing overrides by cost centre or PO can be added on the client page while v1 is a draft.</div>`;
  }

  function pricingHtml() {
    const ccs = countries();
    const mkRows = d.markup.map((m, i) => {
      const def = markupCurrent(m.category, m.tier);
      return `<tr><td>${m.category}</td><td>${VOLUME_TIERS[m.tier].split(' ·')[0]}</td>
        <td class="num">${def ? `${def.markup > 0 ? '+' : ''}${def.markup}%` : '—'}</td>
        <td class="num"><input type="number" class="form-input mk-input" min="-100" max="100" step="0.5" data-mk="${i}" value="${m.markup}" aria-label="Retail price adjustment"></td>
        <td><button type="button" class="btn-text" data-mk-rm="${i}">Remove</button></td></tr>`;
    }).join('');
    const free = [];
    DEVICE_CATEGORIES.forEach(c => Object.keys(VOLUME_TIERS).forEach(t => { if (!d.markup.some(m => m.category === c && m.tier === t)) free.push([c, t]); }));
    const feeRows = FEE_EVENTS.map(e => {
      const on = !d.offEvents.includes(e.key);
      return `<tr class="${on ? '' : 'row-muted'}">
        <td>${e.label}<div class="stock-sub">${e.unit} · on ${e.trigger.toLowerCase()}</div></td>
        <td><label class="toggle-switch"><input type="checkbox" data-billable="${e.key}" ${on ? 'checked' : ''} aria-label="${e.label} billable"><span class="toggle-slider"></span></label></td>
        ${ccs.map(cc => {
          const std = standardFeeVersion(cc);
          const key = `${e.key}.${cc}`;
          const custom = key in d.feeExceptions;
          return `<td class="num ${custom && on ? 'cell-custom' : ''}"><span class="fee-input"><span class="text-muted">${std.cur}</span><input type="number" class="form-input" min="0" step="${e.key === 'storage' ? '0.01' : '1'}" data-fee="${key}" value="${custom ? d.feeExceptions[key] : std.rates[e.key]}" aria-label="${e.label} fee ${cc}" ${on ? '' : 'disabled'}>${custom ? `<button type="button" class="fee-reset" data-fee-reset="${key}" title="Back to standard ${fmtAmount(std.cur, std.rates[e.key])}">↺</button>` : ''}</span></td>`;
        }).join('')}
      </tr>`;
    }).join('');
    return `<h4 class="cn-sub">Device pricing</h4>
      <p class="text-muted cn-intro">Clients pay vendor retail unless a category and volume tier has a contract adjustment. Negative adjustments are allowed; the price never drops below vendor cost.</p>
      <table class="device-list-table mk-exc"><thead><tr><th>Category</th><th>Tier</th><th class="num">Suggested default</th><th class="num">Contract adjustment</th><th></th></tr></thead>
        <tbody>${mkRows || '<tr><td colspan="5" class="text-muted">No adjustments · this client pays retail.</td></tr>'}</tbody></table>
      ${free.length ? `<div class="inline-add"><select class="form-select" id="cnMkSel">${free.map(([c, t]) => opt(`${c}|${t}`, `${c} · ${VOLUME_TIERS[t].split(' ·')[0]}`)).join('')}</select><button type="button" class="btn btn-secondary btn-sm" id="cnMkAdd">Add adjustment</button></div>` : ''}
      <div class="form-group cn-mt"><label class="form-label" for="cnPricingNote">Pricing notes</label><input class="form-input" id="cnPricingNote" data-f="pricingNote" value="${escapeHtml(d.pricingNote)}" placeholder="e.g. Tier 2 laptop pricing agreed in the proposal"></div>

      <h4 class="cn-sub">Lifecycle fees</h4>
      <p class="text-muted cn-intro">Standard fees from Settings, per country in local currency. Change a value to agree a client exception, or switch an event off.</p>
      <table class="device-list-table fee-grid"><thead><tr><th>Event</th><th>Billable</th>${ccs.map(cc => `<th class="num">${WH_COUNTRIES[cc][0]} ${cc}</th>`).join('')}</tr></thead><tbody>${feeRows}</tbody></table>
      <div class="readonly-note"><span class="legend-custom"></span> Client exception · ${Object.keys(d.feeExceptions).length + d.offEvents.length || 'none, all standard'}. Only exceptions are stored, so later standard changes flow through.</div>

      <div class="readonly-note">Discounts and fixed-rate overrides can be added on the client page while v1 is a draft.</div>`;
  }

  const subCur = () => (d.entities[0] ? d.entities[0].currency : 'USD');
  const seatPrice = () => (PLANS[d.tier].free ? 0 : d.seatPrice ?? planListPrice(PLANS[d.tier].listUSD, subCur()));
  // Billable users are Enterprise only
  const managedOn = () => d.managed && !isSeatPlan(d.tier);
  const addonPrice = key => d.addonPrices[key] ?? planListPrice(PLAN_ADDONS[key].listUSD, subCur());
  const devicePrice = () => d.devicePrice ?? planListPrice(PLANS[d.tier].deviceUSD || 0, subCur());
  const addonMonthly = () => d.addOns.filter(key => addonAvailability(d.tier, key) === 'addon').reduce((n, key) => n + addonPrice(key), 0);
  const calcAnnual = () => Math.round(Number(d.seats) * (seatPrice() + addonMonthly()) * 12 * 100) / 100;

  function planHtml() {
    const seat = isSeatPlan(d.tier);
    const free = !!PLANS[d.tier].free;
    const cur = subCur();
    const head = `<div class="cn-grid">
        <div class="form-group cn-wide"><label class="form-label" for="cnTier">Plan</label><select class="form-select" id="cnTier" data-f="tier">${PLAN_TIERS.map(t => opt(t, `${t}${PLANS[t].free ? ' · no charge' : PLANS[t].seat ? ` · USD ${PLANS[t].listUSD}/seat/month` : ' · custom, per event'}`, d.tier)).join('')}</select>
          <div class="input-helper">${escapeHtml(PLANS[d.tier].blurb)}. <a href="/pages/settings/billing.html?tab=plans" target="_blank" class="link-sm">Compare plans</a></div></div>
        <div class="form-group"><label class="form-label" for="cnStart">Start date ${req}</label><input type="date" class="form-input" id="cnStart" data-f="start" value="${d.start}">${err('start')}</div>
        <div class="form-group"><label class="form-label" for="cnTerm">${seat ? 'Subscription term' : 'Contract term'}</label><select class="form-select" id="cnTerm" data-f="term">${TERMS.map(m => opt(m, `${m} months`, d.term)).join('')}${opt('custom', 'Custom end date', d.term)}</select>
          ${d.term === 'custom' ? `<input type="date" class="form-input cn-mt" id="cnEnd" data-f="end" value="${d.end}" aria-label="${seat ? 'Expires' : 'Ends'}">${err('end')}` : `<div class="input-helper">${seat ? 'Expires' : 'Ends'} ${d.start ? billingDate(endDate()) : '—'}</div>`}</div>
        ${seat ? `<div class="form-group cn-wide"><label class="toggle-switch-label"><span class="toggle-switch"><input type="checkbox" id="cnAutoRenew" ${d.autoRenew ? 'checked' : ''}><span class="toggle-slider"></span></span><span>Auto-renew for 12 months on the same seats</span></label>
          <div class="input-helper">${d.autoRenew ? 'Renews automatically unless renewal terms are agreed first.' : `Flagged as renewal due ${SUB_RENEW_WARN_DAYS} days before expiry. ${free ? 'Free plans are restricted on the expiry date if not renewed.' : `Paid plans get a ${SUB_GRACE_DAYS}-day grace period after expiry, then access is restricted.`}`}</div></div>` : ''}
      </div>`;
    if (!seat) {
      return `${head}
        <h4 class="cn-sub">Billing model</h4><div class="sub-event-model"><strong>Enterprise · event-based.</strong> No seat subscription. The client is billed for lifecycle events (next step), device sales and, optionally, billable users.</div>
        <h4 class="cn-sub">Billable users</h4>
        <label class="toggle-switch-label"><span class="toggle-switch"><input type="checkbox" id="cnManaged" ${d.managed ? 'checked' : ''}><span class="toggle-slider"></span></span><span>Bill a monthly rate per user holding an Assigned laptop</span></label>
        ${d.managed ? `<table class="device-list-table cn-mt"><thead><tr><th>Billing entity</th><th class="num">Rate / user / month</th></tr></thead><tbody>${d.entities.map((x, i) => `<tr><td>${escapeHtml(x.name || `Entity ${i + 1}`)}</td><td class="num"><span class="fee-input"><span class="text-muted">${x.currency}</span><input type="number" class="form-input" min="0" step="0.5" data-mu="${i}" value="${x.muRate}" aria-label="Rate for ${escapeHtml(x.name)}"></span></td></tr>`).join('')}</tbody></table>` : ''}
        <div class="readonly-note">Billable users are only available on Enterprise.</div>`;
    }
    const addonRows = Object.entries(PLAN_ADDONS).map(([key, a]) => {
      const av = addonAvailability(d.tier, key);
      const on = d.addOns.includes(key);
      return `<tr class="${av === 'addon' && !on ? 'row-muted' : ''}"><td>${av === 'addon' ? `<label class="sla-check"><input type="checkbox" data-addon="${key}" ${on ? 'checked' : ''}> ${a.label}</label>` : a.label}</td>
        <td class="num">${av === 'included' ? '<span class="tag tag-hub">Included</span>' : !av ? '<span class="text-muted">Not available</span>' : free ? '' : `<span class="fee-input"><span class="text-muted">${cur}</span><input type="number" class="form-input" min="0" step="0.5" data-addon-price="${key}" value="${addonPrice(key)}" aria-label="${a.label} price" ${on ? '' : 'disabled'}></span>`}</td></tr>`;
    }).join('');
    const dev = PLANS[d.tier].devices;
    return `${head}
      <h4 class="cn-sub">Seats</h4>
      <div class="cn-grid">
        <div class="form-group"><label class="form-label" for="cnSeats">Seats ${req}</label><input type="number" class="form-input" id="cnSeats" min="1" step="1" data-sub="seats" value="${d.seats}">${err('seats')}<div class="input-helper">One per user. Can be added during the term, not reduced until renewal.</div></div>
        ${free ? '<div class="form-group"><span class="form-label">Price per seat</span><div class="detail-value">No charge</div><div class="input-helper">More seats are added automatically when users join, without an order.</div></div>' : `<div class="form-group"><label class="form-label" for="cnSeatPrice">Price per seat / month</label><span class="fee-input"><span class="text-muted">${cur}</span><input type="number" class="form-input" id="cnSeatPrice" min="0" step="0.5" data-sub="seatPrice" value="${seatPrice()}"></span><div class="input-helper">List USD ${PLANS[d.tier].listUSD} ≈ ${fmtAmount(cur, planListPrice(PLANS[d.tier].listUSD, cur))}, in the parent entity's currency (${cur}). Also the price of seats ordered mid-term.</div></div>`}
      </div>
      <h4 class="cn-sub">Add-ons</h4>
      <table class="device-list-table"><thead><tr><th>Add-on</th><th class="num">${free ? '' : 'Price / seat / month'}</th></tr></thead><tbody>${addonRows}</tbody></table>
      <h4 class="cn-sub">Devices per user</h4>
      <div class="cn-grid">
        <div class="form-group"><span class="form-label">Included per seat</span><div class="detail-value">${dev} device${dev === 1 ? '' : 's'} <span class="text-muted">· laptops and peripherals</span></div></div>
        ${free ? '<div class="form-group"><span class="form-label">Extra devices</span><div class="detail-value">No charge</div></div>' : `<div class="form-group"><label class="form-label" for="cnDevPrice">Extra device / month</label><span class="fee-input"><span class="text-muted">${cur}</span><input type="number" class="form-input" id="cnDevPrice" min="0" step="0.5" data-sub="devicePrice" value="${devicePrice()}"></span><div class="input-helper">Users above the limit need an upgrade order, charged pro rata like seats.</div></div>`}
      </div>
      ${free ? `<div class="readonly-note">Free plan: ${d.seats} seats at no charge. The subscription still needs renewing; access is restricted for the client's domain if it isn't.</div>` : `<h4 class="cn-sub">Annual total</h4>
      <div class="cn-grid">
        <div class="form-group"><span class="form-label">Calculated</span><div class="detail-value">${d.seats} × ${fmtAmount(cur, seatPrice() + addonMonthly())} × 12 = <strong>${fmtAmount(cur, calcAnnual())}</strong></div><div class="input-helper">Seats${addonMonthly() ? ' and add-ons' : ''}, per subscription year</div></div>
        <div class="form-group"><label class="form-label" for="cnTotal">Agreed total (optional)</label><span class="fee-input"><span class="text-muted">${cur}</span><input type="number" class="form-input" id="cnTotal" min="0" step="1" data-sub="total" value="${d.total ?? ''}" placeholder="${calcAnnual()}"></span><div class="input-helper">Leave blank to bill the calculated amount.</div></div>
      </div>
      <div class="readonly-note">Billed in advance at the start of each subscription year: <strong>${fmtAmount(cur, d.total ?? calcAnnual())}</strong>${d.total != null ? ' (agreed)' : ''}, plus lifecycle fees and device sales. New users beyond these seats, or extra devices, need an order approved by the company owner, charged once pro rata for the rest of the subscription year.</div>`}`;
  }

  function billingHtml() {
    const curs = Object.keys(FX_RATES);
    return `<h4 class="cn-sub">Currency and FX</h4>
      <div class="cn-grid">
        <div class="form-group"><label class="form-label" for="cnFx">FX source</label><select class="form-select" id="cnFx" data-f="fxSource">${Object.entries(FX_SOURCES).map(([k, l]) => opt(k, l, d.fxSource)).join('')}</select></div>
        <div class="form-group"><label class="form-label" for="cnFxLock">Rate locks at</label><select class="form-select" id="cnFxLock" data-f="fxLock">${Object.entries(FX_LOCK_LABEL).map(([k, l]) => opt(k, l, d.fxLock)).join('')}</select></div>
      </div>
      <h4 class="cn-sub">Invoice splitting</h4>
      <div class="multi-checks">${Object.entries(INVOICE_SPLITS).map(([k, l]) => `<label class="sla-check"><input type="checkbox" data-split="${k}" ${d.splitBy.includes(k) ? 'checked' : ''}> ${l}</label>`).join('')}</div>
      <div class="input-helper">${d.splitBy.length ? '' : 'None ticked: one invoice per entity per billing run.'}</div>
      <h4 class="cn-sub">Procurement cap</h4>
      <div class="cn-grid">
        <div class="form-group"><label class="form-label" for="cnCapLimit">Cap ${req}</label><input type="number" class="form-input" id="cnCapLimit" min="0" step="1000" data-cap="limit" value="${d.cap.limit}">${err('capLimit')}</div>
        <div class="form-group"><label class="form-label" for="cnCapCur">Cap currency</label><select class="form-select" id="cnCapCur" data-cap="currency">${curs.map(c => opt(c, c, d.cap.currency)).join('')}</select><div class="input-helper">Spend in other currencies converts at the FX source.</div></div>
        <div class="form-group"><label class="form-label" for="cnCapPeriod">Renewal period</label><select class="form-select" id="cnCapPeriod" data-cap="period">${['Annual', 'Quarterly', 'Monthly'].map(p => opt(p, p, d.cap.period)).join('')}</select></div>
        <div class="form-group"><label class="form-label" for="cnCapRenewal">First renewal ${req}</label><input type="date" class="form-input" id="cnCapRenewal" data-cap="renewal" value="${d.cap.renewal}">${err('capRenewal')}</div>
      </div>
      <div class="readonly-note">One cap across all entities, counting device orders. Orders that would go over it need client approval.</div>`;
  }

  function reviewHtml() {
    const t = buildTerms();
    let last = '';
    // Seat plans don't have billable users, so their rows are left out
    const seat = isSeatPlan(d.tier);
    const rows = contractRows(t).filter(r => (!r.path.startsWith('feeExceptions:') || r.text.indexOf('Standard') !== 0) && !(seat && (r.section === 'managed' || r.path.endsWith('.muRate')))).map(r => {
      const head = r.section !== last ? `<tr class="compare-section"><td colspan="2">${CONTRACT_SECTIONS[r.section]}</td></tr>` : '';
      last = r.section;
      return `${head}<tr><td>${escapeHtml(r.label)}</td><td>${escapeHtml(r.text)}</td></tr>`;
    }).join('');
    const hubs = countries().map(cc => `${ccLabel(cc)} → ${d.hubs[cc] === 'none' ? 'no hub (client sites)' : escapeHtml(WAREHOUSES.find(w => w.id === d.hubs[cc]).name)}`).join(' · ');
    return `<div class="cn-review-head">
        <div class="client-cell"><div class="client-logo">${escapeHtml(d.logo)}</div><div><strong>${escapeHtml(d.name)}</strong><div class="stock-sub">${d.tier} · ${billingDate(d.start)} – ${billingDate(endDate())}${isSeatPlan(d.tier) ? (d.autoRenew ? ', auto-renews' : ', no auto-renew') : ''} · owner ${escapeHtml(d.admin)} (${escapeHtml(d.adminEmail)})</div></div></div>
        <div class="stock-sub cn-mt">Hubs: ${hubs}</div>
      </div>
      <table class="table doc-table compare-table cn-mt"><thead><tr><th>Term</th><th>v1 (initial contract)</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="readonly-note">Fees not listed are at the Settings standard.</div>
      <div class="form-group cn-mt"><label class="form-label" for="cnNote">Note to company owner ${req}</label><textarea class="form-textarea" id="cnNote" data-f="note" rows="2">${escapeHtml(d.note)}</textarea>${err('note')}</div>
      <div class="readonly-note"><strong>Save as draft</strong> keeps v1 editable on the client page (only staff can see it). <strong>Send registration link</strong> locks the terms and emails ${escapeHtml(d.admin || 'the company owner')} a link to complete registration and set a password, then accept in their portal. The company becomes active, and can be billed and order, once they accept.</div>`;
  }

  /* ---------- Layout ---------- */

  function asideHtml() {
    const ccs = countries();
    const exc = Object.keys(d.feeExceptions).filter(k => ccs.includes(k.split('.')[1])).length + d.offEvents.length;
    const li = (l, v) => `<li><span>${l}</span><span>${v}</span></li>`;
    // Only show lines for steps the user has reached, so form defaults don't look like entered terms
    const seen = id => d.seen >= STEPS.findIndex(s => s.id === id);
    const lines = [
      seen('plan') ? [
        li('Plan', d.tier),
        isSeatPlan(d.tier) ? li('Seats', PLANS[d.tier].free ? `${d.seats} · no charge` : `${d.seats} × ${fmtAmount(subCur(), seatPrice())} / month`) : li('Billing', 'Per event'),
        isSeatPlan(d.tier) && !PLANS[d.tier].free ? li('Annual fee', `${fmtAmount(subCur(), d.total ?? calcAnnual())}${d.total != null ? ' (agreed)' : ''}`) : '',
        li(isSeatPlan(d.tier) ? 'Subscription' : 'Term', d.start ? `${billingDate(d.start)} – ${billingDate(endDate())}` : '—'),
        isSeatPlan(d.tier) ? li('Auto-renew', d.autoRenew ? 'On' : 'Off') : ''
      ].join('') : '',
      seen('countries') ? li('Countries', ccs.length ? ccs.map(cc => WH_COUNTRIES[cc][0]).join(' ') : '—') : '',
      seen('entities') ? li('Billing entities', d.entities.length || '—') + li('Invoice currencies', [...new Set(d.entities.map(x => x.currency))].join(' · ') || '—') : '',
      seen('pricing') ? [
        li('Retail adjustments', d.markup.length || 'None'),
        li('Fee exceptions', exc || 'None'),
        isSeatPlan(d.tier) ? '' : li('Billable users', d.managed ? 'On' : 'Off')
      ].join('') : '',
      seen('billing') ? li('Procurement cap', d.cap.limit > 0 && d.cap.currency ? fmtAmount(d.cap.currency, Number(d.cap.limit), 0) : '—') : ''
    ].join('');
    return `<section class="card"><div class="card-header"><h3 class="card-title">Contract summary</h3></div><div class="card-body">
      <div class="client-cell cn-mb"><div class="client-logo">${escapeHtml(d.logo || '?')}</div><strong>${escapeHtml(d.name || 'New client')}</strong></div>
      ${lines ? `<ul class="summary-lines">${lines}</ul>` : '<div class="text-muted">Terms appear here as you complete each step.</div>'}
      <div class="readonly-note">Created as a pending subscription (contract v1). Nothing is billed until the owner registers and accepts.</div>
    </div></section>`;
  }

  function render() {
    syncDefaults();
    const s = STEPS[d.step];
    const body = { company: companyHtml, countries: countriesHtml, entities: entitiesHtml, plan: planHtml, pricing: pricingHtml, billing: billingHtml, review: reviewHtml }[s.id]();
    const last = d.step === STEPS.length - 1;
    root.innerHTML = `<ol class="cn-steps">${STEPS.map((x, i) => `<li class="cn-step ${i === d.step ? 'active' : ''} ${i < d.step || i <= d.seen ? 'done' : ''}">
        <button type="button" data-goto="${i}" ${i <= d.seen ? '' : 'disabled'}><span class="cn-step-num">${i < d.step ? '✓' : i + 1}</span>${x.label}</button></li>`).join('')}</ol>
      <div class="cn-layout">
        <div>
          <section class="card"><div class="card-header"><h3 class="card-title">${d.step + 1}. ${s.label}</h3><span class="text-muted">Step ${d.step + 1} of ${STEPS.length}</span></div>
            <div class="card-body">${body}</div>
            <div class="cn-footer">
              <a href="/pages/clients/list.html" class="btn-text">Cancel</a>
              <span class="cn-footer-right">
                ${d.step ? '<button type="button" class="btn btn-secondary" id="cnBack">Back</button>' : ''}
                ${last ? '<button type="button" class="btn btn-secondary" id="cnDraft">Save as draft</button><button type="button" class="btn btn-primary" id="cnSend">Send registration link</button>' : '<button type="button" class="btn btn-primary" id="cnNext">Continue</button>'}
              </span>
            </div>
          </section>
        </div>
        <aside class="cn-aside" id="cnAside">${asideHtml()}</aside>
      </div>`;
  }
  function showErrors() {
    render();
    const firstErr = root.querySelector('.form-error');
    if (firstErr) firstErr.closest('.form-group, .card-body').scrollIntoView({ block: 'center' });
  }
  const refreshAside = () => { syncDefaults(); $('cnAside').innerHTML = asideHtml(); };
  const later = () => setTimeout(render);

  function go(step) {
    const cur = STEPS[d.step].id;
    if (step > d.step) {
      for (let i = d.step; i < step; i++) {
        d.errors = validate(STEPS[i].id);
        if (Object.keys(d.errors).length) { d.step = i; return showErrors(); }
      }
    } else d.errors = {};
    if (cur !== STEPS[step].id) d.errors = {};
    d.step = step;
    d.seen = Math.max(d.seen, step);
    render();
    window.scrollTo(0, 0);
  }

  function create(send) {
    for (let i = 0; i < STEPS.length; i++) {
      d.errors = validate(STEPS[i].id);
      if (Object.keys(d.errors).length) { d.step = i; return showErrors(); }
    }
    const base = d.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 16) || 'client';
    let id = base;
    for (let n = 2; WH_CLIENTS.some(c => c.id === id) || CONTRACTS[id]; n++) id = `${base}${n}`;
    const terms = buildTerms();
    const v1 = { v: 1, status: send ? 'pending' : 'draft', effective: d.start, note: d.note.trim(), terms, changes: [], createdBy: 'You',
      ...(send ? { publishedBy: 'You', publishedAt: '2026-10-16 16:40 SGT' } : {}) };
    WH_CLIENTS.push({ id, name: d.name.trim(), logo: d.logo.trim().toUpperCase(), isNew: true });
    HUB_ASSIGNMENTS[id] = Object.fromEntries(countries().map(cc => [cc, d.hubs[cc]]));
    CONTRACTS[id] = { tier: d.tier, start: d.start, end: endDate(), status: 'onboarding', admin: d.admin.trim(), adminEmail: d.adminEmail.trim(), setup: 'full', ...(send ? { linkSentAt: '2026-10-16 16:40 SGT' } : {}), terms, versions: [v1] };
    CAP_SPEND[id] = { byEntity: {}, orders: [] };
    if (typeof SLA_CLIENT_VERSIONS !== 'undefined') SLA_CLIENT_VERSIONS[id] = { version: 1, date: 'Today' };
    saveNewClients();
    saveContracts();
    location.href = send ? `/pages/clients/amendment.html?c=${id}&v=1&created=1` : `/pages/clients/detail.html?c=${id}&v=1&created=1`;
  }

  /* ---------- Events ---------- */

  root.addEventListener('input', e => {
    const el = e.target;
    const ds = el.dataset;
    if (ds.f && el.type !== 'checkbox') {
      d[ds.f] = el.value;
      if (ds.f === 'logo') { d.logoEdited = true; $('cnLogoPrev').textContent = el.value || '?'; }
      if (ds.f === 'name' && !d.logoEdited && $('cnLogoPrev')) { $('cnLogoPrev').textContent = initials(el.value); $('cnLogo').value = initials(el.value); }
      if (ds.f === 'term') d.term = el.value === 'custom' ? 'custom' : Number(el.value);
      if (ds.f === 'name' && d.entities.length === 1 && (!d.entities[0].name || d.entities[0].name === d._lastName)) d.entities[0].name = el.value;
      d._lastName = d.name;
    } else if (ds.ent !== undefined && ds.k) {
      const x = d.entities[Number(ds.ent)];
      x[ds.k] = el.value;
      if (ds.k === 'country') { x.currency = COUNTRY_CURRENCY[el.value]; x.settlement = [x.currency]; }
    } else if (ds.fee) {
      const [ev, cc] = ds.fee.split('.');
      const v = Math.max(0, Number(el.value) || 0);
      if (v === standardFeeVersion(cc).rates[ev]) delete d.feeExceptions[ds.fee];
      else d.feeExceptions[ds.fee] = v;
      el.closest('td').classList.toggle('cell-custom', ds.fee in d.feeExceptions);
    } else if (ds.mk !== undefined) {
      d.markup[Number(ds.mk)].markup = Math.max(-100, Math.min(100, Number(el.value) || 0));
    } else if (ds.mu !== undefined) {
      d.entities[Number(ds.mu)].muRate = Math.max(0, Number(el.value) || 0);
    } else if (ds.sub) {
      d[ds.sub] = ds.sub === 'seats' ? Math.round(Number(el.value) || 0) : ds.sub === 'seatPrice' || ds.sub === 'devicePrice' ? Math.max(0, Number(el.value) || 0) : ds.sub === 'total' ? (el.value === '' ? null : Math.max(0, Number(el.value) || 0)) : el.value;
    } else if (ds.addonPrice) {
      d.addonPrices[ds.addonPrice] = Math.max(0, Number(el.value) || 0);
    } else if (ds.cap) {
      d.cap[ds.cap] = ds.cap === 'limit' ? Number(el.value) : el.value;
      if (ds.cap === 'currency') d.capCurEdited = true;
      if (ds.cap === 'renewal') d.capRenewalEdited = true;
    }
    if (el.tagName !== 'SELECT' && el.type !== 'checkbox' && el.type !== 'date') refreshAside();
  });

  root.addEventListener('change', e => {
    const el = e.target;
    const ds = el.dataset;
    if (ds.cc) {
      if (el.checked) { const h = hubsIn(ds.cc); d.hubs[ds.cc] = h.length ? h[0].id : 'none'; } else delete d.hubs[ds.cc];
    } else if (ds.hub) d.hubs[ds.hub] = el.value === 'none' ? 'none' : Number(el.value);
    else if (ds.settle) {
      const x = d.entities[Number(ds.ent)];
      x.settlement = el.checked ? [...x.settlement, ds.settle] : x.settlement.filter(c => c !== ds.settle);
    } else if (ds.billable) d.offEvents = el.checked ? d.offEvents.filter(k => k !== ds.billable) : [...d.offEvents, ds.billable];
    else if (ds.split) d.splitBy = el.checked ? [...d.splitBy, ds.split] : d.splitBy.filter(k => k !== ds.split);
    else if (el.id === 'cnManaged') d.managed = el.checked;
    else if (el.id === 'cnAutoRenew') d.autoRenew = el.checked;
    else if (ds.addonPrice) later();
    else if (ds.addon) d.addOns = el.checked ? [...d.addOns, ds.addon] : d.addOns.filter(x => x !== ds.addon);
    else if (ds.f === 'tier') { d.seatPrice = null; d.devicePrice = null; d.addOns = d.addOns.filter(key => addonAvailability(d.tier, key) === 'addon'); }
    else if (ds.sub === 'total') { d.total = el.value === '' ? null : Math.max(0, Number(el.value) || 0); later(); }
    else if (ds.sub === 'seatPrice' || ds.sub === 'seats' || ds.sub === 'devicePrice') later();
    else if (ds.ent !== undefined && ds.k === 'currency' && !d.entities[Number(ds.ent)].settlement.includes(el.value)) d.entities[Number(ds.ent)].settlement.push(el.value);
    if (el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'date') later();
  });

  root.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.goto !== undefined) return go(Number(b.dataset.goto));
    if (b.id === 'cnNext') return go(d.step + 1);
    if (b.id === 'cnBack') return go(d.step - 1);
    if (b.id === 'cnDraft') return create(false);
    if (b.id === 'cnSend') return create(true);
    if (b.id === 'cnEntAdd') {
      const ccs = countries();
      const used = new Set(d.entities.map(x => x.country));
      d.entities.push(newEntity(ccs.find(cc => !used.has(cc)) || ccs[0]));
      return render();
    }
    if (b.dataset.entRm !== undefined) { d.entities.splice(Number(b.dataset.entRm), 1); return render(); }
    if (b.id === 'cnMkAdd') {
      const [category, tier] = $('cnMkSel').value.split('|');
      const def = markupCurrent(category, tier);
      d.markup.push({ category, tier, markup: def ? def.markup : 0 });
      return render();
    }
    if (b.dataset.mkRm !== undefined) { d.markup.splice(Number(b.dataset.mkRm), 1); return render(); }
    if (b.dataset.feeReset) { delete d.feeExceptions[b.dataset.feeReset]; return render(); }
  });

  render();
})();
