// Seat ledger for seat-plan clients (Free, Support, Secure, Complete). A seat is one user plan in the subscription.
//   Initial seats   = seats bought at the start of the term (initial contract or renewal)
//   Total seats     = seats bought so far this term (initial + any added for new employees)
//   Active seats    = held by an active, onboarding (joining) or offboarding (leaving) user
//   Available seats = free to assign to a new user without an order
//   Used seats      = used twice, with both users offboarded: the seat can't be used again this term
//   Total = Active + Available + Used. Used seats are cleared at renewal.
// A joiner takes a seat as soon as they're added. With no seat available a subscription order goes to the client admin
// and the joiner can't be onboarded until it's approved. Each seat covers the plan's device limit (laptops and
// peripherals; loaners and devices being returned don't count); more devices need an upgrade order for the extra ones.
// Orders are one-off: monthly price × remaining days in the subscription year ÷ 30 (days capped at 360).
// Plan price per user: '-' when the seat (and devices) were already paid for (initial seats, a reused seat, or any seat
// after renewal); the order amount when this user's seat or upgrade was bought this term. Renewal resets all to '-'.
// Free plans add seats and devices at no charge, without orders. Expired subscriptions can only use available seats;
// restricted ones (expired past grace, or Free past renewal) can't add users.
// Needs hub-data.js, billing-data.js, subscription-data.js and people-data.js.

const SEATS_KEY = 'sap-seats-v1';
const SEAT_ORDERS_KEY = 'sap-seat-orders-v1';
const SEAT_STATUS = { active: ['Active', 'badge-success'], available: ['Available', 'badge-info'], used: ['Used', 'badge-neutral'] };
const SEAT_COUNTED = a => !['loaner', 'returning'].includes(a.status);
// Devices a person has, or will get from their joiner package
const personDevices = p => (p.state === 'joining' && p.joiner ? (JOINER_PACKAGES[p.joiner.pkg] || []).length : (p.assets || []).filter(SEAT_COUNTED).length);
const SEAT_ORDER_STATUS = { pending: ['Waiting for client admin', 'badge-warning'], approved: ['Approved', 'badge-success'], rejected: ['Rejected', 'badge-error'] };
// Seats used twice and released, per client at prototype start
const SEAT_USED_SEED = { digital: 2, mediaworks: 0, finance: 1, cloud: 3, brightpath: 1 };
const SEAT_FIRST = ['Alex', 'Jamie', 'Wei', 'Sam', 'Nur', 'Chris', 'Dana', 'Lee', 'Maya', 'Omar', 'Hana', 'Ravi', 'Tara', 'Ken', 'Ivy', 'Zoe', 'Ben', 'Lina', 'Raj', 'Mei'];
const SEAT_LAST = ['Tan', 'Lim', 'Ng', 'Wong', 'Patel', 'Garcia', 'Chen', 'Khan', 'Smith', 'Lee', 'Ong', 'Rahman', 'Brown', 'Ito', 'Silva', 'Koh', 'Reyes', 'Shah', 'Park', 'Hughes'];
const seatName = (client, n) => `${SEAT_FIRST[(n * 7 + client.length) % 20]} ${SEAT_LAST[(n * 3 + client.charCodeAt(0)) % 20]}`;

let SEATS = {};
let SEAT_ORDERS = [];
try {
  SEATS = JSON.parse(sessionStorage.getItem(SEATS_KEY) || '{}') || {};
  SEAT_ORDERS = JSON.parse(sessionStorage.getItem(SEAT_ORDERS_KEY) || 'null') || [];
} catch (e) { SEATS = {}; SEAT_ORDERS = []; }
const saveSeats = () => {
  sessionStorage.setItem(SEATS_KEY, JSON.stringify(SEATS));
  sessionStorage.setItem(SEAT_ORDERS_KEY, JSON.stringify(SEAT_ORDERS));
};

const seatHolder = s => s.uses.find(u => !u.to) || null;
const seatState = s => (seatHolder(s) ? 'active' : s.uses.length >= 2 ? 'used' : 'available');
const seatId = n => `S-${String(n).padStart(3, '0')}`;
const isSeatClient = id => { const k = CONTRACTS[id]; return !!(k && !isOnboarding(k) && isSeatPlan(k.tier) && k.terms.subscription); };
const seatPeriod = k => subPeriod(k.terms.subscription, SUB_TODAY);
const seatPeople = id => PEOPLE.filter(p => p.client === id);
const needsSeat = p => ['active', 'joining', 'leaving'].includes(p.state);

