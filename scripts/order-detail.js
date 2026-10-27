// Order detail: banners, stage timeline (mark done / edit time / skip / undo, AWB entries, per-stage notes),
// business-hours panel, pricing card (local / SGD / USD), line items, edit order, approval, hold, pause and cancel,
// audit log. renderOrderDetail(el, id, { onChange }) is used by the order page and the List view.
// Needs orders-ui.js.

const ORDER_FX_VIEWS = { local: 'Local', SGD: 'SGD', USD: 'USD' };

function renderOrderDetail(root, id, opts = {}) {
  const o = orderById(id);
  if (!o) { root.innerHTML = `<div class="orders-empty">Order ${escapeHtml(id)} not found.</div>`; return; }
  const state = root._orderState || (root._orderState = { fx: 'local', editing: null });
  const changed = () => { renderOrderDetail(root, id, opts); if (opts.onChange) opts.onChange(o); };
  const s = orderSla(o);
  const p = orderPricing(o);
  const st = orderState(o);
  const client = orderClient(o.client);
  const ent = orderEntity(o);
  const block = orderBlockedReason(o);
  const paused = orderIsPaused(o);
  const cancelled = orderIsCancelled(o);
  const open = !cancelled && !o.deliveredAt;

  /* ---------- Banners ---------- */
  const banners = [
    cancelled ? `<div class="order-banner banner-cancelled"><span>🚫</span><div><strong>Order cancelled</strong> by ${escapeHtml(o.cancelled.by)} on ${fmtOrderTs(o.cancelled.at)}. SLA is frozen.<div>Reason: <em>${escapeHtml(o.cancelled.reason)}</em></div></div></div>` : '',
    orderPendingApproval(o) ? `<div class="order-banner banner-pending"><span>⏳</span><div><strong>Pending approval.</strong> ${escapeHtml(o.orderedBy)} (client admin) needs to approve before processing can start. Stage progress is blocked.</div><button type="button" class="btn btn-secondary btn-sm" data-act="reject">Reject</button><button type="button" class="btn btn-primary btn-sm" data-act="approve">Approve</button></div>` : '',
    o.approvalRequired && o.approval === 'rejected' && !cancelled ? '<div class="order-banner banner-rejected"><span>🔴</span><div><strong>Order rejected.</strong></div></div>' : '',
    o.paymentHold && !cancelled ? `<div class="order-banner banner-hold"><span>⚠</span><div><strong>Payment hold.</strong> ${escapeHtml(client.name)} has an unpaid invoice. Processing is blocked until Finance releases the hold. <a href="/pages/billing/invoices.html?client=${o.client}" class="link-sm">Open invoices</a></div><button type="button" class="btn btn-primary btn-sm" data-act="release">Release hold</button></div>` : '',
    paused && open ? `<div class="order-banner banner-paused"><span>⏸</span><div><strong>SLA paused</strong> since ${fmtOrderTs(o.pauses.find(x => !x.resumedAt).at)} by ${escapeHtml(o.pauses.find(x => !x.resumedAt).by)}: ${escapeHtml(o.pauses.find(x => !x.resumedAt).reason)}. The order isn't counted as overdue while paused.</div><button type="button" class="btn btn-secondary btn-sm" data-act="resume">▶ Resume SLA</button></div>` : '',
    o.blocker && open ? `<div class="order-banner banner-blocker"><span>⛔</span><div><strong>Blocker:</strong> ${escapeHtml(o.blocker)}</div><button type="button" class="btn-text" data-act="clear-blocker">Clear</button></div>` : ''
  ].join('');

  /* ---------- Header ---------- */
  const header = `<div class="asset-header">
    <div>
      <h1 class="page-title-edit">${o.id} · ${escapeHtml(client.name)}</h1>
      <div class="asset-header-meta">
        ${orderStateBadge(o)}${orderPriorityTag(o.priority)}
        <span class="meta-sep">·</span><span>${escapeHtml(o.recipient)}</span>
        <span class="meta-sep">·</span><span>${orderFlag(o.cc)} ${WH_COUNTRIES[o.cc][1]}</span>
        <span class="meta-sep">·</span><span>${slaType(o.type).name}</span>
        <span class="meta-sep">·</span><span class="tag ${o.channel === 'Platform' ? 'tag-hub' : 'tag-client-loc'}">${o.channel}</span>
        ${o.ticket ? `<span class="meta-sep">·</span><span class="text-muted">${escapeHtml(o.ticket)}</span>` : ''}
        ${s.cur ? `<span class="sla-pill ${ORDER_HEALTH_PILL[s.health][0]}">${ORDER_HEALTH_PILL[s.health][1]}</span>` : ''}
      </div>
    </div>
    <div class="header-actions">
      ${open && !block ? `<button type="button" class="btn btn-secondary" data-act="${paused ? 'resume' : 'pause'}">${paused ? '▶ Resume SLA' : '⏸ Pause SLA'}</button>` : ''}
      ${open ? '<button type="button" class="btn btn-secondary" data-act="hold">Payment hold…</button>' : ''}
      ${open ? '<button type="button" class="btn btn-secondary" data-act="cancel">Cancel order</button>' : ''}
      <button type="button" class="btn btn-secondary" data-act="template">Save as template</button>
      <button type="button" class="btn btn-primary" data-act="edit">Edit order</button>
    </div>
  </div>`;

  const pct = Math.round(s.progress * 100);
  const progress = `<div class="order-progress"><span>${s.active.filter(x => x.state === 'done' || x.state === 'skipped').length} of ${s.active.length} stages</span>
    <div class="order-progress-bar"><div class="order-progress-fill ${o.deliveredAt ? 'done' : s.health === 'breached' ? 'bad' : ''}" style="width:${pct}%"></div></div>
    <span>${o.deliveredAt ? `Delivered ${fmtOrderTs(o.deliveredAt)}` : cancelled ? 'Cancelled' : `Expected ${fmtOrderDate(o.expected)} · SLA due ${fmtOrderTs(s.due)}`}</span></div>`;

  /* ---------- Stages ---------- */
  const lastDoneIdx = (() => { const a = s.active.filter(x => x.state === 'done' || (x.state === 'skipped' && !x.routeSkipped)); return a.length ? a[a.length - 1].key : null; })();
  const notesHtml = (key, openForm) => {
    const list = o.notes[key] || [];
    const tagCls = t => `note-tag note-tag-${t.toLowerCase()}`;
    const mention = t => escapeHtml(t).replace(/@([A-Z][a-z]+(?: [A-Z][a-z]+)?)/g, '<span class="mention">@$1</span>');
    return `<div class="stage-notes">${list.map(n => `<div class="stage-note"><span class="${tagCls(n.tag)}">${escapeHtml(n.tag)}</span>${mention(n.text)} <span class="note-meta">· ${escapeHtml(n.who)}, ${fmtOrderTs(n.at)}</span></div>`).join('')}
      ${openForm || state.noteOpen === key ? '' : `<button type="button" class="btn-text" data-note-open="${key}">+ Note</button>`}<form class="note-form" data-note="${key}" ${openForm || state.noteOpen === key ? '' : 'hidden'}><select class="form-select" aria-label="Note tag">${ORDER_NOTE_TAGS.map(t => `<option>${t}</option>`).join('')}</select><input class="form-input" placeholder="Add a note… use @Name to mention" aria-label="Note"><button type="submit" class="btn btn-secondary btn-sm">Add</button></form></div>`;
  };
  const awbHtml = (step, editable) => {
    const list = o.stages.awb?.awb || [];
    if (!editable) {
      return list.length ? `<ul class="awb-list">${list.map(a => `<li>📦 ${escapeHtml(a.courier)} · <strong>${escapeHtml(a.tracking)}</strong>${a.url ? ` · <a href="${escapeHtml(a.url)}" target="_blank" rel="noopener" class="link-sm">Track ↗</a>` : ''}</li>`).join('')}</ul>` : '';
    }
    const rows = (list.length ? list : [{ courier: o.route === 'hub' ? `${orderVendorName(o.vendor)} freight` : ORDER_COURIER[o.cc], tracking: '', url: '' }]).map((a, i) => `<div class="awb-row" data-awb-row>
      <input class="form-input" data-f="courier" value="${escapeHtml(a.courier)}" placeholder="Courier" aria-label="Courier">
      <input class="form-input" data-f="tracking" value="${escapeHtml(a.tracking)}" placeholder="Tracking / AWB number" aria-label="Tracking number">
      <input class="form-input" data-f="url" value="${escapeHtml(a.url)}" placeholder="Tracking link (optional)" aria-label="Tracking link">
      <button type="button" class="btn-text" data-awb-del="${i}" aria-label="Remove shipment">✕</button></div>`).join('');
    return `<div class="stage-box"><div id="awbRows">${rows}</div><div class="order-form-actions"><button type="button" class="btn-text" data-act="awb-add">+ Add AWB</button><button type="button" class="btn btn-secondary btn-sm" data-act="awb-save">Save shipment info</button></div></div>`;
  };
  const stages = s.steps.map((x, idx) => {
    const n = idx + 1;
    if (x.routeSkipped) return `<li class="stage stage-skipped" data-n="${n}"><div class="stage-head"><span class="stage-name">${x.m.label}</span></div><div class="stage-meta">${escapeHtml(x.skipReason)}</div></li>`;
    const target = `${x.hours}h${x.custom ? ' (client exception)' : ''}`;
    let cls = 'stage-upcoming', meta = `Target ${target}`, chip = '', actions = '';
    if (x.state === 'done') {
      cls = `stage-done${x.over ? ' stage-over' : ''}`;
      chip = `<span class="stage-chip ${x.over ? 'chip-over' : 'chip-good'}">${x.over ? '⚠ ' : '✓ '}${fmtBiz(x.mins, o.cc)} of ${x.hours}h</span>`;
      meta = `<span class="${x.data.override ? 'ts-override' : ''}">${x.data.override ? '✎ Set manually' : idx === 0 && o.channel === 'Platform' ? '⚡ Auto-captured' : '⏱ Recorded'} · ${fmtOrderTs(x.doneAt)} · ${escapeHtml(x.data.by || '')}</span>`;
      actions = `<button type="button" class="btn-text" data-edit-ts="${x.key}">Edit time</button>${x.key === lastDoneIdx && open ? `<button type="button" class="btn-text" data-act="undo">Undo</button>` : ''}`;
    } else if (x.state === 'skipped') {
      cls = 'stage-skipped';
      meta = `Skipped by ${escapeHtml(x.data.by || '')} · ${escapeHtml(x.skipReason)}`;
      actions = x.key === lastDoneIdx && open ? '<button type="button" class="btn-text" data-act="undo">Undo skip</button>' : '';
    } else if (x.state === 'current') {
      const over = s.remainingMins < 0;
      cls = `stage-current${over ? ' stage-breached' : s.health === 'risk' ? ' stage-risk' : ''}`;
      chip = `<span class="stage-chip ${over ? 'chip-over' : s.health === 'risk' ? 'chip-risk' : 'chip-live'}">⏱ ${fmtBiz(x.mins, o.cc)} elapsed${paused ? ' · paused' : ''}</span>`;
      meta = over ? `<span class="ts-over">⚠ Overdue by ${fmtBiz(-s.remainingMins, o.cc)} · target ${target}</span>` : `Started ${fmtOrderTs(x.startedAt)} · target ${target} · ${fmtBiz(s.remainingMins, o.cc)} left`;
      actions = block ? `<span class="text-muted">${escapeHtml(block)}</span>`
        : `<button type="button" class="btn btn-primary btn-sm" data-act="done">Mark done</button><button type="button" class="btn btn-secondary btn-sm" data-act="done-at">Done at…</button>${x.key !== 'delivered' ? '<button type="button" class="btn-text" data-act="skip">Skip stage</button>' : ''}`;
    }
    const lines = x.key === 'out' || x.key === 'delivered' ? (o.products.some(l => l.delivered) && !o.deliveredAt ? `<div class="stage-meta">${o.products.filter(l => l.delivered).length} of ${o.products.length} lines delivered</div>` : '') : '';
    return `<li class="stage ${cls}" data-n="${n}">
      <div class="stage-head"><span class="stage-name">${x.m.label}</span>${chip}</div>
      <div class="stage-meta">${meta}</div>${lines}
      ${x.key === 'awb' ? awbHtml(x, x.state === 'current' && !block) : ''}
      ${actions ? `<div class="stage-actions">${actions}</div>` : ''}
      ${x.state !== 'upcoming' ? notesHtml(x.key, x.state === 'current') : ''}
    </li>`;
  }).join('');

  /* ---------- Business hours panel ---------- */
  const cal = calCountry(o.cc);
  const counted = s.active.filter(x => x.state !== 'skipped');
  const totalBar = Math.max(s.totalMins, counted.reduce((n, x) => n + (x.mins || 0), 0)) || 1;
  const gantt = counted.map(x => {
    if (x.state === 'done') return `<span class="${x.over ? 'gantt-over' : 'gantt-ok'}" style="width:${(x.mins / totalBar) * 100}%" title="${x.m.label}: ${fmtBiz(x.mins, o.cc)} of ${x.hours}h"></span>`;
    if (x.state === 'current') return `<span class="${s.remainingMins < 0 ? 'gantt-cur-bad' : 'gantt-cur'}" style="width:${(x.mins / totalBar) * 100}%" title="${x.m.label}: ${fmtBiz(x.mins, o.cc)} so far"></span>`;
    return '';
  }).join('');
  const pausedTotal = orderPausedMins(o, o.createdAt, o.deliveredAt || ORDER_NOW);
  const bizPanel = `<div class="card mb-lg"><div class="card-header"><h3 class="card-title">Business hours</h3></div><div class="card-body">
    <div class="biz-gantt">${gantt}</div>
    <div class="gantt-legend"><span><i class="gantt-ok"></i>Within target</span><span><i class="gantt-over"></i>Over target</span><span><i class="gantt-cur"></i>Current stage</span></div>
    <div class="info-grid" style="margin-top: var(--space-md);">
      <div class="info-row"><span class="info-label">Elapsed</span><span class="info-value">${fmtBiz(s.elapsed, o.cc)} of ${fmtBiz(s.totalMins, o.cc)}</span></div>
      ${pausedTotal ? `<div class="info-row"><span class="info-label">Paused (deducted)</span><span class="info-value">${fmtBiz(pausedTotal, o.cc)}</span></div>` : ''}
      <div class="info-row"><span class="info-label">Calendar</span><span class="info-value">${cal.flag} ${cal.name} · ${cal.hours} ${cal.tz.split(' ')[0]}</span></div>
      <div class="info-row"><span class="info-label">Business day</span><span class="info-value">${calHoursPerDay(o.cc)}h · Mon–Fri, excl. holidays</span></div>
    </div>
    <div class="readonly-note">Weekends, public holidays and procurement closures in the <a href="/pages/holidays/calendars.html" class="link-sm">Operating calendar</a> don't count. Targets: <a href="/pages/sla-config/${s.custom ? `exceptions.html?client=${o.client}&type=${o.type}&country=${o.cc}` : `standard.html?country=${o.cc}`}" class="link-sm">${s.custom ? 'client exception' : 'country standard'}</a>.</div>
  </div></div>`;

  /* ---------- Pricing ---------- */
  const view = state.fx;
  const conv = v => (view === 'local' ? v : view === 'SGD' ? orderToSGD(v, o.currency) : orderToUSD(v, o.currency));
  const vcur = view === 'local' ? o.currency : view;
  const money = v => fmtAmount(vcur, conv(v));
  const rowP = (label, sub, qty, uc, ur, lc, lr, extra = '') => `<tr><td>${label}${sub ? `<div class="stock-sub">${sub}</div>` : ''}${extra}</td><td class="num">${qty}</td><td class="num">${money(uc)}</td><td class="num">${money(ur)}</td><td class="num">${money(lc)}</td><td class="num">${money(lr)}</td><td class="num">${marginBadge(marginPct(lc, lr))}</td></tr>`;
  const pricing = `<div class="card mb-lg"><div class="card-header"><h3 class="card-title">Pricing</h3>
      <div class="segmented-control segmented-sm pricing-toggle" role="group" aria-label="Currency view">${Object.entries(ORDER_FX_VIEWS).filter(([k]) => k === 'local' || k !== o.currency).map(([k, l]) => `<button type="button" class="segment-button${k === view ? ' active' : ''}" data-fx="${k}">${k === 'local' ? o.currency : l}</button>`).join('')}</div></div>
    <div class="card-body">
      <div class="pricing-summary">
        <div><div class="ps-label">Total revenue${p.tax.rate ? ` (incl. ${escapeHtml(p.tax.label)})` : ''}</div><div class="ps-value">${money(p.totalRev)}</div></div>
        <div><div class="ps-label">Total cost</div><div class="ps-value">${money(p.totalCost)}</div></div>
        <div><div class="ps-label">Margin</div><div class="ps-value">${money(p.margin)}</div></div>
        <div><div class="ps-label">Margin %</div><div class="ps-value">${marginBadge(p.pct)}</div></div>
      </div>
      <table class="table pricing-table">
        <thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Unit cost</th><th class="num">Unit revenue</th><th class="num">Cost</th><th class="num">Revenue</th><th class="num">Margin</th></tr></thead>
        <tbody>
          <tr class="group-row"><td colspan="7">Products</td></tr>
          ${p.products.map(l => rowP(escapeHtml(l.name), `${escapeHtml(l.cat)} · ${escapeHtml(l.basis || 'Set on order')}`, l.qty, l.unitCost, l.unitRev, l.cost, l.rev, l.delivered && !o.deliveredAt ? ' <span class="line-delivered">✓ delivered</span>' : '')).join('')}
          ${p.fees.length ? `<tr class="group-row"><td colspan="7">Extra fees</td></tr>${p.fees.map(f => rowP(escapeHtml(f.name), '', f.qty, f.unitCost, f.unitRev, f.cost, f.rev)).join('')}` : ''}
          <tr class="group-row"><td colspan="7">Shipping</td></tr>
          ${rowP(SLA_ROUTES[o.route].label, '', 1, p.ship.cost, p.ship.rev, p.ship.cost, p.ship.rev)}
          <tr class="total-row"><td colspan="4">Subtotal</td><td class="num">${money(p.subCost)}</td><td class="num">${money(p.subRev)}</td><td class="num">${marginBadge(p.pct)}</td></tr>
          <tr><td colspan="5">${escapeHtml(p.tax.label)} ${p.tax.rate ? `${p.tax.rate}%` : ''} <span class="stock-sub">on revenue, ${escapeHtml(ent.name)}</span></td><td class="num">${money(p.taxAmt)}</td><td></td></tr>
          <tr class="total-row"><td colspan="4">Total</td><td class="num">${money(p.totalCost)}</td><td class="num">${money(p.totalRev)}</td><td></td></tr>
        </tbody>
      </table>
      <div class="readonly-note">${view === 'local' ? `Amounts in ${o.currency}, the billing entity's currency.` : `Converted from ${o.currency} at today's rate (${FX_SOURCES[CONTRACTS[o.client].terms.fxSource].split(' (')[0]}) for internal comparison; the client is billed in ${o.currency}.`} Margin: green ${ORDER_MARGIN_GOOD}%+, amber ${ORDER_MARGIN_WARN}–${ORDER_MARGIN_GOOD - 1}%, red under ${ORDER_MARGIN_WARN}%.${o.posted ? ` <a href="/pages/billing/ledger.html" class="link-sm">Charges in the ledger</a>` : ''}</div>
    </div></div>`;

  /* ---------- Sidebar ---------- */
  const person = o.person ? `<a href="/pages/people/person.html?id=${o.person}" class="link-sm">${escapeHtml(o.recipient)}</a>` : escapeHtml(o.recipient);
  const details = `<div class="card mb-lg"><div class="card-header"><h3 class="card-title">Details</h3></div><div class="card-body"><div class="info-grid">
    <div class="info-row"><span class="info-label">Client</span><span class="info-value"><a href="/pages/clients/detail.html?c=${o.client}" class="link-sm">${escapeHtml(client.name)}</a></span></div>
    <div class="info-row"><span class="info-label">Billing entity</span><span class="info-value">${escapeHtml(ent.name)}</span></div>
    <div class="info-row"><span class="info-label">Ordered by</span><span class="info-value">${escapeHtml(o.orderedBy)}</span></div>
    <div class="info-row"><span class="info-label">Recipient</span><span class="info-value">${person}</span></div>
    <div class="info-row"><span class="info-label">Route</span><span class="info-value">${SLA_ROUTES[o.route].label}${o.route === 'hub' && HUB_ASSIGNMENTS[o.client][o.cc] && HUB_ASSIGNMENTS[o.client][o.cc] !== 'none' ? ` · ${escapeHtml(WAREHOUSES.find(w => w.id === HUB_ASSIGNMENTS[o.client][o.cc]).name)}` : ''}</span></div>
    <div class="info-row"><span class="info-label">Vendor</span><span class="info-value">${SUPPLY_SUPPLIERS[o.vendor] ? `<a href="/pages/vendors/supplier.html?v=${o.vendor}" class="link-sm">${escapeHtml(orderVendorName(o.vendor))}</a>` : escapeHtml(orderVendorName(o.vendor))}</span></div>
    <div class="info-row"><span class="info-label">Vendor PO</span><span class="info-value">${escapeHtml(o.po || '—')}</span></div>
    <div class="info-row"><span class="info-label">Created</span><span class="info-value">${fmtOrderTs(o.createdAt)}</span></div>
    <div class="info-row"><span class="info-label">Expected delivery</span><span class="info-value">${fmtOrderDate(o.expected)}</span></div>
    ${o.costCentre ? `<div class="info-row"><span class="info-label">Cost centre</span><span class="info-value">${escapeHtml(o.costCentre)}</span></div>` : ''}
    <div class="info-row"><span class="info-label">Approval</span><span class="info-value">${o.approvalRequired ? { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' }[o.approval] : 'Not required'}</span></div>
  </div></div></div>`;
  const owner = `<div class="card mb-lg"><div class="card-header"><h3 class="card-title">Owner</h3></div><div class="card-body">
    <div class="owner-picker"><span class="card-avatar">${escapeHtml(o.owner.split(' ').map(w => w[0]).join('').slice(0, 2))}</span><select class="form-select" data-owner aria-label="Owner">${ORDER_OWNERS.map(n => `<option${n === o.owner ? ' selected' : ''}>${escapeHtml(n)}</option>`).join('')}</select></div>
  </div></div>`;
  const audit = `<div class="card mb-lg"><div class="card-header"><h3 class="card-title">Audit log</h3></div><div class="card-body">
    <ul class="audit-list">${o.audit.map((a, i) => ({ ...a, i })).sort((a, b) => b.at.localeCompare(a.at) || b.i - a.i).map(a => `<li>${escapeHtml(a.text)}<div class="audit-meta">${fmtOrderTs(a.at)} · ${escapeHtml(a.who)}</div></li>`).join('')}</ul>
  </div></div>`;

  // Breadcrumbs go in the shared header (navigation.js moves .breadcrumbs-custom there on load)
  if (!opts.compact) {
    const crumbs = `<a href="/pages/tracker/all.html" class="breadcrumb-link">Work order tracker</a><span class="breadcrumb-separator">›</span><a href="/pages/tracker/orders.html" class="breadcrumb-link">Orders</a><span class="breadcrumb-separator">›</span><span class="breadcrumb-current">${o.id}</span>`;
    const hb = document.getElementById('breadcrumbs');
    if (hb && hb.childElementCount) hb.innerHTML = crumbs;
    else if (!document.querySelector('.breadcrumbs-custom')) document.querySelector('.page-content').insertAdjacentHTML('afterbegin', `<nav class="breadcrumbs-custom">${crumbs}</nav>`);
  }
  root.innerHTML = `
    ${header}${banners}${progress}
    <div class="edit-layout">
      <div class="edit-form-column">
        <section class="card mb-lg"><div class="card-header"><h3 class="card-title">Stages</h3><span class="text-muted">${s.paused ? 'Clock paused' : s.cur ? `Current: ${s.cur.m.label}` : ''}</span></div><div class="card-body"><ol class="stage-list">${stages}</ol></div></section>
        ${pricing}
      </div>
      <div class="edit-sidebar-column">${details}${owner}${bizPanel}${audit}</div>
    </div>`;

  /* ---------- Events ---------- */
  const act = async (name, el) => {
    const run = fn => orderTry(fn, changed);
    if (name === 'done') return run(() => orderMarkDone(o, orderNowIso(), s.cur.key === 'awb' ? { awb: readAwb() } : {}));
    if (name === 'done-at') {
      const v = await orderDialog({ title: `${s.cur.m.label} · done at`, text: `Time is local to ${WH_COUNTRIES[o.cc][1]}. Must be after ${fmtOrderTs(s.cur.startedAt)}.`, fields: [{ id: 't', label: 'Completed at', type: 'datetime', value: orderNowIso(), required: true }], confirm: 'Mark done' });
      if (v) run(() => orderMarkDone(o, v.t, s.cur.key === 'awb' ? { awb: readAwb() } : {}));
      return;
    }
    if (name === 'skip') {
      const v = await orderDialog({ title: `Skip ${s.cur.m.label}`, text: 'Skipped stages count as done for progress and are left out of the SLA.', fields: [{ id: 'r', label: 'Reason', type: 'textarea', required: true, placeholder: 'e.g. Prepaid on account, no payment step' }], confirm: 'Skip stage' });
      if (v) run(() => orderSkip(o, v.r));
      return;
    }
    if (name === 'undo') return run(() => orderUndo(o));
    if (name === 'approve') return run(() => orderApprove(o));
    if (name === 'reject') {
      const v = await orderDialog({ title: `Reject ${o.id}`, text: 'Rejecting cancels the order.', fields: [{ id: 'r', label: 'Reason', type: 'textarea', required: true }], confirm: 'Reject and cancel', danger: true });
      if (v) run(() => orderReject(o, v.r));
      return;
    }
    if (name === 'release') return run(() => orderSetHold(o, false));
    if (name === 'hold') {
      if (o.paymentHold) return run(() => orderSetHold(o, false));
      const v = await orderDialog({ title: `Payment hold · ${o.id}`, text: 'Blocks stage progress until released.', fields: [{ id: 'r', label: 'Reason', type: 'textarea', required: true, placeholder: 'e.g. Invoice INV-2026-0912 overdue 30 days' }], confirm: 'Apply hold', danger: true });
      if (v) run(() => orderSetHold(o, true, v.r));
      return;
    }
    if (name === 'pause') {
      const v = await orderDialog({ title: `Pause SLA · ${o.id}`, text: 'Paused business hours are deducted from the current stage. Marking a stage done resumes the clock automatically.', fields: [{ id: 'r', label: 'Reason', type: 'textarea', required: true, placeholder: 'e.g. Waiting for client to confirm the delivery address' }], confirm: 'Pause SLA' });
      if (v) run(() => orderPause(o, v.r));
      return;
    }
    if (name === 'resume') {
      const v = await orderDialog({ title: `Resume SLA · ${o.id}`, fields: [{ id: 'r', label: 'Reason', type: 'textarea', required: true, placeholder: 'e.g. Address confirmed' }], confirm: 'Resume' });
      if (v) run(() => orderResume(o, v.r));
      return;
    }
    if (name === 'cancel') {
      const v = await orderDialog({ title: `Cancel ${o.id}`, text: 'The order leaves the board and its SLA is frozen. This can’t be undone in the prototype.', fields: [{ id: 'k', label: 'Reason', type: 'select', options: ORDER_CANCEL_REASONS, value: ORDER_CANCEL_REASONS[0] }, { id: 'r', label: 'Details', type: 'textarea' }], confirm: 'Cancel order', danger: true });
      if (v) run(() => orderCancel(o, v.r ? `${v.k}: ${v.r}` : v.k));
      return;
    }
    if (name === 'clear-blocker') { o.blocker = ''; orderAudit(o, 'Blocker cleared'); saveOrders(); changed(); return; }
    if (name === 'template') {
      const v = await orderDialog({ title: 'Save as template', text: `Saves the items, type, priority and extra fees of ${o.id}.`, fields: [{ id: 'n', label: 'Template name', required: true, value: `${client.name} · ${o.products[0].name}` }], confirm: 'Save template' });
      if (v) {
        ORDER_TEMPLATES.push({ id: `tpl-${Date.now()}`, name: v.n, type: o.type, priority: o.priority, lines: o.products.map(l => [l.model, l.qty]), fees: o.fees.map(f => f.type), by: orderUser() });
        saveOrderTemplates();
        orderToast(`Template “${v.n}” saved.`);
      }
      return;
    }
    if (name === 'edit') return orderEditDialog(o, changed);
    if (name === 'awb-add') {
      const rows = root.querySelector('#awbRows');
      rows.insertAdjacentHTML('beforeend', `<div class="awb-row" data-awb-row><input class="form-input" data-f="courier" placeholder="Courier" aria-label="Courier"><input class="form-input" data-f="tracking" placeholder="Tracking / AWB number" aria-label="Tracking number"><input class="form-input" data-f="url" placeholder="Tracking link (optional)" aria-label="Tracking link"><button type="button" class="btn-text" data-awb-del aria-label="Remove shipment">✕</button></div>`);
      return;
    }
    if (name === 'awb-save') return run(() => orderSetAwb(o, readAwb()));
  };
  const readAwb = () => [...root.querySelectorAll('[data-awb-row]')].map(r => ({ courier: r.querySelector('[data-f=courier]').value.trim(), tracking: r.querySelector('[data-f=tracking]').value.trim(), url: r.querySelector('[data-f=url]').value.trim() }));

  root.onclick = async e => {
    const a = e.target.closest('[data-act]');
    if (a) { act(a.dataset.act, a); return; }
    const fx = e.target.closest('[data-fx]');
    if (fx) { state.fx = fx.dataset.fx; changed(); return; }
    const no = e.target.closest('[data-note-open]');
    if (no) { state.noteOpen = no.dataset.noteOpen; no.hidden = true; const f = root.querySelector(`[data-note="${no.dataset.noteOpen}"]`); f.hidden = false; f.querySelector('input').focus(); return; }
    const del = e.target.closest('[data-awb-del]');
    if (del) { const rows = root.querySelectorAll('[data-awb-row]'); if (rows.length > 1) del.closest('[data-awb-row]').remove(); else del.closest('[data-awb-row]').querySelectorAll('input').forEach(i => { i.value = ''; }); return; }
    const ts = e.target.closest('[data-edit-ts]');
    if (ts) {
      const step = s.steps.find(x => x.key === ts.dataset.editTs);
      const v = await orderDialog({ title: `Edit time · ${step.m.label}`, text: `Recorded as a manual override in the audit log. Local to ${WH_COUNTRIES[o.cc][1]}.`, fields: [{ id: 't', label: 'Completed at', type: 'datetime', value: step.doneAt, required: true }], confirm: 'Save time' });
      if (v) orderTry(() => orderOverride(o, step.key, v.t), changed);
    }
  };
  root.onsubmit = e => {
    const form = e.target.closest('[data-note]');
    if (!form) return;
    e.preventDefault();
    orderTry(() => orderAddNote(o, form.dataset.note, form.querySelector('select').value, form.querySelector('input').value), changed);
  };
  root.onchange = e => {
    if (e.target.matches('[data-owner]')) {
      const old = o.owner;
      o.owner = e.target.value;
      orderAudit(o, `Owner changed: ${old} → ${o.owner}`);
      saveOrders();
      orderToast(`Owner set to ${o.owner}.`);
      changed();
    }
  };
}

