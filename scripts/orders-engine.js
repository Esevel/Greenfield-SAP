// Orders engine: builds orders from seeds, times stages in business hours of the order country, derives status and
// pricing, applies actions (mark done, skip, pause, approve, hold, cancel) with an audit trail, persists for the
// browser session and posts Delivered charges to the Billing ledger when billing-engine.js is loaded.
// Needs hub-data.js, supply-data.js, sla-data.js, calendar-data.js, billing-data.js and orders-data.js.

const ORDERS_KEY = 'sap-orders-v1';
const ORDER_TEMPLATES_KEY = 'sap-order-templates-v1';
sessionStorage.removeItem('sap-order-tabs-v1');
const ORDER_AT_RISK = 0.75;

const ORDER_STATE = {
  pending: ['Pending approval', 'badge-warning'],
  progress: ['In progress', 'badge-info'],
  overdue: ['Overdue', 'badge-error'],
  paused: ['SLA paused', 'badge-neutral'],
  hold: ['Payment hold', 'badge-error'],
  complete: ['Delivered', 'badge-success'],
  cancelled: ['Cancelled', 'badge-neutral']
};

const orderClient = id => WH_CLIENTS.find(c => c.id === id);
const orderVendorName = key => (SUPPLY_SUPPLIERS[key] || { name: key }).name;
const orderIso = d => { const x = new Date(d); return `${calIso(x)}T${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`; };
const orderNowIso = () => orderIso(ORDER_NOW);
const orderUser = () => (window.RBAC ? RBAC.getCurrentUser().name : 'You');
const orderRound = v => Math.round(v * 100) / 100;

// Deterministic pseudo-random numbers so generated orders are the same on every load
function orderRng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/* ---------- Pricing ---------- */

// Order currency is the billing entity's currency
function orderEntity(o) {
  const t = CONTRACTS[o.client].terms;
  return (o.entity && entityById(t, o.entity)) || payingEntity(t, o.cc).entity;
}

// Unit cost and revenue for a model on a client's contract: retail, or contract adjustment on cost (floored at cost)
function orderModelPrice(clientId, model, cur) {
  const pb = ORDER_PRICE_BOOK[model];
  const cat = STOCK_MODELS_LITE[model].category;
  const t = CONTRACTS[clientId].terms;
  const exc = t.pricing.markup.find(m => m.category === cat);
  const usdRev = exc ? Math.max(pb.cost, pb.cost * (1 + exc.markup / 100)) : pb.retail;
  return { cost: orderRound(fxConvert(pb.cost, 'USD', cur)), rev: orderRound(fxConvert(usdRev, 'USD', cur)), basis: exc ? `Contract ${exc.markup > 0 ? '+' : ''}${exc.markup}% on cost` : 'Retail' };
}

// Models used on orders (mirrors stock-data.js STOCK_MODELS so Orders doesn't depend on Stock)
const STOCK_MODELS_LITE = {
  mbp14: { name: 'MacBook Pro 14" M3', category: 'Laptops' },
  air13: { name: 'MacBook Air 13" M2', category: 'Laptops' },
  xps15: { name: 'Dell XPS 15', category: 'Laptops' },
  x1c: { name: 'Lenovo ThinkPad X1 Carbon', category: 'Laptops' },
  u2723: { name: 'Dell UltraSharp U2723QE', category: 'Monitors' },
  mxm3s: { name: 'Logitech MX Master 3S', category: 'Peripherals' },
  magickb: { name: 'Apple Magic Keyboard', category: 'Peripherals' }
};
const orderModelName = m => (STOCK_MODELS_LITE[m] || { name: m }).name;
const ORDER_CATEGORY_LABEL = { Laptops: 'Laptop', Monitors: 'Monitor', Peripherals: 'Peripheral' };

function orderTaxRate(o) {
  const ent = orderEntity(o);
  if (ent.taxStatus.startsWith('Exempt')) return { label: `${ORDER_TAX[ent.country][0]} · exempt`, rate: 0 };
  const [label, rate] = ORDER_TAX[ent.country] || ['Tax', 0];
  return { label, rate };
}

