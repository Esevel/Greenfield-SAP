// Orders · Insights: KPIs for 7 / 30 / 90 days with change vs the previous period, status mix, weekly SLA compliance
// with a 4-week average, stage bottlenecks vs target, monthly revenue, week on week, vendor and client tables.
// Charts are plain SVG / CSS. Needs orders-ui.js.

(function initOrdersInsights() {
  const $ = id => document.getElementById(id);
  let days = 30;
  let client = '';
  const expanded = new Set();

  $('orderActions').innerHTML = orderHeaderActionsHtml();
  $('oiView').innerHTML = orderViewToggleHtml('insights');
  orderBindHeader(() => inPeriod(days, 0));
  $('oiClient').innerHTML = '<option value="">All</option>' + WH_CLIENTS.filter(c => ORDERS.some(o => o.client === c.id)).map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');

  const DAY = 864e5;
  const base = () => ORDERS.filter(o => !client || o.client === client);
  // Orders created in [now - (offset+days), now - offset)
  const inPeriod = (d, offset) => base().filter(o => { const t = new Date(o.createdAt); return t >= new Date(ORDER_NOW - (offset + d) * DAY) && t < new Date(ORDER_NOW - offset * DAY); });
  const sgd = list => list.filter(o => !o.cancelled).reduce((n, o) => n + orderToSGD(orderPricing(o).subRev, o.currency), 0);
  const fmtSgd = v => `SGD ${Math.round(v).toLocaleString('en')}`;
  const stagesDone = list => list.flatMap(o => orderSla(o).steps.filter(s => s.state === 'done'));
  const compliance = list => { const st = stagesDone(list); return st.length ? (st.filter(s => !s.over).length / st.length) * 100 : null; };
  const marginOf = list => { const l = list.filter(o => !o.cancelled); const rev = l.reduce((n, o) => n + orderToSGD(orderPricing(o).subRev, o.currency), 0); const cost = l.reduce((n, o) => n + orderToSGD(orderPricing(o).subCost, o.currency), 0); return rev ? ((rev - cost) / rev) * 100 : null; };
  const avgDelivery = list => { const d = list.filter(o => o.deliveredAt); return d.length ? d.reduce((n, o) => n + orderSla(o).elapsed, 0) / d.length : null; };

  function delta(cur, prev, higherBetter, pct) {
    if (cur == null || prev == null) return '<div class="kpi-delta">No earlier data</div>';
    const diff = pct ? cur - prev : prev ? ((cur - prev) / prev) * 100 : 0;
    if (Math.abs(diff) < 0.05) return '<div class="kpi-delta">No change vs previous</div>';
    const good = higherBetter ? diff > 0 : diff < 0;
    return `<div class="kpi-delta ${good ? 'good' : 'bad'}">${diff > 0 ? '▲' : '▼'} ${Math.abs(diff).toFixed(1)}${pct ? ' pts' : '%'} vs previous ${days} days</div>`;
  }

  function kpis() {
    const cur = inPeriod(days, 0);
    const prev = inPeriod(days, days);
    const live = l => l.filter(o => !o.cancelled);
    const open = base().filter(o => !o.deliveredAt && !o.cancelled);
    const overdue = open.filter(o => orderState(o) === 'overdue');
    const tile = (label, value, d, cls = '') => `<div class="summary-tile ${cls}"><div class="summary-tile-label">${label}</div><div class="summary-tile-value">${value}</div>${d}</div>`;
    const c = compliance(cur), cp = compliance(prev);
    const m = marginOf(cur), mp = marginOf(prev);
    const ad = avgDelivery(cur), adp = avgDelivery(prev);
    $('oiKpis').innerHTML = tile('Orders created', live(cur).length, delta(live(cur).length, live(prev).length, true))
      + tile('Delivered', live(cur).filter(o => o.deliveredAt).length, delta(live(cur).filter(o => o.deliveredAt).length, live(prev).filter(o => o.deliveredAt).length, true), 'summary-tile-ok')
      + tile('Overdue now', overdue.length, `<div class="kpi-delta">${open.length} open</div>`, overdue.length ? 'summary-tile-breached' : '')
      + tile('SLA compliance', c == null ? '—' : `${c.toFixed(1)}%`, delta(c, cp, true, true))
      + tile('Revenue (SGD)', fmtSgd(sgd(cur)), delta(sgd(cur), sgd(prev), true))
      + tile('Margin', m == null ? '—' : `${m.toFixed(1)}%`, delta(m, mp, true, true) + (ad != null ? `<div class="kpi-delta">Avg delivery ${fmtBiz(ad, 'SG')}${adp != null ? ` (was ${fmtBiz(adp, 'SG')})` : ''}</div>` : ''));
    const from = new Date(ORDER_NOW - days * DAY);
    $('oiRange').textContent = `${from.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${ORDER_NOW.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }

  function mix() {
    const list = inPeriod(days, 0);
    const groups = [
      ['Delivered', '#22c55e', list.filter(o => orderState(o) === 'complete')],
      ['In progress', '#3b82f6', list.filter(o => ['progress', 'paused'].includes(orderState(o)))],
      ['Overdue', '#ef4444', list.filter(o => orderState(o) === 'overdue')],
      ['Pending approval / hold', '#f59e0b', list.filter(o => ['pending', 'hold'].includes(orderState(o)))],
      ['Cancelled', '#a3a3a3', list.filter(o => orderState(o) === 'cancelled')]
    ];
    const total = list.length || 1;
    let acc = 0;
    const stops = groups.map(([, col, l]) => { const a = acc; acc += (l.length / total) * 360; return `${col} ${a}deg ${acc}deg`; }).join(', ');
    $('oiMix').innerHTML = `<div class="donut-wrap"><div class="donut" style="background: ${list.length ? `conic-gradient(${stops})` : 'var(--color-background)'}"><div class="donut-center"><strong>${list.length}</strong>orders</div></div>
      <ul class="legend-list">${groups.map(([l, col, g]) => `<li><i style="background:${col}"></i><span>${l}</span><span>${g.length}</span></li>`).join('')}</ul></div>`;
  }

  function trend() {
    // 13 weeks back from the current week; points per week, line = 4-week rolling average
    const weeks = 13;
    const weekStart = new Date(ORDER_NOW); weekStart.setHours(0, 0, 0, 0); weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    const pts = [];
    for (let w = weeks - 1; w >= 0; w--) {
      const a = new Date(weekStart - w * 7 * DAY), b = new Date(a.getTime() + 7 * DAY);
      const st = base().flatMap(o => orderSla(o).steps.filter(s => s.state === 'done' && new Date(s.doneAt) >= a && new Date(s.doneAt) < b));
      pts.push({ label: a.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), v: st.length ? (st.filter(s => !s.over).length / st.length) * 100 : null, n: st.length });
    }
    const W = 320, H = 150, L = 28, B = 22, T = 8;
    const x = i => L + (i * (W - L - 6)) / (weeks - 1);
    const y = v => T + (1 - (v - 50) / 50) * (H - T - B);
    const valid = pts.map((p, i) => ({ ...p, i })).filter(p => p.v != null);
    const avg = valid.map((p, k) => { const win = valid.slice(Math.max(0, k - 3), k + 1); return { i: p.i, v: win.reduce((n, q) => n + q.v, 0) / win.length }; });
    const grid = [50, 75, 90, 100].map(v => `<line class="${v === 90 ? 'target-line' : 'grid-line'}" x1="${L}" x2="${W}" y1="${y(v)}" y2="${y(v)}"/><text x="0" y="${y(v) + 3}">${v}%</text>`).join('');
    const bars = valid.map(p => `<rect x="${x(p.i) - 7}" y="${y(Math.max(50, p.v))}" width="14" height="${H - B - y(Math.max(50, p.v))}" rx="2" fill="${p.v >= 90 ? 'rgba(34,197,94,.55)' : p.v >= 75 ? 'rgba(245,158,11,.6)' : 'rgba(239,68,68,.55)'}"><title>${p.label}: ${p.v.toFixed(1)}% of ${p.n} stages</title></rect>`).join('');
    const line = `<polyline class="line-avg" points="${avg.map(p => `${x(p.i)},${y(Math.max(50, p.v))}`).join(' ')}"/>`;
    const labels = pts.map((p, i) => (i % 3 === 0 || i === weeks - 1 ? `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${p.label}</text>` : '')).join('');
    $('oiTrend').innerHTML = `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Weekly SLA compliance">${grid}${bars}${line}${labels}</svg>
      <div class="gantt-legend"><span><i style="background: rgba(34,197,94,.55)"></i>90%+</span><span><i style="background:#7c3aed"></i>4-week average</span><span><i style="background:#ef4444"></i>90% target</span></div>`;
  }

  function bottleneck() {
    const ms = slaType('regular').milestones;
    const list = inPeriod(Math.max(days, 30), 0);
    const rows = ms.map(m => {
      const st = list.flatMap(o => orderSla(o).steps.filter(s => s.key === m.key && s.state === 'done'));
      const avg = st.length ? st.reduce((n, s) => n + s.mins, 0) / st.length / 60 : 0;
      const target = SLA_DEFAULTS.regular.SG[ms.indexOf(m)];
      return { m, avg, target, n: st.length };
    });
    const max = Math.max(...rows.map(r => Math.max(r.avg, r.target))) || 1;
    $('oiBottleneck').innerHTML = rows.map(r => `<div class="bar-h" title="${r.n} completed stages">
      <span>${r.m.label}</span>
      <div class="bar-h-track"><div class="bar-h-fill ${r.avg > r.target ? 'over' : ''}" style="width:${(r.avg / max) * 100}%"></div><div class="bar-h-target" style="left:${(r.target / max) * 100}%"></div></div>
      <span class="${r.avg > r.target ? 'text-error' : 'text-muted'}">${r.avg.toFixed(1)}h / ${r.target}h</span></div>`).join('')
      + `<div class="readonly-note">Average business hours per completed stage${days < 30 ? ' (last 30 days)' : ''} vs the SG standard target (red marker).</div>`;
  }

  function monthly() {
    const months = [];
    for (let i = 5; i >= 0; i--) { const d = new Date(ORDER_NOW.getFullYear(), ORDER_NOW.getMonth() - i, 1); months.push(d); }
    const vals = months.map(d => { const e = new Date(d.getFullYear(), d.getMonth() + 1, 1); return sgd(base().filter(o => { const t = new Date(o.createdAt); return t >= d && t < e; })); });
    const max = Math.max(...vals) || 1;
    const W = 460, H = 170, B = 30, T = 18;
    const bw = 44, gap = (W - bw * 6) / 6;
    const bars = vals.map((v, i) => {
      const h = (v / max) * (H - B - T);
      const xx = gap / 2 + i * (bw + gap);
      const chg = i && vals[i - 1] ? ((v - vals[i - 1]) / vals[i - 1]) * 100 : null;
      const mtd = i === 5;
      return `<rect x="${xx}" y="${H - B - h}" width="${bw}" height="${h}" rx="3" fill="${mtd ? 'rgba(59,130,246,.45)' : 'var(--color-primary)'}"><title>${fmtSgd(v)}</title></rect>
        <text x="${xx + bw / 2}" y="${H - B - h - 5}" text-anchor="middle">${v >= 1000 ? `${Math.round(v / 1000)}k` : Math.round(v)}${chg != null ? ` ${chg >= 0 ? '▲' : '▼'}${Math.abs(chg).toFixed(0)}%` : ''}</text>
        <text x="${xx + bw / 2}" y="${H - 10}" text-anchor="middle">${months[i].toLocaleDateString('en-GB', { month: 'short' })}${mtd ? '*' : ''}</text>`;
    }).join('');
    $('oiMonthly').innerHTML = `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Monthly revenue in SGD">${bars}</svg><div class="readonly-note">By month the order was created, before tax. * month to date.</div>`;
  }

  function wow() {
    const weekStart = new Date(ORDER_NOW); weekStart.setHours(0, 0, 0, 0); weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    const range = w => { const a = new Date(weekStart - w * 7 * DAY), b = new Date(a.getTime() + 7 * DAY); return base().filter(o => { const t = new Date(o.createdAt); return t >= a && t < b; }); };
    const last = range(1), prev = range(2);
    const cell = (label, a, b, fmt, higher) => {
      const d = b ? ((a - b) / b) * 100 : null;
      const good = d == null ? null : higher ? d >= 0 : d <= 0;
      return `<div><div class="wow-label">${label}</div><div class="wow-value">${fmt(a)}</div><div class="kpi-delta ${good == null ? '' : good ? 'good' : 'bad'}">${d == null ? '—' : `${d >= 0 ? '▲' : '▼'} ${Math.abs(d).toFixed(0)}%`} vs ${fmt(b)}</div></div>`;
    };
    const cl = compliance(last), cpv = compliance(prev);
    $('oiWow').innerHTML = `<div class="wow-grid">${cell('Orders', last.length, prev.length, v => v, true)}${cell('Revenue', sgd(last), sgd(prev), fmtSgd, true)}
      <div><div class="wow-label">SLA compliance</div><div class="wow-value">${cl == null ? '—' : `${cl.toFixed(1)}%`}</div><div class="kpi-delta ${cl != null && cpv != null ? (cl >= cpv ? 'good' : 'bad') : ''}">${cpv == null ? '—' : `vs ${cpv.toFixed(1)}%`}</div></div></div>
      <div class="readonly-note">Last full week (from ${new Date(weekStart - 7 * DAY).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}) compared with the week before.</div>`;
  }

  function vendors() {
    const list = inPeriod(days, 0).filter(o => !o.cancelled);
    const rows = [...new Set(list.map(o => o.vendor))].map(v => {
      const l = list.filter(o => o.vendor === v);
      const del = l.filter(o => o.deliveredAt);
      return { v, n: l.length, rev: sgd(l), c: compliance(l), avg: del.length ? del.reduce((n, o) => n + orderSla(o).elapsed, 0) / del.length : null, late: l.filter(o => orderState(o) === 'overdue').length };
    }).sort((a, b) => b.rev - a.rev);
    $('oiVendors').innerHTML = rows.length ? `<table class="table insights-table"><thead><tr><th>Vendor</th><th class="num">Orders</th><th class="num">Revenue</th><th class="num">SLA</th><th class="num">Avg delivery</th><th class="num">Overdue</th></tr></thead><tbody>
      ${rows.map(r => `<tr><td>${SUPPLY_SUPPLIERS[r.v] ? `<a href="/pages/vendors/supplier.html?v=${r.v}" class="link-sm">${escapeHtml(orderVendorName(r.v))}</a>` : escapeHtml(orderVendorName(r.v))}</td><td class="num">${r.n}</td><td class="num">${fmtSgd(r.rev)}</td><td class="num"><span class="sla-pct ${r.c == null ? '' : r.c >= 90 ? 'sla-good' : r.c >= 75 ? 'sla-warn' : 'sla-bad'}">${r.c == null ? '—' : `${r.c.toFixed(0)}%`}</span></td><td class="num">${r.avg == null ? '—' : fmtBiz(r.avg, 'SG')}</td><td class="num ${r.late ? 'text-error' : ''}">${r.late}</td></tr>`).join('')}</tbody></table>` : '<p class="text-muted">No orders in this period.</p>';
  }

  function clients() {
    const list = inPeriod(days, 0).filter(o => !o.cancelled);
    const rows = [...new Set(list.map(o => o.client))].map(c => ({ c, l: list.filter(o => o.client === c) })).map(r => ({ ...r, rev: sgd(r.l), m: marginOf(r.l), comp: compliance(r.l) })).sort((a, b) => b.rev - a.rev).slice(0, 10);
    $('oiClients').innerHTML = rows.length ? `<table class="table insights-table"><thead><tr><th></th><th>Client</th><th class="num">Orders</th><th class="num">Revenue</th><th class="num">Margin</th><th class="num">SLA</th></tr></thead><tbody>
      ${rows.map(r => `<tr class="has-detail" data-client="${r.c}"><td><button type="button" class="expand-button" aria-expanded="${expanded.has(r.c)}" aria-label="Show orders">${expanded.has(r.c) ? '▼' : '▶'}</button></td><td>${escapeHtml(orderClient(r.c).name)}</td><td class="num">${r.l.length}</td><td class="num">${fmtSgd(r.rev)}</td><td class="num">${r.m == null ? '—' : marginBadge(r.m)}</td><td class="num">${r.comp == null ? '—' : `${r.comp.toFixed(0)}%`}</td></tr>
        ${expanded.has(r.c) ? `<tr class="client-expand"><td colspan="6"><table>${r.l.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(o => `<tr><td><a href="/pages/tracker/order.html?id=${o.id}" class="link-sm">${o.id}</a></td><td>${fmtOrderDate(o.createdAt)}</td><td>${escapeHtml(o.recipient)}</td><td>${orderStateBadge(o)}</td><td class="num">${fmtAmount(o.currency, orderPricing(o).subRev)}</td></tr>`).join('')}</table></td></tr>` : ''}`).join('')}</tbody></table>` : '<p class="text-muted">No orders in this period.</p>';
  }

  function render() {
    document.querySelectorAll('#oiPeriod .segment-button').forEach(b => b.classList.toggle('active', +b.dataset.d === days));
    kpis(); mix(); trend(); bottleneck(); monthly(); wow(); vendors(); clients();
  }

  $('oiPeriod').addEventListener('click', e => { const b = e.target.closest('[data-d]'); if (b) { days = +b.dataset.d; render(); } });
  $('oiClient').addEventListener('change', e => { client = e.target.value; render(); });
  $('oiClients').addEventListener('click', e => { const r = e.target.closest('[data-client]'); if (!r || e.target.closest('a')) return; const c = r.dataset.client; expanded.has(c) ? expanded.delete(c) : expanded.add(c); clients(); });
  render();
})();
