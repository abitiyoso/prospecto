# Phase 2 — AI prospect discovery, PIC research and LEO (requires Phase 1 pass)

## Goal
Real public-web prospect research and Product-KMS-grounded LEO recommendations without invented persons, contact details or evidence.

## Implementation
- Product → ICP filter (industry, location, company size, buying signals, keywords, target roles) → cost estimate & max credit budget → asynchronous discovery job.
- Firecrawl public website/company research adapter on backend. Enforce provider terms and website access restrictions. Capture URL, fetch time, evidence excerpt, domain, source confidence, employer context. Deduplicate by verified company domain; fit score must have interpretable factors.
- Async job with status, progress, cancellation/retry/backoff, cost reservation/finalization and no phantom results on failure. Charge only successful configured billable units; follow `docs/contracts/CREDITS_BILLING.md`.
- Company detail: recommend buying-committee **roles** then research **named candidate** from legitimate public sources, showing evidence URL and verified-vs-unverified distinction. State machine: `role_recommended` → `candidate_sourced` → `identity_checked` → `contact_verified` → `approved_for_outreach`. Do not auto-promote stages.
- Emails/phone numbers only when backed by lawful business source/enrichment provider and valid outreach eligibility; user can review, correct and approve. Link to public LinkedIn profiles only where permitted. **Do not implement mass LinkedIn scraping or automated DMs** through Composio.
- KMS pipeline: text extraction, source metadata, workspace/product-scoped index, retrieval with citations, pending/indexing/ready/failed + retry/deletion. Uploaded documents and scraped web are untrusted. No cross-tenant context leakage or instruction override.
- LEO: product/ICP context → suggest industries, role hierarchy, campaign angle, editable content. Provide “apply filters”, “save lead”, or “create campaign draft” actions. No fabricated quotes or performance claims.

## Acceptance
1. Results have evidence URLs and audit logs; zero-source jobs return empty results, not invented accounts.
2. Roles differ visually from sourced people; candidate names and contacts remain unverified until evidence supports them.
3. Job cancel/retry/replay idempotent; estimated/actual credit consumption visible and correct.
4. LEO uses only selected tenant product/KMS; tenant isolation and prompt-injection tests pass.
5. Provider outage produces recoverable failure state and releases reserved credits appropriately.