// Totals in the order currency. Revenue gets goods tax; cost doesn't (input tax is reclaimed).
function orderPricing(o) {
  const line = l => ({ cost: orderRound(l.qty * l.unitCost), rev: orderRound(l.qty * l.unitRev) });
  const products = o.products.map(l => ({ ...l, ...line(l) }));
  const fees = o.fees.map(f => ({ ...f, ...line(f) }));
  const ship = { cost: o.shippingCost, rev: o.shippingRev };
  const subCost = orderRound(products.reduce((s, l) => s + l.cost, 0) + fees.reduce((s, l) => s + l.cost, 0) + ship.cost);
  const subRev = orderRound(products.reduce((s, l) => s + l.rev, 0) + fees.reduce((s, l) => s + l.rev, 0) + ship.rev);
  const tax = orderTaxRate(o);
  const taxAmt = orderRound(subRev * tax.rate / 100);
  const margin = orderRound(subRev - subCost);
  const pct = subRev ? Math.round(margin / subRev * 1000) / 10 : 0;
  return { cur: o.currency, products, fees, ship, subCost, subRev, tax, taxAmt, totalCost: subCost, totalRev: orderRound(subRev + taxAmt), margin, pct };
}
const marginPct = (cost, rev) => (rev ? Math.round((rev - cost) / rev * 1000) / 10 : 0);
const marginClass = pct => (pct >= ORDER_MARGIN_GOOD ? 'margin-good' : pct >= ORDER_MARGIN_WARN ? 'margin-warn' : 'margin-bad');
const marginBadge = pct => `<span class="margin-badge ${marginClass(pct)}">${pct.toFixed(1)}%</span>`;
const orderToSGD = (amount, cur) => fxConvert(amount, cur, 'SGD');
const orderToUSD = (amount, cur) => fxConvert(amount, cur, 'USD');
const orderUnits = o => o.products.reduce((s, l) => s + l.qty, 0);
const orderLaptops = o => o.products.filter(l => STOCK_MODELS_LITE[l.model]?.category === 'Laptops').reduce((s, l) => s + l.qty, 0);

/* ---------- Stages and SLA ---------- */

const orderMilestones = o => slaType(o.type).milestones;
const orderStageSkippedByRoute = (o, m) => m.hubOnly && o.route !== 'hub';

// Business-hour targets for an order: client exception, else the country standard
function orderTargets(o) {
  const ov = SLA_OVERRIDES[slaKey(o.client, o.type, o.cc)];
  const defs = SLA_DEFAULTS[o.type][o.cc];
  return orderMilestones(o).map((m, i) => ({ hours: ov && ov[i] != null ? ov[i] : defs[i], custom: !!(ov && ov[i] != null) }));
}

// Paused business minutes inside a window
function orderPausedMins(o, from, to) {
  return (o.pauses || []).reduce((n, p) => {
    const a = new Date(Math.max(new Date(p.at), new Date(from)));
    const b = new Date(Math.min(new Date(p.resumedAt || ORDER_NOW), new Date(to)));
    return b > a ? n + bizMinutes(o.cc, a, b) : n;
  }, 0);
}
const orderIsPaused = o => (o.pauses || []).some(p => !p.resumedAt);
const orderIsCancelled = o => !!o.cancelled;
const orderPendingApproval = o => o.approvalRequired && o.approval === 'pending';

// Full stage picture: one entry per milestone with state, timing and target; plus the current stage
function orderSla(o) {
  const ms = orderMilestones(o);
  const targets = orderTargets(o);
  let prev = o.createdAt;
  let cur = null;
  const steps = ms.map((m, i) => {
    const st = o.stages[m.key] || {};
    const step = { m, i, key: m.key, target: targets[i].hours, hours: targets[i].hours, custom: targets[i].custom, data: st, routeSkipped: orderStageSkippedByRoute(o, m) };
    if (step.routeSkipped) { step.state = 'skipped'; step.skipReason = `Not needed · ${SLA_ROUTES[o.route].label.toLowerCase()}`; return step; }
    if (st.skipped) { step.state = 'skipped'; step.skipReason = st.skipReason || 'Skipped'; step.doneAt = st.at; if (st.at) prev = st.at; return step; }
    step.startedAt = prev;
    if (st.at) {
      step.state = 'done';
      step.doneAt = st.at;
      step.mins = Math.max(0, bizMinutes(o.cc, prev, st.at) - orderPausedMins(o, prev, st.at));
      step.over = step.mins > step.hours * 60;
      prev = st.at;
    } else if (!cur && !orderIsCancelled(o)) {
      step.state = 'current';
      step.mins = Math.max(0, bizMinutes(o.cc, prev, ORDER_NOW) - orderPausedMins(o, prev, ORDER_NOW));
      cur = step;
    } else {
      step.state = 'upcoming';
    }
    return step;
  });
  const active = steps.filter(s => !s.routeSkipped);
  const counted = active.filter(s => s.state !== 'skipped');
  const paused = orderIsPaused(o);
  const blocked = orderPendingApproval(o) || o.paymentHold;
  const ratio = cur && cur.hours ? cur.mins / (cur.hours * 60) : 0;
  const remainingMins = cur ? cur.hours * 60 - cur.mins : 0;
  let health = !cur ? 'complete' : remainingMins < 0 ? 'breached' : ratio >= ORDER_AT_RISK ? 'risk' : 'ok';
  if (paused || blocked) health = remainingMins < 0 ? 'breached' : 'ok';
  const totalMins = counted.reduce((n, s) => n + s.hours * 60, 0);
  const elapsed = Math.max(0, bizMinutes(o.cc, o.createdAt, o.deliveredAt || ORDER_NOW) - orderPausedMins(o, o.createdAt, o.deliveredAt || ORDER_NOW));
  const due = bizAdd(o.cc, o.createdAt, totalMins + orderPausedMins(o, o.createdAt, ORDER_NOW));
  const doneCount = active.filter(s => s.state === 'done' || s.state === 'skipped').length;
  const index = cur ? active.indexOf(cur) : active.length;
  // Shape shared with trackerSla so the cross-service table can show orders
  return {
    type: slaType(o.type), steps, active, cur: cur && { ...cur, m: cur.m, target: cur.hours }, index, health, paused, blocked,
    ratio, remaining: remainingMins / 60, remainingMins, totalMins, elapsed, due, progress: active.length ? doneCount / active.length : 1,
    route: o.route, custom: steps.some(s => s.custom), fmt: h => fmtBiz(h * 60, o.cc)
  };
}

