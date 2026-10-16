// Shared prototype data for the Warehouses tabs: hubs, client locations, clients and hub assignments

const WH_COUNTRIES = {
  SG: ['🇸🇬', 'Singapore'],
  MY: ['🇲🇾', 'Malaysia'],
  AU: ['🇦🇺', 'Australia'],
  US: ['🇺🇸', 'United States'],
  GB: ['🇬🇧', 'United Kingdom']
};

const WAREHOUSES = [
  { id: 1, name: 'Singapore Hub', type: 'esevel', client: '', country: 'SG', units: 1204, status: 'Active', updated: '2h ago',
    address: '18 Tai Seng Street, #05-01, Singapore 539775', contact: 'Hub SG Logistics · +65 6123 4567', hours: 'Mon–Fri 08:00–18:00, Sat 09:00–13:00' },
  { id: 2, name: 'Kuala Lumpur Hub', type: 'esevel', client: '', country: 'MY', units: 486, status: 'Active', updated: '5h ago',
    address: 'Lot 12, Jalan Teknologi 3/1, Kota Damansara, 47810 Petaling Jaya', contact: 'Kerry Logistics · +60 3 6142 8800', hours: 'Mon–Fri 09:00–18:00' },
  { id: 3, name: 'Sydney Hub', type: 'esevel', client: '', country: 'AU', units: 352, status: 'Active', updated: 'Yesterday',
    address: '4 Pioneer Avenue, Alexandria NSW 2015', contact: 'Kerry Logistics · +61 2 9318 4400', hours: 'Mon–Fri 08:30–17:30' },
  { id: 4, name: 'US East Hub', type: 'esevel', client: '', country: 'US', units: 618, status: 'Active', updated: '1h ago',
    address: '200 Meadowlands Pkwy, Secaucus, NJ 07094', contact: 'Ops desk · useast-ops@esevel.com', hours: 'Mon–Fri 07:00–19:00 ET' },
  { id: 8, name: 'US West Hub', type: 'esevel', client: '', country: 'US', units: 214, status: 'Active', updated: '3h ago',
    address: '1350 Greg Street, Sparks, NV 89431', contact: 'Ops desk · uswest-ops@esevel.com', hours: 'Mon–Fri 07:00–17:00 PT' },
  { id: 5, name: 'Acme Tech · Singapore office', type: 'client', client: 'Acme Tech', country: 'SG', units: 42, status: 'Active', updated: '3 days ago',
    address: '1 Raffles Place, Tower 2, #28-01, Singapore 048616', contact: 'Ravi Shah · it-admin@acmetech.com', hours: 'Mon–Fri 09:00–17:00' },
  { id: 6, name: 'TechGlobal · Austin IT room', type: 'client', client: 'TechGlobal Inc', country: 'US', units: 27, status: 'Active', updated: '1 week ago',
    address: '500 W 2nd St, Floor 12, Austin, TX 78701', contact: 'Sarah Kim · +1 512 555 0142', hours: 'Mon–Fri 08:00–16:00 CT' },
  { id: 7, name: 'London Hub (Park Royal)', type: 'esevel', client: '', country: 'GB', units: 0, status: 'Decommissioned', updated: '12 Mar 2026',
    address: 'Unit 7, Abbey Road Industrial Park, London NW10 7SU', contact: '—', hours: '—' }
];

const WH_CLIENTS = [
  { id: 'acme', name: 'Acme Tech', logo: 'AT' },
  { id: 'techglobal', name: 'TechGlobal Inc', logo: 'TG' },
  { id: 'digital', name: 'Digital Solutions', logo: 'DS' },
  { id: 'mediaworks', name: 'MediaWorks', logo: 'MW' },
  { id: 'finance', name: 'FinanceExperts', logo: 'FE' },
  { id: 'cloud', name: 'CloudSystems', logo: 'CS' },
  { id: 'northwind', name: 'Northwind Health', logo: 'NH' },
  { id: 'brightpath', name: 'BrightPath Education', logo: 'BP' }
];

// Per client and country: a hub id, or 'none' (stock stays at client sites). A missing country means the client doesn't operate there.
const HUB_ASSIGNMENTS = {
  acme: { SG: 1, MY: 2, AU: 3, US: 4 },
  techglobal: { SG: 1, MY: 2, AU: 3, US: 4 },
  digital: { AU: 3, GB: 'none' },
  mediaworks: { SG: 1, MY: 2, AU: 3, US: 4 },
  finance: { SG: 1, GB: 'none' },
  cloud: { AU: 3, US: 8 },
  northwind: { SG: 1, US: 8 },
  brightpath: { SG: 1, MY: 'none', AU: 3 }
};

function clientsAssignedTo(hubId) {
  return WH_CLIENTS
    .map(c => ({ client: c, countries: Object.keys(HUB_ASSIGNMENTS[c.id]).filter(cc => HUB_ASSIGNMENTS[c.id][cc] === hubId) }))
    .filter(x => x.countries.length);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}
