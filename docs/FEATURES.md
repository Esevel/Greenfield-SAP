# Features and workflow guide

This is the narrative guide to what the Greenfield Admin Portal prototype demonstrates and how its flows fit together. It is being written in increments so that each workflow can be checked against the running implementation. For a route-by-route catalogue of screens, see [SCREENS.md](./SCREENS.md); for implementation conventions, see [AGENTS.md](./AGENTS.md).

## Documentation progress

| Increment | Coverage | Status |
|---|---|---|
| 1. Orientation and shared flows | Runtime, sign-in, application shell, role/access model, and feature map | Complete |
| 2. People and service lifecycle | Directory, joiners, leavers, seats, onboarding, offboarding, and service work orders | Complete |
| 3. Operations and support | Needs attention, orders and quotations, support, repairs, and operational coordination | Complete |
| 4. Catalogue and supply | Catalogue, assets, stock, receiving, restocking, vendors, and warehouses | Complete |
| 5. Clients and commercial | Client setup, subscriptions/caps, billing, invoices, ledger, fees, and reports | Complete |
| 6. Administration and platform | SLA, operating calendars, integrations, access control, and remaining settings | Complete |

All six planned increments are complete. The workflow descriptions distinguish implemented browser interactions from seeded data and simulated operations; they do not imply server-backed production behavior.

## 1. Runtime and entry points

The app is a multi-page website rather than a single-page application. Each screen is an HTML file served at its own path. Vite provides the local development server and builds the project’s HTML pages as separate entry points. The Vite configuration also injects the shared authentication and role-access scripts into HTML pages, and emits the classic JavaScript files and SVG assets that are loaded dynamically.

Start the prototype with:

```bash
npm install
npm run dev
```

The configured development port is `3000`. The prototype’s central directory is [`index.html`](../index.html); sign-in is at [`login.html`](../login.html); the role-aware workspace begins at [`pages/dashboard.html`](../pages/dashboard.html). Because this is a multi-page app, navigation loads another HTML route rather than replacing a view inside one client-side router.

## 2. Sign-in and session flow

The sign-in screen accepts the seeded demo account `demo@esevel.site`. The browser-side flow in `scripts/auth.js` is:

1. A visitor opening a protected page without the expected demo session is redirected to `/login.html`.
2. The original path, query string, and fragment are encoded in the `next` query parameter.
3. On submit, the page checks that both fields are present, hashes the entered password with the Web Crypto SHA-256 API, and compares the email and digest with values embedded in the script.
4. A match stores the demo email and sign-in timestamp in `localStorage`, then redirects to the requested internal path. External or protocol-relative `next` values are rejected in favor of `/`.
5. Sign out removes that browser-side session and returns to the sign-in page.

This demonstrates a sign-in journey only. Credentials and the comparison logic are delivered to the browser, and browser storage can be edited by its user. It is not real authentication, does not verify a server-side identity, and must not be used to protect data.

## 3. Shared application shell and navigation

Most workspace screens use the shared templates in `templates/`:

- `templates/sidebar.html` supplies the grouped Main, Tracker, Content, Commercial, and Settings navigation.
- `templates/header.html` supplies breadcrumbs, a visual search field, the demo “Viewing as” control, and the user menu/sign-out action.
- `templates/model-header.html` supplies tabs for catalogue model pages when a page includes the model-header container.

`scripts/navigation.js` fetches the shared markup into each page’s template containers. Once it is present, the script applies role visibility, highlights the active page or section, builds breadcrumbs from the URL (unless the page provides custom breadcrumbs), and initializes dropdown behavior. A model page can provide its active tab through the model-header container’s `data-active-tab` attribute.

The visual search field is part of the shared header, but the presence of the field alone does not imply a globally backed search service. Most page-to-page navigation uses absolute paths rooted at `/`, so links work from nested routes.

## 4. Role, capability, and page-access flow

The prototype has two related access layers:

### Org-derived capabilities and scope

`scripts/org-data.js` describes people, functions, teams, capabilities, and optional record scopes. `scripts/roles.js` resolves those positions into effective capabilities and levels (member, team lead, function lead, head, or super admin). Multiple positions can add capabilities. Team scopes, such as a client tier, can limit which records a user sees. Shared capabilities support cross-functional work, with opt-outs for selected teams.

The demo “Viewing as” menu is generated from this org model. Selecting a person stores the selected ID in browser storage and reloads the page. Some dashboard cards, panels, and record-level experiences use the resolved capabilities and scope to show different content.

### Configured module grants

`scripts/role-access.js` separately defines application modules, roles, seeded users, and role-to-module grants. A user’s effective modules are the union of grants for their assigned roles. The access-control screen can demonstrate changes to users, roles, and module grants; this configuration is stored in `localStorage`.

When a page loads, module grants are used to hide unavailable sidebar/index links and to block a directly opened route with an access-restricted notice. Helper checks are also available for edit access and lifecycle-creation actions. The role/access model is client-side presentation logic; it does not enforce authorization on a server.

These layers serve different purposes: org-derived capabilities describe team responsibilities, scope, and role-aware content; module grants gate application areas. The shared demo user selection connects the “Viewing as” switcher with the access-control view, but the resulting behavior remains prototype-only.

For concrete examples of who sees which dashboard information, see [ROLE-EXAMPLES.md](./ROLE-EXAMPLES.md). For the role model and public helper surface, see [ROLES.md](./ROLES.md).

## 5. Feature-area map

The current navigation and screen inventory show these main areas. The list below is an orientation map, not a complete explanation of every state transition; those details are being added in the increments above.

| Area | Demonstrated purpose | Primary screens |
|---|---|---|
| Dashboard | Role-aware operational and business overview | `pages/dashboard.html` |
| People | Client employee directory and joiner/leaver lifecycle queues | `pages/people/` |
| Needs attention | Cross-area queue for work needing action | `pages/attention/queue.html` |
| Orders and quotations | Order pipeline, creation, templates, insights, and quotations | `pages/orders/` |
| Services | Onboarding, offboarding, repairs, disposal, redeployment, storage, and work orders | `pages/services/` |
| Support | Ticket queues, board, ticket creation, and ticket detail | `pages/support/` |
| Catalogue | Product models, country listings, vendors, inventory, add-ons, client catalogues, and markup | `pages/catalogue/` |
| Assets | Cross-client asset search and device detail, including MDM state | `pages/assets/` |
| Stock | Client stock, warehouses, restock proposals, receiving, and storage fees | `pages/stock/` |
| Vendors | Vendor directory, supplier records, performance, and access | `pages/vendors/` |
| Clients | Client directory, details, setup, amendments, caps, and related configuration | `pages/clients/` |
| Billing and fees | Invoices, ledger, items requiring action, and billing settings | `pages/billing/`, `pages/settings/billing.html` |
| Service reports | Service report listing and report editing | `pages/reports/` |
| Warehouses | Warehouse directory and client/warehouse assignments | `pages/warehouses/` |
| SLA and operating calendar | Standard SLA configuration, exceptions, command centre, and holidays | `pages/sla/`, `pages/sla-config/`, `pages/holidays/` |
| Integrations | Integration directory and integration detail/mapping | `pages/integrations/` |
| Role access | User, role, and module access administration | `pages/settings/access-control.html` |

