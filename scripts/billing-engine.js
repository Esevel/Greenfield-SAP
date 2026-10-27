// Automatic charges: a completed billable step posts one charge per device to the ledger and the entity's draft invoice.
// Corrections never edit a charge: unbilled → reversing entry, invoiced → draft credit note.
// Ledger, invoices and step state persist for the browser session.
// Needs hub-data.js, billing-data.js, ledger-data.js and invoice-data.js; load after ops-inputs.js / dispute-data.js when a page uses them.

const BILLING_KEY = 'sap-billing-v1';
const STEP_LOG = [];

// Devices and cost details for work orders that can complete a billable step in the prototype
const BILLABLE_ORDERS = {
  'ONB-1194': { client: 'techglobal', cc: 'US', recipient: 'Ethan Walker', po: 'PO-TG-9102', assets: ['C02YM5120A · MacBook Air 13" M2', 'JB65-0094410 · Jabra Evolve2 65'] },
  'ONB-1186': { client: 'acme', cc: 'SG', recipient: 'Sophie Tan', costCentre: 'CC-4410 Platform Eng', assets: ['C02XK4801A · MacBook Pro 14" M3', '2241LZ4802B · Logitech MX Master 3S'] },
  'ONB-1185': { client: 'cloud', cc: 'US', recipient: 'Grace Liu', assets: ['8HJ24990E · Dell XPS 15'] },
  'ONB-1184': { client: 'northwind', cc: 'US', recipient: 'Ryan Cooper', costCentre: 'IT-200', po: 'PO-NW-55120', assets: ['8HJ24810C · Dell XPS 15'] },
  'ONB-1182': { client: 'mediaworks', cc: 'SG', recipient: 'Arjun Mehta', costCentre: 'Design', assets: ['C02XK4777D · MacBook Pro 16" M3 Max'] },
  'ONB-1179': { client: 'mediaworks', cc: 'SG', recipient: 'Mei Lin Tan', costCentre: 'Design', assets: ['C02XK4655B · MacBook Pro 14" M3'] },
  'ONB-1188': { client: 'finance', cc: 'GB', recipient: 'Olivia Hart', assets: ['C02XK4130G · MacBook Pro 14" M3'] },
  'REP-0871': { client: 'techglobal', cc: 'SG', recipient: 'Lee Jun Hao', assets: ['8HJ2KL9 · Dell XPS 15'] },
  'REP-0412': { client: 'northwind', cc: 'US', recipient: 'James Whitfield', assets: ['C02TT4410K · MacBook Pro 14" M3'] },
  'DSP-0209': { client: 'techglobal', cc: 'US', recipient: '—', assets: ['7XK29P3 · Dell Latitude 7420'] }
};
const WO_EVENT = { ONB: 'deployment', ORD: 'deployment', OFF: 'retrieval', RDP: 'redeployment', REP: 'repair', DSP: 'disposal' };

// The fee event a step triggers, or null when the step isn't billable
function stepEvent(wo, step) {
  const ev = FEE_EVENTS.find(f => f.key === WO_EVENT[wo.split('-')[0]]);
  return ev && ev.trigger === step ? ev.key : null;
}
const billingTrigger = wo => { const ev = FEE_EVENTS.find(f => f.key === WO_EVENT[wo.split('-')[0]]); return ev ? ev.trigger : ''; };

/* ---------- Session store ---------- */

const billingStore = () => ({
  LEDGER, INVOICES, CREDIT_NOTES, STEP_LOG,
  ...(typeof DISPUTES !== 'undefined' && { DISPUTES }),
  ...(typeof SYNC_EVENTS !== 'undefined' && { SYNC_EVENTS, RECEIVING })
});
const readBilling = () => { try { return JSON.parse(sessionStorage.getItem(BILLING_KEY) || '{}'); } catch { return {}; } };

(function loadBilling() {
  const saved = readBilling();
  delete saved.WAIVERS;
  Object.entries(billingStore()).forEach(([k, arr]) => { if (saved[k]) arr.splice(0, arr.length, ...saved[k]); });
})();

function saveBilling() {
  const saved = readBilling();
  delete saved.WAIVERS;
  sessionStorage.setItem(BILLING_KEY, JSON.stringify({ ...saved, ...billingStore() }));
}

/* ---------- Lookups and ids ---------- */

