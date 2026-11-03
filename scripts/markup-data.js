// Suggested percentage adjustments for custom client pricing: category × volume tier, plus country guidance.
// They do not change standard retail unless explicitly added to a client contract. Needs billing-settings-data.js.

const DEVICE_CATEGORIES = ['Laptops', 'Monitors', 'Peripherals'];
const VOLUME_TIERS = { t1: 'Tier 1 · 0–99 units/yr', t2: 'Tier 2 · 100–499 units/yr', t3: 'Tier 3 · 500+ units/yr' };

const DEFAULT_MARKUP = [
  { id: 'dm-l1', chain: 'L-t1', category: 'Laptops', tier: 't1', markup: 12, from: '2026-01-01', to: '', by: 'Commercial · Lena' },
  { id: 'dm-l1a', chain: 'L-t1', category: 'Laptops', tier: 't1', markup: 14, from: '2025-01-01', to: '2025-12-31', by: 'Commercial · Lena' },
  { id: 'dm-l2', chain: 'L-t2', category: 'Laptops', tier: 't2', markup: 10, from: '2026-01-01', to: '', by: 'Commercial · Lena' },
  { id: 'dm-l3', chain: 'L-t3', category: 'Laptops', tier: 't3', markup: 8, from: '2026-01-01', to: '', by: 'Commercial · Lena' },
  { id: 'dm-m1', chain: 'M-t1', category: 'Monitors', tier: 't1', markup: 15, from: '2026-01-01', to: '', by: 'Commercial · Lena' },
  { id: 'dm-m2', chain: 'M-t2', category: 'Monitors', tier: 't2', markup: 12, from: '2026-01-01', to: '', by: 'Commercial · Lena' },
  { id: 'dm-m3', chain: 'M-t3', category: 'Monitors', tier: 't3', markup: 10, from: '2026-01-01', to: '', by: 'Commercial · Lena' },
  { id: 'dm-p1', chain: 'P-t1', category: 'Peripherals', tier: 't1', markup: 20, from: '2026-01-01', to: '', by: 'Commercial · Lena' },
  { id: 'dm-p2', chain: 'P-t2', category: 'Peripherals', tier: 't2', markup: 18, from: '2026-01-01', to: '', by: 'Commercial · Lena' },
  { id: 'dm-p3', chain: 'P-t3', category: 'Peripherals', tier: 't3', markup: 15, from: '2026-01-01', to: '2026-12-31', by: 'Commercial · Lena' },
  { id: 'dm-p3b', chain: 'P-t3', category: 'Peripherals', tier: 't3', markup: 14, from: '2027-01-01', to: '', by: 'Commercial · Priya' }
];

const MARKUP_COUNTRY_ADJ = [
  { country: 'MY', category: 'Peripherals', adj: -2, from: '2026-11-01' },
  { country: 'GB', category: 'Laptops', adj: 1, from: '2026-05-18' },
  { country: 'AU', category: 'Monitors', adj: 2, from: '2026-01-01' }
];

// Country listings are configuration-specific: technical validity is separate from local vendor and price availability.
const mbp14Configuration = (id, memory, storage, countries = {}) => ({
  id,
  code: `MBP14-M3-${memory.replace(' GB', '')}-${storage.replace(' TB', 'TB').replace(' GB', '')}`,
  label: `${memory} memory · ${storage} SSD`,
  specifications: { memory, storage: `${storage} SSD` },
  countries
});

const MODEL_VENDOR_LISTINGS = {
  'MacBook Pro 14" M3': {
    category: 'Laptops',
    defaultConfigurationId: 'mbp14-m3-16gb-512gb',
    specificationOptions: {
      memory: ['8 GB', '16 GB', '24 GB'],
      storage: ['512 GB', '1 TB', '2 TB']
    },
    configurations: {
      'mbp14-m3-8gb-512gb': mbp14Configuration('mbp14-m3-8gb-512gb', '8 GB', '512 GB'),
      'mbp14-m3-8gb-1tb': mbp14Configuration('mbp14-m3-8gb-1tb', '8 GB', '1 TB'),
      'mbp14-m3-16gb-512gb': mbp14Configuration('mbp14-m3-16gb-512gb', '16 GB', '512 GB', {
        SG: { sku: 'APL-SG-M3-16-512', vendor: 'Vendor A', currency: 'SGD', cost: 2350, retail: 2599, available: true, stock: 22, leadTime: '2–3 days', updated: 'Today' }
      }),
      'mbp14-m3-16gb-1tb': mbp14Configuration('mbp14-m3-16gb-1tb', '16 GB', '1 TB', {
        SG: { sku: 'APL-SG-M3-16-1T', vendor: 'Vendor A', currency: 'SGD', cost: 2640, retail: 2899, available: true, stock: 9, leadTime: '3–4 days', updated: 'Today' }
      }),
      'mbp14-m3-16gb-2tb': mbp14Configuration('mbp14-m3-16gb-2tb', '16 GB', '2 TB', {
        SG: { sku: 'APL-SG-M3-16-2T', vendor: 'Vendor A', currency: 'SGD', cost: null, retail: 3199, available: false, stock: 0, leadTime: '—', updated: 'Pricing review' }
      }),
      'mbp14-m3-24gb-512gb': mbp14Configuration('mbp14-m3-24gb-512gb', '24 GB', '512 GB'),
      'mbp14-m3-24gb-1tb': mbp14Configuration('mbp14-m3-24gb-1tb', '24 GB', '1 TB', {
        SG: { sku: 'APL-SG-M3-24-1T', vendor: 'Vendor A', currency: 'SGD', cost: 3050, retail: 3299, available: true, stock: 4, leadTime: '4–5 days', updated: 'Today' }
      }),
      'mbp14-m3-24gb-2tb': mbp14Configuration('mbp14-m3-24gb-2tb', '24 GB', '2 TB')
    },
    invalidConfigurations: [
      { memory: '8 GB', storage: '2 TB', reason: 'Unsupported specification combination' }
    ]
  }
};

