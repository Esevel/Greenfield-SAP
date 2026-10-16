// Ops inputs that complete billable steps: courier proof of delivery / return receipts (Sync inbox) and hub intake (Receiving).
// Needs hub-data.js.

const SYNC_SOURCES = {
  courierx: 'Courier X API', dhl: 'DHL Express webhook', fedex: 'FedEx API', email: 'Email (pod@esevel.com)'
};
const SYNC_KINDS = { pod: 'Proof of delivery', return: 'Return receipt' };

// matched: linked to a work order milestone; suggested: one likely match to confirm; unmatched: none found; ignored
const SYNC_EVENTS = [
  { id: 's1', at: '2026-10-16 15:42', source: 'courierx', kind: 'pod', ref: 'CX-88412093', recipient: 'Sophie Tan', cc: 'SG', signedBy: 'S. Tan', doc: 'POD-CX-88412093.pdf',
    state: 'matched', wo: 'ONB-1186', step: 'Delivered', client: 'acme' },
  { id: 's2', at: '2026-10-16 14:10', source: 'fedex', kind: 'pod', ref: '7712 4459 0021', recipient: 'Ryan Cooper', cc: 'US', signedBy: 'R COOPER', doc: 'fedex-7712445900.pdf',
    state: 'matched', wo: 'ONB-1184', step: 'Delivered', client: 'northwind' },
  { id: 's3', at: '2026-10-16 11:05', source: 'courierx', kind: 'return', ref: 'CX-88409911', recipient: 'Singapore Hub', cc: 'SG', signedBy: 'Hub SG · Ahmad', doc: 'RET-CX-88409911.pdf',
    state: 'suggested', wo: 'OFF-2061', step: 'Received at hub', client: 'mediaworks', why: 'Sender address matches Leo Tan (leaver)' },
  { id: 's4', at: '2026-10-16 09:30', source: 'email', kind: 'pod', ref: 'Scan from courier', recipient: 'J. Whitfield', cc: 'US', signedBy: 'Illegible', doc: 'IMG_2231.jpg',
    state: 'unmatched', client: '', why: 'No tracking number in the document' },
  { id: 's5', at: '2026-10-15 17:48', source: 'dhl', kind: 'return', ref: 'JD014600009112', recipient: 'Digital Solutions · London office', cc: 'GB', signedBy: 'Reception', doc: 'dhl-JD0146.pdf',
    state: 'suggested', wo: 'OFF-2055', step: 'Received at site', client: 'digital', why: 'Tracking number on OFF-2055 return label' },
  { id: 's6', at: '2026-10-15 16:20', source: 'fedex', kind: 'pod', ref: '7712 4459 1187', recipient: 'Grace Liu', cc: 'US', signedBy: '', doc: '',
    state: 'unmatched', client: '', why: 'Tracking number not on any work order' },
  { id: 's7', at: '2026-10-15 10:02', source: 'courierx', kind: 'pod', ref: 'CX-88400117', recipient: 'Arjun Mehta', cc: 'SG', signedBy: 'A. Mehta', doc: 'POD-CX-88400117.pdf',
    state: 'matched', wo: 'ONB-1182', step: 'Delivered', client: 'mediaworks' },
  { id: 's8', at: '2026-10-14 18:30', source: 'dhl', kind: 'pod', ref: 'JD014600008870', recipient: 'Test parcel', cc: 'GB', signedBy: '', doc: '',
    state: 'ignored', client: '', why: 'Courier test event' }
];

const SYNC_STATE = { matched: ['Matched', 'badge-success'], suggested: ['Confirm match', 'badge-warning'], unmatched: ['Unmatched', 'badge-error'], ignored: ['Ignored', 'badge-neutral'] };

// Open work orders an unmatched event could belong to
const SYNC_OPEN_ORDERS = [
  { wo: 'ONB-1194', client: 'techglobal', who: 'Ethan Walker', step: 'Delivered', cc: 'US' },
  { wo: 'ONB-1185', client: 'cloud', who: 'Grace Liu', step: 'Delivered', cc: 'US' },
  { wo: 'ONB-1179', client: 'mediaworks', who: 'Mei Lin Tan', step: 'Delivered', cc: 'SG' },
  { wo: 'OFF-2044', client: 'techglobal', who: 'Kevin Brooks', step: 'Received at hub', cc: 'US' },
  { wo: 'ONB-1188', client: 'finance', who: 'Olivia Hart', step: 'Delivered', cc: 'GB' },
  { wo: 'REP-0412', client: 'northwind', who: 'James Whitfield', step: 'Returned to user', cc: 'US' }
];

/* ---------- Receiving: hub intake ---------- */

const GRADES = { A: 'Like new', B: 'Light wear', C: 'Visible wear', D: 'Damaged / for parts' };

// expected: inbound to a hub with a work order; status flips to received when intake is recorded
const RECEIVING = [
  { id: 'r1', hub: 1, wo: 'OFF-2061', client: 'mediaworks', from: 'Leo Tan (leaver)', serial: 'C02XK4511G', model: 'MacBook Pro 14" M3', eta: '2026-10-16', tracking: 'CX-88409911', status: 'arrived', outcome: 'redeploy' },
  { id: 'r2', hub: 1, wo: 'OFF-2061', client: 'mediaworks', from: 'Leo Tan (leaver)', serial: 'F0T324558D', model: 'Apple Magic Keyboard', eta: '2026-10-16', tracking: 'CX-88409911', status: 'arrived', outcome: 'store' },
  { id: 'r3', hub: 4, wo: 'OFF-2044', client: 'techglobal', from: 'Kevin Brooks (leaver)', serial: 'CN-0H8W2K-4733B', model: 'Dell UltraSharp U2723QE', eta: '2026-10-15', tracking: '7712 4459 0877', status: 'received',
    grade: 'B', condition: 'used', notes: 'Light scuff on stand', photos: 3, receivedAt: '2026-10-15 14:20', receivedBy: 'Hub US East · Mike', outcome: 'store' },
  { id: 'r4', hub: 4, wo: 'OFF-2044', client: 'techglobal', from: 'Kevin Brooks (leaver)', serial: 'CN-0H8W2K-4740C', model: 'Dell UltraSharp U2723QE', eta: '2026-10-15', tracking: '7712 4459 0877', status: 'received',
    grade: 'C', condition: 'used', notes: 'Dead pixel cluster, lower left', photos: 4, receivedAt: '2026-10-15 14:26', receivedBy: 'Hub US East · Mike', outcome: 'store' },
  { id: 'r5', hub: 1, wo: 'OFF-2063', client: 'finance', from: 'Oliver Grant (leaver)', serial: 'FVFHG4336E', model: 'MacBook Air 13" M2', eta: '2026-10-22', tracking: '', status: 'expected', outcome: 'redeploy' },
  { id: 'r6', hub: 8, wo: 'OFF-2066', client: 'northwind', from: 'Emma Wilson (leaver)', serial: 'C02XK4692H', model: 'MacBook Pro 14" M3', eta: '2026-10-29', tracking: '', status: 'expected', outcome: 'redeploy' },
  { id: 'r7', hub: 3, wo: 'RDP-0388', client: 'digital', from: 'Vendor B (restock PO-7740)', serial: 'PF3Q5011A', model: 'Lenovo ThinkPad X1 Carbon', eta: '2026-10-16', tracking: 'VB-55102', status: 'arrived', outcome: 'store' }
];
const RECEIVING_STATUS = { expected: ['Expected', 'badge-info'], arrived: ['Arrived · to inspect', 'badge-warning'], received: ['Received', 'badge-success'] };
