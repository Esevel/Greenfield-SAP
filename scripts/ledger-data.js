// Billing ledger: accrued charges before invoicing. Append-only: corrections are reversing entries, never edits.
// Exactly one charge per completed billable step. Needs hub-data.js and billing-data.js.

const LEDGER_TODAY = '2026-10-16';

// kind: charge | reversal | rebill. status: unbilled | invoiced. anomaly: reason string when a rule check fails.
// source: what completed the step (milestone, asset, recipient, evidence document)
const LEDGER = [];

const ledgerNextId = () => `LE-${Math.max(40120, ...LEDGER.map(e => +e.id.slice(3))) + 1}`;
const billNow = () => `${LEDGER_TODAY} ${new Date().toTimeString().slice(0, 5)}`;

// Price one charge: the work country's fee in its own currency, converted to the paying entity's currency.
// basis keeps what was applied (fee, exception, FX rate and source, why this entity) so it never changes later.
function makeCharge(e) {
  const t = CONTRACTS[e.client].terms;
  const pay = payingEntity(t, e.cc, e);
  const ent = e.entity ? entityById(t, e.entity) : pay.entity;
  const why = ent.id === pay.entity.id ? pay.why : 'Billing entity set on the order';
  let unit, basis;
  if (e.event === 'managed') {
    unit = ent.muRate;
    basis = { why, managed: true };
  } else {
    const fee = contractFee(t, e.event, e.cc, (e.at || BILLING_TODAY).slice(0, 10));
    const fx = fxQuote(t, fee.cur, ent.currency);
    unit = Math.round(fee.amount * (fx ? fx.rate : 1) * 100) / 100;
    basis = { why, feeCur: fee.cur, fee: fee.amount, base: fee.base, custom: fee.custom, fx, discount: fee.discount ? discountLabel(fee.discount, fee.cur) : '' };
  }
  return { id: ledgerNextId(), kind: 'charge', status: 'unbilled', qty: 1, cur: ent.currency, amount: Math.round(unit * (e.qty || 1) * 100) / 100, unit, basis, ...e, entity: ent.id };
}

