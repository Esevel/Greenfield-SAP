// Country listings show specification variants, local vendor mapping and approved prices.
function initCountryListings() {
  const $ = id => document.getElementById(id);
  const model = 'MacBook Pro 14" M3';
  const data = MODEL_VENDOR_LISTINGS[model];
  if (!data) throw new Error(`Missing country listings for ${model}`);

  const configurations = Object.values(data.configurations);
  const countryCodes = [...new Set(configurations.flatMap(configuration => Object.keys(configuration.countries)))];
  const countryMeta = cc => WH_COUNTRIES[cc] || (cc === 'DE' ? ['🇩🇪', 'Germany'] : [cc, cc]);
  const money = (currency, amount) => fmtAmount(currency, amount, 0);
  const fmtMargin = (cost, retail) => `${(((retail - cost) / retail) * 100).toFixed(1)}%`;
  const specMix = {
    SG: { median: '16 GB / 1 TB', ram: [['8 GB', 10], ['16 GB', 60], ['24 GB', 30]], storage: [['512 GB', 48], ['1 TB', 40], ['2 TB', 12]] },
    MY: { median: '16 GB / 512 GB', ram: [['8 GB', 18], ['16 GB', 68], ['24 GB', 14]], storage: [['512 GB', 71], ['1 TB', 24], ['2 TB', 5]] },
    AU: { median: '24 GB / 1 TB', ram: [['8 GB', 6], ['16 GB', 42], ['24 GB', 52]], storage: [['512 GB', 30], ['1 TB', 52], ['2 TB', 18]] }
  };

  const listingFor = (configuration, country) => configuration.countries[country] || null;
  const specLabel = configuration => `${configuration.specifications.memory} / ${configuration.specifications.storage.replace(' SSD', '')}`;
  const validForCountry = (country, configuration) => configuration.countries[country] || null;
  const attention = configurations.flatMap(configuration => {
    const listing = listingFor(configuration, 'SG');
    return listing && (!Number.isFinite(listing.cost) || (listing.retail - listing.cost) / listing.retail * 100 < 8)
      ? [{ listing, configuration }]
      : [];
  });
  $('configurationSummary').textContent = `${configurations.length + data.invalidConfigurations.length} combinations · ${configurations.length} valid. Prices and vendor mappings are country-specific; unmapped variants cannot be offered.`;
  $('listingAttention').innerHTML = attention.length
    ? `<strong>⚠ ${attention.length} items need attention:</strong> ${attention.filter(({ listing }) => !Number.isFinite(listing.cost)).length} missing vendor cost, ${attention.filter(({ listing }) => Number.isFinite(listing.cost) && (listing.retail - listing.cost) / listing.retail * 100 < 8).length} below margin threshold.`
    : '';
  $('listingAttention').hidden = !attention.length;

  function renderCountry(country) {
    const [flag, name] = countryMeta(country);
    const rows = configurations.map(configuration => {
      const listing = validForCountry(country, configuration);
      if (!listing) {
        return `<tr class="variant-unmapped">
          <td><code>${escapeHtml(configuration.code)}</code></td>
          <td>${escapeHtml(specLabel(configuration))}</td>
          <td colspan="3"><span class="variant-status-muted">Not offered, no vendor mapping</span></td>
          <td>—</td><td>—</td><td>—</td><td>—</td>
          <td><span class="badge badge-muted badge-sm">Not offered</span></td>
        </tr>`;
      }
      const hasCost = Number.isFinite(listing.cost);
      const margin = hasCost ? (listing.retail - listing.cost) / listing.retail * 100 : null;
      const belowMinimum = margin !== null && margin < 8;
      const needsReview = !hasCost;
      return `<tr class="${needsReview ? 'variant-review' : ''}" data-country="${country}" data-configuration="${escapeHtml(configuration.id)}">
        <td><code>${escapeHtml(configuration.code)}</code></td>
        <td>${escapeHtml(specLabel(configuration))}</td>
        <td>${escapeHtml(listing.vendor)}</td>
        <td><code>${escapeHtml(listing.sku)}</code></td>
        <td>${hasCost ? money(listing.currency, listing.cost) : '—'}</td>
        <td>${listing.retail ? money(listing.currency, listing.retail) : '—'}${needsReview ? '<div><span class="attention-chip">Needs pricing review</span></div>' : ''}</td>
        <td>${margin === null ? '—' : `${fmtMargin(listing.cost, listing.retail)}${belowMinimum ? '<div><span class="attention-chip">Below 8% minimum</span></div>' : ''}`}</td>
        <td>${listing.stock} units</td>
        <td>${escapeHtml(listing.leadTime || '—')}</td>
        <td><label class="toggle-switch" aria-label="Offer ${escapeHtml(specLabel(configuration))} in ${escapeHtml(name)}"><input type="checkbox" data-country="${country}" data-configuration="${escapeHtml(configuration.id)}" ${listing.available ? 'checked' : ''} ${needsReview ? 'disabled' : ''}><span class="toggle-slider"></span></label></td>
      </tr>`;
    }).join('');

    const priced = configurations.map(configuration => validForCountry(country, configuration)).filter(listing => listing && Number.isFinite(listing.cost) && listing.retail);
    const currency = priced[0]?.currency || '';
    const priceRange = priced.length ? `${money(currency, Math.min(...priced.map(listing => listing.retail)))} – ${money(currency, Math.max(...priced.map(listing => listing.retail)))}` : 'No approved prices';
    const margins = priced.map(listing => (listing.retail - listing.cost) / listing.retail * 100);
    const marginRange = margins.length ? `${Math.min(...margins).toFixed(1)}% – ${Math.max(...margins).toFixed(1)}%` : '—';

    return `<section class="card country-listing-card">
      <div class="card-header country-listing-header">
        <div><h3 class="card-title"><span class="flag">${flag}</span> ${escapeHtml(name)} <span class="country-code">(${country})</span></h3><span class="text-muted">${configurations.length} valid variants</span></div>
        <div class="country-listing-ranges"><span><small>Approved retail</small><strong>${priceRange}</strong></span><span><small>Margin range</small><strong>${marginRange}</strong></span></div>
      </div>
      <div class="table-container variant-table-wrap"><table class="table variant-table">
        <thead><tr><th>Config ID</th><th>Spec</th><th>Vendor</th><th>Vendor SKU</th><th>Vendor cost</th><th>Approved retail</th><th>Margin %</th><th>Stock</th><th>Lead time</th><th>Available</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
    </section>`;
  }

  $('countryListings').innerHTML = countryCodes.map(renderCountry).join('');

  function renderMix(country) {
    const mix = specMix[country];
    if (!mix) throw new Error(`Missing spec mix for ${country}`);
    const barRows = entries => entries.map(([label, percent]) => `<div class="spec-mix-row"><span>${label}</span><div class="spec-mix-track" role="img" aria-label="${label}: ${percent}%"><span style="width:${percent}%"></span></div><strong>${percent}%</strong></div>`).join('');
    $('specMixContent').innerHTML = `<div class="spec-mix-summary"><span><small>Median spec</small><strong>${mix.median}</strong></span></div>
      <div class="spec-mix-bars"><section><h4>RAM</h4>${barRows(mix.ram)}</section><section><h4>Storage</h4>${barRows(mix.storage)}</section></div>`;
  }

  $('countryListings').addEventListener('click', event => {
    if (event.target.closest('.toggle-switch')) return;
    const row = event.target.closest('tr[data-country]');
    if (row) open(row.dataset.country, row.dataset.configuration);
  });
  $('countryListings').addEventListener('change', event => {
    const input = event.target.closest('input[data-country]');
    if (!input) return;
    const listing = modelCountryListing(model, input.dataset.country, input.dataset.configuration);
    if (!listing || !Number.isFinite(listing.cost)) throw new Error('A vendor cost is required before this variant can be offered.');
    listing.available = input.checked;
  });
  document.querySelectorAll('[data-spec-mix-country]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-spec-mix-country]').forEach(tab => {
      const selected = tab === button;
      tab.classList.toggle('active', selected);
      tab.setAttribute('aria-selected', String(selected));
    });
    renderMix(button.dataset.specMixCountry);
  }));
  document.querySelectorAll('[data-spec-mix-country]').forEach(button => {
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const tabs = [...document.querySelectorAll('[data-spec-mix-country]')];
      const next = tabs[(tabs.indexOf(button) + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      next.focus();
      next.click();
    });
  });
  document.getElementById('closePricingPanel').addEventListener('click', close);
  document.getElementById('cancelPricingPanel').addEventListener('click', close);
  document.getElementById('closeListing').addEventListener('click', close);
  document.getElementById('panelOverlay').addEventListener('click', close);
  renderMix('SG');
  if (!modelConfiguration(model)) throw new Error(`Missing default configuration for ${model}`);

  function open(country, configurationId) {
    const configuration = modelConfiguration(model, configurationId);
    const listing = modelCountryListing(model, country, configurationId);
    if (!configuration || !listing) throw new Error(`Missing ${country} listing for ${configurationId}`);
    const hasCost = Number.isFinite(listing.cost);
    const margin = hasCost ? fmtMargin(listing.cost, listing.retail) : '—';
    $('listingTitle').textContent = `${countryMeta(country)[1]} · ${specLabel(configuration)}`;
    $('listingPrice').innerHTML = `<div class="info-row"><span class="info-label">Vendor cost</span><span class="info-value">${hasCost ? money(listing.currency, listing.cost) : 'Not supplied'}</span></div>
      <div class="info-row"><span class="info-label">Approved retail</span><span class="info-value">${money(listing.currency, listing.retail)}</span></div>
      <div class="info-row"><span class="info-label">Margin</span><span class="info-value">${margin}</span></div>`;
    $('listingSupply').innerHTML = `<div class="info-row"><span class="info-label">Configuration ID</span><span class="info-value">${escapeHtml(configuration.code)}</span></div>
      <div class="info-row"><span class="info-label">Designated vendor</span><span class="info-value">${escapeHtml(listing.vendor)}</span></div>
      <div class="info-row"><span class="info-label">Vendor SKU</span><span class="info-value">${escapeHtml(listing.sku)}</span></div>
      <div class="info-row"><span class="info-label">Vendor stock</span><span class="info-value">${listing.stock} units</span></div>
      <div class="info-row"><span class="info-label">Lead time</span><span class="info-value">${escapeHtml(listing.leadTime || '—')}</span></div>
      <div class="info-row"><span class="info-label">Availability</span><span class="info-value">${listing.available ? 'Available' : hasCost ? 'Not offered' : 'Needs pricing review'}</span></div>
      <div class="info-row"><span class="info-label">Updated</span><span class="info-value">${escapeHtml(listing.updated)}</span></div>`;
    $('listingPricingNote').textContent = hasCost
      ? 'Client contract pricing is applied to this approved country retail price. The vendor-cost snapshot is retained with each order.'
      : 'This variant cannot be offered until a vendor cost is mapped and its margin has been reviewed.';
    $('pricingPanel').classList.add('open');
    $('panelOverlay').classList.add('show');
  }

  function close() {
    $('pricingPanel').classList.remove('open');
    $('panelOverlay').classList.remove('show');
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initCountryListings);
else initCountryListings();
