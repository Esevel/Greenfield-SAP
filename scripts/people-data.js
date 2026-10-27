// Client employees shared by People › Directory, Joiners, Leavers and the person page.
// Needs hub-data.js, supply-data.js and stock-data.js (start-date risk reads stock and lead times).

const PEOPLE_TODAY = '2026-10-16';

// state: active | joining | leaving | left. Queue fields live on p.joiner / p.leaver.
// Queue status ends at 'created': once a work order exists the Tracker owns fulfilment.
const PEOPLE = [
  // Joiners
  { id: 'p1', name: 'Priya Nair', email: 'priya.nair@acmetech.com', phone: '', address: '', client: 'acme', cc: 'SG', role: 'Backend Engineer', dept: 'Engineering', state: 'joining', start: '2026-10-26', source: 'HRIS (Workday)',
    joiner: { status: 'needs-info', requested: '2026-10-15' }, assets: [] },
  { id: 'p2', name: 'Daniel Okafor', email: 'daniel.okafor@techglobal.com', phone: '+1 512 555 0198', address: '', client: 'techglobal', cc: 'US', role: 'Senior Software Engineer', dept: 'Platform', state: 'joining', start: '2026-10-28', source: 'HRIS (Workday)',
    joiner: { status: 'new' }, assets: [] },
  { id: 'p3', name: 'Chloe Martin', email: 'chloe.martin@digitalsolutions.com.au', phone: '', address: '22 King St, Melbourne VIC 3000', client: 'digital', cc: 'AU', role: 'Product Designer', dept: 'Design', state: 'joining', start: '2026-10-29', source: 'HRIS (BambooHR)',
    joiner: { status: 'new' }, assets: [] },
  { id: 'p4', name: 'Hafiz Rahman', email: 'hafiz.rahman@mediaworks.com', phone: '', address: '', client: 'mediaworks', cc: 'MY', role: 'Account Executive', dept: 'Sales', state: 'joining', start: '2026-10-22', source: 'Added by client',
    joiner: { status: 'new' }, assets: [] },
  { id: 'p5', name: 'Grace Liu', email: 'grace.liu@cloudsystems.com', phone: '+1 415 555 0123', address: '500 Howard St, San Francisco, CA 94105', client: 'cloud', cc: 'US', role: 'Data Analyst', dept: 'Finance', state: 'joining', start: '2026-11-02', source: 'HRIS (Okta)',
    joiner: { status: 'ready' }, assets: [] },
  { id: 'p6', name: 'Tom Fletcher', email: 'tom.fletcher@financeexperts.co.uk', phone: '+44 20 7946 0321', address: '25 Bank St, London E14 5JP', client: 'finance', cc: 'GB', role: 'Office Manager', dept: 'Operations', state: 'joining', start: '2026-11-16', source: 'Added by client',
    joiner: { status: 'new' }, assets: [] },
  { id: 'p7', name: 'Sophie Tan', email: 'sophie.tan@acmetech.com', phone: '+65 9123 8890', address: '1 Raffles Place, Tower 2, #28-01, Singapore 048616', client: 'acme', cc: 'SG', role: 'Backend Engineer', dept: 'Engineering', state: 'joining', start: '2026-10-19', source: 'HRIS (Workday)',
    joiner: { status: 'created', wo: 'ONB-1186', pkg: 'Developer Tier 1' }, assets: [] },
  { id: 'p8', name: 'Ryan Cooper', email: 'ryan.cooper@northwindhealth.com', phone: '+1 303 555 0144', address: '1801 California St, Denver, CO 80202', client: 'northwind', cc: 'US', role: 'Platform Engineer', dept: 'IT', state: 'joining', start: '2026-10-27', source: 'HRIS (Okta)',
    joiner: { status: 'created', wo: 'ONB-1184', pkg: 'Developer Tier 1' }, assets: [] },

  // Leavers
  { id: 'p9', name: 'Marcus Lee', email: 'marcus.lee@acmetech.com', phone: '+65 9781 2234', address: '45 Tanjong Pagar Rd, #12-03, Singapore 088463', client: 'acme', cc: 'SG', role: 'Data Engineer', dept: 'Engineering', state: 'leaving', start: '2023-02-06', end: '2026-10-23', endConfirmed: true, source: 'HRIS (Workday)',
    leaver: { source: 'hris', status: 'new', method: 'box', reminder: true },
    assets: [{ type: 'laptop', name: 'MacBook Pro 14" M3', serial: 'C02XK4211B', outcome: 'redeploy' }, { type: 'peripheral', name: 'Logitech MX Master 3S', serial: '2241LZ4289C', outcome: 'store' }] },
  { id: 'p10', name: 'Anna Schmidt', email: 'anna.schmidt@techglobal.com', phone: '+1 512 555 0177', address: '1200 Lavaca St, Apt 8, Austin, TX 78701', client: 'techglobal', cc: 'US', role: 'QA Lead', dept: 'Platform', state: 'leaving', start: '2022-08-15', end: '2026-10-30', endConfirmed: false, source: 'HRIS (Workday)',
    leaver: { source: 'scheduled', status: 'new', method: 'collection', reminder: false },
    assets: [{ type: 'laptop', name: 'Dell XPS 15', serial: '8HJ24365F', outcome: 'redeploy' }, { type: 'peripheral', name: 'Dell UltraSharp U2723QE', serial: 'CN-0H8W2K-4402A', outcome: 'store' }, { type: 'peripheral', name: 'Dell WD19S dock', serial: 'WD19-77120', outcome: 'dispose' }] },
  { id: 'p11', name: 'Leo Tan', email: 'leo.tan@mediaworks.com', phone: '+65 9002 7713', address: '3 Fusionopolis Way, #09-10, Singapore 138633', client: 'mediaworks', cc: 'SG', role: 'Video Editor', dept: 'Content', state: 'leaving', start: '2024-01-08', end: '2026-10-17', endConfirmed: true, source: 'HRIS (Okta)',
    leaver: { source: 'hris', status: 'created', method: 'box', box: 'dispatched', date: '2026-10-14', reminder: true, wo: 'OFF-2061' },
    assets: [{ type: 'laptop', name: 'MacBook Pro 14" M3', serial: 'C02XK4511G', outcome: 'redeploy' }, { type: 'peripheral', name: 'Apple Magic Keyboard', serial: 'F0T324558D', outcome: 'store' }] },
  { id: 'p12', name: 'Isabella Rossi', email: 'isabella.rossi@digitalsolutions.com.au', phone: '+61 4 1234 5678', address: '', client: 'digital', cc: 'AU', role: 'Marketing Manager', dept: 'Marketing', state: 'leaving', start: '2021-05-03', end: '2026-11-06', endConfirmed: false, source: 'Added by client',
    leaver: { source: 'scheduled', status: 'needs-info', method: 'box', reminder: false },
    assets: [{ type: 'laptop', name: 'Lenovo ThinkPad X1 Carbon', serial: 'PF3Q4178C', outcome: 'dispose' }] },
  { id: 'p13', name: 'Oliver Grant', email: 'oliver.grant@financeexperts.co.uk', phone: '+44 20 7946 0874', address: '14 Canada Square, London E14 5AB', client: 'finance', cc: 'GB', role: 'Risk Analyst', dept: 'Risk', state: 'leaving', start: '2023-09-11', end: '2026-10-21', endConfirmed: true, source: 'HRIS (Entra ID)',
    leaver: { source: 'hris', status: 'created', method: 'box', box: 'scheduled', date: '2026-10-19', reminder: true, wo: 'OFF-2063' },
    assets: [{ type: 'laptop', name: 'MacBook Air 13" M2', serial: 'FVFHG4336E', outcome: 'redeploy' }, { type: 'peripheral', name: 'Jabra Evolve2 65', serial: 'JB-655120', outcome: 'store' }] },
  { id: 'p14', name: 'Siti Nurhaliza', email: 'siti.n@mediaworks.com', phone: '+60 12 345 6789', address: '8 Jalan Kiara, Mont Kiara, 50480 Kuala Lumpur', client: 'mediaworks', cc: 'MY', role: 'Account Manager', dept: 'Sales', state: 'leaving', start: '2024-06-03', end: '2026-11-13', endConfirmed: false, source: 'Added by client',
    leaver: { source: 'scheduled', status: 'new', method: 'office', reminder: true },
    assets: [{ type: 'laptop', name: 'MacBook Air 13" M2', serial: 'FVFHG4401A', outcome: 'redeploy' }, { type: 'peripheral', name: 'Logitech MX Master 3S', serial: '2241LZ4502F', outcome: 'store' }] },
  { id: 'p15', name: 'Kevin Brooks', email: 'kevin.brooks@cloudsystems.com', phone: '+1 415 555 0166', address: '77 Geary St, San Francisco, CA 94108', client: 'cloud', cc: 'US', role: 'Support Engineer', dept: 'Support', state: 'left', start: '2022-03-14', end: '2026-10-09', endConfirmed: true, source: 'HRIS (Okta)',
    leaver: { source: 'hris', status: 'created', method: 'collection', date: '2026-10-08', reminder: false, wo: 'OFF-2044' },
    assets: [{ type: 'peripheral', name: 'Dell UltraSharp U2723QE', serial: 'CN-0H8W2K-4733B', outcome: 'store' }, { type: 'peripheral', name: 'Dell UltraSharp U2723QE', serial: 'CN-0H8W2K-4740C', outcome: 'store' }] },
  { id: 'p16', name: 'Emma Wilson', email: 'emma.wilson@northwindhealth.com', phone: '+1 303 555 0190', address: '1550 Wewatta St, Denver, CO 80202', client: 'northwind', cc: 'US', role: 'Nurse Informaticist', dept: 'Clinical', state: 'leaving', start: '2023-11-20', end: '2026-10-28', endConfirmed: true, source: 'HRIS (Okta)',
    leaver: { source: 'hris', status: 'created', method: 'box', box: 'scheduled', date: '2026-10-22', reminder: true, wo: 'OFF-2066' },
    assets: [{ type: 'laptop', name: 'MacBook Pro 14" M3', serial: 'C02XK4692H', outcome: 'redeploy' }, { type: 'peripheral', name: 'Logitech MX Master 3S', serial: '2241LZ4711E', outcome: 'store' }, { type: 'peripheral', name: 'Apple Magic Keyboard', serial: 'F0T324740B', outcome: 'store' }] },

  // Active
  { id: 'p17', name: 'Ravi Shah', email: 'ravi.shah@acmetech.com', phone: '+65 9333 1020', address: '1 Raffles Place, Tower 2, #28-01, Singapore 048616', client: 'acme', cc: 'SG', role: 'IT Manager', dept: 'IT', state: 'active', start: '2020-04-01', source: 'HRIS (Workday)',
    assets: [{ type: 'laptop', name: 'MacBook Pro 14" M3', serial: 'C02XK3988A' }, { type: 'peripheral', name: 'Dell UltraSharp U2723QE', serial: 'CN-0H8W2K-3921D' }] },
  { id: 'p18', name: 'Sarah Kim', email: 'sarah.kim@techglobal.com', phone: '+1 512 555 0142', address: '500 W 2nd St, Austin, TX 78701', client: 'techglobal', cc: 'US', role: 'Head of IT', dept: 'IT', state: 'active', start: '2019-09-02', source: 'HRIS (Workday)',
    assets: [{ type: 'laptop', name: 'Dell XPS 15', serial: '8HJ23011C' }, { type: 'peripheral', name: 'Dell UltraSharp U2723QE', serial: 'CN-0H8W2K-3012B' }, { type: 'peripheral', name: 'Logitech MX Master 3S', serial: '2241LZ3015A' }] },
  { id: 'p19', name: 'Hannah Clarke', email: 'hannah.clarke@digitalsolutions.com.au', phone: '+61 4 9876 5432', address: '40 Bridge St, Sydney NSW 2000', client: 'digital', cc: 'AU', role: 'Operations Lead', dept: 'Operations', state: 'active', start: '2021-01-11', source: 'HRIS (BambooHR)',
    assets: [{ type: 'laptop', name: 'Lenovo ThinkPad X1 Carbon', serial: 'PF3Q3301B' }] },
  { id: 'p20', name: 'Aisha Rahman', email: 'aisha.rahman@mediaworks.com', phone: '+60 12 888 4410', address: '12 Jalan Ampang, 50450 Kuala Lumpur', client: 'mediaworks', cc: 'MY', role: 'Producer', dept: 'Content', state: 'active', start: '2022-07-18', source: 'HRIS (Okta)',
    assets: [{ type: 'laptop', name: 'MacBook Pro 14" M3', serial: 'C02XK3770E' }, { type: 'peripheral', name: 'Apple Magic Keyboard', serial: 'F0T323781C' }] },
  { id: 'p21', name: 'James Whitfield', email: 'james.whitfield@northwindhealth.com', phone: '+1 303 555 0111', address: '1801 California St, Denver, CO 80202', client: 'northwind', cc: 'US', role: 'Clinical Lead', dept: 'Clinical', state: 'active', start: '2024-02-05', source: 'HRIS (Okta)',
    assets: [{ type: 'laptop', name: 'MacBook Pro 14" M3', serial: 'C02XK4020F' }] },
  { id: 'p22', name: 'Olivia Hart', email: 'olivia.hart@financeexperts.co.uk', phone: '+44 20 7946 0555', address: '25 Bank St, London E14 5JP', client: 'finance', cc: 'GB', role: 'Financial Analyst', dept: 'Finance', state: 'active', start: '2025-11-03', source: 'HRIS (Entra ID)',
    assets: [{ type: 'laptop', name: 'MacBook Pro 14" M3', serial: 'C02XK4130G' }, { type: 'peripheral', name: 'Dell UltraSharp U2723QE', serial: 'CN-0H8W2K-4141E' }] },
  { id: 'p23', name: 'Nathan Ong', email: 'nathan.ong@cloudsystems.com', phone: '+1 415 555 0102', address: '500 Howard St, San Francisco, CA 94105', client: 'cloud', cc: 'US', role: 'SRE', dept: 'Engineering', state: 'active', start: '2023-03-20', source: 'HRIS (Okta)',
    assets: [{ type: 'laptop', name: 'Dell XPS 15', serial: '8HJ23560D' }, { type: 'peripheral', name: 'Dell UltraSharp U2723QE', serial: 'CN-0H8W2K-3571A' }] },
  { id: 'p24', name: 'Mei Lin Tan', email: 'meilin.tan@mediaworks.com', phone: '+65 9120 4455', address: '3 Fusionopolis Way, #09-10, Singapore 138633', client: 'mediaworks', cc: 'SG', role: 'Content Producer', dept: 'Content', state: 'active', start: '2025-10-20', source: 'HRIS (Okta)',
    assets: [{ type: 'laptop', name: 'MacBook Pro 14" M3', serial: 'C02XK4300H' }, { type: 'peripheral', name: 'Dell UltraSharp U2723QE', serial: 'CN-0H8W2K-4311C' }] }
];

