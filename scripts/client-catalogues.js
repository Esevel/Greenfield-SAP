// Client catalogues shows contract-calculated prices; offer status is independent of pricing.
function initClientCatalogues() {
  const $ = id => document.getElementById(id);
  const model = 'MacBook Pro 14" M3';
  const listingData = MODEL_VENDOR_LISTINGS[model];
  const clients = Object.fromEntries(WH_CLIENTS.map(c => [c.id, c]));
  const money = (cur, amount) => fmtAmount(cur, amount);

  function render() {
    const query = $('clientCatalogueSearch').value.trim().toLowerCase();
    const filter = $('clientCatalogueFilter').value;
    const entries = CLIENT_MODEL_CATALOGUE.filter(row => {
      const c = clients[row.client];
      return (!query || `${c.name} ${row.country}`.toLowerCase().includes(query))
        && (!filter || (filter === 'offered' ? row.offered : !row.offered));
    });
    $('clientCatalogueRows').innerHTML = entries.map(row => {
      const c = clients[row.client];
      const vendor = listingData.countries[row.country];
      const price = modelClientPrice(row.client, model, row.country, row.tier);
      const adjustment = price.hasContractPrice ? `${price.adjustment > 0 ? '+' : ''}${price.adjustment}% · Client contract` : '<span class="text-muted">—</span>';
      const marketplace = !row.offered ? '<span class="badge badge-muted badge-sm">Not offered</span>' : row.hidden ? '<span class="badge badge-muted badge-sm">Hidden by client</span>' : '<span class="badge badge-success badge-sm">Visible</span>';
      return `<tr>
        <td><div class="client-cell"><div class="client-logo">${escapeHtml(c.logo)}</div><span>${escapeHtml(c.name)}</span></div></td>
        <td><span class="flag">${WH_COUNTRIES[row.country][0]}</span> ${row.country}</td>
        <td class="text-muted">${escapeHtml(price.entity.name)} · ${price.currency}</td>
        <td class="num">${money(vendor.currency, vendor.cost)}</td>
        <td class="num">${money(vendor.currency, vendor.retail)}</td>
        <td>${escapeHtml(adjustment)}</td>
        <td class="num"><strong>${price.hasContractPrice ? money(price.currency, price.price) : 'Uses retail'}</strong><div class="stock-sub">${money(vendor.currency, price.localPrice)}${price.currency !== vendor.currency ? ` local · ${money(price.currency, price.price)} billed${price.fx ? ` · ${price.fx.rate.toFixed(4)} ${escapeHtml(price.fx.source)}` : ''}` : ''}</div>${price.floorApplied ? '<div><span class="badge badge-warning badge-sm">Vendor cost floor</span></div>' : ''}</td>
        <td><label class="toggle-switch" aria-label="Offer ${escapeHtml(c.name)} this model"><input type="checkbox" data-offer="${row.client}" ${row.offered ? 'checked' : ''}><span class="toggle-slider"></span></label></td>
        <td><a href="/pages/clients/detail.html?c=${row.client}#sec-pricing" class="link-sm">Contract pricing</a></td>
      </tr>`;
    }).join('') || '<tr><td colspan="9" class="text-muted sla-empty">No client listings match.</td></tr>';
    $('clientCatalogueCount').textContent = `${entries.length} client listings · Standard price is retail; custom contract adjustments are floored at vendor cost.`;
  }

  $('clientCatalogueRows').addEventListener('change', e => {
    const clientId = e.target.dataset.offer;
    if (!clientId) return;
    const row = CLIENT_MODEL_CATALOGUE.find(x => x.client === clientId);
    row.offered = e.target.checked;
    render();
  });
  $('clientCatalogueSearch').addEventListener('input', render);
  $('clientCatalogueFilter').addEventListener('change', render);
  render();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initClientCatalogues);
else initClientCatalogues();
