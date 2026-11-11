# Stage 3 Real-Browser QA Report — TraceGate

## 1. Test Environment

- **Date**: 2026-11-11
- **Deployed Production URLs Tested**:
  - Primary (GitHub Pages): `https://georgefifth.github.io/tracegate/`
  - Secondary (Vercel Production): `https://ai-for-medicine.vercel.app/`
- **Local Build Tested**: `http://127.0.0.1:4389/` (`vite preview` + FastAPI `tests/test_pipeline.py`)
- **Browser Engine**: Headless **Firefox** (`playwright.firefox`, per `prompts/03-qa.md` requirement)
- **Viewports**:
  - `desktop`: `1440 × 900` (`deviceScaleFactor: 1`)
  - `mobile`: `390 × 844` (`deviceScaleFactor: 2`)
- **Scenario Spec**: `qa/scenarios.md`
- **Runner Script**: `qa/run.mjs`
- **Raw Machine-Readable Outputs**:
  - `evidence/stage-3-qa/results-deployed.json` (`14/14 pass`, `0 console/page/network errors`)
  - `evidence/stage-3-qa/results-local.json` (`14/14 pass`, `0 console/page/network errors`)
  - `evidence/stage-3-qa/results.json`

---

## 2. Executed Scenarios & Pass / Fail / Blocked Summary

- **Total Scenarios Executed per Environment**: `14` (`7 scenarios × 2 viewports`)
- **Deployed Site (`https://ai-for-medicine.vercel.app/` & `https://georgefifth.github.io/tracegate/`)**: **14 Pass / 0 Fail / 0 Blocked**
- **Local Build (`http://127.0.0.1:4389/`)**: **14 Pass / 0 Fail / 0 Blocked**
- **Console Errors / Unhandled Page Exceptions / Failed Requests (5xx/4xx)**: **0**

| Viewport | Scenario ID | Priority | Title & Verified Business Outcome | Status (Deployed) | Status (Local) | Duration (ms) |
|---|---|---|---|---|---|---:|
| `desktop` (1440×900) | `S1-first-visit-and-empty` | **P0** | Landing page renders clinical disclaimer, passes `scrollWidth <= innerWidth + 1` check, switches to Empty State, and recovers default `PTB-XL #00184` strip | **PASS** | **PASS** | 1,452 |
| `desktop` (1440×900) | `S2-core-digitization-e2e` | **P0** | Selects `PTB-XL #01492` (`+4.2°` skew), switches algorithm between `Naive Column-Argmax` (`8.75 dB`) and `Viterbi DP` (`27.7 dB`), toggles deskew, runs calibrated digitization, and exports 625-sample calibrated CSV | **PASS** | **PASS** | 1,389 |
| `desktop` (1440×900) | `S3-safety-gate-withheld` | **P0** | Selects `PTB-XL #09204` (`Tier 5: Severe Lead Collision & Crease`), verifies `GTQI 41/100 (< 65)` safety banner and asserts all 6 clinical interval cards display `WITHHELD` | **PASS** | **PASS** | 1,104 |
| `desktop` (1440×900) | `S4-invalid-input-and-recovery` | **P1** | Enters invalid paper speed (`-15 mm/s`), triggers inline validation error, and recovers standard `25 mm/s, 10 mm/mV` scale via one-click reset button | **PASS** | **PASS** | 1,195 |
| `desktop` (1440×900) | `S5-custom-image-upload` | **P1** | Uploads a real `PNG` paper ECG image via `input[type="file"]`, runs 2D pixel matrix digitization (`digitizeImageDataBuffer`), and verifies `USER-SCAN-01` trace & intervals | **PASS** | **PASS** | 1,312 |
| `desktop` (1440×900) | `S6-benchmark-and-methodology-nav` | **P1** | Navigates to `2. Held-Out Benchmark (120 Strips)`, verifies `18.16 dB` / `37.1 µV` held-out metrics, navigates to `3. Methodology & Safety`, runs deterministic pipeline self-check, and reloads page | **PASS** | **PASS** | 1,620 |
| `desktop` (1440×900) | `S7-keyboard-and-a11y` | **P2** | Verifies `Tab` focus progression across interactive controls, `aria-label` presence on all canvases, and `alt` text on all images | **PASS** | **PASS** | 1,048 |
| `mobile` (390×844) | `S1-first-visit-and-empty` | **P0** | Mobile 390px zero horizontal overflow (`scrollWidth: 390 == clientWidth: 390`), empty state & recovery | **PASS** | **PASS** | 1,410 |
| `mobile` (390×844) | `S2-core-digitization-e2e` | **P0** | Mobile 390px end-to-end strip selection, algorithm comparison, digitization, and CSV export | **PASS** | **PASS** | 1,395 |
| `mobile` (390×844) | `S3-safety-gate-withheld` | **P0** | Mobile 390px `Tier 5` safety gate withhold verification (all 6 interval cards `WITHHELD`) | **PASS** | **PASS** | 1,092 |
| `mobile` (390×844) | `S4-invalid-input-and-recovery` | **P1** | Mobile 390px invalid scale input validation & reset recovery | **PASS** | **PASS** | 1,180 |
| `mobile` (390×844) | `S5-custom-image-upload` | **P1** | Mobile 390px custom PNG upload & pixel matrix digitization | **PASS** | **PASS** | 1,298 |
| `mobile` (390×844) | `S6-benchmark-and-methodology-nav` | **P1** | Mobile 390px Benchmark 2×2 summary cards, Methodology self-check, and reload persistence | **PASS** | **PASS** | 1,590 |
| `mobile` (390×844) | `S7-keyboard-and-a11y` | **P2** | Mobile 390px focus & accessibility attribute verification | **PASS** | **PASS** | 1,021 |

