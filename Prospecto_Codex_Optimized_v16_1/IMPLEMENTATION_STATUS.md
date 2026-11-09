# Current milestone: manual production handoff

Hosted 9Router verification. The Elenio endpoint returned model metadata before OAuth but rejected generation because Codex had no active credentials. After Codex was connected, the preview switched to `https://9router.elenio.id/v1` and `cx/gpt-6-luna`. A structured response probe, local preflight, automatic company discovery and PIC research through the actual app API passed. The isolated QA search found Singgahsini and ZIPKOS, then a sourced decision maker at Singgahsini. The server API key is kept in the ignored environment file.

9 November 2026. Find Prospects shows four sequential screens for product and target, company selection, PIC research, and draft review. Desktop and mobile browser checks covered live company and PIC results, indexed LinkedIn lookup, keyboard focus on step and review transitions, and the missing-email guard. Node 24 build, TypeScript and 86 tests passed. [Before and after QA](qa/prospect-flow-20261109/README.md).

9 November 2026. Find Prospects can look up indexed LinkedIn profile URLs for a discovered or saved PIC. The lookup uses search metadata and shows links whose indexed title and employer match the selected person. Both entry points passed live API QA with an isolated workspace. Build and 86 tests passed.

Source package, server preflight and default test recipient policy prepared. 85 tests, build, local preflight, dry worker and production dependency audit passed. Domain, Auth redirect and worker scheduling remain on the final hosting environment. [Upload instructions](MANUAL_UPLOAD.md).

---
# Previous milestone: product fit to selected-PIC campaign

84 tests, TypeScript and production build passed. Real product/KMS search returned company profiles with reasons for fit; selecting one returned a sourced named PIC. Browser verified the email eligibility gate and exact selected audience. A separate QA-only recipient completed real 9Router generation and Hostinger SMTP acceptance. Hosted migration 12 preserves tenant RLS. [QA evidence and limits](qa/product-to-campaign-20261107/README.md).

---
# Historical milestone: guided, grounded prospect discovery

81 tests and production build pass. Category/industry choices, multiple buyer roles, password visibility and the company → named PIC journey are implemented and verified through the actual UI. Saved-filter ambiguity and blank manual-only source review are fixed. No unpublished email or automatic verification is claimed. Evidence, screenshots and limits: [journey QA](qa/journey-20261107/README.md).

---
# Historical milestone: local 9Router AI and end-to-end acceptance verified

7 November 2026: real LEO generation through 9Router (`cx/gpt-6-luna` → `gpt-6-luna`), citations, persistence/reload and campaign Apply/Save pass. Native browser confirmation/recovery POST regression fixed without weakening cross-site denial. 77 tests, TypeScript/build, current Firecrawl/KMS/leads/team/backup tests and one own-mail campaign SMTP acceptance pass. Approved visual comparisons remain exact at four widths. Eleven migrations align; 39 public tables retain RLS. Keys are server-only and excluded from Git. Evidence/limits: [QA acceptance](qa/acceptance-20261107/README.md), [state](IMPLEMENTATION_STATE.md). Domain/hosting and scheduled global worker remain manual; payment stays bypassed. Keep 9Router running for local AI.

---
# Historical milestone: functional cleanup verified

Fixed audited campaign reply/unsubscribe, ICP exclusions and restore bugs. Added safe member role/removal/invite revocation, named lead lists, accurate KMS state and paginated campaign job history. 70 tests plus hosted API/browser checks, TypeScript/build and dependency audit pass. All 39 public tables have RLS. Current evidence and remaining GPT/provider/hosting boundaries: [IMPLEMENTATION_STATE.md](IMPLEMENTATION_STATE.md), `qa/functional-repair/`. No email/campaign was launched by this cleanup's QA; no production deployment.

---
# Historical milestone: functional presentation handoff

