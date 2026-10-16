// Settings › Billing: standard lifecycle fees per country (local currency), sales tax and duties, versioning helpers.
// Client contracts store only their exceptions to the standard fees. Needs hub-data.js and billing-data.js.

const SETTINGS_TODAY = BILLING_TODAY;
const US_STATES = { CA: 'California', NV: 'Nevada', TX: 'Texas', NY: 'New York', CO: 'Colorado', NJ: 'New Jersey' };

function ruleStatus(r) {
  if (r.to && r.to < SETTINGS_TODAY) return 'expired';
  if (r.from > SETTINGS_TODAY) return 'scheduled';
  return 'active';
}
const isLatest = (list, r) => !list.some(x => x.chain === r.chain && x.from > r.from);
const RULE_STATUS = { active: ['Active', 'badge-success'], scheduled: ['Scheduled', 'badge-info'], expired: ['Past version', 'badge-neutral'] };

function dayBefore(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(y, m - 1, d - 1);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

// Versioned edit: close the current row the day before the new one starts, then add the new row
function addRuleVersion(list, current, changes, from) {
  current.to = dayBefore(from);
  const next = { ...current, ...changes, id: `${current.chain}-${Date.now()}`, from, to: '' };
  list.unshift(next);
  return next;
}

// Standard lifecycle fees (STANDARD_FEES, standardFeeVersion) live in billing-data.js so contracts can read them

/* ---------- Sales tax and duties ---------- */

// jur: country code, or US-XX for a state. Importer of record and exemptions live on each billing entity.
const TAX_RULES = [
  { id: 'x1', chain: 'x1', jur: 'SG', type: 'GST', rate: 9, from: '2024-01-01', to: '', duties: 'No import duty on IT hardware. GST charged on import value.' },
  { id: 'x1a', chain: 'x1', jur: 'SG', type: 'GST', rate: 8, from: '2023-01-01', to: '2023-12-31', duties: 'No import duty on IT hardware.' },
  { id: 'x2', chain: 'x2', jur: 'MY', type: 'SST (sales tax)', rate: 10, from: '2024-03-01', to: '', duties: 'Most laptops duty-free under ITA; some peripherals 5%.' },
  { id: 'x11', chain: 'x11', jur: 'MY', type: 'SST (service tax)', rate: 8, from: '2026-12-01', to: '', duties: 'Applies to logistics and storage services from Dec 2026.' },
  { id: 'x3', chain: 'x3', jur: 'AU', type: 'GST', rate: 10, from: '2000-07-01', to: '', duties: 'Duty-free under AUD 1,000 per consignment; 5% on some accessories above.' },
  { id: 'x4', chain: 'x4', jur: 'GB', type: 'VAT', rate: 20, from: '2011-01-04', to: '', duties: '0% duty on laptops; import VAT payable by the importer of record.' },
  { id: 'x5', chain: 'x5', jur: 'US-CA', type: 'Sales tax', rate: 7.25, from: '2017-01-01', to: '', duties: 'Base state rate; local district taxes apply by ship-to address.' },
  { id: 'x6', chain: 'x6', jur: 'US-NV', type: 'Sales tax', rate: 6.85, from: '2020-01-01', to: '', duties: 'Base state rate; county taxes apply.' },
  { id: 'x7', chain: 'x7', jur: 'US-TX', type: 'Sales tax', rate: 6.25, from: '2020-01-01', to: '', duties: 'Base state rate; local up to 2%.' },
  { id: 'x8', chain: 'x8', jur: 'US-NY', type: 'Sales tax', rate: 4, from: '2020-01-01', to: '', duties: 'State rate; NYC adds 4.5%.' },
  { id: 'x9', chain: 'x9', jur: 'US-CO', type: 'Sales tax', rate: 2.9, from: '2020-01-01', to: '', duties: 'State rate; local taxes apply.' },
  { id: 'x10', chain: 'x10', jur: 'US-NJ', type: 'Sales tax', rate: 6.625, from: '2018-01-01', to: '', duties: 'Statewide rate.' }
];

function jurLabel(jur) {
  if (jur.startsWith('US-')) return `${WH_COUNTRIES.US[0]} ${US_STATES[jur.slice(3)]} (US)`;
  return `${WH_COUNTRIES[jur][0]} ${WH_COUNTRIES[jur][1]}`;
}

/* ---------- FX ---------- */

const FX_REFRESHED = { ecb: 'Today 16:00 CET', oanda: 'Today 09:00 SGT', fixed: '1 Oct 2026 (quarterly)' };
const FX_CHANGE_7D = { USD: 0, SGD: -0.4, MYR: 0.9, AUD: 0.6, GBP: -0.2, EUR: 0.1 };
