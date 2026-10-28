// Support module: helpdesk tickets with first-response and resolution SLA clocks (targets from SLA configuration,
// client exception else country standard). Waiting on client pauses the resolution clock. Tickets, replies and
// state changes persist for the browser session. Needs hub-data.js and sla-data.js.

const SUPPORT_NOW = new Date('2026-10-16T16:00');
const SUPPORT_KEY = 'sap-support-v1';
const SUPPORT_AT_RISK = 0.75;

const SUPPORT_STAGES = [
  ['submitted', 'Submitted'],
  ['triage', 'Triage'],
  ['progress', 'In progress'],
  ['waiting', 'Waiting on client'],
  ['resolved', 'Resolved']
];
const SUPPORT_STAGE_LABEL = Object.fromEntries(SUPPORT_STAGES);
const SUPPORT_PRIORITIES = ['Urgent', 'High', 'Normal', 'Low'];
const SUPPORT_CATEGORIES = ['Hardware', 'Software', 'Network / VPN', 'Accounts & access', 'Device management / MDM', 'Peripherals', 'Request', 'Other'];
const SUPPORT_SOURCES = ['Platform', 'Email', 'ITSM', 'Phone'];
const SUPPORT_AGENTS = ['Qonit', 'Marcus', 'Jia Ling', 'Aisha'];
// Priority tightens the contract targets: Urgent halves them, Low doubles resolution
const SUPPORT_PRIORITY_FACTOR = { Urgent: [0.5, 0.5], High: [1, 1], Normal: [1, 1], Low: [2, 2] };

