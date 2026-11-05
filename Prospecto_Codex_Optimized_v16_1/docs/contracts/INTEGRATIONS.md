# Integration capability boundaries

| Service | Ownership | Customer-facing? | Intended use |
|---|---|---|---|
| Firecrawl / web research | Prospecto internal | No | Public company facts, cited PIC candidate evidence |
| LEO LLM / RAG provider | Prospecto internal | LEO UI only | Source-grounded recommendations and campaign drafts |
| Composio | Prospecto internal | No | Approved OAuth integration plumbing |
| Gmail / Outlook | Customer OAuth connection | Yes | Authorized sender account for email campaigns |
| LinkedIn | Optional customer OAuth, only if permissioned | Yes only when supported | Authorized publishing/page analytics; manual outreach tasks where not supported |
| CRM | Optional future connection | Only when implemented | Account/contact sync with appropriate permissions |

Before coding integration: check the provider's *current* APIs, rate limits, granted permissions, privacy/anti-spam requirements. Maintain capability states `available`, `requires_authorization`, `unsupported`. Do not conflate public web search with credentialed LinkedIn data. Do not scrape restricted member profiles, fabricate emails, bypass paywalls or enable bulk private DM without authorization.

Customer may define products, find companies and manage leads **without** first connecting email or LinkedIn. Connect sender only when a launch actually requires it. Missing credentials → clear setup/blocked state and adapter skeleton, not simulated success.