The exact routes, screen-specific descriptions, and implementation status are maintained in [SCREENS.md](./SCREENS.md).

## 6. People and service lifecycle

The lifecycle joins a client employee record to a device package, then hands fulfilment to a service work order. The shared People dataset is used by the directory, person detail, joiners, and leavers screens. People can be sourced from an HRIS or entered by the client. The seed includes examples in `active`, `joining`, `leaving`, and `left` states. Queue records are intake work: when a work order is created, the People queue stops owning fulfilment and the Services tracker is intended to own it.

### Directory and person record

The Directory at `/pages/people/directory.html` searches name, email, role, department, client, and country; filters by client, country, lifecycle state, and management status; and paginates results. Selecting a row opens `/pages/people/person.html?id=<person-id>`.

The person page consolidates contact and employment details, source, assigned devices, current state, and linked work orders. It shows a plan seat and device allowance for seat-plan clients. If an onboarding or offboarding request has not yet been converted to a work order, the person page provides a direct link back to the corresponding queue with that person preselected. For HRIS-sourced records, the UI explains that HRIS sync overwrites fields; the prototype directs users to correct the source in the HRIS, while missing intake information may be completed in the queue.

The Managed/Unmanaged indicator describes whether the client plan supports user management and whether that person opted out; it is not the employee’s lifecycle state. Device links open the asset detail route.

### Joiner intake → onboarding work

The Joiners queue (`/pages/people/joiners.html`) is for new hires before fulfilment. It defaults to open work and can be filtered by search, client, country, information completeness, and status. Rows sort by incomplete records first, then start-date risk, then start date. Selecting a row opens its side panel.

The intake flow is:

1. **Review incoming employee data.** The panel shows contact details, role, department, start date, package, and status. A record may originate from an HRIS sync or client entry.
2. **Choose a package.** A role-keyword rule recommends one of the seeded device packages. The package can be changed before work-order creation. The recommendation is advisory; the user can choose another package.
3. **Check fulfilment risk.** For each package item, the prototype checks available stock assigned to the client at its country warehouse. If available, the estimated need includes preparation, warehouse buffer, and last-mile time. Otherwise it uses the fastest seeded vendor route and adds warehouse/preparation/last-mile time where relevant. These ranges are compared with remaining weekdays until the start date to label the request On track, Tight, or At risk; the intake estimate does not account for public holidays. This risk indicator is advisory and does not itself disable creation.
4. **Complete missing contact details.** Phone and delivery address are checked. The user can save one or both fields; if all required fields are present the intake status becomes Ready. “Request from client” and “Send reminder” update the local requested/status state and show a confirmation message; they do not send a real message. Saving a partial response leaves the record incomplete.
5. **Resolve seat and device allowance, when applicable.** See “Seats and subscription orders” below. Requests for clients without a seat plan do not get this gate.
6. **Create the onboarding work order.** The action is enabled only when the required fields are complete and any seat/device gate is clear. A package within the gate can be created even if the risk label is Tight or At risk. Creation assigns a generated `ONB-` reference, marks the intake `created`, and locks its package/details in the queue. The row then directs the user to Services › Onboarding.

The queue panel can also be opened directly using `?open=<person-id>`, which supports returning from a person page. The People tab count includes intake records whose queue status is not `created`.

### Seats and subscription orders

Seat logic applies to configured seat-plan clients, not every client. The ledger in `scripts/seats-data.js` represents contracted seats as **active**, **available**, or **used**. Active seats are held by current, joining, or leaving people. A seat can be reassigned once after its first holder leaves; after its second use and release it is Used for the remainder of the term. Renewal clears used seats and starts the continuing holders as first uses in the new term.

A joiner takes an available seat when the people/seat data are synchronized. If no seat is available, the intake remains blocked while a one-off seat order awaits a simulated client-admin decision. An approval adds a seat to the subscription, assigns it to the person, and records the quoted order price. Rejection leaves the joiner blocked; the queue offers an order-again action. For Free plans, additional seats/devices can be added without charge, subject to the subscription’s status. Expired or restricted subscriptions can prevent new seat additions.

Each seat includes the device allowance defined by the plan. The package determines how many devices are needed; a package change causes the allowance to be checked again. When a seat exists but the package exceeds its allowance, an extra-device order can be requested and approved or retried separately. Until the allowance covers the package, onboarding cannot be created. Leaving people keep their seat during offboarding. The displayed per-person plan price is `-` for a seat/devices already paid for or reused, and otherwise reflects one-off orders for this term; renewal resets this display.

The approval controls are explicitly simulations. They alter local demo state; they do not submit an order to a real client administrator or charge a payment method.

### Staff-raised service request path

The **New onboarding** / **New offboarding** buttons on the corresponding People tabs open `/pages/services/new.html?type=onboarding` or `?type=offboarding`. These actions are shown to users with the lifecycle-create permission (Customer Success, IT, Head of Operations, or Super Admin roles). The form is also a shared entry point for other service types, documented with the remaining service operations in later increments.

This is a distinct workflow from converting an existing Joiners/Leavers intake:

- **Staff-raised onboarding** requires a client, employee name, start date, delivery address, and at least one device. The operator chooses a country, package (or custom device selection), and warehouse or direct-to-employee route. Warehouse routing is unavailable when that country has no assigned warehouse. When the client supports MDM, the form also presents enrolment choices. The form does not create a People record or run the Joiners queue's completeness/risk/seat-order flow.
- **Staff-raised offboarding** requires a client, leaver name, last day, return address, and at least one eligible device. Devices are selected from the seeded inventory with an employee or client-site location. The operator chooses a post-retrieval disposition. Store/redeploy needs an assigned warehouse; disposal can route to the e-waste partner. The destination preview must be valid before submission.

On submit, each valid request is added to the `sap-staff-requests-v1` browser `localStorage` list with its generated work-order ID, client, owner, initial stage, and lifecycle-specific details. The Services board merges these staff-raised entries with its seeded tracker examples. The success banner links to the matching Services board. This path therefore creates a dynamic board item (unlike the separate new-ID action in the People queue), but the offboarding detail link remains the shared fixed sample detail page; the form does not create or update a People directory record or seat assignment.

### Leaver intake → offboarding and retrieval

The Leavers queue (`/pages/people/leavers.html`) contains scheduled departures and HRIS termination records. It defaults to open records and supports search plus client, country, and status filters; rows are sorted by departure date. The panel shows whether the end date is confirmed or estimated, the source, each assigned asset, a planned outcome, the retrieval method/date, and whether an access-cutoff reminder is enabled.

