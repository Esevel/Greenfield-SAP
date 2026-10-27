// Orders · List: searchable, filterable list on the left; orders open as tabs (kept for the session) with the full
// order detail on the right. Selecting a row doesn't open a new tab each time: it replaces the unpinned preview tab.
// Needs orders-ui.js and order-detail.js.

(function initOrdersList() {
  const $ = id => document.getElementById(id);
  const f = orderFiltersLoad();
  const tabs = orderTabs();
  const MAX_TABS = 8;
  const param = new URLSearchParams(location.search).get('id');

  $('orderActions').innerHTML = orderHeaderActionsHtml();
  $('olView').innerHTML = orderViewToggleHtml('list');
  $('olFilters').innerHTML = orderFilterBarHtml(f);
  orderBindHeader(() => ORDERS.filter(o => orderMatches(o, f)));
  orderBindFilters($('olFilters'), f, renderList);

  // tabs.open: [{ id, pinned }]; the single unpinned tab is the preview that list clicks replace
  tabs.open = (tabs.open || []).filter(t => orderById(t.id)).map(t => (typeof t === 'string' ? { id: t, pinned: true } : t));
  function openTab(id, pin = false) {
    const existing = tabs.open.find(t => t.id === id);
    if (existing) { if (pin) existing.pinned = true; }
    else {
      const preview = tabs.open.findIndex(t => !t.pinned);
      if (preview >= 0 && !pin) tabs.open[preview] = { id, pinned: false };
      else tabs.open.push({ id, pinned: pin });
      while (tabs.open.length > MAX_TABS) {
        const drop = tabs.open.findIndex(t => t.id !== id);
        tabs.open.splice(drop, 1);
        orderToast(`Up to ${MAX_TABS} tabs stay open; the oldest was closed.`);
      }
    }
    tabs.active = id;
    saveOrderTabs(tabs);
    renderTabs();
    markActive();
    renderDetail();
  }
  // Only toggle the highlight so a double-click on the same row still lands on the same element
  const markActive = () => document.querySelectorAll('.order-row').forEach(r => r.classList.toggle('active', r.dataset.id === tabs.active));
  function closeTab(id) {
    const i = tabs.open.findIndex(t => t.id === id);
    tabs.open.splice(i, 1);
    if (tabs.active === id) tabs.active = (tabs.open[i] || tabs.open[i - 1] || {}).id || '';
    saveOrderTabs(tabs);
    renderTabs();
    renderList();
    renderDetail();
  }

  function rowHtml(o) {
    const s = orderSla(o);
    const st = orderState(o);
    const p = orderPricing(o);
    return `<button type="button" class="order-row${o.id === tabs.active ? ' active' : ''}" data-id="${o.id}">
      <div class="order-row-top"><span><span class="card-id">${o.id}</span> ${orderPriorityTag(o.priority)}</span>${orderStateBadge(o)}</div>
      <div class="order-row-mid"><strong>${escapeHtml(orderClient(o.client).name)}</strong> · ${escapeHtml(o.recipient)}</div>
      <div class="order-row-bottom"><span>${orderFlag(o.cc)} ${escapeHtml(st === 'complete' ? `Delivered ${fmtOrderDate(o.deliveredAt)}` : st === 'cancelled' ? 'Cancelled' : orderCurrentStage(o))}${s.cur && st !== 'pending' && st !== 'hold' ? ` · <span class="${s.health === 'breached' ? 'text-error' : ''}">${escapeHtml(orderClockText(o))}</span>` : ''}</span>${marginBadge(p.pct)}</div>
    </button>`;
  }

  function renderList() {
    const rank = o => ({ overdue: 0, pending: 1, hold: 2, progress: 3, paused: 4, complete: 5, cancelled: 6 }[orderState(o)]);
    const list = ORDERS.filter(o => orderMatches(o, f)).sort((a, b) => rank(a) - rank(b) || (rank(a) >= 5 ? b.createdAt.localeCompare(a.createdAt) : orderSla(b).ratio - orderSla(a).ratio));
    $('olCount').textContent = `${list.length} order${list.length === 1 ? '' : 's'} · ${ORDER_STATUS_FILTERS.find(([v]) => v === f.status)[1].toLowerCase()}`;
    $('olList').innerHTML = list.map(rowHtml).join('') || '<div class="board-empty">No orders match these filters.</div>';
  }

  function renderTabs() {
    $('olTabs').innerHTML = tabs.open.map(t => {
      const o = orderById(t.id);
      return `<button type="button" role="tab" class="order-tab${t.id === tabs.active ? ' active' : ''}" data-tab="${t.id}" aria-selected="${t.id === tabs.active}" title="${t.pinned ? '' : 'Preview: double-click to keep open'}">
        <span${t.pinned ? '' : ' style="font-style: italic"'}>${t.id}</span><span class="text-muted">${escapeHtml(orderClient(o.client).logo)}</span><span class="order-tab-close" data-close="${t.id}" aria-label="Close ${t.id}" role="button">×</span></button>`;
    }).join('') + (tabs.open.length > 1 ? '<span class="order-tabbar-actions"><button type="button" class="btn-text" id="olCloseAll">Close all</button></span>' : '');
  }

  function renderDetail() {
    const root = $('olDetail');
    if (!tabs.active) {
      root.innerHTML = '<div class="orders-empty"><div style="font-size: 28px;">☰</div><strong>Select an order</strong><div>Orders you open stay as tabs while you work.</div></div>';
      return;
    }
    renderOrderDetail(root, tabs.active, { compact: true, onChange: () => { renderList(); renderTabs(); } });
  }

  $('olList').addEventListener('click', e => { const r = e.target.closest('.order-row'); if (r) openTab(r.dataset.id); });
  $('olList').addEventListener('dblclick', e => { const r = e.target.closest('.order-row'); if (r) openTab(r.dataset.id, true); });
  $('olTabs').addEventListener('click', e => {
    const c = e.target.closest('[data-close]');
    if (c) { e.stopPropagation(); closeTab(c.dataset.close); return; }
    if (e.target.id === 'olCloseAll') { tabs.open = []; tabs.active = ''; saveOrderTabs(tabs); renderTabs(); renderList(); renderDetail(); return; }
    const t = e.target.closest('[data-tab]');
    if (t) { tabs.active = t.dataset.tab; saveOrderTabs(tabs); renderTabs(); markActive(); renderDetail(); }
  });
  $('olTabs').addEventListener('dblclick', e => { const t = e.target.closest('[data-tab]'); if (t) openTab(t.dataset.tab, true); });

  renderTabs();
  renderList();
  if (param && orderById(param)) openTab(param, true);
  else {
    if (!tabs.active && tabs.open.length) tabs.active = tabs.open[0].id;
    renderDetail();
  }
})();
