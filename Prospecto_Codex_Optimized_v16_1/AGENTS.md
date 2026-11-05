# Prospecto — instructions for coding agents

This repository/package contains the **approved v16.1 UI reference** for Prospecto by Elenio, a multi-tenant B2B prospecting SaaS. This is not an invitation to redesign.

## Read in this order (token-efficient)
1. `START_CODEX_HERE.md` — current scope.
2. `docs/00_PRODUCT_SCOPE.md` and `docs/01_UI_CONTRACT.md` — very short product and brand contracts.
3. `docs/phases/PHASE_1_FOUNDATION.md` — **only** active implementation phase initially.
4. `docs/02_ARCHITECTURE_SECURITY.md` and any linked contract required by the feature being implemented.
5. `reference-ui/index.html` and *targeted* sections of `reference-ui/styles/*.css` / `reference-ui/scripts/*.js` (use symbol search, `rg`, selective line reads). Do **not** print/dump all source files, screenshots or images into chat.

Read later-phase docs only after the previous phase passes its exit tests or when directly resolving a dependency. Check current provider documentation before integrating their APIs.

## Non-negotiable
- Repo-first: inspect existing application, auth, DB and deployment. Extend existing working infrastructure; no destructive reset or duplicate auth stack.
- Preserve approved Prospecto logo byte-for-byte, navy/violet tokens, navigation and responsive UI. Reference screenshot files under `screenshots/`. Do not generate new logos or substitute decorative images.
- Real customer tenants start empty; reference UI's populated content and metrics are **design fixtures only**. Never expose fixture data to paying users.
- Use tenant-isolated backend persistence, server-side authorization and RLS. No secrets on client. Do not treat localStorage as production DB.
- Never fabricate contact identity, research evidence, email deliveries, payments, AI results, or active campaign status. All external actions require actual verified provider capability and permissions.
- Firecrawl/Composio/LLM providers are internal services; the customer Settings screen only exposes connectable accounts. LinkedIn is not a bulk PIC scraping or DM API.
- Keep basic Campaign Builder as the default; advanced conditions/branching behind an optional mode.
- Track each phase in `IMPLEMENTATION_STATUS.md`, noting actual test evidence and blockers. Don't call incomplete work production-ready.

## Completion definition
Current phase implementation, migrations, tests, screenshots and status report must pass the linked phase's exit checklist before moving on. Missing provider credentials → deliver contract/adapter with honest unavailable state, NOT simulated success.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
