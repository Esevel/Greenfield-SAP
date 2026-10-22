// RBAC resolver: derives each person's access from their positions in ORG_DATA.
window.RBAC = (() => {
  const { CAPABILITIES, PEOPLE, ORG } = window.ORG_DATA;
  const LEVELS = { member: 1, team_lead: 2, function_lead: 3, head: 4 };
  const LEVEL_LABELS = { member: 'Member', team_lead: 'Team lead', function_lead: 'Function lead', head: 'Head' };
  const USER_KEY = 'greenfield-demo-user';

  const higher = (a, b) => (!a || LEVELS[b] > LEVELS[a] ? b : a);

  function positionsFor(personId) {
    const positions = [];
    if (ORG.head === personId) positions.push({ level: 'head', label: 'Head of Operations' });
    ORG.functions.forEach(fn => {
      if (fn.lead === personId) positions.push({ functionId: fn.id, level: 'function_lead', label: `${fn.name} lead` });
      if (fn.teamLead === personId) positions.push({ functionId: fn.id, level: 'team_lead', label: `${fn.name} team lead` });
      fn.teams.forEach(team => {
        if (team.members.includes(personId)) {
          positions.push({ functionId: fn.id, teamId: team.id, level: 'member', label: team.name });
        }
      });
    });
    return positions;
  }

  // Each grant is { capability, level, scope }; scope null = unrestricted.
  function grantsFor(positions) {
    const grants = [];
    positions.forEach(pos => {
      if (pos.level === 'head') {
        Object.keys(CAPABILITIES).forEach(cap => grants.push({ capability: cap, level: 'head', scope: null }));
        return;
      }
      const fn = ORG.functions.find(f => f.id === pos.functionId);
      const teams = pos.teamId ? fn.teams.filter(t => t.id === pos.teamId) : fn.teams;
      teams.forEach(team => team.capabilities.forEach(cap => grants.push({
        capability: cap,
        level: pos.level,
        scope: pos.level === 'function_lead' ? null : team.scope || null
      })));
    });
    const teamOf = p => ORG.functions.find(f => f.id === p.functionId).teams.find(t => t.id === p.teamId);
    const sharedPositions = positions.filter(p => p.level !== 'head' && !(p.teamId && teamOf(p).shared === false));
    const top = sharedPositions.reduce((best, p) => higher(best, p.level), null);
    if (top && !positions.some(p => p.level === 'head')) {
      (ORG.shared || []).forEach(cap => grants.push({ capability: cap, level: top, scope: null }));
    }
    return grants;
  }

  function buildAccess(personId) {
    const person = PEOPLE[personId];
    if (!person) return null;

    const positions = positionsFor(personId);
    const isHead = positions.some(p => p.level === 'head');

    const levelByFunction = {};
    positions.forEach(p => {
      if (p.functionId) levelByFunction[p.functionId] = higher(levelByFunction[p.functionId], p.level);
    });

    const capabilities = {};
    grantsFor(positions).forEach(({ capability, level, scope }) => {
      const entry = capabilities[capability] || (capabilities[capability] = { level: null, scopes: [] });
      entry.level = higher(entry.level, level);
      if (entry.scopes !== null) entry.scopes = scope ? [...entry.scopes, scope] : null;
    });

    const levelIn = functionId => (isHead ? 'head' : levelByFunction[functionId] || null);
    const meets = (level, minLevel) => !!level && LEVELS[level] >= LEVELS[minLevel || 'member'];

    return {
      id: personId,
      ...person,
      positions,
      isHead,
      levelIn,
      capabilities: Object.keys(capabilities),

      // can('stock') · can('assets', { minLevel: 'team_lead', function: 'it_euc' }) · can(null, { minLevel: 'head' })
      can(capability, { minLevel = 'member', function: functionId } = {}) {
        if (capability && !capabilities[capability]) return false;
        if (functionId) return meets(levelIn(functionId), minLevel);
        if (capability) return meets(capabilities[capability].level, minLevel);
        return isHead || meets(Object.values(levelByFunction).reduce(higher, null), minLevel);
      },

      // null = unrestricted, [] = no access, otherwise scope objects to match records against
      scopeFor(capability) {
        return capabilities[capability] ? capabilities[capability].scopes : [];
      },

      canSeeRecord(capability, record) {
        const scopes = this.scopeFor(capability);
        if (scopes === null) return true;
        return scopes.some(scope => Object.entries(scope).every(([key, value]) => record[key] === value));
      }
    };
  }

  const canViewAs = personId => !!PEOPLE[personId] && PEOPLE[personId].viewAs !== false;

  function getCurrentUser() {
    const key = localStorage.getItem(USER_KEY);
    return buildAccess(canViewAs(key) ? key : ORG.head);
  }

  function setCurrentUser(personId) {
    if (canViewAs(personId)) localStorage.setItem(USER_KEY, personId);
  }

  // Declarative gating, e.g. <div data-requires="stock" data-min-level="team_lead" data-function="supply_chain">
  function applyAccessAttributes(root = document) {
    const user = getCurrentUser();
    root.querySelectorAll('[data-requires], [data-min-level]').forEach(el => {
      el.hidden = !user.can(el.dataset.requires || null, { minLevel: el.dataset.minLevel, function: el.dataset.function });
    });
  }

  return {
    LEVELS,
    LEVEL_LABELS,
    CAPABILITIES,
    PEOPLE,
    ORG,
    buildAccess,
    getCurrentUser,
    setCurrentUser,
    canViewAs,
    applyAccessAttributes
  };
})();
