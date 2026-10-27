// Seat subscriptions for Free, Support, Secure and Complete (Enterprise has none and stays event-based).
// A subscription is a term (start → end) with seat blocks { qty, price per seat per month, from } and extra-device
// blocks { qty, price per device per month, from, pid }. Blocks are committed until the term ends: they can't be removed,
// reduced or repriced lower. A renewal (sub.next) sets the following term and is the only place seats can go down.
// Billing, in the bill-to entity's currency:
//   - each subscription year (12 months from the term start) is billed in advance: committed seats, add-ons and extra
//     devices × monthly price × 12
//   - seats or devices added mid-year are charged once: monthly price × remaining days in the subscription year ÷ 30,
//     with days capped at 360, so one seat never costs more than 12 months
// Staff can agree a total annual fee (sub.agreedTotal) that replaces the calculated seats + add-ons + devices amount
// for the subscription year; mid-year orders still use the per-seat rates. Free plans charge nothing.
// Needs hub-data.js and billing-data.js.

const SUB_TODAY = BILLING_TODAY;
// Users already on the platform when the seat ledger was set up (prototype snapshot). Also the default seat count for a
// new subscription. Each active, onboarding or offboarding user holds one seat (see seats-data.js).
const SUB_ACTIVE_USERS = { digital: 36, mediaworks: 70, finance: 21, cloud: 72, brightpath: 27 };
const SUB_MONTH = SUB_TODAY.slice(0, 7);
// Days before term end when a renewal is flagged; paid plans keep working this many days after expiry, then restrict
const SUB_RENEW_WARN_DAYS = 90;
const SUB_GRACE_DAYS = 30;
const prevMonth = m => { const [y, mo] = m.split('-').map(Number); return mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, '0')}`; };
const nextMonth = m => { const [y, mo] = m.split('-').map(Number); return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`; };

// Feature matrix per plan (Free, Support, Secure, Complete). true = included, 'addon' = paid add-on, false = not available.
// Enterprise: per contract.
const PLAN_FEATURES = [
  ['Device Procurement Services', [
    ['Webstore Access', true, true, true, true], ['Catalogue Creation', true, true, true, true], ['Order Tracking', true, true, true, true]]],
  ['Inventory & Device Management', [
    ['Inventory Tracking & Management', true, true, true, true], ['Device Lifecycle Management', false, true, true, true],
    ['Device Lifecycle Management Notifications', false, false, true, true], ['Last Mile Services', false, true, true, true],
    ['Device Management', false, false, true, true], ['Multi-Factor Authentication', false, false, 'addon', true]]],
  ['Team Management', [
    ['Employee Record Tracking', false, false, true, true], ['Employee Onboarding', false, false, true, true], ['Employee Off-boarding', false, false, true, true],
    ['Employee Stipend Tracking', true, true, true, true], ['Applications Single Sign-On', false, false, true, true]]],
  ['Local Device Support', [
    ['Device Setup', false, true, false, true], ['General Support', false, true, true, true], ['Hardware Support', false, true, false, true],
    ['Software Support', false, 'addon', 'addon', true], ['Warranty Check', false, true, false, true], ['Device Management Support', false, false, true, true],
    ['Onboarding Support', false, false, true, true], ['Off-boarding Support', false, false, true, true], ['Repair Handling', false, true, false, true],
    ['Loaner Device Service', false, true, false, true], ['Slack Integration - Support', false, true, true, true]]],
  ['Organisation Configurations', [
    ['Add Multiple Billing Entities', true, true, true, true], ['Google Sign-In to Platform', true, true, true, true]]]
];

const isoDay = s => new Date(`${s}T00:00:00Z`);
const isoOf = d => d.toISOString().slice(0, 10);
const addDays = (s, n) => { const d = isoDay(s); d.setUTCDate(d.getUTCDate() + n); return isoOf(d); };
const addMonthsIso = (s, n) => { const d = isoDay(s); d.setUTCMonth(d.getUTCMonth() + n); return isoOf(d); };
const monthEndIso = m => { const [y, mo] = m.split('-').map(Number); return isoOf(new Date(Date.UTC(y, mo, 0))); };
const monthLabelOf = m => { const [y, mo] = m.split('-').map(Number); return new Date(y, mo - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }); };
const dayCount = (a, b) => Math.round((isoDay(b) - isoDay(a)) / 864e5) + 1;
const firstOfNextMonth = (s = SUB_TODAY) => { const d = isoDay(s); return isoOf(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))); };