const activeCharges = (wo, step) => LEDGER.filter(e => e.kind !== 'reversal' && e.wo === wo && e.step === step && !e.reversedBy && !e.credited);
const stepCharges = wo => LEDGER.filter(e => e.wo === wo).sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
const pendingBillingActionCount = () => DISPUTES.filter(d => !['resolved', 'rejected'].includes(d.status)).length + CREDIT_NOTES.filter(c => c.status === 'draft' && !c.dispute).length + LEDGER.filter(e => e.anomaly || e.pendingReversal).length;
const maxNum = (ids, re) => Math.max(0, ...ids.map(id => (id.match(re) || [0, 0])[1]).map(Number));
const nextCreditId = () => `CN-2026-${String(maxNum(CREDIT_NOTES.map(c => c.id), /CN-2026-(\d+)/) + 1).padStart(4, '0')}`;
const nextInvoiceNumber = () => `INV-2026-${String(Math.max(939, maxNum(INVOICES.map(i => i.id), /INV-2026-(\d+)/)) + 1).padStart(4, '0')}`;
const nextDraftId = () => `DRAFT-${String(maxNum(INVOICES.map(i => i.id), /DRAFT-(\d+)/) + 1).padStart(3, '0')}`;
const onLiveInvoice = e => INVOICES.find(i => i.status !== 'cancelled' && i.lines.some(l => l.ledger === e.id));

// "SGD 95.00 standard fee → USD 70.90 at 0.7463 (ECB, 16 Oct)"
function chargeBasisText(e) {
  const b = e.basis;
  if (!b) return '';
  if (b.managed) return `${fmtAmount(e.cur, e.unit)} per user (entity rate)`;
  if (b.device) return `Order revenue (products, shipping and fees, before tax) in ${e.cur}`;
  const fee = b.discount
    ? `${fmtAmount(b.feeCur, b.fee)} after ${b.discount.split(': ')[1]} on ${fmtAmount(b.feeCur, b.base)} ${b.custom ? 'contract exception' : 'standard fee'} (${WH_COUNTRIES[e.cc][1]})`
    : `${fmtAmount(b.feeCur, b.fee)} ${b.custom ? 'contract exception' : 'standard fee'} (${WH_COUNTRIES[e.cc][1]})`;
  return b.fx ? `${fee} → ${fmtAmount(e.cur, e.unit)} at ${b.fx.rate.toFixed(4)} · ${b.fx.source}, ${b.fx.on}` : fee;
}

/* ---------- Posting ---------- */

// Add an unbilled entry to its client × entity draft for the current run (one draft per entity, in its currency)
function postToDraft(e) {
  if (e.anomaly || e.pendingReversal || e.status !== 'unbilled' || onLiveInvoice(e)) return null;
  let inv = INVOICES.find(i => i.status === 'draft' && i.client === e.client && i.entity === e.entity);
  if (!inv) {
    const ent = entityById(CONTRACTS[e.client].terms, e.entity);
    inv = { id: nextDraftId(), client: e.client, entity: e.entity, period: 'Oct 2026 (to date)', issued: '', due: '', status: 'draft', po: '', cur: ent.currency, tax: invoiceTax(ent),
      payments: [], credits: [], history: [[e.at, 'System', 'Draft opened for the October run']], lines: [] };
    INVOICES.push(inv);
  }
  inv.lines.push(ledgerLine(e));
  inv.history.push([e.at, 'System', `${e.id} added · ${LEDGER_EVENT_LABEL[e.event]}${e.kind === 'reversal' ? ' reversal' : ''} · ${e.wo}`]);
  return inv;
}

// Complete a work order step. A billable step posts one charge per device; completing it again is blocked and flagged.
function completeStep({ wo, step, source, doc = '', cc, client, assets, recipient, costCentre, po }) {
  const o = BILLABLE_ORDERS[wo] || {};
  client = client || o.client;
  cc = cc || o.cc;
  const log = { wo, step, at: billNow(), source, doc, charges: [], blocked: [], note: '' };
  STEP_LOG.push(log);
  const event = stepEvent(wo, step);
  const k = client && CONTRACTS[client];
  if (!event || !k) log.note = `${step} isn't a billable step${billingTrigger(wo) ? `. ${LEDGER_EVENT_LABEL[WO_EVENT[wo.split('-')[0]]]} is charged on ${billingTrigger(wo)}` : ''}.`;
  else if (!isBillable(k.terms, event)) log.note = `${LEDGER_EVENT_LABEL[event]} isn't billable on this client's contract.`;
  else {
    (assets || o.assets || []).forEach(asset => {
      const dup = activeCharges(wo, step).find(x => x.asset === asset);
      if (dup) {
        // Same step completed twice: no second charge. Late evidence still attaches to the original.
        if (!dup.doc && doc) {
          dup.doc = doc;
          dup.anomaly = (dup.anomaly || '').split(' · ').filter(a => a && !a.startsWith('No evidence')).join(' · ');
          postToDraft(dup);
        }
        dup.dupBlocked = [...(dup.dupBlocked || []), { at: log.at, source, doc }];
        log.blocked.push(dup.id);
        return;
      }
      const e = makeCharge({ at: log.at, client, cc, event, wo, step, asset, recipient: recipient || o.recipient || '—', doc, costCentre: costCentre ?? o.costCentre ?? '', po: po ?? o.po ?? '', source });
      if (k.status === 'expired') e.anomaly = `Contract expired ${k.end}`;
      if (!doc) e.anomaly = ['No evidence document on the completed step', e.anomaly].filter(Boolean).join(' · ');
      LEDGER.push(e);
      postToDraft(e);
      log.charges.push(e.id);
    });
  }
  saveBilling();
  return log;
}

