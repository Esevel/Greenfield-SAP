// Org chart is the single source of truth for access: tag people to teams here, nowhere else.
window.ORG_DATA = (() => {
  const CAPABILITIES = {
    clients: 'Clients',
    support: 'Support tickets',
    sla: 'SLA',
    vendors: 'Vendors',
    vendor_performance: 'Vendor performance',
    work_orders: 'Work orders',
    coordination: 'Coordination',
    purchase_orders: 'Purchase orders',
    quotes: 'Quotes',
    stock: 'Stock',
    warehouses: 'Warehouses',
    shipments: 'Shipments',
    breakfix: 'Break-fix',
    onboarding: 'Onboarding',
    rotations: 'Rotations',
    assets: 'Assets',
    mdm: 'MDM',
    billing: 'Billing',
    finance_reporting: 'Internal revenue and margin (SGD)',
    people: 'People (joiners, leavers)',
    integrations: 'Integrations'
  };

  const PEOPLE = {
    matthew: { name: 'Matthew Lee', title: 'Head of Operations' },
    nalene: { name: 'Nalene Lyhor', title: 'Customer Success Manager' },
    thiva: { name: 'Thiva', title: 'Account Manager' },
    kirthinni: { name: 'Kirthinni' },
    // viewAs: false keeps them in the org chart but out of the demo "Viewing as" switcher
    siti: { name: 'Siti', viewAs: false },
    vinh: { name: 'Vinh', title: 'Intern – Ops' },
    natasa: { name: 'Natasa' },
    yosefin: { name: 'Yosefin' },
    karen: { name: 'Karen Pearl Enrique', title: 'Head of IT' },
    justin: { name: 'Justin Cueto', title: 'EUC Team Lead', viewAs: false },
    roehl: { name: 'Roehl' },
    jericho: { name: 'Jericho' },
    cassandra: { name: 'Cassandra' },
    jerome: { name: 'Jerome' },
    pooja: { name: 'Pooja', title: 'Finance' }
  };

  const ORG = {
    head: 'matthew',
    // Cross-team work: every position gets these (e.g. a joiner needs CS, Ops and IT)
    shared: ['people', 'integrations'],
    functions: [
      {
        id: 'customer_success',
        name: 'Customer Success',
        lead: 'nalene',
        teamLead: null,
        teams: [
          { id: 'key_accounts', name: 'Key Accounts', scope: { clientTier: 'enterprise' },
            capabilities: ['clients', 'support', 'sla'], members: ['nalene'] },
          { id: 'general_accounts', name: 'General Accounts', scope: { clientTier: 'smb' },
            capabilities: ['clients', 'support', 'sla'], members: ['thiva'] }
        ]
      },
      {
        id: 'partnerships',
        name: 'Partnerships',
        lead: 'matthew',
        teamLead: null,
        teams: [
          // Vendor-facing only: client people and integrations aren't relevant, so no shared capabilities
          { id: 'global_partnerships', name: 'Global Partnerships', shared: false,
            capabilities: ['vendors', 'vendor_performance'], members: ['kirthinni'] },
          { id: 'control_tower', name: 'Control Tower',
            capabilities: ['work_orders', 'sla', 'coordination'], members: ['siti', 'vinh'] }
        ]
      },
      {
        id: 'supply_chain',
        name: 'Supply Chain',
        lead: 'matthew',
        teamLead: null,
        teams: [
          // Supplier-facing: client integrations aren't relevant; joiners needing orders surface as procurement actions
          { id: 'procurement', name: 'Procurement', shared: false,
            capabilities: ['vendors', 'purchase_orders', 'quotes'], members: ['natasa', 'yosefin'] },
          { id: 'service_delivery', name: 'Service Delivery',
            capabilities: ['work_orders', 'stock', 'warehouses', 'shipments'], members: ['siti', 'justin'] }
        ]
      },
      {
        id: 'it_euc',
        name: 'IT EUC',
        lead: 'karen',
        teamLead: 'justin',
        teams: [
          { id: 'it_services', name: 'IT Services',
            capabilities: ['support', 'breakfix', 'onboarding', 'rotations', 'assets'],
            members: ['roehl', 'jericho', 'cassandra', 'jerome'] }
        ]
      },
      {
        id: 'finance',
        name: 'Finance',
        lead: 'pooja',
        teamLead: null,
        teams: [
          { id: 'finance_ops', name: 'Finance', capabilities: ['billing', 'finance_reporting'], members: [] }
        ]
      }
    ]
  };

  return { CAPABILITIES, PEOPLE, ORG };
})();
