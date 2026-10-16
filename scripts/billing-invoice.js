// Invoice detail: lifecycle with only the next valid action, lines with Source links, payments with receipts.
// Needs hub-data.js, billing-data.js, contract-terms.js, ledger-data.js, invoice-data.js and billing-engine.js.

function initInvoice() {
  const $ = id => document.getElementById(id);
  const inv = invoiceById(new URLSearchParams(location.search).get('id')) || INVOICES[0];
  const k = CONTRACTS[inv.client];
  const client = WH_CLIENTS.find(c => c.id === inv.client);
  const STEPS = ['draft', 'issued', 'paid'];
  let fileName = '';

  let minute = 0;
  const histAdd = (who, what) => inv.history.push([`${INVOICE_TODAY} 16:${String(45 + Math.min(14, minute++)).padStart(2, '0')}`, who, what]);
  const note = t => { $('inSaved').textContent = `✓ ${t}`; $('inSaved').hidden = false; };

  function renderHeader() {
    const s = invoiceState(inv);
    const [l, c] = INVOICE_STATE[s];
    document.title = `${inv.id} - Invoices - Admin Portal`;
    $('inCrumb').textContent = inv.id;
    $('inTitle').textContent = inv.status === 'draft' ? `Draft invoice · ${inv.period}` : inv.id;
    $('inTags').innerHTML = `<span class="badge ${c}">${l}</span><span class="text-muted">· ${escapeHtml(client.name)} · ${inv.cur}${inv.po ? ` · ${escapeHtml(inv.po)}` : ''}</span>`;

    // Only the next valid action for this state
    const actions = {
      draft: ['<button class="btn btn-primary" id="acIssue">Issue invoice</button>'],
      issued: ['<button class="btn btn-secondary" id="acCancel">Cancel invoice</button>', '<button class="btn btn-primary" id="acPay">Record payment</button>'],
      overdue: ['<button class="btn btn-secondary" id="acRemind">Send reminder</button>', '<button class="btn btn-primary" id="acPay">Record payment</button>'],
      paid: ['<button class="btn btn-secondary" id="acPdf">Download PDF</button>'],
      cancelled: [inv.replacedBy ? `<a class="btn btn-secondary" href="?id=${inv.replacedBy}">View ${inv.replacedBy}</a>` : '']
    }[s];
    $('inActions').innerHTML = actions.join('');

    // Lifecycle: Draft → Issued → (Overdue) → Paid, or Cancelled
    const reached = s === 'cancelled' ? ['draft', 'issued'] : STEPS.slice(0, STEPS.indexOf(s === 'overdue' ? 'issued' : s) + 1);
    const t = invoiceTotals(inv);
    const sub = {
      draft: inv.status === 'draft' ? 'Built from the ledger' : `Generated ${billingDate(invAddDays(inv.issued, -1))}`,
      issued: inv.issued ? `${billingDate(inv.issued)} · due ${billingDate(inv.due)}` : `Due ${INVOICE_TERMS_DAYS} days after issue`,
      paid: s === 'paid' ? `${billingDate(inv.payments[inv.payments.length - 1]?.date || inv.issued)}` : t.paid ? `${fmtAmount(inv.cur, t.paid)} received` : 'Awaiting payment'
    };
    const steps = STEPS.map(st => {
      let cls = reached.includes(st) ? 'done' : '';
      if (st === 'issued' && s === 'overdue') cls = 'done warn';
      if (st === 'paid' && s === 'overdue') cls = 'bad';
      const late = daysBetween(inv.due, INVOICE_TODAY);
      const label = st === 'paid' && s === 'overdue' ? `Overdue · ${late} day${late === 1 ? '' : 's'}` : INVOICE_STATE[st][0];
      return `<li class="${cls}"><span class="lc-dot"></span><span class="lc-label">${label}</span><span class="lc-sub">${sub[st]}</span></li>`;
    });
    if (s === 'cancelled') steps[2] = `<li class="bad"><span class="lc-dot"></span><span class="lc-label">Cancelled</span><span class="lc-sub">${escapeHtml(inv.cancelled.reason)}</span></li>`;
    $('inLifecycle').innerHTML = steps.join('');
  }

  function renderLines() {
    const desc = l => `${LEDGER_EVENT_LABEL[l.event]} · ${escapeHtml(l.wo)}${l.kind === 'reversal' ? ' (reversal)' : ''}<div class="stock-sub">${escapeHtml(l.asset)}${l.recipient !== '—' ? ` · ${escapeHtml(l.recipient)}` : ''} · ${escapeHtml(l.step)}</div>`;
    $('inLineCount').textContent = inv.lines.length;
    $('inSplit').textContent = k.terms.splitBy.length ? `Split by ${k.terms.splitBy.map(x => INVOICE_SPLITS[x].toLowerCase()).join(', ')}` : 'One invoice per billing run';
    $('inLines').innerHTML = inv.lines.map(l => {
      const entry = ledgerById(l.ledger);
      const dispute = l.dispute || l.disputeClosed ? DISPUTES.find(d => d.id === (l.dispute || l.disputeClosed)) : entry && disputeForLedger(entry);
      const disputeTag = dispute ? `<a href="/pages/billing/needs-action.html?id=${dispute.id}" class="tag ${disputeClosed(dispute) ? 'kind-reversed' : 'kind-pending'}" title="Open dispute in Needs action">${disputeClosed(dispute) ? 'Dispute · ' + DISPUTE_STATE[dispute.status][0] : 'Disputed · ' + dispute.id}</a>` : '';
      const raise = entry && canRaiseDispute(entry) ? ` <a href="/pages/billing/ledger.html?entry=${entry.id}&reduce=dispute" class="link-sm">Raise dispute</a>` : '';
      return `<tr class="${dispute && !disputeClosed(dispute) ? 'line-disputed' : ''}">
        <td>${desc(l)} ${disputeTag}${raise}</td>
        <td>${l.po ? escapeHtml(l.po) : '<span class="text-muted">—</span>'}</td>
        <td>${l.costCentre ? escapeHtml(l.costCentre) : '<span class="text-muted">—</span>'}</td>
        <td class="num">${l.qty}</td>
        <td class="num">${fmtAmount(inv.cur, l.unit)}</td>
        <td class="num ${l.amount < 0 ? 'text-error' : ''}">${l.amount < 0 ? '−' : ''}${fmtAmount(inv.cur, Math.abs(l.amount))}</td>
        <td><a href="/pages/billing/ledger.html?entry=${l.ledger}" class="link-sm" title="Open ledger entry: milestone, asset and evidence">Source ↗</a></td>
      </tr>`;
    }).join('');
    const t = invoiceTotals(inv);
    const row = (label, v, cls = '') => `<div class="tot-row ${cls}"><span>${label}</span><span>${v}</span></div>`;
    $('inTotals').innerHTML = [
      row('Subtotal', fmtAmount(inv.cur, t.subtotal)),
      row(`${inv.tax[0]} ${inv.tax[1]}%`, fmtAmount(inv.cur, t.tax)),
      row('Total', fmtAmount(inv.cur, t.total), 'tot-strong'),
      t.credits ? row('Credit notes applied', `−${fmtAmount(inv.cur, t.credits)}`) : '',
      t.paid ? row('Paid', `−${fmtAmount(inv.cur, t.paid)}`) : '',
      inv.status !== 'draft' && inv.status !== 'cancelled' ? row('Balance due', fmtAmount(inv.cur, Math.max(0, t.balance)), 'tot-strong tot-balance') : ''
    ].join('');
  }

  function renderSide() {
    const ent = invoiceEntity(inv);
    const parent = ent.parent ? k.terms.entities.find(e => e.id === ent.parent) : null;
    $('inBillTo').innerHTML = `<div class="bill-name">${escapeHtml(ent.name)}</div>
      <div class="entity-meta">${WH_COUNTRIES[ent.country][0]} ${WH_COUNTRIES[ent.country][1]} · ${escapeHtml(ent.taxId)}</div>
      <div class="entity-meta">${escapeHtml(ent.contact)}</div>
      ${parent ? `<div class="entity-meta">Subsidiary of ${escapeHtml(parent.name)}</div>` : ''}
      <div class="readonly-note"><a href="/pages/clients/detail.html?c=${inv.client}#sec-entities">${escapeHtml(client.name)} contract</a> · v${activeVersion(k).v} · entity billed in ${ent.currency}</div>`;

    const s = invoiceState(inv);
    const pays = inv.payments.map(p => `<div class="pay-line">
        <div><strong>${fmtAmount(inv.cur, p.amount)}</strong> · ${billingDate(p.date)}</div>
        <div class="entity-meta">${escapeHtml(p.ref)} · ${escapeHtml(p.by)}</div>
        ${p.receipt ? `<div class="entity-meta">📎 ${escapeHtml(p.receipt)}</div>` : '<div class="entity-meta text-error">No receipt uploaded</div>'}
      </div>`).join('');
    $('inPayments').innerHTML = pays || `<div class="text-muted">${s === 'draft' ? 'Not issued yet.' : s === 'cancelled' ? 'Cancelled before payment.' : 'No payments yet.'}</div>`;

    const credits = CREDIT_NOTES.filter(c => c.appliedTo === inv.id || c.against === inv.id);
    const applicable = ['issued', 'overdue'].includes(s) ? CREDIT_NOTES.filter(c => c.client === inv.client && c.status === 'issued' && !c.appliedTo) : [];
    $('inCreditsCard').hidden = !credits.length && !applicable.length;
    $('inCredits').innerHTML = credits.map(c => `<div class="pay-line">
        <div><strong>−${fmtAmount(c.cur, c.amount)}</strong> · ${c.id} <span class="badge ${CREDIT_STATE[c.status][1]} badge-sm">${CREDIT_STATE[c.status][0]}</span></div>
        <div class="entity-meta">${c.appliedTo === inv.id ? `Applied here · against ${c.against}` : `Raised against this invoice${c.appliedTo ? ` · applied to ${c.appliedTo}` : ''}`}</div>
        <div class="entity-meta">${escapeHtml(c.reason)}</div>
      </div>`).join('') + applicable.map(c => `<div class="pay-line">
        <div><strong>−${fmtAmount(c.cur, c.amount)}</strong> · ${c.id} available</div>
        <div class="entity-meta">${escapeHtml(c.reason)}</div>
        <button type="button" class="btn btn-secondary btn-sm" data-apply="${c.id}">Apply to this invoice</button>
      </div>`).join('');
  }

  function renderHistory() {
    $('inHistory').innerHTML = [...inv.history].reverse().map((h, i) => `<li class="${i === 0 ? 'current' : ''}">${escapeHtml(h[2])}<div class="location-dates">${h[0]} · ${escapeHtml(h[1])}</div></li>`).join('');
  }

  function render() {
    renderHeader();
    renderLines();
    renderSide();
    renderHistory();
  }

  /* Actions */
  $('inActions').addEventListener('click', e => {
    const id = e.target.id;
    if (id === 'acIssue') {
      const draftId = inv.id;
      inv.id = nextInvoiceNumber();
      inv.status = 'issued';
      inv.issued = INVOICE_TODAY;
      inv.due = invAddDays(INVOICE_TODAY, INVOICE_TERMS_DAYS);
      inv.period = 'Oct 2026';
      inv.lines.forEach(l => { const le = ledgerById(l.ledger); if (le) { le.status = 'invoiced'; le.invoice = inv.id; } });
      histAdd('You', `Issued as ${inv.id} and sent to ${invoiceEntity(inv).contact}`);
      history.replaceState(null, '', `?id=${inv.id}`);
      saveBilling();
      note(`${draftId} issued as ${inv.id}. ${inv.lines.length} ledger entries marked invoiced.`);
      render();
    } else if (id === 'acPay') {
      openPay();
    } else if (id === 'acRemind') {
      histAdd('You', 'Overdue reminder sent');
      saveBilling();
      note(`Reminder sent to ${invoiceEntity(inv).contact}.`);
      renderHistory();
    } else if (id === 'acCancel') {
      $('canReason').value = '';
      $('canError').hidden = true;
      $('canPanel').classList.add('open');
      $('canOverlay').classList.add('show');
    } else if (id === 'acPdf') {
      note(`${inv.id}.pdf downloaded (prototype).`);
    }
  });

  $('inCredits').addEventListener('click', e => {
    const b = e.target.closest('[data-apply]');
    if (!b) return;
    const c = CREDIT_NOTES.find(x => x.id === b.dataset.apply);
    c.status = 'applied';
    c.appliedTo = inv.id;
    inv.credits.push({ cn: c.id, amount: c.amount });
    histAdd('You', `Credit note ${c.id} applied (−${fmtAmount(c.cur, c.amount)})`);
    saveBilling();
    note(`${c.id} applied. Balance is now ${fmtAmount(inv.cur, Math.max(0, invoiceTotals(inv).balance))}.`);
    render();
  });

  /* Payment */
  function openPay() {
    const bal = Math.max(0, invoiceTotals(inv).balance);
    $('payMeta').textContent = `${inv.id} · balance ${fmtAmount(inv.cur, bal)}`;
    $('payCur').textContent = inv.cur;
    $('payAmount').value = bal.toFixed(2);
    $('payDate').value = INVOICE_TODAY;
    $('payDate').max = INVOICE_TODAY;
    $('payRef').value = '';
    fileName = '';
    $('payFile').textContent = 'Upload PDF or image';
    $('payError').hidden = true;
    const settle = invoiceEntity(inv).settlement;
    $('payNote').textContent = settle.length > 1 ? `Accepted settlement currencies: ${settle.join(', ')}. Record the amount in ${inv.cur} after conversion at the ${FX_SOURCES[k.terms.fxSource].split(' (')[0]} rate.` : `Settles in ${inv.cur} only.`;
    $('payPanel').classList.add('open');
    $('payOverlay').classList.add('show');
  }
  const closePay = () => { $('payPanel').classList.remove('open'); $('payOverlay').classList.remove('show'); };
  $('payUpload').addEventListener('click', () => { fileName = `remittance-${inv.id.toLowerCase()}.pdf`; $('payFile').textContent = `📄 ${fileName} · uploaded`; });
  $('payUpload').addEventListener('keydown', e => { if (e.key === 'Enter') $('payUpload').click(); });
  $('paySave').addEventListener('click', () => {
    const amount = Math.round(Number($('payAmount').value) * 100) / 100;
    const bal = Math.max(0, invoiceTotals(inv).balance);
    const ref = $('payRef').value.trim();
    const msg = !(amount > 0) ? 'Enter the amount received.' : amount > bal + 0.001 ? `More than the balance (${fmtAmount(inv.cur, bal)}). Record the overpayment as a credit instead.` : !ref ? 'Enter the bank reference.' : '';
    $('payError').textContent = msg;
    $('payError').hidden = !msg;
    if (msg) return;
    inv.payments.push({ date: $('payDate').value, ref, by: 'You', receipt: fileName, amount });
    histAdd('You', `Payment ${fmtAmount(inv.cur, amount)} recorded · ${ref}${fileName ? ' · receipt uploaded' : ''}`);
    saveBilling();
    closePay();
    note(invoiceState(inv) === 'paid' ? `${inv.id} paid in full.` : `Part payment recorded. ${fmtAmount(inv.cur, invoiceTotals(inv).balance)} still due.`);
    render();
  });
  $('payClose').addEventListener('click', closePay);
  $('payCancel').addEventListener('click', closePay);
  $('payOverlay').addEventListener('click', closePay);

  /* Cancel */
  const closeCan = () => { $('canPanel').classList.remove('open'); $('canOverlay').classList.remove('show'); };
  $('canConfirm').addEventListener('click', () => {
    const reason = $('canReason').value.trim();
    if (!reason) { $('canError').textContent = 'Add a reason.'; $('canError').hidden = false; return; }
    inv.status = 'cancelled';
    inv.cancelled = { at: `${INVOICE_TODAY} 17:20`, by: 'You', reason };
    inv.lines.forEach(l => { const le = ledgerById(l.ledger); if (le) { le.status = 'unbilled'; delete le.invoice; } });
    histAdd('You', `Cancelled: ${reason}`);
    saveBilling();
    closeCan();
    note(`${inv.id} cancelled. Its ${inv.lines.length} ledger entries are unbilled again for the next run.`);
    render();
  });
  $('canClose').addEventListener('click', closeCan);
  $('canCancel').addEventListener('click', closeCan);
  $('canOverlay').addEventListener('click', closeCan);

  render();
  const actionCount = document.getElementById('billingActionCount');
  if (actionCount) actionCount.textContent = pendingBillingActionCount();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initInvoice);
else initInvoice();
