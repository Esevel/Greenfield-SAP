// Operating calendar: country list, month calendar/list, operating schedule, order cut-off and delay notices, Add closure dialog

const HOLIDAY_TODAY = new Date(2026, 9, 16);

// HC_COUNTRIES lives in calendar-data.js so business-hour SLAs can read it

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const parseDate = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const isoDate = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtShort = d => `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;

function initHolidays() {
  const $ = id => document.getElementById(id);
  let country = HC_COUNTRIES[0];
  let view = { year: HOLIDAY_TODAY.getFullYear(), month: HOLIDAY_TODAY.getMonth() };
  let mode = 'calendar';

  const entriesFor = c => c.entries.map(([from, to, type, name, meta]) => ({ from: parseDate(from), to: parseDate(to), type, name, meta }));

  function renderCountries() {
    const q = $('countrySearch').value.trim().toLowerCase();
    const list = HC_COUNTRIES.filter(c => !q || c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q);
    $('countryList').innerHTML = list.length
      ? list.map(c => `<li><button type="button" class="country-item ${c === country ? 'active' : ''}" data-code="${c.code}">
          <span><span class="flag">${c.flag}</span> ${c.name}</span>
          <span class="country-count">${c.entries.filter(e => e[0].startsWith(String(view.year))).length}</span></button></li>`).join('')
      : '<li class="country-count" style="padding: var(--space-sm);">No countries match</li>';
  }

  function entryHtml(e) {
    const label = e.type === 'public' ? 'Public holiday' : 'Ad-hoc closure';
    const title = `${label}: ${e.name}${e.meta ? ` (${e.meta})` : ''}`;
    const span = document.createElement('span');
    span.className = `cal-entry ${e.type === 'public' ? 'entry-public' : 'entry-adhoc'}`;
    span.title = title;
    span.textContent = e.name;
    return span.outerHTML;
  }

  function renderCalendar() {
    const first = new Date(view.year, view.month, 1);
    const start = new Date(first);
    start.setDate(1 - ((first.getDay() + 6) % 7)); // weeks start on Monday
    const entries = entriesFor(country);
    const cells = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<div class="cal-dow">${d}</div>`);
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      if (i >= 35 && d.getMonth() !== view.month) break;
      const onDay = entries.filter(e => d >= e.from && d <= e.to);
      const cls = [
        'cal-day',
        d.getMonth() !== view.month ? 'outside' : '',
        country.days.includes(d.getDay()) ? '' : 'non-working',
        isoDate(d) === isoDate(HOLIDAY_TODAY) ? 'today' : ''
      ].join(' ');
      cells.push(`<div class="${cls}"><span class="cal-date">${d.getDate()}</span>${onDay.map(entryHtml).join('')}</div>`);
    }
    $('calGrid').innerHTML = cells.join('');
  }

  function renderList() {
    const entries = entriesFor(country)
      .filter(e => e.to.getFullYear() >= view.year && e.from.getFullYear() <= view.year)
      .sort((a, b) => a.from - b.from);
    $('calList').innerHTML = entries.length ? entries.map(e => {
      const range = isoDate(e.from) === isoDate(e.to) ? `${DOW[e.from.getDay()]} ${fmtShort(e.from)}` : `${fmtShort(e.from)} – ${fmtShort(e.to)}`;
      const name = document.createElement('span');
      name.textContent = e.name;
      const meta = e.meta ? `<span class="hl-meta">${e.meta}</span>` : '';
      return `<li><span class="hl-date">${range}</span><span>${name.outerHTML}${meta}</span>
        <span class="tag ${e.type === 'public' ? 'entry-public' : 'entry-adhoc'}">${e.type === 'public' ? 'Public holiday' : 'Ad-hoc closure'}</span></li>`;
    }).join('') : `<li class="holiday-empty">No holidays or closures in ${view.year}</li>`;
  }

  function renderSchedule() {
    $('scheduleTitle').textContent = `${country.flag} Operating schedule`;
    $('weekdayRow').innerHTML = [1, 2, 3, 4, 5, 6, 0].map(d => `<span class="weekday ${country.days.includes(d) ? 'on' : ''}">${DOW[d].slice(0, 2)}</span>`).join('');
    const dayNames = country.days.map(d => DOW[d]);
    $('workingHours').textContent = `${dayNames[0]}–${dayNames[dayNames.length - 1]}, ${country.hours} local`;
    $('tzValue').textContent = country.tz;
    const yearEntries = entriesFor(country).filter(e => e.from.getFullYear() === view.year);
    const pub = yearEntries.filter(e => e.type === 'public').length;
    const adhoc = yearEntries.length - pub;
    $('holidayCount').textContent = `${pub} public · ${adhoc} closure${adhoc === 1 ? '' : 's'}`;
    $('cutoffInput').value = country.cutoff;
    renderDelays();
  }

  function renderDelays() {
    const list = $('delayList');
    list.innerHTML = '';
    if (!country.delays.length) {
      list.innerHTML = '<li class="delay-empty">No delay notices</li>';
      return;
    }
    country.delays.forEach(([days, reason, until], n) => {
      const li = document.createElement('li');
      li.className = 'delay-item';
      const text = document.createElement('span');
      const strong = document.createElement('strong');
      strong.textContent = `+${days} day${days === 1 ? '' : 's'}`;
      text.append(strong, ` · ${reason} · until ${until}`);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-icon';
      btn.dataset.remove = n;
      btn.setAttribute('aria-label', `Remove notice: ${reason}`);
      btn.textContent = '×';
      li.append(text, btn);
      list.appendChild(li);
    });
  }

  function render() {
    $('calMonth').textContent = mode === 'calendar' ? `${MONTHS[view.month]} ${view.year}` : `${view.year}`;
    $('calGridWrap').hidden = mode !== 'calendar';
    $('calListWrap').hidden = mode !== 'list';
    mode === 'calendar' ? renderCalendar() : renderList();
    renderCountries();
    renderSchedule();
  }

  $('countryList').addEventListener('click', e => {
    const btn = e.target.closest('.country-item');
    if (!btn) return;
    country = HC_COUNTRIES.find(c => c.code === btn.dataset.code);
    render();
  });
  $('countrySearch').addEventListener('input', renderCountries);
  $('cutoffInput').addEventListener('change', e => { country.cutoff = e.target.value; });

  // Prototype: delay notices lengthen checkout estimates only; SLA clocks are unaffected
  $('delayList').addEventListener('click', e => {
    const btn = e.target.closest('[data-remove]');
    if (!btn) return;
    country.delays.splice(Number(btn.dataset.remove), 1);
    renderDelays();
  });
  $('addDelay').addEventListener('click', () => {
    const days = window.prompt('Extra days?', '2');
    if (days === null || !/^\d+$/.test(days.trim()) || Number(days) < 1) return;
    const reason = window.prompt('Reason?', '');
    if (!reason || !reason.trim()) return;
    const until = window.prompt('Until (e.g. 31 Oct)?', '');
    if (!until || !until.trim()) return;
    country.delays.push([Number(days), reason.trim(), until.trim()]);
    renderDelays();
  });

  function step(delta) {
    if (mode === 'list') {
      view.year += delta;
    } else {
      const d = new Date(view.year, view.month + delta, 1);
      view = { year: d.getFullYear(), month: d.getMonth() };
    }
    render();
  }
  $('calPrev').addEventListener('click', () => step(-1));
  $('calNext').addEventListener('click', () => step(1));
  $('calToday').addEventListener('click', () => {
    view = { year: HOLIDAY_TODAY.getFullYear(), month: HOLIDAY_TODAY.getMonth() };
    render();
  });

  document.querySelectorAll('#calView .segment-button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#calView .segment-button').forEach(b => b.classList.toggle('active', b === btn));
      mode = btn.dataset.view;
      render();
    });
  });

  // Add closure dialog
  const modal = $('closureModal');
  let scope = 'country';
  let applies = 'both';

  function setSegment(groupId, attr, value) {
    document.querySelectorAll(`#${groupId} .segment-button`).forEach(b => b.classList.toggle('active', b.dataset[attr] === value));
  }

  function businessDaysBetween(from, to) {
    let n = 0;
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      if (country.days.includes(d.getDay())) n++;
    }
    return n;
  }

  // Prototype estimate of open work orders whose SLA targets fall inside the closure
  function updatePreview() {
    const from = $('closureFrom').value ? parseDate($('closureFrom').value) : null;
    const to = $('closureTo').value ? parseDate($('closureTo').value) : null;
    const preview = $('closurePreview');
    if (!from || !to || to < from) {
      preview.textContent = 'Pick a date range to see the SLA impact';
      return;
    }
    const days = businessDaysBetween(from, to);
    const perDay = { procurement: 3, services: 4, both: 7 }[applies];
    const factor = { country: 1, region: 0.4, hub: 0.3 }[scope];
    const shifted = Math.round(days * perDay * factor);
    const where = scope === 'region' ? $('closureRegion').value : scope === 'hub' ? selectedHub().name : country.name;
    preview.textContent = `⚠ Shifts ${shifted} SLA target${shifted === 1 ? '' : 's'} · ${days} business day${days === 1 ? '' : 's'} closed in ${where}`;
  }

  // Hub closures only pause work that runs through that hub: storage intake and deploy-from-stock for the clients assigned to it
  const countryHubs = () => WAREHOUSES.filter(w => w.type === 'esevel' && w.status === 'Active' && w.country === country.code);
  const selectedHub = () => WAREHOUSES.find(w => w.id === Number($('closureHub').value));

  function updateHubClients() {
    const hub = selectedHub();
    if (!hub) return;
    const names = clientsAssignedTo(hub.id).map(x => x.client.name);
    $('hubClients').textContent = names.length
      ? `Pauses deploy-from-stock and intake for ${names.length} assigned client${names.length === 1 ? '' : 's'}: ${names.join(', ')}`
      : 'No clients are assigned to this hub';
  }

  function openModal() {
    $('closureTitle').textContent = `Add closure · ${country.flag} ${country.name}`;
    $('closureRegion').innerHTML = country.regions.map(r => `<option>${r}</option>`).join('');
    const hubs = countryHubs();
    $('closureHub').innerHTML = hubs.map(h => `<option value="${h.id}">${escapeHtml(h.name)}</option>`).join('');
    $('hubScopeBtn').disabled = !hubs.length;
    $('hubScopeBtn').title = hubs.length ? '' : `No active Esevel hub in ${country.name}`;
    $('hubGroup').hidden = true;
    updateHubClients();
    $('closureFrom').value = '2026-10-29';
    $('closureTo').value = '2026-10-30';
    $('closureReason').value = '';
    scope = 'country';
    applies = 'both';
    setSegment('closureScope', 'scope', scope);
    setSegment('closureApplies', 'applies', applies);
    $('regionGroup').hidden = true;
    $('dateError').hidden = true;
    $('reasonError').hidden = true;
    updatePreview();
    modal.classList.add('show');
    $('closureFrom').focus();
  }

  function closeModal() {
    modal.classList.remove('show');
    $('addClosure').focus();
  }

  $('addClosure').addEventListener('click', openModal);
  $('closureClose').addEventListener('click', closeModal);
  $('closureCancel').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('show')) closeModal(); });

  document.querySelectorAll('#closureScope .segment-button').forEach(b => b.addEventListener('click', () => {
    scope = b.dataset.scope;
    setSegment('closureScope', 'scope', scope);
    $('regionGroup').hidden = scope !== 'region';
    $('hubGroup').hidden = scope !== 'hub';
    updatePreview();
  }));
  $('closureHub').addEventListener('change', () => { updateHubClients(); updatePreview(); });
  document.querySelectorAll('#closureApplies .segment-button').forEach(b => b.addEventListener('click', () => {
    applies = b.dataset.applies;
    setSegment('closureApplies', 'applies', applies);
    updatePreview();
  }));
  ['closureFrom', 'closureTo', 'closureRegion'].forEach(id => $(id).addEventListener('change', updatePreview));

  $('closureForm').addEventListener('submit', e => {
    e.preventDefault();
    const fromV = $('closureFrom').value;
    const toV = $('closureTo').value;
    const reason = $('closureReason').value.trim();
    let dateMsg = '';
    if (!fromV || !toV) dateMsg = 'Choose a start and end date.';
    else if (parseDate(toV) < parseDate(fromV)) dateMsg = '"To" must be on or after "From".';
    $('dateError').textContent = dateMsg;
    $('dateError').hidden = !dateMsg;
    $('reasonError').hidden = !!reason;
    if (dateMsg || !reason) return;

    const appliesLabel = { procurement: 'Procurement', services: 'Services', both: 'Both' }[applies];
    const scopeLabel = scope === 'region' ? `Region: ${$('closureRegion').value}` : scope === 'hub' ? `Hub: ${selectedHub().name}` : 'Country';
    country.entries.push([fromV, toV, 'adhoc', reason, `${appliesLabel} · ${scopeLabel}`]);
    const savedFrom = parseDate(fromV);
    view = { year: savedFrom.getFullYear(), month: savedFrom.getMonth() };
    $('closureSaved').hidden = false;
    $('closureSavedText').textContent = `✓ Closure added for ${country.name}: ${reason} (${fmtShort(savedFrom)} – ${fmtShort(parseDate(toV))}). ${$('closurePreview').textContent.replace('⚠ ', '')}.`;
    closeModal();
    render();
  });

  render();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHolidays);
} else {
  initHolidays();
}
