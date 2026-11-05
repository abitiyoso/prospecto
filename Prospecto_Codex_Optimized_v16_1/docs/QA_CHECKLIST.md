# Cross-phase QA acceptance matrix

## Every phase
- [ ] Current repo inspected before modifications; existing functionality preserved.
- [ ] Logo byte-for-byte unchanged, design tokens and six-menu architecture preserved.
- [ ] UI responsive at 360, 390, 768, 1024, 1440; no overflow or clipped controls.
- [ ] No seeded customer prospects, activity, credits or fictitious paid/campaign events.
- [ ] Failed/empty/loading states are clear and all persistent actions are server-verified.
- [ ] Run tests, record commands/output and screenshots in `IMPLEMENTATION_STATUS.md`.

## Phase 1
- [ ] Signup/login/reset/roles/workspace membership enforced.
- [ ] RLS denies cross-workspace product, file, lead and campaign read/write.
- [ ] Product saved → Home next action advances to Find Prospects.
- [ ] Product KMS sources have tenant ownership and valid processing states.
- [ ] CSV mapping/dedupe and authorized export work; corrupt files handled.
- [ ] Leads select → Campaign draft preserves selected contact IDs.

## Phase 2
- [ ] Only sourced company/PIC results with evidence URLs and fetched time.
- [ ] Recommended role distinguished from sourced PIC/contact verification.
- [ ] Async job cancel/failure releases unsettled credits; duplicate requests idempotent.
- [ ] LEO cites current tenant's KMS; no cross-tenant retrieval or prompt override.

## Phase 3
- [ ] Default simple editor, advanced optional; templates/preview count consistent.
- [ ] No launch without validated audience, connected sender, opt-out check, confirmation.
- [ ] Delivery jobs idempotent; bounce/unsubscribe suppression persists.
- [ ] Analytics derive from actual provider events with denominators/filters.

## Phase 4
- [ ] Plans/seats/products/leads/campaign limits enforced independently from credits.
- [ ] Included vs purchased credit bucket, expiry, reservation and refund correct.
- [ ] Webhook signature verified; replay doesn't double grant/payment status.
- [ ] Upgrade/top-up credits not available prior to confirmed payment.
