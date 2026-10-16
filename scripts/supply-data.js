// Supply inputs that feed checkout estimates and SLA targets. Needs hub-data.js.
// Each hardware supplier has one lead time per country to the hub (business days), covering every order type.
// The vendor that takes an order sets its lead time; ETAs on the order can be revised later.

const SUPPLY_SUPPLIERS = {
  vendorA: { name: 'Vendor A', leadTimes: { SG: [2, 3], MY: [3, 4] }, actual: { SG: 2.6, MY: 3.9 } },
  vendorB: { name: 'Vendor B', leadTimes: { AU: [3, 5], GB: [3, 4] }, actual: { AU: 3.7, GB: 3.6 } },
  vendorC: { name: 'Vendor C', leadTimes: { US: [3, 5] }, actual: { US: 5.6 } },
  ingram: { name: 'Ingram Micro', leadTimes: { SG: [4, 6], MY: [4, 5], AU: [4, 7], US: [2, 4] }, actual: { SG: 5.2, MY: 4.4, AU: 5.8, US: 3.1 } }
};

// Courier last mile per country (business days), edited on the courier's vendor page
const SUPPLY_COURIERS = {
  courierx: { name: 'Courier X', lastMile: { SG: [1, 2], MY: [1, 3], AU: [2, 3] } },
  dhl: { name: 'DHL Express', lastMile: { GB: [2, 3] } },
  fedex: { name: 'FedEx', lastMile: { US: [2, 4] } }
};

// Hub dispatch buffer (business days), edited in Warehouses
const SUPPLY_HUB_BUFFER = { 1: 0, 2: 1, 3: 1, 4: 0, 8: 1 };

const SUPPLY_COLLECTION = [2, 4];
const SUPPLY_PREP = [1, 2];

const supplyLastMile = cc => Object.values(SUPPLY_COURIERS).map(c => c.lastMile[cc]).find(Boolean) || [3, 5];
const supplyRangeLabel = ([a, b]) => (a === b ? `${a}d` : `${a}–${b}d`);

// Suppliers serving a country, with their lead time there
function supplyVendorsIn(cc) {
  return Object.entries(SUPPLY_SUPPLIERS)
    .filter(([, s]) => s.leadTimes[cc])
    .map(([key, s]) => ({ key, name: s.name, range: s.leadTimes[cc], actual: s.actual[cc] }));
}
