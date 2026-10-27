# Screen Inventory

This document tracks all prototype screens in the Admin Portal.

## Screen Index

### Implemented Screens
#### Main
| Screen ID | Path | Description | Status |
|-----------|------|-------------|--------|
| `home` | `/index.html` | Central prototype directory | ✅ Complete |
| `dashboard` | `/pages/dashboard.html` | Main dashboard with stats and activity | ✅ Complete |
| `people-directory` | `/pages/people/directory.html` | People · Directory: all client employees (active, joining, leaving, left) from shared `people-data.js`; search, client / country / status filters, device icons, source (HRIS or added by client); rows open the person page | ✅ Complete |
| `people-person` | `/pages/people/person.html?id=` | Person: details (missing fields flagged), devices with status (Assigned / Loaner / In repair / Returning, since date), work orders (onboarding / offboarding), source note; "Open in Joiners / Leavers" banner while no work order exists | ✅ Complete |
| `people-joiners` | `/pages/people/joiners.html` | People · Joiners: intake queue ending at the onboarding work order (default filter Open). Editable package, completeness, start-date risk (stock in client hub vs fastest vendor + prep + buffer + last mile vs business days left); sorted incomplete → risk → start. Panel: details, package reason, risk breakdown per item with advice, missing fields inline + Request from client, Create work order. `?open=` opens a person | ✅ Complete |
| `people-leavers` | `/pages/people/leavers.html` | People · Leavers: intake queue ending at the offboarding work order (default Open). Departure Confirmed / Estimated, source, assets with outcome summary, retrieval method + date, access cutoff reminder. Panel: per-device outcome (Redeploy / Store / Dispose → hub or disposal partner), method (Return box / Courier collection / Office drop-off) with address + date, reminder toggle, Schedule retrieval | ✅ Complete |

#### Content
| Screen ID | Path | Description | Status |
|-----------|------|-------------|--------|
| `catalogue-list` | `/pages/catalogue/list.html` | Catalogue · Models tab: product model catalog with stock tracking (tabs Models \| Default markup adjustment) | ✅ Complete |
| `catalogue-markup` | `/pages/catalogue/markup.html` | Catalogue · Suggested adjustment: category × volume tier percentages for custom contracts; standard clients use retail. Negative adjustments to -100% permitted; client price floors at vendor cost. Click a cell → effective date and version history; country adjustments contribute to the suggestion | ✅ Complete |
| `model-overview` | `/pages/catalogue/model/overview.html` | Model · Overview tab | ✅ Complete |
| `model-country-listings` | `/pages/catalogue/model/country-listings.html` | Model · Country listings owns vendor SKU, vendor cost and our Retail price by country; vendor information panel, availability toggle; checkout estimate managed from vendor, warehouse, courier and calendar sources; no manual client selling-price override | ✅ Complete |
| `model-vendors` | `/pages/catalogue/model/vendors.html` | Model · Vendors tab: suppliers designated across country listings, countries supplied, listing count, vendor costs, stock and supplier lead times | ✅ Complete |
| `model-addons` | `/pages/catalogue/model/addons.html` | Model · Add-ons tab | ✅ Complete |
| `model-client-catalogues` | `/pages/catalogue/model/client-catalogues.html` | Model · Client catalogues: vendor cost, Retail price, optional contract adjustment and Contract price. Clients without a contract adjustment use Retail; custom prices are calculated from retail and floored at vendor cost, converted to billing entity currency. Catalogue defaults are suggestions, not automatic; offer toggle is separate from client-hidden/not-offered status | ✅ Complete |
| `model-inventory` | `/pages/catalogue/model/inventory.html` | Model · Inventory tab | ✅ Complete |
| `model-activity` | `/pages/catalogue/model/activity.html` | Model · Activity tab | ✅ Complete |
| `assets-list` | `/pages/assets/list.html` | Asset console with search, filter chips and asset table | ✅ Complete |
| `assets-detail` | `/pages/assets/detail.html` | Asset detail: overview, internal SLA, client rules, timeline, documents, paired device | ✅ Complete |
| `stock-clients` | `/pages/stock/list.html` | Stock · Clients (landing): one row per client with countries, in stock / reserved / available, hub vs site split, storage per month and Needs attention (below threshold, restock awaiting client, stored 90+ days); search, country filter | ✅ Complete |
| `stock-warehouses` | `/pages/stock/warehouses.html` | Stock · Warehouses: warehouse list with in-stock, reserved and available totals; expand a warehouse for quantities grouped by client and model; warehouse and held-unit links open this view focused on the selected warehouse | ✅ Complete |
| `stock-client` | `/pages/stock/client.html?c=` | Stock › Client: tiles (in stock, available, where, storage), grouped by country with threshold chips (edit / add, restock state), lines with new/used + incoming PO, expandable devices (condition, grade, days stored, fee, suggested Keep / Redeploy / Dispose with request links); threshold + restock panel | ✅ Complete |
| `stock-restock` | `/pages/stock/restock.html` | Stock · Restock queue: one proposal per threshold below minimum; status filter (To send / Awaiting client / Approved / Declined-dismissed / All), client + country filters, Review panel to send to client or dismiss | ✅ Complete |
| `stock-receiving` | `/pages/stock/receiving.html` | Stock · Receiving: scan / type serial, queue To inspect / Expected / Received (+ hub filter); intake panel with condition, grade A–D, notes, photos (min 2); receiving completes the work order step, posts the retrieval charge for that device (paying entity, FX) and starts storage billing | ✅ Complete |
| `stock-fees` | `/pages/stock/fees.html` | Stock · Storage fees: cross-client report per client × hub (devices billed, avg days, 90+ days, rate / day = hub country's local fee converted to the paying entity's currency with the local fee and FX rate shown, fee / month, accrued, suggested); client / hub / aged filters, CSV export, rows open the client page | ✅ Complete |