const PERSON_STATE = { active: ['Active', 'badge-success'], joining: ['Joining', 'badge-info'], leaving: ['Leaving', 'badge-warning'], left: ['Left', 'badge-neutral'] };

// Device status drives managed-user billing: only an Assigned laptop qualifies; loaners never do
const DEVICE_STATUS = { assigned: ['Assigned', 'badge-success'], loaner: ['Loaner', 'badge-info'], repair: ['In repair', 'badge-warning'], returning: ['Returning', 'badge-neutral'] };
const DEVICE_SINCE = { p17: '2024-06-03', p18: '2025-01-13', p19: '2025-03-10', p20: '2024-09-16', p21: '2024-02-05', p22: '2025-11-03', p23: '2026-10-07', p24: '2025-10-20', p9: '2023-02-06', p10: '2022-08-15', p11: '2024-01-08', p12: '2021-05-03', p13: '2023-09-11', p14: '2024-06-03', p16: '2023-11-20' };
PEOPLE.forEach(p => p.assets.forEach(a => {
  a.status = p.state === 'left' ? 'returning' : 'assigned';
  a.since = DEVICE_SINCE[p.id] || p.start;
}));
// Nathan Ong: laptop away for repair since 28 Sep with a loaner; Sarah Kim swapped laptops mid-month (overlap)
(() => {
  const nathan = PEOPLE.find(p => p.id === 'p23');
  nathan.assets[0].status = 'repair';
  nathan.assets[0].since = '2026-09-28';
  nathan.assets.unshift({ type: 'laptop', name: 'Dell Latitude 7440 (loaner)', serial: 'LNR-US-0112', status: 'loaner', since: '2026-09-28' });
  const sarah = PEOPLE.find(p => p.id === 'p18');
  sarah.assets.push({ type: 'laptop', name: 'Dell XPS 15 (replacement)', serial: '8HJ25004A', status: 'assigned', since: '2026-10-11' });
  sarah.assets[0].status = 'returning';
  sarah.assets[0].since = '2026-10-14';
})();
const ASSET_ICON = { laptop: '💻', peripheral: '🖱' };