Before creating offboarding work, the operator can:

- Set each device outcome to **Redeploy**, **Store**, or **Dispose**. Redeploy and Store route toward the client’s assigned warehouse, or to the client site when no warehouse exists; Dispose routes to the disposal partner.
- Choose **Return box**, **Courier collection**, or **Office drop-off**. Box and courier methods require a return address; all methods require a date. The date control is bounded by the current prototype date and, for future departures, the departure date. An estimated departure triggers a reminder to confirm it with the client.
- Enable or disable the access cutoff reminder. When enabled, the hint computes the prior working day (moving back over weekends). This is a displayed reminder state, not an actual identity-provider access action.

Scheduling validates the required address/date, stores the method and date, assigns an `OFF-` reference, and moves the queue item to `created`. The queue is then locked and points to Services › Offboarding. On a seat-plan client, the seat continues to be held until offboarding is completed. The People queue’s **Complete offboarding** demo action marks the person `left`, clamps a future/no end date to the prototype’s current date, and synchronizes the seat ledger. A once-used seat becomes available; a twice-used seat becomes Used.

This completion control is an intake-side prototype shortcut. It is separate from the operational retrieval milestones: it does not wait for devices to be picked up, received, wiped, or dispositioned in the Services tracker.

### Service work-order tracking

The Services area contains onboarding, offboarding, repairs, redeployments, storage, disposal, work-order, and request flows. For onboarding, the seeded tracker board at `/pages/services/onboarding.html` displays items by their current SLA milestone. Cards show employee, client, country, package, delivery route (where relevant), blockers, start-date urgency, received-line progress, and SLA health. Opening an onboarding detail page shows the current milestone, overall progress, employee/package/address facts, per-device status and vendor ETA, assignment, a client email conversation mockup, SLA targets, handover notes, and audit history.

Onboarding milestones are: **Initiated → Procured → Imaged/Provisioned → Dispatched → Delivered → Setup confirmed**. Procured is measured per line and completes when the last device arrives. Imaging, dispatch, and delivery are warehouse-only milestones; routes that bypass a warehouse skip those steps. At procurement, the detail page distinguishes ordered items from items received at the selected route. Warehouse clients may be configured to ship complete or allow split shipments; an operator can use “Ship what’s ready” to demonstrate an override, with a reason required for a non-split client. The prototype calculates SLA health against custom client targets or country defaults and highlights at-risk/breached work. Its tracker note explicitly simplifies business days to 24-hour elapsed periods.

Detail-page milestone actions can complete or skip the current step. Skipping requires a reason; completion can include a handover note. The page advances the current step, recalculates SLA status, and adds a local audit entry. The tracker stores milestone actions, audit entries, and handover notes in browser `localStorage`. Email composition, contact-client-admin dialogs, shipment overrides, and milestone updates are demonstrative; they do not send external communication or update a fulfilment provider.

The offboarding board has a Services tab and illustrative request cards. Its detail route demonstrates a retrieval timeline, blocker/courier information, device disposition, SLA detail, and milestone controls. Unlike the queue-generated intake panel, some offboarding board/detail content is fixed sample HTML; do not assume every leaver `OFF-` reference opens a record dynamically resolved from the People data.

### Prototype handoff boundary

The intended path is People intake → generated work-order ID → Services tracker → completion/asset follow-up. The staff-raised form also writes a dynamic tracker item. The workflows are still not one integrated record model:

- A work order created from an existing Joiners queue item gets a fresh `ONB-` number, but that handler does not add a corresponding item to `TRACKER_ITEMS` or the staff-request list. Its link opens the onboarding board, not a newly created matching tracker detail record.
- A work order created from an existing Leavers queue item gets a fresh `OFF-` number, but that handler does not add a corresponding item to `TRACKER_ITEMS` or the staff-request list. Its link opens the offboarding board; the offboarding detail route is a fixed sample rather than a query-driven lookup for that request.
- A staff-raised onboarding/offboarding request does become a board item through `StaffRequests`, but it is not added to the People directory/queues or synchronized to the seat ledger. Staff-raised offboarding uses a shared fixed detail link.
- Some existing seeded People records intentionally reference tracker fixtures; the screen inventory calls out that newly created queue work is not included in tracker data.

Therefore treat the People status/seat transition and Services milestones as related demonstrations of a business flow, not as one universally synchronized, persistent end-to-end record implementation.

## 7. Data and persistence boundaries

There is no application backend or database. Most domain data is seeded in JavaScript files under `scripts/` and rendered in the browser. Shared-template loading uses `fetch`, but this is not a business-data API. Some flows also use browser storage to preserve demo session, selected-user, role configuration, or workflow edits across reloads. That state is local to the browser and is not shared with other users or environments.

Treat all counts, statuses, calculations, approvals, and actions as illustrative unless a screen’s implementation says otherwise. A button or form may update the local demonstration state without submitting a real order, sending a message, or creating a business transaction.

More specifically, People intake and seat changes use `sessionStorage` and may reset when the browser session ends. Tracker milestones, audit entries, and handover notes use `localStorage` and can remain in the browser profile across sessions. Seed records and prototype dates are not live HRIS or operational data.

## 8. Operational queues, orders, quotations, and support

This increment covers the queue that brings time-sensitive work together, the order and quotation lifecycle, support tickets, and repair estimates. These areas share sample client and SLA data, but they do not form one backend workflow.

### Needs attention

`/pages/attention/queue.html` normalizes several sources into a single list:

- Orders and service work come from the tracker model. Rows are included when breached, at risk, or blocked.
- Support rows come from open tickets that are breached, at risk, or unassigned in Submitted.
- Subscription rows include renewals nearing term end, expired subscriptions, restricted subscriptions, and pending seat/device orders awaiting the client administrator.

The queue has kind tabs for All, Orders, Services, Support, and Subscriptions, plus summary tiles for Needs attention, Breached, At risk, Blocked, Unassigned, and Mine. Client, country, and owner filters can be combined with those controls. Results prioritize breached items first, then at-risk items; rows link back to the source order, service, ticket, subscription, or joiner request. The filter selection is kept in `sessionStorage`.

This is a derived view, not a workflow owner: changing an item must be done in its source module. The subscription/seat rows are generated from the subscription and seat ledgers; they do not represent support or service tickets.

### Orders: creation through delivery

The Orders area has Board, List, Insights, Templates, New order, order detail, and Quotations routes. Board and List share search and filters for status, priority, client, vendor, and country, with summary tiles for open, overdue, at risk, awaiting approval, payment hold, and recently delivered orders. Filters are preserved in `sessionStorage`. Insights summarizes the seeded/generated order book, while CSV export and the daily digest are local utilities rather than connected reporting services.

