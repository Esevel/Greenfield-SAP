// Billable users: monthly billable roster per client. A user counts once in a month if they held an Assigned laptop
// at any point in it, however many devices. No proration. A laptop away for repair still counts (once); loaners never add a charge.
// Each user bills to the entity in their work country (else the parent), at that entity's rate and currency.
// Needs hub-data.js, billing-data.js, supply-data.js, stock-data.js and people-data.js. Used on the client page (Billable users).

const MU_MONTHS = ['2026-10', '2026-09', '2026-08', '2026-07'];
const MU_LOCKED = { '2026-09': '2026-10-01 00:10', '2026-08': '2026-09-01 00:10', '2026-07': '2026-08-01 00:10' };
const MU_EXCLUDE_REASON = { peripheral: 'Peripheral only', none: 'No Assigned laptop' };
const MU_SEATS = { acme: 152, techglobal: 410, mediaworks: 70, northwind: 95, cloud: 80, digital: 0, finance: 0, brightpath: 0 };
// Same order as MU_MONTHS (newest first)
const MU_BILLABLE = { acme: [144, 142, 140, 138], techglobal: [397, 398, 396, 393], mediaworks: [63, 61, 61, 60], northwind: [90, 88, 86, 84], cloud: [73, 74, 74, 72] };

const muMonthLabel = m => { const [y, mo] = m.split('-').map(Number); return new Date(y, mo - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }); };
const muMonthEnd = m => { const [y, mo] = m.split('-').map(Number); const d = new Date(y, mo, 0); return `${m}-${String(d.getDate()).padStart(2, '0')}`; };


const MU_FIRST = ['Alex', 'Jamie', 'Priya', 'Wei', 'Sam', 'Nur', 'Chris', 'Dana', 'Lee', 'Maya', 'Omar', 'Hana', 'Ravi', 'Tara', 'Ken', 'Ivy', 'Zoe', 'Ben', 'Lina', 'Raj'];
const MU_LAST = ['Tan', 'Lim', 'Ng', 'Wong', 'Patel', 'Garcia', 'Chen', 'Khan', 'Smith', 'Lee', 'Ong', 'Rahman', 'Brown', 'Ito', 'Silva', 'Nair', 'Koh', 'Reyes', 'Shah', 'Park'];
const MU_MODELS = { SG: ['MacBook Pro 14" M3', 'C02XK'], US: ['Dell XPS 15', '8HJ2'], AU: ['Lenovo ThinkPad X1 Carbon', 'PF3Q'], GB: ['MacBook Air 13" M2', 'FVFHG'], MY: ['MacBook Air 13" M2', 'FVFHM'] };

