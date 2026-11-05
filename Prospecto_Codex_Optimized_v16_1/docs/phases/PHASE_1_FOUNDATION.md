# Phase 1 — SaaS foundation (ACTIVE; implement before any other phase)

## Outcome
Authenticated, tenant-isolated Prospecto application using the approved v16.1 visual UI, with real Products/KMS and Leads persistence and the initial Leads→Campaign draft handoff. **No live prospect scraping, outbound mail or payment in this phase.**

## Work packages
1. **Repo discovery and visual inventory.** Inspect existing framework, routes, DB, existing auth, deployment, design tokens. Keep what works; map the six approved menus + account nav from the reference. Create a concise implementation map then immediately implement.
2. **Auth and workspace.** Signup/login/logout/password reset, user/workspace membership, owner/admin/member authorization, invite flow or accurately blocked state; secure sessions. Workspace switch must not leak context.
3. **Product CRUD.** Name, category, pain points, target industry/buyer roles, value proposition, pricing/context, Product KMS sources (upload documents/URL/notes), source metadata, per-product isolation and status. Support PDF/DOCX/TXT where provider supports; safe sizes/types, storage ACL. Indexing state may be `pending` until Phase 2; do not show fake `ready`.
4. **Lead DB.** Companies and contacts under tenant, CSV import + column mapping, validation, dedupe and import report; XLSX if supported by verified parser, export only authorized records. Search/filter and detail persistence. Contact/source/verification states and explicit manual entry.
5. **Campaign draft seed.** Select lead/contact IDs → Create Campaign opens a persisted draft with those exact selected IDs in audience. No sending until Phase 3. Support template preview consistency and draft editing if cheap to implement without sacrificing security.
6. **Progressive home.** New workspace → Add Product. After save → Find Prospects. After eligible leads exist → Create Campaign. Show no fabricated companies, prospect metrics, PICs or delivery events.
7. **Visual parity.** Preserve exact logo/asset bytes and layout while converting to application components. Keep responsive nav, typography, nav hierarchy, banner, form layouts and template cards.

## Data/security (required)
Apply tenant isolation and RLS as `docs/02_ARCHITECTURE_SECURITY.md`, not just client-side filter. Server validates memberships, user roles, file ownership; prevent cross-tenant reads/writes across products, files, leads, campaign drafts. Provide migration files and `.env.example`.

## Exit tests / acceptance
- Brand-new workspace has no visual fixture data.
- Product creation/edit/delete persisted and next action links to Find Prospects.
- KMS uploaded source belongs to correct tenant/product, access denied across tenants.
- CSV map/dedupe report correct; empty, malformed and duplicate inputs handled.
- Selected contacts appear unchanged in campaign draft audience after navigation/reload.
- User A cannot read/write user B workspace data, via frontend or direct API/DB requests.
- Screenshots compare favorably at 390/768/1440 and no viewport overflow.
- No fake external success, paid status, invented PIC or campaign send; UI clearly blocks launch without actual sender integration.
- Tests (unit/integration/E2E where practical) pass. `IMPLEMENTATION_STATUS.md` records evidence, completed migrations, blockers and exact local startup commands.

**Stop when this phase is demonstrably complete.** Do not start Phase 2–4 automatically. To continue, load only the next phase's file and relevant contracts.
