// Billable users panel on the client page: monthly count by entity, roster, excluded users and seat audit.
// Needs people-data.js and managed-users-data.js. Re-rendered by client-detail.js after each section render.

const BU_STATE = { tab: 'month', month: '2026-10', q: '', shown: 25 };

function renderBillableUsers(clientId) {
  const el = document.getElementById('buPanel');
  if (!el) return;
  const s = BU_STATE;
  const r = muRoster(clientId, s.month);
  const bill = muBill(clientId, r);
  const fmtShort = d => peopleFmt(d, false);
  const tabs = [['month', 'This month'], ['roster', `Roster · ${r.billable.length}`], ['excluded', `Excluded · ${r.excluded.length}`], ['audit', 'Seat audit']];
  const lock = r.locked
    ? `<span class="snapshot-tag snapshot-locked" title="Snapshot ${r.snapshotId}">🔒 Locked ${r.locked}</span>`
    : `<span class="snapshot-tag snapshot-live">Live count · locks 1 ${muMonthLabel('2026-11')}</span>`;

  let body = '';
  if (s.tab === 'month') {
    body = `<table class="device-list-table mu-table">
        <thead><tr><th>Billing entity</th><th class="num">Users</th><th class="num">Rate / user / month</th><th class="num">${r.locked ? 'Billed' : 'Projected'}</th></tr></thead>
        <tbody>${bill.map(b => `<tr>
          <td>${escapeHtml(b.entity.name)} <span class="cur-pill">${b.cur}</span></td>
          <td class="num">${b.users}</td>
          <td class="num">${b.rate ? fmtAmount(b.cur, b.rate) : '<span class="text-error">Not set</span>'}</td>
          <td class="num"><strong>${fmtAmount(b.cur, b.amount)}</strong></td>
        </tr>`).join('')}</tbody>
      </table>
      <div class="readonly-note">${r.billable.length} billable users in ${muMonthLabel(s.month)} · one ledger charge per entity in its currency${r.locked ? ` from snapshot ${r.snapshotId}` : ', posted when the count locks'}.</div>`;
  } else if (s.tab === 'roster') {
    const q = s.q.toLowerCase();
    const rows = r.billable.filter(b => !q || `${b.name} ${b.device.serial}`.toLowerCase().includes(q));
    body = `<div class="search-bar search-bar-sm bu-search"><span class="search-icon">🔍</span><input type="text" class="search-input" id="buSearch" value="${escapeHtml(s.q)}" placeholder="Name or serial" aria-label="Search billable users"></div>
      <table class="device-list-table mu-table">
        <thead><tr><th>User</th><th>Qualifying laptop</th><th>Billed to</th><th>Qualified</th></tr></thead>
        <tbody>${rows.slice(0, s.shown).map(b => `<tr>
          <td>${b.person ? `<a href="/pages/people/person.html?id=${b.person.id}" class="link-plain"><strong>${escapeHtml(b.name)}</strong></a>` : escapeHtml(b.name)}${b.note ? `<div class="mu-note">${escapeHtml(b.note)}</div>` : ''}</td>
          <td>${escapeHtml(b.device.name)}<div class="stock-sub asset-serial">${escapeHtml(b.device.serial)}</div></td>
          <td>${escapeHtml(b.entity.name)}</td>
          <td class="mu-span">${fmtShort(b.from)} – ${fmtShort(b.to)}</td>
        </tr>`).join('') || '<tr><td colspan="4" class="text-muted">No users match</td></tr>'}</tbody>
      </table>
      ${rows.length > s.shown ? `<div class="mu-more"><button type="button" class="btn btn-secondary btn-sm" id="buMore">Show ${Math.min(25, rows.length - s.shown)} more of ${rows.length - s.shown}</button></div>` : ''}`;
  } else if (s.tab === 'excluded') {
    body = `<table class="device-list-table mu-table">
        <thead><tr><th>User</th><th>Reason</th></tr></thead>
        <tbody>${r.excluded.map(e => `<tr>
          <td>${e.person ? `<a href="/pages/people/person.html?id=${e.person.id}" class="link-plain"><strong>${escapeHtml(e.name)}</strong></a>` : escapeHtml(e.name)}</td>
          <td><span class="tag excl-${e.reason}">${MU_EXCLUDE_REASON[e.reason]}</span><div class="mu-note">${escapeHtml(e.detail)}</div></td>
        </tr>`).join('') || '<tr><td colspan="2" class="text-muted">Nobody excluded</td></tr>'}</tbody>
      </table>`;
  } else {
    const counts = MU_BILLABLE[clientId] || [];
    const seats = MU_SEATS[clientId];
    const log = MU_CHANGES[clientId] || [];
    body = `<table class="device-list-table mu-table">
        <thead><tr><th>Month</th><th class="num">Plan seats</th><th class="num">Billable</th><th class="num">Change</th><th>Amount</th><th>Snapshot</th></tr></thead>
        <tbody>${MU_MONTHS.map((m, i) => {
          const n = counts[i] || 0;
          const delta = counts[i + 1] === undefined ? null : n - counts[i + 1];
          return `<tr>
            <td><button type="button" class="link-sm btn-text" data-bu-month="${m}">${muMonthLabel(m)}</button></td>
            <td class="num">${seats}</td>
            <td class="num"><strong>${n}</strong></td>
            <td class="num ${delta > 0 ? 'text-success' : delta < 0 ? 'text-error' : 'text-muted'}">${delta === null ? '—' : `${delta > 0 ? '+' : ''}${delta}`}</td>
            <td>${amountsHtml(sumByCurrency(muBill(clientId, muRoster(clientId, m))))}</td>
            <td>${MU_LOCKED[m] ? '<span class="snapshot-tag snapshot-locked">🔒 Locked</span>' : '<span class="snapshot-tag snapshot-live">Live</span>'}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>
      <div class="detail-label bu-log-title">Change log</div>
      <ul class="location-history">${log.map((x, i) => `<li class="${i === 0 ? 'current' : ''}">
          <strong class="${x.change > 0 ? 'text-success' : x.change < 0 ? 'text-error' : ''}">${x.change > 0 ? '+' : ''}${x.change}</strong> · ${escapeHtml(x.why)}
          <div class="location-dates">${peopleFmt(x.at)} · ${muMonthLabel(x.month)}</div>
        </li>`).join('') || '<li class="text-muted">No changes recorded</li>'}</ul>`;
  }

  el.innerHTML = `<div class="bu-toolbar">
      <div class="segmented-control segmented-sm" id="buTabs">${tabs.map(([k, l]) => `<button type="button" class="segment-button ${k === s.tab ? 'active' : ''}" data-bu-tab="${k}">${l}</button>`).join('')}</div>
      ${s.tab === 'audit' ? '' : `<label class="filter-select"><span>Month</span><select id="buMonth">${MU_MONTHS.map(m => `<option value="${m}" ${m === s.month ? 'selected' : ''}>${muMonthLabel(m)}${MU_LOCKED[m] ? '' : ' (in progress)'}</option>`).join('')}</select></label>${lock}`}
    </div>${body}`;

  const rerender = () => renderBillableUsers(clientId);
  el.onclick = e => {
    e.stopPropagation();
    const t = e.target.closest('[data-bu-tab]');
    if (t) { s.tab = t.dataset.buTab; s.shown = 25; return rerender(); }
    const m = e.target.closest('[data-bu-month]');
    if (m) { s.month = m.dataset.buMonth; s.tab = 'month'; return rerender(); }
    if (e.target.id === 'buMore') { s.shown += 25; rerender(); }
  };
  el.onchange = e => {
    e.stopPropagation();
    if (e.target.id === 'buMonth') { s.month = e.target.value; s.shown = 25; rerender(); }
  };
  el.oninput = e => {
    e.stopPropagation();
    if (e.target.id !== 'buSearch') return;
    s.q = e.target.value;
    s.shown = 25;
    rerender();
    const input = document.getElementById('buSearch');
    input.focus();
    input.setSelectionRange(s.q.length, s.q.length);
  };
}
