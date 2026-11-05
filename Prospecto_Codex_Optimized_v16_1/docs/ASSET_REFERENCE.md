# Asset map and source preservation

The optimized package extracted **12 embedded Base64 occurrences → 9 unique original binary assets**, retaining the exact bytes. `reference-ui/assets/manifest.json` records file names, dimensions and SHA256.

| Asset | Context | Guidance |
|---|---|---|
| `prospecto-logo-approved.png` | Brand logo | Use as-is, never regenerate or redraw |
| `home-hero-professional-workspace.webp` | Home premium wide hero | 1672×941 photo; crop to fit, no stretched text |
| `product-knowledge-workspace.webp` | Product KMS section | Large-context visual only; detailed form must stay HTML |
| `prospect-research-workspace.webp` | Prospect research section | Large-context visual only; lists/scores must stay HTML |
| `campaign-workspace.webp` | Campaign feature visuals | Prefer actual HTML email/sequence previews for small cards |
| `journey-product.webp`, `journey-prospect.webp`, `journey-campaign.webp` | Small onboarding journey visual tiles | Preserve aspect ratio; inspect readability |
| `legacy-hero-portrait.webp` | Older retained reference used by legacy script | Keep for parity until confirmed unused; don't force into hero |

Exact logo and hero bytes were compared against the approved assets in v16.1. Other original embedded assets were extracted without conversion or recompression. Relative paths support opening HTML from disk. Changing or replacing assets is out of scope for Phase 1 unless a demonstrable regression requires it.
