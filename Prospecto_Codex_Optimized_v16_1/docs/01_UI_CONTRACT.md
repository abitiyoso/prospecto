# Approved UI / brand — immutable reference

Approved visual source: `reference-ui/index.html` + `reference-ui/styles/`, `reference-ui/assets/`, `screenshots/`.

**Never redraw or regenerate approved logo.** Canonical file: `reference-ui/assets/prospecto-logo-approved.png`. Color system: navy `#0B1E49`, indigo `#30318C`, AI violet `#6951C8`, lavender `#F0EDFA`, off-white `#F9FAFD`, white `#FFFFFF`, text `#111827`, border `#E2E8F0`. Inter font. Target UI color share: ~85% neutral, ~10% navy, ~5% violet.

Keep the current 6 main menus, account sections, layout, content hierarchy, and responsive composition. Cards 14–16px corner radius; buttons 8–10px; regular 8px rhythm. No excessive gradients, glowing AI spheres or generic stock photos. Product KMS, prospect fit scoring, sequence, metrics and statuses remain DOM/components with readable text, not rasterized typography.

Responsive screenshots to compare with output: `screenshots/Home_FINAL_Desktop.png`, `screenshots/Home_FINAL_Mobile.png`, `screenshots/Products_desktop.png`, `screenshots/FindProspects_desktop.png`, `screenshots/Leads_desktop.png`, `screenshots/Campaigns_desktop.png`, `screenshots/Campaign_review.png`, `screenshots/Billing_desktop.png`.

Test at widths 360, 390, 768, 1024, 1440; no horizontal page overflow, clipped portraits/text or unusable touch targets. Images use `object-fit` appropriate to container and never stretch. Mobile may use swipeable previews but core actions remain visible.

**UI fixture rule:** the approved HTML uses sample populated state to show design. Production fresh tenant has no fake PICs, metrics, emails sent, or paid status. Replace with real empty/loading/error/blocked states, not literal customer-facing phrases “demo”, “simulasi”, “placeholder”. Developer QA docs must remain candid about missing integrations.

Source layout may contain historical CSS variable names; preserve the final computed look and brand palette from v16 overrides rather than blindly trusting early legacy names.
