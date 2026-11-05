# Architecture, data ownership, security and operations

Repo-first. If architecture is not established, recommend Next.js App Router/TypeScript, Supabase Auth/PostgreSQL/Storage, backend job runner + queue, pluggable Firecrawl, LEO/LLM, Composio, email and payment adapters. Prefer reliable existing services over duplicating infrastructure. Verify current provider docs/changelogs before implementation.

## Data entities (tenant-scoped unless global configuration)
Workspaces, workspace_memberships/roles, products, knowledge_sources/documents/indexing_jobs, company_accounts, account_sources/evidence, pic_candidates, contacts, lead_lists/members, campaign_templates, campaigns, steps, campaign_audience, outbound_events, tasks, provider_connections, research_jobs, ai_generation_jobs, subscription_plans, subscriptions, credit_wallets/buckets, credit_ledger, invoices, payment_transactions/events, consent/suppression_lists, audit_events.

Use `workspace_id`, database foreign keys and membership-based authorization consistently. Add indexes and uniqueness constraints for domain-based company dedupe, email/contact dedupe, campaign+contact+step idempotence, invoice/provider webhook IDs and ledger transaction IDs. Store research provenance URLs/time/confidence and contacts' verification state explicitly.

## Security contract
- RLS on every exposed Supabase tenant table, with membership ownership checks on SELECT/INSERT/UPDATE/DELETE, not merely `TO authenticated`; deny cross-tenant row access in tests. Do not use user-editable `user_metadata` to authorize.
- Secrets, service roles, Firecrawl/Composio/AI/payment tokens only on server; signed OAuth flows + webhook signature verification; scoped storage access and document upload restrictions.
- Prevent cross-tenant KMS/RAG retrieval and prompt injection from untrusted uploaded or scraped content. Restrict export/delete and retention; redact credentials/PII in logs.
- Server-authoritative credit and campaign status; idempotent retries, atomic transactions, race-safe reservations. Rate limits, monitoring, alerts, cancellable jobs, audit logs.
- New users see zero genuine data; fixtures only in explicitly isolated development/test accounts.

## Delivery contract
Migrations + RLS policies, typed service interfaces, `.env.example` with placeholders only, tests and evidence, CI commands, local/staging/prod config boundaries, backups/recovery notes. Update `IMPLEMENTATION_STATUS.md` each phase. Never claim deployment or provider integration success without actual verification.
