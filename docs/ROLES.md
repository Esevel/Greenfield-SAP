# Role-based access (RBAC)

Access is derived from the **org chart**. Nobody is given a role directly: you put a person in a team, and what they can see follows from that.

> Prototype only. This controls what the UI shows; it is not a security boundary.

## Concepts

| Concept | Where it's defined | Controls |
|---|---|---|
| **Capability** | On each team in `org-data.js`, plus `ORG.shared` for everyone | Which areas and widgets someone sees (stock, work orders, break-fix…) |
| **Level** | Position in the org chart | How much of an area they see, plus commercial figures and approvals |
| **Scope** | Optional, on a team (e.g. `{ clientTier: 'smb' }`) | Which records they see within an area |

### Levels

| Level | Who | Gets |
|---|---|---|
| `member` | Anyone in a team's `members` | Their team's capabilities, limited to the team's scope |
| `team_lead` | A function's `teamLead` | All capabilities in the function, team workload and approvals within the team |
| `function_lead` | A function's `lead` | All capabilities in the function with no scope limit, and function-level approvals |
| `head` | `ORG.head` | Everything, including margins |

### Rules

- **Additive.** Someone in several teams gets every capability from all of them.
- **Shared capabilities.** `ORG.shared` (`people`, `integrations`) goes to every position, because that work crosses teams: a joiner needs CS, Ops and IT. A team can opt out with `shared: false` (Global Partnerships does, since client people and integrations aren't relevant to vendor work). Someone in another team still gets them from that team.
- **Levels are per function.** Justin is team lead in IT EUC but a member in Service Delivery, so he approves IT work but not Service Delivery work.
- **Leads aren't scoped.** Nalene leads Customer Success, so she sees enterprise and SMB clients even though her own team (Key Accounts) is enterprise-only.
- **Interns** are ordinary members.

## Files

| File | Purpose |
|---|---|
| `scripts/org-data.js` | Org chart, people, capability list. **The only file to edit when the team changes.** |
| `scripts/roles.js` | `window.RBAC`: works out access from the org chart |
| `scripts/dashboard-widgets.js` | Dashboard metrics and action items, each with access requirements |
| `scripts/role-switcher.js` | Demo "Viewing as" menu in the header, generated from the org chart |

Load order on a page: `org-data.js` → `roles.js` → anything that uses `RBAC`.

## Common changes

**Add a person**: add them to `PEOPLE`, then to a team's `members`:

```js
PEOPLE: { ..., maya: { name: 'Maya', title: 'Account Manager' } }
// General Accounts
members: ['thiva', 'maya']
```

**Give someone a second hat**: add their id to another team's `members`. Nothing else changes.

**Make someone a lead**: set `lead` or `teamLead` on the function.

**Add a team**: add it to a function's `teams` with `capabilities` (and `scope` if needed).

**Add a capability**: add it to `CAPABILITIES`, then to the teams that should have it (or to `ORG.shared` if everyone needs it).

## Using RBAC in code

```js
const user = RBAC.getCurrentUser();

user.can('stock');                                                    // has the capability
user.can('repair_quotes', { minLevel: 'team_lead' });                 // capability at a level
user.can(null, { function: 'it_euc', minLevel: 'team_lead' });         // level within a function
user.can(null, { minLevel: 'head' });                                  // head only
user.scopeFor('clients');              // null = all, [] = none, [{ clientTier: 'smb' }] = filtered
user.canSeeRecord('clients', client);  // check one record against scope
user.positions;                        // [{ functionId, teamId, level, label }]
```

### Hiding markup

Add attributes and call `RBAC.applyAccessAttributes()` after the content renders:

```html
<a data-requires="stock">Restock</a>
<button data-requires="purchase_orders" data-function="supply_chain" data-min-level="function_lead">Approve PO</button>
```

This isn't wired into the sidebar yet. It's the hook for gating tabs and features later.

## Dashboard

**Head (Matthew) has his own layout** (`renderHead`): written summary of the quarter (`COMMENTARY`) → summary cards → **By team** tiles (lead, main number, status; click to view as that lead) → **Escalations** (all urgent items and decisions, with a "With the teams" count for everything else) beside a compact Revenue & margin chart → full-width Work order SLA → **Client health** (top 5 of `CLIENT_HEALTH` by risk). **CS lead (Nalene) also has her own layout** (`renderCSLead`): summary cards → **Client portfolio** (all clients split into Key Accounts and General Accounts, sorted by risk, with September service figures, breaches, joiners/leavers, contract and service report status) → action list beside a **Contracts** timeline (next 6 months, plus procurement caps) → full-width **Joiners & leavers** for the next 2 weeks → **My team** (Key Accounts vs General Accounts side by side, with View as Thiva). No billing.

**CS members (Thiva)** get the same layout scoped to their client tier: *My clients* table, action list beside Contracts, then Joiners & leavers (same order as Nalene). Their Contracts list is the full renewal calendar for their clients, including terms ending beyond the 6-month track (listed only, no dot); leads see only items needing attention. No caps or My team.

**Procurement (Natasa, Yosefin) runs the orders** (`renderProcurement`): summary cards (orders, POs to place, late, partial deliveries, restock, caps) → action list (customs holds, backorders, joiners needing devices ordered, restock proposals, caps) beside **Waiting on vendors** (order pipeline by stage and the orders stuck with suppliers) → **Suppliers on my orders** (per hardware supplier: assigned jobs, late, partial, current lead time). Procurement opts out of the shared People and Integrations capabilities.

**Partnerships (Kirthinni) chooses vendors and tracks their performance over time** (`renderPartnerships`): summary cards (hardware, courier, repair and ITAD performance vs Q3, service gaps, contracts renewing) → **Country coverage** (world map coloured by whether each country has every service, plus a searchable table of countries with gaps or single-vendor risk, grouped by region) → action list (failing integrations, vendors missing targets, one item per country with a missing service, renewals) beside **Vendor contracts** → **Vendor performance** (hardware lead time against contracted range per country, then couriers, 3PLs, repair and ITAD partners with status).

The rule between them: anything about a single order goes to Procurement; anything about a vendor's performance or whether we use them goes to Partnerships.

**Control Tower (Vinh) runs order management** (`renderTower`): summary cards by order status (open, new, in progress, blocked, delivered awaiting sign-off, completed this week) → **Order fulfillment pipeline** (every service by stage: new, in progress, waiting on partner, waiting on client, delivered; plus at risk and breached) → action list (failing partner feeds, unmatched proofs, cross-partner blockers, pending partner invites) beside **Partner status updates** (syncing, manual or failing) → **Priority orders** (rush, start-date critical and exec work orders with milestone, who it's waiting on, owner and SLA).

**IT Services (Roehl, Jericho, Cassandra, Jerome) work the queue** (`renderIT`): summary cards on the live queue (unassigned, breached or at risk, open, repairs in flight, resolved this week, first response in target) → **Support queue** (tickets by board stage with average time in each, then the tickets that need a tech now) beside **Repairs in flight** (device, facility, when it's due back) → action list beside **Device work this week** (provisioning, dispatch, setup sign-off, collections). Karen and Justin don't get this layout.

**IT lead (Karen) gets analytics** (`renderITLead`): summary cards → **Support volume and speed** (13 weeks of tickets opened vs resolved, with average first response as a line) beside **SLA by service** (Q4 vs Q3 vs target per work order type) → **What tickets are about** (categories with change vs Q3) and **Team workload** (open support, repairs and onboarding per owner, including unassigned) → action list beside **Devices and onboarding** (laptop age with rotation due, onboardings per month with on-time %). Justin is team lead and also in Service Delivery, so he keeps the shared layout. Trend data is in `IT_TREND`, `IT_SLA`, `IT_CATEGORIES`, `IT_WORKLOAD`, `IT_FLEET` and `IT_ONBOARDING`.

Siti and Justin are hidden from the demo switcher (`viewAs: false` in `org-data.js`). They stay in the org chart, so their teams, counts and the head's team tiles are unchanged.

Two-column rows use `dash-grid-stretch`: pair panels of similar height, and both stretch to the taller one so there's no gap under either.

Everyone else gets the layout below.

Layout, top to bottom (each part only renders if the person qualifies):

| Part | Who sees it | Source screens |
|---|---|---|
| **Summary**: up to 6 cards from `CARDS`, picked by priority `p` across all the person's roles, with quarter comparisons and 13-week mini bars on volume cards | Gated per card | Various |
| **Country coverage**: world map (`assets/world-map.svg`) coloured per country: all services with 2+ vendors, single-vendor risk, 1 service missing, 2+ missing. Table below lists only countries needing sourcing by default (search and "Show all" for the rest), grouped by region. Click a country for its vendors per service and affected clients | `vendor_performance`, not head (Partnerships members) | Vendors, Warehouses, supply data, repair partners on work orders; one entry per country in `COUNTRY_COVERAGE`. Gap counts, the summary card and gap actions are all derived from it, so adding a country is one entry |
| **Work order SLA**: on track / at risk / breached, by type, most overdue | `sla` capability with no scope (head, CS lead, Control Tower) | Tracker · All by risk |
| **Needs your attention**: filterable action list | Everyone; items gated individually | Billing · Needs action, Restock, Receiving, Sync inbox, Repair quotes, Joiners/Leavers, Integrations… |
| **Revenue & margin**: unbilled, outstanding, storage fees (per currency), procurement caps | `billing` capability (Finance) and head | Ledger, Invoices, Storage fees, Procurement caps |
| ↳ SGD equivalents, device and repair margin | `finance_reporting` capability (Finance, head) | Client catalogues, Repair quotes |
| ↳ Full-width version with charts (monthly revenue by stream + margin line, owed to us, by currency, margin by stream) | Finance function members | Same, trends in `FINANCE_TRENDS` |
| **By area**: small stat cards | Gated per metric | Clients, Stock, Vendors, Tracker, People, Integrations |

Figures are hardcoded to match the tiles on the linked screens. If those screens' data changes, update `SLA`, `COMMERCIAL`, `CARDS`, `METRICS` and `ACTIONS` in `dashboard-widgets.js`. The prototype has no history, so quarter comparisons and averages (response, resolution, turnaround, lead time) are illustrative, kept in line with the targets in SLA configuration.

**Quarter comparisons:** rates and averages compare Q4 to date with Q3; running totals compare with the same days of Q3; current queues have no comparison. Colour follows whether the change is good, not its direction.

**SGD equivalents** are an internal reporting view: each currency is converted at the month-end rate (`FX_MONTH_END`) and added up. They never affect client billing, and the panel footnote says so. Everywhere else, money stays per currency.

Each metric, action or panel declares what it needs:

| Key | Meaning |
|---|---|
| `requires` | Capability needed |
| `minLevel` | Lowest level that sees it (default `member`) |
| `function` | Check the level within this function (use for approvals) |
| `when(user)` | Optional extra condition, e.g. only for scoped users, or hide if there are no matching records |
| `section` | Work-area label (Commercial, Clients, Operations, Vendors, IT, People, Integrations) |

Text fields can be functions of `user`, so scoped widgets show only what the person is allowed to see. Each widget appears once, however many teams grant access to it.

```js
{ section: 'operations', requires: 'stock', category: 'NEEDS_ATTENTION', title: '3 restock proposals to send', link: '/pages/stock/restock.html' }
{ section: 'commercial', function: 'customer_success', minLevel: 'function_lead', category: 'PENDING_APPROVAL', title: '2 open billing disputes', … }
```

## Demo switcher

The **Viewing as** button in the header lists everyone in the org chart except people marked `viewAs: false`, grouped by the function where they hold their highest position. Choosing someone stores their id in `localStorage` (`greenfield-demo-user`) and reloads the page. It only shows on `localhost`/`127.0.0.1`.

## Not done yet

- Gating the sidebar, tabs and page features by capability
- Filtering list pages (clients, vendors…) by scope
- Per-person overrides within a team (e.g. splitting clients between two Key Accounts members)
- A catalogue capability
- Reviewing the dashboard for each role other than Matthew
