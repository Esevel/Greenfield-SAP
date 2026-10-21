// Client catalogues shows contract-calculated prices; offer status is independent of pricing.
function initClientCatalogues() {
  const $ = id => document.getElementById(id);
  const model = 'MacBook Pro 14" M3';
  const listingData = MODEL_VENDOR_LISTINGS[model];
  const clients = Object.fromEntries(WH_CLIENTS.map(c => [c.id, c]));
  const money = (cur, amount) => fmtAmount(cur, amount);
  const catalogueModal = $('clientCatalogueModal');
  const catalogueForm = $('clientCatalogueForm');
  let editingCatalogue = null;

  $('newCatalogueClient').innerHTML = WH_CLIENTS.map(client => `<option value="${client.id}">${escapeHtml(client.name)}</option>`).join('');
  $('newCatalogueCountry').innerHTML = Object.keys(listingData.countries).map(country => `<option value="${country}">${WH_COUNTRIES[country]?.[1] || country}</option>`).join('');
  $('newCatalogueTier').innerHTML = Object.entries(VOLUME_TIERS).map(([key, label]) => `<option value="${key}">${escapeHtml(label)}</option>`).join('');

  function selectedPrice() {
    return modelClientPrice($('newCatalogueClient').value, model, $('newCatalogueCountry').value, $('newCatalogueTier').value);
  }

  function updateCataloguePreview() {
    const country = $('newCatalogueCountry').value;
    const vendor = listingData.countries[country];
    const price = selectedPrice();
    if (!vendor || !price) return;
    $('newCatalogueBilling').value = `${price.entity.name} · ${price.currency}`;
    $('newCatalogueCost').value = money(vendor.currency, vendor.cost);
    $('newCatalogueRetail').value = money(vendor.currency, vendor.retail);
    $('newCataloguePriceLabel').textContent = `Contract price (${vendor.currency})`;
    $('newCatalogueAdjustment').value = price.hasContractPrice ? price.adjustment : editingCatalogue ? '' : 0;
    $('newCataloguePrice').value = price.hasContractPrice ? price.localPrice : editingCatalogue ? '' : vendor.cost;
    $('newCatalogueAdjustment').dataset.baseCost = vendor.cost;
    $('newCataloguePrice').dataset.baseCost = vendor.cost;
    $('newCatalogueAdjustment').dataset.currency = vendor.currency;
    $('newCataloguePrice').dataset.currency = vendor.currency;
    $('clientCatalogueError').hidden = true;
  }

  function syncPriceFromAdjustment() {
    const cost = Number($('newCatalogueCost').dataset.rawCost);
    const adjustment = Number($('newCatalogueAdjustment').value);
    if (!Number.isFinite(cost) || !Number.isFinite(adjustment)) return;
    $('newCataloguePrice').value = Math.max(cost, cost * (1 + adjustment / 100)).toFixed(2);
  }

  function syncAdjustmentFromPrice() {
    const cost = Number($('newCatalogueCost').dataset.rawCost);
    const contractPrice = Number($('newCataloguePrice').value);
    if (!Number.isFinite(cost) || cost <= 0 || !Number.isFinite(contractPrice)) return;
    $('newCatalogueAdjustment').value = (Math.max(cost, contractPrice) / cost * 100 - 100).toFixed(2);
    if (contractPrice < cost) $('newCataloguePrice').value = cost.toFixed(2);
  }

  function updateTabCount() {
    const tabCount = $('clientCatalogueTabCount');
    if (tabCount) tabCount.textContent = CLIENT_MODEL_CATALOGUE.filter(row => modelClientPrice(row.client, model, row.country, row.tier)?.hasContractPrice).length;
  }

  function render() {
    const query = $('clientCatalogueSearch').value.trim().toLowerCase();
    const filter = $('clientCatalogueFilter').value;
    const entries = CLIENT_MODEL_CATALOGUE.filter(row => {
      const c = clients[row.client];
      return (!query || `${c.name} ${row.country}`.toLowerCase().includes(query))
        && (!filter || (filter === 'offered' ? row.offered : !row.offered))
        && modelClientPrice(row.client, model, row.country, row.tier)?.hasContractPrice;
    });
    $('clientCatalogueRows').innerHTML = entries.map(row => {
      const c = clients[row.client];
      const vendor = listingData.countries[row.country];
      const price = modelClientPrice(row.client, model, row.country, row.tier);
      const adjustment = `${price.adjustment > 0 ? '+' : ''}${price.adjustment}% · Client contract`;
      const marketplace = !row.offered ? '<span class="badge badge-muted badge-sm">Not offered</span>' : row.hidden ? '<span class="badge badge-muted badge-sm">Hidden by client</span>' : '<span class="badge badge-success badge-sm">Visible</span>';
      return `<tr>
        <td><div class="client-cell"><div class="client-logo">${escapeHtml(c.logo)}</div><span>${escapeHtml(c.name)}</span></div></td>
        <td><span class="flag">${WH_COUNTRIES[row.country][0]}</span> ${row.country}</td>
        <td class="text-muted">${escapeHtml(price.entity.name)} · ${price.currency}</td>
        <td class="num">${money(vendor.currency, vendor.cost)}</td>
        <td class="num">${money(vendor.currency, vendor.retail)}</td>
        <td>${escapeHtml(adjustment)}</td>
        <td class="num"><strong>${money(vendor.currency, price.localPrice)}</strong><div class="stock-sub">${money(price.currency, price.price)} billed${price.fx ? ` · ${price.fx.rate.toFixed(4)} ${escapeHtml(price.fx.source)}` : ''}</div>${price.floorApplied ? '<div><span class="badge badge-warning badge-sm">Vendor cost floor</span></div>' : ''}</td>
        <td><label class="toggle-switch" aria-label="Offer ${escapeHtml(c.name)} this model"><input type="checkbox" data-offer="${row.client}" data-country="${row.country}" data-tier="${row.tier}" ${row.offered ? 'checked' : ''}><span class="toggle-slider"></span></label></td>
        <td><button type="button" class="btn btn-secondary btn-sm" data-edit="${row.client}" data-country="${row.country}" data-tier="${row.tier}">Edit</button></td>
      </tr>`;
    }).join('') || '<tr><td colspan="9" class="text-muted sla-empty">No client listings match.</td></tr>';
    $('clientCatalogueCount').textContent = `${entries.length} client catalogue listings`;
    updateTabCount();
  }

  $('clientCatalogueRows').addEventListener('change', e => {
    const { offer: clientId, country, tier } = e.target.dataset;
    if (!clientId) return;
    const row = CLIENT_MODEL_CATALOGUE.find(x => x.client === clientId && x.country === country && x.tier === tier);
    row.offered = e.target.checked;
    render();
  });
  $('clientCatalogueRows').addEventListener('click', e => {
    const button = e.target.closest('[data-edit]');
    if (!button) return;
    const row = CLIENT_MODEL_CATALOGUE.find(item => item.client === button.dataset.edit && item.country === button.dataset.country && item.tier === button.dataset.tier);
    if (row) openCatalogueModal(row);
  });
  const headerObserver = new MutationObserver(updateTabCount);
  headerObserver.observe($('model-header-container'), { childList: true });
  $('clientCatalogueSearch').addEventListener('input', render);
  $('clientCatalogueFilter').addEventListener('change', render);
  function openCatalogueModal(row = null) {
    editingCatalogue = row;
    const candidate = WH_CLIENTS.flatMap(client => Object.keys(listingData.countries).flatMap(country => Object.keys(VOLUME_TIERS).map(tier => ({ client, country, tier }))))
      .find(({ client, country, tier }) => !CLIENT_MODEL_CATALOGUE.some(row => row.client === client.id && row.country === country && row.tier === tier));
    if (row) {
      $('newCatalogueClient').value = row.client;
      $('newCatalogueCountry').value = row.country;
      $('newCatalogueTier').value = row.tier;
    } else if (candidate) {
      $('newCatalogueClient').value = candidate.client.id;
      $('newCatalogueCountry').value = candidate.country;
      $('newCatalogueTier').value = candidate.tier;
    }
    $('clientCatalogueModalTitle').textContent = row ? 'Edit client catalogue' : 'Add client catalogue';
    $('clientCatalogueSave').textContent = row ? 'Save changes' : 'Add catalogue';
    $('newCatalogueClient').disabled = !!row;
    $('newCatalogueCountry').disabled = !!row;
    $('newCatalogueTier').disabled = !!row;
    $('newCatalogueOffered').checked = row ? row.offered : true;
    $('clientCatalogueError').hidden = true;
    updateCataloguePreview();
    $('newCatalogueCost').dataset.rawCost = listingData.countries[$('newCatalogueCountry').value].cost;
    if (row) {
      $('newCatalogueAdjustment').value = modelClientPrice(row.client, model, row.country, row.tier).adjustment;
      $('newCataloguePrice').value = listingData.countries[row.country].cost * (1 + Number($('newCatalogueAdjustment').value) / 100);
    } else if (candidate) syncPriceFromAdjustment();
    catalogueModal.classList.add('show');
    $('newCatalogueClient').focus();
  }
  $('addClientCatalogue').addEventListener('click', () => openCatalogueModal());
  ['newCatalogueClient', 'newCatalogueCountry', 'newCatalogueTier'].forEach(id => $(id).addEventListener('change', () => {
    updateCataloguePreview();
    $('newCatalogueCost').dataset.rawCost = listingData.countries[$('newCatalogueCountry').value].cost;
    syncPriceFromAdjustment();
  }));
  $('newCatalogueAdjustment').addEventListener('input', syncPriceFromAdjustment);
  $('newCataloguePrice').addEventListener('change', syncAdjustmentFromPrice);
  catalogueModal.addEventListener('click', event => {
    if (event.target === catalogueModal || event.target.closest('[data-client-catalogue-close]')) catalogueModal.classList.remove('show');
  });
  catalogueForm.addEventListener('submit', event => {
    event.preventDefault();
    const client = $('newCatalogueClient').value;
    const country = $('newCatalogueCountry').value;
    const tier = $('newCatalogueTier').value;
    const duplicate = !editingCatalogue && CLIENT_MODEL_CATALOGUE.some(row => row.client === client && row.country === country && row.tier === tier);
    const adjustment = Number($('newCatalogueAdjustment').value);
    const contractPrice = Number($('newCataloguePrice').value);
    const vendorCost = listingData.countries[country].cost;
    const error = duplicate ? 'This client catalogue already exists.'
      : !Number.isFinite(adjustment) || !Number.isFinite(contractPrice) || $('newCatalogueAdjustment').value === '' || $('newCataloguePrice').value === '' ? 'Enter an adjustment and contract price.'
      : adjustment < -100 || contractPrice < vendorCost ? 'Contract price cannot be below vendor cost; adjustment cannot be less than -100%.' : '';
    $('clientCatalogueError').textContent = error;
    $('clientCatalogueError').hidden = !error;
    if (error) return;
    const terms = CONTRACTS[client].terms;
    const category = MODEL_VENDOR_LISTINGS[model].category;
    const existing = terms.pricing.markup.find(row => row.category === category && row.tier === tier);
    if (existing) existing.markup = adjustment;
    else terms.pricing.markup.push({ category, tier, markup: adjustment });
    if (editingCatalogue) {
      editingCatalogue.offered = $('newCatalogueOffered').checked;
    } else {
      CLIENT_MODEL_CATALOGUE.push({ client, country, tier, offered: $('newCatalogueOffered').checked, hidden: false });
    }
    $('clientCatalogueSearch').value = '';
    $('clientCatalogueFilter').value = '';
    catalogueModal.classList.remove('show');
    editingCatalogue = null;
    $('newCatalogueClient').disabled = false;
    $('newCatalogueCountry').disabled = false;
    $('newCatalogueTier').disabled = false;
    $('addClientCatalogue').disabled = false;
    render();
  });
  render();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initClientCatalogues);
else initClientCatalogues();
