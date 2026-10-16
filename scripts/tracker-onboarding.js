// Onboarding board and detail page, driven by TRACKER_ITEMS and the Onboarding SLA milestones.
// Needs hub-data.js, sla-data.js and tracker-sla.js.

const ONB_SOON_DAYS = 3;

const onbItems = () => TRACKER_ITEMS.filter(i => i.onb);
const onbDaysToStart = i => Math.ceil((new Date(`${i.onb.startDate}T00:00:00`) - TRACKER_NOW) / 864e5);
const onbFmtDay = d => new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const onbClient = i => WH_CLIENTS.find(c => c.id === i.client);
const onbIdx = key => slaType('onboarding').milestones.findIndex(m => m.key === key);
// Not yet delivered and starting within ONB_SOON_DAYS
// Milestone position of the current step (hub-only steps are skipped on direct routes)
const onbAt = s => s.cur.i;
const onbStartsSoon = (i, s) => onbAt(s) < onbIdx('setup') && onbDaysToStart(i) <= ONB_SOON_DAYS;

function onbDeviceStatus(s) {
  const at = onbAt(s);
  if (at > onbIdx('delivered')) return ['badge-success', 'Delivered'];
  if (s.route !== 'hub' && at > onbIdx('procured')) return ['badge-success', 'Delivered'];
  if (at > onbIdx('dispatched')) return ['badge-info', 'In transit'];
  if (at > onbIdx('imaged')) return ['badge-info', 'Packed'];
  if (at > onbIdx('procured')) return ['badge-warning', 'Imaging'];
  if (at > onbIdx('initiated')) return ['badge-warning', 'Ordered'];
  return ['badge-warning', 'Not ordered'];
}

function onbCardHtml(i) {
  const s = trackerSla(i);
  const [pillCls, pillText] = HEALTH_PILL[s.health];
  const days = onbDaysToStart(i);
  const startLabel = days < 0 ? `Started ${onbFmtDay(i.onb.startDate)}` : `Starts ${onbFmtDay(i.onb.startDate)}`;
  return `<a class="board-card${i.blocker ? ' blocked' : ''}" href="${i.href}">
    <div class="card-top"><span class="card-id">${i.id}</span></div>
    <div class="card-subject">${escapeHtml(i.onb.employee)}</div>
    <div class="card-client">${escapeHtml(onbClient(i).name)}</div>
    <div class="card-recipient">${startLabel} · <span class="flag">${WH_COUNTRIES[i.cc][0]}</span></div>
    ${i.blocker ? `<span class="blocked-flag">Blocked: ${escapeHtml(i.blocker.toLowerCase())}</span>` : ''}
    ${onbStartsSoon(i, s) ? `<span class="due-soon">Start date in ${days} day${days === 1 ? '' : 's'}</span>` : ''}
    ${linesSummaryHtml(s)}
    <div class="card-tags"><span class="tag-package">${escapeHtml(i.onb.pkg)}</span>${routeTagHtml(s)}<span class="sla-pill ${pillCls}">${pillText}</span></div>
    <div class="card-bottom"><span>${escapeHtml(i.stage)}</span><span class="card-avatar">${i.owner[0]}</span></div>
  </a>`;
}

function renderOnboardingBoard(el) {
  const type = slaType('onboarding');
  const items = onbItems();
  el.innerHTML = type.milestones.map((m, idx) => {
    const cards = items.filter(i => onbAt(trackerSla(i)) === idx);
    return `<section class="board-column">
      <div class="board-column-header">
        <div class="board-column-title">${m.label} <span class="board-count">${cards.length}</span></div>
        <span class="board-avg">${m.hubOnly ? 'Via hub only · ' : ''}SG default ${SLA_DEFAULTS.onboarding.SG[idx]}${SLA_UNITS[m.unit].short}</span>
      </div>
      <div class="board-cards">${cards.map(onbCardHtml).join('') || '<div class="board-empty">Nothing here</div>'}</div>
    </section>`;
  }).join('');
}

