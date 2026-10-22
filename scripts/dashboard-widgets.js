// Dashboard widgets: each declares what access it needs; RBAC decides who sees it.
// Gating keys: requires (capability), minLevel, function (level checked within that function), when(user).
// Figures are hardcoded to match the tiles on the linked screens (as of 22 Oct 2026).
window.DashboardWidgets = (() => {
  const SECTIONS = {
    sla: 'SLA',
    commercial: 'Commercial',
    clients: 'Clients',
    operations: 'Operations',
    procurement: 'Procurement',
    vendors: 'Vendors',
    it_euc: 'IT',
    people: 'People',
    integrations: 'Integrations'
  };

  const CATEGORIES = {
    URGENT: { label: 'Urgent', priority: 1 },
    PENDING_APPROVAL: { label: 'Decision', priority: 2 },
    NEEDS_ATTENTION: { label: 'Needs attention', priority: 3 },
    UPCOMING: { label: 'Upcoming', priority: 4 }
  };

  // Tracker · All by risk
  const SLA = {
    link: '/pages/tracker/all.html',
    open: 115, ok: 79, risk: 25, breached: 11,
    types: [
      { label: 'Orders', open: 38, risk: 7, breached: 2, link: '/pages/tracker/orders.html' },
      { label: 'Onboarding', open: 24, risk: 6, breached: 4, link: '/pages/tracker/onboarding.html' },
      { label: 'Offboarding', open: 19, risk: 4, breached: 1, link: '/pages/tracker/offboarding.html' },
      { label: 'Support', open: 14, risk: 3, breached: 1, link: '/pages/tracker/support.html' },
      { label: 'Repairs', open: 8, risk: 2, breached: 1, link: '/pages/tracker/repairs.html' },
      { label: 'Redeployments', open: 7, risk: 1, breached: 1, link: '/pages/tracker/redeployments.html' },
      { label: 'Disposal', open: 4, risk: 1, breached: 1, link: '/pages/tracker/disposal.html' },
      { label: 'Storage', open: 3, risk: 1, breached: 0, link: '/pages/tracker/storage.html' }
    ],
    overdue: [
      { id: 'DSP-0207', client: 'FinanceExperts', milestone: 'Data wipe', late: '9d 13h', blocker: 'Wipe failed on 1 of 4 drives', link: '/pages/tracker/disposal.html' },
      { id: 'OFF-2055', client: 'Digital Solutions', milestone: 'Collected', late: '6d 20h', blocker: 'Awaiting courier', link: '/pages/tracker/offboarding-detail.html' },
      { id: 'RED-0311', client: 'MediaWorks', milestone: 'Repackage', late: '6d 8h', blocker: '', link: '/pages/tracker/redeployments.html' },
      { id: 'ORD-30398', client: 'Acme Tech', milestone: 'Vendor delivery', late: '5d 18h', blocker: 'Missing import permit', link: '/pages/tracker/orders.html' },
      { id: 'ONB-1188', client: 'FinanceExperts', milestone: 'Procured', late: '5d 18h', blocker: '1 line ETA after due date', link: '/pages/tracker/onboarding.html' }
    ]
  };

  // Order management (Control Tower). Open counts per service match Tracker tabs (they sum to 117; the tracker's
  // Open tile says 115). The split by stage is illustrative.
  // Stages: New (not started), In progress (milestones under way), Waiting on partner (blocked by a vendor, courier,
  // repair or disposal partner), Waiting on client (blocked by the client), Delivered (final milestone done, awaiting
  // sign-off). Delivered is still open in the tracker.
  const OMS_STAGES = [
    { id: 'new', label: 'New' },
    { id: 'progress', label: 'In progress' },
    { id: 'partner', label: 'Waiting on partner', tone: 'warn' },
    { id: 'client', label: 'Waiting on client', tone: 'warn' },
    { id: 'delivered', label: 'Delivered' }
  ];
  const OMS_PIPELINE = [
    { label: 'Orders', link: '/pages/tracker/orders.html', stages: { new: 4, progress: 23, partner: 6, client: 1, delivered: 4 }, risk: 7, breached: 2 },
    { label: 'Onboarding', link: '/pages/tracker/onboarding.html', stages: { new: 3, progress: 12, partner: 4, client: 2, delivered: 3 }, risk: 6, breached: 4 },
    { label: 'Offboarding', link: '/pages/tracker/offboarding.html', stages: { new: 2, progress: 11, partner: 3, client: 1, delivered: 2 }, risk: 4, breached: 1 },
    { label: 'Support', link: '/pages/tracker/support.html', stages: { new: 3, progress: 9, partner: 0, client: 2, delivered: 0 }, risk: 3, breached: 1 },
    { label: 'Repairs', link: '/pages/tracker/repairs.html', stages: { new: 1, progress: 4, partner: 2, client: 1, delivered: 0 }, risk: 2, breached: 1 },
    { label: 'Redeployments', link: '/pages/tracker/redeployments.html', stages: { new: 1, progress: 5, partner: 0, client: 0, delivered: 1 }, risk: 1, breached: 1 },
    { label: 'Disposal', link: '/pages/tracker/disposal.html', stages: { new: 0, progress: 2, partner: 2, client: 0, delivered: 0 }, risk: 1, breached: 1 },
    { label: 'Storage', link: '/pages/tracker/storage.html', stages: { new: 1, progress: 2, partner: 0, client: 0, delivered: 0 }, risk: 1, breached: 0 }
  ];
  const OMS_TOTALS = OMS_STAGES.reduce((t, s) => ({ ...t, [s.id]: OMS_PIPELINE.reduce((n, r) => n + r.stages[s.id], 0) }), {});
  const OMS_OPEN = Object.values(OMS_TOTALS).reduce((a, b) => a + b, 0);
  // Rush orders, VIP / exec requests and anything start-date or SLA critical. Overdue from Tracker · All by risk.
  const PRIORITY_ORDERS = [
    { id: 'ONB-1186', client: 'Acme Tech', cc: 'SG', why: 'Starts today', stage: 'Imaged / Provisioned', owner: 'Qonit', waiting: 'Esevel ops', due: '5d 10h overdue', state: 'bad', link: '/pages/tracker/onboarding-detail.html?id=ONB-1186' },
    { id: 'ONB-1188', client: 'FinanceExperts', cc: 'GB', why: 'Start date at risk', stage: 'Procured · 1 of 2 lines', owner: 'Jia Ling', waiting: 'Vendor (backorder)', due: '5d 18h overdue', state: 'bad', link: '/pages/tracker/onboarding.html' },
    { id: 'ORD-30398', client: 'Acme Tech', cc: 'SG', why: 'Rush order', stage: 'Vendor delivery', owner: 'Aisha', waiting: 'Customs broker', due: '5d 18h overdue', state: 'bad', link: '/pages/tracker/orders.html' },
    { id: 'SUP-5538', client: 'TechGlobal Inc', cc: 'US', why: 'Urgent ticket', stage: 'First response', owner: 'Esevel Ops', waiting: 'Esevel ops', due: '18m left', state: 'warn', link: '/pages/tracker/support.html' },
    { id: 'ONB-1194', client: 'TechGlobal Inc', cc: 'US', why: 'Starts 3 Nov', stage: 'Initiated', owner: 'Qonit', waiting: 'Client HR', due: '4d 19h overdue', state: 'bad', link: '/pages/tracker/onboarding.html' },
    { id: 'REP-0871', client: 'TechGlobal Inc', cc: 'SG', why: 'Exec device', stage: 'Repair / loaner sent', owner: 'Jia Ling', waiting: 'Vendor (Dell part)', due: '5d 10h overdue', state: 'bad', link: '/pages/tracker/work-order.html?wo=REP-0871' },
    { id: 'ONB-1190', client: 'TechGlobal Inc', cc: 'SG', why: 'Starts Mon', stage: 'Dispatched', owner: 'Qonit', waiting: 'Courier pickup', due: '4d 20h overdue', state: 'bad', link: '/pages/tracker/onboarding.html' },
    { id: 'ORD-30455', client: 'Acme Tech', cc: 'SG', why: 'Rush order', stage: 'Prep & reimage', owner: 'Marcus', waiting: 'Hub', due: '4d 21h overdue', state: 'bad', link: '/pages/tracker/orders.html' }
  ];

  // Billing (Ledger, Invoices), Stock · Storage fees, Clients · Procurement caps, repair quotes and client catalogues
  const COMMERCIAL = {
    money: [
      { label: 'Unbilled charges', sub: '24 charges in the ledger', link: '/pages/billing/ledger.html',
        amounts: [['AUD', '114.00'], ['GBP', '74.00'], ['MYR', '1,179.00'], ['SGD', '2,779.99'], ['USD', '1,818.61']] },
      { label: 'Outstanding invoices', sub: '7 issued · 3 overdue', link: '/pages/billing/invoices.html',
        amounts: [['AUD', '289.30'], ['MYR', '1,615.68'], ['SGD', '1,625.27'], ['USD', '5,969.01']] },
      { label: 'Storage fees / month', sub: '139 devices in hubs', link: '/pages/stock/fees.html',
        amounts: [['MYR', '201.00'], ['SGD', '625.50'], ['USD', '1,179.00']] }
    ],
    margins: [
      { label: 'Devices', value: '7–9%', sub: 'Contract price over vendor cost', link: '/pages/catalogue/model/client-catalogues.html',
        amounts: [['SGD', '155.84'], ['GBP', '142.00']], sgdCaption: 'per unit across 2 client listings' },
      { label: 'Repairs', value: '38%', sub: 'Avg of 4 quotes with parts · lowest 27%', link: '/pages/tracker/repair-quotes.html',
        amounts: [['SGD', '699.00'], ['AUD', '149.00'], ['USD', '153.00']], sgdCaption: 'across those 4 quotes' }
    ],
    caps: { over: 1, near: 3, renewing: 2, link: '/pages/clients/caps.html' }
  };

  // Internal reporting only: SGD equivalents never feed client billing. Rates per 1 USD, as in Settings · FX.
  const FX_MONTH_END = { date: '30 Sep 2026', perUSD: { USD: 1, SGD: 1.34, MYR: 4.45, AUD: 1.52, GBP: 0.79, EUR: 0.92 } };
  const toSGD = amounts => amounts.reduce((sum, [cur, amt]) =>
    sum + (parseFloat(amt.replace(/,/g, '')) / FX_MONTH_END.perUSD[cur]) * FX_MONTH_END.perUSD.SGD, 0);
  const sgd = n => `≈ SGD ${Math.round(n).toLocaleString('en-US')}`;

  // Finance trends in SGD K (internal, illustrative). Oct is month to date; Q4 to date = Oct = 48.2K, margin 21.4%.
  const FINANCE_TRENDS = {
    months: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
    revenue: [60.4, 59.2, 62.3, 63.5, 64.9, 48.2],
    projected: 67.9,
    margin: [19.6, 19.9, 20.0, 20.2, 20.4, 21.4],
    streams: [
      { label: 'Devices', share: 0.46, color: '#1d4ed8' },
      { label: 'Billable users', share: 0.24, color: '#3b82f6' },
      { label: 'Service fees', share: 0.17, color: '#60a5fa' },
      { label: 'Repairs', share: 0.08, color: '#93c5fd' },
      { label: 'Storage', share: 0.05, color: '#bfdbfe' }
    ]
  };

  // Country coverage: one entry per country we provision in. Add a country by adding an entry; totals are derived.
  // Vendors come from Vendors, Warehouses, supply data and repair partners on work orders. Strings are active;
  // objects with a status (on hold, offboarded) are listed but don't count as cover. Clients from hub assignments.
  // pos is [lon, lat], used for countries too small to draw at world scale. openWOs is illustrative.
  const SERVICES = [
    { id: 'hardware', label: 'Hardware', want: 2 },
    { id: 'hub', label: 'Hub', want: 1 },
    { id: 'courier', label: 'Courier', want: 2 },
    { id: 'repair', label: 'Repair', want: 2 },
    { id: 'itad', label: 'Disposal', want: 2 }
  ];
  const REGIONS = ['APAC', 'Americas', 'EMEA'];
  const COUNTRY_COVERAGE = [
    { cc: 'SG', name: 'Singapore', region: 'APAC', pos: [103.8, 1.35], openWOs: 41,
      clients: ['Acme Tech', 'TechGlobal Inc', 'MediaWorks', 'FinanceExperts', 'Northwind Health', 'BrightPath Education'],
      vendors: { hardware: ['Vendor A', 'Ingram Micro'], hub: ['Singapore Hub (Hub SG Logistics)'], courier: ['Courier X', 'DHL Express'],
        repair: ['Dell Service Centre Singapore'], itad: [{ name: 'GreenCycle ITAD', status: 'On hold' }] } },
    { cc: 'MY', name: 'Malaysia', region: 'APAC', pos: [101.7, 3.1], openWOs: 12,
      clients: ['Acme Tech', 'TechGlobal Inc', 'MediaWorks', 'BrightPath Education'],
      vendors: { hardware: ['Vendor A', 'Ingram Micro'], hub: ['Kuala Lumpur Hub (Kerry Logistics)'], courier: ['Courier X', 'DHL Express'],
        repair: ['iFix Kuala Lumpur', { name: 'TechMend Repairs', status: 'Offboarded' }], itad: [] },
      notes: ['BrightPath Education has no hub assigned here; its stock stays at client sites'] },
    { cc: 'AU', name: 'Australia', region: 'APAC', pos: [134, -25], openWOs: 21,
      clients: ['Acme Tech', 'TechGlobal Inc', 'Digital Solutions', 'MediaWorks', 'CloudSystems', 'BrightPath Education'],
      vendors: { hardware: ['Vendor B', 'Ingram Micro'], hub: ['Sydney Hub (Kerry Logistics)'], courier: ['Courier X', 'DHL Express'],
        repair: [], itad: [{ name: 'GreenCycle ITAD', status: 'On hold' }] } },
    { cc: 'US', name: 'United States', region: 'Americas', pos: [-98, 39], openWOs: 32,
      clients: ['Acme Tech', 'TechGlobal Inc', 'MediaWorks', 'CloudSystems', 'Northwind Health'],
      vendors: { hardware: ['Vendor C', 'Ingram Micro'], hub: ['US East Hub', 'US West Hub'], courier: ['FedEx'],
        repair: ['TechCare New Jersey'], itad: [] } },
    { cc: 'GB', name: 'United Kingdom', region: 'EMEA', pos: [-1.5, 52.5], openWOs: 9,
      clients: ['Digital Solutions', 'FinanceExperts'],
      vendors: { hardware: ['Vendor B'], hub: [{ name: 'London Hub', status: 'Decommissioned Mar 2026' }], courier: ['DHL Express'],
        repair: ['FixPoint London'], itad: [] },
      notes: ['Digital Solutions and FinanceExperts hold UK stock at their own sites'] }
  ];
  const isActive = v => typeof v === 'string';
  const vendorName = v => (isActive(v) ? v : v.name);
  const serviceState = (c, s) => {
    const n = c.vendors[s.id].filter(isActive).length;
    return n === 0 ? 'gap' : n < s.want ? 'single' : 'ok';
  };
  // Map colour: any service missing outranks single-vendor risk
  function coverageOf(c) {
    const states = SERVICES.map(s => serviceState(c, s));
    const gaps = states.filter(x => x === 'gap').length;
    const singles = states.filter(x => x === 'single').length;
    return { gaps, singles, covered: SERVICES.length - gaps, level: gaps >= 2 ? 'bad' : gaps === 1 ? 'warn' : singles ? 'single' : 'ok' };
  }
  const COVERAGE_TOTALS = COUNTRY_COVERAGE.reduce((t, c) => {
    const cov = coverageOf(c);
    return { gaps: t.gaps + cov.gaps, singles: t.singles + cov.singles };
  }, { gaps: 0, singles: 0 });

  // clientTier follows plan: Enterprise plans are Key Accounts, Growth and Essentials are General Accounts
  const SAMPLE = {
    contracts: [
      { client: 'Acme Tech', clientTier: 'enterprise', state: 'pending' },
      { client: 'TechGlobal', clientTier: 'enterprise', state: 'pending' },
      { client: 'MediaWorks', clientTier: 'smb', state: 'renewing' },
      { client: 'CloudSystems', clientTier: 'smb', state: 'expired' }
    ],
    joiners: [
      { name: 'Hafiz Rahman', client: 'MediaWorks', clientTier: 'smb', start: 'today', atRisk: true },
      { name: 'Priya Nair', client: 'Acme Tech', clientTier: 'enterprise', start: '26 Oct' },
      { name: 'Daniel Okafor', client: 'TechGlobal', clientTier: 'enterprise', start: '28 Oct' },
      { name: 'Chloe Martin', client: 'Digital Solutions', clientTier: 'smb', start: '29 Oct' },
      { name: 'Grace Liu', client: 'CloudSystems', clientTier: 'smb', start: '2 Nov' },
      { name: 'Tom Fletcher', client: 'FinanceExperts', clientTier: 'smb', start: '16 Nov' }
    ],
    leavers: [
      { name: 'Marcus Lee', client: 'Acme Tech', clientTier: 'enterprise', date: '23 Oct' },
      { name: 'Anna Schmidt', client: 'TechGlobal', clientTier: 'enterprise', date: '30 Oct' },
      { name: 'Isabella Rossi', client: 'Digital Solutions', clientTier: 'smb', date: '6 Nov', needsInfo: true },
      { name: 'Siti Nurhaliza', client: 'MediaWorks', clientTier: 'smb', date: '13 Nov' }
    ],
    // Service reports: September status per client
    reports: [
      { client: 'Acme Tech', clientTier: 'enterprise', state: 'review' },
      { client: 'TechGlobal', clientTier: 'enterprise', state: 'draft' },
      { client: 'Northwind Health', clientTier: 'enterprise', state: 'review' },
      { client: 'Digital Solutions', clientTier: 'smb', state: 'draft' },
      { client: 'MediaWorks', clientTier: 'smb', state: 'none' },
      { client: 'FinanceExperts', clientTier: 'smb', state: 'none' },
      { client: 'CloudSystems', clientTier: 'smb', state: 'none' },
      { client: 'BrightPath Education', clientTier: 'smb', state: 'none' }
    ],
    supportAtRisk: [
      { id: 'SUP-5521', client: 'Acme Tech', clientTier: 'enterprise', text: 'Resolution 5d 15h overdue' },
      { id: 'SUP-5538', client: 'TechGlobal', clientTier: 'enterprise', text: 'First response due in 18m' }
    ],
    slaAtRisk: [
      { client: 'Acme Tech', clientTier: 'enterprise' },
      { client: 'TechGlobal', clientTier: 'enterprise' },
      { client: 'MediaWorks', clientTier: 'smb' }
    ]
  };

  const visible = (user, capability, records) => records.filter(r => user.canSeeRecord(capability, r));
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const clientNames = records => [...new Set(records.map(r => r.client))].join(', ');
  const unscoped = capability => user => user.scopeFor(capability) === null;
  const scoped = capability => user => user.scopeFor(capability) !== null;
  const CS_LEAD = { function: 'customer_success', minLevel: 'function_lead' };
  const IT_LEADS = { function: 'it_euc', minLevel: 'team_lead' };
  const BILLING = { requires: 'billing' };
  const csLeadView = user => !user.isHead && user.can(null, CS_LEAD);
  // CS lead and members share the client-portfolio layout, scoped to the clients they can see
  const csView = user => !user.isHead && user.can('clients');
  // Shared people/integration items are scoped to the client's tier for CS; other teams see them all
  const forTier = tier => user => !user.can('clients') || user.canSeeRecord('clients', { clientTier: tier });
  const procView = user => !user.isHead && user.can('purchase_orders');
  // Control Tower only (Siti also runs Service Delivery, so she keeps the ops layout)
  const towerView = user => !user.isHead && user.can('coordination') && !user.can('shipments');
  // IT Services members only; Karen and Justin keep the lead view
  const itView = user => !user.isHead && user.levelIn('it_euc') === 'member';
  // IT function lead only (Justin is team lead and also in Service Delivery, so he keeps the shared layout)
  const itLeadView = user => !user.isHead && user.levelIn('it_euc') === 'function_lead';
  // Picks the figure for the viewer's client scope; leads and the head get 'all'
  const byTier = (capability, values) => user => {
    const scopes = user.scopeFor(capability);
    return scopes && scopes.length === 1 ? values[scopes[0].clientTier] : values.all;
  };

  // Summary cards: up to 6, picked by priority (p, lowest first) across all of a person's roles, then shown in list order.
  // delta = [direction, good: true | false | null (neutral), text]. Rates and averages compare Q4 to date with Q3;
  // running totals compare with the same days of Q3. spark = last 13 weeks, current week last. History is illustrative.
  const CARDS_MAX = 6;
  const HEAD = { minLevel: 'head', p: 0 };
  const IT_MEMBER = user => user.levelIn('it_euc') === 'member';
  const FINANCE = { requires: 'finance_reporting', p: 0 };
  const outstanding = COMMERCIAL.money.find(m => m.label === 'Outstanding invoices');
  const unbilled = COMMERCIAL.money.find(m => m.label === 'Unbilled charges');
  const SPARK = {
    revenue: [12.1, 13.4, 12.8, 14.0, 13.6, 14.9, 15.2, 14.4, 15.8, 16.1, 15.7, 16.4, 16.9],
    woOpened: [118, 124, 121, 129, 126, 131, 128, 136, 133, 138, 135, 141, 142],
    woDone: [92, 98, 95, 101, 99, 104, 102, 107, 105, 110, 108, 113, 116],
    tickets: [131, 138, 135, 142, 140, 147, 144, 151, 149, 155, 152, 160, 166],
    resolved: [127, 134, 132, 139, 137, 143, 141, 148, 146, 152, 149, 156, 161],
    deliveries: [52, 55, 54, 58, 57, 60, 59, 62, 61, 64, 63, 66, 67],
    vendorOrders: [36, 38, 37, 40, 39, 41, 40, 43, 42, 44, 43, 45, 44]
  };
  const share = (points, f) => points.map(v => Math.round(v * f));
  const SUPPORT = '/pages/tracker/support.html';

  const CARDS = [
    // Head
    { ...FINANCE, label: 'Revenue this quarter', value: '≈ SGD 48.2K', delta: ['up', true, '9% vs same days of Q3'],
      note: 'Charges earned, billed or not', spark: SPARK.revenue, link: '/pages/billing/ledger.html' },
    { ...FINANCE, label: 'Gross margin', value: '21.4%', delta: ['up', true, '1.2 pts vs Q3'],
      note: '≈ SGD 10.3K this quarter', link: '/pages/catalogue/model/client-catalogues.html' },
    { ...HEAD, label: 'Work orders completed', value: '342', delta: ['up', true, '8% vs same days of Q3'],
      note: '115 open now', spark: SPARK.woDone, link: '/pages/tracker/all.html' },
    { ...HEAD, label: 'Tickets', value: '486', delta: ['up', null, '12% vs same days of Q3'],
      note: 'Avg resolution 9h 40m · target 16h', spark: SPARK.tickets, link: SUPPORT },
    { ...HEAD, label: 'Billable users', value: '767', delta: ['up', true, '0.5% vs end of Q3'],
      note: '5 per-user contracts · Oct count locks 1 Nov', link: '/pages/clients/list.html' },
    // Head sees what's owed in the side Revenue & margin panel instead
    { ...FINANCE, when: user => !user.isHead, label: 'Outstanding invoices', value: sgd(toSGD(outstanding.amounts)), tone: 'warn',
      note: outstanding.sub, link: outstanding.link },
    { ...HEAD, label: 'Work orders within SLA', value: '91.6%', delta: ['down', false, '1.8 pts vs Q3'],
      note: '11 open breached · 25 at risk', link: '/pages/tracker/all.html' },

    // Finance
    { p: 1, requires: 'finance_reporting', label: 'Unbilled charges', value: sgd(toSGD(unbilled.amounts)),
      note: `${unbilled.sub} · 10 draft invoices in the October run`, link: unbilled.link },
    { p: 2, requires: 'billing', label: 'Overdue invoices', value: '3', tone: 'bad', note: 'Past due date', link: '/pages/billing/invoices.html' },
    { p: 3, requires: 'billing', label: 'Billing items to review', value: '5', tone: 'warn',
      note: '2 disputes · 1 reversal request · 2 ledger anomalies', link: '/pages/billing/needs-action.html' },

    // Support: CS (scoped by client tier) and IT
    { p: 3, requires: 'support', when: user => !IT_MEMBER(user), label: 'Tickets this quarter',
      value: byTier('support', { all: '486', smb: '204', enterprise: '282' }),
      delta: byTier('support', { all: ['up', null, '12% vs same days of Q3'], smb: ['up', null, '9% vs same days of Q3'], enterprise: ['up', null, '14% vs same days of Q3'] }),
      note: byTier('support', { all: '471 resolved', smb: '199 resolved', enterprise: '272 resolved' }),
      spark: byTier('support', { all: SPARK.tickets, smb: share(SPARK.tickets, 0.42), enterprise: share(SPARK.tickets, 0.58) }), link: SUPPORT },
    // IT Services: live queue first, then how the team is tracking
    { p: 0, requires: 'support', when: IT_MEMBER, label: 'Unassigned tickets', value: '3', tone: 'bad',
      note: 'SUP-5538 urgent · first response due in 18m', link: SUPPORT },
    { p: 0, requires: 'support', when: IT_MEMBER, label: 'Breached or at risk', value: '3', tone: 'warn',
      note: 'SUP-5517 2h 15m overdue · SUP-5521 52m left', link: SUPPORT },
    { p: 0, requires: 'support', when: IT_MEMBER, label: 'Open tickets', value: '12',
      note: '3 new · 3 triage · 4 with tech · 2 waiting on client', link: SUPPORT },
    { p: 0, requires: 'breakfix', when: IT_MEMBER, label: 'Repairs in flight', value: '8', tone: 'warn',
      note: '2 at risk · REP-0869 1 day late back', link: '/pages/tracker/repairs.html' },
    { p: 0, requires: 'support', when: IT_MEMBER, label: 'Resolved this week', value: '69', delta: ['up', true, '4% vs same days last week'],
      note: '471 this quarter', spark: SPARK.resolved, link: SUPPORT },
    { p: 0, requires: 'support', when: IT_MEMBER, label: 'First response in target', value: '95%', delta: ['up', true, '3 pts vs Q3'],
      note: 'Avg 1h 12m · target 2h', link: SUPPORT },
    { p: 1, requires: 'support', label: 'Avg first response',
      value: byTier('support', { all: '1h 12m', smb: '58m', enterprise: '1h 21m' }),
      delta: byTier('support', { all: ['down', true, '18% faster than Q3'], smb: ['down', true, '11% faster than Q3'], enterprise: ['down', true, '21% faster than Q3'] }),
      note: byTier('support', { all: '95% within 2h target', smb: '97% within 2h target', enterprise: '94% within 2h target' }), link: SUPPORT },
    { p: 2, requires: 'support', label: 'Avg resolution',
      value: byTier('support', { all: '9h 40m', smb: '8h 55m', enterprise: '10h 15m' }),
      delta: byTier('support', { all: ['down', true, '6% faster than Q3'], smb: ['down', true, '4% faster than Q3'], enterprise: ['down', true, '7% faster than Q3'] }),
      note: byTier('support', { all: '92% within 16h target', smb: '94% within 16h target', enterprise: '91% within 16h target' }), link: SUPPORT },

    // Customer Success
    { p: 4, requires: 'clients', label: 'Contracts needing attention',
      value: user => visible(user, 'clients', SAMPLE.contracts).length,
      note: user => {
        const list = visible(user, 'clients', SAMPLE.contracts);
        const n = state => list.filter(c => c.state === state).length;
        return [n('pending') && `${n('pending')} pending acceptance`, n('renewing') && `${n('renewing')} renewing by Jan`, n('expired') && `${n('expired')} expired`].filter(Boolean).join(' · ');
      }, link: '/pages/clients/list.html' },
    { p: 6, requires: 'clients', label: 'September service reports',
      value: user => `${visible(user, 'clients', SAMPLE.reports).length} to issue`,
      note: user => {
        const list = visible(user, 'clients', SAMPLE.reports);
        const n = state => list.filter(r => r.state === state).length;
        return [n('draft') && `${n('draft')} draft`, n('review') && `${n('review')} in review`, n('none') && `${n('none')} not generated`].filter(Boolean).join(' · ');
      }, tone: 'warn', link: '/pages/reports/service-reports.html' },
    { p: 6, requires: 'clients', when: csView, label: 'Open work order breaches',
      value: byTier('clients', { all: '11', smb: '6', enterprise: '5' }), tone: 'bad',
      note: byTier('clients', { all: 'Acme Tech 3 · FinanceExperts, MediaWorks, TechGlobal 2 each', smb: 'FinanceExperts, MediaWorks 2 each · 2 more clients 1 each', enterprise: 'Acme Tech 3 · TechGlobal 2' }),
      link: '/pages/tracker/all.html' },
    { p: 5, requires: 'clients', when: user => !csView(user), label: 'Joiners',
      value: user => visible(user, 'clients', SAMPLE.joiners).length,
      note: user => {
        const list = visible(user, 'clients', SAMPLE.joiners);
        const risk = list.filter(j => j.atRisk).length;
        return [list[0] && `${list[0].name} starts ${list[0].start}`, risk && `${risk} at risk`].filter(Boolean).join(' · ');
      }, link: '/pages/people/joiners.html' },
    { p: 5, requires: 'clients', when: user => !csView(user), label: 'Leavers',
      value: user => visible(user, 'clients', SAMPLE.leavers).length,
      note: user => {
        const list = visible(user, 'clients', SAMPLE.leavers);
        const info = list.filter(l => l.needsInfo).length;
        return [list[0] && `${list[0].name} leaves ${list[0].date}`, info && `${info} needs info`].filter(Boolean).join(' · ');
      }, link: '/pages/people/leavers.html' },
    // IT leads and members
    { p: 4, requires: 'support', ...IT_LEADS, label: 'Reopened tickets', value: '4.1%', delta: ['down', true, '0.8 pts vs Q3'],
      note: '19 of 471 resolved', link: SUPPORT },
    { p: 5, requires: 'breakfix', ...IT_LEADS, label: 'Repair turnaround', value: '7.4 days', delta: ['down', true, '0.6 days faster than Q3'],
      note: '61 repairs this quarter · 1 open breached', link: '/pages/tracker/repairs.html' },
    { p: 6, requires: 'onboarding', ...IT_LEADS, label: 'Onboarding set up on time', value: '84.2%', delta: ['down', false, '3.1 pts vs Q3'],
      note: '52 onboardings this quarter · 4 open breached', link: '/pages/tracker/onboarding.html' },

    // Control Tower: order status (Vinh)
    { p: 0, requires: 'coordination', when: towerView, label: 'Open', value: String(OMS_OPEN), delta: ['up', null, '8 vs last week'],
      note: `${SLA.breached} breached · ${SLA.risk} at risk`, link: '/pages/tracker/all.html' },
    { p: 0, requires: 'coordination', when: towerView, label: 'New', value: String(OMS_TOTALS.new), tone: 'warn',
      note: 'Not started · oldest 6h', link: '/pages/tracker/all.html' },
    { p: 0, requires: 'coordination', when: towerView, label: 'In progress', value: String(OMS_TOTALS.progress),
      note: 'Milestones under way', link: '/pages/tracker/all.html' },
    { p: 0, requires: 'coordination', when: towerView, label: 'Blocked', value: String(OMS_TOTALS.partner + OMS_TOTALS.client), tone: 'bad',
      note: `${OMS_TOTALS.partner} on partners · ${OMS_TOTALS.client} on clients`, link: '/pages/tracker/all.html' },
    { p: 0, requires: 'coordination', when: towerView, label: 'Delivered, awaiting sign-off', value: String(OMS_TOTALS.delivered),
      note: 'Proof or setup confirmation needed', link: '/pages/tracker/sync-inbox.html' },
    { p: 0, requires: 'coordination', when: towerView, label: 'Completed this week', value: '86', delta: ['up', true, '11% vs last week'],
      note: '342 this quarter · 91.6% within SLA', spark: SPARK.woDone, link: '/pages/tracker/all.html' },

    // Control Tower: shared with Siti
    { p: 1, requires: 'coordination', label: 'Work orders opened', value: '418', delta: ['up', null, '6% vs same days of Q3'],
      note: 'Across all services', spark: SPARK.woOpened, link: '/pages/tracker/all.html' },
    { p: 2, requires: 'coordination', label: 'Work orders completed', value: '342', delta: ['up', true, '8% vs same days of Q3'],
      note: '115 open now', spark: SPARK.woDone, link: '/pages/tracker/all.html' },
    { p: 3, requires: 'coordination', label: 'Within SLA', value: '91.6%', delta: ['down', false, '1.8 pts vs Q3'],
      note: 'Completed this quarter', link: '/pages/tracker/all.html' },
    { p: 4, requires: 'coordination', label: 'Breached now', value: '11', tone: 'bad',
      note: 'Longest: DSP-0207, 9d 13h overdue', link: '/pages/tracker/all.html' },
    { p: 5, requires: 'coordination', label: 'At risk now', value: '25', tone: 'warn',
      note: '75%+ of milestone used · of 115 open', link: '/pages/tracker/all.html' },
    { p: 6, requires: 'coordination', label: 'Delivery proofs to match', value: '4',
      note: '2 unmatched · 2 to confirm', link: '/pages/tracker/sync-inbox.html' },

    // Service Delivery
    { p: 1, requires: 'shipments', label: 'Deliveries this quarter', value: '196', delta: ['up', null, '10% vs same days of Q3'],
      note: 'Orders, onboarding and redeployments', spark: SPARK.deliveries, link: '/pages/tracker/orders.html' },
    { p: 2, requires: 'shipments', label: 'Delivered on time', value: '89.3%', delta: ['down', false, '1.2 pts vs Q3'],
      note: 'Against the Delivered milestone', link: '/pages/tracker/all.html' },
    { p: 3, requires: 'warehouses', label: 'Avg hub prep to dispatch', value: '1.6 days', delta: ['down', true, '0.2 days faster than Q3'],
      note: 'Target 2 days', link: '/pages/stock/warehouses.html' },
    { p: 4, requires: 'stock', label: 'Stock needing attention', value: '6', tone: 'warn',
      note: '3 restock proposals to send', link: '/pages/stock/list.html' },
    { p: 5, requires: 'shipments', label: 'Devices to inspect', value: '3', note: '2 more expected at hubs', link: '/pages/stock/receiving.html' },
    { p: 6, requires: 'stock', label: 'Stored 90+ days', value: '68', delta: ['up', false, '9 vs end of Q3'],
      note: 'Review with clients: redeploy or dispose', link: '/pages/stock/fees.html' },

    // Procurement: the orders themselves
    { p: 1, requires: 'purchase_orders', label: 'Vendor orders this quarter', value: '132', delta: ['up', null, '7% vs same days of Q3'],
      note: 'Regular, rush and bulk', spark: SPARK.vendorOrders, link: '/pages/tracker/orders.html' },
    { p: 2, requires: 'purchase_orders', label: 'POs to place', value: '4', tone: 'warn',
      note: '5 more awaiting client approval', link: '/pages/tracker/orders.html' },
    { p: 3, requires: 'purchase_orders', label: 'Late at vendor delivery', value: '3', tone: 'bad',
      note: 'ORD-30398 · ORD-30421 · ONB-1188', link: '/pages/tracker/orders.html' },
    { p: 4, requires: 'purchase_orders', label: 'Partial deliveries', value: '2', tone: 'warn',
      note: 'ONB-1182 · ONB-1193 · 1 line late on each', link: '/pages/tracker/onboarding.html' },
    { p: 5, requires: 'purchase_orders', label: 'Restock proposals', value: '3 to send', note: '1 awaiting client approval', link: '/pages/stock/restock.html' },
    { p: 6, requires: 'purchase_orders', label: 'Clients over / near cap', value: '1 / 3', note: 'Orders above cap need client approval', link: '/pages/clients/caps.html' },

    // Partnerships: how vendors perform over time, and which ones we use
    { p: 1, requires: 'vendor_performance', label: 'Hardware delivery on time', value: '86.5%', delta: ['down', false, '2.4 pts vs Q3'],
      note: 'Vendor C lowest at 72%', link: '/pages/vendors/list.html' },
    { p: 2, requires: 'vendor_performance', label: 'Courier deliveries on time', value: '91%', delta: ['down', false, '1.5 pts vs Q3'],
      note: 'Courier X · pickups 94% · 3 missed', link: '/pages/vendors/detail.html' },
    { p: 3, requires: 'vendor_performance', label: 'Repair partner turnaround', value: '5.2 days', delta: ['down', true, '0.4 days faster than Q3'],
      note: 'iFix, FixPoint, TechCare', link: '/pages/tracker/repairs.html' },
    { p: 4, requires: 'vendor_performance', label: 'Disposal certificates on time', value: '97%', delta: ['up', true, '1 pt vs Q3'],
      note: 'GreenCycle ITAD (on hold)', link: '/pages/tracker/disposal.html' },
    { p: 5, requires: 'vendor_performance', label: 'Service gaps', value: String(COVERAGE_TOTALS.gaps), tone: COVERAGE_TOTALS.gaps ? 'bad' : '',
      note: `${COVERAGE_TOTALS.singles} more single-vendor · across ${COUNTRY_COVERAGE.length} countries`, link: '/pages/vendors/list.html' },
    { p: 6, requires: 'vendor_performance', label: 'Vendor contracts renewing', value: '1', note: 'Courier X, 31 Mar 2027 · 4 suppliers Jun 2027', link: '/pages/vendors/detail.html' }
  ];

  const PANELS = {
    sla: { requires: 'sla', when: unscoped('sla') },
    commercial: BILLING,
    margins: { requires: 'finance_reporting' },
    internalSGD: { requires: 'finance_reporting' },
    // Partnerships members get their own layout with the coverage map
    coverage: { requires: 'vendor_performance', when: user => !user.isHead },
    // Finance gets Revenue & margin as the main full-width panel; the head keeps the side panel
    financeWide: { requires: 'finance_reporting', when: user => user.positions.some(p => p.functionId === 'finance') }
  };

  const METRICS = [
    { section: 'clients', ...CS_LEAD, label: 'Active contracts', value: '5', note: '2 amendments pending · 1 expired', link: '/pages/clients/list.html' },
    { section: 'clients', ...CS_LEAD, label: 'Renewing by Jan 2027', value: '1', link: '/pages/clients/list.html' },

    { section: 'operations', requires: 'work_orders', when: user => !isVisible(PANELS.sla, user), label: 'Open work orders', value: '115', note: '11 breached · 25 at risk', tone: 'down', link: '/pages/tracker/all.html' },
    { section: 'operations', requires: 'stock', label: 'Devices in stock', value: '155', note: '139 in hubs · 129 available', link: '/pages/stock/list.html' },
    { section: 'operations', requires: 'stock', label: 'Stock needing attention', value: '6', note: 'Below threshold, awaiting restock or aged', tone: 'down', link: '/pages/stock/list.html' },
    { section: 'operations', requires: 'shipments', label: 'Receiving', value: '5', note: '3 to inspect · 2 expected', link: '/pages/stock/receiving.html' },

    { section: 'vendors', requires: 'vendors', label: 'Active vendors', value: '9', note: '1 on hold · 1 offboarded', link: '/pages/vendors/list.html' },
    { section: 'vendors', requires: 'vendors', label: 'Vendor integrations', value: '1 failing', note: 'DHL Express', tone: 'down', link: '/pages/vendors/list.html' },

    { section: 'it_euc', requires: 'breakfix', label: 'Open repairs', value: '8', note: '1 breached · 2 at risk', link: '/pages/tracker/repairs.html' },
    { section: 'it_euc', requires: 'onboarding', label: 'Onboarding / offboarding', value: '24 / 19', note: 'Open work orders', link: '/pages/tracker/onboarding.html' },

    { section: 'people', requires: 'people', label: 'Joiners', value: '6', note: 'Next: Hafiz Rahman, starts today', link: '/pages/people/joiners.html' },
    { section: 'people', requires: 'people', label: 'Leavers', value: '4', note: 'Next: Marcus Lee, 23 Oct', link: '/pages/people/leavers.html' },

    { section: 'integrations', requires: 'integrations', label: 'Client integrations', value: '7', note: '4 healthy · 2 degraded · 1 failing', tone: 'down', link: '/pages/integrations/list.html' },
    { section: 'integrations', requires: 'integrations', label: 'Errors in queue', value: '57', link: '/pages/integrations/list.html' }
  ];

  const ACTIONS = [
    // Billing queue (Billing · Needs action)
    { section: 'commercial', ...BILLING, category: 'PENDING_APPROVAL', title: '2 open billing disputes', description: 'TechGlobal (retrieval charge) · Digital Solutions (warranty repair)', link: '/pages/billing/needs-action.html' },
    { section: 'commercial', ...BILLING, category: 'PENDING_APPROVAL', title: 'Reversal requested: LE-40147', description: 'TechGlobal · USD 85.07 · device arrived damaged', link: '/pages/billing/needs-action.html' },
    { section: 'commercial', ...BILLING, category: 'NEEDS_ATTENTION', title: '2 ledger anomalies', description: 'MediaWorks duplicate charge · CloudSystems charge with no evidence', link: '/pages/billing/needs-action.html' },
    { section: 'commercial', ...BILLING, category: 'URGENT', title: '3 invoices overdue', description: 'Past due date', link: '/pages/billing/invoices.html' },
    { section: 'commercial', ...BILLING, category: 'UPCOMING', title: '10 draft invoices in the October run', description: 'Generated from the ledger', link: '/pages/billing/invoices.html' },

    // Clients
    { section: 'clients', ...CS_LEAD, category: 'NEEDS_ATTENTION', title: '1 client over procurement cap', description: 'Orders above cap need client approval · 3 more near cap', link: '/pages/clients/caps.html' },
    { section: 'clients', ...CS_LEAD, category: 'NEEDS_ATTENTION', title: '1 contract expired', description: 'Billing continues on last accepted terms', link: '/pages/clients/list.html' },
    { section: 'clients', ...CS_LEAD, category: 'UPCOMING', title: '2 amendments awaiting client acceptance', description: 'Waiting for client admin', link: '/pages/clients/list.html' },
    { section: 'clients', requires: 'clients', when: user => !user.can(null, CS_LEAD) && forTier('smb')(user), category: 'NEEDS_ATTENTION', title: 'CloudSystems contract expired 30 Sep', description: 'Billing continues on last accepted terms · agree a renewal', link: '/pages/clients/list.html' },
    { section: 'clients', requires: 'clients', when: forTier('smb'), category: 'UPCOMING', title: 'MediaWorks term ends 3 Jan 2027', description: 'Start the renewal conversation', link: '/pages/clients/list.html' },
    { section: 'clients', requires: 'sla', when: user => scoped('sla')(user) && visible(user, 'sla', SAMPLE.slaAtRisk).length > 0, category: 'URGENT',
      title: user => `${plural(visible(user, 'sla', SAMPLE.slaAtRisk).length, 'work order')} at risk of SLA breach`,
      description: user => clientNames(visible(user, 'sla', SAMPLE.slaAtRisk)), link: '/pages/tracker/all.html' },
    { section: 'clients', requires: 'clients', when: user => visible(user, 'clients', SAMPLE.reports).some(r => r.state === 'draft' || r.state === 'none'), category: 'NEEDS_ATTENTION',
      title: user => {
        const n = visible(user, 'clients', SAMPLE.reports).filter(r => r.state === 'draft' || r.state === 'none').length;
        return `${plural(n, 'September service report')} not started or in draft`;
      },
      description: user => visible(user, 'clients', SAMPLE.reports).filter(r => r.state === 'draft' || r.state === 'none')
        .map(r => `${r.client} (${r.state === 'draft' ? 'draft' : 'not generated'})`).join(' · '),
      link: '/pages/reports/service-reports.html' },
    { section: 'clients', requires: 'support', when: user => !itView(user) && visible(user, 'support', SAMPLE.supportAtRisk).length > 0, category: 'URGENT',
      title: user => `${plural(visible(user, 'support', SAMPLE.supportAtRisk).length, 'support ticket')} breached or at risk`,
      description: user => visible(user, 'support', SAMPLE.supportAtRisk).map(t => `${t.id} ${t.client}: ${t.text}`).join(' · '), link: '/pages/tracker/support.html' },

    // Operations
    { section: 'operations', requires: 'work_orders', when: user => !towerView(user), category: 'NEEDS_ATTENTION', title: '4 delivery proofs to match', description: '2 unmatched · 2 need a confirmed match', link: '/pages/tracker/sync-inbox.html' },

    // Control Tower coordination (Vinh)
    { section: 'operations', requires: 'coordination', when: towerView, category: 'URGENT', title: 'DHL Express updates not reaching the tracker', description: 'Webhook failing · UK collections and deliveries need manual status · OFF-2055 missed a second pickup', link: '/pages/vendors/list.html' },
    { section: 'operations', requires: 'coordination', when: towerView, category: 'URGENT', title: '2 delivery proofs with no work order', description: 'FedEx 7712 4459 1187 (Grace Liu) · email scan from J. Whitfield with no tracking number', link: '/pages/tracker/sync-inbox.html' },
    { section: 'operations', requires: 'coordination', when: towerView, category: 'URGENT', title: 'ORD-30398 stuck at customs', description: 'Acme Tech · broker, vendor and Procurement need a re-issued commercial invoice', link: '/pages/tracker/orders.html' },
    { section: 'operations', requires: 'coordination', when: towerView, category: 'NEEDS_ATTENTION', title: '2 return receipts to confirm', description: 'OFF-2061 at Singapore Hub · OFF-2055 at Digital Solutions London', link: '/pages/tracker/sync-inbox.html' },
    { section: 'operations', requires: 'coordination', when: towerView, category: 'NEEDS_ATTENTION', title: 'DSP-0207: wipe failed on 1 of 4 drives', description: 'FinanceExperts · 9d 13h overdue · confirm shred with the disposal partner', link: '/pages/tracker/disposal.html' },
    { section: 'operations', requires: 'coordination', when: towerView, category: 'NEEDS_ATTENTION', title: 'REP-0871 waiting on a back-ordered part', description: 'TechGlobal · Dell ETA Friday · loaner already with the user', link: '/pages/tracker/work-order.html?wo=REP-0871' },
    { section: 'operations', requires: 'coordination', when: towerView, category: 'NEEDS_ATTENTION', title: 'Courier X invite pending for Sophie Tran', description: 'AU courier · invited 14 Oct, not signed in · 0 jobs assigned', link: '/pages/vendors/access.html' },
    { section: 'operations', requires: 'stock', category: 'NEEDS_ATTENTION', title: '3 restock proposals to send', description: 'Thresholds below minimum · 1 more awaiting client', link: '/pages/stock/restock.html' },
    { section: 'operations', requires: 'shipments', category: 'NEEDS_ATTENTION', title: '3 devices to inspect', description: 'Received at hub, intake not done', link: '/pages/stock/receiving.html' },
    { section: 'operations', requires: 'stock', category: 'UPCOMING', title: '68 devices stored 90+ days', description: 'Review with clients: redeploy or dispose', link: '/pages/stock/fees.html' },

    // Procurement
    { section: 'procurement', requires: 'purchase_orders', category: 'URGENT', title: 'ORD-30398 held at customs', description: 'Acme Tech · vendor delivery 5d 18h overdue · broker needs the commercial invoice re-issued with HS codes', link: '/pages/tracker/orders.html' },
    { section: 'procurement', requires: 'purchase_orders', category: 'URGENT', title: 'ONB-1188: vendor backorder on the 14" model', description: 'FinanceExperts · confirm the 16" substitute with the client', link: '/pages/tracker/onboarding.html' },
    { section: 'procurement', requires: 'purchase_orders', category: 'NEEDS_ATTENTION', title: '2 joiners need devices ordered this week', description: 'No stock in the client hub · Priya Nair (Acme Tech, 26 Oct) · Daniel Okafor (TechGlobal, 28 Oct)', link: '/pages/people/joiners.html' },
    { section: 'procurement', requires: 'purchase_orders', when: user => !user.can('stock'), category: 'NEEDS_ATTENTION', title: '3 restock proposals to quote', description: 'Thresholds below minimum · 1 more awaiting client approval', link: '/pages/stock/restock.html' },
    { section: 'procurement', requires: 'purchase_orders', when: user => !user.can(null, CS_LEAD), category: 'NEEDS_ATTENTION', title: '1 client over procurement cap', description: 'Orders above the cap need client approval · 3 more near cap', link: '/pages/clients/caps.html' },

    // Vendors: performance and sourcing
    { section: 'vendors', requires: 'vendor_performance', category: 'URGENT', title: 'DHL Express integration failing', description: 'Tracking updates not syncing · UK last mile', link: '/pages/vendors/list.html' },
    { section: 'vendors', requires: 'vendor_performance', category: 'NEEDS_ATTENTION', title: 'Vendor C over its US lead time for 30 days', description: '5.6d against 3–5d contracted · on time 72% this quarter · review with the account team', link: '/pages/vendors/supplier.html?v=vendorC' },
    { section: 'vendors', requires: 'vendor_performance', category: 'NEEDS_ATTENTION', title: 'Courier X slow in Australia', description: 'Last mile 3.4d against 2–3d · deliveries on time 91%', link: '/pages/vendors/detail.html' },
    // One action per country with a missing service, generated from the coverage data
    ...COUNTRY_COVERAGE.filter(c => coverageOf(c).gaps).sort((a, b) => coverageOf(b).gaps - coverageOf(a).gaps).map(c => ({
      section: 'vendors', requires: 'vendor_performance', category: coverageOf(c).gaps > 1 ? 'URGENT' : 'NEEDS_ATTENTION',
      title: `${c.name}: no ${SERVICES.filter(s => serviceState(c, s) === 'gap').map(s => s.label.toLowerCase()).join(' or ')} vendor`,
      description: `${plural(c.clients.length, 'client')} · ${c.openWOs} open work orders`,
      link: '/pages/vendors/list.html'
    })),
    { section: 'vendors', requires: 'vendor_performance', category: 'UPCOMING', title: 'GreenCycle ITAD on hold', description: 'Disposal partner for SG and AU', link: '/pages/vendors/list.html' },
    { section: 'vendors', requires: 'vendor_performance', category: 'UPCOMING', title: 'Courier X contract ends 31 Mar 2027', description: 'Renew or re-tender SG, MY and AU last mile', link: '/pages/vendors/detail.html' },

    // IT Services: ticket and device work for today
    { section: 'it_euc', requires: 'support', when: itView, category: 'URGENT', title: 'SUP-5538: laptop won’t boot after update', description: 'TechGlobal · Sarah Kim · urgent · unassigned · first response due in 18m', link: SUPPORT },
    { section: 'it_euc', requires: 'support', when: itView, category: 'URGENT', title: 'SUP-5517 resolution 2h 15m overdue', description: 'TechGlobal · screen flicker · blocked on a part with Kelvin Tan', link: SUPPORT },
    { section: 'it_euc', requires: 'support', when: itView, category: 'URGENT', title: 'SUP-5521: 52m left to resolve', description: 'Acme Tech · VPN drops every 20 minutes · profile reissued, confirm with the user', link: '/pages/tracker/support-detail.html' },
    { section: 'it_euc', requires: 'onboarding', when: itView, category: 'NEEDS_ATTENTION', title: 'ONB-1186: finish Jamf enrolment', description: 'Acme Tech · Sophie Tan started 19 Oct · device at Singapore Hub', link: '/pages/tracker/onboarding-detail.html?id=ONB-1186' },
    { section: 'it_euc', requires: 'onboarding', when: itView, category: 'NEEDS_ATTENTION', title: 'ONB-1179: get setup sign-off', description: 'MediaWorks · Mei Lin Tan · delivered, waiting on the employee', link: '/pages/tracker/onboarding.html' },
    { section: 'it_euc', requires: 'support', when: itView, category: 'UPCOMING', title: '2 tickets waiting on the client', description: 'SUP-5509 confirm fix (1d) · SUP-5503 cost approval (2d)', link: SUPPORT },

    // IT
    { section: 'it_euc', requires: 'breakfix', category: 'NEEDS_ATTENTION', title: '2 repair quotes need action', description: 'REP-0874 has no vendor quote from FixPoint London yet', link: '/pages/tracker/repair-quotes.html' },
    { section: 'it_euc', requires: 'breakfix', category: 'NEEDS_ATTENTION', title: 'REP-0858 quote expired', description: 'Acme Tech · no decision after 7 days', link: '/pages/tracker/repair-quotes.html' },

    // People (shared)
    { section: 'people', requires: 'people', when: forTier('smb'), category: 'URGENT', title: 'Hafiz Rahman starts today', description: 'MediaWorks · Malaysia · added by client', link: '/pages/people/joiners.html?open=p4' },
    { section: 'people', requires: 'people', when: forTier('enterprise'), category: 'NEEDS_ATTENTION', title: 'Marcus Lee leaves tomorrow', description: 'Acme Tech · return box due 22 Oct', link: '/pages/people/leavers.html' },
    { section: 'people', requires: 'people', when: forTier('smb'), category: 'NEEDS_ATTENTION', title: 'Isabella Rossi: leaver needs info', description: 'Digital Solutions · departure 6 Nov (estimated)', link: '/pages/people/leavers.html' },

    // Integrations (shared)
    { section: 'integrations', requires: 'integrations', when: forTier('smb'), category: 'URGENT', title: 'Digital Solutions ServiceNow failing', description: 'No sync since 14 Oct · 38 errors', link: '/pages/integrations/list.html' },
    { section: 'integrations', requires: 'integrations', when: forTier('enterprise'), category: 'NEEDS_ATTENTION', title: 'Employee drift on 2 HRIS connections', description: 'TechGlobal Workday · Acme Tech Okta', link: '/pages/integrations/list.html' },
    { section: 'integrations', requires: 'integrations', when: forTier('smb'), category: 'NEEDS_ATTENTION', title: 'FinanceExperts Workday disconnected', description: 'No sync since 2 Sep · joiners and leavers are entered by hand', link: '/pages/integrations/list.html' }
  ];

  const resolve = (v, user) => (typeof v === 'function' ? v(user) : v);

  function isVisible(widget, user) {
    if (!user.can(widget.requires || null, { minLevel: widget.minLevel, function: widget.function })) return false;
    return widget.when ? widget.when(user) : true;
  }

  const metricsFor = user => METRICS.filter(w => isVisible(w, user));
  const actionsFor = user => ACTIONS.filter(w => isVisible(w, user))
    .sort((a, b) => CATEGORIES[a.category].priority - CATEGORIES[b.category].priority);

  const SECTION_LINKS = {
    clients: '/pages/clients/list.html',
    operations: '/pages/tracker/all.html',
    vendors: '/pages/vendors/list.html',
    it_euc: '/pages/tracker/repairs.html',
    people: '/pages/people/directory.html',
    integrations: '/pages/integrations/list.html'
  };
  const ACTION_TABS = [
    { id: 'all', label: 'All' },
    { id: 'URGENT', label: 'Urgent' },
    { id: 'PENDING_APPROVAL', label: 'Decisions' },
    { id: 'NEEDS_ATTENTION', label: 'Needs attention' },
    { id: 'UPCOMING', label: 'Upcoming' }
  ];
  const ACTIONS_PREVIEW = 7;
  const pct = (n, total) => `${((n / total) * 100).toFixed(1)}%`;

  function slaStatus() {
    const s = SLA;
    const ok = s.open - s.risk - s.breached;
    return `
      <div class="sla-stats">
        <div class="sla-stat"><span class="sla-stat-value">${ok}</span><span class="sla-stat-label">On track · ${pct(ok, s.open)}</span></div>
        <div class="sla-stat" data-tone="risk"><span class="sla-stat-value">${s.risk}</span><span class="sla-stat-label">At risk (75%+)</span></div>
        <div class="sla-stat" data-tone="breached"><span class="sla-stat-value">${s.breached}</span><span class="sla-stat-label">Breached</span></div>
      </div>
      <div class="sla-bar" role="img" aria-label="${ok} on track, ${s.risk} at risk, ${s.breached} breached">
        <span class="ok" style="width:${pct(ok, s.open)}"></span><span class="risk" style="width:${pct(s.risk, s.open)}"></span><span class="breached" style="width:${pct(s.breached, s.open)}"></span>
      </div>`;
  }

  function slaOverdue(limit = SLA.overdue.length) {
    const s = SLA;
    return `
      <div class="sla-overdue">
        <h3>Most overdue</h3>
        <ul>
          ${s.overdue.slice(0, limit).map(o => `
            <li><a href="${o.link}">
              <span class="sla-overdue-top"><span class="sla-overdue-id">${o.id}</span><span class="sla-overdue-late">${o.late} overdue</span></span>
              <span class="sla-overdue-sub">${o.client} · ${o.milestone}${o.blocker ? ` · ${o.blocker}` : ''}</span>
            </a></li>`).join('')}
        </ul>
        <a href="${s.link}" class="dash-link sla-overdue-more">All ${s.breached} breached</a>
      </div>`;
  }

  function slaPanel() {
    const s = SLA;
    const ok = s.open - s.risk - s.breached;
    const maxOpen = Math.max(...s.types.map(t => t.open));
    return `
      <section class="dash-panel sla-panel">
        <header class="dash-panel-header">
          <h2>Work order SLA</h2>
          <span class="dash-panel-meta">${s.open} open</span>
          <a href="${s.link}" class="dash-link">Open tracker</a>
        </header>
        <div class="sla-body">
          <div class="sla-summary">
            ${slaStatus()}
            <table class="sla-types">
              <thead><tr><th>Type</th><th class="num">Open</th><th class="num">At risk</th><th class="num">Breached</th><th></th></tr></thead>
              <tbody>
                ${s.types.map(t => `
                  <tr>
                    <td><a href="${t.link}">${t.label}</a></td>
                    <td class="num">${t.open}</td>
                    <td class="num ${t.risk ? 'is-risk' : 'is-zero'}">${t.risk}</td>
                    <td class="num ${t.breached ? 'is-breached' : 'is-zero'}">${t.breached}</td>
                    <td class="sla-type-bar"><span style="width:${(t.open / maxOpen) * 100}%">
                      <i class="ok" style="width:${pct(t.open - t.risk - t.breached, t.open)}"></i><i class="risk" style="width:${pct(t.risk, t.open)}"></i><i class="breached" style="width:${pct(t.breached, t.open)}"></i>
                    </span></td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
          ${slaOverdue()}
        </div>
      </section>`;
  }

  function commercialPanel(user) {
    const c = COMMERCIAL;
    const internal = isVisible(PANELS.internalSGD, user);
    const amountList = amounts => `<span class="money-amounts ${internal ? 'is-secondary' : ''}">${amounts.map(([cur, amt]) => `<span><abbr>${cur}</abbr> ${amt}</span>`).join('')}</span>`;
    return `
      <section class="dash-panel">
        <header class="dash-panel-header"><h2>Revenue & margin</h2></header>
        ${c.money.map(m => `
          <a class="money-block" href="${m.link}">
            <span class="money-label">${m.label}</span>
            ${internal ? `<span class="money-sgd">${sgd(toSGD(m.amounts))}</span>` : ''}
            ${amountList(m.amounts)}
            <span class="money-sub">${m.sub}</span>
          </a>`).join('')}
        ${isVisible(PANELS.margins, user) ? `
          <div class="margin-row">
            ${c.margins.map(m => `
              <a class="margin-block" href="${m.link}">
                <span class="money-label">${m.label} margin</span>
                <span class="margin-value">${m.value}</span>
                ${internal ? `<span class="money-sub">${sgd(toSGD(m.amounts))} ${m.sgdCaption}</span>` : ''}
                <span class="money-sub">${m.sub}</span>
              </a>`).join('')}
          </div>` : ''}
        <a class="caps-row" href="${c.caps.link}">
          <span class="money-label">Procurement caps</span>
          <span class="caps-chips">
            <span data-tone="breached">${c.caps.over} over</span>
            <span data-tone="risk">${c.caps.near} near</span>
            <span>${c.caps.renewing} renewing</span>
          </span>
        </a>
        <p class="dash-footnote">${internal
          ? `SGD equivalents are for internal tracking only, at month-end rates (${FX_MONTH_END.date}). Client billing stays in each contract’s currency.`
          : 'Amounts are per currency and never added together.'}</p>
      </section>`;
  }

  // Mini bars as in the service report: past weeks faded, current week solid
  function sparkBars(points) {
    const max = Math.max(...points);
    return `<span class="summary-spark" aria-hidden="true">${points
      .map((v, i) => `<i class="${i === points.length - 1 ? 'current' : ''}" style="height:${Math.max(8, (v / max) * 100)}%"></i>`)
      .join('')}</span>`;
  }

  function summaryCards(user) {
    const cards = CARDS
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => isVisible(c, user))
      .sort((a, b) => a.c.p - b.c.p || a.i - b.i)
      .slice(0, CARDS_MAX)
      .sort((a, b) => a.i - b.i)
      .map(({ c }) => c);
    if (!cards.length) return '';
    return `
      <section class="dash-panel summary-panel">
        <header class="dash-panel-header">
          <h2>Summary</h2>
          <span class="dash-panel-meta">${itView(user) || towerView(user) ? 'Live queue · weekly figures compared with last week' : 'Q4 to date · 1 Oct – 22 Oct · compared with Q3'}</span>
        </header>
        <div class="summary-cards">
          ${cards.map(c => {
            const delta = resolve(c.delta, user);
            const spark = resolve(c.spark, user);
            const deltaClass = !delta ? '' : delta[1] === null ? 'neutral' : delta[1] ? 'good' : 'bad';
            return `
              <a class="summary-card" href="${c.link}" ${c.tone ? `data-tone="${c.tone}"` : ''}>
                <span class="summary-card-label">${resolve(c.label, user)}</span>
                <span class="summary-card-body">
                  <span class="summary-card-value">${resolve(c.value, user)}</span>
                  ${spark ? sparkBars(spark) : ''}
                </span>
                ${delta ? `<span class="summary-card-delta ${deltaClass}">${delta[0] === 'up' ? '↑' : '↓'} ${delta[2]}</span>` : ''}
                ${c.note ? `<span class="summary-card-note">${resolve(c.note, user)}</span>` : ''}
              </a>`;
          }).join('')}
        </div>
      </section>`;
  }

  // title/footer let the head view reuse this as "Escalations" with a hand-off summary underneath
  function actionsPanel(actions, user, { title = 'Needs your attention', footer = '' } = {}) {
    const counts = actions.reduce((c, a) => ({ ...c, [a.category]: (c[a.category] || 0) + 1 }), { all: actions.length });
    const tabs = ACTION_TABS.filter(t => counts[t.id]);
    const showSection = new Set(actions.map(a => a.section)).size > 1;

    return `
      <section class="dash-panel" id="dash-actions">
        <header class="dash-panel-header">
          <h2>${title}</h2>
          <span class="section-count">${actions.length}</span>
        </header>
        ${actions.length ? `
          <div class="action-tabs" role="tablist">
            ${tabs.map(t => `
              <button type="button" class="action-tab ${t.id === 'all' ? 'active' : ''}" data-filter="${t.id}" role="tab" aria-selected="${t.id === 'all'}">
                ${t.label} <span class="action-tab-count">${counts[t.id]}</span>
              </button>`).join('')}
          </div>
          <ul class="action-list">
            ${actions.map(a => `
              <li data-category="${a.category}">
                <a href="${a.link}" class="action-row" data-category="${a.category}">
                  <span class="action-dot" title="${CATEGORIES[a.category].label}"></span>
                  <span class="action-main">
                    <span class="action-title">${resolve(a.title, user)}</span>
                    <span class="action-description">${resolve(a.description, user)}</span>
                  </span>
                  ${showSection ? `<span class="action-section">${SECTIONS[a.section]}</span>` : ''}
                  <span class="action-chevron" aria-hidden="true">›</span>
                </a>
              </li>`).join('')}
          </ul>
          <button type="button" class="action-more"></button>`
        : '<div class="empty-state"><p class="text-muted">Nothing needs your attention right now</p></div>'}
        ${footer}
      </section>`;
  }

  function bindActions(panel) {
    const rows = [...panel.querySelectorAll('.action-list > li')];
    const more = panel.querySelector('.action-more');
    if (!rows.length) return;
    let filter = 'all';
    let expanded = false;

    const update = () => {
      const matching = rows.filter(li => filter === 'all' || li.dataset.category === filter);
      rows.forEach(li => { li.hidden = true; });
      matching.forEach((li, i) => { li.hidden = !expanded && i >= ACTIONS_PREVIEW; });
      more.hidden = matching.length <= ACTIONS_PREVIEW;
      more.textContent = expanded ? 'Show less' : `Show all ${matching.length}`;
    };

    panel.querySelectorAll('.action-tab').forEach(tab => tab.addEventListener('click', () => {
      filter = tab.dataset.filter;
      expanded = false;
      panel.querySelectorAll('.action-tab').forEach(t => {
        t.classList.toggle('active', t === tab);
        t.setAttribute('aria-selected', t === tab);
      });
      update();
    }));
    more.addEventListener('click', () => { expanded = !expanded; update(); });
    update();
  }

  function areaCards(metrics, user) {
    const groups = Object.keys(SECTION_LINKS)
      .map(id => ({ id, items: metrics.filter(m => m.section === id) }))
      .filter(g => g.items.length);
    if (!groups.length) return '';
    return `
      <section class="dash-areas">
        <h2 class="dash-heading">By area</h2>
        <div class="area-grid">
          ${groups.map(g => `
            <article class="dash-panel">
              <header class="dash-panel-header">
                <h3>${SECTIONS[g.id]}</h3>
                <a href="${SECTION_LINKS[g.id]}" class="dash-link">View</a>
              </header>
              ${g.items.map(m => `
                <a class="area-stat" ${m.link ? `href="${m.link}"` : ''}>
                  <span class="area-text">
                    <span class="area-label">${resolve(m.label, user)}</span>
                    ${m.note ? `<span class="area-note ${m.tone || ''}">${resolve(m.note, user)}</span>` : ''}
                  </span>
                  <span class="area-value">${resolve(m.value, user)}</span>
                </a>`).join('')}
            </article>`).join('')}
        </div>
      </section>`;
  }

  // compact: smaller canvas, labels only on the current month
  function revenueChart({ compact = false } = {}) {
    const t = FINANCE_TRENDS;
    const [W, H, L, R, T, B] = compact ? [340, 190, 36, 44, 22, 24] : [640, 250, 40, 16, 24, 26];
    const plotW = W - L - R, plotH = H - T - B, max = 75;
    const y = v => T + plotH - (v / max) * plotH;
    const ym = m => T + plotH - ((m - 17) / 6) * plotH;
    const slot = plotW / t.months.length, barW = slot * 0.46;
    const cx = i => L + slot * i + slot / 2;
    const last = t.months.length - 1;

    const grid = [0, 25, 50, 75].map(v => `
      <line class="fin-grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/>
      <text class="fin-axis" x="${L - 6}" y="${y(v) + 3}" text-anchor="end">${v ? `${v}K` : '0'}</text>`).join('');

    const bars = t.revenue.map((total, i) => {
      const x = cx(i) - barW / 2;
      let base = 0;
      const segs = t.streams.map(s => {
        const v = total * s.share;
        const rect = `<rect x="${x}" y="${y(base + v)}" width="${barW}" height="${y(base) - y(base + v)}" fill="${s.color}"/>`;
        base += v;
        return rect;
      }).join('');
      const proj = i === last
        ? `<rect class="fin-projected" x="${x}" y="${y(t.projected)}" width="${barW}" height="${y(total) - y(t.projected)}"/>
           <text class="fin-value" x="${cx(i)}" y="${y(t.projected) - 6}" text-anchor="middle">${total}K <tspan class="fin-muted">to date</tspan></text>`
        : compact ? '' : `<text class="fin-value" x="${cx(i)}" y="${y(total) - 6}" text-anchor="middle">${total}K</text>`;
      return `<g class="${i === last ? 'current' : 'past'}">${segs}</g>${proj}`;
    }).join('');

    const pts = t.margin.map((m, i) => [cx(i), ym(m)]);
    const line = `<polyline class="fin-margin-line" points="${pts.map(p => p.join(',')).join(' ')}"/>
      ${pts.map(([px, py], i) => `<circle class="fin-margin-dot ${i === last ? 'current' : ''}" cx="${px}" cy="${py}" r="3.5"/>
        ${compact && i !== last ? '' : `<text class="fin-margin-text" x="${px + 8}" y="${py + 3}">${t.margin[i]}%</text>`}`).join('')}`;

    const months = t.months.map((m, i) => `<text class="fin-axis" x="${cx(i)}" y="${H - 8}" text-anchor="middle">${m}</text>`).join('');

    return `<svg class="fin-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Monthly revenue in SGD by stream with gross margin line">${grid}${bars}${line}${months}</svg>`;
  }

  function marginBars() {
    const margins = [
      { label: 'Overall', pct: 21.4, text: '21.4%', link: '/pages/billing/ledger.html' },
      { label: 'Repairs', pct: 38, text: '38%', link: COMMERCIAL.margins[1].link },
      { label: 'Devices', pct: 8, text: '7–9%', link: COMMERCIAL.margins[0].link }
    ];
    return `
      <div class="fin-block">
        <h3>Margin by stream</h3>
        ${margins.map(m => `
          <a class="fin-hbar" href="${m.link}">
            <span class="fin-hbar-label">${m.label}</span>
            <span class="fin-hbar-track is-margin"><span style="width:${(m.pct / 40) * 100}%"></span></span>
            <span class="fin-hbar-value">${m.text}</span>
          </a>`).join('')}
      </div>`;
  }

  function financePanel() {
    const c = COMMERCIAL;
    const [unbilledM, outstandingM, storageM] = c.money;
    const unbilledSGD = toSGD(unbilledM.amounts), outstandingSGD = toSGD(outstandingM.amounts);
    const owed = unbilledSGD + outstandingSGD;

    const byCur = {};
    [...unbilledM.amounts, ...outstandingM.amounts].forEach(([cur, amt]) => { byCur[cur] = (byCur[cur] || 0) + toSGD([[cur, amt]]); });
    const curRows = Object.entries(byCur).sort((a, b) => b[1] - a[1]);
    const curMax = curRows[0][1];


    return `
      <section class="dash-panel fin-panel">
        <header class="dash-panel-header">
          <h2>Revenue & margin</h2>
          <span class="dash-panel-meta">Internal · SGD equivalent at ${FX_MONTH_END.date} rates</span>
          <a href="/pages/billing/ledger.html" class="dash-link">Open ledger</a>
        </header>
        <div class="fin-body">
          <div class="fin-main">
            <div class="fin-headline">
              <div><span class="fin-big">≈ SGD 48.2K</span><span class="fin-label">Revenue Q4 to date</span></div>
              <div><span class="fin-big">21.4%</span><span class="fin-label">Gross margin · ≈ SGD 10.3K</span></div>
              <div><span class="fin-big fin-muted-big">≈ SGD 67.9K</span><span class="fin-label">October projected</span></div>
            </div>
            ${revenueChart()}
            <div class="fin-legend">
              ${FINANCE_TRENDS.streams.map(s => `<span><i style="background:${s.color}"></i>${s.label}</span>`).join('')}
              <span><i class="fin-legend-line"></i>Gross margin</span>
              <span><i class="fin-legend-projected"></i>Projected</span>
            </div>
          </div>

          <div class="fin-side">
            <div class="fin-block">
              <h3>Owed to us</h3>
              <div class="fin-big">${sgd(owed)}</div>
              <div class="fin-split" role="img" aria-label="Unbilled versus invoiced">
                <span class="unbilled" style="width:${(unbilledSGD / owed) * 100}%"></span>
                <span class="outstanding" style="width:${(outstandingSGD / owed) * 100}%"></span>
              </div>
              <div class="fin-split-legend">
                <a href="${unbilledM.link}"><i class="unbilled"></i>Unbilled ${sgd(unbilledSGD)}</a>
                <a href="${outstandingM.link}"><i class="outstanding"></i>Invoiced, unpaid ${sgd(outstandingSGD)} · 3 overdue</a>
              </div>
            </div>

            <div class="fin-block">
              <h3>By billing currency</h3>
              ${curRows.map(([cur, v]) => `
                <div class="fin-hbar">
                  <span class="fin-hbar-label">${cur}</span>
                  <span class="fin-hbar-track"><span style="width:${(v / curMax) * 100}%"></span></span>
                  <span class="fin-hbar-value">${sgd(v).replace('≈ SGD ', '')}</span>
                </div>`).join('')}
              <p class="fin-note">Unbilled + invoiced, converted to SGD. Clients are billed in their own currency.</p>
            </div>

            ${marginBars()}

            <div class="fin-block fin-mini-row">
              <a href="${storageM.link}"><span class="fin-label">Storage fees / month</span><strong>${sgd(toSGD(storageM.amounts))}</strong></a>
              <a href="${c.caps.link}"><span class="fin-label">Procurement caps</span><strong>${c.caps.over} over · ${c.caps.near} near</strong></a>
            </div>
          </div>
        </div>
      </section>`;
  }

  // Same equirectangular projection as assets/world-map.svg (1000 wide, latitude 84 to -58)
  const MAP_URL = '/assets/world-map.svg';
  const mapXY = ([lon, lat]) => [(lon + 180) * (1000 / 360), (84 - lat) * (1000 / 360)];
  const flagOf = cc => String.fromCodePoint(...[...cc].map(ch => 0x1f1a5 + ch.charCodeAt(0)));
  const LEVEL_LABEL = { ok: 'Covered', single: 'Single vendor', warn: '1 service missing', bad: 'Services missing' };
  const CELL_LABEL = { ok: 'Covered', single: 'One vendor only', gap: 'None' };
  let worldMapSvg = null;

  function coverageDetail(c) {
    const cov = coverageOf(c);
    return `
      <div class="cov-detail-head">
        <span class="cov-flag">${flagOf(c.cc)}</span>
        <div>
          <h3>${c.name}</h3>
          <span class="fin-label">${c.region} \u00b7 ${plural(c.clients.length, 'client')} \u00b7 ${c.openWOs} open work orders</span>
        </div>
        <span class="cov-status" data-state="${cov.level}">${LEVEL_LABEL[cov.level]}</span>
      </div>
      <dl class="cov-rows">
        ${SERVICES.map(s => {
          const state = serviceState(c, s);
          const list = c.vendors[s.id];
          return `
            <dt><span class="cov-cell-dot" data-state="${state}"></span>${s.label}<span class="cov-want">${CELL_LABEL[state]}</span></dt>
            <dd>${list.length
              ? list.map(v => `<span class="cov-vendor" ${isActive(v) ? '' : 'data-state="warn"'}><strong>${vendorName(v)}</strong>${isActive(v) ? '' : `<span>${v.status}</span>`}</span>`).join('')
              : '<span class="cov-none">No vendor contracted</span>'}</dd>`;
        }).join('')}
      </dl>
      ${c.notes ? `<ul class="cov-issues">${c.notes.map(n => `<li data-state="warn">${n}</li>`).join('')}</ul>` : ''}
      <div class="cov-clients"><span class="fin-label">Clients affected by gaps here</span><span>${c.clients.join(', ')}</span></div>`;
  }

  function coverageRows(list) {
    return list.map(c => {
      const cov = coverageOf(c);
      return `
        <tr data-country="${c.cc}" tabindex="0">
          <td><span class="cov-row-dot" data-state="${cov.level}"></span>${flagOf(c.cc)} ${c.name}</td>
          <td class="num">${c.clients.length}</td>
          <td class="num">${c.openWOs}</td>
          ${SERVICES.map(s => {
            const state = serviceState(c, s);
            const n = c.vendors[s.id].filter(isActive).length;
            return `<td class="cov-cell" data-state="${state}" title="${c.vendors[s.id].map(vendorName).join(', ') || 'No vendor'}">${n}</td>`;
          }).join('')}
        </tr>`;
    }).join('');
  }

  // Countries with a gap or single-vendor risk first, then by clients affected and open work orders
  const byRisk = (a, b) => {
    const ca = coverageOf(a), cb = coverageOf(b);
    return (cb.gaps - ca.gaps) || (cb.singles - ca.singles) || (b.clients.length - a.clients.length) || (b.openWOs - a.openWOs);
  };

  function coverageTable(showAll, query) {
    const q = query.trim().toLowerCase();
    const match = c => !q || c.name.toLowerCase().includes(q) || c.cc.toLowerCase() === q;
    const groups = REGIONS.map(region => {
      const inRegion = COUNTRY_COVERAGE.filter(c => c.region === region);
      const atRisk = inRegion.filter(c => coverageOf(c).level !== 'ok');
      const rows = (showAll || q ? inRegion : atRisk).filter(match).sort(byRisk);
      return { region, total: inRegion.length, atRisk: atRisk.length, rows };
    }).filter(g => g.total);
    const shown = groups.reduce((n, g) => n + g.rows.length, 0);
    return `
      <table class="client-table cov-table">
        <thead><tr><th>Country</th><th class="num">Clients</th><th class="num">Open WOs</th>${SERVICES.map(s => `<th class="cov-cell-head">${s.label}</th>`).join('')}</tr></thead>
        ${groups.map(g => `
          <tbody>
            <tr class="tier-row"><th colspan="${3 + SERVICES.length}">${g.region} <span>\u00b7 ${g.total} ${g.total === 1 ? 'country' : 'countries'} \u00b7 ${g.atRisk} with gaps or single vendors</span></th></tr>
            ${g.rows.length ? coverageRows(g.rows) : `<tr><td colspan="${3 + SERVICES.length}" class="muted">All covered</td></tr>`}
          </tbody>`).join('')}
      </table>
      ${shown ? '' : '<p class="cov-empty">No countries match.</p>'}`;
  }

  function coveragePanel() {
    const first = [...COUNTRY_COVERAGE].sort(byRisk)[0];
    const atRisk = COUNTRY_COVERAGE.filter(c => coverageOf(c).level !== 'ok').length;
    return `
      <section class="dash-panel cov-panel">
        <header class="dash-panel-header">
          <h2>Country coverage</h2>
          <span class="dash-panel-meta">${COUNTRY_COVERAGE.length} countries \u00b7 ${COVERAGE_TOTALS.gaps} service gaps \u00b7 ${COVERAGE_TOTALS.singles} single-vendor</span>
        </header>
        <div class="cov-body">
          <div class="cov-map-wrap">
            <div class="cov-map" id="cov-map" data-selected="${first.cc}" role="group" aria-label="Countries we provision in, coloured by coverage"></div>
            <div class="cov-legend">
              <span><i data-state="ok"></i>All services, 2+ vendors</span>
              <span><i data-state="single"></i>Single-vendor risk</span>
              <span><i data-state="warn"></i>1 service missing</span>
              <span><i data-state="bad"></i>2+ services missing</span>
              <span><i data-state="none"></i>Not provisioned</span>
            </div>
          </div>
          <div class="cov-detail" id="cov-detail">${coverageDetail(first)}</div>
        </div>
        <div class="cov-list">
          <div class="cov-toolbar">
            <input type="search" class="form-input cov-search" placeholder="Search ${COUNTRY_COVERAGE.length} countries" aria-label="Search countries">
            <label class="cov-toggle"><input type="checkbox" class="cov-show-all"> Show all countries</label>
            <span class="cov-toolbar-note">${atRisk} of ${COUNTRY_COVERAGE.length} countries need sourcing \u00b7 cell = active vendors (target 2, hub 1)</span>
          </div>
          <div class="cov-table-wrap">${coverageTable(false, '')}</div>
        </div>
      </section>`;
  }

  // Each provisioned country gets a coloured shape; ones too small for the map's detail get a dot
  function paintMap(container, selected) {
    const svg = container.querySelector('svg');
    if (!svg) return;
    svg.querySelectorAll('.cov-dot-marker').forEach(n => n.remove());
    svg.querySelectorAll('path[data-level]').forEach(p => { p.removeAttribute('data-level'); p.classList.remove('selected'); });
    COUNTRY_COVERAGE.forEach(c => {
      const level = coverageOf(c).level;
      const shape = svg.querySelector(`path[id="${c.cc}"]`);
      if (shape) {
        shape.dataset.level = level;
        shape.dataset.country = c.cc;
        shape.classList.toggle('selected', c.cc === selected);
        shape.setAttribute('tabindex', '0');
        shape.setAttribute('role', 'button');
        shape.setAttribute('aria-label', `${c.name}: ${LEVEL_LABEL[level]}`);
        return;
      }
      const [x, y] = mapXY(c.pos);
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', `cov-dot-marker ${c.cc === selected ? 'selected' : ''}`);
      g.dataset.level = level;
      g.dataset.country = c.cc;
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      g.setAttribute('aria-label', `${c.name}: ${LEVEL_LABEL[level]}`);
      g.innerHTML = `<circle class="cov-halo" cx="${x}" cy="${y}" r="9"/><circle class="cov-dot" cx="${x}" cy="${y}" r="4.5"/>`;
      svg.appendChild(g);
    });
  }

  async function loadWorldMap(container) {
    if (!worldMapSvg) {
      const res = await fetch(MAP_URL);
      if (!res.ok) throw new Error(`Map failed to load: ${res.status}`);
      worldMapSvg = await res.text();
    }
    container.innerHTML = worldMapSvg;
    const svg = container.querySelector('svg');
    svg.setAttribute('class', 'cov-world');
    svg.removeAttribute('width');
    svg.removeAttribute('height');
  }

  function bindCoverage(panel) {
    if (!panel) return;
    const map = panel.querySelector('#cov-map');
    const tableWrap = panel.querySelector('.cov-table-wrap');
    const search = panel.querySelector('.cov-search');
    const showAll = panel.querySelector('.cov-show-all');
    let selected = map.dataset.selected;

    const select = cc => {
      selected = cc;
      panel.querySelector('#cov-detail').innerHTML = coverageDetail(COUNTRY_COVERAGE.find(c => c.cc === cc));
      paintMap(map, selected);
      tableWrap.querySelectorAll('tr[data-country]').forEach(r => r.classList.toggle('selected', r.dataset.country === cc));
    };
    const pick = e => {
      const el = e.target.closest('[data-country]');
      if (el) select(el.dataset.country);
    };
    const pickKey = e => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('[data-country]')) { e.preventDefault(); pick(e); }
    };
    const refreshTable = () => {
      tableWrap.innerHTML = coverageTable(showAll.checked, search.value);
      tableWrap.querySelectorAll('tr[data-country]').forEach(r => r.classList.toggle('selected', r.dataset.country === selected));
    };

    [map, tableWrap].forEach(el => { el.addEventListener('click', pick); el.addEventListener('keydown', pickKey); });
    search.addEventListener('input', refreshTable);
    showAll.addEventListener('change', refreshTable);
    refreshTable();

    loadWorldMap(map)
      .then(() => paintMap(map, selected))
      .catch(() => { map.innerHTML = '<p class="cov-empty">World map unavailable \u00b7 use the list below.</p>'; });
  }

  // ---- Head view ----
  // Escalations: everything urgent, plus decisions only a lead or the head can make
  const isEscalation = a => a.category === 'URGENT' || a.category === 'PENDING_APPROVAL';
  const TEAM_FOR_SECTION = {
    commercial: 'Finance', clients: 'Customer Success', operations: 'Supply Chain', procurement: 'Supply Chain', vendors: 'Partnerships',
    it_euc: 'IT EUC', people: 'Customer Success', integrations: 'IT EUC'
  };

  const COMMENTARY = [
    'Revenue is up 9% on the same days of Q3 at ≈ SGD 48.2K, with margin up 1.2 pts to 21.4%. Work order SLA slipped 1.8 pts to 91.6%, driven by onboarding (4 breached) and a customs hold on an Acme Tech order.',
    'Watch: DHL Express integration is failing in the UK, CloudSystems is billing on an expired contract, and 3 invoices are overdue.'
  ];

  // personId opens "view as" that lead
  const TEAMS = [
    { name: 'Customer Success', personId: 'nalene', state: 'warn',
      stat: '93.4%', statLabel: 'support within SLA', points: ['4 contracts need attention', '2 tickets breached or at risk'] },
    { name: 'Partnerships', personId: 'kirthinni', state: 'bad',
      stat: '86.5%', statLabel: 'vendor delivery on time', points: ['DHL Express integration failing', 'No repair partner in MY'] },
    { name: 'Supply Chain', personId: 'matthew', lead: 'You', state: 'warn',
      stat: '89.3%', statLabel: 'delivered on time', points: ['6 stock items need attention', '2 orders late at vendor'] },
    { name: 'IT EUC', personId: 'karen', state: 'warn',
      stat: '9h 40m', statLabel: 'avg resolution · target 16h', points: ['Onboarding on time 84.2%, down 3.1 pts', '2 repair quotes need action'] },
    { name: 'Finance', personId: 'pooja', state: 'warn',
      stat: '≈ SGD 16.2K', statLabel: 'owed to us', points: ['3 invoices overdue', '5 billing items to review'] }
  ];

  // Revenue is internal SGD equivalent; sorted by risk score (breaches, contract state, SLA)
  const CLIENT_HEALTH = [
    { name: 'CloudSystems', plan: 'Growth', revenue: 3.9, sla: 88.2, breaches: 1, tickets: 31, contract: ['bad', 'Expired 30 Sep'], risk: 9 },
    { name: 'Acme Tech', plan: 'Enterprise', revenue: 13.6, sla: 89.5, breaches: 3, tickets: 118, contract: ['warn', 'v5 awaiting acceptance'], risk: 8 },
    { name: 'FinanceExperts', plan: 'Essentials', revenue: 2.4, sla: 90.1, breaches: 2, tickets: 22, contract: ['ok', 'Active to May 2027'], risk: 6 },
    { name: 'TechGlobal Inc', plan: 'Enterprise', revenue: 14.8, sla: 93.0, breaches: 2, tickets: 141, contract: ['warn', 'v3 awaiting acceptance'], risk: 6 },
    { name: 'MediaWorks', plan: 'Growth', revenue: 4.6, sla: 92.4, breaches: 2, tickets: 52, contract: ['warn', 'Term ends 3 Jan 2027'], risk: 5 },
    { name: 'Digital Solutions', plan: 'Growth', revenue: 3.1, sla: 94.0, breaches: 1, tickets: 44, contract: ['ok', 'Active to Jun 2027'], risk: 3 },
    { name: 'Northwind Health', plan: 'Enterprise', revenue: 4.7, sla: 96.8, breaches: 0, tickets: 51, contract: ['ok', 'Active to Jul 2028'], risk: 1 },
    { name: 'BrightPath Education', plan: 'Essentials', revenue: 1.1, sla: 97.5, breaches: 0, tickets: 27, contract: ['ok', 'Active to Aug 2027'], risk: 1 }
  ];
  const CLIENTS_SHOWN = 5;

  function commentaryBox() {
    return `
      <section class="head-commentary">
        <span class="head-commentary-eyebrow">This quarter so far</span>
        ${COMMENTARY.map(p => `<p>${p}</p>`).join('')}
      </section>`;
  }

  function teamTiles() {
    return `
      <section class="head-teams">
        <h2 class="dash-heading">By team</h2>
        <div class="team-grid">
          ${TEAMS.map(t => `
            <button type="button" class="team-tile" data-state="${t.state}" data-person="${t.personId}" ${t.lead === 'You' ? 'disabled' : ''}>
              <span class="team-tile-top">
                <span class="team-name">${t.name}</span>
                <span class="team-status" data-state="${t.state}">${{ ok: 'On track', warn: 'Watch', bad: 'Needs you' }[t.state]}</span>
              </span>
              <span class="team-lead">${t.lead || RBAC.PEOPLE[t.personId].name.split(' ')[0]}</span>
              <span class="team-stat">${t.stat}</span>
              <span class="team-stat-label">${t.statLabel}</span>
              <ul class="team-points">${t.points.map(p => `<li>${p}</li>`).join('')}</ul>
              ${t.lead === 'You' ? '' : '<span class="team-open">View as lead ›</span>'}
            </button>`).join('')}
        </div>
      </section>`;
  }

  function clientHealth() {
    const rows = [...CLIENT_HEALTH].sort((a, b) => b.risk - a.risk).slice(0, CLIENTS_SHOWN);
    return `
      <section class="dash-panel head-clients">
        <header class="dash-panel-header">
          <h2>Client health</h2>
          <span class="dash-panel-meta">Top ${CLIENTS_SHOWN} by risk of ${CLIENT_HEALTH.length}</span>
          <a href="/pages/clients/list.html" class="dash-link">All clients</a>
        </header>
        <table class="client-table">
          <thead><tr><th>Client</th><th>Plan</th><th class="num">Revenue Q4</th><th class="num">Work order SLA</th><th class="num">Breaches</th><th class="num">Tickets</th><th>Contract</th></tr></thead>
          <tbody>
            ${rows.map(c => `
              <tr>
                <td><a href="/pages/clients/list.html">${c.name}</a></td>
                <td class="muted">${c.plan}</td>
                <td class="num">≈ SGD ${c.revenue}K</td>
                <td class="num ${c.sla < 90 ? 'is-bad' : c.sla < 93 ? 'is-warn' : ''}">${c.sla}%</td>
                <td class="num ${c.breaches ? 'is-bad' : 'muted'}">${c.breaches}</td>
                <td class="num">${c.tickets}</td>
                <td><span class="contract-pill" data-state="${c.contract[0]}">${c.contract[1]}</span></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </section>`;
  }

  function headRevenuePanel() {
    const owed = toSGD(COMMERCIAL.money[0].amounts) + toSGD(COMMERCIAL.money[1].amounts);
    return `
      <section class="dash-panel">
        <header class="dash-panel-header">
          <h2>Revenue & margin</h2>
          <span class="dash-panel-meta">≈ SGD · internal</span>
        </header>
        <div class="head-rev-chart">${revenueChart({ compact: true })}</div>
        ${marginBars()}
        <a class="caps-row" href="/pages/billing/invoices.html">
          <span class="money-label">Owed to us</span>
          <span class="money-sgd">${sgd(owed)}</span>
          <span class="money-sub">3 invoices overdue · storage ${sgd(toSGD(COMMERCIAL.money[2].amounts))} / month</span>
        </a>
        <a class="caps-row" href="${COMMERCIAL.caps.link}">
          <span class="money-label">Procurement caps</span>
          <span class="caps-chips"><span data-tone="breached">${COMMERCIAL.caps.over} over</span><span data-tone="risk">${COMMERCIAL.caps.near} near</span><span>${COMMERCIAL.caps.renewing} renewing</span></span>
        </a>
        <p class="dash-footnote">Internal SGD equivalents at ${FX_MONTH_END.date} rates. Client billing is unaffected.</p>
      </section>`;
  }

  // Compact SLA strip: status on the left, the most overdue as a row of cards on the right
  function headSlaPanel() {
    const s = SLA;
    return `
      <section class="dash-panel sla-panel head-sla">
        <header class="dash-panel-header">
          <h2>Work order SLA</h2>
          <span class="dash-panel-meta">${s.open} open</span>
          <a href="${s.link}" class="dash-link">Open tracker</a>
        </header>
        <div class="sla-strip">
          <div class="sla-strip-status">${slaStatus()}</div>
          <div class="sla-strip-overdue">
            <div class="sla-strip-head">
              <h3>Most overdue</h3>
              <a href="${s.link}" class="dash-link">All ${s.breached} breached</a>
            </div>
            <ul>
              ${s.overdue.slice(0, 3).map(o => `
                <li><a href="${o.link}">
                  <span class="sla-overdue-top"><span class="sla-overdue-id">${o.id}</span><span class="sla-overdue-late">${o.late}</span></span>
                  <span class="sla-overdue-sub">${o.client} · ${o.milestone}</span>
                  ${o.blocker ? `<span class="sla-overdue-sub">${o.blocker}</span>` : ''}
                </a></li>`).join('')}
            </ul>
          </div>
        </div>
      </section>`;
  }

  function renderHead(root, user) {
    const all = actionsFor(user);
    const escalations = all.filter(isEscalation);
    const withTeams = {};
    all.filter(a => !isEscalation(a)).forEach(a => {
      const team = TEAM_FOR_SECTION[a.section];
      withTeams[team] = (withTeams[team] || 0) + 1;
    });
    const footer = `
      <div class="handoff">
        <span class="handoff-label">With the teams</span>
        ${Object.entries(withTeams).map(([team, n]) => `<span class="handoff-chip">${team} · ${n}</span>`).join('')}
      </div>`;

    root.innerHTML = `
      ${commentaryBox()}
      ${summaryCards(user)}
      ${teamTiles()}
      <div class="dash-grid dash-grid-stretch">
        ${actionsPanel(escalations, user, { title: 'Escalations', footer })}
        ${headRevenuePanel()}
      </div>
      ${headSlaPanel()}
      ${clientHealth()}`;

    bindActions(root.querySelector('#dash-actions'));
    root.querySelectorAll('.team-tile:not([disabled])').forEach(tile => tile.addEventListener('click', () => {
      RBAC.setCurrentUser(tile.dataset.person);
      window.location.reload();
    }));
  }

  // ---- CS lead view ----
  // Service SLA and tickets are September figures from Service reports (estimated where no report exists yet)
  const PORTFOLIO = [
    { name: 'Acme Tech', tier: 'enterprise', tickets: 142, sla: 96.5, breaches: 3, joiners: 1, leavers: 1, contract: ['warn', 'v5 awaiting acceptance'], report: 'review', risk: 8 },
    { name: 'TechGlobal Inc', tier: 'enterprise', tickets: 211, sla: 91.9, breaches: 2, joiners: 1, leavers: 1, contract: ['warn', 'v3 awaiting acceptance'], report: 'draft', risk: 7 },
    { name: 'Northwind Health', tier: 'enterprise', tickets: 64, sla: 98.4, breaches: 0, joiners: 0, leavers: 0, contract: ['ok', 'Active to Jul 2028'], report: 'review', risk: 1 },
    { name: 'CloudSystems', tier: 'smb', tickets: 34, sla: 90.4, breaches: 1, joiners: 1, leavers: 0, contract: ['bad', 'Expired 30 Sep'], report: 'none', risk: 9 },
    { name: 'Digital Solutions', tier: 'smb', tickets: 87, sla: 88.5, breaches: 1, joiners: 1, leavers: 1, contract: ['ok', 'Active to Jun 2027'], report: 'draft', risk: 6 },
    { name: 'MediaWorks', tier: 'smb', tickets: 58, sla: 97.1, breaches: 2, joiners: 1, leavers: 1, contract: ['warn', 'Term ends 3 Jan 2027'], report: 'none', risk: 5 },
    { name: 'FinanceExperts', tier: 'smb', tickets: 70, sla: 95.2, breaches: 2, joiners: 1, leavers: 0, contract: ['ok', 'Active to May 2027'], report: 'none', risk: 4 },
    { name: 'BrightPath Education', tier: 'smb', tickets: 29, sla: 98.0, breaches: 0, joiners: 0, leavers: 0, contract: ['ok', 'Active to Aug 2027'], report: 'none', risk: 1 }
  ];
  const REPORT_STATE = { review: ['warn', 'In review'], draft: ['warn', 'Draft'], none: ['bad', 'Not generated'], issued: ['ok', 'Issued'] };
  const TIERS = [
    { id: 'enterprise', name: 'Key Accounts', owner: 'nalene' },
    { id: 'smb', name: 'General Accounts', owner: 'thiva' }
  ];

  // Months shown on the contract timeline; at = position in months from 1 Oct 2026
  const TIMELINE = {
    months: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
    today: 0.68,
    events: [
      { at: -0.05, state: 'bad', client: 'CloudSystems', tier: 'smb', text: 'Expired 30 Sep · billing on last accepted terms' },
      { at: 0.68, state: 'warn', client: 'Acme Tech', tier: 'enterprise', text: 'v5 amendment awaiting client acceptance' },
      { at: 0.68, state: 'warn', client: 'TechGlobal Inc', tier: 'enterprise', text: 'v3 amendment awaiting client acceptance' },
      { at: 3.06, state: 'warn', client: 'MediaWorks', tier: 'smb', text: 'Term ends 3 Jan 2027' },
      { at: 4.9, state: 'warn', client: 'Acme Tech', tier: 'enterprise', text: 'Term ends 28 Feb 2027' },
      // Beyond the 6-month window: listed for account managers, no dot on the track
      { at: 7.5, state: 'ok', client: 'FinanceExperts', tier: 'smb', text: 'Term ends 17 May 2027' },
      { at: 8.6, state: 'ok', client: 'Digital Solutions', tier: 'smb', text: 'Term ends 19 Jun 2027' },
      { at: 10.4, state: 'ok', client: 'BrightPath Education', tier: 'smb', text: 'Term ends 14 Aug 2027' },
      { at: 17.4, state: 'ok', client: 'TechGlobal Inc', tier: 'enterprise', text: 'Term ends 11 Mar 2028' },
      { at: 21.9, state: 'ok', client: 'Northwind Health', tier: 'enterprise', text: 'Term ends 29 Jul 2028' }
    ]
  };

  const UPCOMING_PEOPLE = [
    { when: 'Today', kind: 'joiner', name: 'Hafiz Rahman', client: 'MediaWorks', tier: 'smb', flag: ['bad', 'Start date at risk'] },
    { when: 'Thu 23 Oct', kind: 'leaver', name: 'Marcus Lee', client: 'Acme Tech', tier: 'enterprise', flag: ['warn', 'Return box due 22 Oct'] },
    { when: 'Sun 26 Oct', kind: 'joiner', name: 'Priya Nair', client: 'Acme Tech', tier: 'enterprise', flag: ['warn', 'Okta drift on Acme Tech'] },
    { when: 'Tue 28 Oct', kind: 'joiner', name: 'Daniel Okafor', client: 'TechGlobal Inc', tier: 'enterprise', flag: ['warn', 'Workday drift on TechGlobal'] },
    { when: 'Wed 29 Oct', kind: 'joiner', name: 'Chloe Martin', client: 'Digital Solutions', tier: 'smb', flag: ['warn', 'ServiceNow sync failing'] },
    { when: 'Thu 30 Oct', kind: 'leaver', name: 'Anna Schmidt', client: 'TechGlobal Inc', tier: 'enterprise', flag: ['warn', 'Date estimated'] },
    { when: 'Sun 2 Nov', kind: 'joiner', name: 'Grace Liu', client: 'CloudSystems', tier: 'smb', flag: ['warn', 'Contract expired'] },
    { when: 'Thu 6 Nov', kind: 'leaver', name: 'Isabella Rossi', client: 'Digital Solutions', tier: 'smb', flag: ['bad', 'Needs info'] },
    { when: 'Sun 16 Nov', kind: 'joiner', name: 'Tom Fletcher', client: 'FinanceExperts', tier: 'smb', flag: ['warn', 'Workday disconnected'] }
  ];

  const TEAM_COMPARE = {
    enterprise: { clients: 3, tickets: 282, firstResponse: '1h 21m', resolution: '10h 15m', sla: '92.0%', breaches: 5, contracts: '2 amendments pending' },
    smb: { clients: 5, tickets: 204, firstResponse: '58m', resolution: '8h 55m', sla: '95.1%', breaches: 6, contracts: '1 expired · 1 renewing by Jan' }
  };

  const tiersFor = user => TIERS.filter(t => user.canSeeRecord('clients', { clientTier: t.id }));
  const ownerLabel = (t, user) => (t.owner === user.id ? 'You' : RBAC.PEOPLE[t.owner].name.split(' ')[0]);
  const inScope = user => item => user.canSeeRecord('clients', { clientTier: item.tier });

  function portfolioPanel(user) {
    const tiers = tiersFor(user);
    const rowsFor = tier => PORTFOLIO.filter(c => c.tier === tier).sort((a, b) => b.risk - a.risk);
    return `
      <section class="dash-panel cs-portfolio">
        <header class="dash-panel-header">
          <h2>${tiers.length > 1 ? 'Client portfolio' : `My clients · ${tiers[0].name}`}</h2>
          <span class="dash-panel-meta">September service figures · sorted by risk</span>
          <a href="/pages/clients/list.html" class="dash-link">All clients</a>
        </header>
        <table class="client-table">
          <thead><tr><th>Client</th><th class="num">Tickets</th><th class="num">Service SLA</th><th class="num">Open breaches</th><th class="num">Joiners / leavers</th><th>Contract</th><th>Sep report</th></tr></thead>
          ${tiers.map(t => `
            <tbody>
              ${tiers.length > 1 ? `<tr class="tier-row"><th colspan="7">${t.name} <span>· ${ownerLabel(t, user)}</span></th></tr>` : ''}
              ${rowsFor(t.id).map(c => `
                <tr>
                  <td><a href="/pages/clients/list.html">${c.name}</a></td>
                  <td class="num">${c.tickets}</td>
                  <td class="num ${c.sla < 90 ? 'is-bad' : c.sla < 95 ? 'is-warn' : ''}">${c.sla}%</td>
                  <td class="num ${c.breaches ? 'is-bad' : 'muted'}">${c.breaches}</td>
                  <td class="num ${c.joiners + c.leavers ? '' : 'muted'}">${c.joiners} / ${c.leavers}</td>
                  <td><span class="contract-pill" data-state="${c.contract[0]}">${c.contract[1]}</span></td>
                  <td><a class="contract-pill" data-state="${REPORT_STATE[c.report][0]}" href="/pages/reports/service-reports.html">${REPORT_STATE[c.report][1]}</a></td>
                </tr>`).join('')}
            </tbody>`).join('')}
        </table>
      </section>`;
  }

  function contractsPanel(user) {
    const lead = user.can(null, CS_LEAD);
    // Leads see what needs attention; account managers see the full renewal calendar for their clients
    const t = { ...TIMELINE, events: TIMELINE.events.filter(inScope(user)).filter(e => !lead || e.state !== 'ok') };
    const span = t.months.length;
    const x = at => `${Math.max(0, Math.min(100, (at / span) * 100))}%`;
    return `
      <section class="dash-panel cs-contracts-panel">
        <header class="dash-panel-header">
          <h2>Contracts</h2>
          <span class="dash-panel-meta">Next 6 months</span>
          <a href="/pages/clients/list.html" class="dash-link">View</a>
        </header>
        <div class="cs-timeline">
          <div class="cs-track">
            ${t.months.map((m, i) => `<span class="cs-month" style="left:${x(i)}">${m}</span>`).join('')}
            <span class="cs-today" style="left:${x(t.today)}"><span>Today</span></span>
            ${t.events.filter(e => e.at <= span).map(e => `<span class="cs-event" data-state="${e.state}" style="left:${x(e.at)}" title="${e.client}: ${e.text}"></span>`).join('')}
          </div>
        </div>
        <ul class="cs-event-list">
          ${t.events.map(e => `<li data-state="${e.state}"><strong>${e.client}</strong><span>${e.text}</span></li>`).join('')}
        </ul>
        ${lead ? `
          <a class="caps-row" href="${COMMERCIAL.caps.link}">
            <span class="money-label">Procurement caps</span>
            <span class="caps-chips"><span data-tone="breached">${COMMERCIAL.caps.over} over</span><span data-tone="risk">${COMMERCIAL.caps.near} near</span><span>${COMMERCIAL.caps.renewing} renewing</span></span>
          </a>` : ''}
      </section>`;
  }

  function peoplePanel(user) {
    const people = UPCOMING_PEOPLE.filter(inScope(user));
    return `
      <section class="dash-panel cs-people-panel">
        <header class="dash-panel-header">
          <h2>Joiners & leavers</h2>
          <span class="dash-panel-meta">Next 4 weeks</span>
          <a href="/pages/people/joiners.html" class="dash-link">View</a>
        </header>
        <ul class="cs-people">
          ${people.map(p => `
            <li>
              <a href="/pages/people/${p.kind === 'joiner' ? 'joiners' : 'leavers'}.html">
                <span class="cs-when">${p.when}</span>
                <span class="cs-kind" data-kind="${p.kind}">${p.kind === 'joiner' ? 'Joins' : 'Leaves'}</span>
                <span class="cs-person"><strong>${p.name}</strong><span>${p.client}</span></span>
                ${p.flag ? `<span class="cs-flag" data-state="${p.flag[0]}">${p.flag[1]}</span>` : ''}
              </a>
            </li>`).join('')}
        </ul>
      </section>`;
  }

  function myTeamPanel(user) {
    const rows = [
      ['Clients', 'clients'], ['Tickets this quarter', 'tickets'], ['Avg first response', 'firstResponse'],
      ['Avg resolution', 'resolution'], ['Support within SLA', 'sla'], ['Open breaches', 'breaches'], ['Contracts', 'contracts']
    ];
    return `
      <section class="cs-team">
        <h2 class="dash-heading">My team</h2>
        <div class="cs-team-grid">
          ${TIERS.map(t => `
            <article class="dash-panel">
              <header class="dash-panel-header">
                <h3>${t.name}</h3>
                <span class="dash-panel-meta">${ownerLabel(t, user)}</span>
                ${t.owner === user.id ? '' : `<button type="button" class="dash-link cs-view-as" data-person="${t.owner}">View as ${ownerLabel(t, user)}</button>`}
              </header>
              <dl class="cs-team-stats">
                ${rows.map(([label, key]) => `<dt>${label}</dt><dd>${TEAM_COMPARE[t.id][key]}</dd>`).join('')}
              </dl>
            </article>`).join('')}
        </div>
      </section>`;
  }

  // ---- Procurement view ----
  const FLAGS = new Proxy({}, { get: (_, cc) => flagOf(String(cc)) });
  // Lanes: [country, contracted min, max, 30-day actual] in business days to hub, from supply data. onTime and open are QTD.
  const SUPPLIER_SCORES = [
    { vendor: 'Vendor A', link: '/pages/vendors/supplier.html?v=vendorA', onTime: 95, open: 22, lanes: [['SG', 2, 3, 2.6], ['MY', 3, 4, 3.9]] },
    { vendor: 'Vendor B', link: '/pages/vendors/supplier.html?v=vendorB', onTime: 92, open: 11, lanes: [['AU', 3, 5, 3.7], ['GB', 3, 4, 3.6]] },
    { vendor: 'Vendor C', link: '/pages/vendors/supplier.html?v=vendorC', onTime: 72, open: 16, lanes: [['US', 3, 5, 5.6]] },
    { vendor: 'Ingram Micro', link: '/pages/vendors/supplier.html?v=ingram', onTime: 86, open: 14, lanes: [['SG', 4, 6, 5.2], ['MY', 4, 5, 4.4], ['AU', 4, 7, 5.8], ['US', 2, 4, 3.1]] }
  ];
  const LANE_MAX_DAYS = 8;
  // Near limit = in the top 20% of the contracted range
  const laneState = ([, min, max, actual]) => (actual > max ? 'bad' : actual > min + 0.8 * (max - min) ? 'warn' : 'ok');

  // Tracker · Orders has 38 open; the split by stage is illustrative
  const ORDER_PIPELINE = [
    { label: 'Awaiting approval', n: 5 },
    { label: 'PO to place', n: 4, state: 'warn' },
    { label: 'With vendor', n: 26 },
    { label: 'Arriving at hub', n: 3 }
  ];
  const WAITING_ON_VENDORS = [
    { id: 'ORD-30398', client: 'Acme Tech', cc: 'SG', state: 'bad', status: '5d 18h overdue', note: 'Customs hold: missing import permit', link: '/pages/tracker/orders.html' },
    { id: 'ORD-30421', client: 'MediaWorks', cc: 'SG', state: 'bad', status: '4d 20h overdue', note: 'Ingram Micro confirms the last line arrives today', link: '/pages/tracker/orders.html' },
    { id: 'ONB-1188', client: 'FinanceExperts', cc: 'GB', state: 'bad', status: '5d 18h overdue', note: 'Backorder on the 14" model · 16" offered', link: '/pages/tracker/onboarding.html' },
    { id: 'ONB-1182', client: 'MediaWorks', cc: 'SG', state: 'warn', status: '2 of 3 lines in', note: '1 line ETA after due date', link: '/pages/tracker/onboarding.html' },
    { id: 'ONB-1193', client: 'BrightPath Education', cc: 'MY', state: 'warn', status: '1 of 2 lines in', note: '1 line ETA after due date', link: '/pages/tracker/onboarding.html' }
  ];

  // Procurement: day-to-day view of the suppliers on open orders. Jobs and ordering method from Vendors.
  const MY_SUPPLIERS = [
    { vendor: 'Vendor A', link: '/pages/vendors/supplier.html?v=vendorA', countries: ['SG', 'MY'], ordering: 'Integration', jobs: 22, late: 1, partial: 1, lead: '2.6d SG · 3.9d MY' },
    { vendor: 'Vendor B', link: '/pages/vendors/supplier.html?v=vendorB', countries: ['AU', 'GB'], ordering: 'Integration', jobs: 11, late: 1, partial: 0, lead: '3.7d AU · 3.6d GB' },
    { vendor: 'Vendor C', link: '/pages/vendors/supplier.html?v=vendorC', countries: ['US'], ordering: 'Integration', jobs: 16, late: 0, partial: 0, lead: '5.6d US' },
    { vendor: 'Ingram Micro', link: '/pages/vendors/supplier.html?v=ingram', countries: ['SG', 'MY', 'AU', 'US'], ordering: 'Portal + integration', jobs: 14, late: 1, partial: 1, lead: '3.1–5.8d' }
  ];

  function mySuppliersPanel() {
    return `
      <section class="dash-panel proc-scorecard">
        <header class="dash-panel-header">
          <h2>Suppliers on my orders</h2>
          <span class="dash-panel-meta">Hardware suppliers · current lead time is the 30-day actual</span>
          <a href="/pages/vendors/list.html" class="dash-link">Vendors</a>
        </header>
        <table class="client-table">
          <thead><tr><th>Supplier</th><th>Countries</th><th>Ordering</th><th class="num">Assigned jobs</th><th class="num">Late</th><th class="num">Partial</th><th class="num">Current lead time</th></tr></thead>
          <tbody>
            ${MY_SUPPLIERS.map(s => `
              <tr>
                <td><a href="${s.link}">${s.vendor}</a></td>
                <td>${s.countries.map(cc => FLAGS[cc]).join(' ')}</td>
                <td class="muted">${s.ordering}</td>
                <td class="num">${s.jobs}</td>
                <td class="num ${s.late ? 'is-bad' : 'muted'}">${s.late}</td>
                <td class="num ${s.partial ? 'is-warn' : 'muted'}">${s.partial}</td>
                <td class="num">${s.lead}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </section>`;
  }

  // ---- Partnerships view ----
  // Logistics and service partners; metrics from vendor pages where shown, otherwise illustrative
  const SERVICE_VENDORS = [
    { vendor: 'Courier X', type: 'Courier', countries: ['SG', 'MY', 'AU'], metric: 'Deliveries on time 91% · pickups 94%', vsTarget: 'AU last mile 3.4d vs 2–3d', state: 'warn', link: '/pages/vendors/detail.html' },
    { vendor: 'DHL Express', type: 'Courier', countries: ['GB'], metric: 'Last mile 2–3d', vsTarget: 'Integration failing', state: 'bad', link: '/pages/vendors/list.html' },
    { vendor: 'FedEx', type: 'Courier', countries: ['US'], metric: 'Last mile 2–4d · 21 jobs', vsTarget: 'Within target', state: 'ok', link: '/pages/vendors/list.html' },
    { vendor: 'Hub SG Logistics', type: '3PL', countries: ['SG'], metric: '38 jobs · integration healthy', vsTarget: 'Within target', state: 'ok', link: '/pages/warehouses/list.html' },
    { vendor: 'Kerry Logistics', type: '3PL', countries: ['MY', 'AU'], metric: '17 jobs · portal only', vsTarget: 'Within target', state: 'ok', link: '/pages/warehouses/list.html' },
    { vendor: 'FixPoint London', type: 'Repair', countries: ['GB'], metric: 'Turnaround 4.8d · 9 jobs', vsTarget: 'Within 5d target', state: 'ok', link: '/pages/tracker/repairs.html' },
    { vendor: 'iFix Kuala Lumpur', type: 'Repair', countries: ['MY'], metric: 'Turnaround 5.6d · 2 quotes this month', vsTarget: 'Within 7d target', state: 'ok', link: '/pages/tracker/repair-quotes.html' },
    { vendor: 'TechCare New Jersey', type: 'Repair', countries: ['US'], metric: 'Turnaround 4.1d · 1 quote this month', vsTarget: 'Within 5d target', state: 'ok', link: '/pages/tracker/repair-quotes.html' },
    { vendor: 'Dell Service Centre Singapore', type: 'Repair', countries: ['SG'], metric: 'Warranty repairs · REP-0871 awaiting part', vsTarget: 'Part back-ordered', state: 'warn', link: '/pages/tracker/work-order.html?wo=REP-0871' },
    { vendor: 'GreenCycle ITAD', type: 'ITAD', countries: ['SG', 'AU'], metric: 'Certificates on time 97%', vsTarget: 'On hold', state: 'warn', link: '/pages/vendors/list.html' }
  ];
  // Contract end dates from the vendor pages
  const VENDOR_CONTRACTS = [
    { state: 'warn', title: 'Courier X', text: 'Ends 31 Mar 2027 · SG, MY, AU last mile' },
    { state: 'ok', title: 'Vendor A, B, C and Ingram Micro', text: 'All end 30 Jun 2027' }
  ];

  function sourcingPanel() {
    const list = items => `<ul class="cs-event-list">${items.map(i => `<li data-state="${i.state}"><strong>${i.title}</strong><span>${i.text}</span></li>`).join('')}</ul>`;
    return `
      <section class="dash-panel src-panel">
        <header class="dash-panel-header">
          <h2>Vendor contracts</h2>
          <a href="/pages/vendors/list.html" class="dash-link">Vendors</a>
        </header>
        ${list(VENDOR_CONTRACTS)}
      </section>`;
  }

  function vendorPerformancePanel() {
    const status = { ok: 'On target', warn: 'Review', bad: 'Failing' };
    return `
      <section class="dash-panel proc-scorecard">
        <header class="dash-panel-header">
          <h2>Vendor performance</h2>
          <span class="dash-panel-meta">All vendor types · 30-day figures</span>
          <a href="/pages/vendors/list.html" class="dash-link">All vendors</a>
        </header>
        <h3 class="src-subhead">Hardware suppliers · lead time to hub vs contracted range</h3>
        ${laneTable()}
        <div class="proc-legend">
          <span><i class="proc-legend-band"></i>Contracted range</span>
          <span><i class="proc-legend-dot" data-state="ok"></i>Within range</span>
          <span><i class="proc-legend-dot" data-state="warn"></i>Near limit</span>
          <span><i class="proc-legend-dot" data-state="bad"></i>Over range</span>
        </div>
        <h3 class="src-subhead">Logistics and service partners</h3>
        <table class="client-table">
          <thead><tr><th>Vendor</th><th>Type</th><th>Countries</th><th>Performance</th><th>Against target</th><th>Status</th></tr></thead>
          <tbody>
            ${SERVICE_VENDORS.map(v => `
              <tr>
                <td><a href="${v.link}">${v.vendor}</a></td>
                <td class="muted">${v.type}</td>
                <td>${v.countries.map(cc => FLAGS[cc]).join(' ')}</td>
                <td>${v.metric}</td>
                <td class="${v.state === 'bad' ? 'is-bad' : v.state === 'warn' ? 'is-warn' : 'muted'}">${v.vsTarget}</td>
                <td><span class="contract-pill" data-state="${v.state}">${status[v.state]}</span></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </section>`;
  }

  function renderPartnerships(root, user) {
    root.innerHTML = `
      ${summaryCards(user)}
      ${coveragePanel()}
      <div class="dash-grid dash-grid-stretch">
        ${actionsPanel(actionsFor(user), user)}
        ${sourcingPanel()}
      </div>
      ${vendorPerformancePanel()}`;
    bindActions(root.querySelector('#dash-actions'));
    bindCoverage(root.querySelector('.cov-panel'));
  }

  function laneTable() {
    const pctOf = d => (d / LANE_MAX_DAYS) * 100;
    return `
        <table class="client-table proc-table">
          <thead><tr><th>Supplier</th><th class="num">On time (QTD)</th><th class="num">Open orders</th><th>Country</th><th class="proc-lane-col">Lead time (0–${LANE_MAX_DAYS} business days)</th><th class="num">Actual</th></tr></thead>
          ${SUPPLIER_SCORES.map(s => `
            <tbody>
              ${s.lanes.map((lane, i) => {
                const [cc, min, max, actual] = lane;
                const state = laneState(lane);
                return `
                  <tr class="${i ? 'is-cont' : ''}">
                    <td>${i ? '' : `<a href="${s.link}">${s.vendor}</a>`}</td>
                    <td class="num ${i ? '' : s.onTime < 80 ? 'is-bad' : s.onTime < 90 ? 'is-warn' : ''}">${i ? '' : `${s.onTime}%`}</td>
                    <td class="num">${i ? '' : s.open}</td>
                    <td>${FLAGS[cc]} ${cc}</td>
                    <td class="proc-lane-col">
                      <span class="proc-lane" title="Contracted ${min}–${max}d · actual ${actual}d">
                        <span class="proc-band" style="left:${pctOf(min)}%;width:${pctOf(max - min)}%"></span>
                        <span class="proc-actual" data-state="${state}" style="left:${pctOf(actual)}%"></span>
                      </span>
                    </td>
                    <td class="num ${state === 'bad' ? 'is-bad' : state === 'warn' ? 'is-warn' : ''}">${actual}d <span class="muted">/ ${min}–${max}d</span></td>
                  </tr>`;
              }).join('')}
            </tbody>`).join('')}
        </table>`;
  }

  function vendorWaitPanel() {
    const total = ORDER_PIPELINE.reduce((sum, p) => sum + p.n, 0);
    return `
      <section class="dash-panel proc-wait-panel">
        <header class="dash-panel-header">
          <h2>Waiting on vendors</h2>
          <span class="dash-panel-meta">${total} open orders</span>
          <a href="/pages/tracker/orders.html" class="dash-link">Tracker</a>
        </header>
        <div class="proc-pipeline">
          ${ORDER_PIPELINE.map(p => `<div class="proc-stage" ${p.state ? `data-state="${p.state}"` : ''}><span class="proc-stage-n">${p.n}</span><span class="proc-stage-label">${p.label}</span></div>`).join('')}
        </div>
        <ul class="proc-wait">
          ${WAITING_ON_VENDORS.map(w => `
            <li><a href="${w.link}" data-state="${w.state}">
              <span class="sla-overdue-top"><span class="sla-overdue-id">${w.id}</span><span class="proc-wait-status">${w.status}</span></span>
              <span class="sla-overdue-sub">${FLAGS[w.cc]} ${w.client} · ${w.note}</span>
            </a></li>`).join('')}
        </ul>
      </section>`;
  }

  function renderProcurement(root, user) {
    root.innerHTML = `
      ${summaryCards(user)}
      <div class="dash-grid dash-grid-stretch">
        ${actionsPanel(actionsFor(user), user)}
        ${vendorWaitPanel()}
      </div>
      ${mySuppliersPanel()}`;
    bindActions(root.querySelector('#dash-actions'));
  }

  // ---- Control Tower view ----
  // Partner sync health: how status reaches the tracker (Vendors · Integration status and access method)
  const PARTNER_SYNC = [
    { vendor: 'DHL Express', type: 'Courier', method: 'Integration', state: 'bad', last: 'Failing · manual updates', jobs: 46, link: '/pages/vendors/list.html' },
    { vendor: 'Courier X', type: 'Courier', method: 'Both', state: 'ok', last: '4 min ago', jobs: 38, link: '/pages/vendors/access.html' },
    { vendor: 'FedEx', type: 'Courier', method: 'Integration', state: 'ok', last: '6 min ago', jobs: 21, link: '/pages/vendors/list.html' },
    { vendor: 'Hub SG Logistics', type: '3PL', method: 'Both', state: 'ok', last: '12 min ago', jobs: 38, link: '/pages/warehouses/list.html' },
    { vendor: 'Kerry Logistics', type: '3PL', method: 'Portal', state: 'warn', last: 'Portal · updated 2h ago', jobs: 17, link: '/pages/warehouses/list.html' },
    { vendor: 'FixPoint London', type: 'Repair', method: 'Portal', state: 'warn', last: 'Portal · updated yesterday', jobs: 9, link: '/pages/vendors/list.html' },
    { vendor: 'GreenCycle ITAD', type: 'ITAD', method: 'Portal', state: 'warn', last: 'On hold', jobs: 5, link: '/pages/vendors/list.html' }
  ];
  const SYNC_LABEL = { ok: 'Syncing', warn: 'Manual', bad: 'Failing' };

  function partnerSyncPanel() {
    const counts = PARTNER_SYNC.reduce((c, p) => ({ ...c, [p.state]: (c[p.state] || 0) + 1 }), {});
    return `
      <section class="dash-panel tower-sync">
        <header class="dash-panel-header">
          <h2>Partner status updates</h2>
          <span class="dash-panel-meta">${counts.ok || 0} syncing · ${counts.warn || 0} manual · ${counts.bad || 0} failing</span>
          <a href="/pages/vendors/list.html" class="dash-link">Vendors</a>
        </header>
        <ul class="tower-sync-list">
          ${PARTNER_SYNC.map(p => `
            <li><a href="${p.link}">
              <span class="tower-sync-dot" data-state="${p.state}"></span>
              <span class="tower-sync-main"><strong>${p.vendor}</strong><span>${p.type} · ${p.method} · ${p.jobs} jobs</span></span>
              <span class="tower-sync-last" data-state="${p.state}"><span>${SYNC_LABEL[p.state]}</span>${p.last}</span>
            </a></li>`).join('')}
        </ul>
        <p class="dash-footnote">Manual = portal-only partner; status depends on their staff updating it.</p>
      </section>`;
  }

  function omsPipelinePanel() {
    const maxRow = Math.max(...OMS_PIPELINE.map(r => Object.values(r.stages).reduce((a, b) => a + b, 0)));
    return `
      <section class="dash-panel oms-panel">
        <header class="dash-panel-header">
          <h2>Order fulfillment pipeline</h2>
          <span class="dash-panel-meta">${OMS_OPEN} open work orders by service and stage</span>
          <a href="/pages/tracker/all.html" class="dash-link">Open tracker</a>
        </header>
        <div class="oms-stage-totals">
          ${OMS_STAGES.map(s => `
            <div class="oms-stage-total" data-stage="${s.id}">
              <span class="oms-stage-n">${OMS_TOTALS[s.id]}</span>
              <span class="oms-stage-label"><i></i>${s.label}</span>
            </div>`).join('')}
        </div>
        <table class="client-table oms-table">
          <thead>
            <tr>
              <th>Service</th>
              ${OMS_STAGES.map(s => `<th class="num">${s.label}</th>`).join('')}
              <th class="num">Open</th>
              <th class="oms-bar-col">Mix</th>
              <th class="num">At risk</th>
              <th class="num">Breached</th>
            </tr>
          </thead>
          <tbody>
            ${OMS_PIPELINE.map(r => {
              const open = Object.values(r.stages).reduce((a, b) => a + b, 0);
              return `
                <tr>
                  <td><a href="${r.link}">${r.label}</a></td>
                  ${OMS_STAGES.map(s => `<td class="num ${!r.stages[s.id] ? 'muted' : s.tone ? 'is-warn' : ''}">${r.stages[s.id]}</td>`).join('')}
                  <td class="num oms-open">${open}</td>
                  <td class="oms-bar-col"><span class="oms-bar" style="width:${(open / maxRow) * 100}%">
                    ${OMS_STAGES.map(s => `<i data-stage="${s.id}" style="width:${(r.stages[s.id] / open) * 100}%"></i>`).join('')}
                  </span></td>
                  <td class="num ${r.risk ? 'is-warn' : 'muted'}">${r.risk}</td>
                  <td class="num ${r.breached ? 'is-bad' : 'muted'}">${r.breached}</td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </section>`;
  }

  function priorityOrdersPanel() {
    return `
      <section class="dash-panel oms-priority">
        <header class="dash-panel-header">
          <h2>Priority orders</h2>
          <span class="dash-panel-meta">Rush, start-date critical and exec requests · most urgent first</span>
          <a href="/pages/tracker/all.html" class="dash-link">All by risk</a>
        </header>
        <table class="client-table">
          <thead><tr><th>Work order</th><th>Client</th><th>Priority</th><th>Current milestone</th><th>Waiting on</th><th>Owner</th><th class="num">SLA</th></tr></thead>
          <tbody>
            ${PRIORITY_ORDERS.map(o => `
              <tr>
                <td><a href="${o.link}">${o.id}</a></td>
                <td>${flagOf(o.cc)} ${o.client}</td>
                <td><span class="oms-why">${o.why}</span></td>
                <td>${o.stage}</td>
                <td class="${/ops|Hub/.test(o.waiting) ? 'muted' : 'is-warn'}">${o.waiting}</td>
                <td class="muted">${o.owner}</td>
                <td class="num ${o.state === 'bad' ? 'is-bad' : 'is-warn'}">${o.due}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </section>`;
  }

  function renderTower(root, user) {
    root.innerHTML = `
      ${summaryCards(user)}
      ${omsPipelinePanel()}
      <div class="dash-grid dash-grid-stretch">
        ${actionsPanel(actionsFor(user), user)}
        ${partnerSyncPanel()}
      </div>
      ${priorityOrdersPanel()}`;
    bindActions(root.querySelector('#dash-actions'));
  }

  // ---- IT lead analytics ----
  // Weekly history is illustrative; the latest week and quarter figures match the summary cards.
  const IT_WEEKS = ['21 Jul', '28 Jul', '4 Aug', '11 Aug', '18 Aug', '25 Aug', '1 Sep', '8 Sep', '15 Sep', '22 Sep', '29 Sep', '6 Oct', '13 Oct'];
  const IT_TREND = {
    opened: [131, 138, 135, 142, 140, 147, 144, 151, 149, 155, 152, 160, 166],
    resolved: [127, 134, 132, 139, 137, 143, 141, 148, 146, 152, 149, 156, 161],
    firstResponse: [92, 90, 89, 88, 86, 85, 84, 80, 79, 77, 75, 73, 72], // minutes
    resolution: [10.8, 10.6, 10.7, 10.4, 10.3, 10.2, 10.1, 9.9, 10.0, 9.8, 9.7, 9.6, 9.7] // hours
  };
  // Q4 to date vs Q3, by work order type that IT EUC owns
  const IT_SLA = [
    { label: 'Support', q4: 93.4, q3: 91.6, target: 95, link: '/pages/tracker/support.html' },
    { label: 'Repairs', q4: 88.5, q3: 86.0, target: 90, link: '/pages/tracker/repairs.html' },
    { label: 'Onboarding', q4: 84.2, q3: 87.3, target: 92, link: '/pages/tracker/onboarding.html' },
    { label: 'Offboarding', q4: 94.7, q3: 93.1, target: 92, link: '/pages/tracker/offboarding.html' },
    { label: 'Redeployments', q4: 85.7, q3: 90.0, target: 90, link: '/pages/tracker/redeployments.html' }
  ];
  // What tickets are about this quarter (486). Categories from Support ticket titles.
  const IT_CATEGORIES = [
    { label: 'Access & accounts', n: 132, delta: +18, eg: 'MFA, Okta, shared drives' },
    { label: 'Hardware fault', n: 104, delta: +6, eg: 'Boot, battery, display' },
    { label: 'Network & VPN', n: 78, delta: +21, eg: 'VPN drops, Wi-Fi' },
    { label: 'Peripherals', n: 64, delta: -4, eg: 'Headsets, keyboards, monitors' },
    { label: 'Software & apps', n: 61, delta: -2, eg: 'Outlook, Slack, drivers' },
    { label: 'Requests', n: 47, delta: +3, eg: 'Second monitor, new kit' }
  ];
  // Open work per person from the Support and Repairs boards (Kelvin Tan is the field technician)
  const IT_WORKLOAD = [
    { name: 'Qonit', support: 4, repairs: 1, onboarding: 5 },
    { name: 'Jia Ling', support: 3, repairs: 3, onboarding: 3 },
    { name: 'Aisha', support: 2, repairs: 2, onboarding: 4 },
    { name: 'Marcus', support: 1, repairs: 1, onboarding: 2 },
    { name: 'Kelvin Tan', support: 1, repairs: 0, onboarding: 0 },
    { name: 'Unassigned', support: 3, repairs: 0, onboarding: 0, unassigned: true }
  ];
  // Managed laptops by age; 3+ years are due for rotation
  const IT_FLEET = [
    { label: '< 1 yr', n: 812 },
    { label: '1–2 yrs', n: 1046 },
    { label: '2–3 yrs', n: 674 },
    { label: '3–4 yrs', n: 241, due: true },
    { label: '4+ yrs', n: 74, due: true }
  ];
  const IT_ONBOARDING = { months: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'], done: [58, 64, 71, 69, 74, 52], onTime: [91, 90, 88, 87, 86, 84.2] };

  const fmtMins = m => (m >= 60 ? `${Math.floor(m / 60)}h ${String(Math.round(m % 60)).padStart(2, '0')}m` : `${Math.round(m)}m`);

  function supportTrendChart() {
    const t = IT_TREND, n = IT_WEEKS.length;
    const W = 640, H = 210, L = 34, R = 42, T = 16, B = 24;
    const pw = W - L - R, ph = H - T - B;
    const vMax = 180, slot = pw / n, bw = slot * 0.3;
    const x = i => L + slot * i + slot / 2;
    const y = v => T + ph - (v / vMax) * ph;
    const yr = m => T + ph - ((m - 60) / 40) * ph; // first response, 60 to 100 minutes
    const grid = [0, 60, 120, 180].map(v => `<line class="fin-grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="fin-axis" x="${L - 6}" y="${y(v) + 3}" text-anchor="end">${v}</text>`).join('');
    const right = [60, 80, 100].map(m => `<text class="fin-axis itl-axis-r" x="${W - R + 6}" y="${yr(m) + 3}">${m}m</text>`).join('');
    const bars = t.opened.map((o, i) => `
      <rect class="itl-bar-opened ${i === n - 1 ? 'current' : ''}" x="${x(i) - bw - 1}" y="${y(o)}" width="${bw}" height="${y(0) - y(o)}"/>
      <rect class="itl-bar-resolved ${i === n - 1 ? 'current' : ''}" x="${x(i) + 1}" y="${y(t.resolved[i])}" width="${bw}" height="${y(0) - y(t.resolved[i])}"/>`).join('');
    const pts = t.firstResponse.map((m, i) => `${x(i)},${yr(m)}`).join(' ');
    const lastX = x(n - 1), lastY = yr(t.firstResponse[n - 1]);
    const labels = IT_WEEKS.map((w, i) => (i % 3 === 0 || i === n - 1) ? `<text class="fin-axis" x="${x(i)}" y="${H - 6}" text-anchor="middle">${w}</text>` : '').join('');
    return `<svg class="fin-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Weekly tickets opened and resolved, with average first response">
      ${grid}${right}${bars}
      <polyline class="itl-line" points="${pts}"/>
      ${t.firstResponse.map((m, i) => `<circle class="itl-dot ${i === n - 1 ? 'current' : ''}" cx="${x(i)}" cy="${yr(m)}" r="3"/>`).join('')}
      <text class="itl-line-label" x="${lastX}" y="${lastY - 9}" text-anchor="middle">${fmtMins(t.firstResponse[n - 1])}</text>
      ${labels}
    </svg>`;
  }

  function itSupportTrendPanel() {
    const t = IT_TREND, last = IT_WEEKS.length - 1;
    const backlog = t.opened.reduce((s, v, i) => s + v - t.resolved[i], 0);
    return `
      <section class="dash-panel itl-trend">
        <header class="dash-panel-header">
          <h2>Support volume and speed</h2>
          <span class="dash-panel-meta">Last 13 weeks</span>
          <a href="${SUPPORT}" class="dash-link">Support board</a>
        </header>
        <div class="itl-trend-stats">
          <div><span class="fin-big">${t.opened[last]}</span><span class="fin-label">Opened last week · up ${Math.round((t.opened[last] / t.opened[0] - 1) * 100)}% since July</span></div>
          <div><span class="fin-big">${t.resolved[last]}</span><span class="fin-label">Resolved last week</span></div>
          <div><span class="fin-big ${backlog > 50 ? 'is-warn-text' : ''}">+${backlog}</span><span class="fin-label">Backlog growth over 13 weeks</span></div>
          <div><span class="fin-big">${t.resolution[last]}h</span><span class="fin-label">Avg resolution · target 16h</span></div>
        </div>
        <div class="itl-chart-wrap">${supportTrendChart()}</div>
        <div class="fin-legend itl-legend">
          <span><i class="itl-key-opened"></i>Opened</span>
          <span><i class="itl-key-resolved"></i>Resolved</span>
          <span><i class="fin-legend-line itl-key-line"></i>Avg first response (right axis · target 2h)</span>
        </div>
      </section>`;
  }

  function itSlaPanel() {
    return `
      <section class="dash-panel itl-sla">
        <header class="dash-panel-header">
          <h2>SLA by service</h2>
          <span class="dash-panel-meta">Q4 to date vs Q3</span>
        </header>
        <ul class="itl-sla-list">
          ${IT_SLA.map(s => {
            const pos = v => `${Math.max(0, Math.min(100, (v - 75) * 4))}%`;
            const state = s.q4 >= s.target ? 'ok' : s.q4 >= s.target - 5 ? 'warn' : 'bad';
            const diff = (s.q4 - s.q3).toFixed(1);
            return `
              <li><a href="${s.link}">
                <span class="itl-sla-top"><span>${s.label}</span><strong data-state="${state}">${s.q4}%</strong></span>
                <span class="itl-sla-track">
                  <span class="itl-sla-fill" data-state="${state}" style="width:${pos(s.q4)}"></span>
                  <span class="itl-sla-target" style="left:${pos(s.target)}" title="Target ${s.target}%"></span>
                  <span class="itl-sla-prev" style="left:${pos(s.q3)}" title="Q3 ${s.q3}%"></span>
                </span>
                <span class="itl-sla-sub"><span class="${diff >= 0 ? 'up' : 'down'}">${diff >= 0 ? '↑' : '↓'} ${Math.abs(diff)} pts vs Q3</span><span>target ${s.target}%</span></span>
              </a></li>`;
          }).join('')}
        </ul>
        <div class="fin-legend itl-legend">
          <span><i class="itl-key-target"></i>Target</span>
          <span><i class="itl-key-prev"></i>Q3</span>
          <span class="muted">Scale 75–100%</span>
        </div>
      </section>`;
  }

  function itCategoriesPanel() {
    const max = Math.max(...IT_CATEGORIES.map(c => c.n));
    const total = IT_CATEGORIES.reduce((s, c) => s + c.n, 0);
    return `
      <section class="dash-panel itl-cats">
        <header class="dash-panel-header">
          <h2>What tickets are about</h2>
          <span class="dash-panel-meta">${total} this quarter · change vs same days of Q3</span>
        </header>
        <ul class="itl-hbars">
          ${IT_CATEGORIES.map(c => `
            <li>
              <span class="itl-hbar-label"><strong>${c.label}</strong><span>${c.eg}</span></span>
              <span class="itl-hbar-track"><span style="width:${(c.n / max) * 100}%"></span></span>
              <span class="itl-hbar-n">${c.n}</span>
              <span class="itl-hbar-delta ${c.delta > 10 ? 'is-warn-text' : 'muted'}">${c.delta > 0 ? '+' : ''}${c.delta}%</span>
            </li>`).join('')}
        </ul>
        <p class="dash-footnote">Network & VPN and Access are growing fastest; most VPN tickets this month are from Acme Tech.</p>
      </section>`;
  }

  function itWorkloadPanel() {
    const total = p => p.support + p.repairs + p.onboarding;
    const max = Math.max(...IT_WORKLOAD.map(total));
    return `
      <section class="dash-panel itl-load">
        <header class="dash-panel-header">
          <h2>Team workload</h2>
          <span class="dash-panel-meta">Open work by owner</span>
          <a href="/pages/tracker/all.html" class="dash-link">Tracker</a>
        </header>
        <ul class="itl-hbars">
          ${IT_WORKLOAD.map(p => `
            <li class="${p.unassigned ? 'is-unassigned' : ''}">
              <span class="itl-hbar-label"><strong>${p.name}</strong></span>
              <span class="itl-hbar-track itl-stack">
                <i class="s-support" style="width:${(p.support / max) * 100}%"></i><i class="s-repairs" style="width:${(p.repairs / max) * 100}%"></i><i class="s-onboarding" style="width:${(p.onboarding / max) * 100}%"></i>
              </span>
              <span class="itl-hbar-n">${total(p)}</span>
            </li>`).join('')}
        </ul>
        <div class="fin-legend itl-legend">
          <span><i class="s-support"></i>Support</span>
          <span><i class="s-repairs"></i>Repairs</span>
          <span><i class="s-onboarding"></i>Onboarding</span>
        </div>
      </section>`;
  }

  function itFleetPanel() {
    const max = Math.max(...IT_FLEET.map(f => f.n));
    const total = IT_FLEET.reduce((s, f) => s + f.n, 0);
    const due = IT_FLEET.filter(f => f.due).reduce((s, f) => s + f.n, 0);
    const o = IT_ONBOARDING, oMax = Math.max(...o.done);
    return `
      <section class="dash-panel itl-fleet">
        <header class="dash-panel-header">
          <h2>Devices and onboarding</h2>
          <a href="/pages/assets/list.html" class="dash-link">Assets</a>
        </header>
        <h3 class="src-subhead">Laptop age · ${total.toLocaleString('en-US')} managed · ${due} due for rotation</h3>
        <div class="itl-cols">
          ${IT_FLEET.map(f => `
            <div class="itl-col ${f.due ? 'is-due' : ''}">
              <span class="itl-col-n">${f.n}</span>
              <span class="itl-col-bar"><span style="height:${(f.n / max) * 100}%"></span></span>
              <span class="itl-col-label">${f.label}</span>
            </div>`).join('')}
        </div>
        <h3 class="src-subhead">Onboardings per month · % set up on time</h3>
        <div class="itl-cols">
          ${o.months.map((m, i) => `
            <div class="itl-col ${i === o.months.length - 1 ? 'is-current' : ''}">
              <span class="itl-col-n ${o.onTime[i] < 88 ? 'is-warn-text' : ''}">${o.onTime[i]}%</span>
              <span class="itl-col-bar"><span style="height:${(o.done[i] / oMax) * 100}%"></span></span>
              <span class="itl-col-label">${m} · ${o.done[i]}</span>
            </div>`).join('')}
        </div>
        <p class="dash-footnote">October is month to date. On-time setup has fallen every month since May.</p>
      </section>`;
  }

  function renderITLead(root, user) {
    root.innerHTML = `
      ${summaryCards(user)}
      <div class="dash-grid dash-grid-stretch itl-row">
        ${itSupportTrendPanel()}
        ${itSlaPanel()}
      </div>
      <div class="itl-grid-2">
        ${itCategoriesPanel()}
        ${itWorkloadPanel()}
      </div>
      <div class="dash-grid dash-grid-stretch">
        ${actionsPanel(actionsFor(user), user)}
        ${itFleetPanel()}
      </div>`;
    bindActions(root.querySelector('#dash-actions'));
  }

  // ---- IT Services view ----
  // From the Support board: columns, cards and clocks as shown there
  const SUPPORT_QUEUE = [
    { id: 'submitted', label: 'Submitted', n: 3, avg: '0.2d' },
    { id: 'triage', label: 'Triage', n: 3, avg: '0.4d' },
    { id: 'tech', label: 'In progress / with tech', n: 4, avg: '1.2d' },
    { id: 'client', label: 'Waiting on client', n: 2, avg: '1.8d', paused: true },
    { id: 'resolved', label: 'Resolved (48h)', n: 2, avg: '0.9d', done: true }
  ];
  const NEEDS_TECH = [
    { id: 'SUP-5538', title: 'Laptop won’t boot after update', client: 'TechGlobal Inc', cc: 'US', priority: 'Urgent', clock: 'First response 18m left', state: 'bad', owner: null },
    { id: 'SUP-5517', title: 'Screen flicker on external display', client: 'TechGlobal Inc', cc: 'US', priority: 'Normal', clock: 'Resolution 2h 15m overdue', state: 'bad', owner: 'Kelvin Tan', note: 'Blocked: awaiting part' },
    { id: 'SUP-5521', title: 'VPN drops every 20 minutes', client: 'Acme Tech', cc: 'SG', priority: 'High', clock: 'Resolution 52m left', state: 'warn', owner: 'Qonit' },
    { id: 'SUP-5536', title: 'Can’t connect to office Wi-Fi', client: 'MediaWorks', cc: 'AU', priority: 'Normal', clock: 'First response 1h 10m left', state: 'ok', owner: null },
    { id: 'SUP-5537', title: 'Second monitor for home office', client: 'Acme Tech', cc: 'SG', priority: 'Low', clock: 'First response 3h 45m left', state: 'ok', owner: null }
  ];
  // From the Repairs board: facility, courier and expected return
  const REPAIRS_IN_FLIGHT = [
    { id: 'REP-0871', device: 'Dell XPS 15', client: 'TechGlobal Inc', facility: 'Dell Service Centre SG', back: 'Was due 14 Oct', state: 'bad', note: 'Blocked: awaiting part · loaner out' },
    { id: 'REP-0869', device: 'MacBook Pro 14" M3', client: 'MediaWorks', facility: 'iFix Kuala Lumpur', back: '1 day late', state: 'bad', note: 'Quote awaiting client' },
    { id: 'REP-0876', device: 'Dell UltraSharp U2723QE', client: 'TechGlobal Inc', facility: 'TechCare New Jersey', back: 'Back today', state: 'warn' },
    { id: 'REP-0877', device: 'MacBook Pro 14" M3', client: 'Acme Tech', facility: 'iFix Kuala Lumpur', back: 'Back 23 Oct', state: 'ok' },
    { id: 'REP-0878', device: 'Jabra Evolve2 65', client: 'Digital Solutions', facility: 'FixPoint London', back: 'Back 24 Oct', state: 'ok' }
  ];
  // Device work due this week, from the Onboarding and Offboarding boards
  const DEVICE_WORK = [
    { when: 'Now', kind: 'Provision', id: 'ONB-1186', person: 'Sophie Tan', client: 'Acme Tech', task: 'Jamf enrolment at Singapore Hub', state: 'bad' },
    { when: 'Today', kind: 'Ship', id: 'ONB-1185', person: 'Ryan Cooper', client: 'CloudSystems', task: 'Intune applied · courier pickup this afternoon', state: 'bad' },
    { when: 'Mon', kind: 'Ship', id: 'ONB-1190', person: 'Hannah Lee', client: 'TechGlobal Inc', task: 'Kit packed · label created', state: 'warn' },
    { when: 'Today', kind: 'Sign-off', id: 'ONB-1179', person: 'Mei Lin Tan', client: 'MediaWorks', task: 'Confirm setup with the employee', state: 'warn' },
    { when: 'Thu 23 Oct', kind: 'Collect', id: 'OFF', person: 'Marcus Lee', client: 'Acme Tech', task: 'Return box · 1 laptop to redeploy, 1 mouse to store', state: 'ok' }
  ];

  function supportQueuePanel() {
    const open = SUPPORT_QUEUE.filter(s => !s.done).reduce((n, s) => n + s.n, 0);
    return `
      <section class="dash-panel it-queue">
        <header class="dash-panel-header">
          <h2>Support queue</h2>
          <span class="dash-panel-meta">${open} open · avg time in each stage</span>
          <a href="${SUPPORT}" class="dash-link">Support board</a>
        </header>
        <div class="it-queue-stages">
          ${SUPPORT_QUEUE.map(s => `
            <a class="it-stage" href="${SUPPORT}" data-stage="${s.id}">
              <span class="it-stage-n">${s.n}</span>
              <span class="it-stage-label">${s.label}</span>
              <span class="it-stage-avg">${s.paused ? 'SLA paused · ' : ''}avg ${s.avg}</span>
            </a>`).join('')}
        </div>
        <h3 class="src-subhead">Needs a tech now</h3>
        <ul class="it-tickets">
          ${NEEDS_TECH.map(t => `
            <li><a href="${SUPPORT}" data-state="${t.state}">
              <span class="it-ticket-main">
                <span class="it-ticket-top"><strong>${t.id}</strong><span class="it-priority" data-priority="${t.priority.toLowerCase()}">${t.priority}</span>${t.note ? `<span class="it-blocked">${t.note}</span>` : ''}</span>
                <span class="it-ticket-title">${t.title}</span>
                <span class="it-ticket-sub">${flagOf(t.cc)} ${t.client} · ${t.owner ? t.owner : '<em>Unassigned</em>'}</span>
              </span>
              <span class="it-clock" data-state="${t.state}">${t.clock}</span>
            </a></li>`).join('')}
        </ul>
      </section>`;
  }

  function repairsPanel() {
    return `
      <section class="dash-panel it-repairs">
        <header class="dash-panel-header">
          <h2>Repairs in flight</h2>
          <span class="dash-panel-meta">8 open · 2 quotes need action</span>
          <a href="/pages/tracker/repairs.html" class="dash-link">Repairs</a>
        </header>
        <ul class="proc-wait">
          ${REPAIRS_IN_FLIGHT.map(r => `
            <li><a href="/pages/tracker/work-order.html?wo=${r.id}" data-state="${r.state}">
              <span class="sla-overdue-top"><span class="sla-overdue-id">${r.id}</span><span class="proc-wait-status">${r.back}</span></span>
              <span class="sla-overdue-sub">${r.device} · ${r.client}</span>
              <span class="sla-overdue-sub">${r.facility}${r.note ? ` · ${r.note}` : ''}</span>
            </a></li>`).join('')}
        </ul>
      </section>`;
  }

  function deviceWorkPanel() {
    return `
      <section class="dash-panel it-devices">
        <header class="dash-panel-header">
          <h2>Device work this week</h2>
          <span class="dash-panel-meta">Provisioning, dispatch, setup sign-off and collections</span>
          <a href="/pages/tracker/onboarding.html" class="dash-link">Onboarding</a>
        </header>
        <table class="client-table">
          <thead><tr><th>When</th><th>Task</th><th>Work order</th><th>Person</th><th>What’s needed</th></tr></thead>
          <tbody>
            ${DEVICE_WORK.map(d => `
              <tr>
                <td class="${d.state === 'bad' ? 'is-bad' : d.state === 'warn' ? 'is-warn' : ''}">${d.when}</td>
                <td><span class="cs-kind" data-kind="${d.kind === 'Collect' ? 'leaver' : 'joiner'}">${d.kind}</span></td>
                <td>${d.id === 'OFF' ? '<span class="muted">Not raised</span>' : `<a href="/pages/tracker/onboarding-detail.html?id=${d.id}">${d.id}</a>`}</td>
                <td>${d.person} <span class="muted">· ${d.client}</span></td>
                <td>${d.task}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </section>`;
  }

  function renderIT(root, user) {
    root.innerHTML = `
      ${summaryCards(user)}
      <div class="dash-grid dash-grid-stretch">
        ${supportQueuePanel()}
        ${repairsPanel()}
      </div>
      <div class="dash-grid dash-grid-stretch">
        ${actionsPanel(actionsFor(user), user)}
        ${deviceWorkPanel()}
      </div>`;
    bindActions(root.querySelector('#dash-actions'));
  }

  function renderCS(root, user) {
    const lead = user.can(null, CS_LEAD);
    root.innerHTML = `
      ${summaryCards(user)}
      ${portfolioPanel(user)}
      <div class="dash-grid dash-grid-stretch">
        ${actionsPanel(actionsFor(user), user)}
        ${contractsPanel(user)}
      </div>
      ${peoplePanel(user)}
      ${lead ? myTeamPanel(user) : ''}`;

    bindActions(root.querySelector('#dash-actions'));
    root.querySelectorAll('.cs-view-as').forEach(btn => btn.addEventListener('click', () => {
      RBAC.setCurrentUser(btn.dataset.person);
      window.location.reload();
    }));
  }

  function render(root, user) {
    if (user.isHead) {
      renderHead(root, user);
      return;
    }
    if (csView(user)) {
      renderCS(root, user);
      return;
    }
    if (procView(user)) {
      renderProcurement(root, user);
      return;
    }
    if (itLeadView(user)) {
      renderITLead(root, user);
      return;
    }
    if (itView(user)) {
      renderIT(root, user);
      return;
    }
    if (towerView(user)) {
      renderTower(root, user);
      return;
    }
    if (isVisible(PANELS.coverage, user)) {
      renderPartnerships(root, user);
      return;
    }
    const wide = isVisible(PANELS.financeWide, user);
    const aside = !wide && isVisible(PANELS.commercial, user) ? commercialPanel(user) : '';

    root.innerHTML = `
      ${summaryCards(user)}
      ${wide ? financePanel() : ''}
      ${isVisible(PANELS.sla, user) ? slaPanel() : ''}
      <div class="dash-grid ${aside ? '' : 'dash-grid-single'}">
        ${actionsPanel(actionsFor(user), user)}
        ${aside ? `<aside class="dash-aside">${aside}</aside>` : ''}
      </div>
      ${wide ? '' : areaCards(metricsFor(user), user)}`;

    bindActions(root.querySelector('#dash-actions'));
  }

  return { PANELS, CARDS, METRICS, ACTIONS, metricsFor, actionsFor, isVisible, render };
})();