// Seats bought this term: blocks that have started. After expiry the last term's seats stay as they were.
function seatTotal(k) {
  const p = seatPeriod(k);
  if (p) return p.blocks.filter(b => b.from <= SUB_TODAY).reduce((n, b) => n + b.qty, 0);
  const sub = k.terms.subscription;
  const last = sub.next || sub;
  return last.blocks.reduce((n, b) => n + b.qty, 0);
}
const seatPeriodStart = k => { const p = seatPeriod(k); return p ? p.term.start : (k.terms.subscription.next || k.terms.subscription).term.start; };

// First build for a client: named people hold seats, generated users fill the rest of the active count
function seatBuild(id) {
  const k = CONTRACTS[id];
  const total = seatTotal(k);
  const start = seatPeriodStart(k);
  const used = Math.min(SEAT_USED_SEED[id] || 0, total);
  const named = seatPeople(id).filter(p => needsSeat(p) && p.state !== 'joining');
  const activeTarget = Math.max(named.length, Math.min(total - used, SUB_ACTIVE_USERS[id] ?? named.length));
  // SUB_ACTIVE_USERS counts users already on the platform; joiners come on top
  const seats = [];
  let n = 0;
  const left = seatPeople(id).filter(p => p.state === 'left');
  for (let i = 0; i < used; i++) {
    seats.push({ id: seatId(seats.length + 1), uses: [
      { name: seatName(id, ++n), from: start, to: addDays(start, 40 + i * 9) },
      { name: seatName(id, ++n), from: addDays(start, 45 + i * 9), to: addDays(start, 110 + i * 11) }] });
  }
  // Active and leaving people hold seats; joiners are seated (or ordered) by seatSync
  const holders = named.filter(p => p.state !== 'joining');
  const generated = activeTarget - holders.length;
  for (let i = 0; i < generated; i++) seats.push({ id: seatId(seats.length + 1), uses: [{ name: seatName(id, ++n), from: start }] });
  // One recycled seat: its first user left, so the current holder is its second use
  if (generated > 2) seats[seats.length - 2].uses.unshift({ name: seatName(id, ++n), from: start, to: addDays(start, 30) });
  holders.forEach(p => {
    if (seats.length >= total) return;
    seats.push({ id: seatId(seats.length + 1), extra: Math.max(0, personDevices(p) - subDeviceLimit(k.tier)), uses: [{ name: p.name, pid: p.id, from: start }] });
  });
  while (seats.length < total) seats.push({ id: seatId(seats.length + 1), uses: [] });
  // Someone who already left released a seat once
  left.forEach(p => { const s = seats.find(x => !x.uses.length); if (s) s.uses.push({ name: p.name, pid: p.id, from: start, to: p.end || SUB_TODAY }); });
  SEATS[id] = { periodStart: start, seats };
}

// At renewal: holders keep their seats (counted as a first use), used seats clear, the count follows the new term
function seatRenew(id) {
  const k = CONTRACTS[id];
  const led = SEATS[id];
  const total = seatTotal(k);
  const start = seatPeriodStart(k);
  const kept = led.seats.filter(s => seatHolder(s)).map(s => { const h = { ...seatHolder(s), from: start }; delete h.paid; return { id: s.id, extra: s.extra || 0, uses: [h] }; });
  const seats = kept.slice();
  let n = 1;
  const ids = new Set(seats.map(s => s.id));
  while (seats.length < total) { while (ids.has(seatId(n))) n++; ids.add(seatId(n)); seats.push({ id: seatId(n), uses: [] }); }
  seats.sort((a, b) => a.id.localeCompare(b.id));
  SEATS[id] = { periodStart: start, seats, renewedFrom: led.periodStart, cleared: led.seats.filter(s => seatState(s) === 'used').length };
}

const seatOfPerson = p => (SEATS[p.client] ? SEATS[p.client].seats.find(s => { const h = seatHolder(s); return h && h.pid === p.id; }) : null);
const seatOrdersFor = (id, status) => SEAT_ORDERS.filter(o => o.client === id && (!status || o.status === status));
// Latest order for a person (orders are appended, so the last one wins)
const seatOrderFor = p => SEAT_ORDERS.filter(o => o.pid === p.id).pop() || null;
let seatOrderNo = 1041;
const nextSeatOrderId = () => { while (SEAT_ORDERS.some(o => o.id === `SO-${seatOrderNo}`)) seatOrderNo++; return `SO-${seatOrderNo++}`; };

