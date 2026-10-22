// Demo-only: "view as" switcher in the header, generated from the org chart.
(() => {
  function personRow(personId, current) {
    const access = window.RBAC.buildAccess(personId);
    const isActive = personId === current.id;
    return `
      <button type="button" class="role-switcher-item ${isActive ? 'active' : ''}" data-person="${personId}" ${isActive ? 'disabled' : ''}>
        <span class="role-switcher-name">${access.name}</span>
        <span class="role-switcher-roles">${access.positions.map(p => p.label).join(' · ')}</span>
      </button>`;
  }

  function render() {
    const container = document.getElementById('role-switcher-header');
    const menu = document.getElementById('roleSwitcherMenu');
    const label = document.getElementById('current-user-name');
    if (!container || !menu || !label || !window.RBAC) return false;

    const { ORG } = window.RBAC;
    const current = window.RBAC.getCurrentUser();
    label.textContent = current.name;

    // List each person once, under the function where they hold their highest position
    const { LEVELS } = window.RBAC;
    const homeOf = {};
    const seenAccess = new Set();
    Object.keys(window.RBAC.PEOPLE).forEach(id => {
      if (!window.RBAC.canViewAs(id)) return;
      const { positions } = window.RBAC.buildAccess(id);
      // People with identical positions see the same thing, so list only the first
      const signature = positions.map(p => `${p.functionId}|${p.teamId}|${p.level}`).sort().join(',');
      if (seenAccess.has(signature) && id !== current.id) return;
      seenAccess.add(signature);
      const top = positions.reduce((best, p) => (!best || LEVELS[p.level] > LEVELS[best.level] ? p : best), null);
      if (top) homeOf[id] = top.functionId || 'operations';
    });
    const groups = [{ id: 'operations', name: 'Operations' }, ...ORG.functions]
      .map(g => ({ name: g.name, people: Object.keys(homeOf).filter(id => homeOf[id] === g.id) }))
      .filter(g => g.people.length);

    menu.innerHTML = `
      <div class="role-switcher-menu-header">View as</div>
      ${groups.map(g => `
        <div class="role-switcher-group">
          <div class="role-switcher-group-title">${g.name}</div>
          ${g.people.map(id => personRow(id, current)).join('')}
        </div>`).join('')}`;

    menu.addEventListener('click', e => {
      const item = e.target.closest('.role-switcher-item');
      if (!item || item.disabled) return;
      window.RBAC.setCurrentUser(item.dataset.person);
      window.location.reload();
    });

    container.hidden = false;
    return true;
  }

  // Header is fetched by navigation.js, so retry until it's injected
  function init(attempts = 0) {
    if (!render() && attempts < 50) setTimeout(() => init(attempts + 1), 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init());
  } else {
    init();
  }
})();