/* ---------- Edit order (tabs: Order details · Recipient · Pricing) ---------- */

async function orderEditDialog(o, onSaved) {
  const draft = JSON.parse(JSON.stringify({ priority: o.priority, vendor: o.vendor, owner: o.owner, ticket: o.ticket, po: o.po, costCentre: o.costCentre, expected: o.expected, blocker: o.blocker, recipient: o.recipient, address: o.address, route: o.route, approvalRequired: o.approvalRequired, products: o.products, fees: o.fees, shippingCost: o.shippingCost, shippingRev: o.shippingRev }));
  const vendors = supplyVendorsIn(o.cc);
  if (!vendors.some(v => v.key === o.vendor)) vendors.push({ key: o.vendor, name: orderVendorName(o.vendor) });
  const opt = (v, l, cur) => `<option value="${escapeHtml(v)}"${v === cur ? ' selected' : ''}>${escapeHtml(l)}</option>`;
  const numIn = (f, i, k, v) => `<input type="number" step="0.01" min="0" class="form-input money-input" data-${f}="${i}" data-k="${k}" value="${v}">`;
  const body = () => `
    <div class="tab-strip" role="tablist" style="margin-bottom: var(--space-md);">${['details', 'recipient', 'pricing'].map(t => `<button type="button" class="tab-link${t === tab ? ' active' : ''}" data-tab="${t}">${{ details: 'Order details', recipient: 'Recipient', pricing: 'Pricing' }[t]}</button>`).join('')}</div>
    <div ${tab === 'details' ? '' : 'hidden'}><div class="order-form-grid">
      <div class="form-group"><label class="form-label">Priority</label><select class="form-select" id="eoPriority">${ORDER_PRIORITIES.map(p => opt(p, p, draft.priority)).join('')}</select></div>
      <div class="form-group"><label class="form-label">Vendor</label><select class="form-select" id="eoVendor">${vendors.map(v => opt(v.key, `${v.name}${v.range ? ` · ${supplyRangeLabel(v.range)}` : ''}`, draft.vendor)).join('')}</select></div>
      <div class="form-group"><label class="form-label">Owner</label><select class="form-select" id="eoOwner">${ORDER_OWNERS.map(n => opt(n, n, draft.owner)).join('')}</select></div>
      <div class="form-group"><label class="form-label">Expected delivery</label><input type="date" class="form-input" id="eoExpected" value="${escapeHtml(draft.expected)}"></div>
      <div class="form-group"><label class="form-label">Vendor PO</label><input class="form-input" id="eoPo" value="${escapeHtml(draft.po)}"></div>
      <div class="form-group"><label class="form-label">Ticket</label><input class="form-input" id="eoTicket" value="${escapeHtml(draft.ticket)}" placeholder="e.g. ZD-1234"></div>
      <div class="form-group"><label class="form-label">Cost centre</label><input class="form-input" id="eoCc" value="${escapeHtml(draft.costCentre)}"></div>
      <div class="form-group"><label class="form-label">Approval required</label><select class="form-select" id="eoApproval">${opt('no', 'Not required', draft.approvalRequired ? 'yes' : 'no')}${opt('yes', 'Required', draft.approvalRequired ? 'yes' : 'no')}</select></div>
      <div class="form-group wide"><label class="form-label">Blocker</label><input class="form-input" id="eoBlocker" value="${escapeHtml(draft.blocker)}" placeholder="e.g. Missing import permit"></div>
    </div></div>
    <div ${tab === 'recipient' ? '' : 'hidden'}><div class="order-form-grid">
      <div class="form-group"><label class="form-label">Recipient</label><input class="form-input" id="eoRecipient" value="${escapeHtml(draft.recipient)}"></div>
      <div class="form-group"><label class="form-label">Route</label><select class="form-select" id="eoRoute">${Object.entries(SLA_ROUTES).map(([k, r]) => opt(k, r.label, draft.route)).join('')}</select></div>
      <div class="form-group wide"><label class="form-label">Delivery address</label><textarea class="form-textarea" id="eoAddress" rows="2">${escapeHtml(draft.address)}</textarea></div>
      <div class="readonly-note wide">Changing the route adds or removes Received at hub and QC &amp; dispatch.</div>
    </div></div>
    <div ${tab === 'pricing' ? '' : 'hidden'}>
      <table class="table order-lines"><thead><tr><th>Item</th><th>Qty</th><th class="num">Unit cost (${o.currency})</th><th class="num">Unit revenue</th><th></th></tr></thead><tbody>
        ${draft.products.map((l, i) => `<tr><td>${escapeHtml(l.name)}<div class="stock-sub">${escapeHtml(l.cat)}</div></td><td><input type="number" min="1" class="form-input qty-input" data-p="${i}" data-k="qty" value="${l.qty}"></td><td class="num">${numIn('p', i, 'unitCost', l.unitCost)}</td><td class="num">${numIn('p', i, 'unitRev', l.unitRev)}</td><td>${draft.products.length > 1 ? `<button type="button" class="btn-text" data-del-p="${i}">Remove</button>` : ''}</td></tr>`).join('')}
        ${draft.fees.map((f, i) => `<tr><td><select class="form-select" data-f="${i}" data-k="type">${ORDER_FEE_TYPES.map(t => opt(t, t, f.type)).join('')}</select></td><td><input type="number" min="1" class="form-input qty-input" data-f="${i}" data-k="qty" value="${f.qty}"></td><td class="num">${numIn('f', i, 'unitCost', f.unitCost)}</td><td class="num">${numIn('f', i, 'unitRev', f.unitRev)}</td><td><button type="button" class="btn-text" data-del-f="${i}">Remove</button></td></tr>`).join('')}
        <tr><td>Shipping</td><td></td><td class="num"><input type="number" step="0.01" min="0" class="form-input money-input" id="eoShipCost" value="${draft.shippingCost}"></td><td class="num"><input type="number" step="0.01" min="0" class="form-input money-input" id="eoShipRev" value="${draft.shippingRev}"></td><td></td></tr>
      </tbody></table>
      <button type="button" class="btn-text" data-add-fee>+ Add extra fee</button>
      <div class="readonly-note">Revenue is prefilled from the client's contract price; change it only for an agreed exception. Edits are written to the audit log.</div>
    </div>`;
  let tab = 'details';
  const p = orderDialog({ title: `Edit ${o.id}`, wide: true, body: `<div id="eoBody">${body()}</div>`, confirm: 'Save changes' });
  const modal = document.getElementById('eoBody');
  const capture = () => {
    const v = id => modal.querySelector(`#${id}`)?.value;
    Object.assign(draft, { priority: v('eoPriority'), vendor: v('eoVendor'), owner: v('eoOwner'), expected: v('eoExpected'), po: v('eoPo').trim(), ticket: v('eoTicket').trim(), costCentre: v('eoCc').trim(), approvalRequired: v('eoApproval') === 'yes', blocker: v('eoBlocker').trim(), recipient: v('eoRecipient').trim(), route: v('eoRoute'), address: v('eoAddress').trim(), shippingCost: +v('eoShipCost') || 0, shippingRev: +v('eoShipRev') || 0 });
    modal.querySelectorAll('[data-p]').forEach(el => { draft.products[+el.dataset.p][el.dataset.k] = +el.value; });
    modal.querySelectorAll('[data-f]').forEach(el => { const f = draft.fees[+el.dataset.f]; if (el.dataset.k === 'type') { f.type = el.value; f.name = el.value === 'Others' ? 'Other' : el.value; } else f[el.dataset.k] = +el.value; });
  };
  modal.addEventListener('click', e => {
    const t = e.target.closest('[data-tab]');
    if (t) { capture(); tab = t.dataset.tab; modal.innerHTML = body(); return; }
    if (e.target.closest('[data-add-fee]')) { capture(); draft.fees.push(orderFee('Transfer Fee', o)); modal.innerHTML = body(); return; }
    const dp = e.target.closest('[data-del-p]');
    if (dp) { capture(); draft.products.splice(+dp.dataset.delP, 1); modal.innerHTML = body(); return; }
    const df = e.target.closest('[data-del-f]');
    if (df) { capture(); draft.fees.splice(+df.dataset.delF, 1); modal.innerHTML = body(); }
  });
  // Capture before the dialog's confirm handler reads values
  modal.closest('.modal').querySelector('[data-ok]').addEventListener('click', capture, true);
  const ok = await p;
  if (!ok) return;
  if (draft.products.some(l => !(l.qty >= 1)) || draft.fees.some(f => !(f.qty >= 1))) { orderToast('Quantities must be at least 1.', 'error'); return; }
  const before = orderPricing(o);
  const labels = { priority: 'Priority', vendor: 'Vendor', owner: 'Owner', expected: 'Expected delivery', po: 'Vendor PO', ticket: 'Ticket', costCentre: 'Cost centre', blocker: 'Blocker', recipient: 'Recipient', route: 'Route', address: 'Address', approvalRequired: 'Approval required' };
  const changes = Object.keys(labels).filter(k => JSON.stringify(draft[k]) !== JSON.stringify(o[k])).map(k => `${labels[k]}: ${k === 'vendor' ? orderVendorName(o[k]) : k === 'route' ? SLA_ROUTES[o[k]].short : String(o[k] || '—')} → ${k === 'vendor' ? orderVendorName(draft[k]) : k === 'route' ? SLA_ROUTES[draft[k]].short : String(draft[k] || '—')}`);
  if (draft.approvalRequired && !o.approvalRequired) o.approval = 'pending';
  Object.assign(o, draft);
  const after = orderPricing(o);
  if (before.subRev !== after.subRev || before.subCost !== after.subCost) changes.push(`Pricing: revenue ${fmtAmount(o.currency, before.subRev)} → ${fmtAmount(o.currency, after.subRev)}, cost ${fmtAmount(o.currency, before.subCost)} → ${fmtAmount(o.currency, after.subCost)}`);
  if (!changes.length) { orderToast('No changes.'); return; }
  changes.forEach(c => orderAudit(o, c));
  saveOrders();
  orderToast(`${o.id} updated (${changes.length} change${changes.length === 1 ? '' : 's'}).`);
  onSaved();
}