// Subscription order for a person: a seat and/or extra devices, quoted pro rata. Goes to the client admin.
function seatOrderCreate(p, { seat = true, devices = 0 } = {}, created = SUB_TODAY) {
  const k = CONTRACTS[p.client];
  const t = k.terms;
  const lines = [];
  if (seat) lines.push({ ...subQuote(t, 'seats', 1, created), kind: 'seat' });
  if (devices) lines.push({ ...subQuote(t, 'devices', devices, created), kind: 'devices' });
  const o = { id: nextSeatOrderId(), client: p.client, pid: p.id, name: p.name, seat, devices, lines, amount: Math.round(lines.reduce((n, l) => n + l.amount, 0) * 100) / 100, cur: subCurrency(t), status: 'pending', created, admin: clientAdminFor(k) };
  SEAT_ORDERS.push(o);
  return o;
}
const seatOrderLabel = o => [o.seat ? '1 seat' : '', o.devices ? `${o.devices} extra device${o.devices === 1 ? '' : 's'}` : ''].filter(Boolean).join(' + ') || `${o.qty} seats`;

// Add committed seats or devices to the live terms and to any newer draft or pending version so they aren't "removed"
function seatAddBlock(id, block, list = 'blocks') {
  const k = CONTRACTS[id];
  const add = sub => { sub[list] = sub[list] || []; sub[list].push({ ...block }); };
  add(k.terms.subscription);
  const activeV = activeVersion(k).v;
  k.versions.filter(v => v.v > activeV && (v.status === 'draft' || v.status === 'pending')).forEach(v => {
    if (v.terms && v.terms.subscription) add(v.terms.subscription);
    (v.changes || []).filter(ch => ch.path === 'subscription' && ch.toVal).forEach(ch => add(ch.toVal));
  });
  saveContracts();
}
const subNextDeviceId = sub => `d${Math.max(0, ...subDeviceBlocks(sub).map(d => Number(String(d.id).replace(/\D/g, '')) || 0)) + 1}`;

// Client admin decision. Approval commits the seat and/or devices from today, charged once at the quoted amount.
function seatOrderDecide(orderId, approve, reason = '') {
  const o = SEAT_ORDERS.find(x => x.id === orderId);
  if (!o || o.status !== 'pending') return null;
  const k = CONTRACTS[o.client];
  Object.assign(o, { status: approve ? 'approved' : 'rejected', decided: SUB_TODAY, by: o.admin || clientAdminFor(k), reason });
  if (approve) {
    const sub = k.terms.subscription;
    const p = personById(o.pid);
    const seatLine = o.lines.find(l => l.kind === 'seat');
    const devLine = o.lines.find(l => l.kind === 'devices');
    if (seatLine) {
      const block = { id: subNextBlockId(sub), qty: 1, price: subAddPrice(seatPeriod(k)), from: SUB_TODAY, charge: seatLine.amount, note: `Order ${o.id} · ${o.name}` };
      o.blockId = block.id;
      seatAddBlock(o.client, block);
      // Seat it now so the price stays with this user
      const led = SEATS[o.client];
      led.seats.push({ id: seatId(led.seats.length + 1), extra: 0, uses: [{ name: o.name, pid: o.pid, from: SUB_TODAY, paid: { order: o.id, seat: seatLine.amount, devices: 0, cur: o.cur } }] });
    }
    if (devLine) {
      const block = { id: subNextDeviceId(sub), qty: o.devices, price: devLine.monthly, from: SUB_TODAY, charge: devLine.amount, pid: o.pid, note: `Order ${o.id} · ${o.name}` };
      o.deviceBlockId = block.id;
      seatAddBlock(o.client, block, 'deviceBlocks');
      const seat = p && seatOfPerson(p);
      if (seat) {
        seat.extra = (seat.extra || 0) + o.devices;
        const h = seatHolder(seat);
        h.paid = h.paid || { order: o.id, seat: 0, devices: 0, cur: o.cur };
        h.paid.devices += devLine.amount;
      }
    }
  }
  seatSync(o.client);
  return o;
}

// Plan price shown for a person: '-' for a seat already paid for, else what their orders cost this term
function seatPriceOf(p) {
  const seat = seatOfPerson(p);
  const h = seat && seatHolder(seat);
  if (!h || !h.paid) return { text: '-', amount: 0 };
  const amount = Math.round((h.paid.seat + h.paid.devices) * 100) / 100;
  return { text: fmtAmount(h.paid.cur, amount), amount, paid: h.paid };
}
const extraNeeded = (p, seat, tier) => Math.max(0, personDevices(p) - subDeviceLimit(tier) - ((seat && seat.extra) || 0));

