// Support ticket (?id=): header with the next action, status stepper, conversation with reply / internal note,
// sidebar with SLA clocks, details (owner, priority, category) and activity. Needs support-ui.js.

(function initSupportTicket() {
  const root = document.getElementById('tkRoot');
  const id = new URLSearchParams(location.search).get('id') || 'SUP-5521';
  const ui = { mode: 'reply', hideInternal: false, draft: '' };

  function toast(text, error) {
    let el = document.getElementById('spToast');
    if (!el) { el = document.createElement('div'); el.id = 'spToast'; el.className = 'order-toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = text;
    el.className = `order-toast show${error ? ' order-toast-error' : ''}`;
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 3500);
  }
  const run = fn => { try { const m = fn(); if (m) toast(m); render(); } catch (e) { toast(e.message, true); } };

  function render() {
    const t = supportById(id);
    if (!t) { root.innerHTML = `<div class="orders-empty">Ticket ${escapeHtml(id)} not found. <a href="/pages/support/board.html">Back to Support</a></div>`; return; }
    const s = supportSla(t);
    const client = supportClient(t);
    const [pc, pt] = SUPPORT_HEALTH_PILL[s.health];
    document.title = `${t.id} · Support - Admin Portal`;
    document.getElementById('tkCrumb').textContent = t.id;
    const hb = document.getElementById('breadcrumbs');
    if (hb) { const cur = hb.querySelector('.breadcrumb-current'); if (cur) cur.textContent = t.id; }

    // One primary action for where the ticket is
    let primary = '';
    if (!t.owner) primary = '<button type="button" class="btn btn-primary" data-act="take">Assign to me</button>';
    else if (t.stage === 'waiting') primary = '<button type="button" class="btn btn-primary" data-act="resume">Client replied · resume</button>';
    else if (t.stage === 'resolved') primary = '<button type="button" class="btn btn-secondary" data-act="reopen">Reopen</button>';
    else primary = '<button type="button" class="btn btn-primary" data-act="resolve">Resolve</button>';
    const secondary = t.stage !== 'resolved' && t.stage !== 'waiting' && t.owner ? '<button type="button" class="btn btn-secondary" data-act="wait">Waiting on client</button>' : '';

    const stageIdx = SUPPORT_STAGES.findIndex(([k]) => k === t.stage);
    const stepper = `<ol class="stage-stepper">${SUPPORT_STAGES.map(([k, l], i) => {
      const cls = i < stageIdx || t.stage === 'resolved' ? 'done' : i === stageIdx ? `current ${s.health === 'breached' ? 'current-breached' : s.health === 'risk' ? 'current-risk' : t.stage === 'waiting' ? 'current-paused' : 'current-ok'}` : '';
      return `<li class="${cls}"><span class="stage-dot">${i < stageIdx || t.stage === 'resolved' ? '✓' : i + 1}</span><span class="stage-name">${l}</span></li>`;
    }).join('')}</ol>`;

    const avatar = n => escapeHtml(n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase());
    const tag = m => (m.kind === 'requester' ? '<span class="activity-tag">Requester</span>' : m.kind === 'internal' ? '<span class="activity-tag tag-internal">Internal note</span>' : '<span class="activity-tag">Esevel Support</span>');
    const thread = t.thread.filter(m => !ui.hideInternal || m.kind !== 'internal').map(m => `<div class="message${m.kind === 'internal' ? ' message-internal' : ''}">
        <div class="activity-avatar note-avatar${m.kind === 'requester' ? ' msg-avatar-client' : ''}">${avatar(m.who)}</div>
        <div class="message-body"><div class="activity-header"><strong>${escapeHtml(m.who)}</strong>${tag(m)}<span class="activity-time">${fmtSupportTs(m.at)}</span></div><div class="message-text">${escapeHtml(m.text)}</div></div>
      </div>`).join('');
    const internal = ui.mode === 'internal';
    const opt = (v, cur, l = v) => `<option value="${escapeHtml(v)}"${v === cur ? ' selected' : ''}>${escapeHtml(l)}</option>`;
    const clockCls = c => (c.met ? (c.health === 'met' ? 'clock-met' : 'clock-breached') : c.paused ? 'clock-paused' : c.health === 'breached' ? 'clock-breached' : c.health === 'risk' ? 'clock-risk' : '');
    const clockVal = c => (c.met ? `${c.health === 'met' ? '✓ Met' : '✕ Missed'} · ${fmtMins(c.used)}` : c.paused ? `⏸ Paused · ${fmtMins(c.left)} left` : c.left < 0 ? `${fmtMins(c.left)} overdue` : `${fmtMins(c.left)} left`);

    root.innerHTML = `<div class="asset-header order-header">
        <div>
          <h1 class="page-title-edit">${t.id} · ${escapeHtml(t.subject)}</h1>
          <div class="asset-header-meta">
            <span class="badge ${t.stage === 'resolved' ? 'badge-success' : t.stage === 'waiting' ? 'badge-muted' : 'badge-info'}">${SUPPORT_STAGE_LABEL[t.stage]}</span>
            ${supportPriorityTag(t.priority)}<span class="sla-pill ${pc}">${pt}</span>
            <span class="meta-sep">·</span><a href="/pages/clients/detail.html?c=${t.client}" class="link-plain">${escapeHtml(client.name)}</a>
            <span class="meta-sep">·</span><span>${escapeHtml(t.requester)} · ${supportFlag(t.cc)} ${WH_COUNTRIES[t.cc][1]}</span>
            <span class="meta-sep">·</span><span class="text-muted">${escapeHtml(t.source)}${t.ref ? ` · ${escapeHtml(t.ref)}` : ''}</span>
          </div>
        </div>
        <div class="header-actions">${secondary}${primary}</div>
      </div>
      ${stepper}
      <div class="edit-layout">
        <div class="edit-form-column">
          <section class="card mb-lg">
            <div class="card-header"><h3 class="card-title">Conversation</h3><label class="checkbox-label"><input type="checkbox" id="tkHide" ${ui.hideInternal ? 'checked' : ''}> Hide internal notes</label></div>
            <div class="card-body">
              <div class="thread">${thread}</div>
              ${t.stage === 'resolved' ? '<div class="readonly-note">Resolved. Reopen the ticket to reply.</div>' : `<form class="composer${internal ? ' composer-internal' : ''}" id="tkComposer" novalidate>
                <div class="segmented-control segmented-sm" role="group" aria-label="Message type">
                  <button type="button" class="segment-button${internal ? '' : ' active'}" data-mode="reply">Reply to ${escapeHtml(t.requester.split(' ')[0])}</button>
                  <button type="button" class="segment-button${internal ? ' active' : ''}" data-mode="internal">Internal note</button>
                </div>
                <textarea class="form-textarea" id="tkText" rows="3" placeholder="${internal ? 'Note for the Esevel team…' : `Write a reply to ${escapeHtml(t.requester.split(' ')[0])}…`}">${escapeHtml(ui.draft)}</textarea>
                <div class="composer-actions">
                  <span class="readonly-note">${internal ? 'Only visible to Esevel staff.' : `Visible to ${escapeHtml(t.requester)} and the client admin.${t.firstResponse ? '' : ' Sending stops the first-response clock.'}`}</span>
                  <span class="composer-buttons">${!internal && t.stage !== 'waiting' ? '<button type="button" class="btn btn-secondary btn-sm" data-send="wait">Send and wait on client</button>' : ''}<button type="submit" class="btn btn-primary btn-sm">${internal ? 'Add note' : 'Send reply'}</button></span>
                </div>
              </form>`}
            </div>
          </section>
        </div>
        <div class="edit-sidebar-column">
          <div class="card mb-lg"><div class="card-header"><h3 class="card-title">SLA</h3>${s.custom ? '<span class="text-muted">Client exception</span>' : ''}</div><div class="card-body">
            <div class="sla-clocks sla-clocks-lg">
              <div class="sla-clock ${clockCls(s.response)}"><span>First response · ${fmtMins(s.response.target)}</span><span>${clockVal(s.response)}</span></div>
              <div class="sla-clock ${clockCls(s.resolution)}"><span>Resolution · ${fmtMins(s.resolution.target)}</span><span>${clockVal(s.resolution)}</span></div>
            </div>
            <div class="readonly-note">Targets from <a href="/pages/sla-config/${s.custom ? `exceptions.html?client=${t.client}` : 'standard.html'}" class="link-sm">SLA configuration</a>, adjusted for ${t.priority} priority. Waiting on client pauses resolution${t.pausedMins ? ` (${fmtMins(t.pausedMins)} paused so far)` : ''}.</div>
          </div></div>
          <div class="card mb-lg"><div class="card-header"><h3 class="card-title">Details</h3></div><div class="card-body"><div class="info-grid">
            <div class="info-row"><span class="info-label">Owner</span><span class="info-value"><select class="form-select form-select-sm owner-select" data-field="owner" aria-label="Owner">${opt('', t.owner, 'Unassigned')}${SUPPORT_AGENTS.map(a => opt(a, t.owner)).join('')}</select></span></div>
            <div class="info-row"><span class="info-label">Priority</span><span class="info-value"><select class="form-select form-select-sm owner-select" data-field="priority" aria-label="Priority">${SUPPORT_PRIORITIES.map(p => opt(p, t.priority)).join('')}</select></span></div>
            <div class="info-row"><span class="info-label">Category</span><span class="info-value"><select class="form-select form-select-sm owner-select" data-field="category" aria-label="Category">${SUPPORT_CATEGORIES.map(c => opt(c, t.category)).join('')}</select></span></div>
            <div class="info-row"><span class="info-label">Requester</span><span class="info-value">${escapeHtml(t.requester)}<div class="stock-sub">${escapeHtml(t.email)}</div></span></div>
            ${t.device ? `<div class="info-row"><span class="info-label">Device</span><span class="info-value">${t.serial ? `<a href="/pages/assets/detail.html?serial=${encodeURIComponent(t.serial)}" class="link-sm">${escapeHtml(t.device)}</a>` : escapeHtml(t.device)}</span></div>` : ''}
            <div class="info-row"><span class="info-label">Opened</span><span class="info-value">${fmtSupportTs(t.opened)}</span></div>
            <div class="info-row"><span class="info-label">Client admin</span><span class="info-value">${escapeHtml(typeof clientAdminFor === 'function' && typeof CONTRACTS !== 'undefined' && CONTRACTS[t.client] ? clientAdminFor(CONTRACTS[t.client]) : '—')}</span></div>
          </div>
          ${t.stage !== 'resolved' ? `<div class="ticket-links"><a href="/pages/services/new.html?client=${t.client}" class="link-sm">Raise a service request…</a>${t.category === 'Request' || t.category === 'Peripherals' ? ` · <a href="/pages/orders/new.html?client=${t.client}" class="link-sm">New order…</a>` : ''}</div>` : ''}
          </div></div>
          <div class="card mb-lg"><div class="card-header"><h3 class="card-title">Activity</h3></div><div class="card-body">
            <ul class="audit-list">${[...t.audit].reverse().map(a => `<li>${escapeHtml(a.text)}<div class="audit-meta">${fmtSupportTs(a.at)} · ${escapeHtml(a.who)}</div></li>`).join('')}</ul>
          </div></div>
        </div>
      </div>`;
  }

  root.addEventListener('click', e => {
    const t = supportById(id);
    const m = e.target.closest('[data-mode]');
    if (m) { ui.draft = document.getElementById('tkText')?.value || ''; ui.mode = m.dataset.mode; render(); document.getElementById('tkText').focus(); return; }
    const a = e.target.closest('[data-act]');
    if (a) {
      const act = a.dataset.act;
      if (act === 'take') return run(() => supportAssign(t, supportUser().split(' ')[0]));
      if (act === 'resolve') return run(() => supportSetStage(t, 'resolved'));
      if (act === 'reopen') return run(() => supportSetStage(t, 'progress'));
      if (act === 'wait') return run(() => `${supportSetStage(t, 'waiting')} Resolution clock paused.`);
      if (act === 'resume') return run(() => `${supportSetStage(t, 'progress')} Resolution clock running.`);
    }
    const sw = e.target.closest('[data-send="wait"]');
    if (sw) {
      const text = document.getElementById('tkText').value;
      return run(() => { const msg = supportReply(t, text, false); supportSetStage(t, 'waiting'); ui.draft = ''; return `${msg} Waiting on client.`; });
    }
  });
  root.addEventListener('submit', e => {
    if (e.target.id !== 'tkComposer') return;
    e.preventDefault();
    const t = supportById(id);
    const text = document.getElementById('tkText').value;
    run(() => { const msg = supportReply(t, text, ui.mode === 'internal'); ui.draft = ''; return msg; });
  });
  root.addEventListener('change', e => {
    const t = supportById(id);
    if (e.target.id === 'tkHide') { ui.hideInternal = e.target.checked; render(); return; }
    const fld = e.target.dataset.field;
    if (fld === 'owner') run(() => supportAssign(t, e.target.value));
    if (fld === 'priority') run(() => supportSetPriority(t, e.target.value));
    if (fld === 'category') run(() => { t.category = e.target.value; supportAudit(t, `Category: ${t.category}`); saveSupport(); return 'Category updated.'; });
  });

  render();
  if (new URLSearchParams(location.search).get('created')) { toast(`${id} created.`); history.replaceState(null, '', `?id=${id}`); }
})();
