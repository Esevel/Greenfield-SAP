// Client catalogue offers are scoped to a client, country, configuration and volume tier.
function initClientCatalogues() {
  const $ = id => document.getElementById(id);
  const model = 'MacBook Pro 14" M3';
  const listingData = MODEL_VENDOR_LISTINGS[model];
  if (!listingData) throw new Error(`Missing model catalogue configuration for ${model}`);

  const configurations = Object.values(listingData.configurations);
  const clients = Object.fromEntries(WH_CLIENTS.map(client => [client.id, client]));
  const catalogueModal = $('clientCatalogueModal');
  const catalogueForm = $('clientCatalogueForm');
  const money = (currency, amount) => fmtAmount(currency, amount);
  let editingCatalogue = null;

  $('newCatalogueClient').innerHTML = WH_CLIENTS.map(client => `<option value="${escapeHtml(client.id)}">${escapeHtml(client.name)}</option>`).join('');
  $('newCatalogueTier').innerHTML = Object.entries(VOLUME_TIERS).map(([key, label]) => `<option value="${escapeHtml(key)}">${escapeHtml(label)}</option>`).join('');

  function getConfiguration(configurationId) {
    return modelConfiguration(model, configurationId);
  }

  function getListing(country, configurationId = $('newCatalogueConfiguration').value) {
    return modelCountryListing(model, country, configurationId);
  }

  function getBasePrice(client, country, tier, configurationId) {
    return modelClientPrice(client, model, country, tier, configurationId);
  }

  function getOfferPrice(row) {
    const price = getBasePrice(row.client, row.country, row.tier, row.configurationId);
    if (!price || !Number.isFinite(row.adjustment)) return price;
    const cost = price.listing.cost;
    const unroundedPrice = cost * (1 + row.adjustment / 100);
    const requestedPrice = Number.isFinite(row.contractPrice) ? row.contractPrice : unroundedPrice;
    const localPrice = Math.round(Math.max(cost, requestedPrice) * 100) / 100;
    const convertedPrice = Math.round(localPrice * (price.fx ? price.fx.rate : 1) * 100) / 100;
    return {
      ...price,
      adjustment: row.adjustment,
      adjustmentSource: 'Client catalogue',
      hasContractPrice: true,
      localPrice,
      price: convertedPrice,
      floorApplied: unroundedPrice < cost
    };
  }

  function canOffer(client, country, configurationId) {
    const clientCountries = CONTRACTS[client]?.terms.countries || [];
    const listing = getListing(country, configurationId);
    return clientCountries.includes(country) && Number.isFinite(listing?.cost) && listing.cost > 0;
  }

  function updateCountryOptions(clientId, configurationId, preferredCountry = '') {
    const contractCountries = CONTRACTS[clientId]?.terms.countries || [];
    const countries = contractCountries.filter(country => canOffer(clientId, country, configurationId));
    const select = $('newCatalogueCountry');
    select.replaceChildren(...countries.map(country => new Option(
      `${WH_COUNTRIES[country]?.[0] || ''} ${WH_COUNTRIES[country]?.[1] || country}`,
      country
    )));
    if (countries.includes(preferredCountry)) select.value = preferredCountry;
  }

  function updateConfigurationOptions(clientId, preferredConfiguration = '') {
    const contractCountries = CONTRACTS[clientId]?.terms.countries || [];
    const eligible = configurations.filter(configuration => contractCountries.some(country =>
      canOffer(clientId, country, configuration.id)
    ));
    const select = $('newCatalogueConfiguration');
    select.replaceChildren(...eligible.map(configuration => new Option(
      `${configuration.specifications.memory} / ${configuration.specifications.storage.replace(' SSD', '')}`,
      configuration.id
    )));
    if (eligible.some(configuration => configuration.id === preferredConfiguration)) select.value = preferredConfiguration;
    updateCountryOptions(clientId, select.value);
  }

  function selectedPrice() {
    return getBasePrice(
      $('newCatalogueClient').value,
      $('newCatalogueCountry').value,
      $('newCatalogueTier').value,
      $('newCatalogueConfiguration').value
    );
  }

  function updateCataloguePreview() {
    const configurationId = $('newCatalogueConfiguration').value;
    const country = $('newCatalogueCountry').value;
    const configuration = getConfiguration(configurationId);
    const listing = getListing(country, configurationId);
    const price = selectedPrice();
    const unavailable = !configuration || !listing || !Number.isFinite(listing.cost) || !price;
    $('clientCatalogueError').hidden = true;
    $('clientCatalogueSave').disabled = unavailable;

    if (unavailable) {
      $('newCatalogueBilling').value = '';
      $('newCatalogueCost').value = 'No priced vendor mapping';
      $('newCatalogueRetail').value = '';
      $('newCatalogueAdjustment').value = '';
      $('newCataloguePrice').value = '';
      $('newCataloguePriceLabel').textContent = 'Contract price';
      return;
    }

    $('newCatalogueBilling').value = `${price.entity.name} · ${price.currency}`;
    $('newCatalogueCost').value = money(listing.currency, listing.cost);
    $('newCatalogueRetail').value = money(listing.currency, listing.retail);
    $('newCataloguePriceLabel').textContent = `Contract price (${listing.currency})`;
    const adjustment = price.hasContractPrice
      ? price.adjustment
      : (listing.retail / listing.cost - 1) * 100;
    $('newCatalogueAdjustment').value = editingCatalogue && Number.isFinite(editingCatalogue.adjustment)
      ? editingCatalogue.adjustment
      : adjustment.toFixed(2);
    const localPrice = editingCatalogue
      ? getOfferPrice(editingCatalogue)?.localPrice
      : price.localPrice;
    $('newCataloguePrice').value = Number.isFinite(localPrice) ? localPrice.toFixed(2) : '';
    $('newCatalogueCost').dataset.rawCost = listing.cost;
  }

  function syncPriceFromAdjustment() {
    const cost = Number($('newCatalogueCost').dataset.rawCost);
    const adjustment = Number($('newCatalogueAdjustment').value);
    if (!Number.isFinite(cost) || cost <= 0 || !Number.isFinite(adjustment)) return;
    $('newCataloguePrice').value = Math.max(cost, cost * (1 + adjustment / 100)).toFixed(2);
  }

  function syncAdjustmentFromPrice() {
    const cost = Number($('newCatalogueCost').dataset.rawCost);
    const contractPrice = Number($('newCataloguePrice').value);
    if (!Number.isFinite(cost) || cost <= 0 || !Number.isFinite(contractPrice)) return;
    $('newCatalogueAdjustment').value = (Math.max(cost, contractPrice) / cost * 100 - 100).toFixed(2);
    if (contractPrice < cost) $('newCataloguePrice').value = cost.toFixed(2);
  }

  function visibleOffers() {
    return CLIENT_MODEL_CATALOGUE.filter(row => clients[row.client]
      && getListing(row.country, row.configurationId)
      && getOfferPrice(row));
  }

  function updateTabCount() {
    const tabCount = $('clientCatalogueTabCount');
    if (tabCount) tabCount.textContent = visibleOffers().length;
  }

  function render() {
    const query = $('clientCatalogueSearch').value.trim().toLowerCase();
    const filter = $('clientCatalogueFilter').value;
    const entries = visibleOffers().filter(row => {
      const client = clients[row.client];
      const configuration = getConfiguration(row.configurationId);
      return (!query || `${client.name} ${row.country} ${configuration.specifications.memory} ${configuration.specifications.storage}`.toLowerCase().includes(query))
        && (!filter || (filter === 'offered' ? row.offered : !row.offered));
    });

    $('clientCatalogueRows').innerHTML = entries.map(row => {
      const client = clients[row.client];
      const configuration = getConfiguration(row.configurationId);
      const listing = getListing(row.country, row.configurationId);
      const price = getOfferPrice(row);
      const adjustment = price.hasContractPrice
        ? `${price.adjustment > 0 ? '+' : ''}${price.adjustment.toFixed(2).replace(/\.00$/, '')}% · ${escapeHtml(price.adjustmentSource || 'Client contract')}`
        : 'Standard retail';
      return `<tr>
        <td><div class="client-cell"><div class="client-logo">${escapeHtml(client.logo)}</div><span>${escapeHtml(client.name)}</span></div></td>
        <td><span class="flag">${WH_COUNTRIES[row.country]?.[0] || row.country}</span> ${escapeHtml(row.country)}</td>
        <td><strong>${escapeHtml(configuration.specifications.memory)} / ${escapeHtml(configuration.specifications.storage.replace(' SSD', ''))}</strong><div class="stock-sub">${escapeHtml(configuration.code)}</div></td>
        <td class="text-muted">${escapeHtml(price.entity.name)} · ${escapeHtml(price.currency)}</td>
        <td class="num">${money(listing.currency, listing.cost)}</td>
        <td class="num">${money(listing.currency, listing.retail)}</td>
        <td>${escapeHtml(adjustment)}</td>
        <td class="num"><strong>${money(listing.currency, price.localPrice)}</strong><div class="stock-sub">${money(price.currency, price.price)} billed${price.fx ? ` · ${price.fx.rate.toFixed(4)} ${escapeHtml(price.fx.source)}` : ''}</div>${price.floorApplied ? '<div><span class="badge badge-warning badge-sm">Vendor cost floor</span></div>' : ''}</td>
        <td><label class="toggle-switch" aria-label="Offer ${escapeHtml(client.name)} ${escapeHtml(configuration.code)}"><input type="checkbox" data-offer="${escapeHtml(row.client)}" data-country="${escapeHtml(row.country)}" data-configuration="${escapeHtml(row.configurationId)}" data-tier="${escapeHtml(row.tier)}" ${row.offered ? 'checked' : ''}><span class="toggle-slider"></span></label></td>
        <td><button type="button" class="btn btn-secondary btn-sm" data-edit="${escapeHtml(row.client)}" data-country="${escapeHtml(row.country)}" data-configuration="${escapeHtml(row.configurationId)}" data-tier="${escapeHtml(row.tier)}">Edit</button></td>
      </tr>`;
    }).join('') || '<tr><td colspan="10" class="text-muted sla-empty">No client catalogue offers match.</td></tr>';

    $('clientCatalogueCount').textContent = `${entries.length} client catalogue offers`;
    updateTabCount();
  }

  $('clientCatalogueRows').addEventListener('change', event => {
    const { offer: clientId, country, configuration: configurationId, tier } = event.target.dataset;
    if (!clientId) return;
    const row = CLIENT_MODEL_CATALOGUE.find(item => item.client === clientId
      && item.country === country && item.configurationId === configurationId && item.tier === tier);
    if (!row) throw new Error(`Missing client catalogue offer for ${clientId}, ${country}, ${configurationId}, ${tier}`);
    row.offered = event.target.checked;
    render();
  });

  $('clientCatalogueRows').addEventListener('click', event => {
    const button = event.target.closest('[data-edit]');
    if (!button) return;
    const row = CLIENT_MODEL_CATALOGUE.find(item => item.client === button.dataset.edit
      && item.country === button.dataset.country && item.configurationId === button.dataset.configuration
      && item.tier === button.dataset.tier);
    if (row) openCatalogueModal(row);
  });

  const headerObserver = new MutationObserver(updateTabCount);
  headerObserver.observe($('model-header-container'), { childList: true });
  $('clientCatalogueSearch').addEventListener('input', render);
  $('clientCatalogueFilter').addEventListener('change', render);

  function openCatalogueModal(row = null) {
    editingCatalogue = row;
    const candidate = WH_CLIENTS.flatMap(client => configurations.flatMap(configuration =>
      (CONTRACTS[client.id]?.terms.countries || [])
        .filter(country => canOffer(client.id, country, configuration.id))
        .flatMap(country => Object.keys(VOLUME_TIERS).map(tier => ({ client, country, configuration, tier })))
    )).find(({ client, country, configuration, tier }) => !CLIENT_MODEL_CATALOGUE.some(item =>
      item.client === client.id && item.country === country && item.configurationId === configuration.id && item.tier === tier
    ));

    if (row) {
      $('newCatalogueClient').value = row.client;
      updateConfigurationOptions(row.client, row.configurationId);
      updateCountryOptions(row.client, row.configurationId, row.country);
      $('newCatalogueTier').value = row.tier;
    } else if (candidate) {
      $('newCatalogueClient').value = candidate.client.id;
      updateConfigurationOptions(candidate.client.id, candidate.configuration.id);
      updateCountryOptions(candidate.client.id, candidate.configuration.id, candidate.country);
      $('newCatalogueTier').value = candidate.tier;
    } else {
      $('newCatalogueClient').value = WH_CLIENTS[0]?.id || '';
      updateConfigurationOptions($('newCatalogueClient').value);
    }

    $('clientCatalogueModalTitle').textContent = row ? 'Edit client catalogue offer' : 'Add client catalogue offer';
    $('clientCatalogueSave').textContent = row ? 'Save changes' : 'Add offer';
    $('newCatalogueClient').disabled = !!row;
    $('newCatalogueCountry').disabled = !!row;
    $('newCatalogueConfiguration').disabled = !!row;
    $('newCatalogueTier').disabled = !!row;
    $('newCatalogueOffered').checked = row ? row.offered : true;
    $('clientCatalogueError').hidden = true;
    updateCataloguePreview();
    catalogueModal.classList.add('show');
    $('newCatalogueClient').focus();
  }

  $('addClientCatalogue').addEventListener('click', () => openCatalogueModal());
  $('newCatalogueClient').addEventListener('change', () => {
    updateConfigurationOptions($('newCatalogueClient').value);
    updateCataloguePreview();
  });
  $('newCatalogueConfiguration').addEventListener('change', () => {
    updateCountryOptions($('newCatalogueClient').value, $('newCatalogueConfiguration').value);
    updateCataloguePreview();
  });
  ['newCatalogueCountry', 'newCatalogueTier'].forEach(id => $(id).addEventListener('change', updateCataloguePreview));
  $('newCatalogueAdjustment').addEventListener('input', syncPriceFromAdjustment);
  $('newCataloguePrice').addEventListener('change', syncAdjustmentFromPrice);

  catalogueModal.addEventListener('click', event => {
    if (event.target === catalogueModal || event.target.closest('[data-client-catalogue-close]')) {
      catalogueModal.classList.remove('show');
    }
  });

  catalogueForm.addEventListener('submit', event => {
    event.preventDefault();
    const client = $('newCatalogueClient').value;
    const country = $('newCatalogueCountry').value;
    const configurationId = $('newCatalogueConfiguration').value;
    const tier = $('newCatalogueTier').value;
    const listing = getListing(country, configurationId);
    const duplicate = !editingCatalogue && CLIENT_MODEL_CATALOGUE.some(row => row.client === client
      && row.country === country && row.configurationId === configurationId && row.tier === tier);
    const adjustment = Number($('newCatalogueAdjustment').value);
    const contractPrice = Number($('newCataloguePrice').value);
    const vendorCost = listing?.cost;
    const error = duplicate ? 'This client already has an offer for this configuration, country and volume tier.'
      : !Number.isFinite(vendorCost) || vendorCost <= 0 ? 'A valid vendor cost is required before adding this client catalogue offer.'
        : !Number.isFinite(adjustment) || !Number.isFinite(contractPrice) || $('newCatalogueAdjustment').value === '' || $('newCataloguePrice').value === '' ? 'Enter an adjustment and contract price.'
          : adjustment < -100 || contractPrice < vendorCost ? 'Contract price cannot be below vendor cost; adjustment cannot be less than -100%.'
            : '';
    $('clientCatalogueError').textContent = error;
    $('clientCatalogueError').hidden = !error;
    if (error) return;

    if (editingCatalogue) {
      editingCatalogue.adjustment = adjustment;
      editingCatalogue.contractPrice = contractPrice;
      editingCatalogue.offered = $('newCatalogueOffered').checked;
    } else {
      CLIENT_MODEL_CATALOGUE.push({
        client,
        country,
        tier,
        configurationId,
        adjustment,
        contractPrice,
        offered: $('newCatalogueOffered').checked,
        hidden: false
      });
    }

    $('clientCatalogueSearch').value = '';
    $('clientCatalogueFilter').value = '';
    catalogueModal.classList.remove('show');
    editingCatalogue = null;
    $('newCatalogueClient').disabled = false;
    $('newCatalogueCountry').disabled = false;
    $('newCatalogueConfiguration').disabled = false;
    $('newCatalogueTier').disabled = false;
    $('addClientCatalogue').disabled = false;
    render();
  });

  render();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initClientCatalogues);
else initClientCatalogues();
