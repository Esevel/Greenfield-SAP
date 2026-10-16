// Shared stock data for all Stock tabs. Every unit belongs to a client; it sits in an Esevel hub or at a client site.
// Requires hub-data.js (WAREHOUSES, WH_CLIENTS, WH_COUNTRIES, HUB_ASSIGNMENTS).

const STOCK_MODELS = {
  mbp14: { name: 'MacBook Pro 14" M3', icon: '💻', bg: '#667eea, #764ba2', category: 'Laptops' },
  air13: { name: 'MacBook Air 13" M2', icon: '💻', bg: '#43e97b, #38f9d7', category: 'Laptops' },
  xps15: { name: 'Dell XPS 15', icon: '💻', bg: '#f093fb, #f5576c', category: 'Laptops' },
  x1c: { name: 'Lenovo ThinkPad X1 Carbon', icon: '💻', bg: '#4facfe, #00f2fe', category: 'Laptops' },
  u2723: { name: 'Dell UltraSharp U2723QE', icon: '🖥', bg: '#fa709a, #fee140', category: 'Monitors' },
  mxm3s: { name: 'Logitech MX Master 3S', icon: '🖱', bg: '#a8edea, #fed6e3', category: 'Peripherals' },
  magickb: { name: 'Apple Magic Keyboard', icon: '⌨️', bg: '#ffecd2, #fcb69f', category: 'Peripherals' }
};

// One line per client × model × location. loc is a WAREHOUSES id (hub or client site).
// used = how many on hand are used (returned / redeployable); the rest are new. Grade lives on each device.
const STOCK_LINES = [
  { client: 'acme', model: 'mbp14', loc: 1, onHand: 14, used: 5, reserved: 6, incoming: { qty: 20, date: '18 Nov', ref: 'Restock PO-7712' } },
  { client: 'acme', model: 'mbp14', loc: 5, onHand: 4, used: 4, reserved: 0 },
  { client: 'acme', model: 'air13', loc: 2, onHand: 5, used: 5, reserved: 0 },
  { client: 'acme', model: 'xps15', loc: 4, onHand: 12, used: 2, reserved: 3 },
  { client: 'acme', model: 'mxm3s', loc: 1, onHand: 3, used: 1, reserved: 1 },
  { client: 'techglobal', model: 'xps15', loc: 4, onHand: 22, used: 6, reserved: 4 },
  { client: 'techglobal', model: 'xps15', loc: 6, onHand: 12, used: 12, reserved: 0 },
  { client: 'techglobal', model: 'u2723', loc: 4, onHand: 15, used: 3, reserved: 2 },
  { client: 'techglobal', model: 'x1c', loc: 3, onHand: 6, used: 6, reserved: 2 },
  { client: 'mediaworks', model: 'mbp14', loc: 1, onHand: 9, used: 3, reserved: 2 },
  { client: 'mediaworks', model: 'magickb', loc: 1, onHand: 12, used: 0, reserved: 0 },
  { client: 'mediaworks', model: 'air13', loc: 3, onHand: 3, used: 3, reserved: 0 },
  { client: 'digital', model: 'x1c', loc: 3, onHand: 0, used: 0, reserved: 0, incoming: { qty: 10, date: '25 Nov', ref: 'Restock PO-7740' } },
  { client: 'northwind', model: 'mbp14', loc: 8, onHand: 7, used: 2, reserved: 1 },
  { client: 'cloud', model: 'u2723', loc: 8, onHand: 31, used: 9, reserved: 5 }
];