const subCurrency = t => (entityById(t, t.subscription.billTo) || parentEntity(t)).currency;
const subAddonOf = key => PLAN_ADDONS[key];
const addonAvailability = (tier, key) => (PLAN_ADDONS[key].plans[tier] || false);

// The term in force on a date: current, the agreed renewal (next), or an automatic renewal on the same seats
function subPeriod(sub, onDate = SUB_TODAY) {
  if (!sub) return null;
  if (onDate >= sub.term.start && onDate <= sub.term.end) return { ...sub, kind: 'current' };
  if (onDate > sub.term.end && sub.next && onDate >= sub.next.term.start && onDate <= sub.next.term.end) return { ...sub, ...sub.next, kind: 'renewal' };
  if (onDate > sub.term.end && !sub.next && sub.autoRenew) {
    const start = addDays(sub.term.end, 1);
    const end = addDays(addMonthsIso(start, 12), -1);
    const seats = sub.blocks.reduce((n, b) => n + b.qty, 0);
    const last = sub.blocks[sub.blocks.length - 1];
    return { ...sub, term: { start, end }, blocks: [{ id: 'auto', qty: seats, price: last.price, from: start, note: 'Auto-renewed' }], addOns: sub.addOns.map(a => ({ ...a, from: start })), deviceBlocks: subDeviceBlocks(sub).length ? [{ id: 'autod', qty: subDeviceBlocks(sub).reduce((n, d) => n + d.qty, 0), price: subDeviceBlocks(sub).slice(-1)[0].price, from: start, note: 'Auto-renewed' }] : [], kind: 'auto' };
  }
  return null;
}

// Committed seats on a date (blocks that have started)
const subSeatsAt = (sub, onDate) => (subPeriod(sub, onDate) ? subPeriod(sub, onDate).blocks.filter(b => b.from <= onDate).reduce((n, b) => n + b.qty, 0) : 0);

// The subscription year containing a date: 12-month steps from the period start, cut at the period end
function subYear(p, onDate = SUB_TODAY) {
  let start = p.term.start;
  while (addMonthsIso(start, 12) <= onDate) start = addMonthsIso(start, 12);
  const end = [addDays(addMonthsIso(start, 12), -1), p.term.end].sort()[0];
  return { start, end };
}
const subYearStarts = p => { const out = []; for (let s = p.term.start; s <= p.term.end; s = addMonthsIso(s, 12)) out.push(s); return out; };
const isYearStart = (p, d) => subYearStarts(p).includes(d);

// Days charged for something added on a date: what's left of the subscription year, at most 360
function subProrataDays(p, onDate = SUB_TODAY) { return Math.min(360, dayCount(onDate, subYear(p, onDate).end)); }
const subProrata = (monthly, days) => Math.round((monthly * days / 30) * 100) / 100;
const subAddonMonthly = (p, onDate) => p.addOns.filter(a => a.from <= onDate).reduce((n, a) => n + a.price, 0);
// Live terms keep the plan on the contract (k.tier); version terms carry their own
const tierOf = t => t.tier || (Object.values(CONTRACTS).find(k => k.terms === t) || {}).tier;
const subDevicePrice = (t, sub = t.subscription) => (sub.devicePrice ?? planListPrice(PLANS[tierOf(t)].deviceUSD || 0, subCurrency(t)));
const subDeviceLimit = tier => (PLANS[tier] && PLANS[tier].devices) || 0;
const subDeviceBlocks = sub => sub.deviceBlocks || [];

// One-off price for seats or extra devices added on a date (what an order quotes)
function subQuote(t, kind, qty, onDate = SUB_TODAY) {
  const p = subPeriod(t.subscription, onDate);
  if (!p) return null;
  const free = !!PLANS[tierOf(t)].free;
  const monthly = free ? 0 : kind === 'devices' ? subDevicePrice(t, p) : subAddPrice(p) + subAddonMonthly(p, onDate);
  const days = subProrataDays(p, onDate);
  const year = subYear(p, onDate);
  return { kind, qty, monthly, days, amount: Math.round(qty * subProrata(monthly, days) * 100) / 100, yearEnd: year.end, cur: subCurrency(t),
    basis: `${qty} × ${fmtAmount(subCurrency(t), monthly)} / month × ${days} days ÷ 30${days === 360 ? ' (capped at 360)' : ''} · to ${billingDateSub(year.end)} ${year.end.slice(0, 4)}` };
}

