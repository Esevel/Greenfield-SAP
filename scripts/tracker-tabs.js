// Shared Tracker tab strip. Page sets data-active on #trackerTabs.

(function renderTrackerTabs() {
  const el = document.getElementById('trackerTabs');
  if (!el) return;
  const tabs = [
    ['all', 'All · by risk', '/pages/tracker/all.html', 115],
    ['orders', 'Orders', '/pages/tracker/orders.html', 38],
    ['onboarding', 'Onboarding', '/pages/tracker/onboarding.html', 24],
    ['offboarding', 'Offboarding', '/pages/tracker/offboarding.html', 19],
    ['repairs', 'Repairs', '/pages/tracker/repairs.html', 8],
    ['redeployments', 'Redeployments', '/pages/tracker/redeployments.html', 7],
    ['storage', 'Storage', '/pages/tracker/storage.html', 3],
    ['disposal', 'Disposal', '/pages/tracker/disposal.html', 4],
    ['support', 'Support', '/pages/tracker/support.html', 14]
  ];
  // Orders count is live when the Orders module is on the page
  if (typeof openOrders === 'function') tabs.find(t => t[0] === 'orders')[3] = openOrders().length;
  el.className = 'tab-strip tracker-tabs';
  el.innerHTML = tabs.map(([key, label, href, n]) => `<a href="${href}" class="tab-link ${el.dataset.active === key ? 'active' : ''}">${label} <span class="tab-count">${n}</span></a>`).join('');
})();
