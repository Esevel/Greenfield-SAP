# Greenfield Admin Portal

A multi-page, clickable operations and administration portal prototype built with Vite, HTML, CSS, and vanilla JavaScript. It demonstrates end-to-end workflows across client people, orders, service delivery, support, inventory, billing, and administration.

## Run locally

```bash
npm install
npm run dev
```

Vite serves the app at `http://localhost:3000`. To create and preview a production build, use `npm run build` and `npm run preview`.

## Start here

- [`docs/FEATURES.md`](docs/FEATURES.md) — feature map, runtime, sign-in, shared navigation, access model, and documentation roadmap.
- [`docs/SCREENS.md`](docs/SCREENS.md) — screen-by-screen inventory and implemented screen behavior.
- [`docs/ROLES.md`](docs/ROLES.md) — role-based access model and API.
- [`docs/ROLE-EXAMPLES.md`](docs/ROLE-EXAMPLES.md) — examples of role-specific dashboard and access behavior.
- [`docs/AGENTS.md`](docs/AGENTS.md) — project conventions and implementation constraints.

The documentation is being expanded incrementally. The feature guide records which workflow groups have been covered so the remaining areas can be documented in focused follow-up increments.

## Product areas

The portal navigation groups screens into:

- **Main:** Dashboard, People.
- **Tracker:** Needs attention, Orders, Quotations, Services, Support.
- **Content:** Catalogue, Assets, Stock, Vendors, Service reports.
- **Commercial:** Clients, Billing.
- **Settings:** Warehouses, SLA configuration, Operating calendar, Integrations, Fees, Role access and users.

The route inventory and descriptions live in [`docs/SCREENS.md`](docs/SCREENS.md).

## Prototype boundaries

This is a browser-side prototype, not a production service. It has no application backend or API integration. Many workflows use seeded demo data and in-page JavaScript; some user, role, or workflow changes persist in browser `localStorage` for the current browser profile. These interactions do not create authoritative business records.

The demo sign-in and role/access controls run entirely in the browser. They are useful for demonstrating navigation and role-specific experiences, but they are **not security controls** and must not be used to protect real data. Production authentication and authorization require a trusted server or identity provider.

## Technology

- Vite development server and multi-page build
- HTML pages with shared markup templates
- CSS design tokens and stylesheets under `styles/`
- Vanilla JavaScript and browser storage for prototype interactions

There is no UI framework, TypeScript, backend, or database.
