// Orders · Board: a column per order stage plus Pending approval / Payment hold and SLA paused lanes; quick-done and
// bulk mark done; card click opens a drawer with the stage list and quick actions. Needs orders-ui.js.

(function initOrdersBoard() {
  const $ = id => document.getElementById(id);
  const f = orderFiltersLoad();
  const selected = new Set();
  let drawerId = null;

  $('orderActions').innerHTML = orderHeaderActionsHtml();
  $('obView').innerHTML = orderViewToggleHtml('board');
  $('obFilters').innerHTML = orderFilterBarHtml(f);
  orderBindHeader(() => ORDERS.filter(o => orderMatches(o, f)));
  orderBindFilters($('obFilters'), f, render);

  const STAGES = slaType('regular').milestones;
  // Lane an order sits in: blocked / paused lanes first, then its current stage; delivered and cancelled lanes for those filters
  function laneOf(o) {
    const st = orderState(o);
    if (st === 'cancelled') return 'cancelled';
    if (st === 'complete') return 'done';
    if (st === 'pending' || st === 'hold') return 'blocked';
    if (st === 'paused') return 'paused';
    return orderSla(o).cur.key;
  }

  function tiles() {
    const open = openOrders();
    const n = st => open.filter(o => orderState(o) === st).length;
    const risk = open.filter(o => orderState(o) === 'progress' && orderSla(o).health === 'risk').length;
    const weekAgo = new Date(ORDER_NOW.getTime() - 7 * 864e5);
    const delivered = ORDERS.filter(o => o.deliveredAt && new Date(o.deliveredAt) >= weekAgo).length;
    const tile = (label, value, cls = '', status = '') => `<button type="button" class="summary-tile summary-tile-link ${cls}" ${status ? `data-status="${status}"` : ''}><div class="summary-tile-label">${label}</div><div class="summary-tile-value">${value}</div></button>`;
    $('obTiles').innerHTML = tile('Open', open.length, '', 'open')
      + tile('Overdue', n('overdue'), n('overdue') ? 'summary-tile-breached' : '', 'overdue')
      + tile('At risk', risk, risk ? 'summary-tile-alert' : '', 'attention')
      + tile('Pending approval · on hold', `${n('pending')} · ${n('hold')}`, n('pending') + n('hold') ? 'summary-tile-alert' : '', 'attention')
      + tile('Delivered (7 days)', delivered, 'summary-tile-ok', 'all');
  }

  function cardHtml(o) {
    const s = orderSla(o);
    const st = orderState(o);
    const [pillCls, pillText] = ORDER_HEALTH_PILL[s.health];
    const canQuick = !orderBlockedReason(o) && s.cur && st !== 'paused';
    return `<div class="board-card order-card${o.blocker || st === 'hold' ? ' blocked' : ''}${selected.has(o.id) ? ' selected' : ''}" data-id="${o.id}" tabindex="0">
      <div class="card-top"><label class="order-check" title="Select"><input type="checkbox" data-sel="${o.id}" ${selected.has(o.id) ? 'checked' : ''} ${canQuick ? '' : 'disabled'} aria-label="Select ${o.id}"></label><span class="card-id">${o.id}</span>${orderPriorityTag(o.priority)}</div>
      <div class="card-subject">${escapeHtml(orderClient(o.client).name)}</div>
      <div class="card-recipient">${escapeHtml(o.recipient)} · ${orderFlag(o.cc)} · ${escapeHtml(orderVendorName(o.vendor))}</div>
      <div class="card-client">${escapeHtml(o.products.map(l => `${l.qty} × ${l.name}`).join(', '))}</div>
      ${orderFlagsHtml(o)}
      ${st === 'cancelled' ? `<div class="card-client">Cancelled · ${escapeHtml(o.cancelled.reason)}</div>` : st === 'complete' ? `<div class="card-client">Delivered ${fmtOrderTs(o.deliveredAt)}</div>` : orderRunwayHtml(o)}
      <div class="card-tags">${o.route !== 'hub' ? `<span class="route-tag">${SLA_ROUTES[o.route].short}</span>` : ''}${o.type !== 'regular' ? `<span class="tag-package">${slaType(o.type).name}</span>` : ''}${s.cur ? `<span class="sla-pill ${pillCls}">${pillText}</span>` : ''}</div>
      <div class="card-bottom"><span>${escapeHtml(o.owner)}</span>${canQuick ? `<button type="button" class="btn-quick" data-quick="${o.id}" title="Mark ${escapeHtml(s.cur.m.label)} done now">✓ ${escapeHtml(s.cur.m.label)}</button>` : st === 'paused' ? `<button type="button" class="btn-quick" data-resume="${o.id}">▶ Resume</button>` : st === 'pending' ? `<button type="button" class="btn-quick" data-approve="${o.id}">Approve</button>` : ''}</div>
    </div>`;
  }

  function column(key, title, sub, cards, cls = '') {
    return `<section class="board-column ${cls}">
      <div class="board-column-header"><div class="board-column-title">${title} <span class="board-count">${cards.length}</span></div>${sub ? `<span class="board-avg">${sub}</span>` : ''}</div>
      <div class="board-cards">${cards.map(cardHtml).join('') || '<div class="board-empty">Nothing here</div>'}</div>
    </section>`;
  }

  function render() {
    tiles();
    const list = ORDERS.filter(o => orderMatches(o, f)).sort((a, b) => {
      const ha = orderSla(a), hb = orderSla(b);
      const rank = { breached: 0, risk: 1, ok: 2, complete: 3 };
      return rank[ha.health] - rank[hb.health] || hb.ratio - ha.ratio;
    });
    const by = key => list.filter(o => laneOf(o) === key);
    const sg = SLA_DEFAULTS.regular.SG;
    let html = column('blocked', 'Pending approval · Payment hold', 'Processing blocked', by('blocked'), 'board-column-blocked');
    html += column('paused', '⏸ SLA paused', 'Clock stopped', by('paused'), 'board-column-paused');
    html += STAGES.map((m, i) => column(m.key, m.label, `${m.hubOnly ? 'Via hub only · ' : ''}SG standard ${sg[i]}h`, by(m.key))).join('');
    if (['all', 'cancelled'].includes(f.status)) {
      if (f.status === 'all') html += column('done', 'Delivered', '', by('done'), 'board-column-done');
      html += column('cancelled', 'Cancelled', '', by('cancelled'), 'board-column-done');
    }
    $('obBoard').innerHTML = html;
    syncBulk();
    if (drawerId) renderDrawer();
  }

  function syncBulk() {
    [...selected].forEach(id => { const o = orderById(id); if (!o || orderBlockedReason(o) || !orderSla(o).cur) selected.delete(id); });
    $('obBulk').classList.toggle('show', selected.size > 0);
    $('obBulkCount').textContent = `${selected.size} order${selected.size === 1 ? '' : 's'} selected`;
  }

  // Quick-done needs an AWB on the shipping stage, so that one opens the drawer instead
  function quickDone(o) {
    const s = orderSla(o);
    if (s.cur.key === 'awb' && !(o.stages.awb?.awb || []).length) { openDrawer(o.id); orderToast('Add the AWB / tracking number first.', 'error'); return; }
    orderTry(() => orderMarkDone(o), render);
  }

  $('obBoard').addEventListener('click', e => {
    const sel = e.target.closest('[data-sel]');
    if (sel) { e.stopPropagation(); sel.checked ? selected.add(sel.dataset.sel) : selected.delete(sel.dataset.sel); sel.closest('.order-card').classList.toggle('selected', sel.checked); syncBulk(); return; }
    if (e.target.closest('.order-check')) return;
    const q = e.target.closest('[data-quick]');
    if (q) { quickDone(orderById(q.dataset.quick)); return; }
    const r = e.target.closest('[data-resume]');
    if (r) { resume(orderById(r.dataset.resume)); return; }
    const a = e.target.closest('[data-approve]');
    if (a) { orderTry(() => orderApprove(orderById(a.dataset.approve)), render); return; }
    const card = e.target.closest('.order-card');
    if (card) openDrawer(card.dataset.id);
  });
  $('obBoard').addEventListener('keydown', e => { const card = e.target.closest('.order-card'); if (card && e.key === 'Enter' && e.target === card) openDrawer(card.dataset.id); });
  $('obTiles').addEventListener('click', e => {
    const t = e.target.closest('[data-status]');
    if (!t) return;
    f.status = t.dataset.status;
    orderFiltersSave(f);
    $('ofStatus').value = f.status;
    render();
  });

  $('obBulkDone').addEventListener('click', () => {
    const list = [...selected].map(orderById);
    const needAwb = list.filter(o => orderSla(o).cur.key === 'awb' && !(o.stages.awb?.awb || []).length);
    let done = 0;
    const failed = [];
    list.filter(o => !needAwb.includes(o)).forEach(o => { try { orderMarkDone(o); done++; } catch (err) { failed.push(`${o.id}: ${err.message}`); } });
    selected.clear();
    render();
    const skip = needAwb.length ? ` ${needAwb.length} skipped: shipping info needs an AWB (${needAwb.map(o => o.id).join(', ')}).` : '';
    orderToast(`${done} order${done === 1 ? '' : 's'} moved to the next stage.${skip}${failed.length ? ` ${failed.join(' · ')}` : ''}`, needAwb.length || failed.length ? 'error' : 'ok');
  });
  $('obBulkClear').addEventListener('click', () => { selected.clear(); render(); });

  async function resume(o) {
    const v = await orderDialog({ title: `Resume SLA · ${o.id}`, fields: [{ id: 'r', label: 'Reason', type: 'textarea', required: true, placeholder: 'e.g. Client approved budget' }], confirm: 'Resume' });
    if (v) orderTry(() => orderResume(o, v.r), render);
  }

  /* ---------- Drawer ---------- */

  function openDrawer(id) {
    drawerId = id;
    renderDrawer();
    $('obDrawer').classList.add('open');
    $('obOverlay').classList.add('show');
  }
  function closeDrawer() {
    drawerId = null;
    $('obDrawer').classList.remove('open');
    $('obOverlay').classList.remove('show');
  }
  $('obDrawerClose').addEventListener('click', closeDrawer);
  $('obOverlay').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && drawerId && !document.querySelector('.modal-overlay')) closeDrawer(); });

  function renderDrawer() {
    const o = orderById(drawerId);
    const s = orderSla(o);
    const p = orderPricing(o);
    $('obDrawerTitle').textContent = `${o.id} · ${orderClient(o.client).name}`;
    $('obDrawerMeta').innerHTML = `${orderStateBadge(o)} ${orderPriorityTag(o.priority)} · ${escapeHtml(o.recipient)} · ${orderFlag(o.cc)} ${WH_COUNTRIES[o.cc][1]}`;
    const steps = s.active.map(st => {
      const cls = st.state === 'done' ? (st.over ? 'ms-done ms-health-breached' : 'ms-done') : st.state === 'current' ? `ms-current${s.health === 'breached' ? ' ms-health-breached' : s.health === 'risk' ? ' ms-health-risk' : ''}` : st.state === 'skipped' ? 'ms-skipped' : 'ms-upcoming';
      const detail = st.state === 'done' ? `${fmtOrderTs(st.doneAt)} · ${fmtBiz(st.mins, o.cc)} of ${st.hours}h${st.over ? ' · over target' : ''}`
        : st.state === 'current' ? `${fmtBiz(st.mins, o.cc)} of ${st.hours}h${s.paused ? ' · paused' : ''}`
          : st.state === 'skipped' ? escapeHtml(st.skipReason) : `Target ${st.hours}h`;
      return `<li class="${cls}"><div class="ms-name">${st.m.label}${st.custom ? ' <span class="ms-custom">custom</span>' : ''}</div><div class="ms-detail">${detail}</div></li>`;
    }).join('');
    const awb = (o.stages.awb?.awb || []);
    $('obDrawerBody').innerHTML = `
      ${orderFlagsHtml(o) ? `<div class="drawer-flags">${orderFlagsHtml(o)}</div>` : ''}
      <div class="panel-section">
        <h4 class="panel-section-title">Stages</h4>
        <ol class="ms-track">${steps}</ol>
        <div class="readonly-note">Business hours in ${WH_COUNTRIES[o.cc][1]} (${calCountry(o.cc).hours}, ${calCountry(o.cc).tz}). Elapsed ${fmtBiz(s.elapsed, o.cc)} of ${fmtBiz(s.totalMins, o.cc)} end-to-end${s.cur ? ` · due ${fmtOrderTs(s.due)}` : ''}.</div>
      </div>
      ${s.cur && s.cur.key === 'awb' ? `<div class="panel-section">
        <h4 class="panel-section-title">Shipping info</h4>
        <div class="awb-quick">
          <input class="form-input" id="dwCourier" placeholder="Courier" value="${escapeHtml(awb[0]?.courier || ORDER_COURIER[o.cc])}" aria-label="Courier">
          <input class="form-input" id="dwTracking" placeholder="Tracking number" value="${escapeHtml(awb[0]?.tracking || '')}" aria-label="Tracking number">
          <button type="button" class="btn btn-secondary btn-sm" id="dwAwbSave">Save AWB</button>
        </div>
        <div class="readonly-note">Add more shipments on the order page.</div>
      </div>` : ''}
      <div class="panel-section">
        <h4 class="panel-section-title">Order</h4>
        <div class="info-grid">
          <div class="info-row"><span class="info-label">Items</span><span class="info-value">${o.products.map(l => `${l.qty} × ${escapeHtml(l.name)}`).join('<br>')}</span></div>
          <div class="info-row"><span class="info-label">Vendor</span><span class="info-value">${escapeHtml(orderVendorName(o.vendor))}${o.po ? ` · ${escapeHtml(o.po)}` : ''}</span></div>
          <div class="info-row"><span class="info-label">Route</span><span class="info-value">${SLA_ROUTES[o.route].label}</span></div>
          <div class="info-row"><span class="info-label">Revenue</span><span class="info-value">${fmtAmount(o.currency, p.totalRev)}${p.tax.rate ? ` incl. ${escapeHtml(p.tax.label)}` : ''} ${marginBadge(p.pct)}</span></div>
          <div class="info-row"><span class="info-label">Expected delivery</span><span class="info-value">${fmtOrderDate(o.expected)}</span></div>
          <div class="info-row"><span class="info-label">Owner</span><span class="info-value">${escapeHtml(o.owner)}</span></div>
        </div>
      </div>`;
    const block = orderBlockedReason(o);
    const paused = orderIsPaused(o);
    $('obDrawerFoot').innerHTML = `<a href="/pages/tracker/order.html?id=${o.id}" class="btn btn-secondary">Open order</a>
      ${orderPendingApproval(o) ? '<button type="button" class="btn btn-primary" id="dwApprove">Approve</button>' : ''}
      ${o.paymentHold ? '<button type="button" class="btn btn-primary" id="dwRelease">Release hold</button>' : ''}
      ${!block && s.cur ? `<button type="button" class="btn btn-secondary" id="dwPause">${paused ? '▶ Resume SLA' : '⏸ Pause SLA'}</button><button type="button" class="btn btn-primary" id="dwDone">Mark ${escapeHtml(s.cur.m.label)} done</button>` : ''}`;
    const on = (id, fn) => { const el = $(id); if (el) el.addEventListener('click', fn); };
    on('dwDone', () => quickDone(o));
    on('dwApprove', () => orderTry(() => orderApprove(o), render));
    on('dwRelease', () => orderTry(() => orderSetHold(o, false), render));
    on('dwPause', async () => {
      if (paused) return resume(o);
      const v = await orderDialog({ title: `Pause SLA · ${o.id}`, text: 'The clock stops until you resume it. Marking a stage done resumes it automatically.', fields: [{ id: 'r', label: 'Reason', type: 'textarea', required: true, placeholder: 'e.g. Waiting for client to confirm address' }], confirm: 'Pause SLA' });
      if (v) orderTry(() => orderPause(o, v.r), render);
    });
    on('dwAwbSave', () => orderTry(() => orderSetAwb(o, [{ courier: $('dwCourier').value.trim(), tracking: $('dwTracking').value.trim(), url: '' }, ...(o.stages.awb?.awb || []).slice(1)]), render));
  }

  const openParam = new URLSearchParams(location.search).get('open');
  render();
  if (openParam && orderById(openParam)) openDrawer(openParam);
})();
