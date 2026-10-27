// Shared SLA data: types, milestones, country defaults and per-client overrides.
// Each milestone target is measured from the previous milestone; end-to-end is the sum.

const SLA_UNITS = { h: { label: 'hours', short: 'h', max: 720 }, d: { label: 'business days', short: 'd', max: 90 } };

const ms = (key, label, unit, flags = {}) => ({ key, label, unit, ...flags });

// Delivery route, chosen at checkout. Direct routes skip the hub steps; the vendor delivery is the final delivery.
const SLA_ROUTES = {
  hub: { label: 'Via Esevel hub', short: 'Via hub' },
  site: { label: 'Direct to client site', short: 'To client site' },
  employee: { label: 'Direct to employee', short: 'To employee' }
};
const HUB_ONLY = { hubOnly: true };

// Purchase orders (Regular, Rush, Bulk, Pre-order): fulfilment stages measured in business hours of the order country.
// Received at hub and QC & dispatch only apply when the vendor ships to an Esevel hub.
const ORDER_MILESTONES = () => [
  ms('submitted', 'Submitted to vendor', 'h'),
  ms('confirmed', 'Confirmed by vendor', 'h'),
  ms('payment', 'Payment confirmed', 'h'),
  ms('awb', 'Shipping info (AWB)', 'h'),
  ms('received', 'Received at hub', 'h', HUB_ONLY),
  ms('qc', 'QC & dispatch', 'h', HUB_ONLY),
  ms('out', 'Out for delivery', 'h'),
  ms('delivered', 'Delivered', 'h')
];

const SLA_TYPES = [
  { key: 'regular', group: 'order', name: 'Regular', note: 'Buy new · created to delivered, in business hours', bizHours: true, milestones: ORDER_MILESTONES() },
  { key: 'rush', group: 'order', name: 'Rush', note: 'Buy new with priority handling', bizHours: true, milestones: ORDER_MILESTONES() },
  { key: 'bulk', group: 'order', name: 'Bulk', note: 'Buy new · 20+ units in one order', bizHours: true, milestones: ORDER_MILESTONES() },
  { key: 'preorder', group: 'order', name: 'Pre-order', note: 'Clock starts at the vendor’s confirmed stock date', bizHours: true, milestones: ORDER_MILESTONES() },
  { key: 'stock', group: 'order', name: 'Deploy from stock', note: 'From the client’s assigned hub',
    milestones: [ms('reserve', 'Reserve', 'h'), ms('prep', 'Prep & reimage', 'd'), ms('dispatch', 'Dispatch', 'd'), ms('delivered', 'Delivered', 'd')] },
  { key: 'onboarding', group: 'service', name: 'Onboarding', note: 'New-hire kit to a working setup',
    milestones: [ms('initiated', 'Initiated', 'd'), ms('procured', 'Procured', 'd', { perLine: true }), ms('imaged', 'Imaged / Provisioned', 'd', HUB_ONLY), ms('dispatched', 'Dispatched', 'd', HUB_ONLY), ms('delivered', 'Delivered', 'd', HUB_ONLY), ms('setup', 'Setup confirmed', 'd')] },
  { key: 'offboarding', group: 'service', name: 'Offboarding', note: 'Leaver devices collected, wiped and dispositioned',
    milestones: [ms('scheduled', 'Pickup scheduled', 'd'), ms('collected', 'Collected', 'd'), ms('received', 'Received', 'd'), ms('wiped', 'Wiped', 'd'), ms('disposition', 'Disposition done', 'd')] },
  { key: 'repair', group: 'service', name: 'Repair', note: 'Faulty device back in the employee’s hands',
    milestones: [ms('response', 'Response', 'h'), ms('triage', 'Triage', 'd'), ms('repair', 'Repair / loaner sent', 'd'), ms('returned', 'Returned', 'd')] },
  { key: 'redeploy', group: 'service', name: 'Redeployment', note: 'Client device sent to a new user',
    milestones: [ms('collection', 'Collection', 'd', { conditional: 'Skipped when the device is already in a hub' }), ms('refurbish', 'Refurbish', 'd'), ms('repackage', 'Repackage', 'd'), ms('dispatched', 'Dispatched', 'd')] },
  { key: 'storage', group: 'service', name: 'Storage', note: 'Client devices collected into Esevel storage',
    milestones: [ms('collection', 'Collection', 'd'), ms('received', 'Received at hub', 'd'), ms('stored', 'Stored', 'd')] },
  { key: 'disposal', group: 'service', name: 'Disposal', note: 'Secure wipe and certified disposal',
    milestones: [ms('collection', 'Collection', 'd', { conditional: 'Skipped when the device is already in a hub' }), ms('wiped', 'Data wipe', 'd'), ms('disposed', 'Disposed & certificate', 'd')] },
  { key: 'support', group: 'service', name: 'Support', note: 'Helpdesk tickets',
    milestones: [ms('response', 'Response', 'h'), ms('resolution', 'Resolution', 'h')] }
];