// "1d 3h" in business days of the country (a business day = its working hours)
function fmtBiz(mins, cc) {
  const m = Math.abs(Math.round(mins));
  const perDay = calHoursPerDay(cc) * 60;
  const d = Math.floor(m / perDay);
  const h = Math.floor((m % perDay) / 60);
  const mm = m % 60;
  if (d) return `${d}d${h ? ` ${h}h` : ''}`;
  if (h) return `${h}h${mm ? ` ${mm}m` : ''}`;
  return `${mm}m`;
}

function orderState(o) {
  if (orderIsCancelled(o)) return 'cancelled';
  if (o.deliveredAt) return 'complete';
  if (orderPendingApproval(o)) return 'pending';
  if (o.paymentHold) return 'hold';
  if (orderIsPaused(o)) return 'paused';
  return orderSla(o).health === 'breached' ? 'overdue' : 'progress';
}
const orderStateBadge = o => { const [l, c] = ORDER_STATE[orderState(o)]; return `<span class="badge ${c} badge-sm">${l}</span>`; };
const orderCurrentStage = o => { const s = orderSla(o); return s.cur ? s.cur.m.label : orderIsCancelled(o) ? 'Cancelled' : 'Delivered'; };

/* ---------- Building orders ---------- */

function orderProductsFrom(lines, client, cur, deliveredFlags) {
  return lines.map(([model, qty, unitCost, unitRev], i) => {
    const p = orderModelPrice(client, model, cur);
    return { model, cat: ORDER_CATEGORY_LABEL[STOCK_MODELS_LITE[model].category], name: orderModelName(model), qty,
      unitCost: unitCost != null ? unitCost : p.cost, unitRev: unitRev != null ? unitRev : p.rev, basis: p.basis,
      delivered: deliveredFlags ? !!deliveredFlags[i] : false };
  });
}

function orderShipping(route, type, cur) {
  const [c, r] = ORDER_SHIPPING[route];
  const k = type === 'bulk' ? 2 : 1;
  return { cost: orderRound(fxConvert(c * k, 'USD', cur)), rev: orderRound(fxConvert(r * k, 'USD', cur)) };
}

function orderFee(type, o, qty) {
  const d = ORDER_FEE_DEFAULTS[type] || { cost: 0, rev: 0 };
  const q = qty != null ? qty : d.perLaptop ? Math.max(1, orderLaptops(o)) : 1;
  return { type, name: type === 'Others' ? 'Other' : type, qty: q, unitCost: orderRound(fxConvert(d.cost, 'USD', o.currency)), unitRev: orderRound(fxConvert(d.rev, 'USD', o.currency)) };
}

