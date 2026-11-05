# Visual QA review

Eight pages captured at 390/768/1440; overflow checked additionally at 360/1024. No client exceptions. All nine immutable asset hashes match.

Inspected Home desktop/mobile and Products mobile against supplied screenshots. Preserved sidebar width, navy/violet hierarchy, hero image/composition, cards, spacing, mobile stacking, swipeable steps and core actions. Corrected close-nav visibility, card-art stacking and local Inter during QA.

Intentional differences: empty workspace, no fake paid plan/credits, no sample companies/contact names or fake ready state. QA workspace name is isolated to the temporary harness. Pixel-diff equivalence is not claimed against populated reference data.

Browser interaction tests inspect product values and exact audience UUIDs with intercepted responses. Persistence/RLS executes the actual migration separately in PGlite. Live Supabase Auth/Storage HTTP remains unverified.

Update 5 November 2026: Supabase HTTP/Auth/Storage and the actual email confirmation/recovery round trip were subsequently verified. See live-results.json and email-results.json; earlier offline limitations above describe the original visual harness only.