// Per client × category × country. setBy: 'client' or 'esevel' (on the client's behalf)
const STOCK_THRESHOLDS = [
  { id: 't1', client: 'acme', category: 'Laptops', country: 'SG', min: 15, setBy: 'client', setByName: 'Ravi Shah', vendor: 'Vendor A', unitCost: 'SGD 1,948', restockTo: 25 },
  { id: 't2', client: 'acme', category: 'Peripherals', country: 'SG', min: 5, setBy: 'esevel', setByName: 'Qonit', vendor: 'Vendor A', unitCost: 'SGD 139', restockTo: 10 },
  { id: 't3', client: 'acme', category: 'Laptops', country: 'US', min: 6, setBy: 'client', setByName: 'Ravi Shah', vendor: 'Vendor C', unitCost: 'USD 1,520', restockTo: 12 },
  { id: 't4', client: 'techglobal', category: 'Laptops', country: 'US', min: 20, setBy: 'client', setByName: 'Sarah Kim', vendor: 'Vendor C', unitCost: 'USD 1,610', restockTo: 35 },
  { id: 't5', client: 'techglobal', category: 'Monitors', country: 'US', min: 10, setBy: 'esevel', setByName: 'Marcus', vendor: 'Ingram Micro', unitCost: 'USD 389', restockTo: 20 },
  { id: 't6', client: 'mediaworks', category: 'Laptops', country: 'AU', min: 4, setBy: 'esevel', setByName: 'Aisha', vendor: 'Vendor B', unitCost: 'AUD 1,799', restockTo: 8 },
  { id: 't7', client: 'digital', category: 'Laptops', country: 'AU', min: 5, setBy: 'client', setByName: 'Hannah Clarke', vendor: 'Vendor B', unitCost: 'AUD 2,350', restockTo: 10 },
  { id: 't8', client: 'northwind', category: 'Laptops', country: 'US', min: 5, setBy: 'esevel', setByName: 'Qonit', vendor: 'Vendor C', unitCost: 'USD 1,520', restockTo: 10 }
];

const stockLoc = id => WAREHOUSES.find(w => w.id === id);
const stockClient = id => WH_CLIENTS.find(c => c.id === id);
const stockAvailable = l => l.onHand - l.reserved;
const isHub = loc => loc.type === 'esevel';

// Available units counting towards a client's threshold: both hub and client-site stock in that country
function thresholdCurrent(t) {
  return STOCK_LINES
    .filter(l => l.client === t.client && STOCK_MODELS[l.model].category === t.category && stockLoc(l.loc).country === t.country)
    .reduce((s, l) => s + stockAvailable(l), 0);
}

function thresholdStatus(t) {
  const cur = thresholdCurrent(t);
  if (cur < t.min) return 'breach';
  if (cur < t.min * 1.25) return 'near';
  return 'ok';
}

// Thresholds below minimum for a client in a country (one flag per client × country, not per line)
function breachesFor(clientId, cc) {
  return STOCK_THRESHOLDS.filter(t => t.client === clientId && t.country === cc && thresholdStatus(t) === 'breach');
}

const stockNew = l => l.onHand - l.used;

function locationTag(loc) {
  return isHub(loc)
    ? '<span class="tag tag-loc-hub">Esevel hub</span>'
    : '<span class="tag tag-loc-site">Client site</span>';
}

function modelCell(modelId) {
  const m = STOCK_MODELS[modelId];
  return `<div class="model-cell"><div class="model-thumbnail"><div class="thumbnail-placeholder" style="background: linear-gradient(135deg, ${m.bg});">${m.icon}</div></div><div class="model-name">${m.name}</div></div>`;
}

function clientCell(clientId) {
  const c = stockClient(clientId);
  return `<div class="client-cell"><div class="client-logo">${c.logo}</div><span>${c.name}</span></div>`;
}

// Serial formats per brand so generated devices look like the model they belong to
const SERIAL_PREFIX = { mbp14: 'C02XK', air13: 'FVFHG', xps15: '8HJ2', x1c: 'PF3Q', u2723: 'CN-0H8W2K-', mxm3s: '2241LZ', magickb: 'F0T32' };
const GRADES_USED = ['B', 'A', 'C', 'B', 'D', 'B'];
const INTAKE_DATES = ['2026-06-02', '2026-07-13', '2026-08-02', '2026-08-29', '2026-09-21', '2026-10-11', '2026-04-09', '2026-01-15'];

// Storage: every device in an Esevel hub is billed daily from intake at the client's contract rate, in their invoice currency.
// Client sites are never billed. Falls back to a USD default where billing-data.js isn't loaded.
const STOCK_TODAY = new Date(2026, 9, 16);
const STORAGE_FALLBACK = { cur: 'USD', perDay: 0.4 };

