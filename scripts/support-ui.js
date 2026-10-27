// Support module shell: header (New ticket), Board | List tabs, tiles that filter, shared filter bar and card/row HTML.
// Needs support-data.js.

const SUPPORT_VIEWS = [['board', 'Board', '/pages/support/board.html'], ['list', 'List', '/pages/support/list.html']];

function renderSupportHeader(active) {
  const el = document.getElementById('supportHeader');
  const open = supportOpen().length;
  el.innerHTML = `<div class="page-header module-header">
      <div class="flex-between">
        <h1 class="page-title">Support</h1>
        <div class="header-actions"><a href="/pages/support/new.html" class="btn btn-primary">New ticket</a></div>
      </div>
      <p class="page-description">Helpdesk tickets from employees and client admins. First response and resolution are measured against the client's SLA; waiting on client pauses resolution.</p>
    </div>
    <nav class="tab-strip module-tabs">${SUPPORT_VIEWS.map(([k, l, h]) => `<a href="${h}" class="tab-link${k === active ? ' active' : ''}">${l} <span class="tab-count">${open}</span></a>`).join('')}</nav>`;
}

const SUPPORT_FILTER_KEY = 'sap-support-filters-v1';
const supportFiltersDefault = () => ({ q: '', status: 'open', priority: '', client: '', owner: '', category: '' });
function supportFiltersLoad() {
  let f;
  try { f = { ...supportFiltersDefault(), ...JSON.parse(sessionStorage.getItem(SUPPORT_FILTER_KEY) || '{}') }; } catch { f = supportFiltersDefault(); }
  const p = new URLSearchParams(location.search);
  ['status', 'client', 'owner'].forEach(k => { if (p.get(k)) f[k] = p.get(k); });
  return f;
}
const supportFiltersSave = f => sessionStorage.setItem(SUPPORT_FILTER_KEY, JSON.stringify(f));

const SUPPORT_STATUS_FILTERS = [['open', 'Open'], ['breached', 'Breached'], ['risk', 'At risk'], ['unassigned', 'Unassigned'], ['waiting', 'Waiting on client'], ['mine', 'Assigned to me'], ['resolved', 'Resolved'], ['all', 'All']];

function supportMatches(t, f) {
  const s = supportSla(t);
  const me = supportUser().split(' ')[0];
  const ok = {
    open: t.stage !== 'resolved',
    breached: s.health === 'breached',
    risk: s.health === 'risk',
    unassigned: t.stage !== 'resolved' && !t.owner,
    waiting: t.stage === 'waiting',
    mine: t.stage !== 'resolved' && t.owner === me,
    resolved: t.stage === 'resolved',
    all: true
  }[f.status] ?? true;
  if (!ok) return false;
  if (f.priority && t.priority !== f.priority) return false;
  if (f.client && t.client !== f.client) return false;
  if (f.owner && (f.owner === '_none' ? t.owner : t.owner !== f.owner)) return false;
  if (f.category && t.category !== f.category) return false;
  if (f.q) {
    const hay = [t.id, t.subject, t.requester, t.email, t.ref, supportClient(t).name, t.device].join(' ').toLowerCase();
    if (!hay.includes(f.q.toLowerCase())) return false;
  }
  return true;
}

function supportTilesHtml(f) {
  const open = supportOpen().map(t => ({ t, s: supportSla(t) }));
  const n = h => open.filter(x => x.s.health === h).length;
  const unassigned = open.filter(x => !x.t.owner).length;
  const waiting = open.filter(x => x.t.stage === 'waiting').length;
  const resolvedToday = SUPPORT_TICKETS.filter(t => t.resolvedAt && t.resolvedAt.startsWith(supportIso().slice(0, 10))).length;
  const tile = (status, label, value, cls = '') => `<button type="button" class="summary-tile summary-tile-link ${cls}${f.status === status ? ' active' : ''}" data-status="${status}" aria-pressed="${f.status === status}"><div class="summary-tile-label">${label}</div><div class="summary-tile-value">${value}</div></button>`;
  return tile('open', 'Open', open.length)
    + tile('breached', 'Breached', n('breached'), n('breached') ? 'summary-tile-breached' : '')
    + tile('risk', 'At risk', n('risk'), n('risk') ? 'summary-tile-alert' : '')
    + tile('unassigned', 'Unassigned', unassigned, unassigned ? 'summary-tile-alert' : '')
    + tile('waiting', 'Waiting on client', waiting)
    + tile('resolved', 'Resolved today', resolvedToday, 'summary-tile-ok');
}

