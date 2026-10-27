// Tracker health from SLA milestones: each open item is measured against its current milestone's target
// (client custom value, else country default). Needs hub-data.js and sla-data.js.

const SLA_AT_RISK = 0.75;
const TRACKER_NOW = new Date();
// Prototype simplification: a business day counts as 24h of elapsed time
const HOURS = { h: 1, d: 24 };

const TRACKER_TYPE_ICON = {
  regular: ['📦', 'Orders'], rush: ['📦', 'Orders'], bulk: ['📦', 'Orders'], preorder: ['📦', 'Orders'], stock: ['📦', 'Orders · from stock'],
  onboarding: ['👋', 'Onboarding'], offboarding: ['📤', 'Offboarding'], repair: ['🔧', 'Repairs'],
  redeploy: ['🔁', 'Redeployments'], storage: ['🗄', 'Storage'], disposal: ['♻️', 'Disposal'], support: ['💬', 'Support']
};

// done[i] = when milestone i was completed; the current milestone is done.length.
// lines: order lines for the per-line vendor milestone; it completes when the last line in the kit is received.
const TRACKER_ITEMS = [
  { id: 'OFF-2055', client: 'digital', type: 'offboarding', cc: 'GB', start: '2026-10-10T17:22', done: ['2026-10-12T09:00'],
    stage: 'Scheduled', owner: ['Q', 'Qonit'], blocker: 'Awaiting courier', note: ['Qonit', 'DHL missed second pickup window, escalated to account manager'], href: '/pages/tracker/offboarding-detail.html' },
  { id: 'SUP-5521', client: 'acme', type: 'support', cc: 'SG', start: '2026-10-15T21:10', done: ['2026-10-15T21:52'],
    stage: 'In Progress / With Tech', owner: ['Q', 'Qonit'], blocker: '', note: ['Qonit', 'Profile reissued via Jamf. If it still drops, escalate to Acme network team'], href: '/pages/tracker/support-detail.html' },
  { id: 'REP-0871', client: 'techglobal', type: 'repair', cc: 'SG', start: '2026-10-09T14:00', done: ['2026-10-09T16:00', '2026-10-11T19:00'],
    stage: 'Awaiting part', owner: ['JL', 'Jia Ling'], blocker: 'Awaiting part', note: ['Jia Ling', 'Logic board back-ordered, vendor ETA Friday. Loaner sent.'], href: '/pages/tracker/work-order.html' },
  { id: 'ONB-1182', client: 'mediaworks', type: 'onboarding', cc: 'SG', start: '2026-10-14T15:00', done: ['2026-10-14T18:00'],
    stage: 'Arriving at hub 21 Oct', owner: ['M', 'Marcus'], blocker: '', note: ['Marcus', 'Client approved the 16" upgrade; vendor shipping to Singapore Hub'],
    lines: [
      { item: 'MacBook Pro 16" M3 Max', received: null, eta: '2026-10-21' },
      { item: 'Apple Studio Display', received: '2026-10-16T09:00' },
      { item: 'Magic Keyboard + Trackpad', received: '2026-10-15T14:00' }
    ],
    onb: { employee: 'Arjun Mehta', role: 'Senior Designer', startDate: '2026-10-27', pkg: 'Designer Pro', address: '8 Marina View, #30-01, Singapore 018960', devices: ['MacBook Pro 16" M3 Max', 'Apple Studio Display', 'Magic Keyboard + Trackpad'] } },
  { id: 'ONB-1194', client: 'techglobal', type: 'onboarding', cc: 'US', start: '2026-10-15T10:00', done: [],
    stage: 'Waiting on HR', owner: ['Q', 'Qonit'], blocker: 'Missing delivery address', note: ['Qonit', 'Asked Sarah Kim for Ethan\'s home address; Workday record has none'],
    onb: { employee: 'Ethan Walker', role: 'Account Executive', startDate: '2026-11-03', pkg: 'Sales Standard', address: '', devices: ['MacBook Air 13" M2', 'Jabra Evolve2 65'] } },
  { id: 'ONB-1193', client: 'brightpath', type: 'onboarding', cc: 'MY', start: '2026-10-15T15:00', done: ['2026-10-15T17:00'], route: 'employee', vendor: 'vendorA',
    stage: 'Vendor shipping direct', owner: ['AI', 'Aisha'], blocker: '', note: ['Aisha', 'Employee chose home delivery at checkout; Vendor A ships direct, Intune zero-touch on first boot'],
    lines: [
      { item: 'Lenovo ThinkPad X1 Carbon', received: null, eta: '2026-10-19' },
      { item: 'Logitech MX Master 3S', received: '2026-10-16T10:00' }
    ],
    onb: { employee: 'Nur Aisyah Binti Rahim', role: 'Lecturer', startDate: '2026-11-04', pkg: 'Educator Kit', address: '12 Jalan Ampang, 50450 Kuala Lumpur', devices: ['Lenovo ThinkPad X1 Carbon', 'Logitech MX Master 3S'] } },
  { id: 'ONB-1192', client: 'digital', type: 'onboarding', cc: 'AU', start: '2026-10-14T09:00', done: ['2026-10-14T15:00'],
    stage: 'Procuring', owner: ['JL', 'Jia Ling'], blocker: '', note: ['Jia Ling', 'XPS 15 allocated from Sydney Hub stock; dock on order'],
    lines: [
      { item: 'Dell XPS 15', received: '2026-10-14T15:00', note: 'From hub stock' },
      { item: 'Dell UltraSharp U2723QE', received: '2026-10-15T10:00' },
      { item: 'Dell WD19S dock', received: null, eta: '2026-10-16' }
    ],
    onb: { employee: 'Liam O\'Connor', role: 'Software Engineer', startDate: '2026-11-10', pkg: 'Developer Tier 2', address: '40 Bridge St, Sydney NSW 2000', devices: ['Dell XPS 15', 'Dell UltraSharp U2723QE', 'Dell WD19S dock'] } },
  { id: 'ONB-1188', client: 'finance', type: 'onboarding', cc: 'GB', start: '2026-10-13T09:00', done: ['2026-10-13T11:00'],
    stage: 'Awaiting stock', owner: ['JL', 'Jia Ling'], blocker: '', note: ['Jia Ling', 'Vendor backorder on the 14" model, offered 16" as substitute'],
    lines: [
      { item: 'MacBook Pro 14" M3', received: null, eta: '2026-10-23', revised: 'Vendor backorder, ETA moved from 16 Oct' },
      { item: 'Dell UltraSharp U2723QE', received: '2026-10-14T16:00' }
    ],
    onb: { employee: 'Olivia Hart', role: 'Financial Analyst', startDate: '2026-11-03', pkg: 'Analyst Standard', address: '25 Bank St, London E14 5JP', devices: ['MacBook Pro 14" M3', 'Dell UltraSharp U2723QE'] } },
  { id: 'ONB-1186', client: 'acme', type: 'onboarding', cc: 'SG', start: '2026-10-13T22:00', done: ['2026-10-14T09:00', '2026-10-15T19:00'],
    stage: 'Imaging · Jamf enrolment today', owner: ['Q', 'Qonit'], blocker: '', note: ['Qonit', 'Device at Singapore Hub, Jamf enrolment running'],
    onb: { employee: 'Sophie Tan', role: 'Backend Engineer', startDate: '2026-10-19', pkg: 'Developer Tier 1', address: '1 Raffles Place, Tower 2, #28-01, Singapore 048616', devices: ['MacBook Pro 14" M3', 'Logitech MX Master 3S'] } },
  { id: 'ONB-1185', client: 'cloud', type: 'onboarding', cc: 'US', start: '2026-10-12T09:00', done: ['2026-10-12T15:00', '2026-10-14T12:00', '2026-10-16T06:00'],
    stage: 'Packed, label created', owner: ['AI', 'Aisha'], blocker: '', note: ['Aisha', 'Intune profile applied, courier pickup this afternoon'],
    onb: { employee: 'Ryan Cooper', role: 'Platform Engineer', startDate: '2026-10-27', pkg: 'Developer Tier 1', address: '1801 California St, Denver, CO 80202', devices: ['Dell XPS 15', 'Logitech MX Master 3S'] } },
  { id: 'ONB-1184', client: 'northwind', type: 'onboarding', cc: 'US', start: '2026-10-10T09:00', done: ['2026-10-10T15:00', '2026-10-12T16:00', '2026-10-13T12:00', '2026-10-14T11:00'],
    stage: 'In transit · ETA 18 Oct', owner: ['M', 'Marcus'], blocker: '', note: ['Marcus', 'FedEx tracking normal'],
    onb: { employee: 'James Whitfield', role: 'Clinical Lead', startDate: '2026-10-21', pkg: 'Clinical Standard', address: '600 Brookline Ave, Boston, MA 02215', devices: ['MacBook Air 13" M2'] } },
  { id: 'ONB-1179', client: 'mediaworks', type: 'onboarding', cc: 'SG', start: '2026-10-06T09:00', done: ['2026-10-07T10:00', '2026-10-09T15:00', '2026-10-10T11:00', '2026-10-13T10:00', '2026-10-16T08:00'],
    stage: 'Awaiting employee sign-off', owner: ['AI', 'Aisha'], blocker: '', note: ['Aisha', 'Delivered to reception this morning'],
    onb: { employee: 'Mei Lin Tan', role: 'Content Producer', startDate: '2026-10-20', pkg: 'Designer Pro', address: '9 Raffles Blvd, Singapore 039596', devices: ['MacBook Pro 16" M3 Max', 'Apple Magic Keyboard'] } },
  { id: 'OFF-2044', client: 'techglobal', type: 'offboarding', cc: 'US', start: '2026-10-09T10:00', done: ['2026-10-10T15:00', '2026-10-14T03:00'],
    stage: 'In Transit', owner: ['JL', 'Jia Ling'], blocker: '', note: ['Jia Ling', 'Tracking stalled at Memphis hub, opened trace with FedEx'], href: '/pages/tracker/offboarding-detail.html' },
  { id: 'RED-0318', client: 'techglobal', type: 'redeploy', cc: 'US', start: '2026-10-13T19:00', done: [],
    stage: 'Collection booked', owner: ['JL', 'Jia Ling'], blocker: 'Austin IT room closed until 17 Oct', note: ['Jia Ling', 'Sarah Kim confirmed the room reopens Friday; FedEx rebooked for 09:00'], href: '/pages/tracker/redeployments.html' },
  { id: 'DSP-0207', client: 'finance', type: 'disposal', cc: 'SG', start: '2026-10-08T10:00', done: ['2026-10-10T16:00'],
    stage: 'Data wipe', owner: ['AI', 'Aisha'], blocker: 'Wipe failed on 1 of 4 drives', note: ['Aisha', 'Re-running NIST wipe on the failed SSD, physical shred if it fails again'], href: '/pages/tracker/disposal.html' },
  { id: 'STO-0142', client: 'cloud', type: 'storage', cc: 'US', start: '2026-10-14T09:00', done: [],
    stage: 'In transit', owner: ['AI', 'Aisha'], blocker: '', note: ['Aisha', '3 monitors from Denver office, FedEx ETA 18 Oct'], href: '/pages/tracker/storage.html' },
  { id: 'RED-0311', client: 'mediaworks', type: 'redeploy', cc: 'SG', start: '2026-10-14T21:00', done: ['2026-10-14T21:00'], skipCollection: true,
    stage: 'QC and wipe', owner: ['AI', 'Aisha'], blocker: '', note: ['Aisha', 'Wipe certificate generated, QC bench slot tomorrow AM'], href: '/pages/tracker/redeployments.html' },
  { id: 'ORD-30455', client: 'acme', type: 'stock', cc: 'SG', start: '2026-10-16T07:00', done: ['2026-10-16T08:00'],
    stage: 'Picking', owner: ['M', 'Marcus'], blocker: '', note: ['Marcus', 'Allocated from Singapore Hub (C02WR9T6MD6T)'] },
  { id: 'REP-0874', client: 'digital', type: 'repair', cc: 'GB', assetSerials: ['PF3QW8ZN'], start: '2026-10-14T10:00', done: ['2026-10-14T12:00', '2026-10-15T13:00'],
    stage: 'In Repair', owner: ['JL', 'Jia Ling'], blocker: '', note: ['Jia Ling', 'Booked with FixPoint London, drop-off Thursday'], href: '/pages/tracker/work-order.html' },
  { id: 'ONB-1190', client: 'techglobal', type: 'onboarding', cc: 'SG', start: '2026-10-13T09:00', done: ['2026-10-13T15:00', '2026-10-15T10:00', '2026-10-16T09:00'],
    stage: 'Shipping kit', owner: ['Q', 'Qonit'], blocker: '', note: ['Qonit', 'Kit packed, courier label created for Monday'],
    onb: { employee: 'Hannah Lee', role: 'Sales Manager', startDate: '2026-10-20', pkg: 'Sales Standard', address: '3 Temasek Ave, #18-00, Singapore 039190', devices: ['MacBook Air 13" M2', 'Jabra Evolve2 65'] } }
];