// Bring the ledger in line with people and the subscription
function seatSync(id) {
  if (!isSeatClient(id)) return;
  const k = CONTRACTS[id];
  if (!SEATS[id]) seatBuild(id);
  else if (SEATS[id].periodStart !== seatPeriodStart(k)) seatRenew(id);
  const led = SEATS[id];
  const total = seatTotal(k);
  let n = led.seats.length;
  while (led.seats.length < total) led.seats.push({ id: seatId(++n), uses: [] });
  const st = subStatus(k);
  const free = PLANS[k.tier].free;
  let again = false;
  seatPeople(id).forEach(p => {
    const seat = seatOfPerson(p);
    if (!needsSeat(p)) {
      if (seat) seatHolder(seat).to = p.end && p.end <= SUB_TODAY ? p.end : SUB_TODAY;
      return;
    }
    const pending = seatOrderFor(p) && seatOrderFor(p).status === 'pending' ? seatOrderFor(p) : null;
    if (seat) {
      // Devices above the seat's allowance need an upgrade (leavers keep what they have)
      const extra = p.state === 'leaving' ? 0 : extraNeeded(p, seat, k.tier);
      if (!extra || st.key === 'restricted' || st.key === 'expired') return;
      if (free) {
        seat.extra = (seat.extra || 0) + extra;
        seatAddBlock(id, { id: subNextDeviceId(k.terms.subscription), qty: extra, price: 0, from: SUB_TODAY, pid: p.id, note: `${p.name} · Free plan, no order` }, 'deviceBlocks');
        return;
      }
      if (pending && pending.devices === extra && !pending.seat) return;
      if (pending) Object.assign(pending, { status: 'rejected', decided: SUB_TODAY, reason: 'Replaced: device count changed' });
      const last = seatOrderFor(p);
      if (!pending && last && last.status === 'rejected' && last.devices === extra && last.reason !== 'Replaced: device count changed') return;
      seatOrderCreate(p, { seat: false, devices: extra });
      return;
    }
    if (st.key === 'restricted') return;
    const open = led.seats.find(s => seatState(s) === 'available');
    if (open) { open.uses.push({ name: p.name, pid: p.id, from: SUB_TODAY }); return seatSyncPersonDevices(); }
    if (free && st.key !== 'expired') {
      const sub = k.terms.subscription;
      seatAddBlock(id, { id: subNextBlockId(sub), qty: 1, price: 0, from: SUB_TODAY, note: `Added for ${p.name} · Free plan, no order` });
      led.seats.push({ id: seatId(led.seats.length + 1), extra: 0, uses: [{ name: p.name, pid: p.id, from: SUB_TODAY }] });
      return seatSyncPersonDevices();
    }
    if (st.key === 'expired') return;
    const devices = extraNeeded(p, null, k.tier);
    if (pending && pending.seat && pending.devices === devices) return;
    if (pending) Object.assign(pending, { status: 'rejected', decided: SUB_TODAY, reason: 'Replaced: device count changed' });
    const last = seatOrderFor(p);
    if (!pending && last && last.status === 'rejected' && last.reason !== 'Replaced: device count changed') return;
    seatOrderCreate(p, { seat: true, devices });
  });
  // A seat just taken may still need devices: run once more for those people
  function seatSyncPersonDevices() { again = true; }
  // Orders for people who no longer need them are dropped
  SEAT_ORDERS.filter(o => o.client === id && o.status === 'pending').forEach(o => {
    const p = personById(o.pid);
    if (!p || !needsSeat(p) || (o.seat && seatOfPerson(p))) Object.assign(o, { status: 'rejected', decided: SUB_TODAY, reason: 'No longer needed' });
  });
  saveSeats();
  if (again) seatSync(id);
}

// Counts for the Plan & seats tab and lists
function seatCounts(id) {
  const k = CONTRACTS[id];
  if (!isSeatClient(id) || !SEATS[id]) return null;
  const led = SEATS[id];
  const p = seatPeriod(k);
  const by = st => led.seats.filter(s => seatState(s) === st).length;
  const initial = p ? p.blocks.filter(b => b.from === p.term.start).reduce((n, b) => n + b.qty, 0) : (k.terms.subscription.next || k.terms.subscription).blocks.filter(b => b.from === seatPeriodStart(k)).reduce((n, b) => n + b.qty, 0);
  const c = { initial, total: led.seats.length, active: by('active'), available: by('available'), used: by('used'), pending: seatOrdersFor(id, 'pending').length };
  c.added = c.total - c.initial;
  c.ok = c.total === c.active + c.available + c.used;
  return c;
}

