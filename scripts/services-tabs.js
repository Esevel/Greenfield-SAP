// Services module header: title, New request, Sync inbox link and one tab per service.
// Pages set data-active on #servicesHeader (and optional data-title for sub-pages such as Repairs · Quotes).

const SERVICE_TABS = [
  ['onboarding', 'Onboarding', '/pages/services/onboarding.html', 24],
  ['offboarding', 'Offboarding', '/pages/services/offboarding.html', 19],
  ['repairs', 'Repairs', '/pages/services/repairs.html', 8],
  ['redeployments', 'Redeployments', '/pages/services/redeployments.html', 7],
  ['storage', 'Storage', '/pages/services/storage.html', 3],
  ['disposal', 'Disposal', '/pages/services/disposal.html', 4]
];

(function renderServicesHeader() {
  const el = document.getElementById('servicesHeader');
  if (!el) return;
  const active = el.dataset.active;
  // Live counts where the page has tracker data loaded
  const live = typeof TRACKER_ITEMS !== 'undefined' ? { onboarding: TRACKER_ITEMS.filter(i => i.onb).length } : {};
  const typeParam = { redeployments: 'redeployment', storage: 'storage', disposal: 'disposal' }[active];
  el.innerHTML = `<div class="page-header module-header">
      <div class="flex-between">
        <h1 class="page-title">Services</h1>
        <div class="header-actions">
          <a href="/pages/services/sync-inbox.html" class="btn btn-secondary">Sync inbox</a>
          <a href="/pages/services/new.html${typeParam ? `?type=${typeParam}` : ''}" class="btn btn-primary">New request</a>
        </div>
      </div>
      <p class="page-description">Lifecycle work for client devices and people: joiners, leavers, repairs, redeployments, storage and disposal.</p>
    </div>
    <nav class="tab-strip module-tabs">${SERVICE_TABS.map(([k, l, h, n]) => `<a href="${h}" class="tab-link${k === active ? ' active' : ''}">${l} <span class="tab-count">${live[k] ?? n}</span></a>`).join('')}</nav>`;
})();