TRACKER_ITEMS.filter(i => i.onb).forEach(i => { i.href = `/pages/tracker/onboarding-detail.html?id=${i.id}`; });
// Open purchase orders join the cross-service view when the Orders module is loaded (orders-data.js + orders-engine.js)
if (typeof orderTrackerItems === 'function') TRACKER_ITEMS.push(...orderTrackerItems());

const TRACKER_MILESTONE_STORAGE = 'tracker-milestone-state-v1';
const TRACKER_AUDIT_STORAGE = 'tracker-audit-v1';
const TRACKER_HANDOVER_STORAGE = 'tracker-handover-notes-v1';

function readTrackerStorage(key, fallback = {}) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
}

const trackerPersistedState = readTrackerStorage(TRACKER_MILESTONE_STORAGE);
TRACKER_ITEMS.forEach(item => {
  const saved = trackerPersistedState[item.id];
  if (saved) {
    item.milestoneActions = saved.milestoneActions || {};
    if (saved.stage) item.stage = saved.stage;
  }
});

const hoursBetween = (a, b) => (new Date(b) - new Date(a)) / 36e5;

function fmtHours(h) {
  const abs = Math.abs(h);
  if (abs < 1) return `${Math.round(abs * 60)}m`;
  if (abs < 24) return `${Math.floor(abs)}h${abs % 1 >= 1 / 60 ? ` ${Math.round((abs % 1) * 60)}m` : ''}`;
  const d = Math.floor(abs / 24);
  const r = Math.round(abs % 24);
  return r ? `${d}d ${r}h` : `${d}d`;
}

