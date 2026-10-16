// Repair quotes: diagnostic findings, quote to the client admin, vendor cost evidence (staff only), client decision.
// Needs hub-data.js and billing-data.js.

const QUOTE_STATE = {
  draft: ['Preparing quote', 'badge-neutral'],
  sent: ['Awaiting client', 'badge-warning'],
  decided: ['Client decided', 'badge-success'],
  expired: ['Expired · no reply', 'badge-error']
};
const QUOTE_DECISIONS = { repair: 'Repair', replace: 'Replace', writeoff: 'Write off' };
const QUOTE_VALID_DAYS = 7;

// lines: client price per line in the contract currency. vendorCost: what the facility charges Esevel (never shown to clients).
const REPAIR_QUOTES = [
  { id: 'REP-0869', client: 'mediaworks', device: 'MacBook Pro 14" M3', serial: 'C02XK4W5MD6T', user: 'Zoe Lim', facility: 'iFix Kuala Lumpur', state: 'sent', created: '2026-10-11', sent: '2026-10-13 15:20', sentTo: 'Aisha Rahman',
    findings: 'Liquid residue under the left keyboard area. 6 keys dead, top case corrosion. Logic board tested OK. Not covered: accidental damage, device out of AppleCare.',
    files: ['diag-REP-0869.pdf', 'photo-topcase-1.jpg', 'photo-topcase-2.jpg'],
    lines: [['Top case with keyboard (part)', 520], ['Labour · top case replacement', 110]],
    vendorQuote: 'iFix-Q-22871.pdf', vendorCost: 455,
    replace: { model: 'MacBook Pro 14" M3 (new)', price: 2899 }, writeoff: { value: 180, note: 'Device kept for parts; asset retired' },
    audit: [['2026-10-11 10:05', 'Ops · Aisha', 'Quote created'], ['2026-10-12 16:40', 'iFix Kuala Lumpur', 'Diagnostic report and vendor quote uploaded'], ['2026-10-13 15:20', 'Ops · Aisha', 'Sent to Aisha Rahman (client admin)'], ['2026-10-15 09:00', 'System', 'Reminder sent to client']] },
  { id: 'REP-0874', client: 'digital', device: 'Lenovo ThinkPad X1 Carbon', serial: 'PF3QW8ZN', user: 'Jack Nguyen', facility: 'FixPoint London', state: 'draft', created: '2026-10-14',
    findings: 'Lid hinge cracked at the left mount; display cable pinched, causing flicker. Display panel itself OK.',
    files: ['diag-REP-0874.pdf'],
    lines: [['Hinge set (part)', 95], ['Display cable (part)', 60]],
    vendorQuote: '', vendorCost: 120,
    replace: { model: 'Lenovo ThinkPad X1 Carbon Gen 12', price: 2650 }, writeoff: { value: 0, note: '' },
    audit: [['2026-10-14 11:00', 'Ops · Jia Ling', 'Quote created'], ['2026-10-15 14:10', 'FixPoint London', 'Diagnostic report uploaded']] },
  { id: 'REP-0876', client: 'techglobal', device: 'Dell UltraSharp U2723QE', serial: 'CN-0H8W2K-74512', user: 'Maya Patel', facility: 'TechCare New Jersey', state: 'decided', created: '2026-10-08', sent: '2026-10-09 10:30', sentTo: 'Sarah Kim',
    findings: 'Panel has a 12-pixel dead cluster and backlight bleed on the right edge. Panel replacement needed.',
    files: ['diag-REP-0876.pdf', 'photo-panel.jpg'],
    lines: [['LCD panel (part)', 310], ['Labour · panel swap', 55]],
    vendorQuote: 'TechCare-7731.pdf', vendorCost: 280,
    replace: { model: 'Dell UltraSharp U2723QE (new)', price: 449 }, writeoff: { value: 40, note: '' },
    decision: { choice: 'replace', by: 'Sarah Kim', at: '2026-10-10 08:12 CT', ip: '72.14.201.9', note: 'Repair is most of the price of a new one. Replace and recycle the old unit.' },
    audit: [['2026-10-08 09:15', 'Ops · Qonit', 'Quote created'], ['2026-10-08 17:30', 'TechCare New Jersey', 'Diagnostic report and vendor quote uploaded'], ['2026-10-09 10:30', 'Ops · Qonit', 'Sent to Sarah Kim (client admin)'], ['2026-10-10 08:12', 'Sarah Kim', 'Decision: Replace'], ['2026-10-10 09:00', 'System', 'Replacement order ORD-58771 raised; old unit routed to disposal']] },
  { id: 'REP-0871', client: 'techglobal', device: 'Dell XPS 15', serial: '8HJ2KL9', user: 'Lee Jun Hao', facility: 'Dell Service Centre Singapore', state: 'decided', created: '2026-10-09', sent: '2026-10-10 09:00', sentTo: 'Sarah Kim',
    findings: 'Logic board failure, no power. Covered under Dell ProSupport for parts; Esevel repair handling fee applies.',
    files: ['dell-sr-88213.pdf'],
    lines: [['Logic board (warranty, no charge)', 0]],
    vendorQuote: 'dell-sr-88213.pdf', vendorCost: 0,
    replace: { model: 'Dell XPS 15 (new)', price: 1649 }, writeoff: { value: 0, note: '' },
    decision: { choice: 'repair', by: 'Sarah Kim', at: '2026-10-10 11:40 CT', ip: '72.14.201.9', note: '' },
    audit: [['2026-10-09 14:00', 'Ops · Jia Ling', 'Quote created'], ['2026-10-10 09:00', 'Ops · Jia Ling', 'Sent to Sarah Kim (client admin)'], ['2026-10-10 11:40', 'Sarah Kim', 'Decision: Repair']] },
  { id: 'REP-0858', client: 'acme', device: 'MacBook Air 13" M1', serial: 'FVFDK1Q2MD6T', user: 'Ben Ong', facility: 'iFix Kuala Lumpur', state: 'expired', created: '2026-09-25', sent: '2026-09-26 10:00', sentTo: 'Ravi Shah',
    findings: 'Display cracked and logic board water damage. Repair exceeds device value.',
    files: ['diag-REP-0858.pdf'],
    lines: [['Display assembly (part)', 640], ['Logic board (part)', 780], ['Labour', 140]],
    vendorQuote: 'iFix-Q-22610.pdf', vendorCost: 1210,
    replace: { model: 'MacBook Air 13" M2 (new)', price: 1699 }, writeoff: { value: 60, note: 'Recommended: device is 4 years old' },
    audit: [['2026-09-25 13:00', 'Ops · Aisha', 'Quote created'], ['2026-09-26 10:00', 'Ops · Aisha', 'Sent to Ravi Shah (client admin)'], ['2026-09-29 09:00', 'System', 'Reminder sent to client'], ['2026-10-03 10:00', 'System', 'Quote expired after 7 days without a decision']] }
];

REPAIR_QUOTES.forEach(q => { q.cur = parentEntity(CONTRACTS[q.client].terms).currency; });

const quoteById = id => REPAIR_QUOTES.find(q => q.id === id);
// Client total = parts and labour + the contract repair handling fee (per country of the client's first entity)
function quoteTotals(q) {
  const k = CONTRACTS[q.client];
  const cc = k.terms.entities[0].country;
  const p = priceCharge(q.client, 'repair', cc);
  const fee = p.fee.billable ? p.amount : 0;
  const parts = q.lines.reduce((s, l) => s + l[1], 0);
  const total = parts + fee;
  return { parts, fee, total, margin: total - q.vendorCost, marginPct: total ? ((total - q.vendorCost) / total) * 100 : 0 };
}