Presentation access, private KMS extraction/search (PDF/DOCX/TXT/URL/notes), XLSX, verified-email member invitations, Hostinger SMTP, persistent campaign execution/suppression/unsubscribe, manual outcome provenance, backup/restore and health/worker checks are implemented and verified. 61 tests, TypeScript, production build and dependency audit pass. The main workspace has separate 30-day presentation access and a verified sender; no paid transaction or customer campaign was fabricated. GPT still requires separate OpenAI API credentials and a live-provider test. Domain/hosting/Auth final URLs remain manual, payment deliberately bypassed. See [current state](IMPLEMENTATION_STATE.md) and [upload guide](MANUAL_UPLOAD.md); reports below are historical.

---
# Historical milestone: V8 Phase 4 foundation and reporting

Versioned proposal catalog, trusted credit engine/capacity enforcement, subscription/ledger views and event-based analytics now pass 48 local tests, TypeScript/build, six live browser/API groups, and an actual hosted PostgreSQL transaction test with full rollback. Landing pixels and assets are unchanged. NEXT_PHASE=5. Exact evidence and limits are in IMPLEMENTATION_STATE.md and qa/v8-phase4/.

Merchant verification/checkout/renewal/cancel/refund adapters and scheduled billing worker are not connected. No payment or paid customer state was created. Previous phase reports below are historical; this status supersedes their next-step statements.

---
# Current milestone: V8 Phase 3 authoring and review

Phase 0–2 plus Firecrawl are complete. Phase 3 sequence/templates/personalization/approval now pass 37 local tests, TypeScript, production build and 7 live integration groups. Four desktop/mobile sizes pass with no overflow; landing pixels and assets remain locked. Evidence and exact blockers: IMPLEMENTATION_STATE.md and qa/v8-phase3/results.json. NEXT_PHASE=4.

Actual LEO generation, OAuth sender, suppression/unsubscribe and scheduled delivery worker remain unavailable. No email was sent, campaign activated or AI result invented. All outreach QA content was deleted and all 14 isolated test identities banned. The Phase 1 report below is historical; current state above supersedes its next-step statements.

---
# Phase 1 — exit checks completed

Updated 5 November 2026 (Asia/Jakarta). User selected the existing **Elenio** Supabase project `qmuwqwzmezbatvatawur`. Project restored successfully to ACTIVE_HEALTHY. Local `.env.local` now contains its API URL and publishable key; no service-role key is used. Web application is not deployed. Phase 2–4 have not started.

## Implemented

Supabase Auth login/signup/logout/password reset/update handlers; PKCE callback; request-scoped verified sessions; empty multi-tenant workspaces; owner/admin/member permissions; Product CRUD; private KMS notes/URLs/PDF/TXT; CSV mapping/validation/dedupe/report/export; manual lead verification; selected-lead campaign drafts and persisted exact audience; progressive Home; approved responsive navigation, branding and exact image assets. Invitations, DOCX/XLSX parsing, AI research, sending and payments remain accurately blocked as permitted by the Phase 1 scope.

The project had no public/private application tables before changes. Both migrations were applied to the selected hosted project:

- `20261104180159_prospecto_foundation.sql`: nine RLS tables, composite tenant FKs, immutable tenant IDs, private Storage ACL, atomic import/campaign procedures and append-only audit metadata.
- `20261104223206_prospecto_fk_indexes.sql`: five FK indexes identified by hosted performance advisors. Remaining unused-index notices are informational for this newly populated schema.

## Results

| Verification | Result | Evidence |
|---|---|---|
| Local unit/PostgreSQL tests | 24 passed, 0 failed | `qa/phase1/tests.txt` |
| Production build + TypeScript | PASS | `qa/phase1/build.txt` |
| Production HTTP/session gate/security headers/CSRF | PASS | `qa/phase1/production-smoke.txt` |
| Real Supabase HTTP and application integration | 7 groups PASS | `qa/phase1/live-results.json` |
| Actual confirmation/recovery email round trip | PASS | `qa/phase1/email-results.json`, `email-onboarding.png` |
| Responsive UI | 40 page/viewport checks, 24 screenshots | `qa/phase1/visual-results.json` |
| Approved assets | Nine exact SHA256 matches | Browser QA; original logo preserved |

