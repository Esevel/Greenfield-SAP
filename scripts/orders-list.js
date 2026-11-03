// Orders · List: the same tiles and filters as Board, a searchable list on the left and the selected order on the right.
// The selection is kept in the URL (?id=) so it survives reloads and can be shared. Needs orders-ui.js and order-detail.js.

(function initOrdersList() {
  const $ = id => document.getElementById(id);
  const f = orderFiltersLoad();
  const requested = new URLSearchParams(location.search).get('id');
  let active = requested === 'ORD-30158' ? requested : '';

  renderOrderHeader('list', () => ORDERS.filter(o => orderMatches(o, f)));
  $('olFilters').innerHTML = orderFilterBarHtml(f);
  const refresh = () => { renderTiles(); renderList(); };
  orderBindFilters($('olFilters'), f, refresh);
  orderBindTiles($('olTiles'), f, refresh);

  const renderTiles = () => { $('olTiles').innerHTML = orderTilesHtml(f); };

  function rowHtml(o) {
    const s = orderSla(o);
    const st = orderState(o);
    const p = orderPricing(o);
    const clickable = o.id === 'ORD-30158';
    return `<${clickable ? 'button type="button"' : 'div'} class="order-row${clickable ? '' : ' record-static'}${o.id === active ? ' active' : ''}" data-id="${o.id}"${clickable ? ` aria-current="${o.id === active}"` : ''}>
      <div class="order-row-top"><span><span class="card-id">${o.id}</span> ${orderPriorityTag(o.priority)}</span>${orderStateBadge(o)}</div>
      <div class="order-row-mid"><strong>${escapeHtml(orderClient(o.client).name)}</strong> · ${escapeHtml(o.recipient)}</div>
      <div class="order-row-bottom"><span>${orderFlag(o.cc)} ${escapeHtml(st === 'complete' ? `Delivered ${fmtOrderDate(o.deliveredAt)}` : st === 'cancelled' ? 'Cancelled' : orderCurrentStage(o))}${s.cur && st !== 'pending' && st !== 'hold' ? ` · <span class="${s.health === 'breached' ? 'text-error' : ''}">${escapeHtml(orderClockText(o))}</span>` : ''}<span class="owner-pair">${ownerAssignmentSummary(o)}</span></span>${marginBadge(p.pct)}</div>
    </${clickable ? 'button' : 'div'}>`;
  }

  function sorted() {
    const rank = o => ({ overdue: 0, pending: 1, hold: 2, progress: 3, paused: 4, complete: 5, cancelled: 6 }[orderState(o)]);
    return ORDERS.filter(o => orderMatches(o, f)).sort((a, b) => rank(a) - rank(b) || (rank(a) >= 5 ? b.createdAt.localeCompare(a.createdAt) : orderSla(b).ratio - orderSla(a).ratio));
  }

  function renderList() {
    const list = sorted();
    $('olCount').textContent = `${list.length} order${list.length === 1 ? '' : 's'} · ${ORDER_STATUS_FILTERS.find(([v]) => v === f.status)[1].toLowerCase()}`;
    $('olList').innerHTML = list.map(rowHtml).join('') || '<div class="board-empty">No orders match these filters.</div>';
  }

  function renderDetail() {
    const root = $('olDetail');
    if (active !== 'ORD-30158' || !orderById(active)) {
      root.innerHTML = '<div class="orders-empty"><div style="font-size: 28px;">☰</div><strong>Select an order</strong><div>Use ↑ ↓ to move through the list.</div></div>';
      return;
    }
    renderOrderDetail(root, active, { compact: true, onChange: refresh });
  }

  function select(id) {
    if (id !== 'ORD-30158') return;
    active = id;
    history.replaceState(null, '', `?id=${id}`);
    // Only toggle the highlight so the row under the cursor isn't replaced mid-click
    document.querySelectorAll('.order-row').forEach(r => { r.classList.toggle('active', r.dataset.id === id); r.setAttribute('aria-current', String(r.dataset.id === id)); });
    renderDetail();
  }

  $('olList').addEventListener('click', e => { const r = e.target.closest('button.order-row'); if (r) select(r.dataset.id); });
  $('olList').addEventListener('keydown', e => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const rows = [...document.querySelectorAll('button.order-row')];
    const i = rows.findIndex(r => r.dataset.id === active);
    const next = rows[Math.max(0, Math.min(rows.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))];
    if (next) { select(next.dataset.id); next.focus(); next.scrollIntoView({ block: 'nearest' }); }
  });

  if (!requested && sorted().some(o => o.id === 'ORD-30158')) active = 'ORD-30158';
  renderTiles();
  renderList();
  renderDetail();
})();
