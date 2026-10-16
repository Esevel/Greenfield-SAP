// Standard SLA edit panel, used on the Standard SLAs tab

function initSlaDefaultPanel(onSaved) {
  const $ = id => document.getElementById(id);
  const panel = $('defPanel');
  const overlay = $('defOverlay');
  let type = null;
  let cc = null;

  function followers() {
    const clients = slaClientsIn(cc);
    const custom = clients.filter(c => slaCustomCount(SLA_OVERRIDES[slaKey(c.id, type.key, cc)]) > 0);
    return { total: clients.length, custom: custom.length };
  }

  function values() {
    return type.milestones.map((m, i) => (m.fixed ? null : Number($(`defMs${i}`).value)));
  }

  function isValid(v, m) {
    return m.fixed || (Number.isInteger(v) && v >= (m.synced ? 0 : 1) && v <= SLA_UNITS[m.unit].max);
  }

  function update() {
    const vals = values();
    let ok = true;
    type.milestones.forEach((m, i) => {
      if (m.fixed) return;
      const valid = isValid(vals[i], m);
      $(`defMs${i}`).closest('.def-ms-row').classList.toggle('invalid', !valid);
      $(`defMs${i}`).closest('.def-ms-row').classList.toggle('dirty', valid && vals[i] !== SLA_DEFAULTS[type.key][cc][i]);
      ok = ok && valid;
    });
    $('defTotal').textContent = typeof slaTotalText === 'function' ? slaTotalText(type, vals) : '';
    const f = followers();
    const also = [...document.querySelectorAll('.def-also:checked')].map(x => WH_COUNTRIES[x.value][1]);
    $('defImpact').textContent = `Applies to ${f.total} client${f.total === 1 ? '' : 's'} in ${WH_COUNTRIES[cc][1]}`
      + (f.custom ? ` · ${f.custom} with exceptions keep their own values` : '')
      + (also.length ? ` · also copied to ${also.join(', ')}` : '');
    $('defSave').disabled = !ok;
    $('defError').hidden = ok;
  }

  function open(typeKey, country) {
    type = slaType(typeKey);
    cc = country;
    const meta = SLA_DEFAULT_META[type.key];
    $('defTitle').textContent = `Standard SLA · ${type.name}`;
    $('defMeta').textContent = `${WH_COUNTRIES[cc][0]} ${WH_COUNTRIES[cc][1]} · v${meta.version} · ${meta.date}`;
    $('defMilestones').innerHTML = type.milestones.map((m, i) => `
      <div class="def-ms-row">
        <span class="def-ms-step">${i + 1}</span>
        <label class="def-ms-label" for="defMs${i}">${m.label}${m.conditional ? `<span class="sla-sub">${m.conditional}</span>` : ''}${m.hubOnly ? '<span class="sla-sub">Skipped when shipped direct</span>' : ''}</label>
        ${m.fixed
          ? `<span class="sla-fixed">${m.fixed}</span>`
          : m.synced
            ? `<span class="def-ms-input"><span class="def-quote-lock" title="Set on each vendor's page, not editable here">🔒 Vendor lead time</span> + <input type="number" class="form-input sla-input" id="defMs${i}" min="0" max="${SLA_UNITS[m.unit].max}" step="1" value="${SLA_DEFAULTS[type.key][cc][i]}" aria-label="Grace allowance in business days"> <span class="sla-unit">days grace</span></span>`
            : `<span class="def-ms-input"><input type="number" class="form-input sla-input" id="defMs${i}" min="1" max="${SLA_UNITS[m.unit].max}" step="1" value="${SLA_DEFAULTS[type.key][cc][i]}"> <span class="sla-unit">${SLA_UNITS[m.unit].label}</span></span>`}
      </div>
      ${m.synced ? `<div class="def-synced-note">Each order uses the lead time of the vendor that takes it (${(vs => (vs.length ? vs.map(x => `${escapeHtml(x.name)} ${supplyRangeLabel(x.range)}`).join(', ') : 'no suppliers'))(supplyVendorsIn(cc))}). Lead times are set on each <a href="/pages/vendors/list.html" class="link-sm">vendor's page</a>.</div>` : ''}`).join('');
    $('defAlso').innerHTML = Object.keys(WH_COUNTRIES).filter(x => x !== cc).map(x => `
      <label class="def-also-item"><input type="checkbox" class="def-also" value="${x}"> ${WH_COUNTRIES[x][0]} ${WH_COUNTRIES[x][1]}</label>`).join('');
    update();
    panel.classList.add('open');
    overlay.classList.add('show');
    panel.querySelector('input')?.focus();
  }

  function close() {
    panel.classList.remove('open');
    overlay.classList.remove('show');
  }

  panel.addEventListener('input', update);
  $('defClose').addEventListener('click', close);
  $('defCancel').addEventListener('click', close);
  overlay.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && panel.classList.contains('open')) close(); });

  $('defSave').addEventListener('click', () => {
    const vals = values();
    const targets = [cc, ...[...document.querySelectorAll('.def-also:checked')].map(x => x.value)];
    targets.forEach(x => { SLA_DEFAULTS[type.key][x] = vals.slice(); });
    const meta = SLA_DEFAULT_META[type.key];
    meta.version += 1;
    meta.date = 'Today';
    const impact = $('defImpact').textContent;
    close();
    onSaved(`${type.name} standard saved as v${meta.version}. ${impact}.`);
  });

  return { open };
}
