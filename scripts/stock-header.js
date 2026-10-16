// Shared Stock page header: title, meta and view switcher. Page sets data-view on #stockHeader.

function renderStockHeader() {
  const el = document.getElementById('stockHeader');
  if (!el) return;
  const views = [
    ['clients', 'Clients', '/pages/stock/list.html'],
    ['restock', 'Restock queue', '/pages/stock/restock.html'],
    ['receiving', 'Receiving', '/pages/stock/receiving.html'],
    ['fees', 'Storage fees', '/pages/stock/fees.html']
  ];
  const open = restockList().filter(r => r.state === 'new').length;
  el.innerHTML = `
    <div class="page-header">
      <div class="flex-between">
        <div>
          <h1 class="page-title">Stock</h1>
          <p class="page-description">All stock belongs to a client. It sits in an Esevel hub (storage fees from intake) or at a client site (no Esevel fees).</p>
        </div>
        <div class="stock-header-meta">
          <span class="stock-updated">Updated 2 min ago</span>
        </div>
      </div>
    </div>
    <nav class="tab-strip">
      ${views.map(([key, label, href]) => `<a href="${href}" class="tab-link ${el.dataset.view === key ? 'active' : ''}">${label}${key === 'restock' && open ? ` <span class="tab-count tab-count-alert">${open}</span>` : ''}${key === 'receiving' && typeof RECEIVING !== 'undefined' ? ` <span class="tab-count">${RECEIVING.filter(r => r.status !== 'received').length}</span>` : ''}</a>`).join('')}
    </nav>`;
}
renderStockHeader();
