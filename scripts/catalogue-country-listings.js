// Country listings are the source for vendor cost and vendor retail.
function initCountryListings() {
  const $ = id => document.getElementById(id);
  const model = 'MacBook Pro 14" M3';
  const data = MODEL_VENDOR_LISTINGS[model];
  const countryMeta = cc => WH_COUNTRIES[cc] || (cc === 'DE' ? ['🇩🇪', 'Germany'] : [cc, cc]);
  let currentCountry = null;
  const money = (cur, amount) => fmtAmount(cur, amount);
  const rows = () => {
    $('countryListingRows').innerHTML = Object.entries(data.countries).map(([cc, listing]) => {
      const spread = ((listing.retail - listing.cost) / listing.retail) * 100;
      return `<tr class="country-row" data-country="${cc}">
        <td><span class="flag">${countryMeta(cc)[0]}</span> ${countryMeta(cc)[1]}</td>
        <td class="text-muted">${escapeHtml(listing.sku)}</td>
        <td>${listing.currency}</td>
        <td>${escapeHtml(listing.vendor)}</td>
        <td class="text-muted">${money(listing.currency, listing.cost)}</td>
        <td><strong>${money(listing.currency, listing.retail)}</strong></td>
        <td class="text-muted">${spread.toFixed(1)}%</td>
        <td class="text-muted">Managed on vendor, warehouse, courier and calendar pages</td>
        <td><label class="toggle-switch"><input type="checkbox" data-available="${cc}" ${listing.available ? 'checked' : ''}><span class="toggle-slider"></span></label></td>
        <td><button type="button" class="btn-icon" aria-label="View ${countryMeta(cc)[1]} vendor listing">›</button></td>
      </tr>`;
    }).join('');
  };
  function open(cc) {
    currentCountry = cc;
    const x = data.countries[cc];
    const spread = ((x.retail - x.cost) / x.retail) * 100;
    $('listingTitle').textContent = `${countryMeta(cc)[1]} · Vendor listing`;
    $('listingPrice').innerHTML = `<div class="info-row"><span class="info-label">Vendor cost</span><span class="info-value">${money(x.currency, x.cost)}</span></div>
      <div class="info-row"><span class="info-label">Retail price</span><span class="info-value"><strong>${money(x.currency, x.retail)}</strong></span></div>
      <div class="info-row"><span class="info-label">Retail spread</span><span class="info-value">${spread.toFixed(1)}%</span></div>
      <div class="readonly-note">Retail price is the standard client selling price. A client contract adjustment changes it only for that client; final price is floored at vendor cost.</div>`;
    $('listingSupply').innerHTML = `<div class="info-row"><span class="info-label">Designated vendor</span><span class="info-value">${escapeHtml(x.vendor)}</span></div>
      <div class="info-row"><span class="info-label">Local SKU</span><span class="info-value">${escapeHtml(x.sku)}</span></div>
      <div class="info-row"><span class="info-label">Vendor stock</span><span class="info-value">${x.stock} units</span></div>
      <div class="info-row"><span class="info-label">Listing status</span><span class="info-value">${x.available ? 'Available' : 'Unavailable'}</span></div>
      <div class="info-row"><span class="info-label">Updated</span><span class="info-value">${escapeHtml(x.updated)}</span></div>`;
    $('pricingPanel').classList.add('open');
    $('panelOverlay').classList.add('show');
  }
  const close = () => { $('pricingPanel').classList.remove('open'); $('panelOverlay').classList.remove('show'); currentCountry = null; };
  $('countryListingRows').addEventListener('click', e => {
    if (e.target.closest('.toggle-switch')) return;
    const row = e.target.closest('[data-country]');
    if (row) open(row.dataset.country);
  });
  $('countryListingRows').addEventListener('change', e => {
    const cc = e.target.dataset.available;
    if (!cc) return;
    data.countries[cc].available = e.target.checked;
  });
  $('closePricingPanel').addEventListener('click', close);
  $('cancelPricingPanel').addEventListener('click', close);
  $('closeListing').addEventListener('click', close);
  $('panelOverlay').addEventListener('click', close);
  rows();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initCountryListings);
else initCountryListings();
