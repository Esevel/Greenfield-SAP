// Work order Billing card: what the billable step will charge, the charges it posted, and Correct step.
// Needs hub-data.js, billing-data.js, ledger-data.js, invoice-data.js and billing-engine.js.

function initWorkOrderBilling() {
  const $ = id => document.getElementById(id);
  const card = $('woBilling');
  if (!card) return;
  const wo = new URLSearchParams(location.search).get('wo') || card.dataset.wo;
  const seen = LEDGER.filter(e => e.wo === wo && e.kind === 'charge');
  const o = BILLABLE_ORDERS[wo] || (seen.length && { client: seen[0].client, cc: seen[0].cc, recipient: seen[0].recipient, costCentre: seen[0].costCentre, po: seen[0].po, assets: [...new Set(seen.map(e => e.asset))] });
  const event = WO_EVENT[wo.split('-')[0]];
  const trigger = billingTrigger(wo);

  if (wo !== card.dataset.wo && o) {
    const client = WH_CLIENTS.find(c => c.id === o.client).name;
    document.querySelector('.page-title-edit').textContent = `${wo} · ${o.recipient}`;
    document.querySelector('.breadcrumb-current').textContent = wo;
    const crumbs = { ONB: ['Onboarding', 'onboarding'], DSP: ['Disposal', 'disposal'], REP: ['Repairs', 'repairs'] }[wo.split('-')[0]];
    if (crumbs) Object.assign([...document.querySelectorAll('.breadcrumb-link')].pop(), { textContent: crumbs[0], href: `/pages/services/${crumbs[1]}.html` });
    document.querySelector('.quote-card').hidden = !wo.startsWith('REP');
    document.querySelector('.asset-header-meta').innerHTML = `<span>${escapeHtml(client)}</span><span class="meta-sep">·</span><span class="flag">${WH_COUNTRIES[o.cc][0]}</span> ${WH_COUNTRIES[o.cc][1]}`;
    document.title = `${wo} · Work order - Admin Portal`;
  }

  let note = '';
  function render() {
    if (!o || !event) {
      card.innerHTML = `<div class="card-header"><h3 class="card-title">Billing</h3></div><div class="card-body"><div class="text-muted">No billable step on this work order.</div></div>`;
      return;
    }
    const t = CONTRACTS[o.client].terms;
    const billable = isBillable(t, event);
    const p = priceCharge(o.client, event, o.cc, 1, o);
    const charges = stepCharges(wo).filter(e => e.step === trigger);
    const live = activeCharges(wo, trigger);
    const row = (l, v) => `<div class="info-row"><span class="info-label">${l}</span><span class="info-value">${v}</span></div>`;
    card.innerHTML = `<div class="card-header"><h3 class="card-title">Billing</h3></div>
      <div class="card-body">
        ${note ? `<div class="saved-note">✓ ${note}</div>` : ''}
        <div class="info-grid">
          ${row('Billable step', `${LEDGER_EVENT_LABEL[event]} on <strong>${escapeHtml(trigger)}</strong>`)}
          ${billable ? row('Fee', `${fmtAmount(p.unitCur, p.unit)} per device${p.fee.custom ? ' · contract exception' : ''}${p.fee.discount ? `<div class="stock-sub">${escapeHtml(discountLabel(p.fee.discount, p.unitCur))} on ${fmtAmount(p.unitCur, p.fee.base)}</div>` : ''}`)
            + row('Billed to', `${escapeHtml(p.entity.name)}<div class="stock-sub">${escapeHtml(p.why)}</div>`)
            + row('Charged', `${fmtAmount(p.cur, p.amount)} per device${p.fx ? `<div class="stock-sub">${p.fx.from}→${p.fx.to} ${p.fx.rate.toFixed(4)} · ${escapeHtml(p.fx.source)} · locked at ${p.fx.lock === 'milestone' ? 'the milestone' : 'checkout'}</div>` : ''}`)
            : row('Fee', '<span class="text-muted">Not billable on this contract</span>')}
        </div>
        <h4 class="panel-section-title wo-bill-sub">Charges</h4>
        ${charges.map(e => {
          const dispute = disputeForLedger(e);
          const disputeLink = dispute
            ? `<a href="/pages/billing/needs-action.html?id=${dispute.id}" class="tag ${disputeClosed(dispute) ? 'kind-reversed' : 'kind-pending'}">${dispute.id} · ${DISPUTE_STATE[dispute.status][0]}</a>`
            : canRaiseDispute(e) ? `<a href="/pages/billing/ledger.html?entry=${e.id}&reduce=dispute" class="link-sm">Raise dispute</a>` : '';
          return `<div class="pay-line">
            <div><a href="/pages/billing/ledger.html?entry=${e.id}" class="link-sm">${e.id}</a> · <strong class="${e.amount < 0 ? 'text-error' : ''}">${e.amount < 0 ? '−' : ''}${fmtAmount(e.cur, Math.abs(e.amount))}</strong>
              ${e.kind === 'reversal' ? '<span class="tag kind-reversal">Reversal</span>' : ''}${e.reversedBy ? '<span class="tag kind-reversed">Reversed</span>' : ''}${e.credited ? `<span class="tag kind-pending">Credit ${e.credited}</span>` : ''}${e.anomaly ? '<span class="tag kind-anomaly">Anomaly</span>' : ''}${e.dupBlocked ? `<span class="tag kind-pending" title="Step completed again; no second charge">${e.dupBlocked.length} duplicate blocked</span>` : ''} ${disputeLink}</div>
            <div class="entity-meta">${escapeHtml(e.asset)} · ${e.status === 'invoiced' ? `invoiced on ${e.invoice}` : 'unbilled'}</div>
          </div>`;
        }).join('') || `<div class="text-muted">No charges yet. ${escapeHtml(trigger)} posts one per device.</div>`}
        <div class="wo-bill-actions">
          ${billable && !live.length ? `<button type="button" class="btn btn-secondary btn-sm" id="woComplete">Mark ${escapeHtml(trigger)}</button>` : ''}
          ${live.length ? `<button type="button" class="btn btn-secondary btn-sm" id="woDup">Simulate duplicate event</button>` : ''}
        </div>
        ${live.length ? `<div class="wo-correct">
          <label class="form-label" for="woReason">Correct step</label>
          <textarea class="form-textarea" id="woReason" rows="2" placeholder="Why ${escapeHtml(trigger)} was recorded wrongly"></textarea>
          <div class="form-error" id="woError" hidden></div>
          <button type="button" class="btn btn-secondary btn-sm" id="woCorrect">Reopen step and correct charges</button>
          <div class="readonly-note">Unbilled: a reversing entry. Already invoiced: a draft credit note for Finance to approve.</div>
        </div>` : ''}
      </div>`;
  }

  card.addEventListener('click', e => {
    if (e.target.id === 'woComplete' || e.target.id === 'woDup') {
      const log = completeStep({ wo, step: trigger, source: 'Work order · marked by you', doc: e.target.id === 'woDup' ? 'Duplicate courier event' : `${trigger} confirmation (prototype)` });
      note = `${trigger}: ${postingSummary(log)}.`;
      render();
    } else if (e.target.id === 'woCorrect') {
      const reason = $('woReason').value.trim();
      if (!reason) { $('woError').textContent = 'Add a reason.'; $('woError').hidden = false; return; }
      note = `${trigger} reopened: ${correctionSummary(correctStep(wo, trigger, reason, 'Work order · Correct step'))}.`;
      render();
    }
  });
  render();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initWorkOrderBilling);
else initWorkOrderBilling();
