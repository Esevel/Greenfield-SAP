// SLA command centre: owner dropdowns and row side panel

const SLA_OWNERS = ['Qonit', 'Marcus', 'Jia Ling', 'Aisha', 'Ben'];

const SLA_DETAILS = {
  'OFF-2055': {
    target: '48h (Scheduled → Picked up)', started: '12 Oct, 09:00', due: '14 Oct, 09:00', elapsed: '3d 4h',
    blocker: { title: 'Awaiting courier', detail: 'DHL missed pickup on 13 Oct and 14 Oct. Recipient has moved out of the office.', since: 'Since 13 Oct · owner: Courier' },
    notes: [
      ['Qonit', 'Today, 10:12', 'DHL missed second pickup window, escalated to account manager'],
      ['Ben', 'Yesterday, 18:40', 'Recipient confirmed device is with building reception until Friday'],
      ['Qonit', '13 Oct, 16:05', 'First pickup missed, rebooked for tomorrow AM']
    ]
  },
  'REP-0871': {
    target: '5 days (vendor repair)', started: '9 Oct, 14:00', due: '14 Oct, 14:00', elapsed: '5d 9h',
    blocker: { title: 'Awaiting part', detail: 'Logic board back-ordered at Dell. Vendor ETA Friday 16 Oct.', since: 'Since 11 Oct · owner: Vendor' },
    notes: [
      ['Jia Ling', 'Today, 08:30', 'Logic board back-ordered, vendor ETA Friday. Loaner sent.'],
      ['Marcus', '11 Oct, 11:15', 'Vendor diagnosis: board fault, not covered by accidental damage']
    ]
  },
  'ORD-30398': {
    target: '3 days (customs clearance)', started: '12 Oct, 07:00', due: '15 Oct, 07:00', elapsed: '3d 2h',
    blocker: { title: 'Missing import permit', detail: 'Malaysian customs requires SIRIM permit for the wireless keyboard in this order.', since: 'Since 13 Oct · owner: Esevel Ops' },
    notes: [
      ['Aisha', 'Today, 09:05', 'Broker needs commercial invoice re-issued with HS codes'],
      ['Aisha', '13 Oct, 15:20', 'Shipment held at KLIA, broker contacted']
    ]
  },
  'ONB-1182': {
    target: '4 days (device prep)', started: '12 Oct, 09:00', due: '16 Oct, 11:00', elapsed: '2d 22h',
    blocker: { title: 'Awaiting client approval', detail: 'New hire requested 16" model instead of the standard 14". Needs client admin sign-off.', since: 'Since 13 Oct · owner: Client Admin' },
    notes: [
      ['Marcus', 'Today, 11:40', 'Chased client admin twice for spec sign-off on the 16" upgrade'],
      ['Marcus', '13 Oct, 10:00', 'Request received via HRIS, start date 20 Oct']
    ]
  },
  'SUP-5521': {
    target: '4 days (resolution)', started: '13 Oct, 08:00', due: '16 Oct, 16:00', elapsed: '1d 7h',
    blocker: null,
    notes: [
      ['Qonit', 'Today, 12:20', 'VPN profile reissued, waiting on user to confirm it connects']
    ]
  },
  'OFF-2044': {
    target: '4 days (in transit)', started: '12 Oct, 13:00', due: '17 Oct, 00:00', elapsed: '2d 1h',
    blocker: null,
    notes: [
      ['Jia Ling', 'Today, 07:50', 'Tracking stalled at Memphis hub, opened trace with FedEx'],
      ['Ben', '12 Oct, 13:10', 'Picked up from recipient, 1 laptop + charger']
    ]
  },
  'RED-0311': {
    target: '4 days (QC and wipe)', started: '12 Oct, 16:00', due: '17 Oct, 07:00', elapsed: '1d 18h',
    blocker: null,
    notes: [
      ['Aisha', 'Today, 09:45', 'Wipe certificate generated, QC bench slot tomorrow AM']
    ]
  },
  'ORD-30455': {
    target: '4 days (fulfilment)', started: '14 Oct, 15:00', due: '18 Oct, 15:00', elapsed: '22h',
    blocker: null,
    notes: [
      ['Marcus', 'Today, 10:30', 'Allocated from SG Hub return pool (C02WR9T6MD6T)']
    ]
  },
  'REP-0874': {
    target: '5 days (diagnosis)', started: '14 Oct, 13:00', due: '19 Oct, 13:00', elapsed: '1d',
    blocker: null,
    notes: [
      ['Jia Ling', 'Today, 13:00', 'Booked with FixPoint London, drop-off Thursday']
    ]
  },
  'ONB-1190': {
    target: '6 days (shipping kit)', started: '14 Oct, 09:00', due: '20 Oct, 17:00', elapsed: '18h',
    blocker: null,
    notes: [
      ['Qonit', 'Today, 08:15', 'Kit packed, courier label created for Monday']
    ]
  }
};

