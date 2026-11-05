# Campaign state & outreach contract

## Simple-first UX
Start Campaign via selected Leads, template, LEO or blank. Default editor: Message → Audience → Review. Keep advanced branching behind optional switch. Selected audience IDs must persist. Template card counts must match actual `campaign_steps` definitions.

## Statuses
`draft` → `needs_review` → `ready` → `scheduled` / `queued` → `active` → `completed` / `paused` / `failed`. Distinguish draft saving from launch. A click must never fabricate delivery or activation.

## Pre-launch validations
Product selected, audience exists and eligible, sender OAuth valid, suppression/opt-out/contact verification rules satisfied, message content present, personalization variables resolvable, rate limits and plan entitlements respected. Show audience count, sender, channel, sending window/timezone, estimated billable operations and warnings. Explicit final confirmation before job creation. Scheduling requires future timestamp.

## Worker contract
Use an idempotent send key combining tenant/campaign/contact/step; respect provider throttling, suppression, bounce, unsubscribe, retry/transient vs permanent errors, pause and cancellation. Store provider message IDs and delivery events. Report real opens/replies only if supported by provider and tracking configuration; never imply all channels support the same metrics.
