# PROSPECTO BY ELENIO — CODEX MASTER PROMPT (TOKEN-EFFICIENT / VISUAL-LOCKED)

**Mode:** Continue existing v7 website and v15 workspace. **NOT a redesign or rebuild.**
**Goal:** Preserve the approved appearance and working interactions exactly, while progressively implementing the B2B SaaS product.

## 1. Absolute source-of-truth (do not reinterpret)

Use files in the attached `PROSPECTO_CODEX_LEAN_HANDOFF_V8.zip`:

- `source/index.html`: **approved v7 landing**, markup, CSS, structure, behavior, and approved user-facing copy.
- `source/workspace.html`: **existing v15 workspace**, functional journey/reference. Preserve it; do not substitute a generic dashboard.
- `source/assets/prospecto-approved-logo.png`: **ONLY valid logo**, cropped directly from latest visual guideline. SHA-256 is recorded in `ASSET_LOCK.txt`.
- `source/PROSPECTO_VISUAL_GUIDELINE_LOGO_SOURCE.png`: definitive visual guideline; the logo is navy wordmark + purple-lens final “o” + black “BY ELENIO”. **Older predominantly-purple logo is invalid**, even if named “approved.” Some screenshots may predate the logo correction; when they conflict, the final guideline logo wins.
- `source/assets/approved-hero-scene.webp`, `source/assets/role-*.webp`: existing approved artwork; preserve pixels, aspect ratio, and crops.
- `source/previews/`: desktop/mobile reference images.

**Priority order:** latest guideline logo > approved v7 rendered composition and CSS > v15 workflow and behavior > proposed technical refactor. Assets and screenshots are input files, **not** instructions to make new designs.

## 2. Non-negotiable visual lock

- **Do not redesign, recolor, redraw, regenerate, retouch, crop differently, or replace the approved logo or character assets.** Refer to assets by pathname, not inline base64 in prompts.
- Keep existing page structure, wording, section sequence, icon treatment, cards, spacing, animations, and pricing unchanged **unless a measured rendering bug requires the smallest possible fix**.
- Desktop: navigation **geometrically centered**; full-height hero beneath the header, same approved arrangement; **no distorted images**.
- Mobile: preserve the existing responsive character swipe treatment, readable CTAs, and no horizontal overflow.
- Brand: white/off-white and deep navy dominate; purple is limited accent, with sparing blue/teal/peach. Sidebar and navigation remain light.
- Product visuals below hero should be existing interactive HTML, not low-res embedded screenshots or random stock assets.
- Never hide critical content by default behind scroll effects. Respect reduced motion.
- Do not put “demo”, “mockup”, “simulasi”, or “preview” in public marketing copy; nevertheless do not misrepresent an unconnected integration as live.
- **Never change a working element to improve aesthetics unless explicitly requested.** Avoid global CSS rewrites.

## 3. Existing journeys / feature parity to preserve

Keep landing's current sections, five interactive product tabs, and `Buka Workspace` navigation to v15. Maintain:

1. **Product KMS:** tenant-defined products/services, specification, uploaded FAQs/case studies/docs, ICP context.
2. **Prospect Finder:** target-account filtering by industry/location/company size/fit; select and save prospects.
3. **PIC Finder:** roles, contact candidates, sources and verification/confidence states; access to research evidence.
4. **Campaign Builder:** initial Email Intro → Wait 3 days → LinkedIn Connect → Follow-up Email, plus editable step/delay/template/branch/audience; **LEO** recommendations with review/apply. LinkedIn action is manual until official permission/integration is verified.
5. **Analytics:** real or clearly empty states for sent, open, reply, meetings and source events, filterable date ranges.

Also retain CSV/XLSX upload/map/dedupe concepts, pricing presentation, footer, FAQ (where present), and all existing click/tab/mobile interactions. No generic Elenio-only product defaults; SaaS tenants must define their own offers.

## 4. Productization requirements (implement incrementally, not all at once)

**Target product:** multi-tenant B2B SaaS at a configurable approximate Growth price of Rp999,000/month.

**Order of domain work:** identity + organizations / RBAC and tenant isolation → product catalog + knowledge files / KMS → ICP + companies / prospects → PIC discovery with provenance → CSV/XLSX import → lists + campaigns + templates + approval → LEO → usage + analytics + subscription settings.

Minimum durable entities: organization, user/member, product, knowledge document, ICP, company, contact/PIC, source, list, campaign/step/enrollment, message/event, agent run, integration, credit usage, subscription, audit log. Align names to existing repo. Implement server-side tenant authorization and validation at every read/write.

