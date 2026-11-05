# Phase 1 implementation map

Repository discovery: workspace initially contained only Git metadata. ZIP is the approved visual reference, not an existing backend. Preserve the package and all source assets. Implement a local Next.js App Router/TypeScript application in this package, backed by Supabase Auth, PostgreSQL RLS and private Storage.

- Six primary menus: Home, My Products, Find Prospects, Leads, Campaigns, Analytics. Account: Subscription & Credits, Settings.
- `app/`: server-rendered session gate, authentication routes, tenant-scoped command API and responsive UI components.
- `lib/`: request-scoped Supabase client, validated domain input, CSV parser, authorization.
- `supabase/migrations/`: workspace bootstrap, memberships, products, KMS, companies, contacts, drafts, audience and private Storage ACL.
- `tests/`: actual PostgreSQL execution through PGlite with authenticated roles/RLS, domain validation and API boundary checks.
- `scripts/visual-qa.ts`: isolated, empty-workspace component rendering and screenshots, never fixture data in customer routes.

The connected Supabase account has one inactive project named Elenio; no project is explicitly bound to Prospecto. Do not resume or mutate that project, create billable resources, or deploy. Deliver locally with explicit setup requirements and evidence.