// Fill in stage timestamps so the current stage sits at the requested point against its target.
// Delivered orders fit inside the window between created and now; open orders are laid out backwards from now.
function orderSeedTimeline(o, seed, rng) {
  const ms = orderMilestones(o);
  const targets = orderTargets(o);
  const active = ms.map((m, i) => ({ m, i })).filter(x => !orderStageSkippedByRoute(o, x.m));
  const done = seed.at === 'done';
  const curIdx = done ? active.length : Math.max(0, active.findIndex(x => x.m.key === seed.at));
  let curMins = 0;
  if (!done) {
    const tgt = targets[active[curIdx].i].hours * 60;
    curMins = seed.overH != null ? tgt + seed.overH * 60 : Math.round(tgt * (seed.frac != null ? seed.frac : 0.4));
  }
  // Completed stages: most well inside target, about 1 in 12 over
  let durs = active.slice(0, curIdx).map(x => {
    const tgt = targets[x.i].hours * 60;
    const k = (seed.slow && seed.slow[x.m.key]) || (rng() < 0.035 ? 1.1 + rng() * 0.5 : 0.2 + rng() * 0.6);
    return Math.max(15, Math.round(tgt * k / 15) * 15);
  });
  let created;
  if (seed.created) created = new Date(seed.created);
  else if (done || seed.days) created = new Date(ORDER_NOW.getTime() - (seed.days || 10) * 864e5);
  else created = bizSub(o.cc, ORDER_NOW, durs.reduce((a, b) => a + b, 0) + curMins);
  // Squeeze into the time available so nothing lands after now (current stage keeps its share)
  const avail = bizMinutes(o.cc, created, ORDER_NOW) - curMins;
  const need = durs.reduce((a, b) => a + b, 0);
  if (need > avail && need > 0) durs = durs.map(d => Math.max(15, Math.floor(d * Math.max(avail, 15 * durs.length) / need / 15) * 15));
  o.createdAt = orderIso(created);
  let t = new Date(created);
  // Open orders with a fixed created date: the last completed stage ends where the current one should start
  const curStart = !done && seed.created ? bizSub(o.cc, ORDER_NOW, curMins) : null;
  active.slice(0, curIdx).forEach((x, n) => {
    t = n === curIdx - 1 && curStart && curStart > t ? curStart : bizAdd(o.cc, t, durs[n]);
    if (t > ORDER_NOW) t = new Date(ORDER_NOW.getTime() - (curIdx - n) * 6e4);
    o.stages[x.m.key] = { at: orderIso(t), by: n === 0 ? 'System' : ORDER_OWNERS[Math.floor(rng() * ORDER_OWNERS.length)] };
  });
  if (done) o.deliveredAt = o.stages[active[active.length - 1].m.key].at;
  if (o.stages.awb && o.stages.awb.at) {
    const courier = ORDER_COURIER[o.cc];
    o.stages.awb.awb = [{ courier: o.route === 'hub' ? `${orderVendorName(o.vendor)} freight` : courier, tracking: `${o.id.slice(4)}${String(Math.floor(rng() * 900000) + 100000)}`, url: '' }];
  }
}

function orderBuild(seed, rng) {
  const ent = (() => { const t = CONTRACTS[seed.client].terms; return (seed.entity && entityById(t, seed.entity)) || payingEntity(t, seed.cc).entity; })();
  const cur = ent.currency;
  const recips = ORDER_RECIPIENTS[seed.client];
  const [rName, rPerson] = seed.recipient || recips[Math.floor(rng() * recips.length)];
  const o = {
    id: seed.id, type: seed.type, client: seed.client, entity: ent.id, cc: seed.cc, vendor: seed.vendor, priority: seed.priority || 'Normal',
    channel: seed.channel || 'Platform', route: seed.route || 'hub', currency: cur, recipient: rName, person: rPerson || '',
    orderedBy: ORDER_CLIENT_ADMIN[seed.client], owner: seed.owner || ORDER_OWNERS[Math.floor(rng() * ORDER_OWNERS.length)],
    ticket: seed.ticket || '', po: seed.po || '', costCentre: seed.costCentre || '', blocker: seed.blocker || '',
    approvalRequired: !!seed.approval, approval: seed.approval || '', paymentHold: !!seed.hold,
    address: '', expected: seed.expected || '', notes: {}, audit: [], pauses: [], stages: {}, posted: false
  };
  o.products = orderProductsFrom(seed.lines, seed.client, cur, seed.delivered);
  const ship = orderShipping(o.route, o.type, cur);
  o.shippingCost = ship.cost;
  o.shippingRev = ship.rev;
  o.fees = (seed.fees || []).map(t => orderFee(t, o));
  if (!seed.fees && orderLaptops(o) && rng() < 0.35) o.fees.push(orderFee('Windows Autopilot', o));
  orderSeedTimeline(o, seed, rng);
  if (seed.cancelReason) {
    o.cancelled = { at: orderIso(new Date(new Date(o.createdAt).getTime() + 864e5 * 1.2)), by: seed.cancelBy || 'Ops', reason: seed.cancelReason };
    delete o.deliveredAt;
    Object.keys(o.stages).forEach(k => { if (o.stages[k].at > o.cancelled.at) delete o.stages[k]; });
  }
  if (!o.expected) {
    const s = orderSla(o);
    o.expected = calIso(s.due);
  }
  (seed.notes || []).forEach(([stage, who, tag, text], n) => {
    (o.notes[stage] = o.notes[stage] || []).push({ who, tag, text, at: orderIso(new Date(ORDER_NOW.getTime() - (n + 1) * 37 * 6e4)) });
  });
  o.audit.push({ at: o.createdAt, who: o.channel === 'Platform' ? `${o.orderedBy} (client)` : o.owner, text: `Order created via ${o.channel === 'Platform' ? 'client checkout' : 'Ops'}` });
  orderMilestones(o).forEach(m => { const st = o.stages[m.key]; if (st && st.at) o.audit.push({ at: st.at, who: st.by, text: `${m.label} marked done` }); });
  if (o.approvalRequired) o.audit.push({ at: o.createdAt, who: 'System', text: o.approval === 'rejected' ? `Rejected by ${seed.cancelBy || 'client admin'}` : 'Approval required before processing' });
  if (o.paymentHold) o.audit.push({ at: orderIso(new Date(ORDER_NOW.getTime() - 3 * 36e5)), who: 'Finance · Wen', text: 'Payment hold applied: unpaid invoice' });
  if (o.cancelled) o.audit.push({ at: o.cancelled.at, who: o.cancelled.by, text: `Order cancelled: ${o.cancelled.reason}` });
  if (o.deliveredAt) o.posted = true;
  return o;
}

