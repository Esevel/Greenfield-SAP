// Billing ledger page. Needs hub-data.js, billing-data.js, ledger-data.js, invoice-data.js and billing-engine.js.

function initLedger() {
  const $ = id => document.getElementById(id);
  const clientName = id => WH_CLIENTS.find(c => c.id === id).name;
  const entityName = e => { const ent = CONTRACTS[e.client].terms.entities.find(x => x.id === e.entity); return ent ? ent.name : '—'; };
  const signed = (cur, v) => `${v < 0 ? '−' : ''}${fmtAmount(cur, Math.abs(v))}`;
  const needsAttention = e => !!e.anomaly || !!e.pendingReversal;
  let view = 'unbilled';
  let current = null;
  let route = 'error';

  $('lgClient').innerHTML = '<option value="">All</option>' + WH_CLIENTS.filter(c => LEDGER.some(e => e.client === c.id)).map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  $('lgEvent').innerHTML = '<option value="">All</option>' + Object.entries(LEDGER_EVENT_LABEL).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
  $('lgCur').innerHTML = '<option value="">All</option>' + [...new Set(LEDGER.map(e => e.cur))].sort().map(c => `<option>${c}</option>`).join('');

  const inView = (e, v) => !v || (v === 'attention' ? needsAttention(e) : e.status === v);

  function renderTiles() {
    const unbilled = LEDGER.filter(e => e.status === 'unbilled');
    const byCur = sumByCurrency(unbilled.map(e => ({ cur: e.cur, amount: e.amount })));
    const charges = unbilled.filter(e => e.kind !== 'reversal').length;
    const anomalies = LEDGER.filter(e => e.anomaly).length;
    const pending = LEDGER.filter(e => e.pendingReversal).length;
    $('lgTiles').innerHTML = `
      <div class="summary-tile ledger-tile-wide">
        <div class="summary-tile-label">Unbilled by currency</div>
        <div class="cur-tiles">${Object.entries(byCur).sort(([a], [b]) => a.localeCompare(b)).map(([c, v]) => `<div class="cur-tile"><span class="cur-code">${c}</span><span>${fmtAmount(c, v).slice(4)}</span></div>`).join('')}</div>
        <div class="summary-tile-sub">Never added across currencies</div>
      </div>
      <div class="summary-tile"><div class="summary-tile-label">Events</div><div class="summary-tile-value">${charges}</div><div class="summary-tile-sub">Unbilled charges</div></div>
      <div class="summary-tile ${anomalies ? 'summary-tile-breached' : ''}"><div class="summary-tile-label">Anomalies</div><div class="summary-tile-value">${anomalies}</div><div class="summary-tile-sub">Duplicates, missing evidence, contract issues</div></div>
      <div class="summary-tile ${pending ? 'summary-tile-alert' : ''}"><div class="summary-tile-label">Pending reversals</div><div class="summary-tile-value">${pending}</div><div class="summary-tile-sub">Requested, awaiting billing approval</div></div>`;
  }

  function render() {
    renderTiles();
    const rows = LEDGER.filter(e => inView(e, view)
      && (!$('lgClient').value || e.client === $('lgClient').value)
      && (!$('lgEvent').value || e.event === $('lgEvent').value)
      && (!$('lgCur').value || e.cur === $('lgCur').value))
      .sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id));
    document.querySelectorAll('#lgView .segment-button').forEach(b => {
      b.classList.toggle('active', b.dataset.v === view);
      const n = LEDGER.filter(e => inView(e, b.dataset.v)).length;
      b.innerHTML = `${b.textContent.replace(/ \d+$/, '')} <span class="tab-count${b.dataset.v === 'attention' && n ? ' tab-count-alert' : ''}">${n}</span>`;
    });
    $('lgRows').innerHTML = rows.map(e => {
      const dispute = disputeForLedger(e);
      const flags = [
        e.kind !== 'charge' ? `<span class="tag kind-${e.kind}">${LEDGER_KIND[e.kind]}</span>` : '',
        e.reversedBy ? '<span class="tag kind-reversed">Reversed</span>' : '',
        e.anomaly ? '<span class="tag kind-anomaly">Anomaly</span>' : '',
        e.pendingReversal ? '<span class="tag kind-pending">Reversal pending</span>' : '',
        dispute ? `<a href="/pages/billing/needs-action.html?id=${dispute.id}" class="tag ${disputeClosed(dispute) ? 'kind-reversed' : 'kind-pending'}">${disputeClosed(dispute) ? 'Dispute closed' : 'Disputed · ' + dispute.id}</a>` : ''
      ].join('');
      return `<tr data-id="${e.id}" tabindex="0" class="${e.reversedBy ? 'row-reversed' : ''}">
        <td><span class="asset-serial">${e.id}</span>${flags ? `<div class="ledger-flags">${flags}</div>` : ''}</td>
        <td class="text-muted">${e.at}</td>
        <td>${escapeHtml(clientName(e.client))} <span class="flag">${WH_COUNTRIES[e.cc][0]}</span></td>
        <td>${LEDGER_EVENT_LABEL[e.event]}${e.qty > 1 ? `<div class="stock-sub">${e.qty} × ${fmtAmount(e.cur, e.unit)}</div>` : ''}</td>
        <td>${escapeHtml(e.wo)}<div class="stock-sub">${escapeHtml(e.step)}</div></td>
        <td class="ledger-asset">${escapeHtml(e.asset)}${e.recipient !== '—' ? `<div class="stock-sub">${escapeHtml(e.recipient)}</div>` : ''}</td>
        <td class="num ${e.amount < 0 ? 'text-error' : ''}"><strong>${signed(e.cur, e.amount)}</strong></td>
        <td>${e.status === 'invoiced' ? `<span class="badge badge-neutral badge-sm">Invoiced</span><div class="stock-sub">${e.invoice}</div>` : '<span class="badge badge-info badge-sm">Unbilled</span>'}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="8" class="text-muted sla-empty">No entries match</td></tr>';
    const byCur = sumByCurrency(rows.map(e => ({ cur: e.cur, amount: e.amount })));
    $('lgCount').innerHTML = `${rows.length} entries · Net shown: ${Object.entries(byCur).map(([c, v]) => signed(c, v)).join(' · ') || '—'} · One charge per completed step; storage accrues daily, billable users monthly.`;
  }

  function open(e) {
    current = e;
    $('lgTitle').textContent = `${e.id} · ${LEDGER_KIND[e.kind]}`;
    $('lgMeta').textContent = `${clientName(e.client)} · ${LEDGER_EVENT_LABEL[e.event]} · posted ${e.at}`;
    const alerts = [];
    if (e.anomaly) alerts.push(`<strong>Anomaly:</strong> ${escapeHtml(e.anomaly)}`);
    if (e.pendingReversal) alerts.push(`<strong>Reversal requested</strong> by ${escapeHtml(e.pendingReversal.requestedBy)} · ${e.pendingReversal.at}<br>${escapeHtml(e.pendingReversal.reason)}`);
    $('lgAmount').innerHTML = `<span class="${e.amount < 0 ? 'text-error' : ''}">${signed(e.cur, e.amount)}</span><div class="stock-sub">${e.qty > 1 ? `${e.qty} × ${fmtAmount(e.cur, e.unit)} · ` : ''}${e.kind === 'reversal' ? 'reverses the full original amount' : e.basis ? escapeHtml(chargeBasisText(e)) : `${LEDGER_EVENT_LABEL[e.event]} rate on contract v${activeVersion(CONTRACTS[e.client]).v} (${WH_COUNTRIES[e.cc][1]})`}</div>`;
    const row = (l, v) => `<div class="info-row ledger-info"><span class="info-label">${l}</span><span class="info-value">${v}</span></div>`;
    $('lgSource').innerHTML = [
      row('Milestone', `${escapeHtml(e.wo)} · ${escapeHtml(e.step)}`),
      row('Asset', escapeHtml(e.asset)),
      row('Recipient', escapeHtml(e.recipient)),
      row('Document', e.doc ? `📄 ${escapeHtml(e.doc)}` : '<span class="text-error">None</span>'),
      e.source ? row('Posted by', escapeHtml(e.source)) : '',
      e.dupBlocked ? row('Duplicates', `<span class="text-error">${e.dupBlocked.length} blocked</span>${e.dupBlocked.map(d => `<div class="stock-sub">${d.at} · ${escapeHtml(d.source)}</div>`).join('')}`) : '',
      /^[A-Z]{3}-\d+$/.test(e.wo) ? `<div class="info-row ledger-info"><span class="info-label"></span><span class="info-value"><a href="/pages/tracker/work-order.html?wo=${encodeURIComponent(e.wo)}" class="link-sm">Open work order</a></span></div>` : ''
    ].join('');
    $('lgBilling').innerHTML = [
      e.basis && e.basis.discount ? row('Discount', `${escapeHtml(e.basis.discount)}<div class="stock-sub"><a href="/pages/clients/detail.html?c=${e.client}#sec-discounts" class="link-sm">Contract term</a></div>`) : '',
      row('Billing entity', `${escapeHtml(entityName(e))}${e.basis ? `<div class="stock-sub">${escapeHtml(e.basis.why)}</div>` : ''}`),
      e.basis && e.basis.fx ? row('FX', `${e.basis.fx.from}→${e.basis.fx.to} ${e.basis.fx.rate.toFixed(4)}<div class="stock-sub">${escapeHtml(e.basis.fx.source)} · ${e.basis.fx.on} · locked at ${e.basis.fx.lock === 'milestone' ? 'the milestone' : 'checkout'}</div>`) : '',
      row('Cost centre', escapeHtml(e.costCentre || '—')),
      row('PO number', escapeHtml(e.po || '—')),
      row('Status', e.credited ? `Invoiced on ${e.invoice} · credit note ${e.credited}` : e.status === 'invoiced' ? `Invoiced on ${e.invoice}` : `Unbilled · ${onLiveInvoice(e) ? `on ${onLiveInvoice(e).id}` : 'next billing run 31 Oct'}`),
      (() => { const d = disputeForLedger(e); return d ? row('Dispute', `<a href="/pages/billing/needs-action.html?id=${d.id}" class="link-sm">${d.id} · ${DISPUTE_STATE[d.status][0]}</a>`) : canRaiseDispute(e) ? row('Dispute', `<a href="/pages/billing/ledger.html?entry=${e.id}&reduce=dispute" class="link-sm">Raise dispute</a>`) : ''; })()
    ].join('');
    const chain = ledgerChain(e);
    $('lgHistory').innerHTML = chain.map(x => `<li class="${x === e ? 'current' : ''}">
        <strong>${x.id}</strong> · ${LEDGER_KIND[x.kind]} · <span class="${x.amount < 0 ? 'text-error' : ''}">${signed(x.cur, x.amount)}</span>
        <div class="location-dates">${x.at}${x.by ? ` · ${escapeHtml(x.by)}` : ' · system'}${x.reason ? ` · ${escapeHtml(x.reason)}` : ''}</div>
      </li>`).join('') + (chain.length === 1 ? '<li class="text-muted ledger-nohist">No corrections</li>' : '');

    // Already being reduced elsewhere: link there instead of offering a second route
    const related = [
      e.dispute && `Dispute <a href="/pages/billing/needs-action.html?id=${e.dispute}" class="link-sm">${e.dispute}</a>`,
      ...creditsFor(e).map(c => `Credit note <a href="/pages/billing/invoices.html?tab=credits&cn=${c.id}" class="link-sm">${c.id}</a> (${CREDIT_STATE[c.status][0].toLowerCase()})`)
    ].filter(Boolean);
    if (related.length) alerts.push(`<strong>Being reduced:</strong> ${related.join(' · ')}`);
    $('lgAlert').hidden = !alerts.length;
    $('lgAlert').innerHTML = alerts.join('<hr>');

    const busy = e.dispute && ['open', 'investigating'].includes((DISPUTES.find(d => d.id === e.dispute) || {}).status);
    const canReverse = e.kind !== 'reversal' && !e.reversedBy && !e.credited && !busy;
    const routes = reduceRoutes(e);
    if (!routes.includes(route)) route = routes[0];
    if (e.pendingReversal) route = 'error';
    $('lgReverseSection').hidden = !canReverse;
    $('lgRoutes').hidden = !!e.pendingReversal;
    $('lgRoutes').innerHTML = routes.map(r => `<button type="button" class="reduce-route ${r === route ? 'active' : ''}" role="radio" aria-checked="${r === route}" data-route="${r}">
        <strong>${REDUCE_ROUTES[r].label}</strong><span>${REDUCE_ROUTES[r][e.status]}</span></button>`).join('');
    $('lgReason').placeholder = { error: 'What went wrong. Shown in the audit trail.', goodwill: 'Reason for the goodwill reduction.', dispute: "The client's reason, in their words" }[route];
    if (!e.pendingReversal) $('lgReason').value = '';
    else $('lgReason').value = e.pendingReversal.reason;
    $('lgError').hidden = true;
    $('lgReverseNote').textContent = {
      error: e.status === 'invoiced' ? `Already on ${e.invoice}, so it can't be reversed in the ledger. Raises a draft credit note for the full amount for Finance to approve.` : 'Adds a reversing entry for the full amount now. The original stays visible. Re-bill the right amount from the work order if needed.',
      goodwill: `The charge was right but we're choosing not to bill it. ${e.status === 'invoiced' ? 'Issues a credit note now.' : 'Reverses it now.'} No approval required.`,
      dispute: `Opens a dispute on ${e.invoice} with this line flagged. Investigate, then credit or let the charge stand.`
    }[route];
    const btns = [];
    const label = { error: e.status === 'invoiced' ? 'Raise draft credit note' : 'Add reversing entry', goodwill: e.status === 'invoiced' ? 'Issue goodwill credit note' : 'Apply goodwill reversal', dispute: 'Open dispute' }[route];
    if (canReverse && e.pendingReversal) btns.push('<button class="btn btn-secondary" id="lgReject">Reject request</button>', '<button class="btn btn-primary" id="lgReverse">Approve reversal</button>');
    else if (canReverse) btns.push(`<button class="btn btn-primary" id="lgReverse">${label}</button>`);
    if (e.anomaly && !e.reversedBy) btns.unshift('<button class="btn btn-secondary" id="lgDismiss">Mark as checked</button>');
    if (!btns.length) btns.push('<button class="btn btn-secondary" id="lgDone">Close</button>');
    $('lgFooter').innerHTML = btns.join('');
    $('lgPanel').classList.add('open');
    $('lgOverlay').classList.add('show');
  }
  const close = () => { $('lgPanel').classList.remove('open'); $('lgOverlay').classList.remove('show'); current = null; };
  const note = t => { $('lgSaved').textContent = `✓ ${t}`; $('lgSaved').hidden = false; };

  $('lgFooter').addEventListener('click', ev => {
    const id = ev.target.id;
    const e = current;
    if (id === 'lgReverse') {
      const reason = $('lgReason').value.trim();
      const err = !reason ? 'Add a reason.' : '';
      if (err) { $('lgError').textContent = err; $('lgError').hidden = false; return; }
      if (route === 'dispute' && !e.pendingReversal) {
        const id = openDispute(e, reason);
        note(`Dispute ${id} opened on ${e.invoice}. The line is flagged until it's resolved.`);
      } else {
        e.pendingReversal = null;
        e.anomaly = '';
        const r = correctCharge(e, `${route === 'goodwill' ? 'Goodwill' : 'Our error'}: ${reason}`);
        if (route === 'goodwill' && r.cn) Object.assign(r.cn, { status: 'issued', issued: LEDGER_TODAY, issuedBy: 'You' });
        saveBilling();
        note(r.rev ? `${r.rev.id} reverses ${e.id} (${signed(e.cur, -e.amount)}). The original stays in the ledger.` : route === 'goodwill' ? `Goodwill credit note ${r.cn.id} issued for ${fmtAmount(e.cur, e.amount)} against ${e.invoice}.` : `Draft credit note ${r.cn.id} for ${fmtAmount(e.cur, e.amount)} raised against ${e.invoice}. Approve it in Invoices › Credit notes.`);
      }
      open(e);
      render();
    } else if (id === 'lgReject') {
      e.pendingReversal = null;
      postToDraft(e);
      saveBilling();
      note(`Reversal request on ${e.id} rejected. The charge stands.`);
      open(e);
      render();
    } else if (id === 'lgDismiss') {
      e.anomaly = '';
      const inv = postToDraft(e);
      saveBilling();
      note(`${e.id} marked as checked.${inv ? ` Added to ${inv.id}.` : ''}`);
      open(e);
      render();
    } else if (id === 'lgDone') {
      close();
    }
  });

  $('lgRoutes').addEventListener('click', ev => { const b = ev.target.closest('[data-route]'); if (b) { route = b.dataset.route; open(current); } });
  $('lgRows').addEventListener('click', ev => { const r = ev.target.closest('tr[data-id]'); if (r) open(ledgerById(r.dataset.id)); });
  $('lgRows').addEventListener('keydown', ev => { const r = ev.target.closest('tr[data-id]'); if (r && ev.key === 'Enter') open(ledgerById(r.dataset.id)); });
  $('lgView').addEventListener('click', ev => { const b = ev.target.closest('.segment-button'); if (b) { view = b.dataset.v; render(); } });
  ['lgClient', 'lgEvent', 'lgCur'].forEach(id => $(id).addEventListener('change', render));
  $('lgClose').addEventListener('click', close);
  $('lgOverlay').addEventListener('click', close);
  render();
  const actionCount = document.getElementById('billingActionCount');
  if (actionCount) actionCount.textContent = pendingBillingActionCount();
  const params = new URLSearchParams(location.search);
  const target = ledgerById(params.get('entry'));
  if (target) {
    if (['error', 'goodwill', 'dispute'].includes(params.get('reduce'))) route = params.get('reduce');
    open(target);
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initLedger);
else initLedger();
