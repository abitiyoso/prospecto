# Local acceptance — 7 November 2026

Scope: local Next.js application with the selected hosted Elenio backend and a real local 9Router provider. Final production preview: http://127.0.0.1:3000. Earlier regression checks used the same build on port 3001; final Auth and AI checks run on port 3000. No public deployment or payment activation.

| Check | Result / evidence |
|---|---|
| Unit/PostgreSQL security regressions | 77 pass, `tests.txt`; all eleven migrations applied locally, 39 public tables remain RLS-protected |
| TypeScript / optimized build | Pass, `build.txt` |
| Real LEO AI | `leo/results.json`: UI → 9Router `cx/gpt-6-luna` → actual model `gpt-6-luna` → validated citations → saved run → full reload → Apply → explicit campaign Save |
| Auth native browser forms | `auth/results.json`: confirmation ON, unverified login denied, fresh QA signup token, confirmation POST, recovery/password change/new login, old password/replay/CSRF denied |
| Functional workflows | `workflows/results.json`: lists/filter, team roles/removal/revocation, KMS ready state, tenant isolation, private-file backup/restore, missing-file rejection before writes |
| Document runtime | `documents/pdf-results.json`: actual hosted private PDF upload, Next extraction/index/search; presentation suite additionally covers DOCX and XLSX |
| Campaign / SMTP | `presentation/results.json`: one approved self-mail to hello@elenio.id accepted by Hostinger SMTP exactly once, duplicate launch/process, pause/resume, unsubscribe and restore without execution |
| Research | `research/results.json`: actual Firecrawl company/PIC source retrieval, saved evidence, review UI, foreign-tenant denial and login/logout |
| Responsive / approved visuals | `responsive/`, `dev-preview/`, `approved-visuals/`: four viewport widths; approved source/served pixels equal and all six asset hashes equal; no client exceptions/overflow |
| Browser credential boundary | `client-secrets.json`: seven configured server secrets absent from 12 production browser assets |

AI validation rejects refusal, incomplete output, malformed JSON, unknown citations, unsupported variables and subject header injection. An upstream response failed draft validation during live testing and correctly produced `ai_invalid_draft` without a saved successful run. Subsequent real runs completed; the final end-to-end artifact records the successful run. There is no automatic retry, cross-provider failover or template disguised as AI. Provider availability/quota remains required.

Found and fixed a real native-form issue: `no-referrer` makes HTML POST navigation send `Origin: null`. The request guard now permits only POST/document/navigation with browser `Sec-Fetch-Site: same-origin` in that case. Foreign/same-site, missing metadata, non-navigation and GET variants are rejected by tests. The no-referrer policy remains. Sources: [MDN Referrer-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy), [W3C Fetch Metadata](https://www.w3.org/TR/fetch-metadata/).

The Auth lifecycle uses admin-generated tokens for isolated QA accounts; it does **not** prove a new public signup email reached an inbox today. Historical real Hostinger recovery delivery remains documented under `qa/auth-smtp/`. The current campaign SMTP check proves acceptance, not delivered/open/read status. No customer password changed. QA accounts were signed out/banned, private files and sender credentials removed; isolated metadata retained separately.

Remaining: manual hosting/domain/HTTPS/Auth URL setup, relocating/reaching 9Router from hosting, global scheduled worker activation, payment integration (intentionally bypassed), automatic inbox/delivery/open tracking, OCR for scanned PDFs. LinkedIn stays manual. Keys remain only in ignored server environment/encrypted SMTP storage; Git does not carry the credentials.

Hosted security advisor after migration reports only the pre-existing [leaked-password-protection warning](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection); all 39 public tables have RLS. This account setting was not changed by the local AI work.
