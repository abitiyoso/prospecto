# Subscription & credit business contract (proposal; admin configurable)

| Plan | Monthly price | Included AI research credits | Seats | Product KMS | Lead database | Active campaigns |
|---|---:|---:|---:|---:|---:|---:|
| Growth | Rp999.000 | 200 | 3 | 5 | 1.000 | 5 |
| Pro | Rp1.999.000 | 600 | 8 | 20 | 5.000 | 20 |

Top-up candidates: 100 credits Rp199.000; 300 Rp499.000; 1.000 Rp1.499.000. Do not bake amounts into components: load from server-managed plan/entitlement catalog with effective dates and versioned price IDs.

## Credit model
- One tenant wallet with **two buckets**: monthly-included credits (reset per paid cycle, no rollover) and purchased top-up credits (proposed expiration **12 months** from paid purchase, configurable and visible).
- Spend monthly credits first. Then purchased credits from nearest expiration date. Immutable ledger for grants, reservations, settlements, refunds and expiry, with actor/job/payment references and idempotency keys.
- Per-action server-side versioned `credit_action_rates`, action unit and maximum spend: company research, sourced PIC research, permitted contact verification/enrichment, LEO generation. No invented blanket charge per click. Show estimate/max before costly jobs.
- Reserve before job; settle only real successful billable units; release on failure, cancel or zero results as defined by explicit rate catalog. Never double-charge or allow negative balances. Handle concurrent jobs atomically.
- Free: manual product editing, notes, viewing records, uploading/importing CSV/XLSX, saving drafts. Sending volume and plan capacity limits are **separate entitlements** unless explicitly configured otherwise; buying top-ups cannot bypass seat/lead/product/campaign limits.

## Subscription lifecycle
Statuses as supported by provider: trial / active / past_due / grace_period / canceled / expired. Capture start/paid-through/renewal/end, cancel-at-period-end, upgrade timing, invoice IDs, payment receipt. Grant entitlements and top-up credits only after signed provider webhook confirmed. Webhook events persist unique provider event IDs and are replay-safe. Show IDR and workspace-local dates.

Sidebar: plan name, balance, next renewal; **no pricing**. Full pricing/upgrade/top-up appears only on Subscription & Credits.
