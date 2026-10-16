// Asset console: every row opens the (single prototype) asset detail page

function initAssetsList() {
  document.querySelectorAll('.asset-table tbody tr').forEach(row => {
    row.addEventListener('click', e => {
      if (e.target.closest('a, button, input')) return;
      window.location.href = '/pages/assets/detail.html';
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAssetsList);
} else {
  initAssetsList();
}