const personById = id => PEOPLE.find(p => p.id === id);
const peopleClientName = id => WH_CLIENTS.find(c => c.id === id).name;
const peopleParse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const peopleIso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const peopleFmt = (s, year = true) => peopleParse(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}) });
const isWeekend = d => d.getDay() === 0 || d.getDay() === 6;

function businessDaysUntil(iso) {
  const d = peopleParse(PEOPLE_TODAY);
  const end = peopleParse(iso);
  let n = 0;
  while (d < end) { d.setDate(d.getDate() + 1); if (!isWeekend(d)) n++; }
  return n;
}

function assetIconsHtml(assets) {
  const count = type => assets.filter(a => a.type === type).length;
  const html = ['laptop', 'peripheral'].filter(count)
    .map(t => `<span class="asset-count" title="${count(t)} ${t}${count(t) > 1 ? 's' : ''}">${ASSET_ICON[t]} ${count(t)}</span>`).join('');
  return html ? `<span class="asset-counts">${html}</span>` : '<span class="text-muted">—</span>';
}

// Open queue items, for tab counts
const openJoiners = () => PEOPLE.filter(p => p.joiner && p.joiner.status !== 'created');
const openLeavers = () => PEOPLE.filter(p => p.leaver && p.leaver.status !== 'created');

