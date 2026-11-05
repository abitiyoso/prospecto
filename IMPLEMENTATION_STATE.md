# Prospecto V8 — Phase 2 prospect data complete

NEXT_PHASE=3

Updated 5 November 2026, Asia/Jakarta. Phases 0 and 1 were completed first. The user's subsequent "ya go" resumed V8 Phase 2 (tenant Product/KMS, ICP, company/PIC provenance and validated file import). The scoped data milestone now passes with manual/public-source records and existing CSV import. The older four-phase v16.1 scope is historical. V8 defines phases 0–5; continue one milestone at a time.

## Active code and source mapping

- Active application: `Prospecto_Codex_Optimized_v16_1/`, existing Next.js 16.4.5/React/Supabase stack. Existing database and working backend preserved.
- Immutable handoff: `PROSPECTO_CODEX_LEAN_HANDOFF_V8/source/`. All original source files are unchanged; every checksum in `ASSET_LOCK.txt` was checked.
- `source/index.html` → active app `public/approved/index.html` → `/` via narrow Next.js rewrite. Phase 0 copy was byte-for-byte identical. Phase 1 changes exactly three nonvisual href destinations: Masuk → `/app`, desktop/mobile Mulai Sekarang → `/app?mode=signup`. All remaining markup, CSS, copy and scripts are preserved. Original source remains unchanged. No JSX conversion or image regeneration.
- `source/workspace.html` → active app `public/approved/workspace.html` → `/workspace.html`. Both landing iframes and existing Buka Workspace overlay load this exact v15 file. Static v15 interactions and fixture data remain an illustrative reference, not the connected tenant backend.
- `source/assets/*` → active app `public/assets/` and `public/approved/assets/`; six assets match the new lock.
- New canonical logo SHA256: `5381ecac311a25b2cd6f2d1341aa822dd787a32c93bc285c5ed5c809f34616e2`. Existing real-app logo pathname is retained as an alias containing these latest approved bytes. The older v16 logo was explicitly superseded by the V8 guideline. Historical reference-ui files were not rewritten.
- Existing real login/tenant workspace moved from `/` to `/app`; components/auth/API/storage/RLS retained. Login, workspace-switch and callback destinations updated to `/app`. Logout still reaches the login screen at `/app`.

## Changed implementation paths

Inside active app: `next.config.ts`; `app/app/page.tsx` (moved from `app/page.tsx`); `app/ui/auth.tsx`; `app/ui/dashboard.tsx`; `app/auth/callback/route.ts`; copied `public/approved/*`, approved `public/assets/*` and logo alias. Regression scripts updated to the preserved `/app` route and the superseding logo contract. Added `scripts/phase0-qa.mts`.

Headers permit only same-origin framing of approved workspace documents, retaining protection on authenticated app routes. Google Fonts imports present in the unchanged source receive narrowly scoped style/font allowances; image assets remain local.

## Passed checks

- Exact served landing/workspace HTML bytes and every original asset-lock checksum.
- Rendered source vs served firstfold **and full-page** screenshots: pixel-exact at 1440×900, 1024×768, 390×844 and 320×700. No horizontal document overflow. Desktop navigation geometrically centered.
- Five product tabs, prospect search, message/sequence editing, CSV file interaction, LEO panel, mobile menu, v15 workspace overlay and Escape dismissal.
- Existing real-app login at `/app`; no client JavaScript exceptions during interaction tests.
- TypeScript and production build pass. Existing unit/PostgreSQL regression tests and production HTTP smoke checks rerun after route separation.
- Evidence: active app `qa/phase0/results.json`, `qa/phase0/regression-tests.txt`, `qa/phase0/source-*-*.png`, `qa/phase0/served-*-*.png`.
- Supplied preview PNGs contain the superseded purple logo. New guideline logo takes precedence as the V8 master requires; the rendered source with latest logo is the comparison baseline.

## Email-verification request — completed