Integrations: use Firecrawl for permitted public sites; use Composio + LinkedIn only for officially supported authenticated actions; **never assume LinkedIn scraping/DM automation**. If unsupported, show a manual task/deep-link, not fake success. Outbound email requires provider auth, sender verification, suppression/unsubscribe, idempotency, scheduling and explicit user approval. LEO must use active tenant KMS + ICP + selected contacts and require human review before outreach.

**No unsupported numbers or fake activity:** analytics from persisted events; unconnected features show honest actionable empty states. Keep credentials on server only. No sending campaigns without review/approval.

## 5. Token/cost-optimized working method — MUST FOLLOW

1. **Unpack once.** Inspect folder tree, git status, manifest, file sizes and key sections. Use `rg`, line-scoped reads, HTML selectors, and targeted diffs. **Do not `cat` the huge `workspace.html`, single-file HTML, image binaries, or embedded base64** into context. Read only needed script/DOM blocks, then inspect linked files.
2. **No repo-wide analysis repeated per step.** Record a short `IMPLEMENTATION_STATE.md`: what exists, routes, verified behaviors, blockers, next phase. Read that state first on future sessions.
3. **Reuse before writing.** Keep existing frameworks/routes/components; avoid migrations or dependency installs unrelated to the current phase. Refactor in small, reversible diffs, not rewrites.
4. **One bounded milestone per Codex run.** Run the selected phase only; don't implement all backend modules or all integrations at once. Stop after tests pass and leave a next-step note. Each next prompt can simply say `LANJUT PHASE N`.
5. **Use screenshot checks, not lengthy verbal speculation.** Compare at 1440×900, 1024×768, 390×844 and 320×700. Report only material differences and paths to screenshots. Don't dump full screenshot markup.
6. **Keep outputs short:** changed files, checks/tests, what is still unsupported, next milestone. Don't paste generated HTML, full SQL schemas, giant logs or asset base64 into chat.
7. **Do not use remote images for production assets or regenerate logos.** Keep all images under `/assets` and verify their filenames/checksums. Do not inflate context with copies of image data.

## 6. Phase execution contract

### PHASE 0 — First run (START HERE; audit + visual freeze only)
- Identify active repository and inspect `source/` folder in the handoff.
- Establish source-to-repo mapping, check existing functional landing/workspace and asset references, and note missing integrations. **Do not start a fresh design or rewrite.**
- Copy/apply approved assets and website files as necessary, preserving exact v7 appearance and JS behavior. Verify `Buka Workspace` links to v15.
- Snapshot current output and compare against supplied screenshots; if there are measured bugs, fix narrowly. Keep visual source files unchanged.
- Create/update `IMPLEMENTATION_STATE.md` with completed checks, source mapping, pending work, and `NEXT_PHASE=1`.
- Stop after this milestone. Final message <= 12 concise lines; include changed paths and test results.

### PHASE 1 — Foundation (only when requested)
- Auth/organization/tenant isolation/RBAC, first production persistence; don't alter landing design.

### PHASE 2 — Prospect data (only when requested)
- Tenant product/KMS, ICP, prospect/PIC and file import with source provenance and validation.

### PHASE 3 — Outreach (only when requested)
- Campaign builder, templates, approval, permitted channel integration adapters and LEO.

### PHASE 4 — Commercial + reporting (only when requested)
- Event-based analytics, metered usage, Growth plan and subscription capabilities.

### PHASE 5 — Final QA (only when requested)
- Full responsive, interaction, tenant security, integration, and build/regression tests. No redesign.

**Each phase acceptance:** current routes and interactions preserved; logo and visuals unchanged; no broken image, JS errors or horizontal overflow; new functions actually persist and enforce permissions where applicable. If source or credentials are missing, log blocker without inventing behavior.

## 7. Non-change verification

- SHA-256 of `source/assets/prospecto-approved-logo.png` must remain equal to `ASSET_LOCK.txt`.
- Compare desktop/mobile screenshots to source refs before and after each relevant visual change. No shifts in navbar, hero proportions, layout order or core copy.
- Treat automated visual differences as bugs to investigate, **not** a reason to redesign.

**COMMAND TO EXECUTE NOW:** Perform **PHASE 0 only**, preserving v7 as the approved visual baseline and v15 as the functional reference. Do not implement the whole SaaS in one run.