const fmtTarget = (v, unit) => `${v}${SLA_UNITS[unit].short}`;
const fmtDate = d => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// Purchase orders live in the Orders module (orders-engine.js); their health comes from there when it's loaded
function trackerSla(item) {
  if (item.order && typeof orderSla === 'function') return orderSla(item.order);
  const type = slaType(item.type);
  const ov = SLA_OVERRIDES[slaKey(item.client, item.type, item.cc)];
  const targets = slaEffective(ov, SLA_DEFAULTS[item.type][item.cc]);
  const direct = item.route && item.route !== 'hub';
  const steps = type.milestones.map((m, i) => {
    const skipped = (m.conditional && item.skipCollection) || (m.hubOnly && direct);
    const custom = !!(ov && ov[i] !== null && ov[i] !== undefined);
    // Synced vendor step: this order's quote + grace, unless the client has a fixed target
    let quote = null;
    if (m.synced && !custom && item.vendor) {
      quote = { vendor: item.vendor, range: SUPPLY_SUPPLIERS[item.vendor].leadTimes[item.cc] };
      targets[i] = quote.range[1] + SLA_DEFAULTS[item.type][item.cc][i];
    }
    const hours = m.fixed || skipped ? 0 : targets[i] * HOURS[m.unit];
    return { m, i, target: targets[i], hours, custom, skipped, quote };
  });
  // done[] contains the seeded completion prefix; milestoneActions stores later operator actions.
  const active = steps.filter(st => !st.skipped);
  let previousAt = item.start;
  let foundCurrent = false;
  active.forEach((st, n) => {
    const action = item.milestoneActions?.[st.m.key];
    const legacyDoneAt = n < item.done.length ? item.done[n] : null;
    const terminalAt = action?.at || legacyDoneAt;
    st.actual = null;
    if (action?.action === 'skip') {
      st.state = 'skipped'; st.doneAt = action.at; st.skipReason = action.reason;
      previousAt = action.at;
    } else if (action?.action === 'complete') {
      st.state = 'done'; st.doneAt = action.at; st.actual = hoursBetween(previousAt, action.at);
      previousAt = action.at;
    } else if (legacyDoneAt) {
      st.state = 'done'; st.doneAt = legacyDoneAt; st.actual = hoursBetween(previousAt, legacyDoneAt);
      previousAt = legacyDoneAt;
    } else if (!foundCurrent) {
      st.state = 'current'; st.startedAt = previousAt; st.actual = hoursBetween(previousAt, TRACKER_NOW);
      foundCurrent = true;
    } else {
      st.state = 'upcoming';
    }
    if (!terminalAt && st.state === 'upcoming') st.actual = null;
  });
  steps.filter(st => st.skipped).forEach(st => { st.state = 'skipped'; st.actual = null; });
  const cur = active.find(st => st.state === 'current') || null;
  const remaining = cur ? cur.hours - cur.actual : 0;
  const ratio = cur && cur.hours ? cur.actual / cur.hours : 0;
  // Per-line milestone: done when the last line arrives, so a line ETA past the due time is a projected breach
  let lines = null;
  if (cur?.m.perLine && item.lines) {
    const curStart = cur.startedAt;
    const due = new Date(new Date(curStart).getTime() + cur.hours * 36e5);
    const late = item.lines.filter(l => !l.received && l.eta && new Date(`${l.eta}T17:00:00`) > due);
    lines = { total: item.lines.length, received: item.lines.filter(l => l.received).length, late, due };
  }
  let health = !cur ? 'complete' : remaining < 0 ? 'breached' : ratio >= SLA_AT_RISK ? 'risk' : 'ok';
  if (lines && lines.late.length && health !== 'breached') health = 'risk';
  const totalHours = steps.reduce((n, s) => n + s.hours, 0);
  const due = new Date(new Date(item.start).getTime() + totalHours * 36e5);
  const index = cur ? active.indexOf(cur) : active.length;
  return { type, steps, active, cur, index, remaining, ratio, health, totalHours, due, lines, route: item.route || 'hub', custom: steps.some(s => s.custom) };
}