The New order form lets an operator choose the client, country, entity, order type and priority, owner, vendor, route, recipient/person, and product lines. It also captures delivery, ticket/PO and cost-centre details, shipping cost/revenue, and extra fees. Contract price data supplies product and fee defaults; changing the client, entity, route, or line can recalculate those defaults. Templates can load a saved set of type, priority, lines, and fees, or save the current selection for reuse. Before creation, the form requires a recipient, a delivery address unless the route is via a warehouse, and at least one product line with quantity of at least one. A procurement-cap overage can require approval automatically; the operator can also mark an order as requiring approval.

An order moves through its configured milestones: **Submitted to vendor → Quotation sent for approval → Quotation approved → Quotation released to client → Client confirmed → Payment confirmed → Shipping info (AWB) → Received at warehouse → QC & dispatch → Out for delivery → Delivered**. Warehouse receipt and QC steps are skipped for direct-to-site and direct-to-employee routes. The order detail view is the action surface: operators complete the current milestone, add AWB/tracking details, record stage notes, skip a stage with a reason where allowed, correct a completed timestamp, or undo the last completed/skipped stage. The system blocks progress while approval is pending or a payment hold is active. Holds, pauses, cancellation, approval/rejection, stage updates, and audit history are stored with the order. Delivered cannot be skipped or cancelled; once billing charges have posted, delivery cannot be undone through the order screen.

The order SLA is milestone-based. Targets come from a client exception when configured, otherwise the order type and country default. Order targets use business-hour calendars, and recorded pauses are excluded from elapsed SLA time. Rush, regular, bulk, pre-order, and deploy-from-stock orders have different milestone/target definitions; pre-order starts its SLA at the confirmed stock date. On delivery, the order can post device-sale and per-device deployment-fee entries through the browser billing engine. This is a local demonstration of that handoff, not a supplier integration or payment collection.

Orders and templates are held in `sessionStorage`; seeded and generated sample orders are also loaded into the demo model. The order history, actions, pricing, approval and billing records are not a shared operational database.

### Quotations: pricing, review, and order handoff

The Quotations view captures an operations owner, client, country and storage location, along with one or more product lines. Each product line has its own vendor, quantity, local buying price, tax, delivery fee, target markup, MRP and lead time. A live calculation applies delivery per unit, tax, procurement markup, local-to-USD conversion, and the FX buffer; it then derives quoted total, landed cost, margin, and MRP variance. General FX/tax rates and client-specific overrides are maintained in Settings. Policy settings can flag a quotation when actual markup is below a configured minimum or its MRP premium exceeds the configured maximum. Changes to FX/tax settings have a browser-local audit trail.

Quotes can be created, edited, searched, filtered by status/client/vendor/product/approval, or deleted after confirmation. A policy exception sets the quote to Awaiting approval; a user identified by the demo org model as a head can approve it or reject it with a mandatory reason. Conversion is offered for quotes marked HOD-approved, quote-status Accepted, or final-status Approved, provided they are not already linked to an order. Conversion creates an order in a Quotation pre-stage; the order detail action moves it into Submitted to vendor and starts the ordinary milestone flow.

The handoff is intentionally incomplete: conversion uses a regular, warehouse-routed sample order and derives a quantity, but does not reproduce the quotation's actual product lines, per-line vendors, negotiated prices, fees, or route. Treat the order as a linkage demonstration, not an exact procurement transfer. Quotations, settings, and their audit are stored in `localStorage`.

The current [Quotations page](../pages/orders/quotations.html) contains unresolved merge-conflict markers around its script imports and includes both alternative dependency lists. This increment leaves that file unchanged, as requested; the intended dependency set needs cleanup before the page source can be treated as a finished entry point.

### Support tickets

Support provides a Board, List, New ticket, and ticket detail. The board organizes tickets by status and shows SLA health; list/board filters help narrow the queue. New ticket can be opened with a client preselected, can select an employee from People or accept a typed requester, and captures requester email, country, subject, description, priority, category, source, optional external reference, and owner. Required requester, valid email, subject, and description are checked before a `SUP-` ticket is created. An assigned ticket starts in Triage; an unassigned ticket starts in Submitted.

Ticket detail contains the status stepper, conversation, SLA clocks, activity, and ticket metadata. An agent can assign or take ownership, change priority, send a reply (with optional CC), add an internal note, move a ticket to Waiting on client, resume it after a client reply, resolve it, or reopen a resolved ticket. A first public reply stamps first response and advances Submitted/Triage to In progress; internal notes do not count as a public response. Waiting pauses only the resolution clock, not the first-response clock. Both clocks are evaluated against a client-specific support exception or the country standard; Urgent halves the targets and Low doubles them.

Ticket data and edits are saved in `sessionStorage`. Conversation replies, CC, assignments, reminders, and client notifications are simulated; no email or external support system is contacted. Open tickets that are at risk, breached, or unassigned appear in Needs attention. A resolved ticket is excluded from that queue.

### Repairs and repair quotations

The Repairs board and work-order route demonstrate a repair lifecycle and SLA milestones: **Response → Triage → Repair / loaner sent → Returned**. The repair examples are seeded tracker/work-order fixtures, not a repair intake pipeline connected to the asset register. Opening a work-order repair quote shows diagnostic findings and files, line-item repair charges, any contract handling fee, a replacement alternative, write-off information, and staff-only vendor cost/margin evidence.

For a draft or expired estimate, the operator can add findings/evidence and send or resend the quote to the client administrator; sending requires findings and an uploaded vendor quote. The device is shown as remaining at the repair facility while the client decides. Reminder and client decision controls are explicitly simulated. A simulated decision can approve repair, choose replacement, or write off the device, and records an audit trail. The quote interaction is page-local demonstration state; it does not dispatch a real client message or create the replacement/disposal work shown in the audit narrative.

### Shared operational boundaries

Orders, tracker services, support tickets, subscription warnings, and seat orders meet only in Needs attention's normalized read view. Orders and repairs use their own lifecycle records; support uses ticket records; seat orders remain in the seat ledger. Apart from the described browser-side delivered-order billing post and quotation-to-order link, actions do not automatically synchronize into another module, a vendor, a client system, or a real communications channel. SLA figures are prototype calculations over seeded dates/configuration, not an external contractual SLA service.

## 9. Catalogue, assets, and supply

These screens describe how device models, client-specific offers, physical stock, locations, and supplier inputs fit together. Catalogue pricing, the Stock ledger, the Asset console, and fulfilment records are separate prototype data sets; links between screens demonstrate navigation and selected handoffs, not a fully synchronized inventory system.

### Product catalogue and client pricing

The Catalogue model list is the entry point for product models. It presents search, brand/category/status/country filters, saved-view choices, selection controls, and Import/Export/Add model actions. The main list is chiefly a seeded screen: selection updates a bulk-action bar, but the list does not provide a complete persistent model import, export, or create/edit lifecycle. A model opens a set of tabs:

- **Overview** shows model name, description, brand, category, family, active/draft status, and specifications. The form controls are illustrative rather than a saved model editor.
- **Country listings** shows the vendor SKU, currency, designated vendor, vendor cost, retail price, spread, stock, availability, and update time for each country. The listing is the source of the shown vendor/retail price. The availability switch changes the in-memory sample listing; other listing details are read-only and the change is not persisted.
- **Vendors** summarizes which suppliers serve the country listings and their stock/lead-time facts.
- **Add-ons** and **Activity** are supplementary model tabs with sample content.
- **Inventory** is a read-only view over the shared Stock lines for that model. It separates Esevel warehouses and client-site stock and shows in-stock, reserved, available, and incoming quantities, with a link to the Stock area for operational detail.
- **Client catalogues** shows a model’s contract-calculated price by client, country, and volume tier, plus the separate offer toggle. “Not offered” means the client does not receive the offer; “Hidden by client” is a distinct sample state and does not mean the listing is unoffered.

For a country listing, a client with no explicit catalogue adjustment uses retail. If a custom contract adjustment exists, the prototype applies that percentage to vendor cost and floors the resulting local selling price at vendor cost. It then converts the amount into the client’s paying-entity currency using the contract FX basis. The computed default is a suggestion, not an automatic contract change. Editing or adding a client catalogue writes the adjustment into the in-memory contract terms and changes the offer state; it is not saved as a persistent commercial record.

The **Default markup** page is a separate policy surface: category × annual-volume-tier percentages with current, scheduled, and historical versions, plus country/category point adjustments. Changing a value requires a percentage from -100% to +100%, a changed value, and an effective date; replacing a scheduled version creates a new dated rule. This is guidance for custom client contract adjustments, not a change to standard retail or existing client prices. Its rule changes are held in page memory.

### Asset console and device record actions

The Assets list searches the seeded cross-client device table and provides client and MDM filters. Summary tiles report MDM verification, deployment gaps, warranty risk, devices in repair, and devices in transit/storage. Selecting a row opens the shared asset detail prototype with that row’s serial, model, client, category, location, and status copied into its header. The detail route has a timeline, documents, related work orders, warranty/asset facts, and a device-management card.

MDM is modeled separately from asset inventory. Secure/Complete client plans can have a configured MDM platform; other plans show a plan note, non-computer devices are not applicable, and in-transit or stored computers are marked as enrolling at deployment. A deployed computer expected to be managed but absent from the sample MDM directory is shown as Not enrolled. The **Send activation** action is simulated. For a seeded MDM device, **Sync now** advances the telemetry states Invited → Agent installed → Enrolled; **Verify onboarding complete** is the human attestation step. These MDM state changes are not persisted or sent to an integration.

Users in the IT/Customer Success action roles get an asset Actions menu. Reassign and ownership change add a timeline entry; Store, Redeploy, and Dispose can either make an asset-only status change or open the corresponding Services request form; Archive requires a reason; and Depreciation report downloads a sample CSV. Asset-only actions explicitly do not bill a service, and they only update the current page’s display. The menu is a different path from raising a billed Services request.

The Add asset panel demonstrates single-entry and CSV bulk-add. Single entry requires a client and unique serial, and requires an assignee when the location is an employee. Bulk import requires a client and CSV and skips missing or duplicate serials. The sample download describes the expected columns. Added rows appear in the current table and are not written to a shared asset store; bulk parsing is a lightweight prototype parser rather than a full CSV import service.

### Stock, thresholds, and replenishment

Stock is tracked by client × model × location. A line separates on-hand, new/used, reserved, available (`on hand − reserved`), and incoming quantities. Locations are either an Esevel-managed warehouse or a client site. The client Stock page summarizes these values by country and model, expands a line to show generated device serials, condition, grade, reservation, age, accrued storage, and a suggested Keep/Redeploy/Dispose action. Those suggestions are explanatory: reserved devices are kept, Grade D devices suggest disposal, other used devices suggest redeployment, and new stock is kept.

The Stock landing page lists clients and flags attention for below-minimum thresholds, a restock awaiting the client, or warehouse devices stored 90+ days. The Warehouse view groups stock by location. The model Inventory tab is another read-only view of the same seeded stock lines.

Thresholds are defined per client, product category, and country. The “current” threshold count includes available stock at both that client’s warehouse and its own sites in the country. A value below the minimum is a breach; a value below 125% of minimum is near threshold. The client Stock page can add or edit a threshold, select whether it was set by the client or by Esevel on the client’s behalf, and define the minimum and target restock quantity. The prototype rejects duplicate client/category/country thresholds, non-positive/non-whole minimums, and target quantities that are not greater than the minimum.

The Restock queue creates one proposal for each breached threshold and calculates quantity to bring available stock to the target. Its Review panel shows the preferred vendor, estimated unit cost, lead time and destination warehouse (or asks the client to nominate a site); where procurement-cap data is available it also shows the estimated effect on the remaining cap. The operator can send a new proposal to the client for approval or dismiss it. The screen says restocks always require client approval; the client’s approval/decline and the subsequent purchase order are not implemented as an operator action here. Restock states and threshold edits live in page memory.

### Receiving returned or replenishment devices

The Receiving screen works from seeded expected inbound devices tied to offboarding or restock work. Courier return receipts are described as arriving through the Services Sync inbox; an expected serial can also be scanned/typed to mark it arrived and open the inspection panel. The page filters To inspect, Expected, Received, and All, and can narrow by warehouse.

To receive a device, the operator records new/used condition, grade A–D, inspection notes, and at least two photos. Saving marks the receipt received, records the actor/time, completes the matching work order’s **Received at warehouse** step, posts the applicable retrieval charge through the billing engine (subject to contract billability), and begins the storage calculation. A received row is locked against another intake. The receiving and billing state is saved in `sessionStorage`.

This is not a full stock ledger integration: receiving updates the `RECEIVING`/billing step records, but does not add the unit to `STOCK_LINES`, update the asset console, or advance the offboarding/replenishment record everywhere. Treat the screen as a receiving-work demonstration, not proof that the unit is now selectable as available stock.

### Storage fees

Storage fees groups warehouse stock by client and warehouse. It reports devices billed, average storage duration, 90+ day count, daily rate, 30-day monthly estimate, accrued amount, and suggested redeploy/dispose counts. The rate is based on the warehouse country’s local storage fee or contract exception, converted to the paying entity currency and displayed with the FX basis where available. Devices at client-owned sites are not billed by Esevel; warehouse storage is calculated from each device’s intake date. Filters select client, warehouse, and aged-only rows, and the current report can be exported to CSV.

The report calculates its values from seeded stock/device data and the demo contract/FX configuration. It is not a recurring billing job or an invoice on its own. Receiving’s retrieval charge and storage-fee reporting are related but distinct operations.

### Warehouses and warehouse assignments