// Keep the default-configuration country map for existing client-catalogue and pricing flows.
MODEL_VENDOR_LISTINGS['MacBook Pro 14" M3'].configurations['mbp14-m3-16gb-512gb'].countries = {
        SG: { sku: 'APL-SG-M3-16-512', vendor: 'Vendor A', currency: 'SGD', cost: 2350, retail: 2599, available: true, stock: 22, leadTime: '2–3 days', updated: 'Today' },
        US: { sku: 'MBP14-M3-US', vendor: 'Vendor C', currency: 'USD', cost: 1520, retail: 1599, available: true, stock: 24, updated: '12 min ago' },
        DE: { sku: 'MBP14-M3-DE', vendor: 'Vendor B', currency: 'EUR', cost: 1680, retail: 1982.4, available: true, stock: 16, updated: 'Today 09:10 CET' },
        MY: { sku: 'MBP14-M3-MY', vendor: 'Vendor A', currency: 'MYR', cost: 7850, retail: 9263, available: false, stock: 0, updated: 'Yesterday 17:40 MYT' },
        GB: { sku: 'MBP14-M3-UK', vendor: 'Vendor B', currency: 'GBP', cost: 1420, retail: 1675.6, available: true, stock: 11, updated: 'Today 08:30 BST' }
};

const modelConfiguration = (model, configurationId) => {
  const listing = MODEL_VENDOR_LISTINGS[model];
  return listing?.configurations[configurationId || listing.defaultConfigurationId] || null;
};
const modelCountryListing = (model, country, configurationId) => modelConfiguration(model, configurationId)?.countries[country] || null;
const modelCountries = (model, configurationId) => Object.keys(modelConfiguration(model, configurationId)?.countries || {});

const CLIENT_MODEL_CATALOGUE = [
  { client: 'acme', country: 'SG', tier: 't2', configurationId: 'mbp14-m3-16gb-512gb', offered: true, hidden: false },
  { client: 'acme', country: 'SG', tier: 't2', configurationId: 'mbp14-m3-16gb-1tb', offered: true, hidden: false, adjustment: 8 },
  { client: 'acme', country: 'SG', tier: 't2', configurationId: 'mbp14-m3-24gb-1tb', offered: true, hidden: false, adjustment: 8 },
  { client: 'techglobal', country: 'US', tier: 't1', configurationId: 'mbp14-m3-16gb-512gb', offered: true, hidden: false },
  { client: 'techglobal', country: 'SG', tier: 't1', configurationId: 'mbp14-m3-16gb-512gb', offered: true, hidden: false },
  { client: 'digital', country: 'GB', tier: 't1', configurationId: 'mbp14-m3-16gb-512gb', offered: true, hidden: false },
  { client: 'finance', country: 'GB', tier: 't1', configurationId: 'mbp14-m3-16gb-512gb', offered: true, hidden: true },
  { client: 'mediaworks', country: 'SG', tier: 't3', configurationId: 'mbp14-m3-16gb-512gb', offered: true, hidden: false },
  { client: 'cloud', country: 'US', tier: 't1', configurationId: 'mbp14-m3-16gb-512gb', offered: false, hidden: false }
];

// Version in force today for a category × tier, and any scheduled one after it
const markupCurrent = (cat, tier) => DEFAULT_MARKUP.find(r => r.category === cat && r.tier === tier && ruleStatus(r) === 'active');
const markupScheduled = (cat, tier) => DEFAULT_MARKUP.find(r => r.category === cat && r.tier === tier && ruleStatus(r) === 'scheduled');

function modelClientPrice(clientId, model, country, tier, configurationId) {
  const configuration = modelConfiguration(model, configurationId);
  const listing = configuration?.countries[country];
  if (!listing || !Number.isFinite(listing.cost) || listing.cost <= 0) return null;
  const terms = CONTRACTS[clientId].terms;
  const exception = terms.pricing.markup.find(m => m.category === MODEL_VENDOR_LISTINGS[model].category && m.tier === tier);
  const adjustment = exception ? exception.markup : 0;
  const beforeFloor = exception ? listing.cost * (1 + adjustment / 100) : listing.retail;
  const localPrice = Math.round(Math.max(listing.cost, beforeFloor) * 100) / 100;
  const billing = payingEntity(terms, country);
  const fx = fxQuote(terms, listing.currency, billing.entity.currency);
  const price = Math.round(localPrice * (fx ? fx.rate : 1) * 100) / 100;
  const vendorCost = Math.round(listing.cost * (fx ? fx.rate : 1) * 100) / 100;
  return { listing, configuration, tier, adjustment, adjustmentSource: exception ? 'Client contract' : '', hasContractPrice: !!exception, localPrice, price, currency: billing.entity.currency, vendorCost, entity: billing.entity, fx, floorApplied: !!exception && beforeFloor < listing.cost };
}

// Contract pricing uses retail without a client adjustment; configured percentage adjustments apply to vendor cost and are floored at cost.