const routeTagHtml = s => (s.route === 'hub' ? '' : `<span class="route-tag">${SLA_ROUTES[s.route].short}</span>`);

const fmtDay = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

function linesSummaryHtml(s) {
  if (!s.lines) return '';
  const { received, total, late } = s.lines;
  return `<div class="lines-progress${late.length ? ' lines-late' : ''}">${received} of ${total} lines received${late.length ? ` · ⚠ ${late.length} ETA after due date` : ''}</div>`;
}

const HEALTH_PILL = { ok: ['sla-ok', 'On track'], risk: ['sla-risk', 'At risk'], breached: ['sla-breached', 'Breached'], complete: ['sla-ok', 'Complete'] };
const HEALTH_ORDER = { breached: 0, risk: 1, ok: 2 };

// Most overdue first, then by share of the milestone used
function trackerSorted() {
  return TRACKER_ITEMS.map(item => ({ item, s: trackerSla(item) })).sort((a, b) =>
    HEALTH_ORDER[a.s.health] - HEALTH_ORDER[b.s.health] || (a.s.health === 'breached' ? a.s.remaining - b.s.remaining : b.s.ratio - a.s.ratio));
}

function runwayHtml(s) {
  if (!s.cur) return '<div class="runway"><div class="runway-label">All milestones complete</div></div>';
  const cls = s.health === 'breached' ? 'overdue' : s.health === 'risk' ? 'risk' : '';
  const f = s.fmt || fmtHours;
  const label = s.remaining < 0 ? `${f(s.remaining)} overdue` : `${f(s.remaining)} left`;
  return `<div class="runway"><div class="runway-label ${cls}">${label}</div><div class="runway-bar"><div class="runway-fill ${cls}" style="width: ${Math.min(100, Math.round(s.ratio * 100))}%;"></div></div>
    <div class="runway-sub">of ${fmtTarget(s.cur.target, s.cur.m.unit)}${s.fmt ? ' business' : ''} ${s.cur.custom ? 'custom' : s.cur.quote ? 'vendor lead time' : 'default'}${s.paused ? ' · paused' : ''}</div></div>`;
}