// Generated orders: open ones spread across stages, plus a delivered history for Insights
function orderGenerated() {
  const rng = orderRng(20261016);
  const pick = arr => arr[Math.floor(rng() * arr.length)];
  const out = [];
  let n = ORDER_GEN.firstId;
  const clients = WH_CLIENTS.filter(c => !c.isNew && CONTRACTS[c.id] && CONTRACTS[c.id].status !== 'expired').map(c => c.id);
  const vendorFor = cc => { const vs = supplyVendorsIn(cc); return vs.length ? pick(vs).key : 'ingram'; };
  const modelsFor = () => {
    const kit = pick([[['mbp14', 1], ['mxm3s', 1]], [['air13', 1]], [['xps15', 1], ['u2723', 1]], [['x1c', 1], ['mxm3s', 1], ['u2723', 1]], [['mbp14', 1], ['u2723', 2], ['magickb', 1]], [['air13', 2], ['mxm3s', 2]]]);
    return kit.map(([m, q]) => [m, q]);
  };
  const stageKeys = ['submitted', 'confirmed', 'payment', 'awb', 'received', 'qc', 'out', 'delivered'];
  const next = () => `ORD-${n++}`;
  const make = extra => {
    const client = extra.client || pick(clients);
    const ccs = Object.keys(HUB_ASSIGNMENTS[client]).filter(cc => CONTRACTS[client].terms.countries.includes(cc) || true);
    const cc = extra.cc || pick(ccs);
    const route = extra.route || (HUB_ASSIGNMENTS[client][cc] === 'none' ? pick(['site', 'employee']) : rng() < 0.7 ? 'hub' : pick(['site', 'employee']));
    const type = extra.type || (rng() < 0.15 ? 'rush' : rng() < 0.08 ? 'bulk' : 'regular');
    const lines = type === 'bulk' ? [[pick(['u2723', 'air13', 'mxm3s']), 20 + Math.floor(rng() * 10)]] : modelsFor();
    return orderBuild({ id: next(), client, cc, route, type, vendor: vendorFor(cc), priority: type === 'rush' ? pick(['Urgent', 'High']) : rng() < 0.2 ? 'High' : 'Normal', lines, ...extra }, rng);
  };
  // History (delivered), oldest first so ids increase with time
  for (let i = 0; i < ORDER_GEN.history; i++) {
    // Slightly denser towards today (a growing book). The last ~2 weeks are mostly the open orders, so history thins out there.
    const days = Math.round(9 + (ORDER_GEN.historyDays - 9) * Math.pow(1 - i / ORDER_GEN.history, 0.9));
    out.push(make({ at: 'done', days, channel: rng() < 0.75 ? 'Platform' : 'Manual' }));
  }
  // Open orders across stages
  for (let i = 0; i < ORDER_GEN.open; i++) {
    const o0 = { route: rng() < 0.7 ? 'hub' : 'site' };
    const keys = stageKeys.filter(k => o0.route === 'hub' || (k !== 'received' && k !== 'qc'));
    const at = keys[Math.floor(rng() * keys.length)];
    const frac = i < ORDER_GEN.risk ? 0.8 + rng() * 0.18 : 0.1 + rng() * 0.55;
    out.push(make({ ...o0, at, frac }));
  }
  // One paused order
  const p = make({ at: 'confirmed', frac: 0.5, route: 'hub' });
  p.pauses.push({ at: orderIso(bizSub(p.cc, ORDER_NOW, 90)), by: 'Natasa', reason: 'Client asked to hold until their budget approval on 20 Oct' });
  p.audit.push({ at: p.pauses[0].at, who: 'Natasa', text: `SLA paused: ${p.pauses[0].reason}` });
  out.push(p);
  return out;
}

function orderBuildAll() {
  const rng = orderRng(1016);
  return [...ORDER_SEEDS.map(s => orderBuild(s, rng)), ...orderGenerated()];
}