// Correct one charge: reversal while unbilled, draft credit note once invoiced
function correctCharge(e, reason, by = 'You') {
  if (e.status === 'invoiced') {
    const cn = { id: nextCreditId(), client: e.client, entity: e.entity, against: e.invoice, cur: e.cur, amount: e.amount, reason, status: 'draft', appliedTo: '', issued: '', ledger: e.id };
    CREDIT_NOTES.push(cn);
    e.credited = cn.id;
    return { cn };
  }
  const wasDrafted = !!onLiveInvoice(e);
  const rev = ledgerReverse(e, reason, by);
  if (wasDrafted) postToDraft(rev);
  return { rev };
}

// Undo a completed step (wrong match, wrong device, not actually delivered). The step reopens.
function correctStep(wo, step, reason, source) {
  const out = { reversed: [], credited: [] };
  activeCharges(wo, step).forEach(e => {
    e.pendingReversal = null;
    const r = correctCharge(e, reason);
    if (r.rev) out.reversed.push(r.rev); else out.credited.push(r.cn);
  });
  if (typeof SYNC_EVENTS !== 'undefined') {
    SYNC_EVENTS.filter(s => s.state === 'matched' && s.wo === wo && s.step === step).forEach(s => Object.assign(s, { state: 'unmatched', why: `Unmatched: ${reason}`, wo: '', step: '' }));
  }
  STEP_LOG.push({ wo, step, at: billNow(), source, corrected: [...out.reversed.map(r => r.id), ...out.credited.map(c => c.id)], note: reason });
  saveBilling();
  return out;
}

/* ---------- Reduce a charge ---------- */

// Which route fits: errors are corrected directly; goodwill needs approval; a client challenge is a dispute
const REDUCE_ROUTES = {
  error: { label: 'Our error', unbilled: 'Reversing entry now', invoiced: 'Draft credit note for Finance' },
  goodwill: { label: 'Goodwill', unbilled: 'Reversing entry now', invoiced: 'Credit note issued now' },
  dispute: { label: 'Client disputes it', invoiced: 'Dispute → investigation → credit note or charge stands' }
};
const reduceRoutes = e => Object.keys(REDUCE_ROUTES).filter(r => REDUCE_ROUTES[r][e.status]);
const creditsFor = e => CREDIT_NOTES.filter(c => c.ledger === e.id);

function openDispute(e, reason) {
  const inv = invoiceById(e.invoice);
  const id = `DIS-00${Math.max(33, ...DISPUTES.map(d => +d.id.slice(4))) + 1}`;
  const line = inv.lines.find(l => l.ledger === e.id);
  DISPUTES.unshift({ id, client: e.client, invoice: inv.id, wo: e.wo, raised: LEDGER_TODAY, raisedBy: 'You, for the client', status: 'open', owner: '', reason, notes: [], ledger: e.id });
  if (line) line.dispute = id;
  e.dispute = id;
  saveBilling();
  return id;
}

function approveCredit(cn, by = 'You') {
  Object.assign(cn, { status: 'issued', issued: LEDGER_TODAY, approvedBy: by });
  saveBilling();
}

// One-line summary of what a completion or correction did, for confirmation notes
function postingSummary(log) {
  const parts = [];
  const posted = log.charges.map(ledgerById);
  if (posted.length) {
    const byCur = sumByCurrency(posted.map(e => ({ cur: e.cur, amount: e.amount })));
    parts.push(`${posted.length} charge${posted.length > 1 ? 's' : ''} posted (${Object.entries(byCur).map(([c, v]) => fmtAmount(c, v)).join(', ')}) to ${entityById(CONTRACTS[posted[0].client].terms, posted[0].entity).name}`);
    if (posted[0].basis && posted[0].basis.fx) parts.push(`converted from ${posted[0].basis.feeCur} at ${posted[0].basis.fx.rate.toFixed(4)} (${posted[0].basis.fx.source})`);
    if (posted.some(e => e.anomaly)) parts.push('flagged for review in the ledger');
  }
  if (log.blocked.length) parts.push(`${log.blocked.length} already charged (${log.blocked.join(', ')}), so no second charge`);
  if (log.note) parts.push(log.note.replace(/\.$/, ''));
  return parts.join('; ');
}

function correctionSummary(out) {
  const parts = [];
  if (out.reversed.length) parts.push(`${out.reversed.length} reversing entr${out.reversed.length > 1 ? 'ies' : 'y'} (${out.reversed.map(r => r.id).join(', ')})`);
  if (out.credited.length) parts.push(`${out.credited.length} draft credit note${out.credited.length > 1 ? 's' : ''} (${out.credited.map(c => c.id).join(', ')}) for invoiced charges`);
  return parts.join(' and ') || 'no charges to correct';
}