function trackerRowsHtml() {
  return trackerSorted().map(({ item, s }) => {
    const client = WH_CLIENTS.find(c => c.id === item.client);
    const [icon, typeName] = TRACKER_TYPE_ICON[item.type];
    const [pillCls, pillText] = HEALTH_PILL[s.health];
    return `<tr${item.href ? ` data-href="${item.href}"` : ''}>
      <td class="card-id">${item.id}</td>
      <td>${escapeHtml(client.name)}<div class="runway-sub">${WH_COUNTRIES[item.cc][0]} ${item.cc}</div></td>
      <td><span class="type-icon" data-tooltip="${typeName} · ${s.type.name}">${icon}</span></td>
      <td><div class="ms-current">${s.cur ? `<span class="ms-current-step">${s.index + 1}/${s.active.length}</span> ${s.cur.m.label} ${routeTagHtml(s)}` : 'Complete'}</div>${linesSummaryHtml(s)}<div class="runway-sub">${escapeHtml(item.stage)}</div></td>
      <td><div class="owner-cell"><span class="card-avatar">${item.owner[0]}</span>${item.owner[1]}</div></td>
      <td class="${item.blocker ? 'blocker-text' : 'text-muted'}">${item.blocker ? escapeHtml(item.blocker) : '—'}</td>
      <td>${runwayHtml(s)}</td>
      <td><span class="sla-pill ${pillCls}">${pillText}</span></td>
      <td><span class="note-preview"><strong>${item.note[0]}:</strong> ${escapeHtml(item.note[1])}</span></td>
    </tr>`;
  }).join('');
}