The Warehouses list distinguishes Esevel-managed warehouses from client-owned locations. A warehouse can have assigned clients, an operating country, address/contact/hours, status, unit counts, and a dispatch buffer. Expanding/editing a warehouse shows stock grouped by client and model. The panel can add/edit a location or decommission a warehouse; decommissioning is a status change and does not migrate its stock. A client-owned location is associated with a client, has no Esevel storage fees, and means redeployments start with collection.

Warehouse assignments are managed separately in a client × country matrix. Each cell can be Not active, an active Esevel warehouse in that country, or No warehouse · client sites. Saving updates `HUB_ASSIGNMENTS`; new deliveries, storage calculations, and Deploy timing are intended to use the new assignment, while stock already in the former warehouse stays there until moved. The assignment data also supplies destination choices to request/order flows.

Warehouse and assignment edits are prototype state. The assignment screen’s session persistence helper saves newly added clients and their warehouse map; edits to existing clients, warehouse creation/decommissioning, warehouse buffers, and most other data changes are in-memory only and reset on reload. These controls do not connect to a real warehouse provider.

### Vendors and supply assumptions

The Vendors directory presents sample suppliers, couriers, 3PL warehouses, repair providers, and ITAD partners with countries, access method, jobs, integration status, and account status. Vendor Overview and Access are sample detail routes (the current detail is Courier X); they show account/service facts, delivery times, assigned jobs, performance, integration status, and portal users. Changing Portal/Integration/Both only switches the displayed access cards. Inviting a portal user validates the email and appends an Invited row locally; it does not send an invitation or create a login.

The hardware-supplier route (for example `supplier.html?v=vendorA`) edits lead-time ranges per supported country, compares them with the displayed 30-day actual average, and lists open orders for that supplier/country. Saving changes the in-memory supply input used by checkout estimates for new orders; existing order targets are unchanged. Courier last-mile ranges and warehouse dispatch buffers are separate supply inputs, and the operating calendar can contribute delay notices. These lead-time values feed estimates; they are not vendor API data.

### Cross-area and persistence boundaries

The broad intended supply path is catalogue listing → order/stock request → vendor or courier → warehouse receiving → client stock/asset record. In the prototype, several of these connections are read-only links or independent sample fixtures:

- Model inventory reads `STOCK_LINES`, while receiving writes `RECEIVING` and billing step state. Completing intake does not itself increase the stock-line quantities.
- Asset actions may open a Services request, but asset-only status changes are not the same as a completed service work order, and neither automatically reconciles all asset and stock rows.
- Warehouse assignments and lead-time edits can affect calculations in the current browser run, but most are not persisted. Stock thresholds/restock proposals and catalogue offer/markup changes also remain in-memory.
- Billing ledger, invoice, and receiving-step edits are session-persisted in the billing store; this is still browser-local state, not a backend.

Accordingly, treat the screens as connected workflow demonstrations with explicit cross-links, not as a single inventory, vendor, MDM, or warehouse system of record.

## 10. Clients, subscriptions, and commercial operations

The Commercial area ties a client’s versioned contract to billing entities, plan/subscription rules, procurement caps, and charges. The billing screens then demonstrate how event charges become invoice lines and how corrections are handled. These are coordinated browser-side models rather than a live accounting system or client portal.

### Client setup and initial acceptance

The Clients list is the entry point to client records. It groups seeded companies by contract status and shows plan, subscription/seat information, term/version, invoice currency, and billing entities. Search and filters narrow the list; the Procurement caps tab opens the separate cap overview.

**Quick setup** creates a simple seeded company with a plan, term, seats, one billing entity, standard fees, and a generated admin credential email. **New client** is the more complete seven-step setup:

1. **Company and owner:** name, initials, admin name and valid email.
2. **Countries and warehouses:** choose at least one operating country and its assigned Esevel warehouse or client-site-only option.
3. **Billing entities:** parent and subsidiary legal names, countries, tax/contact details, invoice and settlement currencies, tax status, importer-of-record, and (where relevant) billable-user rate.
4. **Plan and subscription:** choose Free, Support, Secure, Complete, or Enterprise; set subscription dates, seats and rates, add-ons, device allowance/price, auto-renewal and optional agreed annual total. Enterprise is event-billed, not seat-subscribed.
5. **Pricing and fees:** record client-specific category/tier price adjustments, lifecycle fee exceptions, and disabled billable events.
6. **Billing settings:** FX source and lock point, invoice-splitting preferences, and the procurement cap.
7. **Review:** check the proposed terms and owner note before saving or sending.

The required company, owner, country, entity, plan-term, cap, and review fields are validated as the user progresses. Saving as draft creates v1 for staff editing; sending creates a pending initial contract and simulates sending a registration link. In the initial-contract flow, the owner must register (including setting a password) before the UI offers client acceptance. Simulated acceptance makes the client active. These registration and acceptance buttons do not create an actual external account or send an email.

### Contract details, versions, and amendments

The client detail view is organized into Overview, Plan & seats, Billing, Pricing, Billable users (Enterprise only), Disputes, and Operations. A version selector exposes current, pending, draft, withdrawn, and superseded contract versions; the amendment view compares prior and proposed terms, with a switch to show only changes.

Staff edit contract terms in a draft. The sections include:

- **Billing entities:** parent/subsidiary tree, invoice and accepted settlement currencies, tax status, importer-of-record, contact, and billable-user rate.
- **Currency and FX:** contract FX source and whether the rate locks at checkout or at the billable milestone.
- **Lifecycle fees:** billable on/off per event and country-specific fee exceptions against the standard schedule.
- **Device pricing:** client-specific category/volume adjustments, with vendor cost as the minimum price.
- **Discounts/rate overrides and routing:** time-bounded fee discounts or fixed rates, plus rules routing matching PO/cost centre charges to a billing entity. Defaults use the work country and parent entity.
- **Invoice splitting:** select entity, cost centre, country, and/or PO dimensions for grouping.
- **Billable users:** Enterprise user-billing control and per-entity rate, with monthly snapshots explained in the UI.
- **Procurement cap:** cap amount/currency/period/renewal plus seeded spend utilization.

Publish requires an effective date and note, then locks the pending proposal until the client accepts or staff withdraws it. Acceptance applies the proposed terms and marks the prior active version superseded; withdrawal closes the proposal without replacing active terms. Initial contracts use the registration/acceptance sequence instead. Seat plan changes are validated: committed seats cannot be removed, reduced, or repriced lower mid-term; terms may be extended but not shortened; downgrades and moving to Enterprise are renewal-only. Caps edited from the client or cap screen are saved to a contract draft and do not replace the live limit until client acceptance.

Contract records and newly created client metadata are stored in browser `sessionStorage` (new client details are restored with their warehouse assignments). They are not shared across browsers or persisted by a server.

### Subscription plans, seats, and renewals

