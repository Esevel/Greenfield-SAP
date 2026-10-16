// Shared People header: title and Directory | Joiners | Leavers tabs. Page sets data-view on #peopleHeader.

function renderPeopleHeader() {
  const el = document.getElementById('peopleHeader');
  if (!el) return;
  const views = [
    ['directory', 'Directory', '/pages/people/directory.html', null],
    ['joiners', 'Joiners', '/pages/people/joiners.html', openJoiners().length],
    ['leavers', 'Leavers', '/pages/people/leavers.html', openLeavers().length]
  ];
  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">People</h1>
      <p class="page-description">Client employees who receive Esevel devices. Synced from each client's HRIS or added by the client.</p>
    </div>
    <nav class="tab-strip">
      ${views.map(([key, label, href, n]) => `<a href="${href}" class="tab-link ${el.dataset.view === key ? 'active' : ''}">${label}${n !== null ? ` <span class="tab-count">${n}</span>` : ''}</a>`).join('')}
    </nav>`;
}
renderPeopleHeader();
