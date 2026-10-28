// Orders · Board: a column per order stage plus Pending approval / Payment hold and SLA paused lanes; quick-done and
// bulk mark done; card click opens the order page (same detail as Orders · List). Needs orders-ui.js.

(function initOrdersBoard() {
  const $ = id => document.getElementById(id);
  const f = orderFiltersLoad();
  const selected = new Set();
  const openOrder = id => { location.href = `/pages/orders/order.html?id=${id}`; };

  renderOrderHeader('board', () => ORDERS.filter(o => orderMatches(o, f)));
  $('obFilters').innerHTML = orderFilterBarHtml(f);
  orderBindFilters($('obFilters'), f, render);
  orderBindTiles($('obTiles'), f, render);

  const STAGES = slaType('regular').milestones;
  // Lane an order sits in: quotation pre-stage, then blocked/paused, then current SLA stage
  function laneOf(o) {
    const st = orderState(o);
    if (st === 'cancelled') return 'cancelled';
    if (st === 'complete') return 'done';
    if (o.atQuotation) return 'quotation';
    if (st === 'pending' || st === 'hold') return 'blocked';
    if (st === 'paused') return 'paused';
    return orderSla(o).cur.key;
  }

  const tiles = () => { $('obTiles').innerHTML = orderTilesHtml(f); };

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
      ${st === 'cancelled' ? `<div class="card-client">Cancelled · ${escapeHtml(o.cancelled.reason)}</div>` : st === 'complete' ? `<div class="card-client">Delivered ${fmtOrderTs(o.deliveredAt)}</div>` : o.atQuotation ? `<div class="card-client qt-ref-tag">Quotation ${escapeHtml(o.quotationRef)}</div>` : orderRunwayHtml(o)}
      <div class="card-tags">${o.route !== 'hub' ? `<span class="route-tag">${SLA_ROUTES[o.route].short}</span>` : ''}${o.type !== 'regular' ? `<span class="tag-package">${slaType(o.type).name}</span>` : ''}${!o.atQuotation && s.cur ? `<span class="sla-pill ${pillCls}">${pillText}</span>` : ''}</div>
      <div class="card-bottom"><span>${escapeHtml(o.owner)}</span>${o.atQuotation ? `<button type="button" class="btn-quick" data-move-quotation="${o.id}" title="Move to Submitted to vendor">→ Start workflow</button>` : canQuick ? `<button type="button" class="btn-quick" data-quick="${o.id}" title="Mark ${escapeHtml(s.cur.m.label)} done now">✓ ${escapeHtml(s.cur.m.label)}</button>` : st === 'paused' ? `<button type="button" class="btn-quick" data-resume="${o.id}">▶ Resume</button>` : st === 'pending' ? `<button type="button" class="btn-quick" data-approve="${o.id}">Approve</button>` : ''}</div>
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
    let html = column('paused', '⏸ SLA paused', 'Clock stopped', by('paused'), 'board-column-paused');
    html += STAGES.map((m, i) => column(m.key, m.label, `${m.hubOnly ? 'Via hub only · ' : ''}SG standard ${sg[i]}h`, by(m.key))).join('');
    if (['all', 'cancelled', 'delivered'].includes(f.status)) {
      if (f.status !== 'cancelled') html += column('done', 'Delivered', '', by('done'), 'board-column-done');
      html += column('cancelled', 'Cancelled', '', by('cancelled'), 'board-column-done');
    }
    $('obBoard').innerHTML = html;
    syncBulk();
  }

  function syncBulk() {
    [...selected].forEach(id => { const o = orderById(id); if (!o || orderBlockedReason(o) || !orderSla(o).cur) selected.delete(id); });
    $('obBulk').classList.toggle('show', selected.size > 0);
    $('obBulkCount').textContent = `${selected.size} order${selected.size === 1 ? '' : 's'} selected`;
  }

  // Quick-done needs an AWB on the shipping stage, so that one opens the order page instead
  function quickDone(o) {
    const s = orderSla(o);
    if (s.cur.key === 'awb' && !(o.stages.awb?.awb || []).length) { openOrder(o.id); return; }
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
    const mq = e.target.closest('[data-move-quotation]');
    if (mq) { orderTry(() => orderMoveFromQuotation(orderById(mq.dataset.moveQuotation)), render); return; }
    const card = e.target.closest('.order-card');
    if (card) openOrder(card.dataset.id);
  });
  $('obBoard').addEventListener('keydown', e => { const card = e.target.closest('.order-card'); if (card && e.key === 'Enter' && e.target === card) openOrder(card.dataset.id); });

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

  // Links from other pages (e.g. quotations) may still use ?open= — redirect to the order page
  const openParam = new URLSearchParams(location.search).get('open');
  if (openParam && orderById(openParam)) { openOrder(openParam); } else { render(); }
})();
