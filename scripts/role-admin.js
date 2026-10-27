(() => {
  const access = window.RoleAccess;
  if (!access) return;

  let state = access.readState();
  let selectedRole = 'head_operations';
  let activeTab = 'roles';
  let toastTimer;
  const $ = id => document.getElementById(id);
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const roleById = id => access.ROLES.find(role => role.id === id);
  const initials = name => name.split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toUpperCase();
  const roleLabel = id => roleById(id)?.label || id;
  const userModules = user => new Set(user.roles.flatMap(id => state.grants[id] || []));

  function persist(message = 'Changes saved') {
    access.saveState(state);
    renderSummary();
    renderRoleList();
    renderRoleEditor();
    renderUsers();
    showToast(message);
  }

  function showToast(message) {
    const toast = $('raToast');
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2400);
  }

  function renderSummary() {
    const roles = access.ROLES.length;
    const users = state.users.length;
    const modules = new Set(state.users.flatMap(user => [...userModules(user)])).size;
    $('raSummary').innerHTML = `
      <article class="access-stat"><span class="access-stat-icon violet">♙</span><div><strong>${roles}</strong><span>Configured roles</span></div></article>
      <article class="access-stat"><span class="access-stat-icon blue">◎</span><div><strong>${users}</strong><span>Managed users</span></div></article>
      <article class="access-stat"><span class="access-stat-icon green">▦</span><div><strong>${modules}<small> / ${access.MODULES.length}</small></strong><span>Modules in use</span></div></article>
      <div class="access-scope-note"><span>✦</span><p><strong>Super Admin entry point</strong><br>Super Admins can open Settings → Role access & users. CEO Yuying and Engineering Super Admin have access to every module.</p></div>`;
    $('raRoleCount').textContent = roles;
    $('raUserCount').textContent = users;
    const preview = $('raPreviewUser');
    const activeId = access.currentUserId();
    preview.innerHTML = state.users.map(user => `<option value="${escapeHtml(user.id)}">${escapeHtml(user.name)} · ${escapeHtml(user.roles.map(roleLabel).join(', ') || 'No role')}</option>`).join('');
    preview.value = state.users.some(user => user.id === activeId) ? activeId : (state.users[0]?.id || '');
  }

  function renderRoleList() {
    $('raRoleList').innerHTML = access.ROLES.map(role => {
      const users = state.users.filter(user => user.roles.includes(role.id)).length;
      const active = selectedRole === role.id;
      return `<button type="button" class="role-list-item${active ? ' active' : ''}" data-role="${escapeHtml(role.id)}" aria-pressed="${active}">
        <span class="role-avatar ${role.kind === 'super-admin' ? 'gold' : role.kind === 'executive' ? 'purple' : 'blue'}">${role.kind === 'super-admin' ? '✦' : role.kind === 'executive' ? '↗' : '◈'}</span>
        <span class="role-list-copy"><strong>${escapeHtml(role.label)}</strong><small>${escapeHtml(role.description)}</small></span><span class="role-user-count">${users}</span>
      </button>`;
    }).join('');
  }

  function renderRoleEditor() {
    const role = roleById(selectedRole) || access.ROLES[0];
    selectedRole = role.id;
    const grants = new Set(state.grants[role.id] || []);
    const assigned = state.users.filter(user => user.roles.includes(role.id));
    const groups = [...new Set(access.MODULES.map(module => module.group))];
    const locked = role.locked === true;
    $('raRoleEditor').innerHTML = `
      <div class="role-editor-head"><div class="role-title-wrap"><span class="role-avatar role-avatar-large ${role.kind === 'super-admin' ? 'gold' : role.kind === 'executive' ? 'purple' : 'blue'}">${role.kind === 'super-admin' ? '✦' : role.kind === 'executive' ? '↗' : '◈'}</span><div><p class="access-eyebrow">${role.kind === 'super-admin' ? 'GLOBAL ROLE' : role.kind === 'executive' ? 'EXECUTIVE ROLE' : 'FUNCTION ROLE'}</p><h2>${escapeHtml(role.label)}</h2><p>${escapeHtml(role.description)}</p></div></div><span class="role-assigned-count">${assigned.length} ${assigned.length === 1 ? 'user' : 'users'}</span></div>
      ${locked ? '<div class="role-locked-note">🔒 Super Admin has access to every module. The role’s full-access grant is locked.</div>' : ''}
      <div class="module-access-head"><div><h3>Module permissions</h3><p>Choose the modules available to users with this role.</p></div><span class="module-access-count">${grants.size} / ${access.MODULES.length} enabled</span></div>
      <div class="module-groups">${groups.map(group => {
        const modules = access.MODULES.filter(module => module.group === group);
        return `<section class="module-group"><h4>${escapeHtml(group)}</h4><div class="module-options">${modules.map(module => {
          const checked = grants.has(module.id);
          return `<label class="module-option${checked ? ' enabled' : ''}"><span class="module-option-icon">${checked ? '✓' : '·'}</span><span class="module-option-copy"><strong>${escapeHtml(module.label)}</strong><small>${checked ? 'Access enabled' : 'No access'}</small></span><input type="checkbox" data-module="${escapeHtml(module.id)}" ${checked ? 'checked' : ''} ${locked ? 'disabled' : ''} aria-label="Allow ${escapeHtml(module.label)}"></label>`;
        }).join('')}</div></section>`;
      }).join('')}</div>
      <div class="role-editor-footer"><span>Changes apply to all users assigned this role.</span><button class="btn btn-secondary btn-sm" type="button" data-reset-role="${escapeHtml(role.id)}" ${locked ? 'disabled' : ''}>Reset to default</button></div>`;
  }

  function renderUserRolePicker(user, newUser = false) {
    const selected = new Set(user.roles || []);
    return `<details class="user-role-details"><summary><span class="assigned-role-chips">${selected.size ? [...selected].map(id => `<span class="role-chip">${escapeHtml(roleLabel(id))}</span>`).join('') : '<span class="no-roles">No roles assigned</span>'}</span><span class="role-picker-caret">⌄</span></summary><div class="user-role-menu">${access.ROLES.map(role => `<label class="user-role-choice"><input type="checkbox" data-user-role="${escapeHtml(role.id)}" ${selected.has(role.id) ? 'checked' : ''} ${newUser ? '' : `data-user-id="${escapeHtml(user.id)}"`}><span>${escapeHtml(role.label)}</span></label>`).join('')}</div></details>`;
  }

  function renderUsers() {
    const query = ($('raUserSearch')?.value || '').trim().toLowerCase();
    const users = state.users.filter(user => `${user.name} ${user.email} ${user.title}`.toLowerCase().includes(query));
    $('raFilteredCount').textContent = `${users.length} of ${state.users.length} users`;
    $('raUsers').innerHTML = users.map(user => {
      const modules = userModules(user).size;
      const isCurrent = user.id === access.currentUserId();
      return `<tr><td><div class="access-user-cell"><span class="access-user-avatar">${escapeHtml(initials(user.name))}</span><span><strong>${escapeHtml(user.name)}${isCurrent ? '<em>Active preview</em>' : ''}</strong><small>${escapeHtml(user.email)}</small></span></div></td><td class="access-title-cell">${escapeHtml(user.title || '—')}</td><td>${renderUserRolePicker(user)}</td><td><span class="module-count-pill">${modules}<small> modules</small></span></td><td class="access-user-actions"><button class="access-remove" type="button" data-remove-user="${escapeHtml(user.id)}" aria-label="Remove ${escapeHtml(user.name)}">Remove</button></td></tr>`;
    }).join('') || '<tr><td colspan="5" class="access-empty">No users match that search.</td></tr>';
  }

  function renderNewUserRoles() {
    $('raNewUserRoles').innerHTML = access.ROLES.map(role => `<label class="new-role-choice"><input type="checkbox" name="roles" value="${escapeHtml(role.id)}"><span>${escapeHtml(role.label)}</span></label>`).join('');
  }

  function setTab(tab) {
    activeTab = tab;
    document.querySelectorAll('.access-tab').forEach(button => button.classList.toggle('active', button.dataset.tab === tab));
    $('raRolesPanel').hidden = tab !== 'roles';
    $('raUsersPanel').hidden = tab !== 'users';
  }

  document.addEventListener('click', event => {
    const roleButton = event.target.closest('[data-role]');
    if (roleButton) { selectedRole = roleButton.dataset.role; renderRoleList(); renderRoleEditor(); }
    const tab = event.target.closest('[data-tab]');
    if (tab) setTab(tab.dataset.tab);
    const reset = event.target.closest('[data-reset-role]');
    if (reset) {
      const role = roleById(reset.dataset.resetRole);
      state.grants[role.id] = [...role.modules];
      persist(`${role.label} permissions restored`);
    }
    const remove = event.target.closest('[data-remove-user]');
    if (remove) {
      const user = state.users.find(item => item.id === remove.dataset.removeUser);
      const finalSuperAdmin = user?.roles.includes('ceo_super_admin') && state.users.filter(item => item.roles.includes('ceo_super_admin')).length === 1;
      if (finalSuperAdmin) { showToast('Assign Super Admin to another user before removing this account'); return; }
      if (user && window.confirm(`Remove ${user.name} and all of their role assignments?`)) {
        state.users = state.users.filter(item => item.id !== user.id);
        persist('User removed');
      }
    }
    if (event.target.closest('#raAddUser')) { $('raFormError').hidden = true; $('raAddDialog').showModal(); }
    if (event.target.closest('[data-close-dialog]')) $('raAddDialog').close();
  });

  $('raRoleEditor').addEventListener('change', event => {
    const input = event.target.closest('[data-module]');
    if (!input) return;
    const granted = new Set(state.grants[selectedRole] || []);
    if (input.checked) granted.add(input.dataset.module); else granted.delete(input.dataset.module);
    state.grants[selectedRole] = [...granted];
    persist('Module access updated');
  });

  $('raUsers').addEventListener('change', event => {
    const input = event.target.closest('[data-user-role][data-user-id]');
    if (!input) return;
    const user = state.users.find(item => item.id === input.dataset.userId);
    if (!user) return;
    const roles = new Set(user.roles);
    const removingFinalSuperAdmin = input.dataset.userRole === 'ceo_super_admin' && !input.checked && roles.has('ceo_super_admin') && state.users.filter(item => item.roles.includes('ceo_super_admin')).length === 1;
    if (removingFinalSuperAdmin) { input.checked = true; showToast('Assign Super Admin to another user before removing this role'); return; }
    if (input.checked) roles.add(input.dataset.userRole); else roles.delete(input.dataset.userRole);
    user.roles = [...roles];
    persist(`${user.name} roles updated`);
  });

  $('raUserSearch').addEventListener('input', renderUsers);
  $('raPreviewUser').addEventListener('change', event => {
    localStorage.setItem(access.USER_KEY, event.target.value);
    window.location.reload();
  });

  $('raAddForm').addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const email = String(data.get('email') || '').trim().toLowerCase();
    const title = String(data.get('title') || '').trim();
    const roles = [...form.querySelectorAll('input[name="roles"]:checked')].map(input => input.value);
    const error = $('raFormError');
    if (state.users.some(user => user.email.toLowerCase() === email)) {
      error.textContent = 'A user with this email already exists.'; error.hidden = false; return;
    }
    if (!roles.length) { error.textContent = 'Select at least one role.'; error.hidden = false; return; }
    const baseId = email.split('@')[0].normalize('NFKD').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'user';
    let id = baseId; let suffix = 2;
    while (state.users.some(user => user.id === id)) id = `${baseId}-${suffix++}`;
    state.users.push({ id, name, email, title, roles });
    access.saveState(state);
    form.reset(); $('raAddDialog').close(); renderSummary(); renderRoleList(); renderRoleEditor(); renderUsers(); showToast('User added with assigned roles');
  });

  $('raAddDialog').addEventListener('click', event => {
    if (event.target === $('raAddDialog')) $('raAddDialog').close();
  });

  renderNewUserRoles();
  renderSummary();
  renderRoleList();
  renderRoleEditor();
  renderUsers();
})();