Live groups cover two real Auth password logins and cookie sessions; empty workspace creation; product edit persistence; direct HTTP/API cross-tenant read/insert/update denial; actual PDF/TXT private uploads and signed downloads; cross-tenant Storage denial; CSV import/dedupe; exact audience persistence and foreign-contact rejection; authenticated browser reload/workspace switch; password update with old-password rejection/new-password login; product/Storage deletion and logout session gate.

Live testing found a real request-origin bug: Next.js normalized the internal hostname to localhost while the browser used 127.0.0.1. The origin check now compares the actual Host and request protocol, rejects foreign/malformed origins, and has a regression test. Auth email redirect URLs and callback redirects use the same actual request origin.

## Security and QA cleanup

Hosted security advisor reports no RLS/security-definer findings. One Auth warning remains: leaked-password protection is disabled. Reference: [Supabase password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). No paid upgrade or project Auth-setting change was made to resolve that warning.

The two temporary QA identities were seeded with locally generated bcrypt hashes; plaintext passwords were never written to disk or SQL. Sessions were signed out and QA identities were then banned indefinitely. Email delivery was subsequently tested separately against the connected business mailbox, as described below.

Nine isolated QA workspaces were emptied through authenticated RLS-scoped APIs. Products, contacts, KMS sources and campaigns are all zero after cleanup. Empty QA workspace metadata and append-only audit records remain isolated from new customer workspaces. An administrative SQL deletion request expired at the connector's native confirmation step, so cleanup used the narrower authenticated QA APIs for content and disabled the identities instead of claiming those metadata rows were deleted. Cleanup evidence: `qa/phase1/live-cleanup.json`.

## Email acceptance completed

Actual signup confirmation was delivered to the connected `hello@elenio.id` mailbox by Supabase Auth. The delivered verification link was accepted by Auth. The application then requested password recovery through its real `/auth/action` endpoint, and the actual recovery email was received in that mailbox. Opening its link in the requesting browser completed the PKCE callback and reached `/auth/password`. A new random password was saved, login succeeded with it, and the account reached empty-workspace onboarding. The application then logged out. Passwords and email tokens were not stored in files or output logs.

Evidence: `qa/phase1/email-results.json` records all six checks as passed. `email-onboarding.png` shows the real confirmed account's empty onboarding. Mailbox UIDs 25 (confirmation) and 26 (recovery) were received on 5 November 2026, Asia/Jakarta. Email bodies and tokens are deliberately excluded from the delivery archive.

The `hello@elenio.id` account now exists and is confirmed. No workspace was created for it. Its temporary test password was discarded; the mailbox owner can use **Lupa kata sandi** to choose a personal password.

Phase 1 implementation and documented exit checks are complete for the local application with the selected hosted backend. The remaining items below are production configuration requirements, not unverified mailbox round trips.

## Production configuration limits