// What a joiner's onboarding is waiting for. null = no seat plan (nothing to check).
function joinerSeat(p) {
  if (!isSeatClient(p.client)) return null;
  const k = CONTRACTS[p.client];
  const seat = seatOfPerson(p);
  const o = seatOrderFor(p);
  const lim = subDeviceLimit(k.tier);
  const st = subStatus(k);
  const price = seatPriceOf(p);
  if (seat) {
    const extra = p.state === 'leaving' ? 0 : extraNeeded(p, seat, k.tier);
    const allowance = lim + (seat.extra || 0);
    const base = { seat, price, devices: personDevices(p), allowance };
    if (!extra) return { ...base, key: 'seat', ok: true, text: `Seat ${seat.id}` };
    if (o && o.status === 'pending' && !o.seat) return { ...base, key: 'pending', order: o, ok: false, text: `Upgrade ${o.id} pending`, detail: `${personDevices(p)} devices on a ${allowance}-device allowance. Upgrade order ${o.id} for ${seatOrderLabel(o)} (${fmtAmount(o.cur, o.amount)}, one-off) is waiting for ${o.admin} to approve.` };
    if (o && o.status === 'rejected' && !o.seat) return { ...base, key: 'rejected', order: o, ok: false, text: `Upgrade ${o.id} rejected`, detail: `${o.by} rejected upgrade order ${o.id}${o.reason ? ` (${o.reason})` : ''}. Pick a package within ${allowance} device${allowance === 1 ? '' : 's'} or order the upgrade again.` };
    return { ...base, key: 'blocked', ok: false, text: 'Over device limit', detail: `${personDevices(p)} devices on a ${allowance}-device allowance, and upgrades can’t be ordered while the subscription is ${st.label.toLowerCase()}.` };
  }
  if (st.key === 'restricted') return { key: 'blocked', ok: false, text: 'Subscription restricted', detail: `${st.text}. Renew the subscription to add users.` };
  if (st.key === 'expired' && (!o || o.status !== 'pending')) return { key: 'blocked', ok: false, text: 'No seat · subscription expired', detail: 'No seats are available and seats can’t be ordered while the subscription is expired. Renew it first.' };
  if (o && o.status === 'pending') return { key: 'pending', order: o, ok: false, text: `Seat order ${o.id} pending`, detail: `No seats available. Subscription order ${o.id} for ${seatOrderLabel(o)} (${fmtAmount(o.cur, o.amount)}, one-off to ${billingDateSub(o.lines[0].yearEnd)}) is waiting for ${o.admin} to approve.` };
  if (o && o.status === 'rejected') return { key: 'rejected', order: o, ok: false, text: `Seat order ${o.id} rejected`, detail: `${o.by} rejected subscription order ${o.id}${o.reason ? ` (${o.reason})` : ''}. The joiner can’t be onboarded without a seat.` };
  return { key: 'blocked', ok: false, text: 'No seat', detail: 'No seat available.' };
}

// Request another seat after a rejection
function seatOrderRetry(p) {
  const k = CONTRACTS[p.client];
  const seat = seatOfPerson(p);
  const o = seatOrderCreate(p, { seat: !seat, devices: extraNeeded(p, seat, k.tier) });
  saveSeats();
  return o;
}

// Seed history: Digital Solutions' 10 seats from 1 Sep came through an approved order. MediaWorks is full, so its
// joiner gets a pending order on first sync.
if (!sessionStorage.getItem(SEAT_ORDERS_KEY) && CONTRACTS.digital && CONTRACTS.digital.terms.subscription) {
  const cur = subCurrency(CONTRACTS.digital.terms);
  const days = Math.min(360, dayCount('2026-09-01', '2027-06-19'));
  const amount = Math.round(10 * 40 * days / 30 * 100) / 100;
  SEAT_ORDERS.push({ id: 'SO-1032', client: 'digital', pid: null, name: 'UK hires', seat: false, devices: 0, qty: 10, lines: [{ kind: 'seat', qty: 10, monthly: 40, days, amount, yearEnd: '2027-06-19' }], amount, cur, status: 'approved', created: '2026-08-27', decided: '2026-08-28', by: clientAdminFor(CONTRACTS.digital), admin: clientAdminFor(CONTRACTS.digital), blockId: 'b2' });
}
Object.keys(CONTRACTS).forEach(seatSync);
