// Configurable role/module access for the prototype. This is UI gating only, not server-side security.
window.RoleAccess = (() => {
  const STORAGE_KEY = 'greenfield-role-access-v1';
  const USER_KEY = 'greenfield-demo-user';

  const MODULES = [
    { id: 'dashboard', label: 'Dashboard', group: 'Workspace' },
    { id: 'people', label: 'People', group: 'Workspace' },
    { id: 'quotation', label: 'Orders · Quotation', group: 'Orders' },
    { id: 'attention', label: 'Needs attention', group: 'Operations' },
    { id: 'orders', label: 'Orders', group: 'Operations' },
    { id: 'services', label: 'Services', group: 'Operations' },
    { id: 'support', label: 'Support', group: 'Operations' },
    { id: 'catalogue', label: 'Catalogue', group: 'Operations' },
    { id: 'assets', label: 'Assets', group: 'Operations' },
    { id: 'stock', label: 'Stock', group: 'Operations' },
    { id: 'vendors', label: 'Vendors', group: 'Operations' },
    { id: 'reports', label: 'Service reports', group: 'Operations' },
    { id: 'clients', label: 'Clients', group: 'Commercial & Finance' },
    { id: 'billing', label: 'Billing', group: 'Commercial & Finance' },
    { id: 'warehouses', label: 'Warehouses', group: 'Operations' },
    { id: 'sla-config', label: 'SLA configuration', group: 'Operations' },
    { id: 'operating-calendar', label: 'Operating calendar', group: 'Operations' },
    { id: 'integrations', label: 'Integrations', group: 'Platform' },
    { id: 'fees', label: 'Fee settings', group: 'Commercial & Finance' },
    { id: 'access-control', label: 'Role access & users', group: 'Administration' }
  ];
  const CAPABILITY_MODULE = {
    clients: 'clients', support: 'support', sla: 'services', vendors: 'vendors',
    vendor_performance: 'vendors', work_orders: 'services', coordination: 'attention',
    purchase_orders: 'orders', quotes: 'services', stock: 'stock', warehouses: 'warehouses',
    shipments: 'services', breakfix: 'support', onboarding: 'services', rotations: 'assets',
    assets: 'assets', mdm: 'assets', billing: 'billing', finance_reporting: 'billing',
    people: 'people', integrations: 'integrations'
  };

  const FUNCTION_GROUPS = [
    { id: 'customer_success', label: 'Customer Success', modules: ['dashboard', 'people', 'attention', 'clients', 'services', 'support', 'reports', 'quotation'] },
    { id: 'partnerships', label: 'Partnerships', modules: ['dashboard', 'attention', 'vendors', 'reports', 'integrations', 'quotation'] },
    { id: 'supply_chain', label: 'Supply Chain', modules: ['dashboard', 'attention', 'orders', 'services', 'stock', 'warehouses', 'vendors', 'sla-config', 'operating-calendar', 'quotation'] },
    { id: 'it', label: 'IT', modules: ['dashboard', 'people', 'services', 'support', 'assets', 'integrations'] },
    { id: 'commercial', label: 'Commercial', modules: ['dashboard', 'attention', 'orders', 'clients', 'billing', 'reports', 'quotation'] },
    { id: 'administrative_finance', label: 'Administrative · Finance', modules: ['dashboard', 'clients', 'billing', 'fees', 'reports', 'integrations', 'quotation'] },
    { id: 'product', label: 'Product', modules: ['dashboard', 'catalogue', 'reports', 'integrations'] },
    { id: 'engineering', label: 'Engineering', modules: ['dashboard', 'assets', 'integrations', 'reports'] }
  ];

  const opsModules = [...new Set([...FUNCTION_GROUPS.slice(0, 4).flatMap(fn => fn.modules), 'access-control', 'quotation'])];
  const allModules = MODULES.map(module => module.id);
  const ROLES = [
    { id: 'head_operations', label: 'Head of Operations', description: 'Oversight across Customer Success, Partnerships, Supply Chain and IT.', modules: opsModules, kind: 'executive' },
    { id: 'ceo_super_admin', label: 'CEO · Super Admin', description: 'Full access across every function and module.', modules: allModules, kind: 'super-admin', locked: true },
    ...FUNCTION_GROUPS.flatMap(fn => [
      { id: `${fn.id}_manager`, label: `${fn.label} · Manager`, description: `Function lead access for ${fn.label}.`, modules: fn.modules, kind: 'function', functionId: fn.id },
      { id: `${fn.id}_member`, label: `${fn.label} · Member`, description: `Day-to-day access for ${fn.label}.`, modules: fn.modules, kind: 'function', functionId: fn.id }
    ]),
    { id: 'engineering_super_admin', label: 'Engineering · Super Admin', description: 'Super Admin access for Engineering, including every module.', modules: allModules, kind: 'super-admin', locked: true, functionId: 'engineering' }
  ];

  const seedUsers = [
    { id: 'matthew', name: 'Matthew Lee', email: 'matthew.lee@esevel.site', title: 'Head of Operations', roles: ['head_operations'] },
    { id: 'yuying', name: 'Yuying', email: 'yuying@esevel.site', title: 'CEO', roles: ['ceo_super_admin'] },
    { id: 'samnan', name: 'Samnan', email: 'samnan@esevel.site', title: 'Tech Lead · Engineering', roles: ['engineering_super_admin'] },
    { id: 'nalene', name: 'Nalene Lyhor', email: 'nalene.lyhor@esevel.site', title: 'Customer Success Manager', roles: ['customer_success_manager'] },
    { id: 'thiva', name: 'Thiva', email: 'thiva@esevel.site', title: 'Account Manager', roles: ['customer_success_member'] },
    { id: 'kirthinni', name: 'Kirthinni', email: 'kirthinni@esevel.site', title: 'Partnerships', roles: ['partnerships_member'] },
    { id: 'siti', name: 'Siti', email: 'siti@esevel.site', title: 'Control Tower', roles: ['partnerships_member'] },
    { id: 'vinh', name: 'Vinh', email: 'vinh@esevel.site', title: 'Operations', roles: ['partnerships_member'] },
    { id: 'natasa', name: 'Natasa', email: 'natasa@esevel.site', title: 'Procurement', roles: ['supply_chain_manager'] },
    { id: 'yosefin', name: 'Yosefin', email: 'yosefin@esevel.site', title: 'Procurement', roles: ['supply_chain_member'] },
    { id: 'karen', name: 'Karen Pearl Enrique', email: 'karen@esevel.site', title: 'Head of IT', roles: ['it_manager'] },
    { id: 'justin', name: 'Justin Cueto', email: 'justin@esevel.site', title: 'IT Team Lead', roles: ['it_member'] },
    { id: 'roehl', name: 'Roehl', email: 'roehl@esevel.site', title: 'IT Services', roles: ['it_member'] },
    { id: 'jericho', name: 'Jericho', email: 'jericho@esevel.site', title: 'IT Services', roles: ['it_member'] },
    { id: 'cassandra', name: 'Cassandra', email: 'cassandra@esevel.site', title: 'IT Services', roles: ['it_member'] },
    { id: 'jerome', name: 'Jerome', email: 'jerome@esevel.site', title: 'IT Services', roles: ['it_member'] },
    { id: 'pooja', name: 'Pooja', email: 'pooja@esevel.site', title: 'Finance', roles: ['administrative_finance_manager'] }
  ];

  function defaultState() {
    return {
      schemaVersion: 4,
      users: seedUsers.map(user => ({ ...user, roles: [...user.roles] })),
      grants: Object.fromEntries(ROLES.map(role => [role.id, [...role.modules]]))
    };
  }

  function readState() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (stored && Array.isArray(stored.users) && stored.grants) {
        const defaults = defaultState();
        const users = stored.users;
        const yuying = users.find(user => user.id === 'ceo' || user.id === 'yuying');
        if (yuying) {
          yuying.id = 'yuying';
          yuying.name = 'Yuying';
          yuying.email = 'yuying@esevel.site';
          yuying.title = 'CEO';
          yuying.roles = [...new Set([...(yuying.roles || []), 'ceo_super_admin'])];
        } else {
          users.push(defaults.users.find(user => user.id === 'yuying'));
        }
        if (!users.some(user => user.id === 'samnan')) users.push(defaults.users.find(user => user.id === 'samnan'));
        stored.grants = { ...defaults.grants, ...stored.grants };
        if ((stored.schemaVersion || 0) < 3) {
          ['customer_success_manager', 'customer_success_member', 'partnerships_manager', 'partnerships_member', 'commercial_manager', 'commercial_member', 'administrative_finance_manager', 'administrative_finance_member', 'supply_chain_manager', 'supply_chain_member'].forEach(roleId => {
            stored.grants[roleId] = [...new Set([...(stored.grants[roleId] || []), 'quotation'])];
          });
        }
        if ((stored.schemaVersion || 0) < 4) {
          stored.grants.head_operations = [...new Set([...(stored.grants.head_operations || []), 'quotation'])];
          stored.schemaVersion = 4;
        }
        ROLES.filter(role => role.locked).forEach(role => { stored.grants[role.id] = [...allModules]; });
        saveState(stored);
        return stored;
      }
    } catch { /* Reset malformed prototype data to defaults. */ }
    const fresh = defaultState();
    saveState(fresh);
    return fresh;
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function currentUserId() {
    const simulated = localStorage.getItem(USER_KEY);
    if (simulated === 'ceo') {
      localStorage.setItem(USER_KEY, 'yuying');
      return 'yuying';
    }
    return simulated || 'yuying';
  }

  function userById(userId = currentUserId(), state = readState()) {
    return state.users.find(user => user.id === userId) || null;
  }

  function modulesForUser(userId = currentUserId(), state = readState()) {
    const user = userById(userId, state);
    if (!user) return new Set();
    return new Set(user.roles.flatMap(roleId => state.grants[roleId] || []));
  }

  function canAccess(moduleId, userId = currentUserId(), state = readState()) {
    return modulesForUser(userId, state).has(moduleId);
  }

  function isSuperAdmin(userId = currentUserId(), state = readState()) {
    const user = userById(userId, state);
    return !!user?.roles.some(roleId => ROLES.some(role => role.id === roleId && role.kind === 'super-admin'));
  }

  // Creating onboarding/offboarding requests on a client's behalf: Customer Success and IT roles,
  // plus Head of Operations and Super Admins.
  const LIFECYCLE_CREATE_ROLES = ['customer_success_manager', 'customer_success_member', 'it_manager', 'it_member', 'head_operations'];
  function canCreateLifecycle(userId = currentUserId(), state = readState()) {
    if (isSuperAdmin(userId, state)) return true;
    const user = userById(userId, state);
    return !!user?.roles.some(roleId => LIFECYCLE_CREATE_ROLES.includes(roleId));
  }

  function routeModule(path = window.location.pathname) {
    const routes = [
      ['/pages/settings/access-control.html', 'access-control'],
        ['/pages/orders/quotations.html', 'quotation'],
      ['/pages/dashboard.html', 'dashboard'],
      ['/pages/people/', 'people'], ['/pages/attention/', 'attention'],
      ['/pages/orders/', 'orders'], ['/pages/services/', 'services'], ['/pages/tracker/', 'services'],
      ['/pages/support/', 'support'], ['/pages/catalogue/', 'catalogue'], ['/pages/assets/', 'assets'],
      ['/pages/stock/', 'stock'], ['/pages/vendors/', 'vendors'], ['/pages/reports/', 'reports'],
      ['/pages/clients/', 'clients'], ['/pages/billing/', 'billing'], ['/pages/warehouses/', 'warehouses'],
      ['/pages/sla-config/', 'sla-config'], ['/pages/holidays/', 'operating-calendar'],
      ['/pages/integrations/', 'integrations'], ['/pages/settings/billing.html', 'fees']
    ];
    return routes.find(([prefix]) => path === prefix || path.startsWith(prefix))?.[1] || null;
  }

  function applyNavigation(root = document) {
    const state = readState();
    root.querySelectorAll('[data-access-module]').forEach(link => {
      const hasModuleAccess = canAccess(link.dataset.accessModule, currentUserId(), state);
      const alreadyReachableFromParent = link.dataset.accessParent && canAccess(link.dataset.accessParent, currentUserId(), state);
      link.hidden = !hasModuleAccess || !!alreadyReachableFromParent;
    });
    root.querySelectorAll('[data-orders-view]').forEach(link => {
      link.hidden = !canAccess(link.dataset.ordersView, currentUserId(), state);
    });
    root.querySelectorAll('.sidebar-section').forEach(section => {
      const links = [...section.querySelectorAll('.sidebar-menu-link')];
      if (links.length && links.every(link => link.hidden)) section.hidden = true;
    });
    root.querySelectorAll('.screen-section').forEach(section => {
      const links = [...section.querySelectorAll('a[data-access-module]')];
      if (links.length && links.every(link => link.hidden)) section.hidden = true;
    });
  }

  function guardCurrentPage() {
    const moduleId = routeModule();
    if (!moduleId || canAccess(moduleId)) return;
    const app = document.querySelector('.app-container');
    if (app) app.hidden = true;
    const notice = document.createElement('main');
    notice.className = 'ra-denied';
    notice.innerHTML = `<div><span class="ra-lock-icon">↗</span><p class="ra-eyebrow">ACCESS RESTRICTED</p><h1>You don’t have access to this module</h1><p>Your assigned roles do not include <strong>${MODULES.find(module => module.id === moduleId)?.label || 'this module'}</strong>. Ask an administrator to review your role access.</p><a class="btn btn-primary" href="/pages/dashboard.html">Return to dashboard</a></div>`;
    document.body.appendChild(notice);
  }

  return { MODULES, FUNCTION_GROUPS, ROLES, seedUsers, CAPABILITY_MODULE, STORAGE_KEY, USER_KEY, readState, saveState, currentUserId, userById, modulesForUser, canAccess, isSuperAdmin, canCreateLifecycle, routeModule, applyNavigation, guardCurrentPage };
})();