User separately requested temporarily disabling email confirmation for easier login, then approved saving the exact change. After dashboard sign-in, Confirm email was saved OFF on hosted Elenio. Supabase displayed "Successfully updated settings". Independent `/auth/v1/settings` verification returned `mailer_autoconfirm=true`, email auth enabled, and signups enabled. New users can register and sign in without clicking a verification email. Password authentication and tenant RLS remain enforced. No mailbox password was reused as a Supabase account credential, no service-role bypass was added, and no client-side verification bypass was introduced. Evidence: active app `qa/phase0/email-confirmation-setting.json` and `confirm-email-saved.jpg`. Restore Confirm email before requiring verified customer email ownership in production.

Current real account `hello@elenio.id` was already confirmed in the earlier milestone and can use password recovery to set its application password. Existing mailbox credentials are not automatically the application's password. SMTP setup remains a separate pending configuration; the hosted project currently uses the built-in Auth sender. Mailbox confirmation/reset round trip previously passed.

## Phase 1 completion evidence

Reused the working Supabase Auth/session/membership/RLS foundation; no duplicate auth or schema reset. Existing owner/admin/member restrictions and initial persisted products/workspaces are retained. Signup now opens directly from the approved landing and returns an immediate session under the user-approved auto-confirm configuration. `/app` accepts only the `signup` mode explicitly; expired callback links show a clear error rather than silently returning to login.

Live evidence `qa/v8-phase1/results.json` passes five groups: landing login/signup routing; two real new signups without verification; initially empty tenants; database/API cross-tenant read/insert/update/switch denial; authenticated product persistence across reload; logout and subsequent password login. Temporary product content was deleted, sessions signed out, and both isolated QA identities banned indefinitely. Only empty isolated workspace metadata/audit history remains. No plaintext passwords were saved.

Visual regression after the three href changes: screenshots remain pixel-exact with v7 source at 1440×900, 1024×768, 390×844, 320×700. Original six asset hashes, centered navigation, mobile overflow checks, five tabs and v15 reference overlay all pass. TypeScript and production build pass. Existing PostgreSQL role-escalation/member-delete tests remain the role-matrix evidence.

Phase 1 changed paths: served `public/approved/index.html` (three hrefs), `app/app/page.tsx` (signup/expired-link handling), `scripts/foundation-e2e.mts`, and visual-regression expectations in `scripts/phase0-qa.mts`. No landing CSS, artwork, logo, wording or backend schema changed in this milestone.

## Phase 2 completion evidence

Applied hosted migration `20261104234302_prospect_data.sql` after inspecting the existing schema and testing locally in PostgreSQL. Reused existing Products/KMS/private Storage/CSV import/dedupe services. Added tenant/product-bound `icp_profiles`, tenant/company-bound `pic_candidates`, company industry/location/employee-count/source URL/observation metadata, RLS, composite tenant FKs, immutable tenant IDs and audit triggers. `promote_pic` is SECURITY INVOKER and rejects unreviewed candidates or missing business emails; repeated promotion dedupes by the existing tenant/email constraint without overwriting an existing contact.

Connected the existing Find Prospects screen to ICP/company/PIC forms through `app/ui/prospect-data.tsx`. ICP industry/location/employee-range filtering uses saved facts, not an invented score. Unknown employee size never meets a numeric size restriction. Named candidates require a public HTTPS evidence URL; confidence is explicitly a manual assessment, not an AI probability. Candidates remain separate from Leads until explicit manual verification and promotion. Evidence URL and company association survive promotion. URL references are stored, not automatically fetched.

Changed: `lib/prospect.ts`, `lib/domain.ts`, `app/app/page.tsx`, `app/api/command/route.ts`, `app/ui/dashboard.tsx`, new `app/ui/prospect-data.tsx`, scoped additions to `app/globals.css`, migration above, `tests/prospect.test.ts`, updated `tests/database.test.ts`, and `scripts/prospect-e2e.mts`. Landing v7 and original workspace v15 source/visuals were not modified in this phase.

Verification: **28 local tests pass**, TypeScript/production build pass, and **8 live integration groups pass**. Live checks include actual signup/sessions, ICP/company persistence, foreign-tenant ICP/PIC rejection, review-gated/idempotent promotion with provenance, data after reload, and 1440×900 / 1024×768 / 390×844 / 320×700 screenshots with no document overflow. Fixed a measured 9-pixel header overflow at 320 and wrapped long PIC actions; no global visual redesign. Evidence: active app `qa/v8-phase2/results.json`, `tests.txt`, `build.txt`, `prospects-*.png`.

