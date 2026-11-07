# Functional prospect journey — 7 November 2026

The former source-search test did not establish a usable prospect-discovery journey: product/category roles were free text, the saved-company filter looked like the main search, and source review required typing identities from scratch. This milestone fixes those concrete gaps. It does not claim that every business publishes a decision maker or an email address.

## Implemented

- Product category and target-industry choices, with Other/custom values preserved. Multiple buyer roles use a picker plus removable choices; legacy saved strings remain intact. Product save returns the actual ID, so a newly saved product becomes the selected product.
- Login, registration and recovery password show/hide control. It is a non-submit button with an accessible label/pressed state; changing Auth mode resets it to hidden. No password is logged or committed.
- Guided Find Prospects: Start → target → Save target & continue → real web search → review company → save/select company → PIC search → review/save candidate. The visible target is saved before search, preventing stale ICP values from silently being used. Filtering saved companies has a separate, explicit label.
- Firecrawl retrieves search pages and Markdown. The selected 9Router/OpenAI adapter extracts names and roles from those sources. Server validation requires matching evidence, a permitted source/domain and a supported role. Email must appear literally in both the source and candidate quote. Unknown fields from a compatible provider are discarded; omitted source URLs are recovered only from an exact quote match. Current team/management pages are preferred over historical press releases when present.
- Review is prefilled with supported fields; candidates are not automatically verified or promoted. Re-saving the same person/source handles case differences and preserves the existing record. Save is disabled while in flight. Existing RLS, review and business-email requirements remain.

## Verification

| Check | Evidence |
|---|---|
| 81 unit/PostgreSQL tests, TypeScript and production build | `tests.txt`, `build.txt` |
| Real company → real named PIC → persisted candidate/history | `api-results.json`: PT Astra International Tbk, followed by a person/title on its official board profile |
| Browser journey with actual search button and no keyword override | `browser-results.json`: uses saved buyer role, obtains named PIC, opens prefilled review, saves and retains a single record after case-varied repeat |
| Choices and persistence | `product-choices.png`; browser selection of category, industry and a third buyer role survived save and full reload |
| Login/register password controls | `register-password.png`; type changes verified in browser, including hide reset on Auth-mode change |
| Responsive checks | `prospects-360/390/768/1024/1440.png`; no page overflow, and stacked layouts put web search before the saved-company filter |
| Tenant/request boundaries and repeat save | `boundaries.json`; foreign workspace/unknown company rejected before external research |
| Production health, CSRF and worker dry check | `http-smoke.json`; worker processes no queue |
| Server credential boundary | `client-secrets.json`; seven configured secrets absent from 12 production browser assets |

Browser checks were performed through the in-app browser on isolated QA accounts. The main Elenio preview was then reloaded onto the new Find Prospects screen; customer product/ICP data was preserved. Temporary QA credentials were ignored by Git and removed after sign-out/ban. No outreach email or campaign was sent/launched in this milestone. No schema migration was needed: grounded candidate data reuses tenant-bound research results and PIC tables.

## User journey

1. My Products → Add/Edit → choose category, target industry and buyer roles → Save.
2. Find Prospects → Mulai pencarian → set the target → Simpan target & lanjut → Cari perusahaan di web.
3. Tinjau perusahaan → Simpan perusahaan & lanjut PIC. A previously saved company can be selected directly.
4. Cari PIC → Tinjau PIC → Simpan kandidat PIC. Open the public evidence before manually verifying. A verified business email is required for promotion into email Leads/campaigns.

Names/emails may be absent from public sources. A PIC without a published email remains a saved candidate; this release has no licensed contact-database/enrichment provider for otherwise unavailable emails. Empty, unavailable, rate-limited and unreadable-source states are explicit. Historical sources can still be returned when no direct team page is available, so review the source date. No guessed email, invented identity, fit score or automatic send is produced.

Primary references: [Firecrawl search/scrape options and mutually exclusive domain filters](https://docs.firecrawl.dev/api-reference/endpoint/search), [Astra board profile used in live acceptance](https://www.astra.co.id/en/board-of-directors). Hosting/domain, global scheduled worker and payment remain outside this local milestone.