// Annual fee for a year: committed seats, add-ons and extra devices that have started by its first day, × 12
function subYearLines(t, yearStart) {
  const sub = t.subscription;
  const p = sub && subPeriod(sub, yearStart);
  if (!p || PLANS[tierOf(t)].free || !isYearStart(p, yearStart)) return [];
  const cur = subCurrency(t);
  const year = subYear(p, yearStart);
  const lines = [];
  const seats = p.blocks.filter(b => b.from <= yearStart);
  seats.forEach(b => lines.push({ key: `seats:${b.id}:${yearStart}`, qty: b.qty, unit: b.price * 12, amount: Math.round(b.qty * b.price * 12 * 100) / 100,
    label: `${tierOf(t)} seats`, desc: `${b.qty} seat${b.qty === 1 ? '' : 's'} · ${tierOf(t)}${b.note ? ` · ${b.note}` : ''}`, basis: `${b.qty} × ${fmtAmount(cur, b.price)} / month × 12 · ${billingDateSub(year.start)} – ${billingDateSub(year.end)} ${year.end.slice(0, 4)}, in advance` }));
  const n = seats.reduce((x, b) => x + b.qty, 0);
  p.addOns.filter(a => a.from <= yearStart).forEach(a => lines.push({ key: `addon:${a.key}:${yearStart}`, qty: n, unit: a.price * 12, amount: Math.round(n * a.price * 12 * 100) / 100,
    label: subAddonOf(a.key).label, desc: `${subAddonOf(a.key).label} · ${n} seats`, basis: `${n} × ${fmtAmount(cur, a.price)} / month × 12, in advance` }));
  subDeviceBlocks(p).filter(d => d.from <= yearStart).forEach(d => lines.push({ key: `devices:${d.id}:${yearStart}`, qty: d.qty, unit: d.price * 12, amount: Math.round(d.qty * d.price * 12 * 100) / 100,
    label: 'Extra devices', desc: `${d.qty} extra device${d.qty === 1 ? '' : 's'}${d.note ? ` · ${d.note}` : ''}`, basis: `${d.qty} × ${fmtAmount(cur, d.price)} / month × 12, in advance` }));
  // An agreed total replaces the calculated lines with one annual fee
  if (p.agreedTotal != null) {
    const calc = Math.round(lines.reduce((x, l) => x + l.amount, 0) * 100) / 100;
    return [{ key: `agreed:${yearStart}`, qty: 1, unit: p.agreedTotal, amount: p.agreedTotal, label: `${tierOf(t)} annual fee (agreed)`, desc: `${n} seats · ${tierOf(t)} · agreed total`,
      basis: `Agreed annual total ${fmtAmount(cur, p.agreedTotal)} (calculated ${fmtAmount(cur, calc)}) · ${billingDateSub(year.start)} – ${billingDateSub(year.end)} ${year.end.slice(0, 4)}, in advance` }];
  }
  return lines;
}

// One-off charge for a block added mid-year (seats from an order or an amendment, or extra devices)
function subBlockCharge(t, block, kind = 'seats') {
  const p = subPeriod(t.subscription, block.from);
  if (!p || PLANS[tierOf(t)].free || isYearStart(p, block.from)) return null;
  const cur = subCurrency(t);
  const days = subProrataDays(p, block.from);
  const monthly = kind === 'devices' ? block.price : block.price + subAddonMonthly(p, block.from);
  const amount = block.charge ?? Math.round(block.qty * subProrata(monthly, days) * 100) / 100;
  return { key: `${kind}:${block.id}:once`, qty: block.qty, unit: Math.round(amount / block.qty * 100) / 100, amount, days,
    label: kind === 'devices' ? 'Extra devices' : `${tierOf(t)} seats added`, desc: `${block.qty} ${kind === 'devices' ? 'extra device' : 'seat'}${block.qty === 1 ? '' : 's'}${block.note ? ` · ${block.note}` : ''}`,
    basis: `${block.qty} × ${fmtAmount(cur, monthly)} / month × ${days} days ÷ 30${days === 360 ? ' (capped)' : ''} · one-off to ${billingDateSub(subYear(p, block.from).end)}` };
}