/* ---------- Joiners: packages and start-date risk ---------- */

const JOINER_PACKAGES = {
  'Developer Tier 1': ['mbp14', 'mxm3s'],
  'Developer Tier 2': ['xps15', 'u2723'],
  'Designer Pro': ['mbp14', 'u2723'],
  'Sales Standard': ['air13'],
  'Analyst Standard': ['mbp14', 'u2723'],
  'Standard Office': ['air13', 'mxm3s']
};

// First matching role keyword wins, so Senior Engineer is checked before Engineer
const PACKAGE_RULES = [
  [/senior .*engineer|staff engineer|principal/i, 'Senior Engineer', 'Developer Tier 2'],
  [/engineer|developer/i, 'Engineer', 'Developer Tier 1'],
  [/designer|producer/i, 'Designer', 'Designer Pro'],
  [/sales|account exec/i, 'Sales', 'Sales Standard'],
  [/analyst/i, 'Analyst', 'Analyst Standard']
];

function recommendPackage(role) {
  const rule = PACKAGE_RULES.find(([re]) => re.test(role));
  return rule ? { pkg: rule[2], reason: `Role: ${rule[1]} → ${rule[2]}` } : { pkg: 'Standard Office', reason: 'No role rule matched → Standard Office' };
}

PEOPLE.forEach(p => { if (p.joiner && !p.joiner.pkg) p.joiner.pkg = recommendPackage(p.role).pkg; });

