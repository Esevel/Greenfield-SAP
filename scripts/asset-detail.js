// Asset detail page interactions

function initAssetDetail() {
  const filter = document.getElementById('clientInitiatedFilter');
  if (!filter) return;

  filter.addEventListener('change', () => {
    document.querySelectorAll('.timeline-item').forEach(item => {
      const isClient = item.dataset.clientInitiated === 'true';
      item.style.display = filter.checked && !isClient ? 'none' : '';
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAssetDetail);
} else {
  initAssetDetail();
}
