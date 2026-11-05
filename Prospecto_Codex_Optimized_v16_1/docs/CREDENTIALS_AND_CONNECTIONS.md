# Current connections — V8 Phase 4

Supabase Elenio and the server-side Firecrawl key are connected and verified. The application remains local; no payment or outbound campaign was sent.

To complete Phase 4 production payments: select the merchant provider (for example Midtrans/Xendit) and sandbox/production environment; configure server credentials, merchant/account identity and webhook verification material in server secrets; provide the public HTTPS deployment/webhook target. A real adapter must still implement authoritative signature/order/amount/IDR/settlement checks, checkout, reconciliation, renewal/cancellation/refund handling and the scheduled credit worker. No automatic activation follows from merely supplying an API key. Current proposal tariffs and credit rates also need explicit business activation/configuration.

Phase 3 still needs an internal LLM provider and private KMS indexing for LEO, plus permitted sender OAuth/Composio configuration and an authorized Gmail/Outlook sender with suppression/unsubscribe and sending worker. Hostinger mailbox credentials supplied earlier are separate from sender OAuth. Custom Supabase Auth SMTP is now configured and tested using Hostinger SSL 465 and hello@elenio.id. Email confirmation is enabled again. See the latest Auth update in IMPLEMENTATION_STATE.md; older SMTP checklist below is historical.

The historical Phase 1 checklist below is retained for context; statements that later phases have not started are superseded by IMPLEMENTATION_STATE.md.

---
# Connections and remaining credentials

Updated 5 November 2026, Asia/Jakarta. Scope: master prompt, Phase 1 only. Landing page deferred to its separate prompt.

## Already connected and verified

- Supabase project Elenio, ref `qmuwqwzmezbatvatawur`, restored and active. PostgreSQL migrations/RLS/private Storage are applied and tested live.
- The local application has its API URL and publishable key in ignored `.env.local`. No service-role key is required for customer application operations.
- Hostinger business mailbox `hello@elenio.id` is connected. Actual Supabase confirmation and password-recovery messages were received and their links tested successfully.
- Confirmed account `hello@elenio.id` can enter empty-workspace onboarding. The test password was discarded; use **Lupa kata sandi** to set your own password.

No additional credentials are needed for the completed Phase 1 local verification.

## Required before onboarding arbitrary public customers

1. A transactional SMTP account: host, port, username and SMTP password/API-generated SMTP credential; approved From email and sender name. Hostinger can be used if the mailbox/service supports the required transactional volume; another SMTP provider is also supported.
2. Access to [Supabase Auth SMTP settings](https://supabase.com/dashboard/project/qmuwqwzmezbatvatawur/auth/smtp) to save that configuration. The current Supabase connector exposes schema/query tools but no Auth-settings update tool. Alternatively, a properly scoped management API credential may be supplied through an approved secret channel to configure it programmatically.
3. Access to the sending domain's DNS if SPF/DKIM/DMARC verification is required by the chosen SMTP provider.

The connected Hostinger Mail API does not reveal the mailbox's SMTP password. No SMTP password was guessed, extracted from emails or substituted with the mailbox API token. Do not paste passwords in ordinary chat or commit them to this repository; configure them in the provider's SMTP settings/secret interface.

Supabase's built-in sender delivered to the verified mailbox during testing. It restricts recipient addresses and sending volume, so it does not establish support for arbitrary customer addresses. [Official SMTP restrictions and setup](https://supabase.com/docs/guides/auth/auth-smtp).

## Only when deployment is requested

Hosting target/account for the Next.js server, domain/DNS control for `prospecto.elenio.id`, production environment variables and matching Supabase Site URL/redirect allowlist. Deployment was explicitly excluded by the master prompt unless separately authorized; it has not been performed.

No Firecrawl/LLM, sender integration or payment credentials are required for Phase 1. Those are later phases and have not been started.