const joinerMissing = p => ['phone', 'address'].filter(f => !p[f]);
const joinerComplete = p => !joinerMissing(p).length;

// Business days to get each package item to the employee: from the client's hub stock if available, else the fastest vendor
function joinerRisk(p) {
  const left = businessDaysUntil(p.start);
  const hub = HUB_ASSIGNMENTS[p.client][p.cc];
  const hubId = typeof hub === 'number' ? hub : null;
  const lm = supplyLastMile(p.cc);
  const buffer = hubId ? (SUPPLY_HUB_BUFFER[hubId] || 0) : 0;
  const add = (...ranges) => ranges.reduce((a, r) => [a[0] + r[0], a[1] + r[1]], [0, 0]);

  const items = JOINER_PACKAGES[p.joiner.pkg].map(model => {
    const name = STOCK_MODELS[model].name;
    const avail = hubId ? STOCK_LINES.filter(l => l.client === p.client && l.model === model && l.loc === hubId).reduce((s, l) => s + stockAvailable(l), 0) : 0;
    if (avail > 0) {
      return { name, from: `Stock · ${avail} available in ${stockLoc(hubId).name}`, range: add(SUPPLY_PREP, [buffer, buffer], lm), stock: true };
    }
    const v = supplyVendorsIn(p.cc).sort((a, b) => a.range[1] - b.range[1])[0];
    if (!v) return { name, from: 'No vendor serves this country', range: [99, 99], stock: false };
    const range = hubId ? add(v.range, SUPPLY_PREP, [buffer, buffer], lm) : add(v.range, lm);
    return { name, from: `${v.name}${hubId ? ' → hub' : ' → direct to employee'}`, range, stock: false };
  });

  const need = items.reduce((w, i) => (i.range[1] > w[1] ? i.range : w), [0, 0]);
  const level = left >= need[1] ? 'ok' : left >= need[0] ? 'tight' : 'late';
  const label = { ok: 'On track', tight: 'Tight', late: 'At risk' }[level];
  let advice = '';
  if (level !== 'ok') {
    advice = items.some(i => !i.stock)
      ? 'Vendor items may arrive after the start date. Ask the client to move the start date, or switch to a package with stock in this country.'
      : 'Even from stock this is close. Create the work order today.';
  }
  return { left, need, level, label, items, advice };
}