Supabase is currently using its built-in Auth email sender, observed as `noreply@mail.app.supabase.io`. This successfully delivered to the connected business mailbox. It is not a production sender: Supabase documents restrictions to authorized project-team addresses and limited sending volume. Arbitrary customer signup delivery must not be claimed until custom SMTP is configured and tested. See [official SMTP documentation](https://supabase.com/docs/guides/auth/auth-smtp).

Required for public customer onboarding: SMTP host/port/username/password, approved From address/name, appropriate domain DNS verification, and access to configure the project's Auth SMTP settings. The connected Hostinger Mail plugin provides mailbox access, not the mailbox's SMTP password or Supabase Auth configuration permissions. Exact requirements are in `docs/CREDENTIALS_AND_CONNECTIONS.md`.

The application has not been published to `prospecto.elenio.id`. It runs locally with the selected hosted backend. External research, LEO, sending, subscription and payment success are never simulated. Stop at Phase 1 per the master prompt. Phase 2–4 and the separate landing-page brief have not been started.

Run from this folder: `pnpm dev`, then open `http://127.0.0.1:3000`. For fresh checkouts, configure `.env.local` from `.env.example`. Existing local configuration is ignored by Git and excluded from delivery archives. See `README.md` for backup, recovery and startup details. The initial offline-only report is retained as historical evidence in `qa/phase1/STATUS_BEFORE_LIVE.md`.

## Auth update — Hostinger SMTP and email confirmation restored

User explicitly requested restoring email verification, Hostinger SMTP and Indonesian email content. Custom SMTP is now saved/enabled on hosted Elenio: smtp.hostinger.com, SSL port 465, sender hello@elenio.id, display name Prospecto by Elenio. Existing mailbox credential was entered only into Supabase's encrypted SMTP setting, never written to repository/config/logs. Confirm email is ON; independent public Auth settings report mailer_autoconfirm=false.

Found URL Configuration had Site URL http://localhost:3000 and NO redirect allowlist. Saved Site URL http://127.0.0.1:3000 and four narrow local redirect entries: 127.0.0.1/localhost auth/confirm, plus existing 127.0.0.1 auth/callback and its recovery next parameter. A public production origin must replace/add these when deployment is requested; local links need this computer's preview server.

Applied Indonesian confirmation/recovery subjects and HTML from supabase/templates/. New signup/reset/resend requests target /auth/confirm. Token-hash links no longer depend on the initiating browser's PKCE cookie. GET only renders a confirmation button; a same-origin POST to /auth/verify calls Supabase verifyOtp for email/recovery, sets the real session, and redirects to a fixed local destination. Scanners/prefetch do not consume tokens. Old /auth/callback code remains for existing PKCE links. Auth routes use no-store/no-referrer, token input is bounded, and arbitrary redirects/types are rejected. Password page requires an authenticated session; login no longer offers an unsupported direct password-update mode. Added resend-confirmation UI and clearer 429 handling.

Verified actual Hostinger delivery to hello@elenio.id: mailbox UID 29 has the final Indonesian recovery subject/body and exactly one token-hash recovery link. The delivered link passed in a fresh HTTP cookie context without PKCE state, repeated GET did not consume it, POST established a real session and reached Kata sandi baru, replay was rejected, and cross-origin POST was denied. No real user password was changed. A further fresh recovery email was requested successfully for the user after consuming the test link; use the newest message. Do not reuse historical mailbox passwords as application credentials.

Evidence: qa/auth-smtp/results.json, tests.txt (50 tests), build.txt, confirmation-template.png, recovery-template.png and redirect-settings.png. TypeScript/build pass. SMTP/send configuration and templates are saved in the hosted dashboard, not provisioned by SQL migrations. Historical statements that verification is OFF or SMTP is unconfigured are superseded. Existing signup-heavy live QA scripts from the auto-confirm period now require verified disposable mailboxes; do not disable confirmation to make them pass. NEXT_PHASE remains 5; this is a separately requested Auth fix.

## Pre-deploy audit — payments excluded

5 November 2026: 50 tests, TypeScript, production build and seven local production HTTP smoke checks pass; 12 client JS assets contain no Firecrawl server key. Patched the newly observed Zod high-severity advisory by pinning 4.6.6 and updating lockfile; post-patch production audit has zero reported vulnerabilities. Supabase remains ACTIVE_HEALTHY, with only the pre-existing leaked-password-protection warning. SPF/MX/DMARC are present; prospecto.elenio.id DNS name does not exist.

Full public launch remains blocked by production hosting/DNS/HTTPS/Auth redirect configuration, LEO/private KMS indexing, actual campaign sender/worker/suppression and provider events. Invites, XLSX/DOCX support, monitoring/restore/rollback verification, account/global provider-budget controls and migration-history alignment remain release gaps. Payment functionality was excluded from this assessment. Existing local functions may be used in staging/internal testing. See active-app PREDEPLOY_REVIEW.md and qa/final-check/. Do not infer that historical auto-confirm signup E2Es were rerun after email verification was restored. No public deployment was performed; NEXT_PHASE stays 5 pending the remaining release validation.
