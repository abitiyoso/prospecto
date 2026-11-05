# Product scope: Prospecto by Elenio

Product: `prospecto.elenio.id`, multi-tenant B2B SaaS sold to other companies. Each tenant independently defines its own products/services and uploads a private product knowledge base; this is **not** an Elenio-only prospecting tool.

## Primary user journey
Workspace/signup → define product → enrich Product KMS (optional at first) → filter/find companies → shortlist → research decision-makers with public evidence → save verified/approved leads → campaign via LEO/template → review & send through authorized email connection → analytics → subscription/credit management.

## Customer navigation (keep approved layout)
Home · My Products · Find Prospects (includes PIC research) · Leads (includes CSV/XLSX import) · Campaigns (includes LEO/templates and advanced sequence) · Analytics. Account area: Subscription & Credits · Settings (workspace profile, connectable customer accounts).

Home is contextual: first action Add Product, then Find Prospects, then Research PIC / Create Campaign as real progress warrants. **No large mandatory wizard** and no forced email integration before prospect discovery.

## Feature boundaries
- LEO recommends targets, roles, campaign strategies and message drafts using tenant-selected Product/KMS. LEO cannot invent cited product details, real people or contact information.
- Firecrawl runs server-side to research publicly accessible business information; user should not configure Firecrawl.
- Composio is internal integration infrastructure. LinkedIn people scraping/bulk DM are not assumed capabilities.
- Campaign default: simple template/message → audience → review. Advanced conditional sequence is optional.
- Customer pricing model: Growth subscription (~Rp999,000/month) with included usage credits; Pro tier; additional purchased credits. Product/seat/database limits are separate entitlements.
- Visual reference includes filled example figures and companies. New tenant data must begin empty with useful first actions; fixtures allowed only in isolated dev/test setups.
