# Phase 4 — Subscriptions, credits, checkout, renewals (requires Phase 3 pass)

Build the commercial capabilities using `docs/contracts/CREDITS_BILLING.md`. Pricing shown in UI is a configurable **business proposal**, not a hard-coded tariff.

## Required
- Growth/Pro product catalog, tenant subscription status, billing period and renewal/date, plan limits, upgrade/downgrade/cancel rules, invoices.
- Paid top-ups with separate expiry bucket, usage history, estimates and capacity notices.
- Indonesian payment provider adapter chosen based on merchant credentials; signed webhooks, replay prevention, idempotent grant after verified settlement only. Never grant credits or paid status client-side.
- Server-authoritative credit reserve/finalize/refund, atomic concurrency controls and immutable usage ledger. Monthly reset on renewal and top-up earliest-expiry consumption policy.
- Grace/past-due/cancelled/expired states; invoices and receipts reflect provider truth.
- Customer Settings = workspace profile and supported connectable accounts. The sidebar Growth plan card **does not display price**. Pricing lives under Subscription & Credits only.

## Acceptance
Upgrade/top-up is not active before payment-confirmed webhook; replay/webhook reorder cannot double-credit. Concurrent research cannot overdraw. Plan limits enforced independently of credit quantity. User sees renewal, bucket balances and expiry correctly in workspace timezone. Refund/failure/rollover/expiry workflows tested.