(function seedLedger() {
  const add = e => LEDGER.push(makeCharge(e));

  add({ at: '2026-10-16 15:42', client: 'acme', cc: 'SG', event: 'deployment', wo: 'ONB-1186', step: 'Delivered', asset: 'C02XK4801A · MacBook Pro 14" M3', recipient: 'Sophie Tan', doc: 'POD-CX-88412093.pdf', entity: 'e1', costCentre: 'CC-4410 Platform Eng', po: '' });
  add({ at: '2026-10-16 15:42', client: 'acme', cc: 'SG', event: 'deployment', wo: 'ONB-1186', step: 'Delivered', asset: '2241LZ4802B · Logitech MX Master 3S', recipient: 'Sophie Tan', doc: 'POD-CX-88412093.pdf', entity: 'e1', costCentre: 'CC-4410 Platform Eng', po: '' });
  add({ at: '2026-10-16 14:10', client: 'northwind', cc: 'US', event: 'deployment', wo: 'ONB-1184', step: 'Delivered', asset: '8HJ24810C · Dell XPS 15', recipient: 'Ryan Cooper', doc: 'fedex-7712445900.pdf', entity: 'e1', costCentre: 'IT-200', po: 'PO-NW-55120' });
  add({ at: '2026-10-15 14:26', client: 'techglobal', cc: 'US', event: 'retrieval', wo: 'OFF-2044', step: 'Received at hub', asset: 'CN-0H8W2K-4740C · Dell UltraSharp U2723QE', recipient: 'Kevin Brooks', doc: 'Intake · 4 photos', entity: 'e1', costCentre: '', po: 'PO-TG-9081' });
  add({ at: '2026-10-15 14:20', client: 'techglobal', cc: 'US', event: 'retrieval', wo: 'OFF-2044', step: 'Received at hub', asset: 'CN-0H8W2K-4733B · Dell UltraSharp U2723QE', recipient: 'Kevin Brooks', doc: 'Intake · 3 photos', entity: 'e1', costCentre: '', po: 'PO-TG-9081' });
  add({ at: '2026-10-15 10:02', client: 'mediaworks', cc: 'SG', event: 'deployment', wo: 'ONB-1182', step: 'Delivered', asset: 'C02XK4777D · MacBook Pro 16" M3 Max', recipient: 'Arjun Mehta', doc: 'POD-CX-88400117.pdf', entity: 'e1', costCentre: 'Design', po: '' });
  add({ at: '2026-10-14 17:05', client: 'digital', cc: 'AU', event: 'repair', wo: 'REP-0409', step: 'Repaired', asset: 'PF3Q3301B · Lenovo ThinkPad X1 Carbon', recipient: 'Hannah Clarke', doc: 'Repair report RR-0409.pdf', entity: 'e1', costCentre: 'OPS', po: '' });
  add({ at: '2026-10-14 11:30', client: 'acme', cc: 'MY', event: 'redeployment', wo: 'RDP-0391', step: 'Delivered', asset: 'FVFHG4120B · MacBook Air 13" M2', recipient: 'Lim Wei Ling', doc: 'POD-CX-88395002.pdf', entity: 'e2', costCentre: 'MY-Sales', po: '' });
  add({ at: '2026-10-13 16:40', client: 'northwind', cc: 'US', event: 'disposal', wo: 'DSP-0218', step: 'Certificate issued', asset: 'C02TT1180Q · MacBook Pro 13" (2019)', recipient: '—', doc: 'CoD-DSP-0218.pdf', entity: 'e2', costCentre: 'Clinics IT', po: 'PO-NW-55002' });
  add({ at: '2026-10-12 09:00', client: 'finance', cc: 'GB', event: 'deployment', wo: 'ONB-1188', step: 'Delivered', asset: 'C02XK4130G · MacBook Pro 14" M3', recipient: 'Olivia Hart', doc: 'dhl-JD014600007731.pdf', entity: 'e1', costCentre: '', po: '' });
  // Storage: one charge per device per day, rolled up daily per client × hub
  add({ at: '2026-10-16 00:05', client: 'acme', cc: 'SG', event: 'storage', qty: 17, wo: 'Storage', step: 'Daily accrual 15 Oct', asset: '17 devices · Singapore Hub', recipient: '—', doc: 'Hub stock snapshot 15 Oct 23:59', entity: 'e1', costCentre: '', po: '' });
  add({ at: '2026-10-16 00:05', client: 'techglobal', cc: 'US', event: 'storage', qty: 37, wo: 'Storage', step: 'Daily accrual 15 Oct', asset: '37 devices · US East Hub', recipient: '—', doc: 'Hub stock snapshot 15 Oct 23:59', entity: 'e1', costCentre: '', po: '' });
  add({ at: '2026-10-16 00:05', client: 'mediaworks', cc: 'SG', event: 'storage', qty: 21, wo: 'Storage', step: 'Daily accrual 15 Oct', asset: '21 devices · Singapore Hub', recipient: '—', doc: 'Hub stock snapshot 15 Oct 23:59', entity: 'e1', costCentre: '', po: '' });
  // Billable users: one charge per billing entity from the locked Sep snapshot, at that entity's rate
  [['acme', 142], ['northwind', 88]].forEach(([client, total]) => Object.entries(muEntitySplit(client, total)).forEach(([entity, qty]) => {
    if (!qty) return;
    const ent = entityById(CONTRACTS[client].terms, entity);
    const snap = `MU-${client.toUpperCase().slice(0, 4)}-2026-09`;
    add({ at: '2026-10-01 00:10', client, cc: ent.country, event: 'managed', qty, wo: 'Billable users', step: 'Sep 2026 snapshot', asset: `${qty} billable users`, recipient: '—', doc: `Snapshot ${snap} (locked)`, entity, costCentre: '', po: '' });
  }));
  // Already invoiced
  add({ at: '2026-09-28 13:15', client: 'acme', cc: 'SG', event: 'retrieval', wo: 'OFF-2031', step: 'Received at hub', asset: 'C02XK3501A · MacBook Pro 14" M3', recipient: 'Daniel Ho', doc: 'Intake · 3 photos', entity: 'e1', costCentre: 'CC-4410 Platform Eng', po: '', status: 'invoiced', invoice: 'INV-2026-0912' });
  add({ at: '2026-09-25 10:40', client: 'techglobal', cc: 'US', event: 'deployment', wo: 'ONB-1160', step: 'Delivered', asset: '8HJ24102A · Dell XPS 15', recipient: 'Maya Patel', doc: 'fedex-7712440011.pdf', entity: 'e1', costCentre: '', po: 'PO-TG-9050', status: 'invoiced', invoice: 'INV-2026-0918' });

  // Anomaly: duplicate charge for the same step (two POD events)
  add({ at: '2026-10-15 10:09', client: 'mediaworks', cc: 'SG', event: 'deployment', wo: 'ONB-1182', step: 'Delivered', asset: 'C02XK4777D · MacBook Pro 16" M3 Max', recipient: 'Arjun Mehta', doc: 'POD email duplicate', entity: 'e1', costCentre: 'Design', po: '', anomaly: 'Duplicate: ONB-1182 Delivered already charged (LE-40126)' });
  // Anomaly: charge without evidence
  add({ at: '2026-10-14 08:55', client: 'cloud', cc: 'US', event: 'deployment', wo: 'ONB-1185', step: 'Delivered', asset: '8HJ24990E · Dell XPS 15', recipient: 'Grace Liu', doc: '', entity: 'e1', costCentre: '', po: '', anomaly: 'No evidence document on the completed step' });
  // Anomaly: billed on an expired contract
  LEDGER[LEDGER.length - 1].anomaly += ' · contract expired 30 Sep 2026';

  // Correction: wrong country rate, reversed and re-billed (visible history)
  add({ at: '2026-10-10 12:00', client: 'acme', cc: 'AU', event: 'deployment', wo: 'ONB-1171', step: 'Delivered', asset: 'C02XK4402F · MacBook Pro 14" M3', recipient: 'Tom Reid', doc: 'POD-CX-88370021.pdf', entity: 'e1', costCentre: 'CC-4410 Platform Eng', po: '' });
  const wrong = LEDGER[LEDGER.length - 1];
  add({ at: '2026-10-11 09:14', client: 'acme', cc: 'AU', event: 'deployment', kind: 'reversal', amount: -wrong.amount, reverses: wrong.id, wo: wrong.wo, step: wrong.step, asset: wrong.asset, recipient: wrong.recipient, doc: wrong.doc, entity: 'e1', costCentre: wrong.costCentre, po: '',
    reason: 'Charged at AU rate; device shipped from Singapore Hub to SG address', by: 'Billing · Wen' });
  add({ at: '2026-10-11 09:14', client: 'acme', cc: 'SG', event: 'deployment', kind: 'rebill', replaces: wrong.id, wo: wrong.wo, step: wrong.step, asset: wrong.asset, recipient: wrong.recipient, doc: wrong.doc, entity: 'e1', costCentre: wrong.costCentre, po: '', by: 'Billing · Wen' });
  wrong.reversedBy = LEDGER[LEDGER.length - 2].id;

  // Pending reversal awaiting approval (dispute-driven)
  add({ at: '2026-10-09 15:20', client: 'techglobal', cc: 'SG', event: 'deployment', wo: 'ONB-1166', step: 'Delivered', asset: 'C02XK4290C · MacBook Pro 14" M3', recipient: 'Lee Jun Hao', doc: 'POD-CX-88361180.pdf', entity: 'e2', costCentre: '', po: 'PO-TG-9077',
    pendingReversal: { reason: 'Client says device arrived damaged; replacement shipped free of charge', requestedBy: 'CS · Aisha', at: '2026-10-15 11:02' } });
})();

const LEDGER_EVENT_LABEL = { ...Object.fromEntries(FEE_EVENTS.map(e => [e.key, e.label])), managed: 'Billable users', device: 'Device sale' };
const LEDGER_KIND = { charge: 'Charge', reversal: 'Reversal', rebill: 'Re-bill' };

const ledgerById = id => LEDGER.find(e => e.id === id);
// All entries linked to this one through reversals and re-bills
function ledgerChain(e) {
  const root = e.reverses ? ledgerById(e.reverses) : e.replaces ? ledgerById(e.replaces) : e;
  return LEDGER.filter(x => x === root || x.reverses === root.id || x.replaces === root.id).sort((a, b) => a.at.localeCompare(b.at));
}

// Append-only correction: never edits the original
function ledgerReverse(e, reason, by) {
  const rev = { ...e, id: ledgerNextId(), kind: 'reversal', at: billNow(), amount: -e.amount, reverses: e.id, reason, by, status: 'unbilled', anomaly: '', pendingReversal: null };
  delete rev.invoice;
  delete rev.reversedBy;
  LEDGER.push(rev);
  e.reversedBy = rev.id;
  return rev;
}
