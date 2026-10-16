// Disputes (client challenges a billed line).
// Needs hub-data.js, billing-data.js, ledger-data.js and invoice-data.js.

const DISPUTE_STATE = {
  open: ['Open', 'badge-error'],
  investigating: ['Investigating', 'badge-warning'],
  resolved: ['Resolved · credited', 'badge-success'],
  rejected: ['Rejected · charge stands', 'badge-neutral']
};

// Lines are referenced by invoice + ledger entry; amounts come from the invoice line
const DISPUTES = [
  { id: 'DIS-0031', client: 'techglobal', invoice: 'INV-2026-0918', wo: 'OFF-2040', raised: '2026-10-08', raisedBy: 'Sarah Kim', status: 'investigating', owner: 'CS · Aisha',
    reason: 'We were billed for retrieving a monitor from Jordan Blake, but the courier never collected it. Jordan still has it at home.',
    notes: [
      { at: '2026-10-09 10:20', by: 'CS · Aisha', text: 'Courier X shows a return label created but no pickup scan.' },
      { at: '2026-10-14 16:05', by: 'Ops · Mike', text: 'Not received at US East Hub. Charge was triggered by label creation, not receipt. Our error.' }
    ],
    creditNote: 'CN-2026-0044' },
  { id: 'DIS-0033', client: 'digital', invoice: 'INV-2026-0921', wo: 'REP-0401', raised: '2026-10-13', raisedBy: 'Hannah Clarke', status: 'open', owner: '',
    reason: 'Repair was covered under the manufacturer warranty, so there should be no repair fee.', notes: [] },
  { id: 'DIS-0029', client: 'acme', invoice: 'INV-2026-0890', wo: 'ONB-1144', raised: '2026-09-12', raisedBy: 'Ravi Shah', status: 'resolved', owner: 'Billing · Wen',
    reason: 'Ben Ong\'s laptop deployment appears twice on the August invoice.',
    notes: [{ at: '2026-09-15 11:30', by: 'Billing · Wen', text: 'Duplicate proof-of-delivery email created a second charge. Confirmed.' }],
    resolution: 'You were right: the deployment was charged twice because the courier sent the proof of delivery twice. We have credited SGD 114.00 on your September invoice.',
    creditNote: 'CN-2026-0041', closed: '2026-09-20' },
  { id: 'DIS-0030', client: 'mediaworks', invoice: 'INV-2026-0925', wo: 'Billable users', raised: '2026-10-02', raisedBy: 'Aisha Rahman', status: 'rejected', owner: 'Billing · Marcus',
    reason: 'We only have 55 active staff, not 61.',
    notes: [{ at: '2026-10-05 09:40', by: 'Billing · Marcus', text: 'Snapshot shows 61 users holding an Assigned laptop on 31 Aug, including 6 leavers whose devices weren\'t returned yet.' }],
    resolution: 'The August count is based on users holding an assigned device on the last day of the month. 6 leavers still had their laptops on 31 Aug, so they were billable. Once those devices are returned they drop off the count.',
    closed: '2026-10-05' }
];

// Find the disputed invoice line (and its amount) for a dispute
function disputeLine(d) {
  const inv = invoiceById(d.invoice);
  const line = inv && (inv.lines.find(l => l.dispute === d.id || l.disputeClosed === d.id) || inv.lines.findLast(l => l.wo === d.wo));
  return { inv, line };
}

const disputeClosed = d => d.status === 'resolved' || d.status === 'rejected';
const disputeForLedger = entry => DISPUTES.find(d => {
  if (d.ledger === entry.id) return true;
  const { line } = disputeLine(d);
  return line && line.ledger === entry.id;
});
const canRaiseDispute = entry => entry.status === 'invoiced' && entry.kind !== 'reversal' && !entry.credited && !entry.reversedBy && !disputeForLedger(entry);

