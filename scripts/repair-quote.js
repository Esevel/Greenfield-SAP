// Repair quote section on the repair work order: findings, quote lines, vendor evidence (staff only), send, client decision, audit trail.
// Needs hub-data.js, billing-data.js and repair-quote-data.js. Renders into #quoteCard.

function initRepairQuote() {
  const el = document.getElementById('quoteCard');
  if (!el) return;
  const q = quoteById(new URLSearchParams(location.search).get('id')) || quoteById('REP-0871');
  const client = WH_CLIENTS.find(c => c.id === q.client);
  let minute = 0;
  // Prototype clock: afternoon of "today", a minute apart per action
  const stamp = () => `2026-10-16 16:${String(45 + Math.min(14, minute++)).padStart(2, '0')}`;
  let uploads = 0;

  // Header of the work order page follows the chosen repair
  const h1 = document.querySelector('.page-title-edit');
  if (h1) h1.textContent = `${q.id} · ${q.device}`;
  document.querySelectorAll('.breadcrumb-current').forEach(x => { x.textContent = q.id; });
  document.title = `${q.id} · Work order - Admin Portal`;
  const meta = document.querySelector('.asset-header-meta');
  if (meta) meta.querySelector('.asset-serial').textContent = q.serial;
  if (meta) meta.children[2].textContent = client.name;

  function render() {
    const [l, c] = QUOTE_STATE[q.state];
    const t = quoteTotals(q);
    const editable = q.state === 'draft' || q.state === 'expired';
    const row = (a, b, cls = '') => `<div class="tot-row ${cls}"><span>${a}</span><span>${b}</span></div>`;

    const decision = q.decision ? `<div class="decision-box decision-box-${q.decision.choice}">
        <div><strong>${escapeHtml(q.decision.by)}</strong> chose <span class="tag decision-${q.decision.choice}">${QUOTE_DECISIONS[q.decision.choice]}</span></div>
        <div class="entity-meta">${escapeHtml(q.decision.at)} · IP ${escapeHtml(q.decision.ip)}</div>
        ${q.decision.note ? `<div class="chain-note">“${escapeHtml(q.decision.note)}”</div>` : ''}
      </div>` : '';

    el.innerHTML = `
      <div class="card-header">
        <h3 class="card-title">Repair quote</h3>
        <span class="badge ${c}">${l}</span>
      </div>
      <div class="card-body">
        <div class="quote-section">
          <div class="detail-label">Diagnostic findings</div>
          ${editable ? `<textarea class="form-textarea" id="qFindings" rows="3">${escapeHtml(q.findings)}</textarea>` : `<p class="quote-findings">${escapeHtml(q.findings)}</p>`}
          <div class="quote-files">${q.files.map(f => `<span class="file-chip">📄 ${escapeHtml(f)}</span>`).join('')}${editable ? '<button type="button" class="btn btn-secondary btn-sm" id="qUpload">Upload findings</button>' : ''}</div>
        </div>
        
        <div class="quote-cols">
          <div>
            <div class="detail-label">Quote to client <span class="text-muted">· ${q.cur}</span></div>
            ${q.lines.map(([d, v]) => row(escapeHtml(d), fmtAmount(q.cur, v))).join('')}
            ${row('Repair handling fee (contract)', t.fee ? fmtAmount(q.cur, t.fee) : 'Not billable')}
            ${row('Repair total', fmtAmount(q.cur, t.total), 'tot-strong tot-balance')}
            <div class="quote-alts">
              <div>Replace: ${escapeHtml(q.replace.model)} · <strong>${fmtAmount(q.cur, q.replace.price)}</strong></div>
              <div>Write off${q.writeoff.value ? `: recovery value ${fmtAmount(q.cur, q.writeoff.value)}` : ''}${q.writeoff.note ? ` · ${escapeHtml(q.writeoff.note)}` : ''}</div>
            </div>
          </div>
          <div class="staff-only">
            <div class="detail-label">Vendor cost evidence <span class="staff-tag">Staff only · never shown to client</span></div>
            ${row('Facility', escapeHtml(q.facility))}
            ${row('Vendor quote', q.vendorQuote ? `📄 ${escapeHtml(q.vendorQuote)}` : '<span class="text-error">Not uploaded</span>')}
            ${row('Vendor cost', fmtAmount(q.cur, q.vendorCost))}
            ${row('Margin', `${fmtAmount(q.cur, t.margin)} · ${Math.round(t.marginPct)}%`, t.marginPct < 10 ? 'text-error' : '')}
            ${editable && !q.vendorQuote ? '<button type="button" class="btn btn-secondary btn-sm" id="qVendor">Upload vendor quote</button>' : ''}
          </div>
        </div>
        
        ${q.state === 'sent' ? `<div class="quote-wait">Sent to ${escapeHtml(q.sentTo)} (client admin) on ${escapeHtml(q.sent)}. Valid ${QUOTE_VALID_DAYS} days. The device stays at the facility until they decide.</div>` : ''}
        ${q.state === 'expired' ? `<div class="quote-wait quote-expired">No decision within ${QUOTE_VALID_DAYS} days. Resend, or call ${escapeHtml(q.sentTo)}.</div>` : ''}
        ${decision}
        <div class="form-error" id="qError" hidden></div>
        
        <div class="quote-actions">
          ${editable ? `<button type="button" class="btn btn-primary" id="qSend">${q.state === 'expired' ? 'Resend to client' : 'Send to client admin'}</button>` : ''}
          ${q.state === 'sent' ? '<button type="button" class="btn btn-secondary" id="qRemind">Send reminder</button><button type="button" class="btn btn-secondary" id="qSim" title="Prototype: simulate the client deciding in their portal">Simulate client decision ▾</button>' : ''}
        </div>
        <div class="sim-choices" id="qSimChoices" hidden>
          ${Object.entries(QUOTE_DECISIONS).map(([k, v]) => `<button type="button" class="btn btn-secondary btn-sm" data-decide="${k}">${v}</button>`).join('')}
        </div>
        
        <details class="quote-audit">
          <summary>Audit trail (${q.audit.length})</summary>
          <ul class="location-history">${[...q.audit].reverse().map((a, i) => `<li class="${i === 0 ? 'current' : ''}">${escapeHtml(a[2])}<div class="location-dates">${a[0]} · ${escapeHtml(a[1])}</div></li>`).join('')}</ul>
        </details>
      </div>`;
  }

  el.addEventListener('click', e => {
    const id = e.target.id;
    if (id === 'qUpload') {
      uploads++;
      q.files.push(`photo-${q.id.toLowerCase()}-${uploads}.jpg`);
      q.audit.push([stamp(), 'You', 'Diagnostic photo uploaded']);
      render();
    } else if (id === 'qVendor') {
      q.vendorQuote = `${q.facility.split(' ')[0]}-Q-${q.id.slice(4)}.pdf`;
      q.audit.push([stamp(), 'You', 'Vendor quote uploaded']);
      render();
    } else if (id === 'qSend') {
      const findings = document.getElementById('qFindings').value.trim();
      const err = !findings ? 'Add the diagnostic findings.' : !q.vendorQuote ? 'Upload the vendor quote first so the cost is evidenced.' : '';
      if (err) { const x = document.getElementById('qError'); x.textContent = err; x.hidden = false; return; }
      q.findings = findings;
      q.sentTo = q.sentTo || clientAdminFor(CONTRACTS[q.client]);
      q.sent = stamp();
      q.state = 'sent';
      q.audit.push([q.sent, 'You', `Sent to ${q.sentTo} (client admin)`]);
      render();
    } else if (id === 'qRemind') {
      q.audit.push([stamp(), 'You', 'Reminder sent to client']);
      render();
    } else if (id === 'qSim') {
      document.getElementById('qSimChoices').hidden = !document.getElementById('qSimChoices').hidden;
    }
    const d = e.target.closest('[data-decide]');
    if (d) {
      q.decision = { choice: d.dataset.decide, by: q.sentTo, at: `${stamp()} SGT`, ip: '203.0.113.40', note: '' };
      q.state = 'decided';
      const next = { repair: 'Repair approved; facility instructed to proceed', replace: 'Replacement order raised; old device routed to disposal', writeoff: 'Asset written off; device routed to disposal' }[d.dataset.decide];
      q.audit.push([stamp(), q.sentTo, `Decision: ${QUOTE_DECISIONS[d.dataset.decide]}`], [stamp(), 'System', next]);
      render();
    }
  });

  render();
  if (location.hash === '#quote') el.scrollIntoView();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initRepairQuote);
else initRepairQuote();
