// People › Leavers: plan retrieval up to the offboarding work order. Fulfilment is tracked in Tracker › Offboarding.
// Needs hub-data.js, supply-data.js, stock-data.js, people-data.js and people-header.js.

const LEAVER_STATUS = {
  new: ['New', 'badge-info'],
  'needs-info': ['Needs info', 'badge-warning'],
  created: ['Work order created', 'badge-neutral']
};
const SOURCE_LABEL = { hris: 'HRIS terminated', scheduled: 'Scheduled departure' };

function initLeavers() {
  const $ = id => document.getElementById(id);
  const leavers = () => PEOPLE.filter(p => p.leaver);
  const panel = $('lvPanel');
  const overlay = $('lvOverlay');
  let current = null;
  let nextWo = 2070;

  $('fClient').innerHTML = '<option value="">All</option>' + [...new Set(leavers().map(p => p.client))].map(id => `<option value="${id}">${peopleClientName(id)}</option>`).join('');
  $('fCountry').innerHTML = '<option value="">All</option>' + Object.keys(WH_COUNTRIES).map(cc => `<option value="${cc}">${WH_COUNTRIES[cc][1]}</option>`).join('');
  $('fStatus').innerHTML = '<option value="open">Open</option><option value="">All</option>' + Object.entries(LEAVER_STATUS).map(([k, [l]]) => `<option value="${k}">${l}</option>`).join('');

  const outcomeSummary = p => Object.keys(DEVICE_OUTCOMES)
    .map(k => [k, p.assets.filter(a => a.outcome === k).length]).filter(([, n]) => n)
    .map(([k, n]) => `<span class="outcome outcome-${k}">${n} ${DEVICE_OUTCOMES[k].toLowerCase()}</span>`).join(' ');

  function render() {
    const f = { client: $('fClient').value, cc: $('fCountry').value, status: $('fStatus').value };
    const rows = leavers().filter(p => (!f.client || p.client === f.client) && (!f.cc || p.cc === f.cc)
      && (f.status === 'open' ? p.leaver.status !== 'created' : !f.status || p.leaver.status === f.status))
      .sort((a, b) => a.end.localeCompare(b.end));

    $('lvRows').innerHTML = rows.map(p => {
      const l = p.leaver;
      const [sLabel, sCls] = LEAVER_STATUS[l.status];
      const m = RETRIEVAL_METHODS[l.method];
      return `<tr data-id="${p.id}" tabindex="0" class="${current === p ? 'selected' : ''}">
        <td><div class="jn-name">${escapeHtml(p.name)} <span class="flag" title="${WH_COUNTRIES[p.cc][1]}">${WH_COUNTRIES[p.cc][0]}</span></div><div class="stock-sub">${escapeHtml(p.email)}</div></td>
        <td>${peopleClientName(p.client)}</td>
        <td>${peopleFmt(p.end, false)}<div><span class="date-tag ${p.endConfirmed ? 'date-confirmed' : 'date-estimated'}">${p.endConfirmed ? 'Confirmed' : 'Estimated'}</span></div></td>
        <td>${SOURCE_LABEL[l.source]}</td>
        <td>${assetIconsHtml(p.assets)}<div class="outcomes">${outcomeSummary(p)}</div></td>
        <td>${m.label}${l.date ? `<div class="stock-sub">${peopleFmt(l.date, false)}</div>` : ''}</td>
        <td>${l.reminder ? peopleFmt(cutoffReminderDate(p.end), false) : '<span class="text-muted">Off</span>'}</td>
        <td><span class="badge ${sCls} badge-sm">${sLabel}</span></td>
        <td>${l.wo ? `<a href="/pages/tracker/offboarding-detail.html" class="link-sm">${l.wo}</a>` : '<span class="text-muted">—</span>'}</td>
      </tr>`;
    }).join('') || `<tr><td colspan="9" class="text-muted sla-empty">${f.status === 'open' ? 'No open leavers. Departures appear here from HRIS or when the client schedules one.' : 'No leavers match'}</td></tr>`;

    $('lvCount').textContent = `${rows.length} shown · ${openLeavers().length} open · Sorted by departure date · Once a work order is created, track it in Tracker › Offboarding`;
    renderPeopleHeader();
  }

  const reminderHint = p => (p.leaver.reminder
    ? `Client IT is reminded on ${peopleFmt(cutoffReminderDate(p.end))} to revoke access.`
    : 'No reminder. The client handles access cutoff themselves.');

  function renderMethod() {
    const p = current;
    const method = $('lvMethod').value;
    const m = RETRIEVAL_METHODS[method];
    $('lvAddressGroup').hidden = !m.needsAddress;
    $('lvDateLabel').textContent = m.dateLabel;
    $('lvDateHint').textContent = method === 'office'
      ? `Employee hands devices to client IT by this date. Esevel then collects them from the office.`
      : `${method === 'box' ? 'Box should arrive' : 'Collection should happen'} before ${peopleFmt(p.end)}.${p.endConfirmed ? '' : ' Departure date is estimated, so confirm with the client first.'}`;
  }

  function renderPanel() {
    const p = current;
    const l = p.leaver;
    const [sLabel, sCls] = LEAVER_STATUS[l.status];
    const locked = l.status === 'created';
    $('lvTitle').innerHTML = `<a href="/pages/people/person.html?id=${p.id}" class="link-plain">${escapeHtml(p.name)}</a>`;
    $('lvMeta').innerHTML = `${peopleClientName(p.client)} · ${WH_COUNTRIES[p.cc][0]} ${WH_COUNTRIES[p.cc][1]} · Leaves ${peopleFmt(p.end)} (${p.endConfirmed ? 'confirmed' : 'estimated'}) · <span class="badge ${sCls} badge-sm">${sLabel}</span>`;

    $('lvAssets').innerHTML = p.assets.map((a, i) => `<li class="lv-asset">
        <span class="lv-asset-icon">${ASSET_ICON[a.type]}</span>
        <span class="lv-asset-name">${escapeHtml(a.name)}<span class="stock-sub">${escapeHtml(a.serial)} · goes to ${escapeHtml(outcomeDestination(p, a.outcome))}</span></span>
        <select class="form-select outcome-select" data-i="${i}" aria-label="Outcome for ${escapeHtml(a.name)}" ${locked ? 'disabled' : ''}>
          ${Object.entries(DEVICE_OUTCOMES).map(([k, v]) => `<option value="${k}" ${k === a.outcome ? 'selected' : ''}>${v}</option>`).join('')}
        </select>
      </li>`).join('');

    $('lvMethod').value = l.method;
    $('lvMethod').disabled = locked;
    $('lvAddress').value = p.address;
    $('lvAddress').disabled = locked;
    $('lvDate').value = l.date || '';
    $('lvDate').min = PEOPLE_TODAY;
    $('lvDate').max = p.end > PEOPLE_TODAY ? p.end : '';
    $('lvDate').disabled = locked;
    $('lvError').hidden = true;
    renderMethod();

    $('lvReminder').checked = l.reminder;
    $('lvReminderHint').textContent = reminderHint(p);

    $('lvSchedule').hidden = locked;
    $('lvDone').hidden = !locked;
    $('lvDone').innerHTML = locked ? `✓ Work order <a href="/pages/tracker/offboarding-detail.html">${l.wo}</a> created. Track retrieval in Tracker › Offboarding.` : '';
  }

  function open(p) {
    current = p;
    $('lvNote').hidden = true;
    renderPanel();
    render();
    panel.classList.add('open');
    overlay.classList.add('show');
    $('lvClose').focus();
  }

  function close() {
    current = null;
    panel.classList.remove('open');
    overlay.classList.remove('show');
    render();
  }

  $('lvRows').addEventListener('click', e => {
    if (e.target.closest('a')) return;
    const row = e.target.closest('tr[data-id]');
    if (row) open(personById(row.dataset.id));
  });
  $('lvRows').addEventListener('keydown', e => {
    const row = e.target.closest('tr[data-id]');
    if (row && e.key === 'Enter' && e.target === row) open(personById(row.dataset.id));
  });
  ['fClient', 'fCountry', 'fStatus'].forEach(id => $(id).addEventListener('change', render));

  // Outcome, method and reminder update in place so typed address/date aren't lost
  $('lvAssets').addEventListener('change', e => {
    const sel = e.target.closest('.outcome-select');
    if (!sel) return;
    const a = current.assets[sel.dataset.i];
    a.outcome = sel.value;
    sel.closest('.lv-asset').querySelector('.stock-sub').textContent = `${a.serial} · goes to ${outcomeDestination(current, a.outcome)}`;
    render();
  });
  $('lvMethod').addEventListener('change', renderMethod);
  $('lvReminder').addEventListener('change', () => {
    current.leaver.reminder = $('lvReminder').checked;
    $('lvReminderHint').textContent = reminderHint(current);
    render();
  });

  $('lvSchedule').addEventListener('click', () => {
    const method = $('lvMethod').value;
    const address = $('lvAddress').value.trim();
    const date = $('lvDate').value;
    const m = RETRIEVAL_METHODS[method];
    const msg = m.needsAddress && !address ? 'Enter a return address.' : !date ? `Pick a date: ${m.dateLabel.toLowerCase()}.` : '';
    $('lvError').textContent = msg;
    $('lvError').hidden = !msg;
    if (msg) return;
    if (m.needsAddress) current.address = address;
    Object.assign(current.leaver, { method, date, status: 'created', wo: `OFF-${nextWo++}` });
    $('lvNote').textContent = `✓ ${m.label} scheduled for ${peopleFmt(date)}.`;
    $('lvNote').hidden = false;
    renderPanel();
    render();
  });

  $('lvClose').addEventListener('click', close);
  $('lvCancel').addEventListener('click', close);
  overlay.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && panel.classList.contains('open')) close(); });

  render();
  const target = personById(new URLSearchParams(location.search).get('open'));
  if (target && target.leaver) open(target);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initLeavers);
else initLeavers();