const SUPPORT_SEED = [
  { id: 'SUP-5538', client: 'techglobal', cc: 'US', subject: 'Laptop won’t boot after update', requester: 'Sarah Kim', email: 'sarah.kim@techglobal.com', priority: 'Urgent', category: 'Hardware', source: 'ITSM', ref: 'INC0061', stage: 'submitted', owner: '', opened: '2026-10-16T15:00', device: 'Dell XPS 15 · 8HJ2K93',
    thread: [['Sarah Kim', 'requester', '2026-10-16T15:00', 'My XPS shows a black screen after last night’s BIOS update. Fans spin, nothing on screen. I have a client demo at 9am.']] },
  { id: 'SUP-5537', client: 'acme', cc: 'SG', subject: 'Second monitor for home office', requester: 'Wei Jie Lim', email: 'weijie.lim@acmetech.com', priority: 'Low', category: 'Request', source: 'Platform', stage: 'submitted', owner: '', opened: '2026-10-16T12:15',
    thread: [['Wei Jie Lim', 'requester', '2026-10-16T12:15', 'Could I get a second monitor for working from home? Manager approved.']] },
  { id: 'SUP-5536', client: 'mediaworks', cc: 'AU', subject: 'Can’t connect to office Wi-Fi', requester: 'Chloe Nguyen', email: 'chloe.nguyen@mediaworks.com', priority: 'Normal', category: 'Network / VPN', source: 'Email', stage: 'submitted', owner: '', opened: '2026-10-16T14:50',
    thread: [['Chloe Nguyen', 'requester', '2026-10-16T14:50', 'Since yesterday my laptop won’t join MW-Office. Other devices are fine.']] },
  { id: 'SUP-5534', client: 'northwind', cc: 'SG', subject: 'Teams camera not detected', requester: 'Emma Wilson', email: 'emma.wilson@northwind.health', priority: 'High', category: 'Peripherals', source: 'Platform', stage: 'triage', owner: 'Marcus', opened: '2026-10-16T13:30', firstResponse: '2026-10-16T13:55',
    thread: [['Emma Wilson', 'requester', '2026-10-16T13:30', 'External webcam not showing in Teams. Works in the Camera app.'], ['Marcus', 'agent', '2026-10-16T13:55', 'Thanks Emma. Can you tell me the camera model? I’ll check the driver.']] },
  { id: 'SUP-5533', client: 'digital', cc: 'AU', subject: 'Adobe licence expired', requester: 'Isabella Rossi', email: 'isabella.rossi@digitalsolutions.com.au', priority: 'Normal', category: 'Accounts & access', source: 'Platform', stage: 'triage', owner: 'Jia Ling', opened: '2026-10-16T10:00', firstResponse: '2026-10-16T10:40',
    thread: [['Isabella Rossi', 'requester', '2026-10-16T10:00', 'Creative Cloud says my licence expired.'], ['Jia Ling', 'internal', '2026-10-16T10:40', 'Licence pool is managed by Digital’s IT. Checking with Hannah.']] },
  { id: 'SUP-5532', client: 'cloud', cc: 'US', subject: 'Keyboard keys sticking', requester: 'Nathan Ong', email: 'nathan.ong@cloudsystems.io', priority: 'Low', category: 'Hardware', source: 'Email', stage: 'triage', owner: 'Aisha', opened: '2026-10-15T16:00', firstResponse: '2026-10-15T17:10',
    thread: [['Nathan Ong', 'requester', '2026-10-15T16:00', 'A few keys on my MacBook keyboard stick.'], ['Aisha', 'agent', '2026-10-15T17:10', 'Sorry to hear that. Can you send a short video? We may raise a repair.']] },
  { id: 'SUP-5521', client: 'acme', cc: 'SG', subject: 'VPN drops every 20 minutes', requester: 'Priya Raman', email: 'priya.raman@acmetech.com', priority: 'High', category: 'Network / VPN', source: 'Platform', stage: 'progress', owner: 'Qonit', opened: '2026-10-16T09:12', firstResponse: '2026-10-16T09:47', device: 'MacBook Pro 14" M3 · C02XK4M9MD6T', serial: 'C02XK4M9MD6T',
    thread: [
      { who: 'Priya Raman', kind: 'requester', at: '2026-10-16T09:12', text: 'My VPN (GlobalProtect) disconnects roughly every 20 minutes and I have to log in again. Started after Monday’s macOS update. Attaching the VPN log from this morning.', attachments: [{ name: 'vpn-log-priya-oct16.pdf', size: '44 KB' }] },
      { who: 'Jia Ling', kind: 'internal', at: '2026-10-16T09:40', text: 'Two other Acme users on macOS 15.1 reported the same. Likely the GlobalProtect 6.2 profile. Assigning to Qonit.' },
      { who: 'Qonit', kind: 'agent', at: '2026-10-16T09:47', text: 'Hi Priya, we’ve seen this on the latest macOS update and are pushing a new VPN profile to your laptop now. Please allow up to 15 minutes for the profile to apply.', cc: 'it-helpdesk@acmetech.com' },
      { who: 'Qonit', kind: 'internal', at: '2026-10-16T12:20', text: 'Profile reissued via Jamf. If it still drops, escalate to Acme network team about the 20-min idle timeout.' }
    ] },
  { id: 'SUP-5517', client: 'techglobal', cc: 'US', subject: 'Screen flicker on external display', requester: 'Anna Schmidt', email: 'anna.schmidt@techglobal.com', priority: 'Normal', category: 'Peripherals', source: 'ITSM', ref: 'INC0054', stage: 'progress', owner: 'Marcus', opened: '2026-10-15T09:00', firstResponse: '2026-10-15T09:30',
    thread: [['Anna Schmidt', 'requester', '2026-10-15T09:00', 'My Dell monitor flickers every few seconds over USB-C.'], ['Marcus', 'agent', '2026-10-15T09:30', 'Let’s try a different cable first; one is on its way to you.']] },
  { id: 'SUP-5515', client: 'finance', cc: 'SG', subject: 'Outlook keeps asking for password', requester: 'Olivia Hart', email: 'olivia.hart@financeexperts.com', priority: 'High', category: 'Accounts & access', source: 'Phone', stage: 'progress', owner: 'Qonit', opened: '2026-10-16T08:30', firstResponse: '2026-10-16T08:50',
    thread: [['Olivia Hart', 'requester', '2026-10-16T08:30', 'Outlook prompts for my password every hour.'], ['Qonit', 'agent', '2026-10-16T08:50', 'Resetting your token cache remotely now.']] },
  { id: 'SUP-5512', client: 'brightpath', cc: 'MY', subject: 'Printer driver install', requester: 'Nur Aisyah', email: 'nur.aisyah@brightpath.edu', priority: 'Normal', category: 'Software', source: 'Platform', stage: 'progress', owner: 'Aisha', opened: '2026-10-16T11:00', firstResponse: '2026-10-16T11:20',
    thread: [['Nur Aisyah', 'requester', '2026-10-16T11:00', 'Need the staff room printer on my laptop.'], ['Aisha', 'agent', '2026-10-16T11:20', 'Pushing the driver via Intune; give it 30 minutes.']] },
  { id: 'SUP-5509', client: 'acme', cc: 'MY', subject: 'Battery drains overnight', requester: 'Arif Hassan', email: 'arif.hassan@acmetech.com', priority: 'Normal', category: 'Hardware', source: 'Platform', stage: 'waiting', owner: 'Jia Ling', opened: '2026-10-14T10:00', firstResponse: '2026-10-14T10:30', waitingSince: '2026-10-15T15:00', pausedMins: 0,
    thread: [['Arif Hassan', 'requester', '2026-10-14T10:00', 'Battery goes from 100% to 20% overnight with the lid closed.'], ['Jia Ling', 'agent', '2026-10-15T15:00', 'Could you run the battery report we sent and reply with the file?']] },
  { id: 'SUP-5506', client: 'mediaworks', cc: 'SG', subject: 'Access to shared drive', requester: 'Aisha Rahman', email: 'aisha.rahman@mediaworks.com', priority: 'Low', category: 'Accounts & access', source: 'Email', stage: 'waiting', owner: 'Marcus', opened: '2026-10-13T14:00', firstResponse: '2026-10-13T15:00', waitingSince: '2026-10-14T09:00', pausedMins: 0,
    thread: [['Aisha Rahman', 'requester', '2026-10-13T14:00', 'Please give me access to the Finance shared drive.'], ['Marcus', 'agent', '2026-10-14T09:00', 'This needs your manager’s approval. Could you forward it to us?']] },
  { id: 'SUP-5501', client: 'digital', cc: 'GB', subject: 'New mouse not pairing', requester: 'George Patel', email: 'george.patel@digitalsolutions.com.au', priority: 'Low', category: 'Peripherals', source: 'Platform', stage: 'resolved', owner: 'Aisha', opened: '2026-10-14T09:00', firstResponse: '2026-10-14T09:20', resolvedAt: '2026-10-14T11:00',
    thread: [
      { who: 'George Patel', kind: 'requester', at: '2026-10-14T09:00', text: 'MX Master won’t pair. I’ve tried holding the button for 3 seconds but it still doesn’t show up on Bluetooth.' },
      { who: 'Aisha', kind: 'agent', at: '2026-10-14T09:20', text: 'Use the Logi Bolt receiver in the box — that’s the dedicated USB dongle, not Bluetooth. Pairing steps are in the attached guide.', cc: 'it-support@digitalsolutions.com.au', attachments: [{ name: 'logi-bolt-pairing-guide.pdf', size: '120 KB' }] },
      { who: 'George Patel', kind: 'requester', at: '2026-10-14T10:50', text: 'Works now, thanks!' }
    ] },
  { id: 'SUP-5498', client: 'northwind', cc: 'US', subject: 'Zoom audio echo', requester: 'James Whitfield', email: 'james.whitfield@northwind.health', priority: 'Normal', category: 'Software', source: 'Platform', stage: 'resolved', owner: 'Qonit', opened: '2026-10-13T13:00', firstResponse: '2026-10-13T13:40', resolvedAt: '2026-10-13T18:00',
    thread: [['James Whitfield', 'requester', '2026-10-13T13:00', 'People hear an echo when I talk.'], ['Qonit', 'agent', '2026-10-13T13:40', 'Turned on echo cancellation in your Zoom profile; please test.']] }
];