function initials(name) {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

function initSlaCommandCentre() {
  const panel = document.getElementById('slaPanel');
  const overlay = document.getElementById('slaPanelOverlay');
  const rows = document.querySelectorAll('.sla-table tbody tr');
  let current = null;

  // Owner dropdowns
  document.querySelectorAll('.owner-dropdown').forEach(select => {
    SLA_OWNERS.forEach(name => {
      const opt = document.createElement('option');
      opt.textContent = name;
      opt.selected = name === select.dataset.owner;
      select.appendChild(opt);
    });
    const avatar = select.previousElementSibling;
    avatar.textContent = initials(select.value);
    select.addEventListener('click', e => e.stopPropagation());
    select.addEventListener('change', () => {
      avatar.textContent = initials(select.value);
    });
  });

  function noteEl(author, time, text) {
    const item = document.createElement('div');
    item.className = 'handover-item';
    const av = document.createElement('div');
    av.className = 'card-avatar';
    av.textContent = initials(author);
    const body = document.createElement('div');
    const head = document.createElement('div');
    head.className = 'activity-header';
    const who = document.createElement('strong');
    who.textContent = author;
    const when = document.createElement('span');
    when.className = 'activity-time';
    when.textContent = time;
    head.append(who, when);
    const msg = document.createElement('div');
    msg.className = 'activity-message';
    msg.textContent = text;
    body.append(head, msg);
    item.append(av, body);
    return item;
  }

  function fill(row) {
    current = row;
    const id = row.dataset.id;
    const d = SLA_DETAILS[id];
    const label = row.querySelector('.runway-label');
    const fillBar = row.querySelector('.runway-fill');

    document.getElementById('slaTitle').textContent = `${id} · ${row.cells[1].textContent}`;
    document.getElementById('slaMeta').textContent =
      `${row.querySelector('.type-icon').dataset.tooltip} · ${row.cells[3].textContent} · Owner ${row.querySelector('.owner-dropdown').value}`;

    const big = document.getElementById('slaRunwayBig');
    big.textContent = label.textContent;
    big.className = 'runway-big ' + [...label.classList].filter(c => c !== 'runway-label').join(' ');
    const panelFill = document.getElementById('slaRunwayFill');
    panelFill.className = fillBar.className;
    panelFill.style.width = fillBar.style.width;

    document.getElementById('slaTarget').textContent = d.target;
    document.getElementById('slaStarted').textContent = d.started;
    document.getElementById('slaDue').textContent = d.due;
    document.getElementById('slaElapsed').textContent = d.elapsed;

    const blocker = document.getElementById('slaBlocker');
    blocker.innerHTML = '';
    if (d.blocker) {
      const card = document.createElement('div');
      card.className = 'blocker-card';
      const title = document.createElement('div');
      title.className = 'blocker-card-title';
      title.textContent = `⛔ ${d.blocker.title}`;
      const detail = document.createElement('div');
      detail.textContent = d.blocker.detail;
      const since = document.createElement('div');
      since.className = 'readonly-note';
      since.textContent = d.blocker.since;
      card.append(title, detail, since);
      blocker.appendChild(card);
    } else {
      const none = document.createElement('div');
      none.className = 'no-blocker';
      none.textContent = 'No blocker';
      blocker.appendChild(none);
    }

    const feed = document.getElementById('slaNotes');
    feed.innerHTML = '';
    d.notes.forEach(([a, t, x]) => feed.appendChild(noteEl(a, t, x)));
  }

  function open(row) {
    rows.forEach(r => r.classList.remove('selected'));
    row.classList.add('selected');
    fill(row);
    panel.classList.add('open');
    overlay.classList.add('show');
  }

  function close() {
    panel.classList.remove('open');
    overlay.classList.remove('show');
    rows.forEach(r => r.classList.remove('selected'));
  }

  rows.forEach(row => row.addEventListener('click', () => open(row)));
  document.getElementById('closeSlaPanel').addEventListener('click', close);
  overlay.addEventListener('click', close);

  // Add note: prepend to the feed and update the row's preview
  document.getElementById('slaAddNote').addEventListener('click', () => {
    const input = document.getElementById('slaNoteInput');
    const text = input.value.trim();
    if (!text || !current) return;
    const author = 'You';
    SLA_DETAILS[current.dataset.id].notes.unshift([author, 'Just now', text]);
    document.getElementById('slaNotes').prepend(noteEl(author, 'Just now', text));

    const preview = current.querySelector('.note-preview');
    preview.innerHTML = '';
    const who = document.createElement('strong');
    who.textContent = `${author}:`;
    preview.append(who, ` ${text}`);
    input.value = '';
  });

  // Prototype shows the panel open for the top row on load
  fill(document.querySelector('.sla-table tbody tr.selected'));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSlaCommandCentre);
} else {
  initSlaCommandCentre();
}