function renderOnboardingDetail() {
  const $ = id => document.getElementById(id);
  const id = new URLSearchParams(location.search).get('id');
  const i = onbItems().find(x => x.id === id);
  if (!i) {
    $('onbMain').hidden = true;
    $('onbMissing').hidden = false;
    $('onbCrumb').textContent = 'Not found';
    return;
  }
  const s = trackerSla(i);
  const client = onbClient(i);
  const [pillCls, pillText] = HEALTH_PILL[s.health];
  const days = onbDaysToStart(i);
  document.title = `${i.id} · Onboarding - Admin Portal`;
  $('onbCrumb').textContent = i.id;
  $('onbTitle').textContent = `${i.id} · ${i.onb.employee}`;
  $('onbMeta').innerHTML = `
    <span>${escapeHtml(client.name)}</span><span class="meta-sep">·</span>
    <span><span class="flag">${WH_COUNTRIES[i.cc][0]}</span> ${WH_COUNTRIES[i.cc][1]}</span><span class="meta-sep">·</span>
    <span class="tag-package">${escapeHtml(i.onb.pkg)}</span>
    ${routeTagHtml(s)}
    <span class="badge badge-info">${s.cur.m.label}</span>
    <span class="sla-pill ${pillCls}">${pillText}</span>`;

  const alerts = [];
  if (i.blocker) alerts.push(`<div class="vendor-alert"><span><strong>Blocked: ${escapeHtml(i.blocker.toLowerCase())}.</strong> ${escapeHtml(i.note[1])}</span></div>`);
  if (onbStartsSoon(i, s)) alerts.push(`<div class="onb-soon-alert"><strong>Start date in ${days} day${days === 1 ? '' : 's'}</strong> (${onbFmtDay(i.onb.startDate)}). The kit must be delivered before then.</div>`);
  $('onbAlerts').innerHTML = alerts.join('');

  const stateCls = { breached: 'current', risk: 'current-risk', ok: 'current-ok' }[s.health];
  $('onbStepper').innerHTML = s.active.map((st, n) => {
    const cls = st.state === 'done' ? 'done' : st.state === 'current' ? stateCls : '';
    const dot = st.state === 'done' ? '✓' : n + 1;
    const date = st.state === 'done' ? onbFmtDay(st.doneAt.slice(0, 10)) : st.state === 'current' ? (s.remaining < 0 ? `${fmtHours(s.remaining)} overdue` : `${fmtHours(s.remaining)} left`) : '';
    return `<li class="${cls}"><span class="stage-dot">${dot}</span><span class="stage-name">${st.m.label}</span><span class="stage-date">${date}</span></li>`;
  }).join('');

  $('onbDetails').innerHTML = `
    <div><div class="detail-label">Employee</div><div class="detail-value">${escapeHtml(i.onb.employee)} · ${escapeHtml(i.onb.role)}</div></div>
    <div><div class="detail-label">Start date</div><div class="detail-value${onbStartsSoon(i, s) ? ' onb-soon-text' : ''}">${onbFmtDay(i.onb.startDate)}${days >= 0 ? ` · in ${days} day${days === 1 ? '' : 's'}` : ''}</div></div>
    <div><div class="detail-label">Package</div><div class="detail-value">${escapeHtml(i.onb.pkg)}</div></div>
    <div><div class="detail-label">Delivery route</div><div class="detail-value">${SLA_ROUTES[s.route].label} <span class="text-muted">· chosen at checkout</span></div></div>
    <div><div class="detail-label">Delivery address</div><div class="detail-value${i.onb.address ? '' : ' onb-missing'}">${i.onb.address ? escapeHtml(i.onb.address) : 'Missing · requested from client'}</div></div>
    <div><div class="detail-label">Current status</div><div class="detail-value">${escapeHtml(i.stage)}</div></div>
    <div><div class="detail-label">Raised</div><div class="detail-value">${new Date(i.start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · Workday new-hire sync</div></div>`;

  const [devCls, devText] = onbDeviceStatus(s);
  const lineFor = d => (i.lines || []).find(l => l.item === d);
  const inProcurement = s.cur.m.key === 'procured' && i.lines;
  $('onbDevices').innerHTML = i.onb.devices.map(d => {
    const l = lineFor(d);
    let status = `<span class="badge badge-sm ${devCls}">${devText}</span>`;
    let eta = '<span class="text-muted">—</span>';
    if (inProcurement && l) {
      const late = !l.received && s.lines.late.includes(l);
      const arrived = { hub: 'At hub', site: 'At client site', employee: 'Delivered' }[s.route];
      status = l.received
        ? `<span class="badge badge-sm badge-success">${arrived}</span>${l.note ? `<div class="sla-sub">${escapeHtml(l.note)}</div>` : ''}`
        : `<span class="badge badge-sm ${late ? 'badge-error' : 'badge-warning'}">Ordered</span>`;
      eta = l.received
        ? `Received ${fmtDay(l.received)}`
        : `<span class="${late ? 'ms-late' : ''}">ETA ${fmtDay(l.eta)}${late ? ' · after due date' : ''}</span>${l.revised ? `<div class="sla-sub">${escapeHtml(l.revised)}</div>` : ''}`;
    }
    return `<tr><td>${escapeHtml(d)}</td><td>${status}</td><td>${eta}</td></tr>`;
  }).join('');
  $('onbCount').textContent = i.onb.devices.length;

  // Kit dispatch: only via a hub. Ships complete unless the client allows splits; ops can override for urgent cases
  const waiting = inProcurement && s.route === 'hub' ? i.lines.filter(l => !l.received).length : 0;
  $('onbDispatch').hidden = !waiting;
  if (waiting) {
    const split = SLA_SPLIT_DELIVERY[i.client];
    $('onbDispatch').innerHTML = `
      <div><strong>${s.lines.received} of ${s.lines.total} received.</strong> ${split
        ? `${escapeHtml(client.name)} allows split shipments, so ready items can ship now.`
        : `${escapeHtml(client.name)} ships complete, so the kit waits for the last item (ETA ${fmtDay(i.lines.filter(l => !l.received).map(l => l.eta).sort().pop())}).`}</div>
      <button type="button" class="btn btn-secondary btn-sm" id="onbShipReady">Ship what's ready</button>`;
    $('onbShipReady').addEventListener('click', () => {
      const reason = window.prompt(split ? 'Ship received items now? Add a note for the client:' : 'This adds a second delivery and courier cost. Reason for shipping what\'s ready?', '');
      if (reason === null || (!split && !reason.trim())) return;
      $('onbDispatch').innerHTML = `<div>✓ Ready items queued for dispatch${reason.trim() ? ` · ${escapeHtml(reason.trim())}` : ''}. The rest ships when it arrives.</div>`;
    });
  }

  $('onbOwnerAvatar').textContent = i.owner[0];
  [...$('onbOwner').options].forEach(o => { o.selected = o.textContent === i.owner[1]; });
  $('onbClientAdmin').textContent = { acme: 'Ravi Shah', techglobal: 'Sarah Kim' }[i.client] || `${client.name} IT admin`;
  $('onbNoteFeed').innerHTML = `<div class="handover-item"><div class="card-avatar">${i.owner[0]}</div><div><div class="activity-header"><strong>${i.note[0]}</strong><span class="activity-time">Today</span></div><div class="activity-message">${escapeHtml(i.note[1])}</div></div></div>`;

  const card = $('onbSla');
  card.dataset.slaItem = i.id;
  renderMilestoneCard(card);
}

if (document.getElementById('onbBoard')) renderOnboardingBoard(document.getElementById('onbBoard'));
if (document.getElementById('onbMain')) renderOnboardingDetail();