function riskHtml(r) {
  return `<span class="risk risk-${r.level}" title="${r.left} business days left · needs ${supplyRangeLabel(r.need)}">${r.label}</span><div class="stock-sub">${r.left}d left · needs ${supplyRangeLabel(r.need)}</div>`;
}

/* ---------- Leavers: retrieval method and device outcome ---------- */

const RETRIEVAL_METHODS = {
  box: { label: 'Return box', dateLabel: 'Dispatch return box', needsAddress: true },
  collection: { label: 'Courier collection', dateLabel: 'Collection date', needsAddress: true },
  office: { label: 'Office drop-off', dateLabel: 'Drop off by', needsAddress: false }
};

const DEVICE_OUTCOMES = { redeploy: 'Redeploy', store: 'Store', dispose: 'Dispose' };

// Redeploy and store go to the client's hub; dispose goes to the disposal partner; no hub means the client site keeps them
function outcomeDestination(p, outcome) {
  if (outcome === 'dispose') return 'Disposal partner (certificate of destruction)';
  const hub = HUB_ASSIGNMENTS[p.client][p.cc];
  if (typeof hub === 'number') return stockLoc(hub).name;
  const site = WAREHOUSES.find(w => w.type === 'client' && w.country === p.cc && w.client === peopleClientName(p.client));
  return site ? site.name : 'Client office (no Esevel hub in this country)';
}

// Reminder goes out the working day before departure (Fri for a Monday leaver)
function cutoffReminderDate(iso) {
  const d = peopleParse(iso);
  do d.setDate(d.getDate() - 1); while (isWeekend(d));
  return peopleIso(d);
}

function leaverMissing(p) {
  const m = [];
  if (RETRIEVAL_METHODS[p.leaver.method].needsAddress && !p.address) m.push('return address');
  return m;
}

// Prototype only: keep queue and state changes for the browser session so they carry between pages
const PEOPLE_KEY = 'sap-people-v1';
const PEOPLE_FIELDS = ['state', 'phone', 'address', 'end', 'joiner', 'leaver'];
function savePeople() {
  sessionStorage.setItem(PEOPLE_KEY, JSON.stringify(Object.fromEntries(PEOPLE.map(p => [p.id, Object.fromEntries(PEOPLE_FIELDS.map(f => [f, p[f]]))]))));
}
try {
  const saved = JSON.parse(sessionStorage.getItem(PEOPLE_KEY) || 'null');
  if (saved) PEOPLE.forEach(p => { if (saved[p.id]) PEOPLE_FIELDS.forEach(f => { if (saved[p.id][f] !== undefined) p[f] = saved[p.id][f]; else delete p[f]; }); });
} catch (e) { sessionStorage.removeItem(PEOPLE_KEY); }