/* ---------- Store ---------- */

const ORDERS = [];
const ORDER_TEMPLATES = [];

(function loadOrders() {
  let saved = null;
  try { saved = JSON.parse(sessionStorage.getItem(ORDERS_KEY) || 'null'); } catch { sessionStorage.removeItem(ORDERS_KEY); }
  ORDERS.push(...(saved || orderBuildAll()));
  let tpl = null;
  try { tpl = JSON.parse(sessionStorage.getItem(ORDER_TEMPLATES_KEY) || 'null'); } catch { sessionStorage.removeItem(ORDER_TEMPLATES_KEY); }
  ORDER_TEMPLATES.push(...(tpl || JSON.parse(JSON.stringify(ORDER_TEMPLATES_SEED))));
})();

const saveOrders = () => sessionStorage.setItem(ORDERS_KEY, JSON.stringify(ORDERS));
const saveOrderTemplates = () => sessionStorage.setItem(ORDER_TEMPLATES_KEY, JSON.stringify(ORDER_TEMPLATES));
const orderById = id => ORDERS.find(o => o.id === id);
const nextOrderId = () => `ORD-${Math.max(...ORDERS.map(o => +o.id.slice(4)).filter(n => n < 58000)) + 1}`;
const openOrders = () => ORDERS.filter(o => !o.deliveredAt && !o.cancelled);

/* ---------- Actions ---------- */

function orderAudit(o, text, who = orderUser()) {
  o.audit.push({ at: orderNowIso(), who, text });
}

// Pending approval or a payment hold blocks stage progress
function orderBlockedReason(o) {
  if (orderIsCancelled(o)) return 'This order is cancelled.';
  if (orderPendingApproval(o)) return 'Waiting for approval. Approve the order before processing it.';
  if (o.approvalRequired && o.approval === 'rejected') return 'This order was rejected.';
  if (o.paymentHold) return 'On payment hold. Release the hold before processing.';
  return '';
}

function orderAutoResume(o) {
  const p = (o.pauses || []).find(x => !x.resumedAt);
  if (!p) return;
  p.resumedAt = orderNowIso();
  p.resumeReason = 'Auto-resumed on stage completion';
  orderAudit(o, 'SLA auto-resumed on stage completion', 'System');
}

// Mark the current stage done (at a given time, default now). Returns a message, or throws with the reason.
function orderMarkDone(o, at = orderNowIso(), opts = {}) {
  const block = orderBlockedReason(o);
  if (block) throw new Error(block);
  const s = orderSla(o);
  if (!s.cur) throw new Error('All stages are already done.');
  const prevAt = s.cur.startedAt;
  if (new Date(at) < new Date(prevAt)) throw new Error(`Time can't be before the previous stage (${fmtOrderTs(prevAt)}).`);
  if (new Date(at) > ORDER_NOW) throw new Error("Time can't be in the future.");
  if (s.cur.key === 'awb' && !(opts.awb || o.stages.awb?.awb || []).some(a => a.tracking)) throw new Error('Add at least one AWB / tracking number before completing Shipping info.');
  orderAutoResume(o);
  o.stages[s.cur.key] = { ...(o.stages[s.cur.key] || {}), at, by: orderUser(), override: at !== orderNowIso(), ...(opts.awb ? { awb: opts.awb } : {}) };
  orderAudit(o, `${s.cur.m.label} marked done${at !== orderNowIso() ? ` (time set to ${fmtOrderTs(at)})` : ''}`);
  let msg = `${o.id}: ${s.cur.m.label} done.`;
  if (s.cur.key === 'delivered') {
    o.deliveredAt = at;
    o.products.forEach(l => { l.delivered = true; });
    msg += ` ${orderPostCharges(o)}`;
  }
  saveOrders();
  return msg;
}

function orderSkip(o, reason) {
  const block = orderBlockedReason(o);
  if (block) throw new Error(block);
  const s = orderSla(o);
  if (!s.cur) throw new Error('Nothing to skip.');
  if (s.cur.key === 'delivered') throw new Error("Delivered can't be skipped.");
  if (!reason) throw new Error('Enter a reason for skipping.');
  o.stages[s.cur.key] = { skipped: true, skipReason: reason, at: orderNowIso(), by: orderUser() };
  orderAudit(o, `${s.cur.m.label} skipped: ${reason}`);
  saveOrders();
  return `${s.cur.m.label} skipped.`;
}

// Undo the last completed (or skipped) stage
function orderUndo(o) {
  const s = orderSla(o);
  const last = [...s.active].reverse().find(x => x.state === 'done' || (x.state === 'skipped' && !x.routeSkipped));
  if (!last) throw new Error('Nothing to undo.');
  if (last.key === 'delivered' && o.posted) throw new Error('Delivered has posted charges. Correct them in Billing › Ledger instead of undoing.');
  delete o.stages[last.key];
  if (last.key === 'delivered') delete o.deliveredAt;
  orderAudit(o, `${last.m.label} reopened`);
  saveOrders();
  return `${last.m.label} reopened.`;
}

