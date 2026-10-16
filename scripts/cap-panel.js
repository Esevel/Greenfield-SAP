// Set cap panel, shared by the Procurement caps page and the client page. Needs hub-data.js, billing-data.js, contract-terms.js.
// Changing a cap is a contract term change, so it opens (or reuses) a draft version for the client.

function initCapPanel(onSaved) {
  if (!document.getElementById('capPanel')) {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="side-panel" id="capPanel" role="dialog" aria-modal="true" aria-labelledby="capTitle">
        <div class="side-panel-header">
          <div>
            <h3 class="side-panel-title" id="capTitle">Set cap</h3>
            <div class="device-panel-meta" id="capMeta"></div>
          </div>
          <button class="side-panel-close" id="capClose" aria-label="Close">&times;</button>
        </div>
        <div class="side-panel-body">
          <div class="cap-now" id="capNow"></div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label" for="capLimit">Limit</label>
              <input type="number" class="form-input" id="capLimit" min="1" step="1000">
            </div>
            <div class="form-group">
              <label class="form-label" for="capCur">Currency</label>
              <select class="form-select" id="capCur"></select>
            </div>
            <div class="form-group">
              <label class="form-label" for="capPeriod">Renewal period</label>
              <select class="form-select" id="capPeriod"><option>Annual</option><option>Quarterly</option><option>Monthly</option></select>
            </div>
            <div class="form-group">
              <label class="form-label" for="capRenewal">Next renewal</label>
              <input type="date" class="form-input" id="capRenewal">
            </div>
          </div>
          <div class="form-error" id="capError" hidden></div>
          <div class="readonly-note" id="capNote"></div>
        </div>
        <div class="side-panel-footer">
          <button class="btn btn-secondary" type="button" id="capCancel">Cancel</button>
          <button class="btn btn-primary" type="button" id="capSave">Save to draft</button>
        </div>
      </div>
      <div class="side-panel-overlay" id="capOverlay"></div>`);
  }
  const $ = id => document.getElementById(id);
  let clientId = null;
  $('capCur').innerHTML = Object.keys(FX_RATES).map(c => `<option>${c}</option>`).join('');

  function open(id) {
    clientId = id;
    const k = CONTRACTS[id];
    const draft = k.versions.find(v => v.status === 'draft');
    const pending = k.versions.find(v => v.status === 'pending');
    const t = draft ? draft.terms : k.terms;
    const i = capInfo(id);
    $('capTitle').textContent = `Set cap · ${WH_CLIENTS.find(c => c.id === id).name}`;
    $('capMeta').textContent = `Contract v${activeVersion(k).v}${draft ? ` · editing draft v${draft.v}` : ''}`;
    $('capNow').innerHTML = `<div class="detail-label">Current period</div><strong>${fmtAmount(i.cur, i.spent, 0)}</strong> spent of ${fmtAmount(i.cur, i.limit, 0)} · ${Math.round(i.pct)}%`;
    $('capLimit').value = t.cap.limit;
    $('capCur').value = t.cap.currency || parentEntity(t).currency;
    $('capPeriod').value = t.cap.period;
    $('capRenewal').value = t.cap.renewal;
    $('capError').hidden = true;
    $('capSave').disabled = !!pending;
    $('capNote').innerHTML = pending
      ? `v${pending.v} is awaiting the client's acceptance, so terms are locked. Withdraw it on the <a href="/pages/clients/amendment.html?c=${id}&v=${pending.v}">amendment page</a> to change the cap.`
      : `Saved to ${draft ? `draft v${draft.v}` : 'a new draft version'}. The current cap keeps applying until the client accepts the amendment.`;
    $('capPanel').classList.add('open');
    $('capOverlay').classList.add('show');
  }
  const close = () => { $('capPanel').classList.remove('open'); $('capOverlay').classList.remove('show'); };

  $('capSave').onclick = () => {
    const limit = Math.round(Number($('capLimit').value));
    const renewal = $('capRenewal').value;
    const err = !(limit > 0) ? 'Enter a limit above zero.' : !renewal ? 'Pick the next renewal date.' : '';
    $('capError').textContent = err;
    $('capError').hidden = !err;
    if (err) return;
    const k = CONTRACTS[clientId];
    let draft = k.versions.find(v => v.status === 'draft');
    if (!draft) {
      draft = { v: Math.max(...k.versions.map(x => x.v)) + 1, status: 'draft', effective: '', note: '', terms: contractTerms(k, activeVersion(k).v), createdBy: 'You' };
      k.versions.unshift(draft);
    }
    Object.assign(draft.terms.cap, { limit, currency: $('capCur').value, period: $('capPeriod').value, renewal });
    saveContracts();
    close();
    onSaved(clientId, draft);
  };
  $('capClose').onclick = close;
  $('capCancel').onclick = close;
  $('capOverlay').onclick = close;
  return { open };
}