The six isolated QA identities across test iterations are banned. Successful-run and later-retry content was removed through tenant-scoped APIs and sessions signed out. The first failed visual run retains isolated QA fixture rows plus empty/audit metadata; these belong only to banned QA users and are never copied to new customer workspaces. No real customer fixtures were seeded. Hosted security advisor found no new RLS or definer issues; the pre-existing leaked-password-protection warning remains.

## Missing production integrations / next milestone

V7/v15 reference interactions alone do not establish provider integration. The connected application now supports Firecrawl evidence search as described below. Composio/LinkedIn automation, LEO generation, email sending, analytics delivery events, subscriptions and payments remain absent/blocked. No public deployment was performed.

Firecrawl server credentials were subsequently supplied by the user and configured only in ignored `.env.local`; `.env.example` contains an empty placeholder. The key was validated with a small real REST search. It is never exposed to the browser or written to reports. Existing CSV import is supported; XLSX/DOCX parsing and AI indexing remain accurately unavailable. Existing Product KMS files remain private with pending indexing. SMTP configuration remains separate.

## Firecrawl integration — verified live

Added `/api/research` with authenticated product/company membership validation before provider access, same-origin checks, bounded input, a 25-second request deadline and sanitized provider failures. Calls the documented `POST https://api.firecrawl.dev/v2/search` API, requests web results only, excludes LinkedIn, and limits each search to five sources. Company queries use saved ICP/industry/location or the user's keywords. PIC evidence searches are restricted to the selected company's own domain; this is public evidence discovery, not bulk people scraping or automatic contact verification.

Applied hosted migration `20261104235659_research_runs.sql`: RLS-scoped research history, composite product/tenant FK, audit/immutable-workspace triggers, and a transactional reservation function limiting each workspace to three saved requests per minute. Customers cannot edit request timestamps. The UI loads the latest 20 workspace runs; running/failed/empty outcomes remain honest. Provider/API/network errors never return the credential or raw provider error text. Search history follows product deletion by cascade.

`app/ui/research-panel.tsx` provides real company/PIC-source searches, persisted result titles/descriptions/HTTPS URLs and observation times, and explicit review forms. Source text is rendered as escaped text, never executable HTML or LLM instructions. Saving requires the user to enter a supported company/PIC name; page titles are not automatically company names, no names/emails/employee counts are inferred from snippets, and PICs remain unverified candidates. Existing manual verification and Leads promotion rules still apply. No real credits/payments/sent status is fabricated.

Additional changed paths: `lib/research.ts`, `app/api/research/route.ts`, `app/ui/research-panel.tsx`, `app/ui/prospect-data.tsx`, `app/ui/dashboard.tsx`, `app/app/page.tsx`, `lib/domain.ts`, `.env.example`, research migration, `tests/research.test.ts`, updated PostgreSQL tests and `scripts/firecrawl-e2e.mts`. Approved landing, logo and v15 source are unchanged.

Verification: **31 local tests pass**, production build and TypeScript pass. Exact-key scanning found no credential in 13 built client assets. Live `/api/research` testing confirms real company and company-domain PIC searches, persisted results after reload, tenant read and foreign-company denial, manual review with blank identity fields, and no overflow at 1440/390/320 px. Evidence: active app `qa/firecrawl/results.json`, `build.txt`, `tests.txt`, `research-*.png`. Successful QA data was cleaned through authenticated tenant APIs and test identities with prefix `prospecto-research-` banned. Hosted advisors report no new RLS/definer findings; the existing leaked-password-protection warning remains.

API reference checked before implementation: https://docs.firecrawl.dev/api-reference/endpoint/search. The Firecrawl connection is now live locally; it does not activate LEO, KMS indexing, outreach sending or subscriptions.

Next: **V8 Phase 3 — Outreach**, when requested: campaign steps/templates/review, permitted integration adapters and LEO, reusing existing persisted drafts/audience. Real AI generation/sending will require server credentials and authorized sender capability; do not implement billing/payments in this milestone.