Orders pages share `scripts/orders-data.js` (config, price book, templates, seeds) → `orders-engine.js` (stage timing in business hours of the order country from `calendar-data.js` and SLA configuration, status, pricing, actions, audit, session persistence, billing on Delivered) → `orders-ui.js` (header actions, filters, export, digest, templates, dialogs) → `order-detail.js`. Styles in `styles/orders.css`.

All Stock pages render from `scripts/hub-data.js` + `scripts/billing-data.js` (storage rates from contracts) + `scripts/stock-data.js`; the threshold/restock panel is `scripts/stock-threshold-panel.js` (markup in `templates/threshold-panel.html`, inlined in client + restock pages).

#### Orders
Every Orders page shares one header: title **Orders**, **New order** (primary), **More** menu (Export CSV, Daily digest), and tabs **Board · List · Insights · Templates** (open count on Board/List, template count). Breadcrumb starts at Orders.

| Screen ID | Path | Description | Status |
|-----------|------|-------------|--------|
| `orders-board` | `/pages/orders/board.html?status=&client=&open=` | Board: six tiles that are also the status filter (Open, Overdue, At risk, Awaiting approval, Payment hold, Delivered · 7 days; click again to clear), shared filter bar (search, status, priority, client, vendor, country), columns per stage plus Pending approval · Payment hold and SLA paused lanes; quick-done, bulk mark done; card opens a drawer with quick actions and **Open order** | ✅ Complete |
| `orders-list` | `/pages/orders/list.html?id=` | List: same tiles and filters as Board; list sorted overdue → pending → hold → by SLA used; selected order shows on the right (no tabs); selection kept in the URL, first order auto-selected, ↑ ↓ moves through the list; order ID links to the full page | ✅ Complete |
| `orders-insights` | `/pages/orders/insights.html` | Insights: own controls (7 / 30 / 90 days, client); KPIs with change vs previous period, status mix, weekly SLA compliance, stage bottlenecks, monthly revenue (SGD), week on week, vendor performance, top clients | ✅ Complete |
| `orders-templates` | `/pages/orders/templates.html` | Templates: search; template, items, units, type/priority, orders created from it; **Use** opens New order prefilled; ⋯ menu Rename, Duplicate, Delete | ✅ Complete |
| `orders-order` | `/pages/orders/order.html?id=` | Order: header with status, priority and SLA pills, one primary next-step button (Approve / Release hold / Resume SLA / Mark *stage* done; on Shipping info it points to the tracking field until one is entered), Pause SLA, **More** (Edit order, Save as template, Payment hold, Reject, Cancel). Banners explain blocks (cancelled, pending approval, payment hold, paused, blocker). Progress bar; stage timeline (done / edit time / skip / undo, AWB at Shipping info, notes per stage). Tabs below: **Items & pricing** (local / SGD / USD), **Shipments** (route, deliver to, expected, tracking), **Activity** (notes and changes, filterable). Sidebar: Details (incl. owner picker), Value (revenue, cost, margin), Business hours. Stacks to one column under 1280px | ✅ Complete |
| `orders-new` | `/pages/orders/new.html?template=&client=` | New order: client, country, billing entity (sets currency), type, priority, owner; recipient from People or free text, route (via hub / client site / employee), address; vendor with lead time, PO; items priced from the client's contract (retail or contract % on cost, floored at cost), extra fees, shipping; summary with tax, margin, procurement cap before / after (over cap requires client approval) and SLA-based delivery estimate; Load / Save template; creates the order at Submitted to vendor | ✅ Complete |

