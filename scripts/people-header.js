// Shared People header: title and Directory | Joiners | Leavers tabs. Page sets data-view on #peopleHeader.

function renderPeopleHeader() {
  const el = document.getElementById('peopleHeader');
  if (!el) return;
  const views = [
    ['directory', 'Directory', '/pages/people/directory.html', null],
    ['joiners', 'Joiners', '/pages/people/joiners.html', openJoiners().length],
    ['leavers', 'Leavers', '/pages/people/leavers.html', openLeavers().length]
  ];
  // Staff with the lifecycle-create permission can raise onboarding/offboarding from the matching tab
  const lifecycleAction = { joiners: ['onboarding', 'New onboarding'], leavers: ['offboarding', 'New offboarding'] }[el.dataset.view];
  const canLifecycle = !!(window.RoleAccess && RoleAccess.canCreateLifecycle());
  el.innerHTML = `
    <div class="page-header">
      <div class="flex-between">
        <h1 class="page-title">People</h1>
        ${lifecycleAction && canLifecycle ? `<div class="header-actions"><a href="/pages/services/new.html?type=${lifecycleAction[0]}" class="btn btn-primary">${lifecycleAction[1]}</a></div>` : ''}
      </div>
      <p class="page-description">Client employees who receive Esevel devices. Synced from each client's HRIS or added by the client.</p>
    </div>
    <nav class="tab-strip">
      ${views.map(([key, label, href, n]) => `<a href="${href}" class="tab-link ${el.dataset.view === key ? 'active' : ''}">${label}${n !== null ? ` <span class="tab-count">${n}</span>` : ''}</a>`).join('')}
    </nav>`;
}
renderPeopleHeader();