const SLA_BASE = {
  regular: [9, 9, 9, 18, 36, 9, 18, 9],
  rush: [4, 4, 4, 9, 18, 9, 9, 9],
  bulk: [18, 18, 9, 27, 54, 18, 27, 9],
  preorder: [9, 9, 9, 18, 36, 9, 18, 9],
  stock: [4, 1, 1, 2],
  onboarding: [2, 3, 1, 1, 2, 1],
  offboarding: [2, 3, 3, 2, 5],
  repair: [4, 2, 5, 2],
  redeploy: [4, 2, 1, 1],
  storage: [4, 1, 1],
  disposal: [4, 3, 5],
  support: [2, 16]
};

// Extra business days per country on courier and inbound milestones
const SLA_COUNTRY_ADJ = {
  SG: {},
  MY: { delivered: 1, collected: 1 },
  AU: { received: 1, delivered: 1, collected: 1 },
  US: { received: 1, delivered: 1, collected: 1 },
  GB: { po: 1, received: 2, delivered: 1, collected: 1, collection: 1 }
};

// Extra business hours per country on order stages (longer transit and customs)
const SLA_ORDER_ADJ_H = {
  SG: {},
  MY: { out: 9 },
  AU: { awb: 9, out: 9 },
  US: { awb: 9, out: 9 },
  GB: { submitted: 9, awb: 18, out: 9 }
};

const SLA_DEFAULTS = {};
SLA_TYPES.forEach(t => {
  SLA_DEFAULTS[t.key] = {};
  Object.keys(WH_COUNTRIES).forEach(cc => {
    SLA_DEFAULTS[t.key][cc] = SLA_BASE[t.key].map((v, i) => {
      const m = t.milestones[i];
      if (v === null) return v;
      if (t.bizHours) return v + (SLA_ORDER_ADJ_H[cc][m.key] || 0);
      return m.unit !== 'd' ? v : v + (SLA_COUNTRY_ADJ[cc][m.key] || 0);
    });
  });
});

const SLA_DEFAULT_META = Object.fromEntries(SLA_TYPES.map(t => [t.key, { version: 3, date: '1 Jul 2026' }]));

// Sparse per-milestone overrides: null means the milestone follows the country default
const SLA_OVERRIDES = {
  'acme|regular|SG': [4, null, null, null, 27, null, 9, null],
  'acme|stock|SG': [2, null, null, 1],
  'techglobal|rush|US': [2, null, null, null, null, null, null, null],
  'techglobal|regular|US': [null, null, 4, null, null, null, 18, null],
  'northwind|regular|SG': [null, null, null, null, null, null, 9, null],
  'northwind|repair|SG': [2, 1, 3, 1],
  'northwind|repair|US': [2, 1, 4, null],
  'northwind|support|SG': [1, 4],
  'finance|support|SG': [1, null],
  'digital|offboarding|GB': [null, 3, null, null, 7],
  'brightpath|onboarding|SG': [3, 4, null, null, null, 2],
  'cloud|storage|AU': [3, null, null],
  'finance|disposal|SG': [null, 2, 3]
};

// Kits ship complete unless the client allows split shipments (each extra shipment adds courier cost)
const SLA_SPLIT_DELIVERY = { acme: true, digital: true, northwind: true };