#### Services
Sidebar **Tracker** section: Needs attention · Orders · Services · Support. Every Services board shares one header (`scripts/services-tabs.js`): title **Services**, **Sync inbox**, **New request** (preset to the current service type where it applies) and tabs Onboarding · Offboarding · Repairs · Redeployments · Storage · Disposal. Detail pages use Services › *service* › *ID* breadcrumbs.
| Screen ID | Path | Description | Status |
|-----------|------|-------------|--------|
| `attention-queue` | `/pages/attention/queue.html` | (Tracker) Needs attention: one live queue across Orders, Services and Support. Includes items that are breached, at risk, blocked or (tickets) unassigned. Kind tabs (All · Orders · Services · Support with counts), tiles that filter (Needs attention, Breached, At risk, Blocked, Unassigned, Mine), client / country / owner filters (kept for the session). Rows sorted breached first, then by share of stage used; click opens the order, request or ticket | ✅ Complete |
| `services-onboarding` | `/pages/services/onboarding.html` | Services · Onboarding board: columns are the Onboarding SLA milestones (hub-only steps skipped for direct routes, route tag on cards) (Initiated → Procured → Imaged / Provisioned → Dispatched → Delivered → Setup confirmed); employee, start date, flag, package tag, SLA health, blocked and start-date-soon flags; cards open the detail page | ✅ Complete |
| `services-onboarding-detail` | `/pages/services/onboarding-detail.html?id=ONB-1186` | Onboarding request: milestone stepper, blocked / start-soon alerts, details, package devices with per-line hub arrival and ETA, kit dispatch (ship complete or split, Ship what's ready override), SLA milestones card, owner, handover notes | ✅ Complete |
| `services-offboarding` | `/pages/services/offboarding.html` | Services · Offboarding board (7 stages, SLA, blocked, ITSM chips) | ✅ Complete |
| `services-offboarding-detail` | `/pages/services/offboarding-detail.html` | Offboarding request (OFF-2055): stage stepper, blocker, devices, timeline, SLA milestones card (target vs actual) | ✅ Complete |
| `services-repairs` | `/pages/services/repairs.html` | Services · Repairs board (default view): 5 repair stages, alerts, blocked | ✅ Complete |
| `services-repairs-list` | `/pages/services/repairs-list.html` | Services · Repairs list view: table with SLA, tracking and alerts | ✅ Complete |
| `services-repair-quotes` | `/pages/services/repair-quotes.html` | Services › Repairs · Quotes view (Board \| List \| Quotes): Needs action / Awaiting client / Decided / All + client filter; findings, quote total, sent + days waiting, decision, status; rows open the work order quote | ✅ Complete |
| `services-work-order` | `/pages/services/work-order.html?wo=` | Work order (REP-0871 by default; `?wo=` for ONB / DSP / REP orders): details, timeline, SLA milestones card (target vs actual), assignees. Billing card: billable step, fee in the work country's currency, paying entity and why, converted charge with FX rate, source and lock; charges posted (reversed, credited, anomaly, duplicates blocked); active dispute badge/link or Raise dispute for an eligible invoiced charge; Mark step, Correct step | ✅ Complete |
| `services-work-order` (quote) | `/pages/services/work-order.html?id=REP-…#quote` | Repair work order gains a Repair quote card: diagnostic findings + uploads, client quote lines + contract repair handling fee, replace / write-off alternatives, staff-only vendor cost evidence (vendor quote, cost, margin), send to client admin (requires vendor quote), reminder, client decision (repair / replace / write off) with who, when, IP, and audit trail | ✅ Complete |
| `services-redeployments` | `/pages/services/redeployments.html` | Services · Redeployments board: Collection (step) → Refurbish → Repackage → Dispatched, raised-by tag | ✅ Complete |
| `services-storage` | `/pages/services/storage.html` | Services · Storage board: Collection → Received at hub → Stored | ✅ Complete |
| `services-disposal` | `/pages/services/disposal.html` | Services · Disposal board: Collection → Data wipe → Disposed & certificate; DSP-0209 opens its work order to issue the certificate (posts the disposal charge) | ✅ Complete |
| `services-new` | `/pages/services/new.html` | New service request on a client's behalf: Redeployment, Storage or Disposal; destination from assigned hub; collection is a step when the device isn't in a hub | ✅ Complete |
| `services-sync-inbox` | `/pages/services/sync-inbox.html` | Services › Sync inbox (button in the Services header): courier proof of delivery and return receipts; tiles; Needs action / Matched / Ignored / All, type and source filters; panel with document, suggested match, pick work order → Match and complete step (posts one charge per device; a return receipt marks devices arrived and retrieval is charged at intake), or Ignore. Matched: charges with entity and FX basis, Unmatch with reason (reopens the step; reversal if unbilled, draft credit note if invoiced) | ✅ Complete |

#### Support
Shared header (`scripts/support-ui.js`): title **Support**, **New ticket**, tabs Board · List. Tickets live in `scripts/support-data.js` (session-persisted). SLA: first response then resolution, targets from SLA configuration (client exception, else country standard), Urgent halves them, Low doubles them; Waiting on client pauses resolution.

| Screen ID | Path | Description | Status |
|-----------|------|-------------|--------|
| `support-board` | `/pages/support/board.html?status=&client=&owner=` | Board: tiles that filter (Open, Breached, At risk, Unassigned, Waiting on client, Resolved today), filters (search, status, priority, client, owner, category), columns Submitted · Triage · In progress · Waiting on client (+ Resolved when filtered); cards show both SLA clocks | ✅ Complete |
| `support-list` | `/pages/support/list.html` | List: same tiles and filters; table sorted by SLA risk with status, owner, live clock and last update | ✅ Complete |
| `support-ticket` | `/pages/support/ticket.html?id=` | Ticket: one primary action (Assign to me / Resolve / Client replied · resume / Reopen) plus Waiting on client; status stepper; conversation with reply or internal note, "Send and wait on client", first reply stops the response clock; sidebar SLA clocks with targets, Details (owner, priority, category editable; requester, device link, client admin), links to raise a service request or order, Activity log | ✅ Complete |
| `support-new` | `/pages/support/new.html?client=` | New ticket: client, country, requester from People (auto-fills name and email) or typed, subject, description, priority, category, received via, external reference, owner; live SLA targets for the ticket | ✅ Complete |

#### Vendors and reports
| Screen ID | Path | Description | Status |
|-----------|------|-------------|--------|
| `vendors-list` | `/pages/vendors/list.html` | Vendors list (incl. hardware suppliers) with type, access method, integration status; suppliers open the supplier page | ✅ Complete |
| `vendors-supplier` | `/pages/vendors/supplier.html?v=vendorA` | Hardware supplier: editable lead time per country (feeds checkout estimates and order expected dates), 30-day actual, open orders with this vendor per country | ✅ Complete |
| `vendors-detail` | `/pages/vendors/detail.html` | Vendor (Courier X) · Overview tab with editable last-mile delivery times | ✅ Complete |
| `vendors-access` | `/pages/vendors/access.html` | Vendor (Courier X) · Access tab: access method, portal users, invite panel, integration | ✅ Complete |
| `service-reports` | `/pages/reports/service-reports.html` | Service reports: monthly client reports with status, SLA compliance, generate drafts for September | ✅ Complete |
| `service-report-editor` | `/pages/reports/report-editor.html` | Report editor (Acme Tech · Sep 2026): preview with charts, section toggles, commentary, save/export/issue | ✅ Complete |

#### Commercial
| Screen ID | Path | Description | Status |
|-----------|------|-------------|--------|
| `clients-list` | `/pages/clients/list.html` | (Commercial) Clients, tabs Clients \| Procurement caps. Clients tab: **New client** button; tiles by contract status (incl. Onboarding = first contract not yet accepted), search (client or entity), plan / status / currency filters; plan tier, current version (+ pending), effective date and term end, status, invoice currency (+ settlement), billing entities | ✅ Complete |
| `clients-new` | `/pages/clients/new.html` | New client: six steps (Company · Countries and hubs · Billing entities · Pricing and fees · Billing setup · Review) with a live contract summary. Company: name, logo initials, plan tier (label only), start and term length (12/24/36 months or custom end), client admin and email. Countries: tick countries, pick an Esevel hub or "No hub" per country. Entities: parent + subsidiaries with country, tax ID, contact, invoice currency, settlement currencies, tax status, importer of record. Pricing: retail adjustments by category/tier (suggested default prefilled), lifecycle fee exceptions and switched-off events against the Settings standard, billable users with a rate per entity. Billing: FX source and lock, invoice splitting, procurement cap. Review lists all v1 terms; **Save as draft** (edit on the client page) or **Send for acceptance**. Creates the client, hub assignments and contract v1; persists for the browser session | ✅ Complete |
| `clients-detail` | `/pages/clients/detail.html?c=&v=` | Client (contract): version selector + history; tabs Overview, Billing (entities, FX, fees, routing, invoice splitting), Pricing (device pricing with client percentage adjustments to vendor retail by category/tier; contract exception replaces Catalogue default; discounts and rate overrides), Billable users, Disputes, Operations (procurement cap). Deep-linking to sections preserved (#sec-pricing). Contract edits use draft → publish → client acceptance. Onboarding clients: v1 draft is edited here directly (no comparison), with Delete client; once sent it is locked | ✅ Complete |
| `clients-amendment` | `/pages/clients/amendment.html?c=&v=` | Amendment: current vs proposed terms side by side grouped by section, changes highlighted (only-changes toggle); Publish card (effective date, note) locks terms; Withdraw; Client acceptance card (who, when, IP, version) or waiting state; "Simulate client acceptance" (prototype) makes the version active. For a new client the page shows the Initial contract v1: full terms, Send for acceptance (effective date defaults to the start), Withdraw returns it to draft, acceptance makes the client Active. Contract edits persist for the browser session | ✅ Complete |
| `billing-ledger` | `/pages/billing/ledger.html?entry=&reduce=` | (Commercial) Billing tabs shared with Invoices, Credit notes and Needs action. Ledger: append-only accrued charges. Tiles: unbilled per currency, events, anomalies, pending reversals. Unbilled / Needs attention / Invoiced / All + client, event, currency filters. Panel shows pricing basis, entity, FX, source and draft invoice; dispute status links to Needs action, while eligible invoiced charges can start a dispute here. Reduce a charge: Our error, immediate Goodwill, or Client disputes it | ✅ Complete |
| `billing-invoices` | `/pages/billing/invoices.html?tab=` | (Commercial) Shared Billing tabs. Invoices: outstanding by currency, overdue, drafts, open disputes; search and client / entity / status / issued / currency filters; invoice detail link. Credit notes: source, against, reason, amount, issued, applied to, status; approve draft credit notes raised for corrections | ✅ Complete |
| `billing-invoice` | `/pages/billing/invoice.html?id=` | Invoice detail with shared Billing tabs; lifecycle Draft → Issued → Paid (Overdue / Cancelled), lines with PO, cost centre, dispute status link and Raise dispute action for eligible invoiced charges, Source link, totals, bill-to entity, payments and activity. Issuing marks ledger entries invoiced; cancelling returns them to unbilled | ✅ Complete |
| `billing-needs-action` | `/pages/billing/needs-action.html?id=&entry=` | (Commercial) Shared Billing tabs. Unified queue: open disputes, draft credit notes, ledger anomalies and requested reversals; filter by type and client. Disputes open the investigation panel (reason, invoice line, internal notes, resolution and credit); draft credit notes can be issued in place; anomalies can be marked checked and added to the draft; requested reversals can be approved or rejected in place. Counts shown on each Billing tab; sidebar contains one Billing link | ✅ Complete |
| `clients-caps` | `/pages/clients/caps.html?set=` | (Commercial) Clients › Procurement caps tab: tiles count clients by status (over, near, healthy, renewing), never sum money; All / Over / Near / Healthy + currency filters; cap, spend to date, remaining, utilisation bar (80% marker) and %, renewal, status; expandable row shows spend per billing entity in its currency, the rate and the amount counted in the cap currency, plus recent orders by entity. Set cap panel (limit, currency, renewal period, next renewal) saves to a contract draft, blocked while an amendment is pending; opens from a row, `?set=`, or the client page. Restock proposals show cap remaining after the order, converting the quote into the cap currency | ✅ Complete |

Commercial pages share `scripts/billing-data.js` (contracts, currency helpers, caps), `contract-terms.js` (term fields and diffs), `ledger-data.js` → `invoice-data.js` → `dispute-data.js`. Amounts always carry a currency code and are never added across currencies.

#### Settings
| Screen ID | Path | Description | Status |
|-----------|------|-------------|--------|
| `warehouses-list` | `/pages/warehouses/list.html` | (Settings) Warehouses list with clients assigned per hub, row menu and Edit/Add warehouse side panel incl. hub dispatch buffer and "Stock held here" (client × model, links to client stock page, storage per month). Tabs Warehouses \| Hub assignments | ✅ Complete |
| `warehouses-assignments` | `/pages/warehouses/assignments.html` | (Settings) Warehouses · Hub assignments: client × country hub matrix (moved from Clients) | ✅ Complete |
| `sla-config-standard` | `/pages/sla-config/standard.html` | SLA configuration · Standard SLAs: one country at a time, a card per SLA type with milestones as a timeline (order types Regular / Rush / Bulk / Pre-order use the order stages in business hours: Submitted to vendor → Confirmed by vendor → Payment confirmed → Shipping info → Received at hub → QC & dispatch → Out for delivery → Delivered; hub steps only via a hub) (dashed = skipped when shipped direct, dotted = only with collection, Vendor delivery from vendor + grace), single end-to-end, clients on standard / exceptions count, Edit panel with copy-to-countries | ✅ Complete |
| `sla-config-exceptions` | `/pages/sla-config/exceptions.html` | SLA configuration · Client exceptions: one row per client × type × country showing only what differs (strikethrough standard), vendor-conflict banner, filters, Add / Edit / Remove panel that saves a new contract version | ✅ Complete |
| `holiday-calendars` | `/pages/holidays/calendars.html` | Operating calendar: country list, month calendar/list, operating schedule, order cut-off, delay notices, Add closure dialog (country / region / hub) | ✅ Complete |
| `integrations-list` | `/pages/integrations/list.html` | Integrations: health tiles, HRIS/IdP and ITSM/ITAM connections, employee drift | ✅ Complete |
| `integrations-detail` | `/pages/integrations/detail.html` | Integration detail (TechGlobal · Workday): sync health, error queue, field mapping (Workday source → Esevel field dropdown, Required tag, Mapped / Unmapped / Needs review, Discard / Save mapping with required + duplicate checks), Preview card of one sample record | ✅ Complete |
| `settings-billing` | `/pages/settings/billing.html?tab=` | (Settings) Billing defaults: Standard fees (events × countries in local currency, "Charged when" milestone per event, per-country versioned edit panel with effective date, reason, impact and history), Tax and duties (country / US state, type, rate, effective, duties note; versioned; importer of record lives on billing entities), FX (sources, clients using each, rates per 1 USD). Clients store only exceptions | ✅ Complete |
| `role-access` | `/pages/settings/access-control.html` | Role permissions by module; manage users, assign multiple roles, search and preview access. Includes Head of Operations, CEO Super Admin, and member/manager roles for each function | ✅ Complete |

Model tab pages share `/templates/model-header.html` (breadcrumbs, title, actions, tab links). Set `data-active-tab` on `#model-header-container` to highlight the current tab.

### Planned Screens

| Screen ID | Path | Description | Status |
|-----------|------|-------------|--------|
| `settings` | `/pages/settings/index.html` | Configuration (sidebar link is a placeholder) | 🔲 Planned |
| `cap-alerts` | — | Cap alerts and checkout warnings (BIL-23) | 🔲 Planned |

## Navigation Map

```
Home (/)
├── Dashboard (/pages/dashboard.html)
├── People
│   ├── Directory (/pages/people/directory.html) → Person (/pages/people/person.html?id=)
│   ├── Joiners (/pages/people/joiners.html)
│   └── Leavers (/pages/people/leavers.html)
├── Catalogue (Models | Default markup)
│   ├── List (/pages/catalogue/list.html) · Default markup (/pages/catalogue/markup.html)
│   └── Model (/pages/catalogue/model/*.html)
│       ├── Overview · Country listings · Vendors · Add-ons
│       └── Client catalogues · Inventory · Activity
├── Assets (/pages/assets/list.html) → Detail
├── Stock: Clients · Warehouses → Client · Restock queue · Receiving · Storage fees
├── Tracker
│   ├── Needs attention (/pages/attention/queue.html)
│   ├── Orders (Board | List | Insights | Templates → Order, New order)
│   ├── Services (Onboarding | Offboarding | Repairs | Redeployments | Storage | Disposal → detail pages, work-order.html?wo=, New request, Sync inbox)
│   └── Support (Board | List → Ticket, New ticket)
├── Vendors → Supplier · Courier (Overview | Access)
├── Service reports → Report editor
├── Commercial
│   ├── Clients (Clients | Procurement caps) → Client (detail.html?c=, incl. Billable users) → Amendment (amendment.html?c=&v=)
│   └── Billing (Ledger | Invoices | Credit notes | Needs action) → Invoice detail
├── Settings
│   ├── Billing (Standard fees | Tax and duties | FX)
│   ├── Warehouses (Warehouses | Hub assignments)
│   ├── SLA configuration (Standard | Client exceptions)
│   ├── Operating calendar
│   └── Integrations → Detail (sync health, field mapping)
```

## Component Usage

### Dashboard
- Stats cards
- Tabs (Recent Activity, Trends, Alerts)
- Data table
- Modal (Create New User)

### Catalogue
- Dense table with sticky header
- Checkbox selection (individual and select-all)
- Product thumbnails with gradient placeholders
- Warning indicators with tooltips (low stock, missing price)
- Stock values with hover tooltips (Esevel-owned vs Client-owned)
- Multiple filter dropdowns (Brand, Category, Status, Country)
- Saved views dropdown
- Column visibility toggle
- Bulk action bar (appears when rows selected)
- Pagination

### Catalogue Edit
**Common elements:**
- Custom breadcrumbs (Catalogue › Model name)
- Header with status pill, Save/Publish buttons, and overflow menu
- Tab strip with counts (Overview, Country listings (5), Add-ons (4), etc.)

**Overview tab:**
- Two-column layout (form + sidebar)
- Form fields: Model name, Brand, Category, Family (with suggestions), End-of-life date, Status (segmented control)
- Image upload card with product thumbnail
- Summary card (read-only stats)

**Country listings tab:**
- Toolbar describes vendor-sourced prices and offers an "Add listing" button
- Country table shows vendor SKU, vendor, cost, vendor retail and retail spread; availability toggle
- Side panel (480px) for pricing and supply details
- Panel shows vendor cost, vendor retail, stock/source freshness and checkout estimate; no manual client selling-price override

**Add-ons tab:**
- Toolbar with description and "Add add-on" button
- Simple table with 4 rows
- Add-on types: Warranty, Insurance, MDM, Bundle
- Columns: Name, Type tag, Price, Status toggle, Overflow menu

**Client catalogues tab:**
- Toolbar with description, search, filter dropdown, "Add client" button
- Info line about offering controls
- Table with client pricing per country
- Client logos, country flags, billing entities
- Country listings show vendor cost and vendor retail; Client catalogues calculate the contract price from vendor retail and percentage adjustment, with a vendor-cost floor
- Difference percentages (discounts in green)
- Client status badges (Visible/Hidden by client)
- "Manage" links

**Inventory tab:**
- Toolbar with "Read-only" tag and "Open in Stock" button
- Three summary tiles (Esevel-owned, Client-owned, Reserved)
- Segmented control filter (All/Esevel-owned/Client-owned)
- Table grouped by country
- Ownership tags, condition grades, stock levels
- Status badges (In stock, Low stock, Out of stock)
- Incoming stock with expected dates

**Activity tab:**
- Toolbar with filter dropdown and "Export" button
- Activity feed grouped by date (Today, Yesterday, Earlier)
- User avatars and system icons
- Activity entries with timestamps and category tags
- Old values struck through, new values inline
- "Load more" button

## Adding New Screens

When creating a new screen:

1. Add entry to this inventory
2. Create HTML file in appropriate `/pages/` subdirectory
3. Use the standard page template structure
4. Include navigation.js, components.js, and main.js
5. Update sidebar navigation in `/templates/sidebar.html` if needed
6. Test navigation from existing screens
