// Staff-created onboarding/offboarding requests (prototype): kept in localStorage so they show up on the
// Services boards and detail pages alongside the seeded TRACKER_ITEMS. Loaded before tracker-sla.js.
window.StaffRequests = (() => {
  const KEY = 'sap-staff-requests-v1';
  function list(type) {
    try {
      const all = JSON.parse(localStorage.getItem(KEY) || '[]');
      return type ? all.filter(r => r.type === type) : all;
    } catch { return []; }
  }
  function add(item) {
    const all = list();
    all.push(item);
    localStorage.setItem(KEY, JSON.stringify(all));
  }
  // Next free id for a prefix, counting both stored items and a seed from the page's static data
  function nextId(prefix, seed) {
    const nums = list().filter(r => r.id.startsWith(`${prefix}-`)).map(r => Number(r.id.split('-')[1])).filter(Number.isFinite);
    return `${prefix}-${Math.max(seed, ...nums) + 1}`;
  }
  return { list, add, nextId };
})();
