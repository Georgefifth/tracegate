# TraceGate — Stage 3 Real-Browser QA Scenarios

## Test Environment
- **Deployed Production URL (Primary)**: `https://georgefifth.github.io/tracegate/`
- **Deployed Production URL (Secondary)**: `https://ai-for-medicine.vercel.app/`
- **Local Build URL**: `http://127.0.0.1:4389/`
- **Viewports Tested**:
  - `desktop`: `1440 × 900` (`deviceScaleFactor: 1`)
  - `mobile`: `390 × 844` (`deviceScaleFactor: 2`)

## Prioritized Scenario List

| ID | Priority | Scenario Title | User Action & Flow | Expected Business Outcome & Assertions |
|---|---|---|---|---|
| `S1-first-visit-and-empty` | **P0** | First visit, clinical disclaimer, and actionable empty state recovery | Load landing page; verify disclaimer, title, zero horizontal overflow; trigger `Empty State` check and click `"Load Default PTB-XL #00184 Strip"` | Disclaimer visible; `scrollWidth <= innerWidth + 1`; Empty State callout appears and hides the viewport; clicking recovery button restores `PTB-XL #00184` with `GATE PASSED (≥ 65)` |
| `S2-core-digitization-e2e` | **P0** | Core task end-to-end: Select skewed ambulance strip, switch extraction algorithm, run calibrated digitization, and export CSV/JSON | Select `PTB-XL #01492 (Lead V2) Tier 2: Rotated & Perspective Skew (+4.2°)`; switch algorithm between `Naive Column-Argmax`, `Chromatic Centroid`, and `Viterbi DP Tracker`; click `"Run Calibrated Digitization"`; click `"Export Calibrated CSV (mV/ms)"` | Skew `+4.2°` and pitch `11.4 px/mm` displayed; switching algorithm updates strip SNR/RMSE telemetry; clicking `"Export Calibrated CSV"` triggers confirmation banner (`Exported 625 calibrated samples (250 Hz)`) |
| `S3-safety-gate-withheld` | **P0** | Clinical safety gate: Severe lead collision & crease (`Tier 5`) withholds `QRS`/`QT`/`QTc` intervals | Select `PTB-XL #09204 (Lead V3) Tier 5`; also test raising the live `Safety Gate` slider on clean/faded strips | `INTERVALS WITHHELD (< 65)` badge and crimson alert (`GTQI 41/100`) appear; all 6 clinical interval cards display `WITHHELD` instead of unsafe numbers |
| `S4-invalid-input-and-recovery` | **P1** | Invalid calibration scale validation & one-click recovery | Enter invalid negative paper speed (`-10 mm/s`) or out-of-range gain (`250 mm/mV`) and click `"Run Calibrated Digitization"`; then click `"Reset to Standard Scale (25 mm/s, 10 mm/mV)"` | `Calibration Input Validation Error` alert appears explaining valid bounds (`5–100 mm/s`, `1–50 mm/mV`); clicking reset restores `25` and `10` and clears the error |
| `S5-custom-image-upload` | **P1** | Custom paper ECG image upload (`PNG`) & real 2D pixel matrix digitization | Upload a synthesized paper ECG PNG buffer via file input (`input[type="file"]`) | File is decoded onto offscreen canvas, digitized via `digitizeImageDataBuffer`, added to strip list as `USER-SCAN-01 (Lead II)`, and displays reconstructed mV trace |
| `S6-benchmark-and-methodology-nav` | **P1** | Navigation across Held-Out Benchmark (120 strips) & Methodology views + reload state check | Switch to `2. Held-Out Benchmark (120 Strips)`, adjust interactive GTQI threshold slider (`0` to `85`), verify 24-subject / 120-strip tables; switch to `3. Methodology & Safety` and run `"Run Deterministic Pipeline Self-Check"`; reload page | Benchmark Availability % and QT MAE update dynamically with threshold slider; Self-Check confirms `Self-Check PASSED: Deterministic Viterbi DP reconstruction verified`; reload returns cleanly with zero errors |
| `S7-keyboard-and-a11y` | **P2** | Keyboard navigation, focus visibility, labeled controls, and canvas accessibility | Press `Tab` across header tabs and strip buttons, activate via `Enter`, verify `aria-label` on canvases, inputs, and logo `alt` text | `document.activeElement` advances through interactive controls; all inputs have associated labels; zero unlabeled buttons or missing `alt` attributes |
