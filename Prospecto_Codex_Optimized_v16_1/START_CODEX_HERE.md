# Paste this into Codex (Phase 1 only)

Build Prospecto by Elenio from the approved v16.1 UI reference in `reference-ui/`.

1. Follow `AGENTS.md`. Inspect the existing repository before modifying it. **Do not redesign Prospecto.** Preserve exact logo and assets, brand tokens, six-menu navigation, all relevant mobile behavior.
2. Read only `docs/00_PRODUCT_SCOPE.md`, `docs/01_UI_CONTRACT.md`, `docs/phases/PHASE_1_FOUNDATION.md`, plus directly relevant architecture/security docs. Search targeted CSS/JS sections as needed; do not dump all source files or image bytes into context.
3. Implement **Phase 1 only**: authenticated multi-tenant workspaces, role/permission enforcement, product + KMS management, leads CSV import/dedupe, selectable leads → campaign draft, and faithful responsive UI. Prefer the existing repo stack; use the suggested Next.js/Supabase approach only when starting fresh.
4. Do not fake Firecrawl results, sourced PICs, LEO completions, email delivery, subscriptions or payments. Do not expose visual fixture data to new tenants. Show honest disabled/connection-required states where backend capabilities are not yet implemented.
5. Run targeted tests: auth, cross-tenant isolation (read/write), product CRUD/KMS, lead import/dedupe, leads→campaign audience, and visual comparisons at 390/768/1440px. Fix failures.
6. Update `IMPLEMENTATION_STATUS.md` with code changed, migrations, evidence, tests (passed/failed), actual blockers and next step. **Stop at Phase 1 exit criteria** and report results. Do not implement Phase 2–4 yet.

Reference UI: `reference-ui/index.html`. Screenshots: `screenshots/`. Project domain target: `prospecto.elenio.id` (do not deploy without authorization).