const SLA_CLIENT_VERSIONS = {
  acme: { version: 4, date: '1 Sep 2026' },
  techglobal: { version: 2, date: '12 Mar 2026' },
  digital: { version: 3, date: '20 Jun 2026' },
  mediaworks: { version: 1, date: '4 Jan 2026' },
  finance: { version: 2, date: '18 May 2026' },
  cloud: { version: 1, date: '2 Feb 2026' },
  northwind: { version: 3, date: '30 Jul 2026' },
  brightpath: { version: 1, date: '15 Aug 2026' }
};

const slaType = key => SLA_TYPES.find(t => t.key === key);

// Index of a milestone that follows the vendor's quoted lead time. Order stages are now fixed business-hour
// targets, so no current type has one; kept so pages that show vendor conflicts keep working.
const slaSyncedIdx = typeKey => slaType(typeKey).milestones.findIndex(m => m.synced);
const slaKey = (clientId, typeKey, cc) => `${clientId}|${typeKey}|${cc}`;
const slaClientsIn = cc => WH_CLIENTS.filter(c => HUB_ASSIGNMENTS[c.id] && cc in HUB_ASSIGNMENTS[c.id]);
const slaNulls = typeKey => slaType(typeKey).milestones.map(() => null);

function slaEffective(override, defaults) {
  return defaults.map((d, i) => (override && override[i] !== null && override[i] !== undefined ? override[i] : d));
}

// Target for a synced milestone: the client's fixed override, else vendor quote (upper bound) + grace
function slaSyncedTarget(typeKey, clientId, cc, quoteMax) {
  const i = slaSyncedIdx(typeKey);
  const ov = SLA_OVERRIDES[slaKey(clientId, typeKey, cc)];
  if (ov && ov[i] !== null && ov[i] !== undefined) return { days: ov[i], fixed: true };
  return { days: quoteMax + SLA_DEFAULTS[typeKey][cc][i], fixed: false };
}

// Clients whose fixed vendor-step target is shorter than a live quote in that country
function slaSyncedConflicts(typeKey, cc) {
  const i = slaSyncedIdx(typeKey);
  if (i < 0) return [];
  return slaClientsIn(cc).map(c => {
    const ov = SLA_OVERRIDES[slaKey(c.id, typeKey, cc)];
    if (!ov || ov[i] === null || ov[i] === undefined) return null;
    const over = supplyVendorsIn(cc).filter(v => v.range[1] > ov[i]);
    return over.length ? { client: c, fixed: ov[i], over } : null;
  }).filter(Boolean);
}

function slaCustomCount(override) {
  return override ? override.filter(v => v !== null).length : 0;
}

// End-to-end = sum of milestones; hours and days are kept apart rather than converted
// syncedFixed: true when the synced milestone value is a fixed client target rather than a grace allowance
function slaTotalHtml(type, values, syncedFixed = false) {
  let d = 0, h = 0, cond = 0, hubD = 0;
  let followsQuote = false;
  type.milestones.forEach((m, i) => {
    const v = Number(values[i]);
    if (m.fixed || !Number.isFinite(v)) return;
    if (m.synced && !syncedFixed) followsQuote = true;
    if (m.conditional) cond += v;
    else if (m.hubOnly) hubD += v;
    else if (m.unit === 'h') h += v;
    else d += v;
  });
  const fmt = days => [days ? `${days}d` : '', h ? `${h}h` : ''].filter(Boolean).join(' ') || '0';
  const prefix = type.milestones.some(m => m.fixed) ? 'Vendor date + ' : followsQuote ? 'Vendor lead time + ' : '';
  const condNote = cond ? `<div class="sla-sub">+${cond}d with collection</div>` : '';
  if (hubD) {
    return `<span class="sla-total">Via hub: ${prefix}${fmt(d + hubD)}</span><div class="sla-sub">Direct: ${prefix}${fmt(d)}</div>${condNote}`;
  }
  return `<span class="sla-total">${prefix}${fmt(d)}</span>${condNote}`;
}
