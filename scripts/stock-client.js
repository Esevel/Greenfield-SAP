// Client stock page: one client's stock by country → model line → devices, with thresholds and storage per country.
// Needs hub-data.js, supply-data.js, stock-data.js and stock-threshold-panel.js.

function initStockClient() {
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const client = stockClient(params.get('c')) || stockClient('acme');
  const expanded = new Set();
  const collapsedCc = new Set();
  let ccFilter = WH_COUNTRIES[params.get('country')] ? params.get('country') : '';

  document.title = `Stock · ${client.name} - Admin Portal`;
  $('scCrumb').textContent = client.name;
  $('scTitle').textContent = client.name;

  const allLines = STOCK_LINES.filter(l => l.client === client.id);
  const countries = [...new Set([...Object.keys(HUB_ASSIGNMENTS[client.id] || {}), ...allLines.map(l => stockLoc(l.loc).country)])];
  $('scCountry').innerHTML = '<option value="">All countries</option>' + countries.map(cc => `<option value="${cc}">${WH_COUNTRIES[cc][0]} ${WH_COUNTRIES[cc][1]}</option>`).join('');
  $('scCountry').value = ccFilter;

  function tiles(lines) {
    const sum = fn => lines.reduce((s, l) => s + fn(l), 0);
    const inStock = sum(l => l.onHand);
    const hub = sum(l => (isHub(stockLoc(l.loc)) ? l.onHand : 0));
    const fees = storageByCurrency(lines);
    const aged = agedCount(lines);
    const tile = (label, value, sub = '', cls = '') => `<div class="summary-tile ${cls}"><div class="summary-tile-label">${label}</div><div class="summary-tile-value">${value}</div>${sub ? `<div class="summary-tile-sub">${sub}</div>` : ''}</div>`;
    $('scTiles').innerHTML = [
      tile('In stock', inStock, `${sum(stockNew)} new · ${sum(l => l.used)} used`),
      tile('Available', inStock - sum(l => l.reserved), `${sum(l => l.reserved)} reserved`),
      tile('Where', `${hub} / ${inStock - hub}`, 'In Esevel hubs / at client sites'),
      tile('Storage / month', Object.keys(fees).length ? feesLabel(fees) : 'None', aged ? `${aged} device${aged === 1 ? '' : 's'} stored 90+ days` : 'Hub stock only', `summary-tile-fees ${aged ? 'summary-tile-alert' : ''}`)
    ].join('');
  }

  function thresholdChips(cc) {
    const ts = STOCK_THRESHOLDS.filter(t => t.client === client.id && t.country === cc);
    const chips = ts.map(t => {
      const s = thresholdStatus(t);
      const r = restockFor(t);
      const restock = r ? ` · ${{ new: 'restock proposed', awaiting: 'restock awaiting client', approved: 'restock approved', declined: 'restock declined', dismissed: 'restock dismissed' }[r.state]}` : '';
      return `<button type="button" class="th-chip th-${s}" data-th="${t.id}" title="Edit threshold">${t.category} <strong>${thresholdCurrent(t)}</strong> / min ${t.min}${s === 'breach' ? ' ⚠' : ''}${restock}</button>`;
    }).join('');
    return `${chips}<button type="button" class="link-sm sla-link-btn" data-add-th="${cc}">+ Threshold</button>`;
  }

  function devicesHtml(l) {
    const loc = stockLoc(l.loc);
    const devices = stockDevices(l);
    const rows = devices.map(d => {
      const s = deviceStorage(l, d);
      const sug = deviceSuggestion(d);
      const recCls = { Keep: 'tag-keep', Redeploy: 'tag-redeploy', Dispose: 'tag-dispose' }[sug.rec];
      const action = d.reserved ? '' : sug.rec === 'Dispose'
        ? '<a href="/pages/tracker/raise-request.html?type=disposal" class="link-sm">Dispose</a>'
        : `<a href="/pages/tracker/raise-request.html?type=redeployment" class="link-sm">${isHub(loc) ? 'Redeploy' : 'Collect & redeploy'}</a>`;
      return `<tr>
        <td><a href="/pages/assets/detail.html" class="asset-serial">${d.serial}</a></td>
        <td>${d.condition === 'new' ? 'New' : 'Used'}</td>
        <td class="grade-cell">${d.grade}</td>
        <td>${d.reserved ? '<span class="badge badge-info badge-sm">Reserved</span>' : '<span class="badge badge-success badge-sm">Available</span>'}</td>
        <td class="num">${s ? (s.days > 90 ? `<span class="days-aged">${s.days}d</span>` : `${s.days}d`) : '<span class="text-muted">—</span>'}</td>
        <td class="num">${s ? `${money(s.cur, s.accrued)}<div class="stock-sub">${money(s.cur, s.perDay)} / day</div>` : '<span class="text-muted">Not billed</span>'}</td>
        <td><span class="tag ${recCls}" data-tooltip="${escapeHtml(sug.why)}">${sug.rec}</span></td>
        <td>${action}</td>
      </tr>`;
    }).join('');
    return `<tr class="expanded-content-row"><td colspan="7">
      ${isHub(loc) ? '' : '<div class="site-note">At a client site: not billed, and a redeployment from here starts with a collection step.</div>'}
      ${devices.length ? `<table class="breakdown-table devices-table">
        <thead><tr><th>Serial</th><th>Condition</th><th>Grade</th><th>Status</th><th class="num">In storage</th><th class="num">Accrued</th><th>Suggested</th><th></th></tr></thead>
        <tbody>${rows}</tbody></table>` : '<div class="text-muted" style="padding: var(--space-sm);">No devices in stock</div>'}
    </td></tr>`;
  }

  function render() {
    const lines = allLines.filter(l => !ccFilter || stockLoc(l.loc).country === ccFilter);
    tiles(lines);
    const ccs = countries.filter(cc => !ccFilter || cc === ccFilter);
    $('scBody').innerHTML = ccs.map(cc => {
      const cl = lines.filter(l => stockLoc(l.loc).country === cc);
      const a = HUB_ASSIGNMENTS[client.id][cc];
      const hubLabel = typeof a === 'number' ? stockLoc(a).name : a === 'none' ? 'No hub · client sites' : 'Not active';
      const open = !collapsedCc.has(cc);
      const sum = fn => cl.reduce((s, l) => s + fn(l), 0);
      const head = `<tr class="cc-group-row">
        <td colspan="7">
          <div class="cc-head">
            <button type="button" class="group-toggle" data-cc="${cc}" aria-expanded="${open}">${open ? '▼' : '▶'}</button>
            <span class="cc-name">${WH_COUNTRIES[cc][0]} ${WH_COUNTRIES[cc][1]}</span>
            <span class="text-muted">· ${escapeHtml(hubLabel)} · ${sum(l => l.onHand)} in stock, ${sum(stockAvailable)} available</span>
            <span class="cc-thresholds">${thresholdChips(cc)}</span>
          </div>
        </td>
      </tr>`;
      if (!open) return head;
      const body = cl.map(l => {
        const i = STOCK_LINES.indexOf(l);
        const loc = stockLoc(l.loc);
        const exp = expanded.has(i);
        return `<tr class="stock-line ${exp ? 'open' : ''}" data-i="${i}">
          <td><button type="button" class="expand-button" aria-expanded="${exp}" aria-label="Show devices">${exp ? '▼' : '▶'}</button></td>
          <td>${modelCell(l.model)}</td>
          <td><div class="loc-cell"><span>${escapeHtml(loc.name)}</span>${locationTag(loc)}</div></td>
          <td class="num">${l.onHand}${l.onHand ? `<div class="stock-sub">${stockNew(l)} new · ${l.used} used</div>` : ''}</td>
          <td class="num">${l.reserved}</td>
          <td class="num"><strong>${stockAvailable(l)}</strong></td>
          <td>${l.incoming ? `${l.incoming.qty} · ${l.incoming.date}<div class="stock-sub">${escapeHtml(l.incoming.ref)}</div>` : '<span class="text-muted">—</span>'}</td>
        </tr>${exp ? devicesHtml(l) : ''}`;
      }).join('') || '<tr><td colspan="7" class="text-muted sla-empty">No stock in this country</td></tr>';
      return head + body;
    }).join('');
  }

  $('scBody').addEventListener('click', e => {
    const exp = e.target.closest('.expand-button');
    if (exp) {
      const i = Number(exp.closest('tr').dataset.i);
      expanded.has(i) ? expanded.delete(i) : expanded.add(i);
      return render();
    }
    const tog = e.target.closest('[data-cc]');
    if (tog) { collapsedCc.has(tog.dataset.cc) ? collapsedCc.delete(tog.dataset.cc) : collapsedCc.add(tog.dataset.cc); return render(); }
    const th = e.target.closest('[data-th]');
    if (th) return panel.open(STOCK_THRESHOLDS.find(t => t.id === th.dataset.th));
    const add = e.target.closest('[data-add-th]');
    if (add) return panel.open(null, { client: client.id, country: add.dataset.addTh });
  });
  $('scCountry').addEventListener('change', e => { ccFilter = e.target.value; render(); });

  const panel = initThresholdPanel(text => {
    $('scSaved').hidden = false;
    $('scSaved').textContent = `✓ ${text}`;
    render();
  });

  render();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initStockClient);
else initStockClient();
