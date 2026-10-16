// Tracker health from SLA milestones: each open item is measured against its current milestone's target
// (client custom value, else country default). Needs hub-data.js and sla-data.js.

const SLA_AT_RISK = 0.75;
const TRACKER_NOW = new Date('2026-10-16T13:00:00');
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
  { id: 'ORD-30398', client: 'acme', type: 'regular', cc: 'SG', start: '2026-10-11T09:00', done: ['2026-10-11T10:30', '2026-10-12T11:00'], vendor: 'ingram',
    stage: 'Customs clearance', owner: ['AI', 'Aisha'], blocker: 'Missing import permit', note: ['Aisha', 'Broker needs commercial invoice re-issued with HS codes'] },
  { id: 'ORD-30421', client: 'mediaworks', type: 'regular', cc: 'SG', start: '2026-10-09T10:00', done: ['2026-10-09T12:00', '2026-10-10T09:00'], vendor: 'ingram', route: 'site',
    stage: 'Vendor shipping to MediaWorks office', owner: ['M', 'Marcus'], blocker: '', note: ['Marcus', 'Ingram confirmed the ThinkPad arrives today, inside their 6-day lead time'],
    lines: [
      { item: 'Lenovo ThinkPad X1 Carbon', recipient: 'Kai Wong', received: null, eta: '2026-10-16' },
      { item: 'Logitech MX Master 3S', recipient: 'Kai Wong', received: '2026-10-13T11:00' },
      { item: 'Dell UltraSharp U2723QE', recipient: 'Kai Wong', received: '2026-10-14T15:00' }
    ] },
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
  { id: 'REP-0874', client: 'digital', type: 'repair', cc: 'GB', start: '2026-10-14T10:00', done: ['2026-10-14T12:00', '2026-10-15T13:00'],
    stage: 'In Repair', owner: ['JL', 'Jia Ling'], blocker: '', note: ['Jia Ling', 'Booked with FixPoint London, drop-off Thursday'], href: '/pages/tracker/work-order.html' },
  { id: 'ONB-1190', client: 'techglobal', type: 'onboarding', cc: 'SG', start: '2026-10-13T09:00', done: ['2026-10-13T15:00', '2026-10-15T10:00', '2026-10-16T09:00'],
    stage: 'Shipping kit', owner: ['Q', 'Qonit'], blocker: '', note: ['Qonit', 'Kit packed, courier label created for Monday'],
    onb: { employee: 'Hannah Lee', role: 'Sales Manager', startDate: '2026-10-20', pkg: 'Sales Standard', address: '3 Temasek Ave, #18-00, Singapore 039190', devices: ['MacBook Air 13" M2', 'Jabra Evolve2 65'] } }
];

TRACKER_ITEMS.filter(i => i.onb).forEach(i => { i.href = `/pages/tracker/onboarding-detail.html?id=${i.id}`; });

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

function trackerSla(item) {
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
  // done[] lists completion times of the steps that apply, in order
  const active = steps.filter(st => !st.skipped);
  active.forEach((st, n) => {
    const begin = n === 0 ? item.start : item.done[n - 1];
    st.state = 'upcoming';
    st.actual = null;
    if (n < item.done.length) { st.state = 'done'; st.actual = hoursBetween(begin, item.done[n]); st.doneAt = item.done[n]; }
    else if (n === item.done.length) { st.state = 'current'; st.actual = hoursBetween(begin, TRACKER_NOW); }
  });
  steps.filter(st => st.skipped).forEach(st => { st.state = 'skipped'; st.actual = null; });
  const cur = active[item.done.length];
  const remaining = cur.hours - cur.actual;
  const ratio = cur.actual / cur.hours;
  // Per-line milestone: done when the last line arrives, so a line ETA past the due time is a projected breach
  let lines = null;
  if (cur.m.perLine && item.lines) {
    const curStart = item.done.length ? item.done[item.done.length - 1] : item.start;
    const due = new Date(new Date(curStart).getTime() + cur.hours * 36e5);
    const late = item.lines.filter(l => !l.received && l.eta && new Date(`${l.eta}T17:00:00`) > due);
    lines = { total: item.lines.length, received: item.lines.filter(l => l.received).length, late, due };
  }
  let health = remaining < 0 ? 'breached' : ratio >= SLA_AT_RISK ? 'risk' : 'ok';
  if (lines && lines.late.length && health !== 'breached') health = 'risk';
  const totalHours = steps.reduce((n, s) => n + s.hours, 0);
  const due = new Date(new Date(item.start).getTime() + totalHours * 36e5);
  return { type, steps, active, cur, index: item.done.length, remaining, ratio, health, totalHours, due, lines, route: item.route || 'hub', custom: steps.some(s => s.custom) };
}

const routeTagHtml = s => (s.route === 'hub' ? '' : `<span class="route-tag">${SLA_ROUTES[s.route].short}</span>`);

const fmtDay = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

function linesSummaryHtml(s) {
  if (!s.lines) return '';
  const { received, total, late } = s.lines;
  return `<div class="lines-progress${late.length ? ' lines-late' : ''}">${received} of ${total} lines received${late.length ? ` · ⚠ ${late.length} ETA after due date` : ''}</div>`;
}

const HEALTH_PILL = { ok: ['sla-ok', 'On track'], risk: ['sla-risk', 'At risk'], breached: ['sla-breached', 'Breached'] };
const HEALTH_ORDER = { breached: 0, risk: 1, ok: 2 };

// Most overdue first, then by share of the milestone used
function trackerSorted() {
  return TRACKER_ITEMS.map(item => ({ item, s: trackerSla(item) })).sort((a, b) =>
    HEALTH_ORDER[a.s.health] - HEALTH_ORDER[b.s.health] || (a.s.health === 'breached' ? a.s.remaining - b.s.remaining : b.s.ratio - a.s.ratio));
}

function runwayHtml(s) {
  const cls = s.health === 'breached' ? 'overdue' : s.health === 'risk' ? 'risk' : '';
  const label = s.remaining < 0 ? `${fmtHours(s.remaining)} overdue` : `${fmtHours(s.remaining)} left`;
  return `<div class="runway"><div class="runway-label ${cls}">${label}</div><div class="runway-bar"><div class="runway-fill ${cls}" style="width: ${Math.min(100, Math.round(s.ratio * 100))}%;"></div></div>
    <div class="runway-sub">of ${fmtTarget(s.cur.target, s.cur.m.unit)} ${s.cur.custom ? 'custom' : s.cur.quote ? 'vendor lead time' : 'default'}</div></div>`;
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
      <td><div class="ms-current"><span class="ms-current-step">${s.index + 1}/${s.active.length}</span> ${s.cur.m.label} ${routeTagHtml(s)}</div>${linesSummaryHtml(s)}<div class="runway-sub">${escapeHtml(item.stage)}</div></td>
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
          detail = st.m.hubOnly ? `Not needed · ${SLA_ROUTES[s.route].label.toLowerCase()}` : 'Not needed · device already at hub';
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
      <div class="info-row"><span class="info-label">Due</span><span class="info-value">${fmtDate(s.due)}</span></div>
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
