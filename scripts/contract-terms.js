// Contract term fields, display text and version diffs. Shared by the client page and the amendment page.
// Needs hub-data.js and billing-data.js. Markup labels use markup-data.js when loaded.

const billingDate = s => {
  if (!s) return '—';
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const TAX_STATUSES = ['Registered', 'Exempt (resale)', 'Exempt (other)', 'Not registered'];
const IOR_LABEL = { esevel: 'Esevel', client: 'Client' };
const FX_LOCK_LABEL = { milestone: 'Billable milestone (rate on the day the step completes)', checkout: 'Checkout (rate when the client places the order)' };

// Simple contract-wide fields. fmt returns plain text; callers escape it.
const CONTRACT_FIELDS = {
  overview: [
    { path: 'tier', label: 'Plan tier', type: 'select', options: () => PLAN_TIERS },
    { path: 'end', label: 'Term ends', type: 'date', fmt: billingDate }
  ],
  fx: [
    { path: 'fxSource', label: 'FX source', type: 'select', options: () => Object.keys(FX_SOURCES), optLabel: key => FX_SOURCES[key], fmt: v => FX_SOURCES[v] },
    { path: 'fxLock', label: 'Rate locks at', type: 'select', options: () => ['milestone', 'checkout'], optLabel: v => ({ milestone: 'Billable milestone', checkout: 'Checkout' }[v]), fmt: v => FX_LOCK_LABEL[v] }
  ],
  pricing: [
    { path: 'pricing.note', label: 'Pricing notes', type: 'text', wide: true }
  ],
  managed: [
    { path: 'managedUsers.enabled', label: 'Billable users billing', type: 'toggle', fmt: v => (v ? 'Enabled' : 'Off') }
  ],
  cap: [
    { path: 'cap.limit', label: 'Procurement cap', type: 'number', fmt: (v, t) => fmtAmount(t.cap.currency, v, 0) },
    { path: 'cap.currency', label: 'Cap currency', type: 'select', options: () => Object.keys(FX_RATES) },
    { path: 'cap.period', label: 'Cap renewal period', type: 'select', options: () => ['Annual', 'Quarterly', 'Monthly'] },
    { path: 'cap.renewal', label: 'Next cap renewal', type: 'date', fmt: billingDate }
  ],
  splitting: [
    { path: 'splitBy', label: 'Split invoices by', type: 'multi', options: () => Object.keys(INVOICE_SPLITS), optLabel: key => INVOICE_SPLITS[key], fmt: v => (v.length ? v.map(x => INVOICE_SPLITS[x]).join(' · ') : 'One invoice per entity per billing run'), wide: true }
  ]
};

// Per-entity editable fields
const ENTITY_FIELDS = [
  { key: 'currency', label: 'Invoice currency', type: 'select', options: () => Object.keys(FX_RATES) },
  { key: 'settlement', label: 'Accepted settlement', type: 'multi', options: () => Object.keys(FX_RATES), fmt: v => v.join(', ') },
  { key: 'taxStatus', label: 'Tax status', type: 'select', options: () => TAX_STATUSES },
  { key: 'ior', label: 'Importer of record', type: 'select', options: () => Object.keys(IOR_LABEL), optLabel: v => IOR_LABEL[v], fmt: v => IOR_LABEL[v] },
  { key: 'muRate', label: 'Billable user rate', type: 'number', fmt: (v, e) => (v ? `${fmtAmount(e.currency, v)} / user / month` : '—') }
];

const CONTRACT_SECTIONS = {
  overview: 'Overview', subscription: 'Seat subscription', entities: 'Billing entities', fx: 'Currency and FX', pricing: 'Device pricing',
  fees: 'Lifecycle fees', discounts: 'Discounts and rate overrides', routing: 'Charge routing', managed: 'Billable users', cap: 'Procurement cap', splitting: 'Invoice splitting'
};

const termGet = (t, path) => {
  if (path.startsWith('feeExceptions:')) return t.feeExceptions[path.slice(14)];
  return path.split('.').reduce((o, key) => (o == null ? undefined : o[key]), t);
};

function termText(f, t) {
  const v = termGet(t, f.path);
  if (v === undefined || v === '') return '—';
  return f.fmt ? f.fmt(v, t) : String(v);
}

const markupLabel = m => `${m.category}${typeof VOLUME_TIERS !== 'undefined' ? ` · ${VOLUME_TIERS[m.tier].split(' ·')[0]}` : ''}`;
const discountText = d => `${discountLabel(d)} (${billingDate(d.from)} – ${d.to ? billingDate(d.to) : 'open-ended'})`;
const routingLabel = (t, r) => `${r.match === 'po' ? 'PO' : 'Cost centre'} “${r.value}” → ${(entityById(t, r.entity) || {}).name || '—'}`;

// Terms for a version, including plan tier and term end
function contractTerms(k, vNum) {
  const t = cloneTerms(versionTerms(k, vNum));
  if (!('tier' in t)) t.tier = k.tier;
  if (!('end' in t)) t.end = k.end;
  return t;
}

// Every comparable term as a flat row (entity fields, fee exceptions and billable events included)
function contractRows(t) {
  const rows = [];
  const add = (section, label, path, text) => rows.push({ section, label, path, text });
  Object.keys(CONTRACT_SECTIONS).forEach(section => {
    if (section === 'subscription') {
      const sub = t.subscription;
      if (!sub) { add(section, 'Billing model', 'subscription', isSeatPlan(t.tier) ? 'Seat plan without seats (needs a subscription)' : 'Event-based: no seat subscription'); return; }
      const cur = (entityById(t, sub.billTo) || parentEntity(t)).currency;
      add(section, 'Subscription term', 'subscription.term', subTermText(sub));
      add(section, 'Committed seats', 'subscription.blocks', `${sub.blocks.reduce((n, b) => n + b.qty, 0)} seats · ${subBlocksText(sub, cur)}`);
      add(section, 'Add-ons', 'subscription.addOns', subAddonsText(sub, cur));
      add(section, 'Annual total', 'subscription.agreedTotal', PLANS[t.tier] && PLANS[t.tier].free ? 'No charge' : subTotalText(t, cur));
      add(section, 'Additional-seat price', 'subscription.addPrice', subAddPriceText(sub, cur));
      add(section, 'Devices per user', 'subscription.devicePrice', `${subDeviceLimit(t.tier)} per seat · extra ${fmtAmount(cur, subDevicePrice(t))} per device per month, charged pro rata`);
      add(section, 'Extra devices', 'subscription.deviceBlocks', subDevicesText(sub, cur));
      add(section, 'Subscription billed to', 'subscription.billTo', (entityById(t, sub.billTo) || {}).name || '—');
      add(section, 'Renewal', 'subscription.next', subNextText(sub, cur));
      return;
    }
    if (section === 'entities') {
      add(section, 'Billing entities', 'entities.length', t.entities.map(e => e.name).join(' · '));
      t.entities.forEach((e, i) => ENTITY_FIELDS.forEach(f => {
        const v = e[f.key];
        add(section, `${f.label} · ${e.name}`, `entities.${i}.${f.key}`, f.fmt ? f.fmt(v, e) : (f.optLabel ? f.optLabel(v) : String(v)));
      }));
    } else if (section === 'fees') {
      add(section, 'Countries', 'countries', t.countries.map(cc => WH_COUNTRIES[cc][1]).join(', '));
      FEE_EVENTS.forEach(e => {
        add(section, `${e.label} billable`, `offEvents:${e.key}`, isBillable(t, e.key) ? 'Yes' : 'No');
        t.countries.forEach(cc => {
          const f = contractFee(t, e.key, cc);
          add(section, `${e.label} · ${WH_COUNTRIES[cc][1]}`, `feeExceptions:${e.key}.${cc}`, f.custom ? fmtAmount(f.cur, f.base) : `Standard (${fmtAmount(f.cur, f.std)})`);
        });
      });
    } else if (section === 'pricing') {
      CONTRACT_FIELDS.pricing.forEach(f => add(section, f.label, f.path, termText(f, t)));
      add(section, 'Retail price adjustment exceptions', 'pricing.markup', t.pricing.markup.length ? t.pricing.markup.map(m => `${markupLabel(m)} ${m.markup > 0 ? '+' : ''}${m.markup}%`).join(' · ') : 'Catalogue defaults');
    } else if (section === 'discounts') {
      add(section, 'Discounts and rate overrides', 'discounts', (t.discounts || []).length ? t.discounts.map(discountText).join(' · ') : 'None');
    } else if (section === 'routing') {
      add(section, 'Routing overrides', 'routing', t.routing.length ? t.routing.map(r => routingLabel(t, r)).join(' · ') : 'Default only');
    } else {
      CONTRACT_FIELDS[section].forEach(f => add(section, f.label, f.path, termText(f, t)));
    }
  });
  return rows;
}

const rowValue = (t, path) => (path.startsWith('offEvents:') ? !t.offEvents.includes(path.slice(10)) : termGet(t, path));

// Changes from a to b, with values so older versions can be rebuilt later
function contractDiff(a, b) {
  const ra = contractRows(a);
  const rb = contractRows(b);
  const paths = [...new Set([...rb.map(r => r.path), ...ra.map(r => r.path)])];
  return paths.map(path => {
    const x = ra.find(r => r.path === path);
    const y = rb.find(r => r.path === path);
    if (JSON.stringify(rowValue(a, path)) === JSON.stringify(rowValue(b, path))) return null;
    // Billable toggles are stored as the offEvents list, so the reversible change is the whole list
    // The whole subscription is stored on each change so acceptance and rebuilding old versions stay exact
    const store = path.startsWith('subscription') ? { path: 'subscription', fromVal: a.subscription || null, toVal: b.subscription || null }
      : path.startsWith('offEvents:') ? { path: 'offEvents', fromVal: a.offEvents, toVal: b.offEvents }
      : path === 'entities.length' ? { path: 'entities', fromVal: a.entities, toVal: b.entities }
        : { path, fromVal: rowValue(a, path), toVal: rowValue(b, path) };
    return { section: (y || x).section, field: (y || x).label, from: x ? x.text : '—', to: y ? y.text : '—', rowPath: path, ...store };
  }).filter(Boolean);
}

// Version a given version is compared against
function compareBase(k, ver) {
  if (ver.status === 'draft' || ver.status === 'pending') return activeVersion(k);
  return k.versions.filter(x => x.v < ver.v && (x.status === 'active' || x.status === 'superseded')).sort((a, b) => b.v - a.v)[0] || null;
}
