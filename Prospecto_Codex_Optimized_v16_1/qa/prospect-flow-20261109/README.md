# Find Prospects flow · 9 November 2026

Browser verification used the existing isolated Prospecto Demo LinkedIn workspace. Before the change, the progress label could mark step 2 while the target form was still visible. The company list, search controls, PIC list, and campaign controls shared a long page. Choosing a saved company left the user among controls for several steps. [Old entry screen](01-before-start.png) · [Old company selection](02-before-company.png) · [Old LinkedIn result](03-before-link.png).

1. **Product and target.** One active screen with a primary continue action. The alternate saved-company action opens the saved list directly. [Target screen](04-after-target.png).
2. **Company.** Web research and saved companies have distinct visible states. A live search returned Microsoft. The review form received focus, and saving selected the company and opened step 3. [Company screen](05-after-companies.png).
3. **PIC.** Saved PICs are visible when the company is selected. A separate live search returned Satya Nadella and opened the review form. The saved card returned an indexed LinkedIn URL. [PIC screen](06-after-pic.png) · [LinkedIn result](07-after-link.png).
4. **Draft review.** Selecting the example PIC carried the selection into the review screen. The example has no business email, so draft creation was disabled. `Lengkapi PIC` returned to the correct company and opened and focused the edit form. The 390 px browser viewport had no page overflow. [Desktop review](08-after-campaign.png) · [Mobile review](09-after-mobile.png).

The initial web run found sources but could not extract a candidate because the local 9Router process was stopped. After restarting it, live company and PIC searches succeeded. Node.js 24 production build and all 86 automated tests passed. Step 4 was exercised with a missing email. The automated suite covers the draft database transaction. Browser accessibility checks covered step focus and viewport reflow.
