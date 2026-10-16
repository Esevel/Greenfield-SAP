// Invoices and credit notes. Every invoice line points at one ledger entry (its Source).
// Drafts for the current billing run are built from unbilled ledger entries. Needs hub-data.js, billing-data.js and ledger-data.js.

const INVOICE_TODAY = '2026-10-16';
const INVOICE_TERMS_DAYS = 30;
const INVOICE_TAX = { SG: ['GST', 9], MY: ['SST (service tax)', 8], AU: ['GST', 10], GB: ['VAT', 20], US: ['Sales tax (services exempt)', 0] };
const INVOICE_STATE = {
  draft: ['Draft', 'badge-neutral'],
  issued: ['Issued', 'badge-info'],
  overdue: ['Overdue', 'badge-error'],
  paid: ['Paid', 'badge-success'],
  cancelled: ['Cancelled', 'badge-muted']
};
const CREDIT_STATE = { draft: ['Awaiting approval', 'badge-warning'], issued: ['Issued · not applied', 'badge-info'], applied: ['Applied', 'badge-success'] };
const DEFAULT_STEP = { deployment: 'Delivered', retrieval: 'Received at hub', storage: 'Monthly accrual', redeployment: 'Delivered', repair: 'Repaired', disposal: 'Certificate issued', managed: 'Monthly snapshot' };

const invAddDays = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); const t = new Date(y, m - 1, d + n); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; };
const round2 = v => Math.round(v * 100) / 100;

const INVOICES = [];
const CREDIT_NOTES = [];

// Tax on services in the entity's country, unless the entity holds an exemption
const invoiceTax = ent => (ent.taxStatus.startsWith('Exempt') ? [`${INVOICE_TAX[ent.country][0]} · ${ent.taxStatus.toLowerCase()}`, 0] : INVOICE_TAX[ent.country]);
const ledgerLine = e => ({ kind: e.kind, event: e.event, cc: e.cc, wo: e.wo, asset: e.asset, step: e.step, recipient: e.recipient, doc: e.doc, po: e.po, costCentre: e.costCentre, qty: e.qty, unit: e.unit, amount: e.amount, dispute: '', ledger: e.id });

