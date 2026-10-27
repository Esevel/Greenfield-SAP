// People › Joiners: triage new hires up to the onboarding work order. Fulfilment is tracked in Tracker › Onboarding.
// Seat-plan clients: a joiner takes a seat when added; with none available onboarding waits for the client admin to
// approve a subscription order (seats-data.js).
// Needs hub-data.js, supply-data.js, stock-data.js, billing-data.js, subscription-data.js, people-data.js, seats-data.js
// and people-header.js.

const JOINER_STATUS = {
  new: ['New', 'badge-info'],
  'needs-info': ['Needs info', 'badge-warning'],
  ready: ['Ready', 'badge-success'],
  created: ['Work order created', 'badge-neutral']
};

function completenessHtml(p) {
  const m = joinerMissing(p);
  if (!m.length) return '<span class="comp comp-ok">Complete</span>';
  return m.map(f => `<span class="comp comp-missing">Missing ${f}</span>`).join(' ');
}

function initJoiners() {
  const $ = id => document.getElementById(id);
  const joiners = () => PEOPLE.filter(p => p.joiner);
  const panel = $('jnPanel');
  const overlay = $('jnOverlay');
  let current = null;
  let page = 1;
  let nextWo = Math.max(1200, ...PEOPLE.filter(p => p.joiner && p.joiner.woNew).map(p => Number(p.joiner.wo.split('-')[1]))) + 1;

  $('fClient').innerHTML = '<option value="">All</option>' + [...new Set(joiners().map(p => p.client))].map(id => `<option value="${id}">${peopleClientName(id)}</option>`).join('');
  $('fCountry').innerHTML = '<option value="">All</option>' + Object.keys(WH_COUNTRIES).map(cc => `<option value="${cc}">${WH_COUNTRIES[cc][1]}</option>`).join('');
  $('fStatus').innerHTML = '<option value="open">Open</option><option value="">All</option>' + Object.entries(JOINER_STATUS).map(([k, [l]]) => `<option value="${k}">${l}</option>`).join('');

  const pkgOptions = sel => Object.keys(JOINER_PACKAGES).map(k => `<option ${k === sel ? 'selected' : ''}>${k}</option>`).join('');
  const RISK_ORDER = { late: 0, tight: 1, ok: 2 };

  // Existing onboarding records open their detail page; ones created here aren't in tracker data
  const woHref = j => (j.woNew ? '/pages/services/onboarding.html' : `/pages/services/onboarding-detail.html?id=${j.wo}`);

  function render() {
    const f = { client: $('fClient').value, cc: $('fCountry').value, comp: $('fComp').value, status: $('fStatus').value };
    const rows = joiners().filter(p => peopleMatchesSearch(p, $('jnSearch').value)
      && (!f.client || p.client === f.client)
      && (!f.cc || p.cc === f.cc)
      && (f.status === 'open' ? p.joiner.status !== 'created' : !f.status || p.joiner.status === f.status)
      && (!f.comp || (f.comp === 'complete' ? joinerComplete(p) : f.comp === 'incomplete' ? !joinerComplete(p) : !p[f.comp])))
      .map(p => ({ p, risk: p.joiner.status === 'created' ? null : joinerRisk(p) }))
      // Incomplete first, then highest risk, then start date
      .sort((a, b) => joinerComplete(a.p) - joinerComplete(b.p)
        || (a.risk ? RISK_ORDER[a.risk.level] : 3) - (b.risk ? RISK_ORDER[b.risk.level] : 3)
        || a.p.start.localeCompare(b.p.start));

    const pagination = peoplePageSlice(rows, page);
    page = pagination.page;
    $('jnRows').innerHTML = pagination.rows.map(({ p, risk }) => {
      const j = p.joiner;
      const [label, cls] = JOINER_STATUS[j.status];
      const locked = j.status === 'created';
      return `<tr data-id="${p.id}" tabindex="0" class="${current === p ? 'selected' : ''}">
        <td><div class="jn-name">${escapeHtml(p.name)} <span class="flag" title="${WH_COUNTRIES[p.cc][1]}">${WH_COUNTRIES[p.cc][0]}</span></div><div class="stock-sub">${escapeHtml(p.email)}</div></td>
        <td>${peopleClientName(p.client)}</td>
        <td>${escapeHtml(p.role)}<div class="stock-sub">${escapeHtml(p.dept)}</div></td>
        <td>${peopleFmt(p.start, false)}</td>
        <td>${locked ? `<span class="tag-package">${j.pkg}</span>` : `<select class="pkg-select" data-pkg="${p.id}" aria-label="Package for ${escapeHtml(p.name)}">${pkgOptions(j.pkg)}</select>`}</td>
        <td>${completenessHtml(p)}</td>
        <td>${risk ? riskHtml(risk) : '<span class="text-muted">In Tracker</span>'}</td>
        <td><span class="badge ${cls} badge-sm">${label}</span>${seatLine(p)}</td>
        <td>${j.wo ? `<a href="${woHref(j)}" class="link-sm">${j.wo}</a>` : '<span class="text-muted">—</span>'}</td>
      </tr>`;
    }).join('') || `<tr><td colspan="9" class="text-muted sla-empty">${f.status === 'open' ? 'No open joiners. New hires appear here when they sync from HRIS or the client adds them.' : 'No joiners match'}</td></tr>`;

    const atRisk = openJoiners().filter(p => joinerRisk(p).level !== 'ok').length;
    $('jnCount').textContent = `${rows.length} matching joiners · ${openJoiners().length} open, ${atRisk} tight or at risk · Once a work order is created, track it in Tracker › Onboarding`;
    renderPeoplePagination($('jnPagination'), pagination, nextPage => { page = nextPage; render(); });
    renderPeopleHeader();
  }

  // Seat state under the status: only shown when it holds onboarding up
  function seatLine(p) {
    const s = p.joiner.status === 'created' ? null : joinerSeat(p);
    return s && !s.ok ? `<div class="stock-sub seat-hold">⏸ ${escapeHtml(s.text)}</div>` : '';
  }

  function seatPanelHtml(p, s) {
    const plan = `<a href="/pages/clients/detail.html?c=${p.client}#sec-subscription" class="link-sm">${CONTRACTS[p.client].tier} plan & seats</a>`;
    const facts = s.seat ? `<div class="info-row"><span class="info-label">Plan price</span><span class="info-value">${escapeHtml(s.price.text)}${s.price.paid ? ` <span class="text-muted">· order ${s.price.paid.order}</span>` : ' <span class="text-muted">· seat already paid for</span>'}</span></div>
      <div class="info-row"><span class="info-label">Devices</span><span class="info-value">${s.devices} of ${s.allowance} allowed${s.allowance > subDeviceLimit(CONTRACTS[p.client].tier) ? ` (${subDeviceLimit(CONTRACTS[p.client].tier)} on plan + ${s.allowance - subDeviceLimit(CONTRACTS[p.client].tier)} extra)` : ''}</span></div>` : '';
    if (s.ok) return `<div class="seat-ok">✓ ${escapeHtml(s.text)} assigned · ${plan}</div>${facts}<div class="readonly-note">The seat was taken when ${escapeHtml(p.name.split(' ')[0])} was added and is released when they're offboarded.</div>`;
    const btn = s.key === 'pending' ? `<button type="button" class="btn btn-secondary btn-sm" id="jnSeatApprove" title="Prototype: simulate the client admin">Simulate client admin approval</button>`
      : s.key === 'rejected' ? `<button type="button" class="btn btn-secondary btn-sm" id="jnSeatRetry">${s.seat ? 'Order the upgrade again' : 'Order a seat again'}</button>` : '';
    return `${facts}<div class="seat-wait seat-wait-${s.key}">${escapeHtml(s.detail)}</div><div class="seat-actions">${btn}${plan}</div>`;
  }

  function renderPanel() {
    const p = current;
    const j = p.joiner;
    const rec = recommendPackage(p.role);
    const locked = j.status === 'created';
    const [label, cls] = JOINER_STATUS[j.status];
    $('jnTitle').innerHTML = `<a href="/pages/people/person.html?id=${p.id}" class="link-plain">${escapeHtml(p.name)}</a>`;
    $('jnMeta').innerHTML = `${peopleClientName(p.client)} · ${WH_COUNTRIES[p.cc][0]} ${WH_COUNTRIES[p.cc][1]} · <span class="badge ${cls} badge-sm">${label}</span>`;
    $('jnDetails').innerHTML = [
      ['Role', escapeHtml(p.role)], ['Department', escapeHtml(p.dept)], ['Start date', peopleFmt(p.start)], ['Work email', escapeHtml(p.email)],
      ['Phone', p.phone ? escapeHtml(p.phone) : '<span class="text-error">Missing</span>'],
      ['Delivery address', p.address ? escapeHtml(p.address) : '<span class="text-error">Missing</span>']
    ].map(([l, v]) => `<div class="info-row"><span class="info-label">${l}</span><span class="info-value jn-value">${v}</span></div>`).join('');

    $('jnPkg').innerHTML = pkgOptions(j.pkg);
    $('jnPkg').disabled = locked;
    $('jnReason').innerHTML = j.pkg === rec.pkg
      ? `<strong>Recommended</strong> · ${escapeHtml(rec.reason)}`
      : `<strong>Changed manually</strong> · recommendation was ${rec.pkg} (${escapeHtml(rec.reason)})`;

    $('jnRiskSection').hidden = locked;
    if (!locked) {
      const r = joinerRisk(p);
      $('jnRisk').innerHTML = `
        <div class="risk-head"><span class="risk risk-${r.level}">${r.label}</span> ${r.left} business days to start · needs ${supplyRangeLabel(r.need)}</div>
        <table class="device-list-table risk-table">
          <thead><tr><th>Item</th><th>Comes from</th><th class="num">Days</th></tr></thead>
          <tbody>${r.items.map(i => `<tr><td>${escapeHtml(i.name)}</td><td class="${i.stock ? 'text-success' : ''}">${escapeHtml(i.from)}</td><td class="num">${supplyRangeLabel(i.range)}</td></tr>`).join('')}</tbody>
        </table>
        ${r.advice ? `<div class="risk-advice">${r.advice}</div>` : ''}`;
    }

    const missing = joinerMissing(p);
    $('jnMissingSection').hidden = !missing.length || locked;
    $('jnPhoneGroup').hidden = !missing.includes('phone');
    $('jnAddressGroup').hidden = !missing.includes('address');
    $('jnPhone').value = '';
    $('jnAddress').value = '';
    $('jnRequested').hidden = !j.requested;
    $('jnRequested').textContent = j.requested ? `Requested from ${peopleClientName(p.client)} on ${peopleFmt(j.requested)} · waiting for reply` : '';
    $('jnRequest').textContent = j.requested ? 'Send reminder' : 'Request from client';

    const seat = joinerSeat(p);
    $('jnSeatSection').hidden = !seat;
    if (seat) $('jnSeat').innerHTML = seatPanelHtml(p, seat);
    const seatOk = !seat || seat.ok || locked;

    $('jnCreated').hidden = !locked;
    $('jnCreated').innerHTML = locked ? `✓ Work order <a href="${woHref(j)}">${j.wo}</a> created. Track delivery in Tracker › Onboarding.` : '';
    $('jnCreate').hidden = locked;
    $('jnCreate').disabled = !joinerComplete(p) || !seatOk;
    $('jnCreateHint').hidden = locked || (joinerComplete(p) && seatOk);
    $('jnCreateHint').textContent = !seatOk ? (seat.key === 'pending' ? 'Waiting for the client admin to approve the order' : seat.seat ? 'Over the device limit: onboarding is blocked' : 'No seat: onboarding is blocked') : 'Fill missing details first';
  }

  function open(p) {
    current = p;
    $('jnNote').hidden = true;
    renderPanel();
    render();
    panel.classList.add('open');
    overlay.classList.add('show');
    $('jnClose').focus();
  }

  function close() {
    current = null;
    panel.classList.remove('open');
    overlay.classList.remove('show');
    render();
  }

  function note(text) {
    $('jnNote').textContent = text;
    $('jnNote').hidden = false;
  }

  $('jnRows').addEventListener('change', e => {
    const sel = e.target.closest('[data-pkg]');
    if (!sel) return;
    personById(sel.dataset.pkg).joiner.pkg = sel.value;
    savePeople();
    if (isSeatClient(personById(sel.dataset.pkg).client)) seatSync(personById(sel.dataset.pkg).client);
    render();
    if (current) renderPanel();
  });
  $('jnRows').addEventListener('click', e => {
    if (e.target.closest('select, a')) return;
    const row = e.target.closest('tr[data-id]');
    if (row) open(personById(row.dataset.id));
  });
  $('jnRows').addEventListener('keydown', e => {
    const row = e.target.closest('tr[data-id]');
    if (row && e.key === 'Enter' && e.target === row) open(personById(row.dataset.id));
  });
  ['fClient', 'fCountry', 'fComp', 'fStatus'].forEach(id => $(id).addEventListener('change', () => { page = 1; render(); }));
  $('jnSearch').addEventListener('input', () => { page = 1; render(); });

  // A different package can change the device count, so seats and upgrade orders are re-checked
  $('jnPkg').addEventListener('change', () => { current.joiner.pkg = $('jnPkg').value; savePeople(); if (isSeatClient(current.client)) seatSync(current.client); renderPanel(); render(); });

  $('jnSeat').addEventListener('click', e => {
    if (e.target.id === 'jnSeatApprove') {
      const o = seatOrderDecide(joinerSeat(current).order.id, true);
      note(`✓ ${o.by} approved ${o.id}: ${seatOrderLabel(o)} for ${current.name}, charged ${fmtAmount(o.cur, o.amount)} once. Onboarding can go ahead.`);
    } else if (e.target.id === 'jnSeatRetry') {
      const o = seatOrderRetry(current);
      note(`✓ Order ${o.id} (${seatOrderLabel(o)}, ${fmtAmount(o.cur, o.amount)}) sent to ${o.admin} for approval.`);
    } else return;
    renderPanel();
    render();
  });

  $('jnSaveMissing').addEventListener('click', () => {
    const phone = $('jnPhone').value.trim();
    const address = $('jnAddress').value.trim();
    if (!phone && !address) return note('Enter at least one missing field.');
    if (phone) current.phone = phone;
    if (address) current.address = address;
    if (joinerComplete(current)) { current.joiner.status = 'ready'; delete current.joiner.requested; }
    savePeople();
    note(joinerComplete(current) ? '✓ Details complete. Ready for a work order.' : '✓ Saved. Still missing info.');
    renderPanel();
    render();
  });

  $('jnRequest').addEventListener('click', () => {
    const reminder = !!current.joiner.requested;
    current.joiner.requested = PEOPLE_TODAY;
    current.joiner.status = 'needs-info';
    savePeople();
    note(`✓ ${reminder ? 'Reminder sent' : 'Request sent'} to ${peopleClientName(current.client)} for ${joinerMissing(current).join(' and ')}.`);
    renderPanel();
    render();
  });

  $('jnCreate').addEventListener('click', () => {
    const seat = joinerSeat(current);
    if (seat && !seat.ok) return note(seat.detail);
    Object.assign(current.joiner, { status: 'created', wo: `ONB-${nextWo++}`, woNew: true });
    savePeople();
    note(`✓ Work order ${current.joiner.wo} created with ${current.joiner.pkg}.`);
    renderPanel();
    render();
  });

  $('jnClose').addEventListener('click', close);
  $('jnCancel').addEventListener('click', close);
  overlay.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && panel.classList.contains('open')) close(); });

  render();
  const target = personById(new URLSearchParams(location.search).get('open'));
  if (target && target.joiner) open(target);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initJoiners);
else initJoiners();