Free, Support, Secure, and Complete are seat subscription plans; Enterprise is per-event and has no seat ledger. Paid subscriptions bill committed seats, eligible add-ons, and extra-device blocks annually in advance. Free seats/devices have no charge. The Plan & seats view shows the subscription term and status, annual amount, seat blocks, add-ons, extra-device blocks, bill-to entity, renewal settings, and a seat roster.

The seat counts distinguish **Active** (including active, joining, and leaving people), **Available**, and **Used** seats. A released seat can be reassigned once; after its second holder leaves it remains Used for the term. Renewal clears Used seats and carries current holders forward as first-use assignments. A seat covers the plan’s device allowance; a joiner exceeding it needs an extra-device order. Leavers keep their seat during offboarding.

If a joiner has no available seat, or needs devices beyond the allowance, a subscription order is created for the client admin. The UI offers simulated approval/rejection: approval commits the seat/device block and records its one-off charge; rejection leaves onboarding blocked and permits an order retry. An order amount is monthly price × days remaining in the subscription year ÷ 30, capped at 360 days. Additions are committed through the term and join the annual subscription fee from the next subscription year. Mid-term terms may add seats/devices but cannot reduce commitments or lower their rates. At renewal, a draft renewal can lower seat counts or change prices.

Subscriptions nearing term end show Renewal due within 90 days when no renewal or auto-renewal is recorded. Paid plans have a 30-day post-expiry grace period, during which existing service can continue while notifications are paused; after that access is restricted. Free plans restrict on expiry. Expired subscriptions cannot add seats, and restricted subscriptions prevent new assignments. The UI models renewals and orders locally; it does not collect payment or operate an actual client-admin portal.

Contract terms, seats, and seat orders are stored in `sessionStorage`. Seeded People records inform seat assignment, but the ledger is a demo snapshot, not an HRIS-synchronized count.

### Procurement caps

The caps page summarizes clients by Healthy, Near, Over, and renewal state; it filters those statuses and by currency. Each client row shows the single client-wide cap, spend to date, remaining amount, utilization, next renewal, and contract status. Expanding a client shows spend by billing entity and recent sample orders. Spend in entity currencies is converted to the configured cap currency for the displayed total; amounts across currencies are not added raw.

Setting a cap opens a draft amendment. The live cap stays in force until acceptance. Order creation checks whether the proposed procurement takes the cap over its limit and can require approval; the cap is not a payment authorization and the seed spend/order history is illustrative.

### Billing inputs and settings

The Billing settings screen has Plans, Fees, Tax and duties, and FX views. Plans show feature availability, add-on pricing, seat prices and clients on each plan. Standard lifecycle fees are versioned by country and priced in local currency; editing requires at least one changed rate, a future effective date, and a reason. The new version closes the old schedule on the preceding day. Client contract exceptions override standard fees; already-posted charges retain their saved pricing basis.

Tax and duties rules are versioned by country or US state. Adding or changing a rule sets a rate (0–50%), effective date, and optional duty notes. Existing issued invoices retain their computed tax. FX settings show the configured reference sources and sample rates; contracts choose the applicable source and rate-lock point. These administration screens display and alter seeded browser memory only; deeper platform configuration is covered in the next increment.

### Ledger: charge creation and correction

The Billing ledger is an append-only view of accrued charges. Billable service milestones (for example delivery, retrieval receipt, repair completion, or disposal certificate) can post one charge per device; subscription charges post at annual starts and for mid-term blocks; Enterprise billable users post from a monthly snapshot; storage accrues by device-day. An event is billed only if the active contract enables it. A completed step can add a charge to the matching draft invoice; its saved basis includes the fee/exception, entity, FX, source and supporting evidence so later contract changes do not reprice it.

Ledger filters cover Unbilled, Needs attention, Invoiced and All, with client, event and currency filters. Summary tiles show unbilled totals separately for each currency, event count, anomalies, and pending reversals. Opening a line shows the source milestone, asset/recipient, document, pricing basis, entity, invoice and dispute/correction state. Duplicate steps are blocked; missing evidence and expired-contract charges can be flagged as anomalies.

Corrections do not erase or rewrite an original charge:

- **Our error:** an unbilled item gets a reversing entry; an invoiced item gets a draft credit note for Finance to approve.
- **Goodwill:** an unbilled charge is reversed immediately; an invoiced one gets an issued credit note.
- **Client disputes it:** eligible invoiced lines open a dispute for investigation rather than an immediate correction.

Where an action requests approval, Billing · Needs action lets staff approve or reject it. Resolving a dispute may issue/apply a credit note or reject the claim so the charge stands. An anomaly can be marked checked and added to a draft. Credit notes are append-only correction records and can be applied to an outstanding invoice or held for a later invoice.

### Invoices, payments, credits, and disputes

The Invoices page lists invoice and credit-note states, amounts, due dates, and open disputes. Search and client/entity/status/date/currency filters narrow the invoice list. A draft invoice groups unbilled ledger lines using the client’s invoice-splitting preferences and billing entity. Invoice detail links every line back to its ledger source and shows PO, cost centre, quantity, tax, credits, payments, bill-to entity, and activity.

The invoice state path is **Draft → Issued → Paid**, with Overdue derived from an issued invoice past its due date, or Cancelled. Issuing assigns an invoice number/date/due date, marks its linked ledger lines invoiced, and records the action. An invoice can be cancelled with a reason; its ledger lines return to unbilled for a later run. A payment must be positive, not exceed balance, and include a bank reference; an optional receipt filename is recorded, and partial payments leave a balance due. Overdue invoices offer a reminder action. PDF download and reminders are local UI demonstrations, not delivery to a client.

Draft credit notes appear in the shared Billing · Needs action queue for review and issue. Issued credit notes may be applied to an eligible invoice or the next invoice; applied amounts reduce its balance. Disputes track open/investigating/resolved/rejected status, owner, client explanation, internal notes, and final outcome. The dispute, invoice, ledger, payment, and credit-note controls simulate accounting operations in browser state; they are not connected to a bank, tax authority, or external invoicing platform.

Ledger, invoices, credit notes, disputes, billing step logs, and receiving sync state are saved in `sessionStorage` through the billing store. All values are browser-local prototype data.

### Service reports

The Service reports page lists seeded monthly client reports with ticket counts, SLA compliance, average first-response/resolution time, status, issue date, and owner. SLA compliance is described as the share of tickets that met both response and resolution targets. “Generate reports for September” adds fixed sample draft rows for clients missing from the month; it does not aggregate live support tickets.

Only the Acme Tech September report opens the editor. It shows sample six-month charts for volume by Support/Orders/On/offboarding/Repairs, SLA compliance against a 95% target, and response/resolution trends, plus six report sections and commentary. At least one section must remain enabled. Save draft, export, and issue update the current editor display; export actions report a sample filename rather than producing a real report file, and issue locks the current page view and simulates client notification. The report list/editor state is not persisted.