(function seedInvoices() {
  const L = (client, event, cc, wo, asset, x = {}) => {
    // Priced once the invoice entity (and so its currency) is known; see priceLine
    return { kind: 'charge', event, cc, wo, asset, step: x.step || DEFAULT_STEP[event], recipient: x.recipient || '—', doc: x.doc || '', po: x.po || '', costCentre: x.costCentre || '', qty: x.qty || 1, unit: x.unit, dispute: x.dispute || '' };
  };
  const pay = (date, ref, by = 'Finance · Wen') => ({ date, ref, by, receipt: `remittance-${ref.replace(/\W+/g, '').toLowerCase()}.pdf` });

  const raw = [
    { id: 'INV-2026-0890', client: 'acme', entity: 'e1', period: 'Aug 2026', issued: '2026-09-01', status: 'paid', payments: [pay('2026-09-24', 'DBS TT 88120')],
      lines: [
        L('acme', 'deployment', 'SG', 'ONB-1140', 'C02XK3300A · MacBook Pro 14" M3', { recipient: 'Nora Lim', costCentre: 'CC-4410 Platform Eng', doc: 'POD-CX-88250110.pdf' }),
        L('acme', 'deployment', 'SG', 'ONB-1144', 'C02XK3341C · MacBook Pro 14" M3', { recipient: 'Ben Ong', costCentre: 'CC-4410 Platform Eng', doc: 'POD-CX-88261904.pdf' }),
        L('acme', 'deployment', 'SG', 'ONB-1144', 'C02XK3341C · MacBook Pro 14" M3', { recipient: 'Ben Ong', costCentre: 'CC-4410 Platform Eng', doc: 'POD email duplicate', step: 'Delivered (duplicate)' }),
        L('acme', 'managed', 'SG', 'Billable users', '118 billable users', { qty: 118, step: 'Aug 2026 snapshot', doc: 'Snapshot MU-ACME-2026-08 (locked)' })
      ] },
    { id: 'INV-2026-0912', client: 'acme', entity: 'e1', period: 'Sep 2026', issued: '2026-10-01', status: 'issued', credits: [{ cn: 'CN-2026-0041' }],
      lines: [
        L('acme', 'retrieval', 'SG', 'OFF-2031', 'C02XK3501A · MacBook Pro 14" M3', { recipient: 'Daniel Ho', costCentre: 'CC-4410 Platform Eng', doc: 'Intake · 3 photos' }),
        L('acme', 'deployment', 'SG', 'ONB-1150', 'C02XK3611B · MacBook Pro 14" M3', { recipient: 'Kai Tan', costCentre: 'CC-4410 Platform Eng', doc: 'POD-CX-88301772.pdf' }),
        L('acme', 'deployment', 'SG', 'ONB-1152', 'FVFHG3620A · MacBook Air 13" M2', { recipient: 'Ivy Chen', costCentre: 'CC-2100 Sales', doc: 'POD-CX-88302010.pdf' }),
        L('acme', 'storage', 'SG', 'Storage', 'Singapore Hub · Sep 2026', { qty: 492, step: 'Sep 2026 · 492 device-days', doc: 'Daily hub snapshots 1–30 Sep' })
      ] },
    { id: 'INV-2026-0913', client: 'acme', entity: 'e2', period: 'Sep 2026', issued: '2026-10-01', status: 'issued',
      lines: [
        L('acme', 'redeployment', 'MY', 'RDP-0380', 'FVFHG3901C · MacBook Air 13" M2', { recipient: 'Aiman Yusof', costCentre: 'MY-Sales', doc: 'POD-CX-88310045.pdf' }),
        L('acme', 'retrieval', 'MY', 'OFF-2033', 'FVFHG3720B · MacBook Air 13" M2', { recipient: 'Farah Ismail', costCentre: 'MY-Sales', doc: 'Intake · 2 photos' }),
        L('acme', 'managed', 'MY', 'Billable users', '14 billable users', { qty: 14, step: 'Aug 2026 snapshot', doc: 'Snapshot MU-ACME-2026-08 (locked)' })
      ] },
    { id: 'INV-2026-0918', client: 'techglobal', entity: 'e1', period: 'Sep 2026', issued: '2026-10-01', status: 'issued', po: 'PO-TG-9050', reminder: '2026-10-16',
      lines: [
        L('techglobal', 'deployment', 'US', 'ONB-1160', '8HJ24102A · Dell XPS 15', { recipient: 'Maya Patel', po: 'PO-TG-9050', doc: 'fedex-7712440011.pdf' }),
        L('techglobal', 'deployment', 'US', 'ONB-1161', '8HJ24110C · Dell XPS 15', { recipient: 'Chris Wu', po: 'PO-TG-9050', doc: 'fedex-7712440057.pdf' }),
        L('techglobal', 'retrieval', 'US', 'OFF-2040', 'CN-0H8W2K-4501A · Dell UltraSharp U2723QE', { recipient: 'Jordan Blake', po: 'PO-TG-9050', doc: 'Return label only', dispute: 'DIS-0031' }),
        L('techglobal', 'managed', 'US', 'Billable users', '338 billable users', { qty: 338, po: 'PO-TG-9050', step: 'Sep 2026 snapshot', doc: 'Snapshot MU-TG-2026-09 (locked)' })
      ] },
    { id: 'INV-2026-0919', client: 'techglobal', entity: 'e2', period: 'Sep 2026', issued: '2026-10-01', status: 'issued', po: 'PO-TG-9077', payments: [{ ...pay('2026-10-12', 'JPM WIRE 55871', 'Finance · Marcus'), partial: 150 }],
      lines: [
        L('techglobal', 'deployment', 'SG', 'ONB-1158', 'C02XK3990D · MacBook Pro 14" M3', { recipient: 'Lee Jun Hao', po: 'PO-TG-9077', doc: 'POD-CX-88320991.pdf' }),
        L('techglobal', 'storage', 'SG', 'Storage', 'Singapore Hub · Sep 2026', { qty: 180, po: 'PO-TG-9077', step: 'Sep 2026 · 180 device-days', doc: 'Daily hub snapshots 1–30 Sep' }),
        L('techglobal', 'managed', 'SG', 'Billable users', '60 billable users', { qty: 60, po: 'PO-TG-9077', step: 'Sep 2026 snapshot', doc: 'Snapshot MU-TECH-2026-09 (locked)' })
      ] },
    { id: 'INV-2026-0921', client: 'digital', entity: 'e1', period: 'Sep 2026', issued: '2026-10-02', status: 'issued',
      lines: [
        L('digital', 'repair', 'AU', 'REP-0401', 'PF3Q3150A · Lenovo ThinkPad X1 Carbon', { recipient: 'Mia Russo', costCentre: 'OPS', doc: 'Repair report RR-0401.pdf', dispute: 'DIS-0033' }),
        L('digital', 'deployment', 'AU', 'ONB-1155', 'PF3Q3201B · Lenovo ThinkPad X1 Carbon', { recipient: 'Jack Nguyen', costCentre: 'ENG', doc: 'POD-CX-88315510.pdf' })
      ] },
    { id: 'INV-2026-0922', client: 'digital', entity: 'e2', period: 'Sep 2026', issued: '2026-10-02', status: 'paid', payments: [pay('2026-10-09', 'BARC FPS 77310')],
      lines: [L('digital', 'retrieval', 'GB', 'OFF-2036', 'C02XK3400B · MacBook Pro 14" M3', { recipient: 'Amelia Clarke', costCentre: 'UK-Ops', doc: 'dhl-JD014600006619.pdf' })] },
    { id: 'INV-2026-0925', client: 'mediaworks', entity: 'e1', period: 'Sep 2026', issued: '2026-09-15', status: 'issued', reminder: '2026-10-15',
      lines: [
        L('mediaworks', 'deployment', 'SG', 'ONB-1148', 'C02XK3555E · MacBook Pro 14" M3', { recipient: 'Zoe Lim', costCentre: 'Content', doc: 'POD-CX-88280911.pdf' }),
        L('mediaworks', 'managed', 'SG', 'Billable users', '61 billable users', { qty: 61, step: 'Aug 2026 snapshot', doc: 'Snapshot MU-MW-2026-08 (locked)' })
      ] },
    { id: 'INV-2026-0927', client: 'finance', entity: 'e1', period: 'Sep 2026', issued: '2026-10-01', status: 'paid', payments: [pay('2026-10-06', 'HSBC BACS 10442')],
      lines: [L('finance', 'deployment', 'GB', 'ONB-1162', 'FVFHG3870A · MacBook Air 13" M2', { recipient: 'Harriet Moss', doc: 'dhl-JD014600007020.pdf' })] },
    { id: 'INV-2026-0930', client: 'cloud', entity: 'e1', period: 'Sep 2026', issued: '2026-09-14', status: 'issued', po: 'PO-CS-3301',
      lines: [
        L('cloud', 'deployment', 'US', 'ONB-1159', '8HJ24140B · Dell XPS 15', { recipient: 'Sam Rivera', po: 'PO-CS-3301', doc: 'fedex-7712440300.pdf' }),
        L('cloud', 'managed', 'US', 'Billable users', '74 billable users', { qty: 74, po: 'PO-CS-3301', step: 'Aug 2026 snapshot', doc: 'Snapshot MU-CS-2026-08 (locked)' })
      ] },
    { id: 'INV-2026-0931', client: 'northwind', entity: 'e1', period: 'Sep 2026', issued: '2026-10-01', status: 'paid', po: 'PO-NW-55010', payments: [pay('2026-10-10', 'WF ACH 220981')],
      lines: [
        L('northwind', 'deployment', 'US', 'ONB-1157', 'C02XK3888A · MacBook Pro 14" M3', { recipient: 'Paula Grant', po: 'PO-NW-55010', costCentre: 'IT-200', doc: 'fedex-7712440211.pdf' }),
        L('northwind', 'managed', 'US', 'Billable users', '65 billable users', { qty: 65, po: 'PO-NW-55010', costCentre: 'IT-200', step: 'Aug 2026 snapshot', doc: 'Snapshot MU-NW-2026-08 (locked)' })
      ] },
    { id: 'INV-2026-0906', client: 'brightpath', entity: 'e1', period: 'Aug 2026', issued: '2026-09-03', status: 'paid', payments: [pay('2026-09-29', 'OCBC GIRO 4410')],
      history: [['2026-09-03 10:15', 'Finance · Wen', 'Re-issued to replace INV-2026-0905']],
      lines: [L('brightpath', 'deployment', 'SG', 'ONB-1139', 'PF3Q3010C · Lenovo ThinkPad X1 Carbon', { recipient: 'Mr Tan', costCentre: 'Teaching', doc: 'POD-CX-88240177.pdf' })] },
    { id: 'INV-2026-0905', client: 'brightpath', entity: 'e1', period: 'Aug 2026', issued: '2026-09-01', status: 'cancelled', cancelled: { at: '2026-09-03 10:12', by: 'Finance · Wen', reason: 'Issued with the wrong billing entity address' },
      lines: [L('brightpath', 'deployment', 'SG', 'ONB-1139', 'PF3Q3010C · Lenovo ThinkPad X1 Carbon', { recipient: 'Mr Tan', costCentre: 'Teaching', doc: 'POD-CX-88240177.pdf' })] }
  ];

  const priceLine = (t, ent, l) => {
    if (l.unit === undefined) l.unit = l.event === 'managed' ? ent.muRate : feeInCurrency(t, l.event, l.cc, ent.currency);
    l.amount = round2(l.unit * l.qty);
  };
  const fee = (client, event, cc) => { const t = CONTRACTS[client].terms; return feeInCurrency(t, event, cc, entityById(t, 'e1').currency); };

  // Credit notes first so applied credits can be valued
  CREDIT_NOTES.push(
    { id: 'CN-2026-0041', client: 'acme', entity: 'e1', against: 'INV-2026-0890', amount: fee('acme', 'deployment', 'SG'), reason: 'Deployment charged twice for ONB-1144 (duplicate proof of delivery)', status: 'applied', appliedTo: 'INV-2026-0912', issued: '2026-09-20', approvedBy: 'Finance · Wen' },
    { id: 'CN-2026-0043', client: 'mediaworks', entity: 'e1', against: 'INV-2026-0880', amount: 2 * fee('mediaworks', 'storage', 'SG') * 30, reason: 'Storage billed for 2 devices already redeployed (Aug)', status: 'issued', appliedTo: '', issued: '2026-10-03', approvedBy: 'Finance · Marcus' },
    { id: 'CN-2026-0044', client: 'techglobal', entity: 'e1', against: 'INV-2026-0918', amount: fee('techglobal', 'retrieval', 'US'), reason: 'Retrieval billed but the courier never collected the monitor', status: 'draft', appliedTo: '', issued: '', dispute: 'DIS-0031' }
  );
  CREDIT_NOTES.forEach(c => { c.cur = entityById(CONTRACTS[c.client].terms, c.entity).currency; c.amount = round2(c.amount); });

  // Link each line to a ledger entry (reuse seeded invoiced entries; create the rest as invoiced history)
  let seq = 39000;
  const linkLine = (inv, l) => {
    const found = LEDGER.find(e => e.invoice === inv.id && e.wo === l.wo && e.asset === l.asset) || LEDGER.find(e => e.status === 'invoiced' && e.wo === l.wo && e.asset === l.asset && e.step === l.step && inv.status === 'cancelled');
    if (found) { l.ledger = found.id; return; }
    const k = CONTRACTS[inv.client];
    const e = { id: `LE-${++seq}`, kind: 'charge', status: 'invoiced', invoice: inv.id, at: `${invAddDays(inv.issued, -1)} 23:00`, client: inv.client, cc: l.cc, event: l.event, wo: l.wo, step: l.step, asset: l.asset, recipient: l.recipient, doc: l.doc, entity: inv.entity, costCentre: l.costCentre, po: l.po, qty: l.qty, unit: l.unit, cur: inv.cur, amount: l.amount };
    LEDGER.push(e);
    l.ledger = e.id;
  };

  raw.sort((a, b) => (a.status === 'cancelled') - (b.status === 'cancelled')).forEach(r => {
    const k = CONTRACTS[r.client];
    const ent = k.terms.entities.find(e => e.id === r.entity);
    const inv = { po: '', payments: [], credits: [], history: [], ...r, cur: ent.currency, due: invAddDays(r.issued, INVOICE_TERMS_DAYS), tax: invoiceTax(ent) };
    inv.lines.forEach(l => priceLine(k.terms, ent, l));
    if (r.client === 'techglobal' && r.id === 'INV-2026-0918') inv.due = invAddDays(r.issued, 14);
    if (r.client === 'mediaworks') inv.due = invAddDays(r.issued, 30);
    if (r.client === 'cloud') inv.due = invAddDays(r.issued, 30);
    inv.lines.forEach(l => linkLine(inv, l));
    inv.credits = inv.credits.map(c => ({ ...c, amount: CREDIT_NOTES.find(x => x.id === c.cn).amount }));
    const t = invoiceTotals(inv);
    inv.payments = inv.payments.map(p => ({ ...p, amount: p.partial || (r.status === 'paid' ? t.total - t.credits : 0) })).filter(p => p.amount);
    inv.history = [
      [`${invAddDays(r.issued, -1)} 23:30`, 'System', 'Generated from billing run'],
      [`${r.issued} 09:00`, 'Finance · Wen', `Issued and sent to ${ent.contact}`],
      ...(r.reminder ? [[`${r.reminder} 09:00`, 'System', 'Overdue reminder sent']] : []),
      ...inv.payments.map(p => [`${p.date} 14:00`, p.by, `Payment ${fmtAmount(inv.cur, p.amount)} recorded · ${p.ref}`]),
      ...inv.credits.map(c => [`${CREDIT_NOTES.find(x => x.id === c.cn).issued} 11:00`, 'Finance · Wen', `Credit note ${c.cn} applied`]),
      ...(r.cancelled ? [[r.cancelled.at, r.cancelled.by, `Cancelled: ${r.cancelled.reason}`]] : []),
      ...(r.history || [])
    ].sort((a, b) => a[0].localeCompare(b[0]));
    INVOICES.push(inv);
  });

  // Drafts for the October run: unbilled entries per client × billing entity, excluding anything flagged
  let d = 0;
  WH_CLIENTS.forEach(c => {
    const k = CONTRACTS[c.id];
    k.terms.entities.forEach(ent => {
      const entries = LEDGER.filter(e => e.client === c.id && e.entity === ent.id && e.status === 'unbilled' && !e.anomaly && !e.pendingReversal);
      if (!entries.length) return;
      const id = `DRAFT-${String(++d).padStart(3, '0')}`;
      INVOICES.push({
        id, client: c.id, entity: ent.id, period: 'Oct 2026 (to date)', issued: '', due: '', status: 'draft', po: '', cur: ent.currency, tax: invoiceTax(ent),
        payments: [], credits: [], history: [[`${INVOICE_TODAY} 06:00`, 'System', `Draft built from ${entries.length} unbilled ledger entries`]],
        lines: entries.map(ledgerLine)
      });
    });
  });
})();

function invoiceTotals(inv) {
  const subtotal = round2(inv.lines.reduce((s, l) => s + l.amount, 0));
  const tax = round2(subtotal * inv.tax[1] / 100);
  const total = round2(subtotal + tax);
  const credits = round2((inv.credits || []).reduce((s, c) => s + c.amount, 0));
  const paid = round2((inv.payments || []).reduce((s, p) => s + p.amount, 0));
  return { subtotal, tax, total, credits, paid, balance: round2(total - credits - paid) };
}

function invoiceState(inv) {
  if (inv.status !== 'issued') return inv.status;
  if (invoiceTotals(inv).balance <= 0) return 'paid';
  return inv.due < INVOICE_TODAY ? 'overdue' : 'issued';
}

const invoiceById = id => INVOICES.find(i => i.id === id);
const invoiceEntity = inv => CONTRACTS[inv.client].terms.entities.find(e => e.id === inv.entity);
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);
const invoiceDisputes = inv => [...new Set(inv.lines.map(l => l.dispute).filter(Boolean))];
