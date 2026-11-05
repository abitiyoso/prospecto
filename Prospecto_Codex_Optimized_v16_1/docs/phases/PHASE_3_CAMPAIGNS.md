# Phase 3 — Campaign execution, authorized senders and analytics (requires Phase 2 pass)

## Goal
Real editable campaigns, permissioned email sending, approved launch steps and actual event-based analytics. Read `docs/contracts/CAMPAIGN_LIFECYCLE.md` and `docs/contracts/INTEGRATIONS.md`.

## Implementation
- Entry from Leads (carry selected audience IDs), template, LEO, or blank. Templates have one source of truth for step count/order/preview/content.
- Default simple flow: message → audience → review. Advanced: multi-step email, wait, condition, manual LinkedIn task, delays/branching. Personalized variables must be validated (`{{first_name}}`, `{{company}}`, `{{sender_name}}` and explicitly configured others).
- LEO draft editable and KMS-grounded. Do not infer unsupported personal facts or promise guaranteed opens/replies.
- Connect Gmail/Outlook account through authorized provider OAuth; request at launch if needed, not at onboarding. Verify sender, audience eligibility, consent/unsubscribe, suppression, bounce, plan entitlements, credits and schedule before final confirmation.
- Real server queue/worker: throttle, idempotent per campaign+contact+step, retry transient failures, suppress hard bounces, enforce sending windows/rate limits and per-provider terms; pause/resume/cancel where supported.
- Status progression Draft → Needs Review → Ready → Scheduled → Active → Completed/Paused/Failed, derived from backend events, not UI click. Display durable logs and error states.
- Track real delivered/sent, bounced, replied, positive replied, meetings, opportunities and funnel metrics; label numerator/denominator and use event timestamps + workspace campaign filters.
- LinkedIn account connection only for currently supported official permissioned actions; manual tasks for personal outreach. No unauthorized auto-DM/scrape.

## Acceptance
1. `Save draft` persists only, cannot send. `Review & launch` blocks if no valid sender, eligible recipients, consent or suppression checks; launch needs explicit confirmation.
2. Selected contact IDs survive across editor/review and campaign creation.
3. Template step count and editable message preview are consistent.
4. Worker retries cannot double-send; hard-bounced/unsubscribed addresses are excluded.
5. Campaign stats reflect backend events only; no fixture analytics in customer workspace.
