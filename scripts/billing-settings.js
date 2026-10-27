// Settings › Billing: standard fees per country (versioned), tax and duties (versioned), FX sources and rates.
// Needs hub-data.js, billing-data.js, contract-terms.js and billing-settings-data.js.

function initBillingSettings() {
  const $ = id => document.getElementById(id);
  const tab = ['plans', 'fees', 'tax', 'fx'].includes(new URLSearchParams(location.search).get('tab')) ? new URLSearchParams(location.search).get('tab') : 'plans';
  const clientName = id => WH_CLIENTS.find(c => c.id === id).name;
  const effective = r => `${billingDate(r.from)}${r.to ? ` → ${billingDate(r.to)}` : ' → open'}`;
  const note = t => { $('bsSaved').textContent = `✓ ${t}`; $('bsSaved').hidden = false; };
  document.querySelectorAll('#bsTabs .tab-link').forEach(a => a.classList.toggle('active', a.dataset.tab === tab));
  $(`tab-${tab}`).hidden = false;

  /* Standard fees: events down, countries across */
  const ccs = Object.keys(WH_COUNTRIES);
  let editCc = null;

  function renderFees() {
    $('sfHead').innerHTML = `<tr><th>Event</th><th>Charged when</th>${ccs.map(cc => {
      const v = standardFeeVersion(cc);
      const next = scheduledFeeVersion(cc);
      return `<th class="num sf-cc"><div>${WH_COUNTRIES[cc][0]} ${cc} · ${v.cur}</div><button type="button" class="link-sm btn-text" data-edit-cc="${cc}">Edit</button>${next ? `<div class="stock-sub sf-next">v${next.v} from ${billingDate(next.from)}</div>` : ''}</th>`;
    }).join('')}</tr>`;
    $('sfRows').innerHTML = FEE_EVENTS.map(e => `<tr>
        <td><strong>${e.label}</strong><div class="stock-sub">${e.unit}</div></td>
        <td class="sf-trigger">${e.trigger}</td>
        ${ccs.map(cc => { const v = standardFeeVersion(cc); return `<td class="num">${fmtAmount(v.cur, v.rates[e.key])}</td>`; }).join('')}
      </tr>`).join('');
    $('sfCount').textContent = 'Current versions shown. Rush has no surcharge; Support isn\'t billable. Client exceptions (different fees or events switched off) are set on each client\'s contract.';
  }

  function openFees(cc) {
    editCc = cc;
    const v = standardFeeVersion(cc);
    $('sfTitle').textContent = `Standard fees · ${WH_COUNTRIES[cc][1]}`;
    $('sfMeta').textContent = `Current v${v.v} · ${v.cur} · effective ${billingDate(v.from)}`;
    $('sfEdit').innerHTML = FEE_EVENTS.map(e => `<tr>
        <td>${e.label}<div class="stock-sub">${e.unit}</div></td>
        <td class="sf-trigger">${e.trigger}</td>
        <td class="num"><span class="fee-input"><span class="text-muted">${v.cur}</span><input type="number" class="form-input" data-fee="${e.key}" min="0" step="${e.key === 'storage' ? '0.01' : '1'}" value="${v.rates[e.key]}" aria-label="${e.label} fee"></span></td>
      </tr>`).join('');
    $('sfFrom').value = '';
    $('sfFrom').min = '2026-10-17';
    $('sfNote').value = '';
    $('sfError').hidden = true;
    const affected = Object.entries(CONTRACTS).filter(([, k]) => k.terms.countries.includes(cc)).map(([id]) => clientName(id));
    $('sfImpact').textContent = `Applies to ${affected.length} client${affected.length === 1 ? '' : 's'} operating in ${WH_COUNTRIES[cc][1]} (${affected.join(', ')}), except where their contract sets its own fee. Charges already raised keep their rate.`;
    $('sfHistory').innerHTML = STANDARD_FEES[cc].map(x => `<li class="${x === v ? 'current' : ''}"><strong>v${x.v}</strong> · ${effective(x)}<div class="location-dates">${escapeHtml(x.note)} · ${escapeHtml(x.by)}</div></li>`).join('');
    $('sfPanel').classList.add('open');
    $('sfOverlay').classList.add('show');
  }
  const closeFees = () => { $('sfPanel').classList.remove('open'); $('sfOverlay').classList.remove('show'); };

  $('sfSave').addEventListener('click', () => {
    const v = standardFeeVersion(editCc);
    const rates = {};
    document.querySelectorAll('#sfEdit [data-fee]').forEach(i => { rates[i.dataset.fee] = Math.max(0, Number(i.value) || 0); });
    const from = $('sfFrom').value;
    const why = $('sfNote').value.trim();
    const changed = FEE_EVENTS.filter(e => rates[e.key] !== v.rates[e.key]);
    const err = !changed.length ? 'No fees changed.' : !from ? 'Pick an effective date.' : !why ? 'Add a reason.' : '';
    $('sfError').textContent = err;
    $('sfError').hidden = !err;
    if (err) return;
    const list = STANDARD_FEES[editCc];
    const scheduled = scheduledFeeVersion(editCc);
    if (scheduled) list.splice(list.indexOf(scheduled), 1);
    v.to = dayBefore(from);
    list.unshift({ v: Math.max(...list.map(x => x.v)) + 1, cur: v.cur, rates, from, to: '', by: 'You', note: why });
    closeFees();
    note(`${WH_COUNTRIES[editCc][1]} standard fees v${list[0].v} from ${billingDate(from)}: ${changed.map(e => e.label).join(', ')} changed.`);
    renderFees();
  });
  $('sfHead').addEventListener('click', e => { const b = e.target.closest('[data-edit-cc]'); if (b) openFees(b.dataset.editCc); });
  $('sfClose').addEventListener('click', closeFees);
  $('sfCancel').addEventListener('click', closeFees);
  $('sfOverlay').addEventListener('click', closeFees);

  /* Tax */
  const jurs = [...Object.keys(WH_COUNTRIES), ...Object.keys(US_STATES).map(s => `US-${s}`)];
  let editing = null;
  $('tJur').innerHTML = '<option value="">All</option>' + jurs.map(j => `<option value="${j}">${jurLabel(j)}</option>`).join('');
  $('tfJur').innerHTML = jurs.map(j => `<option value="${j}">${jurLabel(j)}</option>`).join('');

  function renderTax() {
    const rows = TAX_RULES.filter(r => (!$('tJur').value || r.jur === $('tJur').value) && ($('tPast').checked || ruleStatus(r) !== 'expired'))
      .sort((a, b) => jurs.indexOf(a.jur) - jurs.indexOf(b.jur) || b.from.localeCompare(a.from));
    $('tRows').innerHTML = rows.map(r => {
      const s = ruleStatus(r);
      const [l, c] = RULE_STATUS[s];
      return `<tr class="${s === 'expired' ? 'row-muted' : ''}">
        <td>${jurLabel(r.jur)}</td>
        <td>${escapeHtml(r.type)}</td>
        <td class="num"><strong>${r.rate}%</strong></td>
        <td>${effective(r)}</td>
        <td class="duties-cell">${escapeHtml(r.duties)}</td>
        <td><span class="badge ${c} badge-sm">${l}</span></td>
        <td>${s === 'expired' || !isLatest(TAX_RULES, r) ? '' : `<button type="button" class="link-sm btn-text" data-edit="${r.id}">Edit</button>`}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="7" class="text-muted sla-empty">No rates match</td></tr>';
  }

  function openTax(r) {
    editing = r;
    $('tTitle').textContent = r ? 'Edit tax rate' : 'Add tax rate';
    $('tMeta').textContent = r ? `${jurLabel(r.jur)} · ${r.type}` : 'Country or US state';
    $('tfJur').value = r ? r.jur : 'SG';
    $('tfJur').disabled = !!r;
    $('tfType').value = r ? r.type : '';
    $('tfType').disabled = !!r;
    $('tfRate').value = r ? r.rate : '';
    $('tfFrom').value = '';
    $('tfFrom').min = '2026-10-17';
    $('tfDuties').value = r ? r.duties : '';
    $('tError').hidden = true;
    $('tNote').textContent = r ? 'Saving ends the current rate the day before the new effective date. Issued invoices keep the rate they were issued with.' : '';
    $('tPanel').classList.add('open');
    $('tOverlay').classList.add('show');
  }
  const closeTax = () => { $('tPanel').classList.remove('open'); $('tOverlay').classList.remove('show'); editing = null; };

  $('tSave').addEventListener('click', () => {
    const rate = Number($('tfRate').value);
    const from = $('tfFrom').value;
    const type = $('tfType').value.trim();
    const duties = $('tfDuties').value.trim();
    const err = !type ? 'Enter a tax type.' : $('tfRate').value === '' || rate < 0 || rate > 50 ? 'Enter a rate between 0 and 50%.' : !from ? 'Pick an effective date.' : '';
    $('tError').textContent = err;
    $('tError').hidden = !err;
    if (err) return;
    if (editing) {
      addRuleVersion(TAX_RULES, editing, { rate, duties }, from);
      note(`New ${editing.type} version for ${jurLabel(editing.jur)}: ${rate}% from ${billingDate(from)}.`);
    } else {
      const id = `x${Date.now()}`;
      TAX_RULES.unshift({ id, chain: id, jur: $('tfJur').value, type, rate, from, to: '', duties });
      note(`${type} ${rate}% added for ${jurLabel($('tfJur').value)} from ${billingDate(from)}.`);
    }
    closeTax();
    renderTax();
  });
  $('tRows').addEventListener('click', e => { const b = e.target.closest('[data-edit]'); if (b) openTax(TAX_RULES.find(r => r.id === b.dataset.edit)); });
  $('txAdd').addEventListener('click', () => openTax(null));
  $('tClose').addEventListener('click', closeTax);
  $('tCancel').addEventListener('click', closeTax);
  $('tOverlay').addEventListener('click', closeTax);
  ['tJur', 'tPast'].forEach(id => $(id).addEventListener('change', renderTax));

  /* FX */
  function renderFx() {
    $('fxSources').innerHTML = Object.entries(FX_SOURCES).map(([key, label]) => {
      const users = Object.entries(CONTRACTS).filter(([, k]) => k.terms.fxSource === key).map(([id]) => clientName(id));
      return `<tr>
        <td><strong>${label.split(' (')[0]}</strong></td>
        <td>${label.match(/\((.*)\)/)[1]}</td>
        <td>${users.length ? users.map(escapeHtml).join(', ') : '<span class="text-muted">None</span>'}</td>
        <td class="text-muted">${FX_REFRESHED[key]}</td>
      </tr>`;
    }).join('');
    $('fxRates').innerHTML = Object.entries(FX_RATES).map(([c, v]) => `<tr>
        <td><span class="cur-code">${c}</span></td>
        <td class="num">${v.toFixed(4)}</td>
        <td class="num ${FX_CHANGE_7D[c] > 0 ? 'text-error' : FX_CHANGE_7D[c] < 0 ? 'text-success' : 'text-muted'}">${FX_CHANGE_7D[c] > 0 ? '+' : ''}${FX_CHANGE_7D[c].toFixed(1)}%</td>
      </tr>`).join('');
  }

  /* Plans: list price per seat, add-ons, clients on each plan and the feature matrix */
  function renderPlans() {
    const on = tier => Object.entries(CONTRACTS).filter(([, kk]) => kk.tier === tier && kk.status !== 'expired');
    $('plCards').innerHTML = PLAN_TIERS.map(tier => {
      const p = PLANS[tier];
      const clients = on(tier);
      const seats = clients.reduce((n, [, kk]) => n + (kk.terms.subscription ? subSeatsAt(kk.terms.subscription, SUB_TODAY) : 0), 0);
      const addons = Object.entries(PLAN_ADDONS).map(([, a]) => a.plans[tier] ? `<li>${a.label}: ${a.plans[tier] === 'included' ? 'included' : `+ USD ${a.listUSD} / seat / month`}</li>` : '').join('');
      return `<div class="plan-card ${p.seat ? '' : 'plan-card-enterprise'}">
        <div class="plan-name">${tier}</div>
        <div class="plan-price">${p.free ? 'Free<span> · seats at no charge</span>' : p.seat ? `USD ${p.listUSD}<span> / seat / month · billed yearly</span>` : 'Custom<span> · per event</span>'}</div>
        ${p.seat ? `<div class="plan-devices">${p.devices} device${p.devices === 1 ? '' : 's'} per user${p.free ? '' : ` · extra USD ${p.deviceUSD} / device / month`}</div>` : ''}
        <div class="plan-blurb">${escapeHtml(p.blurb)}</div>
        ${addons ? `<ul class="plan-addons">${addons}</ul>` : ''}
        <div class="plan-meta">${clients.length} client${clients.length === 1 ? '' : 's'}${p.seat ? ` · ${seats} ${p.free ? '' : 'committed '}seats` : ''}${clients.length ? `<div class="stock-sub">${clients.map(([id]) => escapeHtml(clientName(id))).join(', ')}</div>` : ''}</div>
      </div>`;
    }).join('');
    const cell = v => (v === true ? '<span class="plan-yes" aria-label="Included">✓</span>' : v === 'addon' ? '<span class="plan-addon">Add-on</span>' : '<span class="plan-no" aria-label="Not included">—</span>');
    $('plHead').innerHTML = `<tr><th>Features</th>${PLAN_TIERS.map(t => `<th class="plan-col">${t}</th>`).join('')}</tr>`;
    $('plRows').innerHTML = PLAN_FEATURES.map(([group, rows]) => `<tr class="compare-section"><td colspan="${PLAN_TIERS.length + 1}">${group}</td></tr>${rows.map(([name, ...v]) => `<tr><td>${name}</td>${v.map(x => `<td class="plan-col">${cell(x)}</td>`).join('')}<td class="plan-col"><span class="plan-custom">Per contract</span></td></tr>`).join('')}`).join('');
  }

  renderPlans();
  renderFees();
  renderTax();
  renderFx();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initBillingSettings);
else initBillingSettings();
