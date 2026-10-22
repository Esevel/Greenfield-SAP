# Who sees what

Generated from the current `scripts/org-data.js`. If you change the org chart, this table goes out of date. The **Viewing as** switcher always shows the live result.

## Org chart

| Function | Lead | Team lead | Team | Members | Capabilities | Scope |
|---|---|---|---|---|---|---|
| Customer Success | Nalene | — | Key Accounts | Nalene | clients, support, SLA | enterprise |
| | | | General Accounts | Thiva | clients, support, SLA | SMB |
| Partnerships | Matthew | — | Global Partnerships | Kirthinni | vendors, vendor performance | — |
| | | | Control Tower | Siti, Vinh | work orders, SLA, coordination | — |
| Supply Chain | Matthew | — | Procurement | Natasa, Yosefin | vendors, purchase orders, quotes | — |
| | | | Service Delivery | Siti, Justin | work orders, stock, warehouses, shipments | — |
| IT EUC | Karen | Justin | IT Services | Roehl, Jericho, Cassandra, Jerome | support, break-fix, onboarding, rotations, assets | — |
| Finance | Pooja | — | Finance | — | billing, finance reporting | — |

The `mdm` capability still exists but no team has it since IT Engineering was removed.

Matthew is also **Head**, so he sees everything. Everyone also gets the shared capabilities **people** and **integrations**.

## Effective access

Every row below also includes People (joiners, leavers) and Integrations.

| Person | Summary cards | SLA panel | Revenue & margin |
|---|---|---|---|
| Matthew | Revenue this quarter (≈ SGD) · Gross margin · Work orders completed · Tickets · Billable users · Work orders within SLA. Plus quarter commentary, By team tiles, Escalations, Client health | ✓ compact | ✓ compact chart |
| Nalene | Tickets this quarter · Avg first response · Avg resolution · Contracts needing attention · September service reports · Open breaches across clients. Plus Client portfolio, Contracts timeline, Joiners & leavers, My team | — (portfolio instead) | — |
| Thiva | Tickets this quarter · Avg first response · Avg resolution · Contracts needing attention · Joiners · Leavers, SMB clients only | — | — |
| Kirthinni | Hardware delivery on time · Courier deliveries on time · Repair partner turnaround · Disposal certificates on time · Service gaps · Vendor contracts renewing. Plus Country coverage, Vendor contracts and Vendor performance. No People or Integrations. | — | — |
| Siti | Work orders opened · completed · Within SLA · Deliveries this quarter · Delivered on time · Avg hub prep to dispatch | ✓ | — |
| Vinh | Open · New · In progress · Blocked · Delivered, awaiting sign-off · Completed this week. Plus Order fulfillment pipeline, Partner status updates, Priority orders | Pipeline instead | — |
| Natasa, Yosefin | Vendor orders this quarter · POs to place · Late at vendor delivery · Partial deliveries · Restock proposals · Clients over / near cap. Plus Waiting on vendors and Suppliers on my orders. No People or Integrations. | — | — |
| Karen | Tickets this quarter · Avg first response · Avg resolution · Reopened tickets · Repair turnaround · Onboarding set up on time. Plus Support volume and speed chart, SLA by service, ticket categories, team workload, devices and onboarding trends | — | — |
| Justin | Tickets this quarter · Avg first response · Avg resolution · Deliveries this quarter · Delivered on time · Avg hub prep to dispatch | — | — |
| Pooja | Revenue this quarter (≈ SGD) · Gross margin · Outstanding invoices (≈ SGD) · Unbilled charges (≈ SGD) · Overdue invoices · Billing items to review. No By area cards. | — | ✓ with SGD equivalents and margins |
| Roehl, Jericho, Cassandra, Jerome | Unassigned tickets · Breached or at risk · Open tickets · Repairs in flight · Resolved this week · First response in target. Plus Support queue, Repairs in flight, Device work this week | — | — |

## Worth noting

- **Nalene vs Thiva:** same cards, but Thiva's figures only cover SMB clients. Nalene also sees the full SLA panel; Thiva gets SMB-only "at risk" actions instead.
- **Justin:** has team-lead access in IT, but is a member in Service Delivery.
- **Siti:** gets widgets from both her teams, and shared ones (like work orders) appear once.
- **Commercial items** (billing queue, Revenue & margin panel) go to anyone with `billing` (Finance) and the head. CS no longer sees billing. SGD equivalents and margins need `finance_reporting`, which Finance and the head have.
- **Service reports** are a CS task: both CS people get an action for September reports not started or in draft, scoped to their clients.
