// Shared Billing action queue. Disputes retain their investigation panel; credits and ledger exceptions use a compact action panel.
// Needs hub-data.js, billing-data.js, contract-terms.js, ledger-data.js, invoice-data.js, dispute-data.js and billing-engine.js.

function initNeedsAction() {
  const $ = id => document.getElementById(id);
  const clientName = id => WH_CLIENTS.find(c => c.id === id).name;
  const entName = (client, id) => CONTRACTS[client].terms.entities.find(e => e.id === id)?.name || id;
  const isClosed = d => d.status === 'resolved' || d.status === 'rejected';
  let current = null;
  let outcome = 'credit';

  $('dsClient').innerHTML = '<option value="">All</option>' + WH_CLIENTS.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  const note = t => { $('dsSaved').textContent = `✓ ${t}`; $('dsSaved').hidden = false; };

  function render() {
    const rows = [
      ...DISPUTES.filter(d => !isClosed(d)).map(d => ({ type: 'dispute', id: d.id, client: d.client, date: d.raised, data: d })),
      ...CREDIT_NOTES.filter(c => c.status === 'draft' && !c.dispute).map(c => ({ type: 'credit', id: c.id, client: c.client, date: c.issued || INVOICE_TODAY, data: c })),
      ...LEDGER.filter(e => e.anomaly).map(e => ({ type: 'anomaly', id: e.id, client: e.client, date: e.at.slice(0, 10), data: e })),
      ...LEDGER.filter(e => e.pendingReversal).map(e => ({ type: 'reversal', id: e.id, client: e.client, date: e.at.slice(0, 10), data: e }))
    ].filter(r => (!$('naType').value || $('naType').value === r.type) && (!$('dsClient').value || $('dsClient').value === r.client))
      .sort((a, b) => a.date.localeCompare(b.date));
    $('billingActionCount').textContent = pendingBillingActionCount();
    $('dsRows').innerHTML = rows.map(r => {
      if (r.type === 'dispute') {
        const d = r.data;
      const { inv, line } = disputeLine(d);
      const [l, c] = DISPUTE_STATE[d.status];
        return `<tr data-id="${d.id}" data-type="dispute" tabindex="0">
          <td><span class="tag kind-pending">Dispute</span></td><td><span class="asset-serial">${d.id}</span></td>
          <td>${escapeHtml(clientName(d.client))}</td><td><a href="/pages/billing/invoice.html?id=${d.invoice}" class="link-sm">${d.invoice}</a><div class="stock-sub">${line ? `${LEDGER_EVENT_LABEL[line.event]} · ${escapeHtml(line.wo)}` : escapeHtml(d.wo)}</div></td>
          <td class="cn-reason">${escapeHtml(d.reason)}</td><td><span class="badge ${c} badge-sm">${l}</span>${d.owner ? `<div class="stock-sub">${escapeHtml(d.owner)}</div>` : ''}</td><td><button type="button" class="btn btn-secondary btn-sm" data-open="dispute">Review</button></td>
      </tr>`;
      }
      if (r.type === 'credit') {
        const c = r.data;
        return `<tr data-id="${c.id}" data-type="credit"><td><span class="tag kind-pending">Draft credit</span></td><td><span class="asset-serial">${c.id}</span></td>
          <td>${escapeHtml(clientName(c.client))}</td><td><a href="/pages/billing/invoice.html?id=${c.against}" class="link-sm">${c.against}</a><div class="stock-sub">${escapeHtml(entName(c.client, c.entity))}</div></td>
          <td class="cn-reason">${escapeHtml(c.reason)}<div class="stock-sub">${fmtAmount(c.cur, c.amount)}</div></td><td><span class="badge ${CREDIT_STATE[c.status][1]} badge-sm">${CREDIT_STATE[c.status][0]}</span></td>
          <td><button type="button" class="btn btn-primary btn-sm" data-open="credit">Review</button></td></tr>`;
      }
      const e = r.data;
      const status = r.type === 'anomaly' ? e.anomaly : `${e.pendingReversal.requestedBy} · ${e.pendingReversal.at}`;
      return `<tr data-id="${e.id}" data-type="${r.type}"><td><span class="tag ${r.type === 'anomaly' ? 'kind-anomaly' : 'kind-pending'}">${r.type === 'anomaly' ? 'Ledger anomaly' : 'Reversal request'}</span></td>
        <td><a href="/pages/billing/ledger.html?entry=${e.id}" class="asset-serial">${e.id}</a></td><td>${escapeHtml(clientName(e.client))}</td>
        <td><a href="/pages/billing/ledger.html?entry=${e.id}" class="link-sm">${escapeHtml(e.wo)} · ${escapeHtml(e.step)}</a><div class="stock-sub">${fmtAmount(e.cur, e.amount)}</div></td>
        <td class="cn-reason">${escapeHtml(status)}${e.pendingReversal ? `<div class="stock-sub">${escapeHtml(e.pendingReversal.reason)}</div>` : ''}</td>
        <td><span class="badge badge-warning badge-sm">Needs review</span></td><td><button type="button" class="btn btn-secondary btn-sm" data-open="ledger">Review</button></td></tr>`;
    }).join('') || '<tr><td colspan="7" class="text-muted sla-empty">No actions need attention</td></tr>';
    $('dsCount').textContent = `${rows.length} items need action · disputes, draft credit notes, ledger anomalies and requested reversals.`;
  }

  function openAction(type, id) {
    current = null;
    const credit = type === 'credit' && CREDIT_NOTES.find(c => c.id === id);
    const entry = type !== 'credit' && ledgerById(id);
    $('naTitle').textContent = credit ? `${credit.id} · Draft credit note` : `${entry.id} · ${LEDGER_EVENT_LABEL[entry.event]}`;
    $('naMeta').textContent = clientName(credit ? credit.client : entry.client);
    const row = (a, b) => `<div class="info-row ledger-info"><span class="info-label">${a}</span><span class="info-value">${b}</span></div>`;
    if (credit) {
      $('naInfo').innerHTML = [row('Against', `<a href="/pages/billing/invoice.html?id=${credit.against}">${credit.against}</a>`), row('Amount', fmtAmount(credit.cur, credit.amount)), row('Reason', escapeHtml(credit.reason)), credit.ledger ? row('Charge', `<a href="/pages/billing/ledger.html?entry=${credit.ledger}">${credit.ledger}</a>`) : ''].join('');
      $('naFooter').innerHTML = '<button type="button" class="btn btn-secondary" id="naCloseBtn">Close</button><button type="button" class="btn btn-primary" id="naApproveCredit">Approve and issue</button>';
    } else {
      $('naInfo').innerHTML = [row('Work order', `${escapeHtml(entry.wo)} · ${escapeHtml(entry.step)}`), row('Amount', fmtAmount(entry.cur, entry.amount)), row('Source', escapeHtml(entry.source || entry.doc || '—')), entry.anomaly ? row('Anomaly', escapeHtml(entry.anomaly)) : '', entry.pendingReversal ? row('Requested by', `${escapeHtml(entry.pendingReversal.requestedBy)} · ${entry.pendingReversal.at}`) + row('Reason', escapeHtml(entry.pendingReversal.reason)) : ''].join('');
      $('naFooter').innerHTML = `${entry.anomaly ? '<button type="button" class="btn btn-secondary" id="naCheck">Mark anomaly checked</button>' : ''}${entry.pendingReversal ? `<button type="button" class="btn btn-secondary" id="naReject">Reject request</button><button type="button" class="btn btn-primary" id="naApproveReverse">${entry.status === 'invoiced' ? 'Approve credit note' : 'Approve reversal'}</button>` : ''}<button type="button" class="btn btn-secondary" id="naCloseBtn">Close</button>`;
    }
    $('naSaved').hidden = true;
    $('naPanel').classList.add('open');
    $('naOverlay').classList.add('show');
  }
  const closeAction = () => { $('naPanel').classList.remove('open'); $('naOverlay').classList.remove('show'); };

  $('naFooter').addEventListener('click', e => {
    const b = e.target;
    if (b.id === 'naCloseBtn') return closeAction();
    if (b.id === 'naApproveCredit') {
      const c = CREDIT_NOTES.find(x => x.id === document.querySelector('#naTitle').textContent.split(' ·')[0]);
      approveCredit(c, 'You');
      $('naSaved').textContent = `${c.id} issued. It can now be applied to an outstanding or next invoice.`;
      $('naSaved').hidden = false;
      $('naFooter').innerHTML = '<button type="button" class="btn btn-secondary" id="naCloseBtn">Close</button>';
      render();
      return;
    }
    const entryId = document.querySelector('#naTitle').textContent.split(' ·')[0];
    const e0 = ledgerById(entryId);
    if (b.id === 'naCheck') { e0.anomaly = ''; postToDraft(e0); saveBilling(); closeAction(); return render(); }
    if (b.id === 'naApproveReverse') { const reason = e0.pendingReversal.reason; const r = correctCharge(e0, reason, 'Billing approval'); e0.pendingReversal = null; saveBilling(); closeAction(); return render(); }
    if (b.id === 'naReject') { e0.pendingReversal = null; postToDraft(e0); saveBilling(); closeAction(); return render(); }
  });
  $('naClose').addEventListener('click', closeAction);
  $('naOverlay').addEventListener('click', closeAction);

  function setOutcome(o) {
    outcome = o;
    document.querySelectorAll('#dsOutcome .segment-button').forEach(b => b.classList.toggle('active', b.dataset.o === o));
    $('dsCreditFields').hidden = o !== 'credit';
    $('dsResolveNote').textContent = o === 'credit'
      ? 'Approving issues a credit note and closes the dispute. The original charge stays on the invoice and in the ledger; the credit offsets it.'
      : 'The charge stands. The client sees your message and can reply by raising a new dispute.';
  }

  function open(d) {
    current = d;
    const { inv, line } = disputeLine(d);
    const [l, c] = DISPUTE_STATE[d.status];
    $('dsTitle').textContent = `${d.id} · ${clientName(d.client)}`;
    $('dsMeta').innerHTML = `Raised ${billingDate(d.raised)} by ${escapeHtml(d.raisedBy)} · <span class="badge ${c} badge-sm">${l}</span>`;
    $('dsReason').textContent = d.reason;
    const row = (a, b) => `<div class="info-row ledger-info"><span class="info-label">${a}</span><span class="info-value">${b}</span></div>`;
    $('dsLine').innerHTML = line ? [
      row('Invoice', `<a href="/pages/billing/invoice.html?id=${inv.id}">${inv.id}</a> · ${INVOICE_STATE[invoiceState(inv)][0]}`),
      row('Charge', `${LEDGER_EVENT_LABEL[line.event]} · ${escapeHtml(line.wo)} · ${escapeHtml(line.step)}`),
      row('Asset', escapeHtml(line.asset)),
      row('Evidence', line.doc ? `📄 ${escapeHtml(line.doc)}` : '<span class="text-error">None</span>'),
      row('Amount', `<strong>${fmtAmount(inv.cur, line.amount)}</strong>`),
      row('Source', `<a href="/pages/billing/ledger.html?entry=${line.ledger}">${line.ledger} ↗</a>`)
    ].join('') : '<div class="text-muted">Line not found</div>';

    $('dsNotes').innerHTML = d.notes.map((n, i) => `<li class="${i === d.notes.length - 1 ? 'current' : ''}">${escapeHtml(n.text)}<div class="location-dates">${n.at} · ${escapeHtml(n.by)}</div></li>`).join('') || '<li class="text-muted ledger-nohist">No notes yet</li>';
    $('dsNote').value = '';
    $('dsNoteAdd').hidden = isClosed(d);

    $('dsResolveSection').hidden = isClosed(d);
    $('dsClosedSection').hidden = !isClosed(d);
    if (isClosed(d)) {
      const cn = d.creditNote && CREDIT_NOTES.find(x => x.id === d.creditNote);
      $('dsResolution').innerHTML = `<p>${escapeHtml(d.resolution)}</p><div class="entity-meta">Closed ${billingDate(d.closed)} · ${escapeHtml(d.owner)}${cn ? ` · credit note ${cn.id} (−${fmtAmount(cn.cur, cn.amount)}) ${cn.appliedTo ? `applied to <a href="/pages/billing/invoice.html?id=${cn.appliedTo}">${cn.appliedTo}</a>` : 'not applied yet'}` : ''}</div>`;
    } else if (line) {
      const draftCn = d.creditNote && CREDIT_NOTES.find(x => x.id === d.creditNote);
      setOutcome('credit');
      $('dsCur').textContent = inv.cur;
      $('dsAmount').value = (draftCn ? draftCn.amount : line.amount).toFixed(2);
      $('dsAmount').max = line.amount;
      const outstanding = INVOICES.filter(i => i.client === d.client && ['issued', 'overdue'].includes(invoiceState(i)));
      $('dsApply').innerHTML = outstanding.map(i => `<option value="${i.id}">${i.id} · balance ${fmtAmount(i.cur, invoiceTotals(i).balance)}${i.id === inv.id ? ' (disputed invoice)' : ''}</option>`).join('') + '<option value="next">Next invoice (October run)</option>';
      $('dsApply').value = outstanding.some(i => i.id === inv.id) ? inv.id : 'next';
      $('dsMessage').value = '';
      $('dsError').hidden = true;
    }

    const btns = [];
    if (!isClosed(d)) {
      if (d.status === 'open') btns.push('<button class="btn btn-secondary" id="dsTake">Assign to me</button>');
      btns.push('<button class="btn btn-primary" id="dsSubmit">Send resolution</button>');
    } else {
      btns.push('<button class="btn btn-secondary" id="dsDone">Close</button>');
    }
    $('dsFooter').innerHTML = btns.join('');
    $('dsPanel').classList.add('open');
    $('dsOverlay').classList.add('show');
  }
  const close = () => { $('dsPanel').classList.remove('open'); $('dsOverlay').classList.remove('show'); current = null; };

  $('dsAddNote').addEventListener('click', () => {
    const text = $('dsNote').value.trim();
    if (!text) return;
    current.notes.push({ at: `${INVOICE_TODAY} 17:30`, by: 'You', text });
    if (current.status === 'open') { current.status = 'investigating'; current.owner = current.owner || 'You'; }
    saveBilling();
    open(current);
    render();
  });

  $('dsFooter').addEventListener('click', e => {
    const d = current;
    if (e.target.id === 'dsDone') return close();
    if (e.target.id === 'dsTake') {
      d.owner = 'You';
      d.status = 'investigating';
      saveBilling();
      note(`${d.id} assigned to you.`);
      open(d);
      return render();
    }
    if (e.target.id !== 'dsSubmit') return;
    const { inv, line } = disputeLine(d);
    const msg = $('dsMessage').value.trim();
    const amount = Math.round(Number($('dsAmount').value) * 100) / 100;
    let err = '';
    if (!msg) err = 'Write a message to the client.';
    else if (outcome === 'credit' && !(amount > 0)) err = 'Enter the credit amount.';
    else if (outcome === 'credit' && amount > line.amount) err = `Can't credit more than the disputed line (${fmtAmount(inv.cur, line.amount)}).`;
    $('dsError').textContent = err;
    $('dsError').hidden = !err;
    if (err) return;

    Object.assign(d, { resolution: msg, closed: INVOICE_TODAY, owner: d.owner || 'You', status: outcome === 'credit' ? 'resolved' : 'rejected' });
    d.notes.push({ at: `${INVOICE_TODAY} 17:35`, by: 'You', text: outcome === 'credit' ? `Approved credit of ${fmtAmount(inv.cur, amount)}` : 'Rejected: charge stands' });
    line.disputeClosed = d.id;
    line.dispute = '';
    if (outcome === 'credit') {
      let cn = d.creditNote && CREDIT_NOTES.find(x => x.id === d.creditNote);
      if (!cn) {
        cn = { id: nextCreditId(), client: d.client, entity: inv.entity, against: inv.id, cur: inv.cur, dispute: d.id, reason: d.reason.slice(0, 90), ledger: line.ledger };
        CREDIT_NOTES.push(cn);
        d.creditNote = cn.id;
      }
      const target = $('dsApply').value;
      Object.assign(cn, { amount, status: target === 'next' ? 'issued' : 'applied', appliedTo: target === 'next' ? '' : target, issued: INVOICE_TODAY, approvedBy: 'You' });
      if (target !== 'next') invoiceById(target).credits.push({ cn: cn.id, amount });
      const le = ledgerById(line.ledger);
      if (le && amount >= le.amount) le.credited = cn.id;
      note(`${d.id} resolved. ${cn.id} for ${fmtAmount(cn.cur, amount)} ${target === 'next' ? 'will apply to the next invoice' : `applied to ${target}`}.`);
    } else {
      note(`${d.id} closed. The charge stands and the client has your explanation.`);
    }
    saveBilling();
    open(d);
    render();
  });

  document.querySelectorAll('#dsOutcome .segment-button').forEach(b => b.addEventListener('click', () => setOutcome(b.dataset.o)));
  $('dsRows').addEventListener('click', e => { if (e.target.closest('a')) return; const r = e.target.closest('tr[data-id]'); if (!r) return; if (r.dataset.type === 'dispute') open(DISPUTES.find(d => d.id === r.dataset.id)); else openAction(r.dataset.type, r.dataset.id); });
  $('dsRows').addEventListener('keydown', e => { const r = e.target.closest('tr[data-id]'); if (r && e.key === 'Enter' && e.target === r) r.dataset.type === 'dispute' ? open(DISPUTES.find(d => d.id === r.dataset.id)) : openAction(r.dataset.type, r.dataset.id); });
  $('naType').addEventListener('change', render);
  $('dsClient').addEventListener('change', render);
  $('dsClose').addEventListener('click', close);
  $('dsOverlay').addEventListener('click', close);
  render();
  const params = new URLSearchParams(location.search);
  const target = DISPUTES.find(d => d.id === params.get('id'));
  if (target) open(target);
  else if (params.has('entry')) openAction('ledger', params.get('entry'));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initNeedsAction);
else initNeedsAction();