// Detail pages: milestone list with target vs actual, rendered into [data-sla-item]
function renderMilestoneCard(el) {
  const item = TRACKER_ITEMS.find(x => x.id === el.dataset.slaItem);
  const s = trackerSla(item);
  const client = WH_CLIENTS.find(c => c.id === item.client);
  const slaLink = s.custom
    ? `/pages/sla-config/exceptions.html?client=${item.client}&type=${item.type}&country=${item.cc}`
    : `/pages/sla-config/standard.html?country=${item.cc}`;
  el.innerHTML = `
    <ol class="ms-track">
      ${s.steps.map(st => {
        const target = st.m.fixed ? st.m.fixed : fmtTarget(st.target, st.m.unit);
        const tag = st.custom ? '<span class="ms-custom">custom</span>' : st.quote ? `<span class="synced-tag" title="${SUPPLY_SUPPLIERS[st.quote.vendor].name} lead time ${supplyRangeLabel(st.quote.range)} + grace">${SUPPLY_SUPPLIERS[st.quote.vendor].name}</span>` : '';
        let detail = '';
        if (st.state === 'done') {
          const late = st.actual > st.hours;
          detail = `<span class="${late ? 'ms-late' : 'ms-ok'}">${fmtHours(st.actual)}</span> of ${target}${late ? ' · late' : ''}`;
        } else if (st.state === 'current') {
          detail = `<span class="${s.health === 'breached' ? 'ms-late' : s.health === 'risk' ? 'ms-risk' : ''}">${fmtHours(st.actual)}</span> of ${target} · ${s.remaining < 0 ? `${fmtHours(s.remaining)} overdue` : `${fmtHours(s.remaining)} left`}`;
        } else if (st.state === 'skipped') {
          detail = st.skipReason ? `Skipped · ${escapeHtml(st.skipReason)}` : st.m.hubOnly ? `Not needed · ${SLA_ROUTES[s.route].label.toLowerCase()}` : 'Not needed · device already at hub';
        } else {
          detail = `Target ${target}`;
        }
        const perLine = st.state === 'current' && s.lines ? linesSummaryHtml(s) : st.m.perLine && st.state === 'upcoming' ? '<div class="ms-detail">Measured on the last line received</div>' : '';
        return `<li class="ms-${st.state}${st.state === 'current' ? ` ms-health-${s.health}` : ''}">
          <div class="ms-name">${st.m.label} ${tag}</div><div class="ms-detail">${detail}</div>${perLine}</li>`;
      }).join('')}
    </ol>
    <div class="info-grid ms-summary">
      <div class="info-row"><span class="info-label">End-to-end target</span><span class="info-value">${fmtHours(s.totalHours)}</span></div>
      <div class="info-row"><span class="info-label">Due</span><span class="info-value">${s.cur ? fmtDate(s.due) : 'Completed'}</span></div>
      <div class="info-row"><span class="info-label">SLA source</span><span class="info-value">${s.custom ? `${escapeHtml(client.name)} custom` : `${WH_COUNTRIES[item.cc][1]} default`}</span></div>
      ${item.lines ? `<div class="info-row"><span class="info-label">Route</span><span class="info-value">${SLA_ROUTES[s.route].label}</span></div>` : ''}
      ${item.lines && s.route === 'hub' ? `<div class="info-row"><span class="info-label">Dispatch</span><span class="info-value">${SLA_SPLIT_DELIVERY[item.client] ? 'Split allowed' : 'Ship complete'}</span></div>` : ''}
    </div>
    <a href="${slaLink}" class="link-sm">View ${s.type.name} SLA</a>`;

  document.querySelectorAll(`[data-sla-pill="${item.id}"]`).forEach(p => {
    const [cls, text] = HEALTH_PILL[s.health];
    p.className = `sla-pill ${cls}`;
    p.textContent = text;
  });
}

document.querySelectorAll('[data-sla-item]').forEach(renderMilestoneCard);

function trackerSave(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) { console.warn('Tracker changes could not be saved locally.', error); }
}