const SUPPORT_TICKETS = [];
(function loadSupport() {
  let saved = null;
  try { saved = JSON.parse(sessionStorage.getItem(SUPPORT_KEY) || 'null'); } catch { sessionStorage.removeItem(SUPPORT_KEY); }
  const list = saved || JSON.parse(JSON.stringify(SUPPORT_SEED));
  list.forEach(t => {
    t.thread = t.thread.map(m => (Array.isArray(m) ? { who: m[0], kind: m[1], at: m[2], text: m[3] } : m));
    t.audit = t.audit || [{ at: t.opened, who: t.source === 'Platform' ? 'System' : 'Esevel', text: `Ticket opened via ${t.source}` }];
    t.pausedMins = t.pausedMins || 0;
  });
  SUPPORT_TICKETS.push(...list);
})();
const saveSupport = () => sessionStorage.setItem(SUPPORT_KEY, JSON.stringify(SUPPORT_TICKETS));

const supportById = id => SUPPORT_TICKETS.find(t => t.id === id);
const supportClient = t => WH_CLIENTS.find(c => c.id === t.client) || { name: t.client, logo: '?' };
const supportUser = () => (window.RBAC ? RBAC.getCurrentUser().name : 'You');
const supportIso = (d = SUPPORT_NOW) => { const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
const minsBetween = (a, b) => (new Date(b) - new Date(a)) / 6e4;

function fmtMins(m) {
  const a = Math.abs(Math.round(m));
  if (a < 60) return `${a}m`;
  if (a < 1440) return `${Math.floor(a / 60)}h${a % 60 ? ` ${a % 60}m` : ''}`;
  const d = Math.floor(a / 1440); const h = Math.round((a % 1440) / 60);
  return `${d}d${h ? ` ${h}h` : ''}`;
}
const fmtSupportTs = s => new Date(s).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// Targets in minutes: client exception else country standard, then priority factor
function supportTargets(t) {
  const std = SLA_DEFAULTS.support[t.cc] || [2, 16];
  const ov = SLA_OVERRIDES[slaKey(t.client, 'support', t.cc)];
  const base = slaEffective(ov, std);
  const f = SUPPORT_PRIORITY_FACTOR[t.priority];
  return { response: base[0] * 60 * f[0], resolution: base[1] * 60 * f[1], custom: !!ov };
}

// Both clocks. Resolution excludes time spent waiting on the client.
function supportSla(t) {
  const tg = supportTargets(t);
  const now = SUPPORT_NOW;
  const respUsed = minsBetween(t.opened, t.firstResponse || now);
  const waitingNow = t.stage === 'waiting' && t.waitingSince ? minsBetween(t.waitingSince, now) : 0;
  const resEnd = t.resolvedAt || now;
  const resUsed = minsBetween(t.opened, resEnd) - t.pausedMins - waitingNow;
  const clock = (used, target, met) => {
    const left = target - used;
    const ratio = used / target;
    return { used, target, left, ratio, met, health: met ? (left >= 0 ? 'met' : 'missed') : left < 0 ? 'breached' : ratio >= SUPPORT_AT_RISK ? 'risk' : 'ok' };
  };
  const response = clock(respUsed, tg.response, !!t.firstResponse);
  const resolution = clock(resUsed, tg.resolution, !!t.resolvedAt);
  resolution.paused = t.stage === 'waiting';
  // The clock that matters now: response until answered, then resolution
  const live = !t.firstResponse ? response : resolution;
  const health = t.stage === 'resolved' ? 'complete' : live.health === 'breached' ? 'breached' : resolution.paused ? 'paused' : live.health;
  return { response, resolution, live, health, custom: tg.custom, liveName: !t.firstResponse ? 'First response' : 'Resolution' };
}

const SUPPORT_HEALTH_PILL = { ok: ['sla-ok', 'On track'], risk: ['sla-risk', 'At risk'], breached: ['sla-breached', 'Breached'], paused: ['sla-paused', 'Paused'], complete: ['sla-ok', 'Resolved'] };

function supportClockText(c, name) {
  if (c.met) return `${name} ${c.health === 'met' ? '✓ met' : '✕ missed'} · ${fmtMins(c.used)}`;
  if (c.paused) return `${name} paused · ${fmtMins(c.left)} left`;
  return c.left < 0 ? `${name} ${fmtMins(c.left)} overdue` : `${name} ${fmtMins(c.left)} left`;
}

function supportAudit(t, text) { t.audit.push({ at: supportIso(), who: supportUser(), text }); }

/* ---------- Actions ---------- */

function supportReply(t, text, internal) {
  return supportReplyWithCc(t, text, internal, '');
}

function supportReplyWithCc(t, text, internal, cc) {
  if (!text.trim()) throw new Error('Write a message first.');
  const msg = { who: supportUser(), kind: internal ? 'internal' : 'agent', at: supportIso(), text: text.trim() };
  if (!internal && cc) msg.cc = cc;
  t.thread.push(msg);
  if (!internal && !t.firstResponse) { t.firstResponse = supportIso(); supportAudit(t, 'First response sent'); }
  if (!internal && ['submitted', 'triage'].includes(t.stage)) supportSetStage(t, 'progress', true);
  if (!t.owner) t.owner = supportUser().split(' ')[0];
  saveSupport();
  return internal ? 'Internal note added.' : `Reply sent to ${t.requester}.`;
}

function supportSetStage(t, stage, silent) {
  if (t.stage === stage) return '';
  const from = t.stage;
  if (from === 'waiting' && t.waitingSince) { t.pausedMins += minsBetween(t.waitingSince, SUPPORT_NOW); t.waitingSince = null; }
  if (stage === 'waiting') t.waitingSince = supportIso();
  if (stage === 'resolved') t.resolvedAt = supportIso();
  if (from === 'resolved') t.resolvedAt = null;
  t.stage = stage;
  supportAudit(t, `Status: ${SUPPORT_STAGE_LABEL[from]} → ${SUPPORT_STAGE_LABEL[stage]}`);
  if (!silent) saveSupport();
  return `${t.id} moved to ${SUPPORT_STAGE_LABEL[stage]}.`;
}

function supportAssign(t, owner) {
  const old = t.owner || 'Unassigned';
  t.owner = owner;
  supportAudit(t, `Owner: ${old} → ${owner || 'Unassigned'}`);
  if (t.stage === 'submitted' && owner) t.stage = 'triage';
  saveSupport();
  return `${t.id} assigned to ${owner || 'nobody'}.`;
}

function supportSetPriority(t, p) {
  const old = t.priority;
  t.priority = p;
  supportAudit(t, `Priority: ${old} → ${p}`);
  saveSupport();
  return `Priority set to ${p}. SLA targets updated.`;
}

function supportCreate(d) {
  const n = Math.max(...SUPPORT_TICKETS.map(t => Number(t.id.split('-')[1]))) + 1;
  const t = { id: `SUP-${n}`, client: d.client, cc: d.cc, subject: d.subject.trim(), requester: d.requester.trim(), email: d.email.trim(), priority: d.priority, category: d.category, source: d.source, ref: d.ref || '', stage: d.owner ? 'triage' : 'submitted', owner: d.owner || '', opened: supportIso(), device: d.device || '', pausedMins: 0,
    thread: [{ who: d.requester.trim(), kind: 'requester', at: supportIso(), text: d.description.trim() }],
    audit: [{ at: supportIso(), who: supportUser(), text: `Ticket raised by Esevel for ${supportClient({ client: d.client }).name} via ${d.source}` }] };
  SUPPORT_TICKETS.unshift(t);
  saveSupport();
  return t;
}

const supportOpen = () => SUPPORT_TICKETS.filter(t => t.stage !== 'resolved');

// Tickets needing attention in the shape the Needs attention queue uses
function supportAttentionItems() {
  return supportOpen().map(t => ({ t, s: supportSla(t) })).filter(({ t, s }) => ['breached', 'risk'].includes(s.health) || (!t.owner && t.stage === 'submitted')).map(({ t, s }) => ({
    id: t.id, kind: 'support', typeLabel: 'Support', icon: '💬', client: t.client, cc: t.cc, title: t.subject,
    stage: SUPPORT_STAGE_LABEL[t.stage], owner: t.owner, blocker: !t.owner ? 'Unassigned' : '', health: s.health === 'paused' ? 'ok' : s.health,
    ratio: s.live.ratio, left: s.live.left, timeText: supportClockText(s.live, s.liveName),
    note: (t.thread.filter(m => m.kind !== 'requester').slice(-1)[0] || t.thread[0]), href: `/pages/support/ticket.html?id=${t.id}`
  }));
}
