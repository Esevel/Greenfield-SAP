// Shared commercial data: client contracts (versioned), billing entities, currency/FX and lifecycle fee schedule.
// Needs hub-data.js. Amounts are always shown with their currency code and never added across currencies.

/* ---------- Money ---------- */

// Units of each currency per 1 USD
const FX_RATES = { USD: 1, SGD: 1.34, MYR: 4.45, AUD: 1.52, GBP: 0.79, EUR: 0.92 };

const FX_SOURCES = {
  ecb: 'ECB reference rate (daily)',
  oanda: 'OANDA mid-market (daily)',
  fixed: 'Fixed contract rate (reviewed quarterly)'
};

const fxConvert = (amount, from, to) => (amount / FX_RATES[from]) * FX_RATES[to];

function fmtAmount(cur, amount, dp = 2) {
  return `${cur} ${amount.toLocaleString('en', { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
}

// items: [{ cur, amount }] → { SGD: 123, USD: 45 }
function sumByCurrency(items) {
  return items.reduce((out, i) => { out[i.cur] = (out[i.cur] || 0) + i.amount; return out; }, {});
}

// One line per currency; never a combined total
function amountsHtml(byCur, dp = 2) {
  const lines = Object.entries(byCur).sort(([a], [b]) => a.localeCompare(b)).map(([c, v]) => `<div class="amount-line">${fmtAmount(c, v, dp)}</div>`);
  return lines.join('') || '<span class="text-muted">—</span>';
}

/* ---------- Contracts ---------- */

/* ---------- Plans and seat subscriptions ---------- */

// Free, Support, Secure and Complete are seat subscriptions: a number of seats committed for the subscription term,
// billed annually in advance (seats × monthly price × 12) at the start of each subscription year. Seats can't be
// reduced, repriced lower or removed until renewal. A user added when no seat is available needs a subscription order
// (approved by the client admin), charged once for the rest of the subscription year: monthly price × remaining days
// ÷ 30, with days capped at 360. Each seat covers a number of devices; assigning more needs an upgrade order priced the
// same way per extra device. Free adds seats and devices at no charge, without orders. Enterprise has no subscription:
// it keeps event-based billing (lifecycle fees, billable users, devices) and is the only plan with billable users.
// devices: device limit per user (laptops and peripherals). deviceUSD: proposed price per extra device per month.
const PLANS = {
  Free: { seat: true, free: true, rank: 0, listUSD: 0, devices: 1, deviceUSD: 0, blurb: 'Webstore, catalogue, order and inventory tracking. Seats added without orders; renewal still required' },
  Support: { seat: true, rank: 1, listUSD: 12, devices: 1, deviceUSD: 6, blurb: 'Procurement, inventory, last mile and hands-on device support' },
  Secure: { seat: true, rank: 2, listUSD: 25, devices: 3, deviceUSD: 8, blurb: 'Adds device management, employee records, on/offboarding and SSO' },
  Complete: { seat: true, rank: 3, listUSD: 45, devices: 5, deviceUSD: 9, blurb: 'Everything in Support and Secure, MFA and software support included' },
  Enterprise: { seat: false, rank: 4, blurb: 'Custom contract billed per lifecycle event; no seat subscription' }
};
const PLAN_TIERS = Object.keys(PLANS);
const PLAN_ALIAS = { Essentials: 'Support', Growth: 'Secure' };
// Add-ons priced per seat per month (billed with the seat); included or unavailable depending on the plan
const PLAN_ADDONS = {
  mfa: { label: 'Multi-Factor Authentication', listUSD: 3, plans: { Secure: 'addon', Complete: 'included' } },
  software: { label: 'Software Support', listUSD: 5, plans: { Support: 'addon', Secure: 'addon', Complete: 'included' } }
};
const isSeatPlan = tier => !!(PLANS[tier] && PLANS[tier].seat);
const planListPrice = (usd, cur) => Math.round(fxConvert(usd, 'USD', cur) * 2) / 2;
const subBlock = (id, qty, price, from, note = '') => ({ id, qty, price, from, note });
const subscription = (start, end, billTo, blocks, addOns = [], autoRenew = true) => ({ term: { start, end }, billTo, blocks, addOns, autoRenew });
// onboarding: a new client whose first contract (v1) is a draft or waiting for the client admin to accept
const PLAN_TIERS_NOTE = 'Support, Secure and Complete bill seats annually in advance; Free has seats at no charge; Enterprise bills per event';
const CONTRACT_STATUS = { onboarding: ['Onboarding', 'badge-info'], active: ['Active', 'badge-success'], amendment: ['Amendment pending', 'badge-warning'], expired: ['Expired', 'badge-neutral'] };
const INVOICE_SPLITS = { entity: 'Billing entity', costCentre: 'Cost centre', country: 'Country', po: 'PO number' };

// Lifecycle events billed per country; fee events map from request types
// trigger: the milestone whose completion raises the charge (storage accrues daily instead)
const FEE_EVENTS = [
  { key: 'deployment', label: 'Deployment', unit: 'per device', trigger: 'Delivered', types: ['regular', 'rush', 'bulk', 'preorder', 'deploy', 'onboarding'] },
  { key: 'retrieval', label: 'Retrieval', unit: 'per device', trigger: 'Received at hub', types: ['offboarding'] },
  { key: 'storage', label: 'Storage', unit: 'per device per day', trigger: 'Daily, while in an Esevel hub', types: ['storage'] },
  { key: 'redeployment', label: 'Redeployment', unit: 'per device', trigger: 'Delivered', types: ['redeployment'] },
  { key: 'repair', label: 'Repair', unit: 'per repair (excl. parts)', trigger: 'Repaired', types: ['repair'] },
  { key: 'disposal', label: 'Disposal', unit: 'per device', trigger: 'Certificate issued', types: ['disposal'] }
];

// Local currency per country: standard fees are priced in it, and billing entities default to it
const COUNTRY_CURRENCY = { SG: 'SGD', MY: 'MYR', AU: 'AUD', US: 'USD', GB: 'GBP' };
// Rush has no surcharge and Support isn't billable
const FEE_BASE_USD = { deployment: 85, retrieval: 95, storage: 0.4, redeployment: 110, repair: 65, disposal: 45 };
const FEE_COUNTRY_FACTOR = { SG: 1, MY: 0.75, AU: 1.15, US: 1.05, GB: 1.1 };
const BILLING_TODAY = '2026-10-16';

// Standard lifecycle fees (Settings › Billing): per country, in that country's currency, versioned newest first
const STANDARD_FEES = {};
Object.keys(COUNTRY_CURRENCY).forEach(cc => {
  const cur = COUNTRY_CURRENCY[cc];
  const rates = {};
  FEE_EVENTS.forEach(e => {
    const v = fxConvert(FEE_BASE_USD[e.key] * FEE_COUNTRY_FACTOR[cc], 'USD', cur);
    rates[e.key] = e.key === 'storage' ? Math.round(v * 100) / 100 : Math.round(v);
  });
  STANDARD_FEES[cc] = [{ v: 2, cur, rates, from: '2026-01-01', to: '', by: 'Commercial · Lena', note: 'Annual review 2026' }];
});
STANDARD_FEES.SG.push({ v: 1, cur: 'SGD', rates: { ...STANDARD_FEES.SG[0].rates, deployment: 108, retrieval: 120 }, from: '2025-01-01', to: '2025-12-31', by: 'Commercial · Lena', note: 'Launch schedule' });
STANDARD_FEES.MY.unshift({ v: 3, cur: 'MYR', rates: { ...STANDARD_FEES.MY[0].rates, deployment: STANDARD_FEES.MY[0].rates.deployment + 15 }, from: '2027-01-01', to: '', by: 'Commercial · Priya', note: 'Courier cost increase' });
STANDARD_FEES.MY[1].to = '2026-12-31';

const standardFeeVersion = (cc, onDate = BILLING_TODAY) => STANDARD_FEES[cc].find(v => v.from <= onDate && (!v.to || v.to >= onDate));
const scheduledFeeVersion = cc => STANDARD_FEES[cc].find(v => v.from > BILLING_TODAY);

// terms = the active version. versions list newest first; older versions store only what changed (from → to).
// Entity: invoice currency (defaults to the country's), accepted settlement currencies, tax status/exemption, importer of record,
// billable user rate in the entity currency. Contract terms keep only exceptions to the Settings standard fees.
const ent = (id, name, country, taxId, contact, x = {}) => ({
  id, name, country, taxId, contact, parent: null, currency: COUNTRY_CURRENCY[country], settlement: [COUNTRY_CURRENCY[country]],
  taxStatus: 'Registered', taxNote: '', ior: 'esevel', muRate: 0, ...x
});

const CONTRACTS = {
  acme: {
    tier: 'Enterprise', start: '2024-03-01', end: '2027-02-28', status: 'amendment',
    terms: {
      countries: ['SG', 'MY', 'AU', 'US'], fxSource: 'ecb', fxLock: 'milestone',
      entities: [
        ent('e1', 'Acme Tech Holdings Pte Ltd', 'SG', 'UEN 201912345K', 'ap@acmetech.com', { settlement: ['SGD', 'USD'], taxNote: 'GST registered', muRate: 18 }),
        ent('e2', 'Acme Tech Sdn Bhd', 'MY', 'SST W10-1808-32000123', 'ap-my@acmetech.com', { parent: 'e1', muRate: 58 }),
        ent('e3', 'Acme Tech Inc', 'US', 'EIN 84-1234567', 'ap-us@acmetech.com', { parent: 'e1', taxStatus: 'Exempt (resale)', taxNote: 'Resale certificate on file', muRate: 14 })
      ],
      feeExceptions: { 'deployment.SG': 105, 'storage.SG': 0.45 },
      offEvents: [],
      pricing: { markup: [{ category: 'Laptops', tier: 't2', markup: 8 }], note: '8% adjustment to vendor retail for volume tier 2' },
      routing: [{ match: 'costCentre', value: 'CC-2100 Sales', entity: 'e1' }],
      managedUsers: { enabled: true },
      cap: { limit: 450000, currency: 'SGD', period: 'Annual', renewal: '2027-03-01' },
      splitBy: ['entity', 'costCentre'],
      discounts: []
    },
    versions: [
      { v: 5, status: 'pending', effective: '2026-11-01', note: 'Q4 KL office opening: bulk deployment rate', publishedBy: 'Daniel', publishedAt: '2026-10-15 16:20 SGT',
        changes: [{ field: 'Discounts and rate overrides', from: 'None', to: 'Deployment · Malaysia: rate MYR 150.00 (1 Nov 2026 – 31 Dec 2026)', path: 'discounts', fromVal: [], toVal: [{ id: 'd1', kind: 'rate', event: 'deployment', cc: 'MY', value: 150, from: '2026-11-01', to: '2026-12-31', note: 'Bulk rollout to one KL address; single delivery run' }] }] },
      { v: 4, status: 'active', effective: '2026-09-01', note: 'Billable user rate from SGD 16 to SGD 18; Singapore deployment SGD 105', acceptedBy: 'Ravi Shah', acceptedAt: '2026-08-22 14:12 SGT', ip: '203.116.42.18',
        changes: [{ field: 'Billable user rate · Acme Tech Holdings Pte Ltd', from: 'SGD 16.00', to: 'SGD 18.00', path: 'entities.0.muRate', fromVal: 16, toVal: 18 }, { field: 'Deployment · Singapore', from: 'Standard', to: 'SGD 105.00', path: 'feeExceptions', fromVal: { 'storage.SG': 0.45 }, toVal: { 'deployment.SG': 105, 'storage.SG': 0.45 } }] },
      { v: 3, status: 'superseded', effective: '2026-01-01', note: 'Procurement cap raised', acceptedBy: 'Ravi Shah', acceptedAt: '2025-12-12 10:03 SGT', ip: '203.116.42.18',
        changes: [{ field: 'Procurement cap', from: 'SGD 300,000', to: 'SGD 450,000', path: 'cap.limit', fromVal: 300000, toVal: 450000 }] },
      { v: 2, status: 'superseded', effective: '2025-03-01', note: 'Added US entity', acceptedBy: 'Ravi Shah', acceptedAt: '2025-02-18 09:40 SGT', ip: '203.116.42.11',
        changes: [{ field: 'Billing entities', from: '2', to: '3 (+ Acme Tech Inc)', path: 'entities', fromVal: null, toVal: null }] },
      { v: 1, status: 'superseded', effective: '2024-03-01', note: 'Initial contract', acceptedBy: 'Ravi Shah', acceptedAt: '2024-02-20 16:25 SGT', ip: '203.116.40.7', changes: [] }
    ]
  },
  techglobal: {
    tier: 'Enterprise', start: '2025-03-12', end: '2028-03-11', status: 'amendment',
    terms: {
      countries: ['SG', 'MY', 'AU', 'US'], fxSource: 'oanda', fxLock: 'checkout',
      entities: [
        ent('e1', 'TechGlobal Inc', 'US', 'EIN 27-9876543', 'billing@techglobal.com', { taxNote: 'Sales tax collected per state', muRate: 12 }),
        ent('e2', 'TechGlobal Asia Pte Ltd', 'SG', 'UEN 202011223M', 'billing-apac@techglobal.com', { parent: 'e1', currency: 'USD', settlement: ['USD', 'SGD'], taxNote: 'GST registered; billed in USD by agreement', muRate: 12 })
      ],
      feeExceptions: { 'repair.US': 68 },
      offEvents: [],
      pricing: { markup: [], note: 'Uses Catalogue default percentage adjustments to vendor retail' },
      routing: [],
      managedUsers: { enabled: true },
      cap: { limit: 900000, currency: 'USD', period: 'Annual', renewal: '2027-03-12' },
      splitBy: ['entity', 'po'],
      discounts: []
    },
    versions: [
      { v: 3, status: 'pending', effective: '2026-11-01', note: 'Repair fee reduced for volume; billable user rate to USD 11', publishedBy: 'Marcus', publishedAt: '2026-10-12 11:30 ET',
        changes: [{ field: 'Repair · United States', from: 'USD 68.00', to: 'USD 60.00', path: 'feeExceptions', fromVal: { 'repair.US': 68 }, toVal: { 'repair.US': 60 } }, { field: 'Billable user rate · TechGlobal Inc', from: 'USD 12.00', to: 'USD 11.00', path: 'entities.0.muRate', fromVal: 12, toVal: 11 }] },
      { v: 2, status: 'active', effective: '2026-03-12', note: 'Added AU and MY', acceptedBy: 'Sarah Kim', acceptedAt: '2026-03-02 15:44 CT', ip: '72.14.201.9',
        changes: [{ field: 'Countries', from: 'SG, US', to: 'SG, MY, AU, US', path: 'countries', fromVal: ['SG', 'US'], toVal: ['SG', 'MY', 'AU', 'US'] }] },
      { v: 1, status: 'superseded', effective: '2025-03-12', note: 'Initial contract', acceptedBy: 'Sarah Kim', acceptedAt: '2025-03-01 10:15 CT', ip: '72.14.201.9', changes: [] }
    ]
  },
  digital: {
    tier: 'Secure', start: '2024-06-20', end: '2027-06-19', status: 'active',
    terms: {
      countries: ['AU', 'GB'], fxSource: 'ecb', fxLock: 'milestone',
      entities: [
        ent('e1', 'Digital Solutions Pty Ltd', 'AU', 'ABN 51 824 753 556', 'accounts@digitalsolutions.com.au', { taxNote: 'GST registered' }),
        ent('e2', 'Digital Solutions UK Ltd', 'GB', 'VAT GB 123 4567 89', 'accounts-uk@digitalsolutions.com.au', { parent: 'e1', taxNote: 'VAT registered', ior: 'client' })
      ],
      feeExceptions: {},
      offEvents: ['disposal'],
      pricing: { markup: [{ category: 'Laptops', tier: 't1', markup: 10 }], note: '10% adjustment to vendor retail' },
      routing: [],
      managedUsers: { enabled: false },
      cap: { limit: 180000, currency: 'AUD', period: 'Annual', renewal: '2027-06-20' },
      splitBy: ['entity', 'country'],
      discounts: [],
      subscription: subscription('2026-06-20', '2027-06-19', 'e1', [subBlock('b1', 30, 36, '2026-06-20', 'Renewal commitment'), subBlock('b2', 10, 40, '2026-09-01', 'Added for UK hires')])
    },
    versions: [
      { v: 3, status: 'active', effective: '2026-06-20', note: 'Renewal on standard fees; disposal handled by client', acceptedBy: 'Hannah Clarke', acceptedAt: '2026-06-10 13:02 AEST', ip: '101.188.67.4',
        changes: [{ field: 'Disposal billable', from: 'Yes', to: 'No', path: 'offEvents', fromVal: [], toVal: ['disposal'] }] },
      { v: 2, status: 'superseded', effective: '2025-06-20', note: 'Added UK entity', acceptedBy: 'Hannah Clarke', acceptedAt: '2025-06-01 09:30 AEST', ip: '101.188.67.4', changes: [{ field: 'Billing entities', from: '1', to: '2 (+ Digital Solutions UK Ltd)' }] },
      { v: 1, status: 'superseded', effective: '2024-06-20', note: 'Initial contract', acceptedBy: 'Hannah Clarke', acceptedAt: '2024-06-12 11:00 AEST', ip: '101.188.60.2', changes: [] }
    ]
  },
  mediaworks: {
    tier: 'Secure', start: '2026-01-04', end: '2027-01-03', status: 'active',
    terms: {
      countries: ['SG', 'MY', 'AU', 'US'], fxSource: 'fixed', fxLock: 'checkout',
      entities: [ent('e1', 'MediaWorks Asia Pte Ltd', 'SG', 'UEN 201733456D', 'finance@mediaworks.com', { settlement: ['SGD', 'MYR'], taxNote: 'GST registered', muRate: 15 })],
      feeExceptions: {},
      offEvents: [],
      pricing: { markup: [], note: '' },
      routing: [],
      managedUsers: { enabled: false },
      cap: { limit: 120000, currency: 'SGD', period: 'Annual', renewal: '2027-01-04' },
      splitBy: ['costCentre'],
      discounts: [],
      subscription: subscription('2026-01-04', '2027-01-03', 'e1', [subBlock('b1', 70, 32, '2026-01-04', 'Initial commitment')], [{ key: 'mfa', price: 4, from: '2026-01-04' }])
    },
    versions: [{ v: 1, status: 'active', effective: '2026-01-04', note: 'Initial contract', acceptedBy: 'Aisha Rahman', acceptedAt: '2025-12-20 17:41 SGT', ip: '118.200.13.77', changes: [] }]
  },
  finance: {
    tier: 'Support', start: '2025-05-18', end: '2027-05-17', status: 'active',
    terms: {
      countries: ['SG', 'GB'], fxSource: 'ecb', fxLock: 'milestone',
      entities: [ent('e1', 'FinanceExperts Ltd', 'GB', 'VAT GB 987 6543 21', 'ap@financeexperts.co.uk', { taxNote: 'VAT registered' })],
      feeExceptions: {},
      offEvents: [],
      pricing: { markup: [], note: 'Uses Catalogue default percentage adjustments to vendor retail' },
      routing: [],
      managedUsers: { enabled: false },
      cap: { limit: 60000, currency: 'GBP', period: 'Annual', renewal: '2027-05-18' },
      splitBy: [],
      discounts: [],
      subscription: Object.assign(subscription('2026-05-18', '2027-05-17', 'e1', [subBlock('b1', 25, 9.5, '2026-05-18', 'Renewal commitment')], [{ key: 'software', price: 4, from: '2026-05-18' }]), { deviceBlocks: [{ id: 'd1', qty: 2, price: 4.5, from: '2026-05-18', note: 'Second device for 2 users' }] })
    },
    versions: [
      { v: 2, status: 'active', effective: '2026-05-18', note: 'Added SG office', acceptedBy: 'Oliver Grant', acceptedAt: '2026-05-09 10:20 BST', ip: '81.2.69.142',
        changes: [{ field: 'Countries', from: 'GB', to: 'SG, GB', path: 'countries', fromVal: ['GB'], toVal: ['SG', 'GB'] }] },
      { v: 1, status: 'superseded', effective: '2025-05-18', note: 'Initial contract', acceptedBy: 'Oliver Grant', acceptedAt: '2025-05-02 15:05 BST', ip: '81.2.69.142', changes: [] }
    ]
  },
  cloud: {
    tier: 'Secure', start: '2025-10-01', end: '2026-09-30', status: 'expired',
    terms: {
      countries: ['AU', 'US'], fxSource: 'oanda', fxLock: 'checkout',
      entities: [ent('e1', 'CloudSystems LLC', 'US', 'EIN 46-5551234', 'ap@cloudsystems.com', { settlement: ['USD', 'AUD'], taxStatus: 'Exempt (resale)', taxNote: 'Resale certificate on file for CA and NV', muRate: 10 })],
      feeExceptions: {},
      offEvents: [],
      pricing: { markup: [{ category: 'Monitors', tier: 't2', markup: 9 }], note: '' },
      routing: [],
      managedUsers: { enabled: false },
      cap: { limit: 250000, currency: 'USD', period: 'Annual', renewal: '2026-10-01' },
      splitBy: ['po'],
      discounts: [],
      subscription: subscription('2025-10-01', '2026-09-30', 'e1', [subBlock('b1', 80, 24, '2025-10-01', 'Initial commitment')], [], false)
    },
    versions: [{ v: 1, status: 'active', effective: '2026-02-02', note: 'Initial contract · renewal in negotiation', acceptedBy: 'Nathan Ong', acceptedAt: '2026-01-28 12:10 PT', ip: '64.233.160.5', changes: [] }]
  },
  northwind: {
    tier: 'Enterprise', start: '2025-07-30', end: '2028-07-29', status: 'active',
    terms: {
      countries: ['SG', 'US'], fxSource: 'ecb', fxLock: 'milestone',
      entities: [
        ent('e1', 'Northwind Health Inc', 'US', 'EIN 81-2223344', 'ap@northwindhealth.com', { taxNote: 'Certificates per state', muRate: 14 }),
        ent('e2', 'Northwind Health Clinics LLC', 'US', 'EIN 81-2223399', 'clinics-ap@northwindhealth.com', { parent: 'e1', taxStatus: 'Exempt (other)', taxNote: 'Healthcare exemption (CO)', muRate: 14 }),
        ent('e3', 'Northwind Health SG Pte Ltd', 'SG', 'UEN 202299887R', 'sg-finance@northwindhealth.com', { parent: 'e1', taxNote: 'GST registered', muRate: 19 })
      ],
      feeExceptions: { 'deployment.US': 80, 'retrieval.US': 90 },
      offEvents: [],
      pricing: { markup: [{ category: 'Laptops', tier: 't3', markup: 7 }], note: '7% adjustment to vendor retail for volume tier 3' },
      routing: [{ match: 'costCentre', value: 'Clinics IT', entity: 'e2' }],
      managedUsers: { enabled: true },
      cap: { limit: 600000, currency: 'USD', period: 'Annual', renewal: '2027-07-30' },
      splitBy: ['entity', 'costCentre', 'po'],
      discounts: [{ id: 'd1', kind: 'percent', event: '', cc: '', value: 10, from: '2026-11-01', to: '2027-01-31', note: 'Renewal: 2-year extension' }]
    },
    versions: [
      { v: 4, status: 'active', effective: '2026-10-14', note: 'Retention: 10% off lifecycle fees for a 2-year extension', acceptedBy: 'James Whitfield', acceptedAt: '2026-10-13 16:02 MT', ip: '98.38.120.44',
        changes: [{ field: 'Discounts and rate overrides', from: 'None', to: 'All lifecycle fees · all countries: 10% off (1 Nov 2026 – 31 Jan 2027)', path: 'discounts', fromVal: [], toVal: [{ id: 'd1', kind: 'percent', event: '', cc: '', value: 10, from: '2026-11-01', to: '2027-01-31', note: 'Renewal: 2-year extension' }] }] },
      { v: 3, status: 'superseded', effective: '2026-07-30', note: 'Clinics entity added', acceptedBy: 'James Whitfield', acceptedAt: '2026-07-21 09:55 MT', ip: '98.38.120.44', changes: [{ field: 'Billing entities', from: '2', to: '3 (+ Clinics LLC)' }] },
      { v: 2, status: 'superseded', effective: '2026-01-15', note: 'Added SG', acceptedBy: 'James Whitfield', acceptedAt: '2026-01-08 14:30 MT', ip: '98.38.120.44',
        changes: [{ field: 'Countries', from: 'US', to: 'SG, US', path: 'countries', fromVal: ['US'], toVal: ['SG', 'US'] }] },
      { v: 1, status: 'superseded', effective: '2025-07-30', note: 'Initial contract', acceptedBy: 'James Whitfield', acceptedAt: '2025-07-22 11:12 MT', ip: '98.38.118.2', changes: [] }
    ]
  },
  brightpath: {
    tier: 'Support', start: '2026-08-15', end: '2027-08-14', status: 'active',
    terms: {
      countries: ['SG', 'MY', 'AU'], fxSource: 'ecb', fxLock: 'milestone',
      entities: [ent('e1', 'BrightPath Education Pte Ltd', 'SG', 'UEN 201544332E', 'accounts@brightpath.edu.sg', { settlement: ['SGD', 'MYR', 'AUD'], taxNote: 'Education services zero-rated where eligible' })],
      feeExceptions: { 'storage.SG': 0.4 },
      offEvents: [],
      pricing: { markup: [], note: 'Uses Catalogue default percentage adjustments to vendor retail' },
      routing: [],
      managedUsers: { enabled: false },
      cap: { limit: 80000, currency: 'SGD', period: 'Annual', renewal: '2027-08-15' },
      splitBy: ['country'],
      discounts: [],
      subscription: subscription('2026-08-15', '2027-08-14', 'e1', [subBlock('b1', 30, 16, '2026-08-15', 'Initial commitment')])
    },
    versions: [{ v: 1, status: 'active', effective: '2026-08-15', note: 'Initial contract', acceptedBy: 'BrightPath IT', acceptedAt: '2026-08-06 10:00 SGT', ip: '165.21.4.90', changes: [] }]
  }
};

// Acme v2 added the US entity: rebuild the v1 entity list from the current one
const acmeV2 = CONTRACTS.acme.versions.find(v => v.v === 2).changes[0];
acmeV2.fromVal = CONTRACTS.acme.terms.entities.slice(0, 2);
acmeV2.toVal = CONTRACTS.acme.terms.entities;

/* ---------- Fees, routing and conversion ---------- */

const entityById = (t, id) => t.entities.find(e => e.id === id);
const parentEntity = t => t.entities.find(e => !e.parent);
const isBillable = (t, event) => !t.offEvents.includes(event);

// Discount or rate override for one event, country and date. Empty event / cc = all. Rate overrides win over % off.
const DISCOUNT_KIND = { percent: '% off', rate: 'Fixed rate' };
const discountApplies = (d, event, cc, onDate) => (!d.event || d.event === event) && (!d.cc || d.cc === cc) && d.from <= onDate && (!d.to || d.to >= onDate);
const activeDiscount = (t, event, cc, onDate) => {
  const hits = (t.discounts || []).filter(d => discountApplies(d, event, cc, onDate));
  return hits.find(d => d.kind === 'rate') || hits[0] || null;
};
function discountLabel(d, cur) {
  const what = `${d.event ? FEE_EVENTS.find(e => e.key === d.event).label : 'All lifecycle fees'} · ${d.cc ? WH_COUNTRIES[d.cc][1] : 'all countries'}`;
  const value = d.kind === 'percent' ? `${d.value}% off` : `rate ${fmtAmount(cur || (d.cc ? COUNTRY_CURRENCY[d.cc] : ''), d.value)}`;
  return `${what}: ${value}`;
}

// Effective fee for an event in a country: contract exception, else the standard (in the country's currency), then any discount
function contractFee(t, event, cc, onDate = BILLING_TODAY) {
  const std = standardFeeVersion(cc, onDate);
  const key = `${event}.${cc}`;
  const custom = key in t.feeExceptions;
  const base = custom ? t.feeExceptions[key] : std.rates[event];
  const discount = activeDiscount(t, event, cc, onDate);
  const amount = !discount ? base : discount.kind === 'rate' ? discount.value : Math.round(base * (100 - discount.value)) / 100;
  return { cur: std.cur, amount, base, std: std.rates[event], custom, discount, billable: isBillable(t, event) };
}

// Paying entity: routing override (cost centre / PO), else an entity in the work country (parent first), else the parent
function payingEntity(t, cc, { costCentre = '', po = '' } = {}) {
  const rule = t.routing.find(r => (r.match === 'costCentre' && r.value === costCentre) || (r.match === 'po' && r.value === po));
  if (rule) return { entity: entityById(t, rule.entity), why: `${rule.match === 'po' ? 'PO' : 'Cost centre'} ${rule.value} routes here` };
  const local = t.entities.filter(e => e.country === cc).sort((a, b) => (a.parent ? 1 : 0) - (b.parent ? 1 : 0))[0];
  if (local) return { entity: local, why: `Work in ${WH_COUNTRIES[cc][1]}` };
  return { entity: parentEntity(t), why: `No entity in ${WH_COUNTRIES[cc][1]}; billed to the parent` };
}

// FX applied when the fee currency differs from the paying entity's currency
function fxQuote(t, from, to) {
  if (from === to) return null;
  return { from, to, rate: FX_RATES[to] / FX_RATES[from], source: FX_SOURCES[t.fxSource].split(' (')[0], on: BILLING_TODAY, lock: t.fxLock };
}

// One lifecycle charge priced in the work country's currency and converted to the paying entity's currency
function priceCharge(clientId, event, cc, qty = 1, ctx = {}) {
  const t = CONTRACTS[clientId].terms;
  const fee = contractFee(t, event, cc);
  const pay = payingEntity(t, cc, ctx);
  const fx = fxQuote(t, fee.cur, pay.entity.currency);
  const amount = Math.round(fee.amount * qty * (fx ? fx.rate : 1) * 100) / 100;
  return { fee, entity: pay.entity, why: pay.why, fx, cur: pay.entity.currency, unit: fee.amount, unitCur: fee.cur, qty, amount };
}

// Unit fee converted into a target currency (seed data and previews)
function feeInCurrency(t, event, cc, cur) {
  const fee = contractFee(t, event, cc);
  const fx = fxQuote(t, fee.cur, cur);
  return Math.round(fee.amount * (fx ? fx.rate : 1) * 100) / 100;
}

// Share of a client's billable users who work in each subsidiary's country (prototype); the parent takes the rest
const MU_ENTITY_SHARE = { acme: { e2: 0.1, e3: 0.06 }, techglobal: { e2: 0.15 }, northwind: { e2: 0.2, e3: 0.05 } };
function muEntitySplit(clientId, total) {
  const t = CONTRACTS[clientId].terms;
  const share = MU_ENTITY_SHARE[clientId] || {};
  const out = Object.fromEntries(t.entities.map(e => [e.id, e.parent ? Math.round(total * (share[e.id] || 0)) : 0]));
  out[parentEntity(t).id] = total - Object.values(out).reduce((s, n) => s + n, 0);
  return out;
}

// Currencies a client is billed in, one per entity (never summed)
const contractCurrencies = t => [...new Set(t.entities.map(e => e.currency))];

const contractFor = clientId => CONTRACTS[clientId];
const activeVersion = c => c.versions.find(v => v.status === 'active');
const pendingVersion = c => c.versions.find(v => v.status === 'pending' || v.status === 'draft');
const contractCountries = c => c.terms.countries;
const cloneTerms = t => JSON.parse(JSON.stringify(t));

function setPath(obj, path, value) {
  // feeExceptions keys contain dots (event.CC), so paths into it are written as feeExceptions:event.CC
  if (path.startsWith('feeExceptions:')) {
    const key = path.slice(14);
    if (value === null || value === undefined) delete obj.feeExceptions[key];
    else obj.feeExceptions[key] = value;
    return;
  }
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((o, k) => o[k], obj);
  // A version without a subscription (Enterprise) stores null; drop the key rather than keep a null subscription
  if ((value === null || value === undefined) && path === 'subscription') delete target[last];
  else target[last] = JSON.parse(JSON.stringify(value));
}

// Terms as they were (or will be) in a given version: undo newer changes, or apply a pending one
function versionTerms(c, vNum) {
  const ver = c.versions.find(v => v.v === vNum);
  if (ver.terms) return ver.terms;
  const activeV = activeVersion(c).v;
  const t = cloneTerms(c.terms);
  if (vNum > activeV) {
    ver.changes.filter(ch => ch.path).forEach(ch => setPath(t, ch.path, ch.toVal));
  } else {
    c.versions.filter(v => v.v > vNum && v.v <= activeV)
      .forEach(v => v.changes.filter(ch => ch.path).forEach(ch => setPath(t, ch.path, ch.fromVal)));
  }
  return t;
}

// Prototype only: keep contract edits for the browser session so they carry between pages
const CONTRACTS_KEY = 'sap-contracts-v2';
sessionStorage.removeItem('sap-contracts-v1');
function saveContracts() {
  const data = {};
  // Onboarding clients edit tier and term end inside their v1 terms; mirror them for list pages
  Object.values(CONTRACTS).forEach(k => { if (!activeVersion(k) && k.terms.tier) { k.tier = k.terms.tier; k.end = k.terms.end; } });
  Object.entries(CONTRACTS).forEach(([id, k]) => { data[id] = { status: k.status, tier: k.tier, start: k.start, end: k.end, admin: k.admin, adminEmail: k.adminEmail, linkSentAt: k.linkSentAt, registeredAt: k.registeredAt, setup: k.setup, terms: k.terms, versions: k.versions }; });
  sessionStorage.setItem(CONTRACTS_KEY, JSON.stringify(data));
}
try {
  const saved = JSON.parse(sessionStorage.getItem(CONTRACTS_KEY) || 'null');
  if (saved) {
    Object.entries(saved).forEach(([id, d]) => {
      if (CONTRACTS[id]) Object.assign(CONTRACTS[id], d);
      else if (WH_CLIENTS.some(c => c.id === id && c.isNew)) CONTRACTS[id] = d;
    });
  }
} catch (e) { sessionStorage.removeItem(CONTRACTS_KEY); }
// Contracts saved before seat plans: rename old plan names and attach the seeded subscription
const SUB_SEED = Object.fromEntries(Object.entries(CONTRACTS).map(([id, k]) => [id, k.terms.subscription]).filter(([, v]) => v));
Object.entries(CONTRACTS).forEach(([id, k]) => {
  k.tier = PLAN_ALIAS[k.tier] || k.tier;
  k.versions.forEach(v => {
    if (v.terms && v.terms.tier) v.terms.tier = PLAN_ALIAS[v.terms.tier] || v.terms.tier;
    (v.changes || []).filter(c => c.path === 'tier').forEach(c => { c.fromVal = PLAN_ALIAS[c.fromVal] || c.fromVal; c.toVal = PLAN_ALIAS[c.toVal] || c.toVal; });
  });
  if (isSeatPlan(k.tier) && !k.terms.subscription && SUB_SEED[id]) k.terms.subscription = JSON.parse(JSON.stringify(SUB_SEED[id]));
  // Users above seats are now ordered as seats: the old overage price becomes the additional-seat price
  const subs = [k.terms.subscription, ...k.versions.map(v => v.terms && v.terms.subscription)].filter(Boolean);
  subs.forEach(sub => { if ('overagePrice' in sub) { sub.addPrice = sub.overagePrice; delete sub.overagePrice; } });
  // Billable users are Enterprise only
  if (isSeatPlan(k.tier)) k.terms.managedUsers.enabled = false;
});
// A new client without a contract (storage cleared mid-session) can't be shown
for (let i = WH_CLIENTS.length - 1; i >= 0; i--) if (!CONTRACTS[WH_CLIENTS[i].id]) WH_CLIENTS.splice(i, 1);

const isOnboarding = k => !activeVersion(k);
// While onboarding, the client's terms are its v1 draft or pending terms (edited in place)
Object.values(CONTRACTS).forEach(k => { if (isOnboarding(k)) k.terms = pendingVersion(k).terms; });
const clientAdminFor = k => (k.versions.find(v => v.acceptedBy) || {}).acceptedBy || k.admin || 'Client admin';

/* ---------- Procurement caps ---------- */

// One client-wide cap in a chosen currency. Device spend per entity, converted into the cap currency at today's rate.
// byEntity: spend this period in each entity's own currency. orders: [id, date, what, entity, amount in entity currency]
const CAP_SPEND = {
  acme: { byEntity: { e1: 298400, e2: 120500, e3: 33100 }, orders: [['ORD-58812', '2026-10-14', 'Restock PO-7712 · 20 × MacBook Pro 14"', 'e1', 38960], ['ORD-58790', '2026-10-09', 'Onboarding kits × 6', 'e1', 13850], ['ORD-58741', '2026-09-30', 'MY office monitors × 12', 'e2', 20350]] },
  techglobal: { byEntity: { e1: 498100, e2: 114300 }, orders: [['ORD-58805', '2026-10-13', 'Onboarding kits × 9', 'e2', 21480], ['ORD-58760', '2026-10-02', 'Dell XPS 15 × 25', 'e1', 41225]] },
  digital: { byEntity: { e1: 158900, e2: 17100 }, orders: [['ORD-58799', '2026-10-12', 'Restock PO-7740 · 10 × ThinkPad X1', 'e1', 23500], ['ORD-58702', '2026-09-24', 'UK office kits × 4', 'e2', 5150]] },
  mediaworks: { byEntity: { e1: 64900 }, orders: [['ORD-58780', '2026-10-06', 'Designer Pro kit × 2', 'e1', 11400]] },
  finance: { byEntity: { e1: 55800 }, orders: [['ORD-58795', '2026-10-11', 'MacBook Air 13" × 3', 'e1', 4470], ['ORD-58650', '2026-09-15', 'Analyst kits × 4', 'e1', 7900]] },
  cloud: { byEntity: { e1: 248100 }, orders: [['ORD-58710', '2026-09-26', 'Monitors × 20', 'e1', 8980]] },
  northwind: { byEntity: { e1: 221300, e2: 64800, e3: 22300 }, orders: [['ORD-58808', '2026-10-14', 'Onboarding kit × 1', 'e3', 3120], ['ORD-58770', '2026-10-04', 'Clinics laptops × 18', 'e2', 27360]] },
  brightpath: { byEntity: { e1: 12600 }, orders: [['ORD-58730', '2026-09-28', 'Teacher laptops × 6', 'e1', 12600]] }
};
WH_CLIENTS.forEach(c => { if (!CAP_SPEND[c.id]) CAP_SPEND[c.id] = { byEntity: {}, orders: [] }; });
const CAP_STATUS = { healthy: ['Healthy', 'badge-success'], near: ['Near cap', 'badge-warning'], over: ['Over cap', 'badge-error'] };
const capCurrency = t => t.cap.currency;

function capInfo(clientId) {
  const t = CONTRACTS[clientId].terms;
  const cur = capCurrency(t);
  const parts = Object.entries(CAP_SPEND[clientId].byEntity).map(([id, amount]) => {
    const e = entityById(t, id);
    return { entity: e, amount, cur: e.currency, converted: fxConvert(amount, e.currency, cur), rate: FX_RATES[cur] / FX_RATES[e.currency] };
  });
  const spent = Math.round(parts.reduce((s, p) => s + p.converted, 0));
  const pct = t.cap.limit ? (spent / t.cap.limit) * 100 : 0;
  return { cur, limit: t.cap.limit, spent, parts, remaining: t.cap.limit - spent, pct, status: pct > 100 ? 'over' : pct >= 80 ? 'near' : 'healthy', period: t.cap.period, renewal: t.cap.renewal, fxSource: FX_SOURCES[t.fxSource].split(' (')[0] };
}