---

## 3. Issues Discovered, Fixed & Regression-Verified During Stage 3 QA

| Issue ID | Severity | Symptom & Repro Steps | Root Cause | Fix Applied | Regression Proof |
|---|---|---|---|---|---|
| **QA-01** | **P0 (Accessibility & Core Flow Selection)** | On initial Firefox QA run (`qa/run.mjs`), `page.getByRole('button', { name: /PTB-XL #01492/i })` timed out in `S2` and `S3` on both desktop and mobile. | In `src/App.tsx`, preset strip `<button>` elements had `role="listitem"`, which overrode their native ARIA `button` role in the browser's accessibility tree (making them invisible to assistive technology button navigation and `getByRole('button')`). | Changed parent container to `role="group" aria-label="Preset PhysioNet ECG Strips"` and removed `role="listitem"` from `<button>`, adding `aria-pressed={isSelected}` instead. | Re-ran `S2` and `S3` on desktop and mobile in headless Firefox: `getByRole('button', { name: /PTB-XL #01492/i })` and `PTB-XL #09204` succeeded immediately. |
| **QA-02** | **P1 (Mobile 390px Responsive Layout)** | On initial Firefox mobile (`390×844`) run of `S6-benchmark-and-methodology-nav`, `getByText(/18\.16 dB/)` failed with: `locator resolved to hidden <div class="interval-value">18.16 dB</div>`. | In `src/App.tsx` (View 2 Benchmark Explorer), an inline `style={{ gridTemplateColumns: 'minmax(260px, 1fr) minmax(0, 2fr)' }}` forced a 2-column horizontal split even on a `390px` viewport, leaving `<80px` for the 4 summary cards (`repeat(4, minmax(0, 1fr))`) and crushing their inner content width to `0px`. | Replaced the inline grid styles with `.benchmark-explorer-grid` and `.benchmark-cards-grid` in `src/index.css` so `<=1024px` stacks vertically and `<=640px` renders a clean 2×2 summary card grid. | Re-ran `S6` on `mobile` (`390×844`) and visually inspected `evidence/stage-3-qa/screens/S6-benchmark-and-methodology-nav-benchmark-view-mobile.png`: all 4 cards (`60%`, `18.16 dB`, `3.5 ms`, `2.9 ms`) are wide and clearly legible. |

---

## 4. Visual Verification & First-Time User Experience Review

We visually inspected the desktop (`1440×900`) and mobile (`390×844`) screenshots in `evidence/stage-3-qa/screens/`:
- `evidence/stage-3-qa/screens/S1-first-visit-and-empty-landing-desktop.png`
- `evidence/stage-3-qa/screens/S1-first-visit-and-empty-empty-state-desktop.png`
- `evidence/stage-3-qa/screens/S2-core-digitization-e2e-digitized-tier2-desktop.png`
- `evidence/stage-3-qa/screens/S2-core-digitization-e2e-csv-exported-desktop.png`
- `evidence/stage-3-qa/screens/S3-safety-gate-withheld-withheld-gate-desktop.png`
- `evidence/stage-3-qa/screens/S3-safety-gate-withheld-withheld-gate-mobile.png`
- `evidence/stage-3-qa/screens/S4-invalid-input-and-recovery-invalid-input-desktop.png`
- `evidence/stage-3-qa/screens/S5-custom-image-upload-custom-upload-desktop.png`
- `evidence/stage-3-qa/screens/S6-benchmark-and-methodology-nav-benchmark-view-desktop.png`
- `evidence/stage-3-qa/screens/S6-benchmark-and-methodology-nav-benchmark-view-mobile.png`
- `evidence/stage-3-qa/screens/S6-benchmark-and-methodology-nav-methodology-view-desktop.png`

### First-Time User Observations
1. **5-Second Comprehension**: The top thermal-paper viewport (`Lead II 25 mm/s 10 mm/mV`) with the glowing cyan reconstructed trace overlaid on the black ink waveform communicates the product's purpose immediately without reading documentation.
2. **Task Efficiency**: Reaching a calibrated digitization result, comparing `Viterbi DP` vs. `Naive Argmax`, and exporting a 250 Hz `CSV` takes 3 clicks (`<15 seconds`).
3. **Error & Safety Transparency**: When `Tier 5 (PTB-XL #09204)` is selected, the right-hand panel immediately turns crimson (`GTQI 41/100 — INTERVALS WITHHELD (< 65)`), draws a red bounding box (`ARTIFACT COLLISION — INTERVALS WITHHELD`) over the corrupted 1.38s–1.92s region on the oscilloscope, and replaces all 6 interval numbers with `WITHHELD`.

---

## 5. Unresolved Issues

- **None** for P0/P1/P2 user flows. All 14 desktop and mobile scenarios pass on both the deployed production site and the local build.
