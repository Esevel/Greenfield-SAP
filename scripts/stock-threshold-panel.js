// Threshold + restock proposal side panel, shared by the client stock page and the Restock queue.
// Needs hub-data.js, supply-data.js and stock-data.js. Markup lives in each page (#thPanel).

function initThresholdPanel(onChange) {
  const $ = id => document.getElementById(id);
  const panel = $('thPanel');
  const overlay = $('thOverlay');
  let current = null;
  let fixedClient = null;
  let setBy = 'client';

  function setSetBy(v) {
    setBy = v;
    document.querySelectorAll('#thSetBy .segment-button').forEach(b => b.classList.toggle('active', b.dataset.setby === v));
  }

  function renderProposal() {
    const r = current && restockFor(current);
    $('thProposal').hidden = !r;
    if (!r) return;
    const t = current;
    $('prQty').textContent = `${r.qty} × ${t.category.toLowerCase()} to bring available stock to ${t.restockTo}`;
    $('prVendor').textContent = t.vendor;
    $('prCost').textContent = t.unitCost;
    const sup = Object.values(SUPPLY_SUPPLIERS).find(s => s.name === t.vendor);
    const lt = sup && sup.leadTimes[t.country];
    $('prLead').textContent = lt ? `${supplyRangeLabel(lt)} to hub` : 'Not set on vendor page';
    $('prHub').textContent = r.hub || 'No assigned hub · client to nominate a site';
    if (typeof capInfo === 'function') {
      if (!$('prCap')) $('prHub').closest('.info-row').insertAdjacentHTML('afterend', '<div class="info-row"><span class="info-label">Procurement cap</span><span class="info-value" id="prCap"></span></div>');
      const c = capInfo(t.client);
      const [cur, amt] = String(t.unitCost).split(' ');
      const raw = Number((amt || '').replace(/,/g, '')) * r.qty;
      // Quote currency converted into the cap's currency before comparing
      const est = raw && FX_RATES[cur] ? fxConvert(raw, cur, c.cur) : 0;
      const after = est ? c.remaining - est : null;
      $('prCap').innerHTML = `${fmtAmount(c.cur, Math.max(0, c.remaining), 0)} left${after !== null ? ` · <span class="${after < 0 ? 'text-error' : ''}">${after < 0 ? `over by ${fmtAmount(c.cur, -after, 0)}` : `${fmtAmount(c.cur, after, 0)} after this`}</span>` : ''}${est && cur !== c.cur ? `<div class="stock-sub">${fmtAmount(cur, raw, 0)} ≈ ${fmtAmount(c.cur, est, 0)} (${c.fxSource})</div>` : ''}`;
    }
    const label = { new: 'Not sent yet', awaiting: `Sent to ${stockClient(t.client).name} ${r.sent ? `on ${stockFmtDate(r.sent)} ` : ''}· awaiting approval`, approved: 'Approved by client · PO raised', declined: 'Declined by client', dismissed: 'Dismissed. A new proposal is raised if stock drops further.' }[r.state];
    $('prStatus').textContent = label;
    $('prStatus').className = `proposal-status ${r.state === 'awaiting' ? 'awaiting' : ''}`;
    $('prActions').hidden = r.state !== 'new';
  }

  function open(t, opts = {}) {
    current = t;
    fixedClient = opts.client || null;
    $('thNewFields').hidden = !!t;
    $('thDupError').hidden = true;
    $('thMinError').hidden = true;
    if (t) {
      $('thTitle').textContent = `${stockClient(t.client).name} · ${t.category}`;
      $('thMeta').textContent = `${WH_COUNTRIES[t.country][0]} ${WH_COUNTRIES[t.country][1]} · ${thresholdCurrent(t)} available now`;
      $('thMin').value = t.min;
      $('thRestockTo').value = t.restockTo;
      setSetBy(t.setBy);
    } else {
      $('thTitle').textContent = 'Add threshold';
      $('thMeta').textContent = 'Per client, category and country';
      $('thClient').innerHTML = WH_CLIENTS.filter(c => !fixedClient || c.id === fixedClient).map(c => `<option value="${c.id}">${c.name}</option>`).join('');
      $('thClient').disabled = !!fixedClient;
      const ccs = Object.keys(fixedClient ? HUB_ASSIGNMENTS[fixedClient] : WH_COUNTRIES);
      $('thCountry').innerHTML = ccs.map(cc => `<option value="${cc}">${WH_COUNTRIES[cc][0]} ${WH_COUNTRIES[cc][1]}</option>`).join('');
      if (opts.country) $('thCountry').value = opts.country;
      $('thMin').value = 5;
      $('thRestockTo').value = 10;
      setSetBy('esevel');
    }
    renderProposal();
    panel.classList.add('open');
    overlay.classList.add('show');
    (t ? $('thMin') : $('thCategory')).focus();
  }

  function close() {
    current = null;
    panel.classList.remove('open');
    overlay.classList.remove('show');
  }

  $('thClose').addEventListener('click', close);
  $('thCancel').addEventListener('click', close);
  overlay.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && panel.classList.contains('open')) close(); });
  document.querySelectorAll('#thSetBy .segment-button').forEach(b => b.addEventListener('click', () => setSetBy(b.dataset.setby)));

  $('prSend').addEventListener('click', () => {
    RESTOCK_STATE[current.id] = { state: 'awaiting', sent: '2026-10-16', by: 'You' };
    renderProposal();
    onChange(`Restock sent to ${stockClient(current.client).name} for approval.`);
  });
  $('prDismiss').addEventListener('click', () => {
    RESTOCK_STATE[current.id] = { state: 'dismissed' };
    renderProposal();
    onChange('Restock proposal dismissed.');
  });

  $('thForm').addEventListener('submit', e => {
    e.preventDefault();
    const min = Number($('thMin').value);
    const to = Number($('thRestockTo').value);
    let msg = '';
    if (!Number.isInteger(min) || min < 1) msg = 'Minimum must be a whole number, 1 or more.';
    else if (!Number.isInteger(to) || to <= min) msg = '"Restock up to" must be higher than the minimum.';
    $('thMinError').textContent = msg;
    $('thMinError').hidden = !msg;
    if (msg) return;

    if (current) {
      Object.assign(current, { min, restockTo: to, setBy, setByName: setBy === 'client' ? current.setByName : 'You' });
      // A changed threshold invalidates any dismissed proposal
      if (RESTOCK_STATE[current.id] && RESTOCK_STATE[current.id].state === 'dismissed') delete RESTOCK_STATE[current.id];
    } else {
      const client = $('thClient').value;
      const category = $('thCategory').value;
      const country = $('thCountry').value;
      if (STOCK_THRESHOLDS.some(t => t.client === client && t.category === category && t.country === country)) {
        $('thDupError').hidden = false;
        return;
      }
      STOCK_THRESHOLDS.push({ id: `t${Date.now()}`, client, category, country, min, restockTo: to, setBy, setByName: 'You', vendor: 'Preferred vendor', unitCost: '—' });
    }
    close();
    onChange('Threshold saved.');
  });

  return { open };
}
