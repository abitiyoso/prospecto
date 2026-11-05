# Phase 1 implementation status

Updated: 5 November 2026, Asia/Jakarta.

**Implemented locally; automated local checks pass. Phase 1 live exit gate is not yet verified. Not deployed or claimed production-ready. Phase 2–4 were not started.**

## Code and migration

- Next.js 16.4.5, React 19.3.1, TypeScript, pinned Supabase SSR 0.12.7 / supabase-js 2.119.0, reproducible lockfile.
- Supabase signup/login/logout/reset/update-password, PKCE callback, verified sessions and refresh proxy. No custom auth replacement.
- Empty workspaces with atomic owner bootstrap, membership switching, owner/admin/member rules and accurately blocked invite flow.
- Product CRUD; private KMS notes/HTTPS references/PDF/TXT upload, signed downloads, failed-upload state and pending indexing.
- Lead CRUD, company association, provenance/manual verification, CSV mapping/validation/dedupe/report, CSV export and pagination beyond API limits.
- Atomic selected-contact campaign draft RPC, persisted exact audience, draft editing/template preview; no send endpoint or active status.
- Approved six-menu/account navigation, responsive shell, contextual Home, exact assets, local Inter, honest empty/disconnected states.
- Bounded streamed requests, same-origin guards, schema validation, composite tenant FKs, immutable workspace IDs, Storage ACL and append-only audit metadata.

Migration: `supabase/migrations/20261104180159_prospecto_foundation.sql`, created with official pinned CLI `supabase migration new`, executed in a clean PGlite PostgreSQL test database.

Nine RLS tables: workspaces, workspace_memberships, products, knowledge_sources, companies, contacts, campaigns, campaign_audience, audit_events. Internal helpers are in non-exposed `private` schema with public EXECUTE revoked. Public campaign/import procedures are SECURITY INVOKER. Private `product-kms` bucket accepts PDF/TXT up to 10 MB. No fixtures, paid balances, delivery events or research results are seeded.

**No hosted migration applied.** Only connected project discovered: inactive `Elenio`, with no explicit Prospecto binding. It was not resumed or modified. No billable resources created. Docker is unavailable, so local Supabase Auth/Storage/PostgREST services could not be started.

## Evidence

| Check | Result | Boundary/evidence |
|---|---|---|
| PostgreSQL migration + tenant RLS | PASS | Actual PostgreSQL via PGlite; harness supplies auth.uid/storage schema contracts |
| Empty workspace/owner bootstrap | PASS | Empty data; creator spoofing denied |
| Cross-tenant reads/writes | PASS | Product read/insert/update/delete, foreign product/source/contact/audience FKs; foreign rows hidden in all tenant tables |
| Roles/audit | PASS | Escalation denied, member delete denied, tenant ID immutable for dual member, append-only audit |
| Product CRUD/KMS | PASS locally | Persisted edits/deletes, pending source status, private object SQL ACL; actual Storage HTTP not verified |
| Import/dedupe | PASS | BOM/quotes/newlines, malformed/empty/oversized CSV, email/company dedupe, rollback |
| Campaign audience | PASS | Exact selected UUIDs read back; foreign/duplicate IDs and active status rejected |
| Validation/request/pagination | PASS | Provenance, file signature/type/size, formula escaping, chunked limits, complete pagination |
| Automated tests | **23 passed / 0 failed** | `qa/phase1/tests.txt` |
| TypeScript/production build | PASS | `qa/phase1/build.txt`; no QA route in production |
| Production HTTP smoke test | PASS | `qa/phase1/production-smoke.txt`: HTTP 200, missing-connection state, security headers, QA routes 404 and CSRF denial |
| Responsive browser | PASS | 8 surfaces × 360/390/768/1024/1440 = 40 checks; no document overflow |
| Screenshots | PASS for captured empty states | 24 captures at 390/768/1440; representative Home and Products manually inspected |
| Form/audience UI payloads | PASS | Isolated browser intercepts responses; not live backend E2E |
| CSRF/missing configuration | PASS | Foreign Origin denied for command/Auth/upload; login disabled when unconfigured |
| Asset integrity | PASS | 9 public assets match reference SHA256, logo byte-for-byte |
| Supabase Auth/direct API E2E | **NOT VERIFIED** | Running configured Supabase project/stack required |
| Storage HTTP upload/download | **NOT VERIFIED** | Local SQL ACL and file validation pass; provider service required |

Machine-readable browser evidence: `qa/phase1/visual-results.json`. QA identities exist only in the temporary isolated harness. Provider Auth, SMTP and actual signed-download behavior are not claimed as tested.

## Visual review

Shell, logo, hero, colors, spacing, hierarchy and responsive layout are preserved. Populated example companies, 188 credits and paid Growth status are replaced with honest empty/disconnected states, so pixel-identical comparison against populated screenshots is not claimed. Home workflow cards explain next actions without fabricated customer records. Template previews show literal variables without generated-personalization claims.

## Remaining Phase 1 exit gate

Configure an actual Prospecto backend or start the supplied Docker-based local config; apply migration; verify signup/confirmation/reset/logout, workspace switching, two-user direct API read/write isolation, and real PDF/TXT upload/signed download. This could not run against the inactive/unbound provider project.

Invites, DOCX parsing and XLSX imports have accurate unavailable states, permitted by the Phase 1 contract. Storage/SQL do not share a transaction; failed uploads retain explicit failed metadata for admin cleanup. No hosted security-advisor pass is claimed because no hosted schema changed. No deployment performed per package prompt.

Startup commands and recovery notes: `README.md`. Do not begin Phase 2 until the remaining live acceptance gate is verified.