function storageRate(clientId, cc) {
  const k = typeof CONTRACTS !== 'undefined' && CONTRACTS[clientId];
  if (!k) return STORAGE_FALLBACK;
  // Storage converts from the hub country's fee currency to the paying entity's currency
  const p = priceCharge(clientId, 'storage', cc);
  if (!p.fee.billable) return { cur: p.cur, perDay: 0 };
  return { cur: p.cur, perDay: p.amount, local: { cur: p.unitCur, perDay: p.unit }, fx: p.fx, entity: p.entity };
}
const stockParseIso = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const stockFmtDate = s => stockParseIso(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const money = (cur, v) => `${cur} ${v.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function deviceStorage(l, d) {
  const loc = stockLoc(l.loc);
  if (!isHub(loc)) return null;
  const days = Math.round((STOCK_TODAY - stockParseIso(d.intake)) / 864e5);
  const { cur, perDay } = storageRate(l.client, loc.country);
  // rate = monthly equivalent (30 days) for display
  return { days, perDay, rate: perDay * 30, cur, accrued: perDay * days };
}

// Suggested action for a device sitting in stock
function deviceSuggestion(d) {
  if (d.reserved) return { rec: 'Keep', why: 'Reserved for an open request' };
  if (d.grade === 'D') return { rec: 'Dispose', why: 'Grade D · refurbishing costs more than it is worth' };
  if (d.condition === 'used') return { rec: 'Redeploy', why: `Grade ${d.grade} used device · can fill a request instead of buying new` };
  return { rec: 'Keep', why: 'New stock held for the client' };
}

// Monthly storage fees for a set of lines, summed per currency
function storageByCurrency(lines) {
  const out = {};
  lines.forEach(l => stockDevices(l).forEach(d => {
    const s = deviceStorage(l, d);
    if (s) out[s.cur] = (out[s.cur] || 0) + s.rate;
  }));
  return out;
}

const feesLabel = byCur => Object.entries(byCur).map(([c, v]) => `${c} ${v.toLocaleString('en', { maximumFractionDigits: 2 })}`).join(' · ') || '—';

function agedCount(lines, days = 90) {
  return lines.reduce((n, l) => n + stockDevices(l).filter(d => { const s = deviceStorage(l, d); return s && s.days > days; }).length, 0);
}

// Restock proposals: one per breached threshold. state: 'new' (not sent), 'awaiting', 'approved', 'declined', 'dismissed'
const RESTOCK_STATE = { t1: { state: 'awaiting', sent: '2026-10-14', by: 'Qonit' } };

function restockFor(t) {
  if (thresholdStatus(t) !== 'breach' && !RESTOCK_STATE[t.id]) return null;
  const s = RESTOCK_STATE[t.id] || { state: 'new' };
  const qty = Math.max(0, t.restockTo - thresholdCurrent(t));
  const a = HUB_ASSIGNMENTS[t.client][t.country];
  const hub = typeof a === 'number' ? stockLoc(a).name : null;
  return { t, qty, hub, ...s };
}

const restockList = () => STOCK_THRESHOLDS.map(restockFor).filter(Boolean);

// Devices for a stock line, generated deterministically: reserved first, then new, then used.
function stockDevices(l) {
  // Lines may be copies (e.g. spread with extra fields), so match on identity fields
  const li = STOCK_LINES.findIndex(x => x.client === l.client && x.model === l.model && x.loc === l.loc);
  return Array.from({ length: l.onHand }, (_, n) => {
    const isUsed = n >= l.onHand - l.used;
    const serial = `${SERIAL_PREFIX[l.model]}${String(4100 + li * 37 + n * 7).padStart(4, '0')}${'ABCDEFGH'[(li + n) % 8]}`;
    return {
      serial,
      condition: isUsed ? 'used' : 'new',
      grade: isUsed ? GRADES_USED[(li + n) % GRADES_USED.length] : 'A',
      reserved: n < l.reserved,
      intake: INTAKE_DATES[(li * 3 + n) % INTAKE_DATES.length]
    };
  });
}