function trackerTimestamp(value = new Date()) {
  return new Date(value).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function trackerSampleAuditEntries(itemId) {
  const item = TRACKER_ITEMS.find(entry => entry.id === itemId);
  if (!item) return [];
  const entries = [{
    itemId,
    action: 'Request created',
    detail: `${item.type === 'onboarding' ? 'Onboarding' : item.type === 'offboarding' ? 'Offboarding' : item.type === 'repair' ? 'Repair' : 'Tracker'} request opened`,
    actor: item.owner?.[1] || 'System',
    timestamp: item.start,
    when: trackerTimestamp(item.start)
  }];
  trackerSla(item).active.forEach(step => {
    if (step.state !== 'done' || !step.doneAt) return;
    entries.push({
      itemId,
      action: 'Milestone completed',
      detail: step.m.label,
      actor: item.owner?.[1] || 'System',
      timestamp: step.doneAt,
      when: trackerTimestamp(step.doneAt)
    });
  });
  return entries;
}

function trackerAuditEntries(itemId) {
  const entries = readTrackerStorage(TRACKER_AUDIT_STORAGE, []);
  const saved = Array.isArray(entries) ? entries.filter(entry => entry.itemId === itemId) : [];
  return [...saved, ...trackerSampleAuditEntries(itemId)].sort((a, b) => {
    const timeA = Date.parse(a.timestamp || a.when) || 0;
    const timeB = Date.parse(b.timestamp || b.when) || 0;
    return timeB - timeA;
  });
}

function renderTrackerAudit(itemId) {
  const feed = document.querySelector('[data-tracker-audit]');
  if (!feed) return;
  const entries = trackerAuditEntries(itemId);
  feed.innerHTML = entries.length ? entries.map(entry => `<div class="timeline-item">
    <div class="timeline-dot"></div><div class="timeline-head"><strong>${escapeHtml(entry.action)}</strong><span class="channel-tag">UI</span></div>
    <div class="timeline-meta">${escapeHtml(entry.when)} · ${escapeHtml(entry.actor || 'You')}</div>
    ${entry.detail ? `<div class="timeline-text">${escapeHtml(entry.detail)}</div>` : ''}
  </div>`).join('') : '<p class="text-muted" data-audit-empty>No actions recorded yet.</p>';
}

function recordTrackerAudit(itemId, action, detail = '') {
  const entries = readTrackerStorage(TRACKER_AUDIT_STORAGE, []);
  const list = Array.isArray(entries) ? entries : [];
  const now = new Date();
  list.unshift({ itemId, action, detail, actor: 'You', timestamp: now.toISOString(), when: trackerTimestamp(now) });
  trackerSave(TRACKER_AUDIT_STORAGE, list);
  renderTrackerAudit(itemId);
}
window.recordTrackerAudit = recordTrackerAudit;

function appendTrackerHandoverNote(itemId, text, actor = 'You', when = trackerTimestamp()) {
  const notesByItem = readTrackerStorage(TRACKER_HANDOVER_STORAGE);
  const notes = notesByItem[itemId] || [];
  notes.unshift({ text, actor, when });
  notesByItem[itemId] = notes;
  trackerSave(TRACKER_HANDOVER_STORAGE, notesByItem);
  const feed = document.querySelector('.handover-card .handover-feed');
  if (feed) {
    const item = document.createElement('div');
    item.className = 'handover-item';
    item.innerHTML = `<div class="card-avatar">${actor === 'You' ? 'Y' : escapeHtml(actor.slice(0, 1))}</div><div><div class="activity-header"><strong>${escapeHtml(actor)}</strong><span class="activity-time">${escapeHtml(when)}</span></div><div class="activity-message"></div></div>`;
    item.querySelector('.activity-message').textContent = text;
    feed.prepend(item);
  }
}
window.appendTrackerHandoverNote = appendTrackerHandoverNote;

function renderPersistedHandoverNotes(itemId) {
  const notesByItem = readTrackerStorage(TRACKER_HANDOVER_STORAGE);
  const notes = notesByItem[itemId] || [];
  const feed = document.querySelector('.handover-card .handover-feed');
  if (!feed) return;
  notes.slice().reverse().forEach(note => {
    const item = document.createElement('div');
    item.className = 'handover-item';
    item.innerHTML = `<div class="card-avatar">${note.actor === 'You' ? 'Y' : escapeHtml((note.actor || '?').slice(0, 1))}</div><div><div class="activity-header"><strong>${escapeHtml(note.actor || 'You')}</strong><span class="activity-time">${escapeHtml(note.when || '')}</span></div><div class="activity-message"></div></div>`;
    item.querySelector('.activity-message').textContent = note.text;
    feed.prepend(item);
  });
}

function trackerModal() {
  let overlay = document.getElementById('trackerMilestoneModal');
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'trackerMilestoneModal';
  overlay.innerHTML = `<form class="modal" role="dialog" aria-modal="true" aria-labelledby="trackerModalTitle">
    <div class="modal-header"><h2 class="modal-title" id="trackerModalTitle"></h2><button type="button" class="modal-close" aria-label="Close">×</button></div>
    <div class="modal-body"><p id="trackerModalPrompt"></p><div class="form-group"><label class="form-label" for="trackerActionNote" id="trackerActionNoteLabel"></label><textarea class="form-textarea" id="trackerActionNote" rows="4"></textarea><div class="info-line" id="trackerActionError" role="alert" hidden></div></div></div>
    <div class="modal-footer"><button type="button" class="btn btn-secondary" data-modal-cancel>Cancel</button><button type="submit" class="btn btn-primary" id="trackerActionConfirm"></button></div>
  </form>`;
  document.body.append(overlay);
  overlay.addEventListener('click', event => { if (event.target === overlay || event.target.closest('[data-modal-cancel], .modal-close')) overlay.classList.remove('show'); });
  return overlay;
}

function persistTrackerItem(item) {
  const saved = readTrackerStorage(TRACKER_MILESTONE_STORAGE);
  saved[item.id] = { milestoneActions: item.milestoneActions || {}, stage: item.stage };
  trackerSave(TRACKER_MILESTONE_STORAGE, saved);
}

function refreshTrackerDetail(item) {
  const s = trackerSla(item);
  const card = document.querySelector(`[data-sla-item="${item.id}"]`);
  if (card) renderMilestoneCard(card);
  const stepper = document.querySelector('[data-tracker-stepper]');
  if (stepper) {
    stepper.innerHTML = s.active.map((st, n) => {
      const cls = st.state === 'done' ? 'done' : st.state === 'current' ? ({ breached: 'current', risk: 'current-risk', ok: 'current-ok' }[s.health] || 'current') : '';
      const label = st.state === 'done' ? onbFmtTrackerDate(st.doneAt) : st.state === 'skipped' ? 'Skipped' : st.state === 'current' ? `${fmtHours(s.remaining)} ${s.remaining < 0 ? 'overdue' : 'left'}` : '';
      return `<li class="${cls}"><span class="stage-dot">${st.state === 'done' ? '✓' : n + 1}</span><span class="stage-name">${escapeHtml(st.m.label)}</span><span class="stage-date">${escapeHtml(label)}</span></li>`;
    }).join('');
  }
  const status = document.querySelector('[data-tracker-current-status]');
  if (status) status.textContent = s.cur ? s.cur.m.label : 'Complete';
  const titleBadge = document.querySelector('[data-tracker-status-badge]');
  if (titleBadge) titleBadge.textContent = s.cur ? s.cur.m.label : 'Complete';
  const buttons = document.querySelectorAll('[data-tracker-milestone-action]');
  buttons.forEach(button => { button.disabled = !s.cur; });
}

function onbFmtTrackerDate(date) {
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function initTrackerDetailActions() {
  const slaEl = document.querySelector('[data-sla-item]');
  const item = slaEl && TRACKER_ITEMS.find(entry => entry.id === slaEl.dataset.slaItem);
  if (!item) return;
  if (slaEl.dataset.trackerActionsInitialized === 'true') return;
  slaEl.dataset.trackerActionsInitialized = 'true';
  const pageContent = slaEl.closest('.page-content');
  if (!pageContent.querySelector('[data-tracker-audit-card]')) {
    const auditCard = document.createElement('section');
    auditCard.className = 'card mb-lg';
    auditCard.dataset.trackerAuditCard = '';
    auditCard.innerHTML = `<div class="card-header"><h3 class="card-title">Audit trail</h3></div><div class="card-body"><div class="timeline" data-tracker-audit></div></div>`;
    pageContent.append(auditCard);
  }
  renderTrackerAudit(item.id);
  renderPersistedHandoverNotes(item.id);
  refreshTrackerDetail(item);

  const overlay = trackerModal();
  const contactModal = document.getElementById('contactClientAdminModal');
  const contactButton = document.getElementById('contactClientAdmin');
  if (contactModal && contactButton) {
    contactButton.addEventListener('click', () => contactModal.classList.add('show'));
    contactModal.addEventListener('click', event => {
      if (event.target === contactModal || event.target.closest('[data-contact-modal-close]')) contactModal.classList.remove('show');
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') contactModal.classList.remove('show');
    });
  }
  document.querySelectorAll('[data-tracker-milestone-action]').forEach(button => button.addEventListener('click', () => {
    const s = trackerSla(item);
    if (!s.cur) return;
    const action = button.dataset.trackerMilestoneAction;
    const title = action === 'complete' ? 'Complete current milestone' : 'Skip current milestone';
    const modalForm = overlay.querySelector('form');
    overlay.querySelector('#trackerModalTitle').textContent = title;
    overlay.querySelector('#trackerModalPrompt').textContent = action === 'complete'
      ? `Confirm that “${s.cur.m.label}” should be marked as completed? The SLA clock will start for the next milestone.`
      : `Confirm that “${s.cur.m.label}” should be skipped? The SLA clock will start for the next milestone.`;
    overlay.querySelector('#trackerActionNoteLabel').textContent = action === 'complete' ? 'Handover note (optional)' : 'Reason for skipping (required)';
    const note = overlay.querySelector('#trackerActionNote');
    note.value = '';
    note.required = action === 'skip';
    note.placeholder = action === 'complete' ? 'Add context for the next owner or shift…' : 'Explain why this milestone is being skipped…';
    overlay.querySelector('#trackerActionError').hidden = true;
    overlay.querySelector('#trackerActionConfirm').textContent = action === 'complete' ? 'Confirm completion' : 'Confirm skip';
    overlay.classList.add('show');
    note.focus();
    modalForm.onsubmit = event => {
      event.preventDefault();
      const text = note.value.trim();
      if (action === 'skip' && !text) {
        note.focus();
        overlay.querySelector('#trackerActionError').textContent = 'Enter a reason before skipping this milestone.';
        overlay.querySelector('#trackerActionError').hidden = false;
        return;
      }
      const current = trackerSla(item).cur;
      if (!current) { overlay.classList.remove('show'); return; }
      const at = new Date().toISOString();
      item.milestoneActions ||= {};
      item.milestoneActions[current.m.key] = { action, at, reason: text };
      const next = trackerSla(item).cur;
      item.stage = next ? next.m.label : 'Complete';
      persistTrackerItem(item);
      const actionLabel = action === 'complete' ? 'Milestone completed' : 'Milestone skipped';
      recordTrackerAudit(item.id, actionLabel, `${current.m.label}${text ? ` · ${text}` : ''}`);
      if (text) appendTrackerHandoverNote(item.id, action === 'skip' ? `Skipped ${current.m.label}: ${text}` : text);
      overlay.classList.remove('show');
      refreshTrackerDetail(item);
    };
  }));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initTrackerDetailActions);
else initTrackerDetailActions();