### Commercial handoffs and limits

The intended path is contract configuration → operational work or subscription event → ledger charge → draft/issued invoice → payment or credit/dispute. Several core links are implemented locally: service and order milestones can post ledger charges; accepted contract terms govern new charge pricing; ledger lines are assigned to invoice drafts; issuance marks source charges invoiced; correction actions create reversals or credit notes. Nonetheless, the data are all client-side and some event lists/invoice/report values are seeded fixtures. There is no live plan enforcement, bank settlement, payment processor, tax filing, client portal, email delivery, or authoritative accounting source.

## 11. Administration and platform

These settings shape how operations are presented and timed: service/order targets, country operating calendars, client system connections, and which modules a demo user can see. They are separate from client commercial terms. The Billing settings screen (Plans, Fees, Tax and duties, and FX) is covered in [Section 10](#billing-inputs-and-settings).

### SLA configuration

SLA configuration is divided into **Standard SLAs** and **Client exceptions**. The standards page selects a country and displays milestone cards grouped into Orders and Services. The configured types are Regular, Rush, Bulk, Pre-order, Deploy from stock, Onboarding, Offboarding, Repair, Redeployment, Storage, Disposal, and Support. Each card shows the per-milestone target and end-to-end total. Order targets use business hours in the order country; service targets primarily use business days. Warehouse-only milestones are skipped for direct delivery routes, and conditional collection milestones apply only where collection is needed.

Editing a standard opens a milestone panel. Whole-number targets must be within the displayed hour/day bounds; saving can copy the values to additional countries. The impact text indicates how many assigned clients are on the standard and notes that customized milestones keep their exceptions. The sample defaults and version/date labels are in page memory, not a durable configuration service.

The exceptions page filters by client, SLA type, and country. Add/edit chooses a client/type/country combination, then changes only the milestones that differ: a blank value follows the country standard. Saving or removing an exception updates the displayed client SLA version counter. If an exception's fixed vendor lead-time target is shorter than a seeded vendor quote, the page warns that orders using that vendor will breach. These exception edits do not publish or accept an actual client contract amendment; they mutate the page's in-memory SLA fixture and reset on reload.

The old SLA command-centre path redirects to Tracker › Needs attention rather than presenting an independent live command centre. Its prior static mock-up should not be read as a separate live SLA-monitoring service. Operational boards described in earlier sections show the current prototype's tracking surfaces.

### Operating calendar and closures

The Operating calendar selects among seeded country calendars and shows public holidays and ad-hoc closures in a month grid or yearly list. The schedule panel displays operating weekdays, hours, timezone, closure counts, and order cut-off. The data also include regional names and active Esevel warehouses for the Add closure dialog.

Adding a closure requires a start/end date and reason. The operator chooses Country, Region, or Warehouse scope and whether it applies to Procurement, Services, or Both; the form previews an estimated number of shifted SLA targets. Added entries are labelled with their chosen scope and applicability. Delay notices take a positive number of extra days, reason, and end label; the UI describes them as checkout-estimate/client-notice adjustments, not SLA target changes. The order cut-off and delay controls are local page-state demonstrations.

Calendar data feed the order business-hour calculator used by order estimates and order milestone timing: working hours, weekends, public holidays, and relevant closures are skipped. One limitation matters: the calculator consumes country entries and does not apply the Region/Warehouse scope metadata; its closure handling is country-level. Services-only closures are excluded from the procurement clock, and the calendar's numeric impact preview is illustrative rather than a recalculation of live service jobs. Calendar edits and delay notices are not persisted, so reloading or navigating to another page restores the seeded schedule.

### Integrations

The Integrations list presents seeded connections grouped by client/system and type (HRIS/IdP, ITSM/ITAM, or Directory/MDM), with status, last sync, 24-hour record count, error count, employee drift, and owner. Its filters are visual controls in the static list. Clicking a row opens the same sample detail page; it does not route to a distinct connection record. The list's “Run sync now” demonstration changes that cell to “Just now · Sync complete” only.

The sample Workday detail shows sync health, schedule, record counts, errors, headcount drift, and example queued errors with retry controls. It also shows an example of what an HRIS connection might do (create joiners/leavers and update employee details, but not write asset assignments back). Those health values and retry/pause/sync controls are seeded presentation; they do not invoke a real connector.

The field-mapping editor is the active interaction on the detail page. It maps sample Workday source columns to Esevel employee fields, flags required/unmapped and duplicate mappings, highlights rows needing review, and previews one sample transformed record. Cost centre preview takes the first token; date values are displayed as dates. A user can confirm a flagged mapping, discard edits, or save. Saving requires all required source fields mapped and forbids two source fields mapping to the same target. The save message says it applies on the next sync, but the mapping is held only in the page's JavaScript state and is not submitted to a connector or persisted across reloads.

### Role access and demo users

Role access & users has **Role permissions** and **Users & assignments** tabs, plus a “Preview access as” selector. The fixed seeded role catalogue includes executive, function manager/member, and Super Admin roles. Select a role to toggle module grants by group or restore that role's default grants. Grants are unioned across the roles assigned to a user. Locked Super Admin grants cannot be edited; the UI prevents removing the final CEO Super Admin assignment.

The users tab searches seeded users, assigns multiple roles, adds users with a name, unique email, optional title, and at least one role, or removes a user after confirmation. The UI prevents duplicate emails and protects the final CEO Super Admin from removal. Previewing a user changes the simulated user in browser storage and reloads the page. Sidebar links are hidden when the user has no corresponding module grant, and direct navigation to a restricted module displays an access-denied screen. Certain roles also have read-only module restrictions, while lifecycle creation has a separate role check.

The grants/users configuration and selected preview identity are stored in `localStorage`, so they survive reloads in that browser. This is presentation-level gating only: there is no server authorization, identity provider, account provisioning, or real user session per managed user. It is not a security boundary.

### Settings boundaries and platform handoffs

The Settings navigation exposes Billing settings and Role access & users. Billing settings are described with the commercial workflow because they define fee, tax, plan, and FX inputs. Access settings affect only the prototype's menu/page presentation; organization-derived capabilities and scopes described in Section 4 are a related but distinct demonstration.

The intended operational chain is operating calendar and SLA policy → estimated or tracked work → external client/vendor systems for source data → platform integration status and field mapping. In this build, seeded configuration and fixtures make the flow explorable, but only selected order-time calculations consume the country calendar directly. There is no background scheduler, durable SLA policy service, multi-tenant integration runtime, OAuth credential management, sync queue processor, audit trail, or server-side permission enforcement. Changes to SLA, calendar, integration mapping, and most settings are ephemeral; role/access state is the notable browser-localStorage exception.

## Documentation complete

The planned feature-and-workflow increments are complete. [SCREENS.md](./SCREENS.md) remains the route-oriented inventory; use this guide for cross-screen flows and prototype boundaries.