// Roster for a client and month: named People records first, then generated users up to the billable count
function muRoster(clientId, month) {
  const k = CONTRACTS[clientId];
  const mi = MU_MONTHS.indexOf(month);
  const target = (MU_BILLABLE[clientId] || [0, 0, 0, 0])[mi];
  const start = `${month}-01`;
  const end = muMonthEnd(month);
  const clip = s => (s < start ? start : s);
  const billable = [];
  const excluded = [];

  const cap = month === '2026-10' ? PEOPLE_TODAY : end;
  PEOPLE.filter(p => p.client === clientId).forEach(p => {
    const laptops = p.assets.filter(a => a.type === 'laptop');
    const loaner = laptops.find(a => a.status === 'loaner');
    // Assigned in the month; in repair (still the user's laptop); or a returning device whose `since` (left Assigned) is inside the month
    const qualifying = laptops.filter(a => (a.status === 'assigned' && a.since <= end) || a.status === 'repair' || (a.status === 'returning' && a.since > start))
      .sort((a, b) => (b.status === 'assigned') - (a.status === 'assigned'));
    const leftBefore = p.end && p.end < start;
    if (leftBefore || (p.state === 'joining' && p.start > end)) return;
    const entity = payingEntity(k.terms, p.cc).entity;
    if (qualifying.length) {
      const a = qualifying[0];
      const spanEnd = p.end && p.end < cap ? p.end : cap;
      const other = laptops.find(x => x !== a && qualifying.includes(x));
      const note = a.status === 'repair' ? `${a.serial} in repair since ${peopleFmt(a.since)}${loaner ? `; loaner ${loaner.serial} not counted` : ''}. Counted once`
        : other ? `Replaced ${other.serial} on ${peopleFmt(a.since)}. Counted once` : '';
      billable.push({ person: p, name: p.name, entity, device: a, from: a.status === 'assigned' && !other ? clip(a.since) : start, to: spanEnd, note });
    } else if (laptops.length) {
      const d = loaner || laptops[0];
      excluded.push({ person: p, name: p.name, reason: 'none', detail: loaner ? `Only a loaner (${loaner.serial}); loaners never count` : `${d.serial} is ${DEVICE_STATUS[d.status][0].toLowerCase()}` });
    } else if (p.assets.length) {
      excluded.push({ person: p, name: p.name, reason: 'peripheral', detail: p.assets.map(a => a.name).join(', ') });
    }
  });

  // Generated users fill each entity's share of the billable count, deterministic per client
  const split = muEntitySplit(clientId, target);
  const seed = clientId.length * 7;
  let i = billable.length;
  k.terms.entities.forEach(ent => {
    const want = split[ent.id] - billable.filter(b => b.entity.id === ent.id).length;
    const [model, prefix] = MU_MODELS[ent.country] || MU_MODELS.US;
    for (let j = 0; j < want; j++, i++) {
      const n = seed + i;
      const joinedMid = mi === 0 && !ent.parent && j === want - 1;
      billable.push({ name: `${MU_FIRST[n % 20]} ${MU_LAST[(n * 3) % 20]}`, entity: ent, device: { name: model, serial: `${prefix}${String(5000 + n * 13).padStart(5, '0')}` }, from: joinedMid ? '2026-10-12' : start, to: cap, note: joinedMid ? 'Joined mid-month · counted for the full month' : '' });
    }
  });
  if (target) {
    excluded.push({ name: `${MU_FIRST[(seed + 3) % 20]} ${MU_LAST[(seed + 5) % 20]}`, reason: 'peripheral', detail: 'Monitor and keyboard only (shared desk)' });
    excluded.push({ name: `${MU_FIRST[(seed + 8) % 20]} ${MU_LAST[(seed + 1) % 20]}`, reason: 'none', detail: 'Laptop in stock awaiting deployment (not Assigned)' });
  }
  return { billable, excluded, locked: MU_LOCKED[month] || '', snapshotId: `MU-${clientId.toUpperCase().slice(0, 4)}-${month}` };
}

// Monthly charge per billing entity: users × that entity's rate, in its currency
function muBill(clientId, roster) {
  return CONTRACTS[clientId].terms.entities.map(ent => {
    const users = roster.billable.filter(b => b.entity.id === ent.id).length;
    return { entity: ent, users, rate: ent.muRate, cur: ent.currency, amount: Math.round(users * ent.muRate * 100) / 100 };
  }).filter(r => r.users || !r.entity.parent);
}

// Seat audit: active seats (contracted) vs billable per month, with why the count moved
const MU_CHANGES = {
  techglobal: [
    { month: '2026-10', at: '2026-10-11', change: 0, why: 'Sarah Kim laptop replaced; counted once however many laptops she held' },
    { month: '2026-10', at: '2026-10-07', change: -1, why: 'Leaver device returned (Kevin Brooks moved to CloudSystems record)' },
    { month: '2026-09', at: '2026-09-22', change: +2, why: '2 joiners delivered (ONB-1160, ONB-1161)' },
    { month: '2026-08', at: '2026-08-15', change: +3, why: 'APAC entity onboarding wave' }
  ],
  acme: [
    { month: '2026-10', at: '2026-10-16', change: +2, why: 'Sophie Tan and 1 other joiner delivered (ONB-1186)' },
    { month: '2026-09', at: '2026-09-28', change: -1, why: 'Daniel Ho device returned (OFF-2031)' },
    { month: '2026-09', at: '2026-09-10', change: +3, why: 'Engineering hires delivered' },
    { month: '2026-08', at: '2026-08-04', change: +2, why: 'Joiners delivered' }
  ],
  northwind: [
    { month: '2026-10', at: '2026-10-14', change: +2, why: 'Ryan Cooper and clinics joiner delivered' },
    { month: '2026-09', at: '2026-09-19', change: +2, why: 'Clinics LLC entity added (contract v3)' }
  ],
  mediaworks: [
    { month: '2026-10', at: '2026-10-15', change: +2, why: 'Arjun Mehta delivered; Leo Tan still holding laptop until return' },
    { month: '2026-09', at: '2026-09-02', change: 0, why: '6 leavers still holding laptops on 31 Aug kept the count at 61 (DIS-0030 rejected)' }
  ],
  cloud: [
    { month: '2026-10', at: '2026-10-01', change: 0, why: 'Nathan Ong laptop in repair since 28 Sep; still counted once, his loaner adds nothing' },
    { month: '2026-09', at: '2026-09-14', change: 0, why: 'Contract expired 30 Sep; billing continues on v1 terms pending renewal' }
  ]
};