// Annual fee on a date at full-year rates (what the next subscription year would bill)
function subAnnualRate(t, onDate = SUB_TODAY) {
  const p = subPeriod(t.subscription, onDate);
  if (!p) return { seats: 0, amount: 0, cur: subCurrency(t) };
  const live = p.blocks.filter(b => b.from <= onDate);
  const seats = live.reduce((n, b) => n + b.qty, 0);
  const free = PLANS[tierOf(t)].free;
  const seatAmt = free ? 0 : live.reduce((n, b) => n + b.qty * b.price * 12, 0);
  const addAmt = free ? 0 : subAddonMonthly(p, onDate) * seats * 12;
  const devAmt = free ? 0 : subDeviceBlocks(p).filter(d => d.from <= onDate).reduce((n, d) => n + d.qty * d.price * 12, 0);
  const calc = Math.round((seatAmt + addAmt + devAmt) * 100) / 100;
  const agreed = !free && p.agreedTotal != null;
  return { seats, amount: agreed ? p.agreedTotal : calc, calc, agreed, seatAmt, addAmt, devAmt, cur: subCurrency(t), year: subYear(p, onDate) };
}

const billingDateSub = s => new Date(`${s}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

// Price of a seat ordered mid-term (one per joiner when no seat is available); defaults to the latest seat block's price
const subAddPrice = sub => (sub.addPrice ?? subLastPrice(sub));

// Subscription health on a date. Paid plans: renewal due within 90 days (unless auto-renewing), expired for a 30-day
// grace period (notifications paused, still usable), then restricted. Free restricts as soon as the term ends.
function subStatus(k, onDate = SUB_TODAY) {
  const t = k.terms;
  const sub = t && t.subscription;
  if (!sub || isOnboarding(k)) return null;
  const free = !!(PLANS[k.tier] && PLANS[k.tier].free);
  const p = subPeriod(sub, onDate);
  if (p) {
    const left = dayCount(onDate, p.term.end) - 1;
    const renews = p.kind === 'current' && (sub.next || sub.autoRenew);
    if (left <= SUB_RENEW_WARN_DAYS && !renews) return { key: 'due', label: 'Renewal due', cls: 'badge-warning', end: p.term.end, left, period: p, text: `Ends ${billingDateSub(p.term.end)} ${p.term.end.slice(0, 4)} · ${left} days left, no renewal agreed` };
    const note = sub.next && p.kind === 'current' ? `Renewal agreed from ${billingDateSub(sub.next.term.start)}` : sub.autoRenew && p.kind !== 'renewal' ? `Auto-renews ${billingDateSub(addDays(p.term.end, 1))} ${addDays(p.term.end, 1).slice(0, 4)}` : `Ends ${billingDateSub(p.term.end)} ${p.term.end.slice(0, 4)}`;
    return { key: 'active', label: 'Active', cls: 'badge-success', end: p.term.end, left, period: p, text: note };
  }
  const end = [sub.term.end, sub.next ? sub.next.term.end : ''].sort().pop();
  const since = dayCount(end, onDate) - 1;
  const graceEnd = addDays(end, SUB_GRACE_DAYS);
  if (!free && since <= SUB_GRACE_DAYS) return { key: 'expired', label: 'Expired', cls: 'badge-error', end, since, graceEnd, text: `Expired ${billingDateSub(end)} · notifications paused · access restricted from ${billingDateSub(addDays(graceEnd, 1))}` };
  return { key: 'restricted', label: 'Restricted', cls: 'badge-error', end, since, graceEnd: free ? end : graceEnd, text: `Expired ${billingDateSub(end)} ${end.slice(0, 4)} · platform access restricted for the client's domain` };
}
// Seat billing and seat orders only run while the subscription is in force (or in grace for seats already held)
const subLive = k => { const st = subStatus(k); return !!st && (st.key === 'active' || st.key === 'due'); };

const subLastPrice = sub => (sub.blocks.length ? sub.blocks[sub.blocks.length - 1].price : 0);
const subNextBlockId = sub => `b${Math.max(0, ...[...sub.blocks, ...(sub.next ? sub.next.blocks : [])].map(b => Number(String(b.id).replace(/\D/g, '')) || 0)) + 1}`;

