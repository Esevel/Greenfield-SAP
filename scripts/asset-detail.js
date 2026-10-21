// Asset detail page interactions

function initAssetDetail() {
  renderRelatedAssetTickets();
  const filter = document.getElementById('clientInitiatedFilter');
  if (!filter) return;

  filter.addEventListener('change', () => {
    document.querySelectorAll('.timeline-item').forEach(item => {
      const isClient = item.dataset.clientInitiated === 'true';
      item.style.display = filter.checked && !isClient ? 'none' : '';
    });
  });
}

function renderRelatedAssetTickets() {
  const serial = document.querySelector('.asset-header-meta .asset-serial')?.textContent.trim();
  const ticketBody = document.getElementById('assetRelatedTickets');
  if (!serial || !ticketBody || typeof TRACKER_ITEMS === 'undefined') return;

  const related = TRACKER_ITEMS.filter(item => (item.assetSerials || []).includes(serial)).map(item => ({ item, sla: trackerSla(item) }));
  related.sort((a, b) => new Date(b.item.start) - new Date(a.item.start));
  const typeLabels = { repair: 'Repair', support: 'Support', onboarding: 'Onboarding', offboarding: 'Offboarding', redeploy: 'Redeployment', storage: 'Storage', disposal: 'Disposal' };
  const ticketHref = item => item.href || (item.type === 'onboarding'
    ? `/pages/tracker/onboarding-detail.html?id=${encodeURIComponent(item.id)}`
    : item.type === 'support' ? '/pages/tracker/support-detail.html' : `/pages/tracker/work-order.html?wo=${encodeURIComponent(item.id)}`);
  const opened = value => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const rowHtml = ({ item, sla }) => `<tr>
    <td><a class="link-sm" href="${ticketHref(item)}">${escapeHtml(item.id)}</a></td>
    <td>${escapeHtml(typeLabels[item.type] || item.type)}</td>
    <td><span class="badge ${sla.cur ? 'badge-info' : 'badge-neutral'} badge-sm">${escapeHtml(sla.cur ? item.stage || sla.cur.m.label : 'Completed')}</span></td>
    <td>${opened(item.start)}</td>
    <td>${escapeHtml(item.owner?.[1] || '—')}</td>
  </tr>`;

  ticketBody.innerHTML = related.map(rowHtml).join('')
    || '<tr><td colspan="5" class="text-muted sla-empty">No tracker tickets linked to this asset.</td></tr>';
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAssetDetail);
} else {
  initAssetDetail();
}