// Change a completed stage's time (recorded as an override)
function orderOverride(o, key, at) {
  const s = orderSla(o);
  const step = s.steps.find(x => x.key === key);
  if (!step || step.state !== 'done') throw new Error('Only completed stages can be edited.');
  const before = s.active[s.active.indexOf(step) - 1];
  const after = s.active.slice(s.active.indexOf(step) + 1).find(x => x.state === 'done');
  const lo = before ? before.doneAt || o.createdAt : o.createdAt;
  if (new Date(at) < new Date(lo)) throw new Error(`Must be after ${fmtOrderTs(lo)}.`);
  if (after && new Date(at) > new Date(after.doneAt)) throw new Error(`Must be before ${after.m.label} (${fmtOrderTs(after.doneAt)}).`);
  if (new Date(at) > ORDER_NOW) throw new Error("Time can't be in the future.");
  const old = o.stages[key].at;
  o.stages[key] = { ...o.stages[key], at, override: true };
  if (key === 'delivered') o.deliveredAt = at;
  orderAudit(o, `${step.m.label} time changed: ${fmtOrderTs(old)} → ${fmtOrderTs(at)}`);
  saveOrders();
  return `${step.m.label} time updated.`;
}

function orderSetAwb(o, entries) {
  const clean = entries.filter(a => a.courier || a.tracking);
  if (clean.some(a => !a.courier || !a.tracking)) throw new Error('Each shipment needs a courier and a tracking number.');
  if (clean.some(a => a.url && !/^https?:\/\//.test(a.url))) throw new Error('Tracking links must start with http:// or https://');
  const dup = clean.map(a => a.tracking).find((t, i, arr) => arr.indexOf(t) !== i);
  if (dup) throw new Error(`Tracking number ${dup} is listed twice.`);
  o.stages.awb = { ...(o.stages.awb || {}), awb: clean };
  orderAudit(o, `Shipment info updated (${clean.length} AWB${clean.length === 1 ? '' : 's'})`);
  saveOrders();
  return 'Shipment info saved.';
}

function orderPause(o, reason) {
  if (!reason) throw new Error('Enter a reason for pausing.');
  if (orderIsPaused(o)) throw new Error('Already paused.');
  o.pauses.push({ at: orderNowIso(), by: orderUser(), reason });
  orderAudit(o, `SLA paused: ${reason}`);
  saveOrders();
  return 'SLA paused. The order moves to the SLA paused lane.';
}

function orderResume(o, reason) {
  if (!reason) throw new Error('Enter a reason for resuming.');
  const p = o.pauses.find(x => !x.resumedAt);
  if (!p) throw new Error('Not paused.');
  Object.assign(p, { resumedAt: orderNowIso(), resumeReason: reason, resumedBy: orderUser() });
  orderAudit(o, `SLA resumed: ${reason}`);
  saveOrders();
  return 'SLA resumed.';
}

function orderApprove(o) {
  o.approval = 'approved';
  orderAudit(o, 'Order approved');
  saveOrders();
  return `${o.id} approved. Processing can start.`;
}

function orderReject(o, reason) {
  if (!reason) throw new Error('Enter a reason for rejecting.');
  o.approval = 'rejected';
  orderCancel(o, `Approval rejected: ${reason}`, true);
  return `${o.id} rejected and cancelled.`;
}

function orderSetHold(o, on, reason = '') {
  if (on && !reason) throw new Error('Enter a reason for the hold.');
  o.paymentHold = on;
  orderAudit(o, on ? `Payment hold applied: ${reason}` : 'Payment hold released');
  saveOrders();
  return on ? 'Payment hold applied. Processing is blocked.' : 'Payment hold released.';
}

function orderCancel(o, reason, silent) {
  if (!reason) throw new Error('Enter a reason for cancelling.');
  if (o.deliveredAt) throw new Error('Delivered orders can’t be cancelled. Raise a return or credit instead.');
  o.cancelled = { at: orderNowIso(), by: orderUser(), reason };
  orderAudit(o, `Order cancelled: ${reason}`);
  saveOrders();
  return silent ? '' : `${o.id} cancelled.`;
}

function orderAddNote(o, stage, tag, text) {
  if (!text.trim()) throw new Error('Write a note first.');
  (o.notes[stage] = o.notes[stage] || []).push({ who: orderUser(), tag, text: text.trim(), at: orderNowIso() });
  saveOrders();
}

/* ---------- Billing ---------- */

// On Delivered: one device-sale line per order and one deployment fee per device, through the billing engine
function orderPostCharges(o) {
  if (o.posted) return '';
  o.posted = true;
  if (typeof completeStep !== 'function' || typeof LEDGER === 'undefined') return 'Charges post to Billing when it next opens.';
  const k = CONTRACTS[o.client];
  const ent = orderEntity(o);
  const p = orderPricing(o);
  // Device sale: products, shipping and extra fees at the order's revenue, in the entity currency (excl. tax; tax is added on the invoice)
  const sale = { id: ledgerNextId(), kind: 'charge', status: 'unbilled', at: billNow(), client: o.client, cc: o.cc, event: 'device', wo: o.id, step: 'Delivered',
    asset: `${orderUnits(o)} item${orderUnits(o) === 1 ? '' : 's'} · ${o.products.map(l => `${l.qty} × ${l.name}`).join(', ')}`, recipient: o.recipient, doc: `Order ${o.id}`,
    entity: ent.id, costCentre: o.costCentre, po: o.po, source: 'Orders · Delivered', qty: 1, unit: p.subRev, amount: p.subRev, cur: o.currency,
    basis: { why: 'Billing entity on the order', device: true } };
  if (k.status === 'expired') sale.anomaly = `Contract expired ${k.end}`;
  LEDGER.push(sale);
  postToDraft(sale);
  // Deployment fee per device (laptops and monitors; peripherals ship with them) through the standard step logic
  const assets = o.products.filter(l => STOCK_MODELS_LITE[l.model]?.category !== 'Peripherals').flatMap(l => Array.from({ length: l.qty }, (_, i) => `${o.id}-${l.model}-${i + 1} · ${l.name}`));
  const log = completeStep({ wo: o.id, step: 'Delivered', source: 'Orders · Delivered', doc: `Order ${o.id} proof of delivery`, cc: o.cc, client: o.client, assets, recipient: o.recipient, costCentre: o.costCentre, po: o.po });
  orderAudit(o, `Charges posted to Billing: device sale ${fmtAmount(o.currency, p.subRev)}${log.charges.length ? ` + ${log.charges.length} deployment fee${log.charges.length === 1 ? '' : 's'}` : ''}`, 'System');
  saveBilling();
  return `Posted to Billing: device sale ${fmtAmount(o.currency, p.subRev)}${log.charges.length ? ` and ${log.charges.length} deployment fee${log.charges.length === 1 ? '' : 's'}` : ''}.`;
}

/* ---------- Formatting ---------- */

function fmtOrderTs(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
const fmtOrderDate = iso => (iso ? new Date(iso.length === 10 ? `${iso}T00:00` : iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const orderFlag = cc => `<span class="flag" title="${WH_COUNTRIES[cc][1]}">${WH_COUNTRIES[cc][0]}</span>`;
const orderPriorityTag = p => (p === 'Normal' ? '' : `<span class="priority-tag priority-${p.toLowerCase()}">${p}</span>`);
const ORDER_HEALTH_PILL = { ok: ['sla-ok', 'On track'], risk: ['sla-risk', 'At risk'], breached: ['sla-breached', 'Breached'], complete: ['sla-ok', 'Complete'] };

// Board / tracker summary of time in stage
function orderClockText(o) {
  const s = orderSla(o);
  if (!s.cur) return '';
  return s.remainingMins < 0 ? `${fmtBiz(-s.remainingMins, o.cc)} overdue` : `${fmtBiz(s.cur.mins, o.cc)} of ${s.cur.hours}h`;
}

/* ---------- Cross-service tracker ---------- */

// Orders needing attention (breached, at risk, blocked) in the shape TRACKER_ITEMS uses, so "All · by risk" lists
// them next to other services; the full set is on the Orders tab
function orderTrackerItems() {
  return openOrders().filter(o => { const st = orderState(o); return st !== 'progress' || orderSla(o).health !== 'ok'; }).map(o => {
    const lastNote = Object.values(o.notes).flat().sort((a, b) => b.at.localeCompare(a.at))[0];
    const initials = o.owner.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    return {
      id: o.id, client: o.client, type: o.type, cc: o.cc, start: o.createdAt, done: [], order: o,
      stage: orderPendingApproval(o) ? 'Pending approval' : o.paymentHold ? 'Payment hold' : orderIsPaused(o) ? 'SLA paused' : orderCurrentStage(o),
      owner: [initials, o.owner], blocker: o.blocker || (o.paymentHold ? 'Payment hold' : orderPendingApproval(o) ? 'Waiting for client approval' : ''),
      note: lastNote ? [lastNote.who, lastNote.text] : ['—', 'No notes yet'], href: `/pages/orders/order.html?id=${o.id}`
    };
  });
}

/* ---------- Order tabs (List view) ---------- */