// New subscription when a contract moves onto a seat plan
function subCreate(t, clientId, start) {
  const s = start || firstOfNextMonth();
  const billTo = parentEntity(t).id;
  const cur = (entityById(t, billTo) || parentEntity(t)).currency;
  const qty = Math.max(1, SUB_ACTIVE_USERS[clientId] || 10);
  return { term: { start: s, end: addDays(addMonthsIso(s, 12), -1) }, billTo, blocks: [{ id: 'b1', qty, price: planListPrice(PLANS[t.tier].listUSD, cur), from: s, note: 'Initial commitment' }], addOns: [], autoRenew: true };
}

// Renewal terms prefilled from the current term: same seats at the latest price, free to change
function subRenewalDraft(sub) {
  const start = addDays(sub.term.end, 1);
  const dev = subDeviceBlocks(sub).reduce((n, d) => n + d.qty, 0);
  return { term: { start, end: addDays(addMonthsIso(start, 12), -1) }, blocks: [{ id: 'r1', qty: subSeatsAt(sub, sub.term.end), price: subLastPrice(sub), from: start, note: 'Renewal' }], addOns: sub.addOns.map(a => ({ ...a, from: start })),
    deviceBlocks: dev ? [{ id: 'rd1', qty: dev, price: subDeviceBlocks(sub).slice(-1)[0].price, from: start, note: 'Extra devices carried into renewal' }] : [] };
}

// Keep a draft consistent after its plan changes: create, drop or reprice the subscription
function subNormalize(t, prev, clientId) {
  if (isSeatPlan(t.tier) && !t.subscription) t.subscription = subCreate(t, clientId);
  if (!isSeatPlan(t.tier) && t.subscription && !(prev && prev.subscription)) delete t.subscription;
  // Billable users are Enterprise only
  if (isSeatPlan(t.tier) && t.managedUsers) t.managedUsers.enabled = false;
  if (!t.subscription) return;
  // Add-ons the plan includes or doesn't offer are dropped
  t.subscription.addOns = t.subscription.addOns.filter(a => addonAvailability(t.tier, a.key) === 'addon');
  // Upgrade: seats move to at least the new plan's list price
  if (prev && isSeatPlan(prev.tier) && isSeatPlan(t.tier) && PLANS[t.tier].rank > PLANS[prev.tier].rank) {
    const list = planListPrice(PLANS[t.tier].listUSD, subCurrency(t));
    t.subscription.blocks.forEach(b => { b.price = Math.max(b.price, list); });
  }
}