function supportFilterBarHtml(f) {
  const opt = (v, l, cur) => `<option value="${escapeHtml(v)}"${v === cur ? ' selected' : ''}>${escapeHtml(l)}</option>`;
  const clients = WH_CLIENTS.filter(c => SUPPORT_TICKETS.some(t => t.client === c.id));
  return `<div class="filter-chips stock-filters order-filters">
    <div class="search-bar search-bar-sm"><span class="search-icon">🔍</span><input type="text" class="search-input" id="sfQ" value="${escapeHtml(f.q)}" placeholder="Ticket, subject, requester" aria-label="Search tickets"></div>
    <label class="filter-select"><span>Status</span><select id="sfStatus">${SUPPORT_STATUS_FILTERS.map(([v, l]) => opt(v, l, f.status)).join('')}</select></label>
    <label class="filter-select"><span>Priority</span><select id="sfPriority">${opt('', 'All', f.priority)}${SUPPORT_PRIORITIES.map(p => opt(p, p, f.priority)).join('')}</select></label>
    <label class="filter-select"><span>Client</span><select id="sfClient">${opt('', 'All', f.client)}${clients.map(c => opt(c.id, c.name, f.client)).join('')}</select></label>
    <label class="filter-select"><span>Owner</span><select id="sfOwner">${opt('', 'All', f.owner)}${opt('_none', 'Unassigned', f.owner)}${SUPPORT_AGENTS.map(a => opt(a, a, f.owner)).join('')}</select></label>
    <label class="filter-select"><span>Category</span><select id="sfCategory">${opt('', 'All', f.category)}${SUPPORT_CATEGORIES.map(c => opt(c, c, f.category)).join('')}</select></label>
    <button type="button" class="btn-text" id="sfReset">Reset</button>
  </div>`;
}

function supportBindControls(tilesEl, filtersEl, f, onChange) {
  const map = { sfQ: 'q', sfStatus: 'status', sfPriority: 'priority', sfClient: 'client', sfOwner: 'owner', sfCategory: 'category' };
  const set = (k, v) => { f[k] = v; supportFiltersSave(f); onChange(); };
  filtersEl.addEventListener('input', e => { if (e.target.id === 'sfQ') set('q', e.target.value); });
  filtersEl.addEventListener('change', e => { if (map[e.target.id] && e.target.tagName === 'SELECT') set(map[e.target.id], e.target.value); });
  filtersEl.addEventListener('click', e => {
    if (e.target.id !== 'sfReset') return;
    Object.assign(f, supportFiltersDefault());
    Object.entries(map).forEach(([id, k]) => { document.getElementById(id).value = f[k]; });
    supportFiltersSave(f);
    onChange();
  });
  tilesEl.addEventListener('click', e => {
    const t = e.target.closest('[data-status]');
    if (!t) return;
    f.status = f.status === t.dataset.status && t.dataset.status !== 'open' ? 'open' : t.dataset.status;
    document.getElementById('sfStatus').value = f.status;
    supportFiltersSave(f);
    onChange();
  });
}

const supportPriorityTag = p => `<span class="priority-tag priority-${p.toLowerCase()}">${p}</span>`;
const supportFlag = cc => `<span class="flag">${WH_COUNTRIES[cc][0]}</span>`;
const supportOwnerHtml = t => (t.owner ? `<span class="card-avatar">${escapeHtml(t.owner.split(' ').map(w => w[0]).join('').slice(0, 2))}</span>${escapeHtml(t.owner)}` : '<span class="card-avatar card-avatar-empty">?</span><span class="text-muted">Unassigned</span>');

function supportClocksHtml(t, s) {
  const cls = c => (c.met ? (c.health === 'met' ? 'clock-met' : 'clock-breached') : c.paused ? 'clock-paused' : c.health === 'breached' ? 'clock-breached' : c.health === 'risk' ? 'clock-risk' : '');
  const val = c => (c.met ? `${c.health === 'met' ? '✓ Met' : '✕ Missed'} · ${fmtMins(c.used)}` : c.paused ? `⏸ ${fmtMins(c.left)} left` : c.left < 0 ? `${fmtMins(c.left)} overdue` : `${fmtMins(c.left)} left`);
  return `<div class="sla-clocks">
    <div class="sla-clock ${cls(s.response)}"><span>First response</span><span>${val(s.response)}</span></div>
    <div class="sla-clock ${cls(s.resolution)}"><span>Resolution</span><span>${val(s.resolution)}</span></div>
  </div>`;
}
