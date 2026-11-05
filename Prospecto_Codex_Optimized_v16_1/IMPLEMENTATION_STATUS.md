# Current milestone: V8 Phase 4 foundation and reporting

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