// What a proposed version may change compared with the active one. Seats are committed for the term.
function subValidate(prev, next, effective) {
  const errors = [];
  const a = prev && prev.subscription;
  const b = next.subscription;
  if (isSeatPlan(next.tier) && !b) errors.push(`${next.tier} needs a seat subscription.`);
  if (b) {
    if (!b.blocks.length) errors.push('Add at least one seat block.');
    b.blocks.forEach(x => {
      if (!(Number.isInteger(x.qty) && x.qty > 0)) errors.push('Seat quantities must be whole numbers above zero.');
      if (!(x.price >= 0)) errors.push('Seat prices can’t be negative.');
      if (x.from < b.term.start || x.from > b.term.end) errors.push(`Seats from ${billingDateSub(x.from)} start outside the term.`);
    });
    if (b.term.end <= b.term.start) errors.push('The subscription term must end after it starts.');
    b.addOns.forEach(x => { if (addonAvailability(next.tier, x.key) !== 'addon') errors.push(`${subAddonOf(x.key).label} isn’t a paid add-on on ${next.tier}${addonAvailability(next.tier, x.key) === 'included' ? ' (it’s included)' : ''}.`); });
    if (b.next) {
      if (b.next.term.start !== addDays(b.term.end, 1)) errors.push('The renewal must start the day after the current term ends.');
      if (!b.next.blocks.length || b.next.blocks.some(x => !(Number.isInteger(x.qty) && x.qty > 0))) errors.push('Renewal seats must be whole numbers above zero.');
    }
  }
  if (!a) return [...new Set(errors)];
  // Mid-term rules apply while the active term is running
  const midTerm = SUB_TODAY <= a.term.end;
  if (!midTerm) return [...new Set(errors)];
  const atRenewal = effective && effective > a.term.end;
  const end = billingDateSub(a.term.end) + ' ' + a.term.end.slice(0, 4);
  if (!b || !isSeatPlan(next.tier)) {
    if (!atRenewal) errors.push(`Seats are committed until ${end}. Moving to ${next.tier} can only take effect from ${billingDateSub(addDays(a.term.end, 1))} ${addDays(a.term.end, 1).slice(0, 4)}.`);
    return [...new Set(errors)];
  }
  if (PLANS[next.tier].rank < PLANS[prev.tier].rank && !atRenewal) errors.push(`Downgrading from ${prev.tier} to ${next.tier} can only take effect at renewal (after ${end}).`);
  if (b.term.start !== a.term.start) errors.push('The current term’s start date can’t change.');
  if (b.term.end < a.term.end) errors.push(`The term can be extended but not shortened (ends ${end}).`);
  a.blocks.forEach(x => {
    const y = b.blocks.find(z => z.id === x.id);
    if (!y) errors.push(`${x.qty} committed seat${x.qty === 1 ? '' : 's'} from ${billingDateSub(x.from)} can’t be removed before ${end}.`);
    else {
      if (y.qty < x.qty) errors.push(`Seats from ${billingDateSub(x.from)} can’t go below ${x.qty} before ${end}. Reduce seats in the renewal instead.`);
      if (y.price < x.price) errors.push(`The price of seats from ${billingDateSub(x.from)} can’t be lowered mid-term.`);
      if (y.from !== x.from) errors.push('The start date of committed seats can’t change.');
    }
  });
  subDeviceBlocks(a).forEach(x => { if (!subDeviceBlocks(b).some(y => y.id === x.id && y.qty >= x.qty)) errors.push(`${x.qty} extra device${x.qty === 1 ? '' : 's'} from ${billingDateSub(x.from)} can’t be removed before ${end}.`); });
  if (a.agreedTotal != null && (b.agreedTotal == null ? subAnnualRate({ ...next }, a.term.start).calc : b.agreedTotal) < a.agreedTotal) errors.push(`The agreed annual total can’t go below ${a.agreedTotal} mid-term.`);
  if (b.agreedTotal != null && !(b.agreedTotal >= 0)) errors.push('The agreed annual total can’t be negative.');
  if (b.addPrice != null && b.addPrice < subAddPrice(a)) errors.push(`The additional-seat price can’t go below ${subAddPrice(a)} mid-term.`);
  // An add-on the new plan includes is replaced, not dropped
  a.addOns.forEach(x => { if (!b.addOns.some(y => y.key === x.key) && addonAvailability(next.tier, x.key) !== 'included') errors.push(`${subAddonOf(x.key).label} is committed until ${end}.`); });
  return [...new Set(errors)];
}

// Plain-text summaries used by contract rows and diffs
const subTermText = sub => `${billingDateSub(sub.term.start)} ${sub.term.start.slice(0, 4)} – ${billingDateSub(sub.term.end)} ${sub.term.end.slice(0, 4)}`;
const subBlocksText = (sub, cur) => sub.blocks.map(b => `${b.qty} × ${fmtAmount(cur, b.price)} from ${billingDateSub(b.from)}`).join(' · ');
const subAddonsText = (sub, cur) => (sub.addOns.length ? sub.addOns.map(a => `${subAddonOf(a.key).label} ${fmtAmount(cur, a.price)}/seat`).join(' · ') : 'None');
const subAddPriceText = (sub, cur) => `${fmtAmount(cur, subAddPrice(sub))} per seat per month for seats ordered mid-year, charged pro rata${sub.addPrice == null ? ' (latest seat price)' : ''}`;
const subTotalText = (t, cur) => { const r = subAnnualRate(t, [SUB_TODAY, t.subscription.term.start].sort().pop()); return r.agreed ? `${fmtAmount(cur, r.amount)} per year, agreed (calculated ${fmtAmount(cur, r.calc)})` : `${fmtAmount(cur, r.amount)} per year, calculated from seats`; };
const subDevicesText = (sub, cur) => (subDeviceBlocks(sub).length ? subDeviceBlocks(sub).map(d => `${d.qty} × ${fmtAmount(cur, d.price)} from ${billingDateSub(d.from)}`).join(' · ') : 'None');
const subNextText = (sub, cur) => (sub.next ? `${subTermText(sub.next)}: ${subBlocksText(sub.next, cur)}` : sub.autoRenew ? 'Auto-renews on the same seats' : 'Ends at term end');
