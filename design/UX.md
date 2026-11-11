# UX Contract — TraceGate

> Fill this before writing UI code. It is the acceptance contract for the
> frontend: if the implementation does not match this file, the implementation
> is wrong. Keep it short and specific.

## 1. Product

- **One-liner**: Calibrated paper-ECG digitizer that recovers physical millivolt waveforms (`25 mm/s`, `10 mm/mV`), overlays the reconstructed trace onto the paper scan for sub-millimeter visual verification, and gates out unreliable clinical intervals (`HR`, `RR`, `QRS`, `QT`, `QTc`).
- **Primary user**: Emergency & rural clinicians reviewing printed/photographed ECG referral strips, and clinical researchers digitizing archival paper ECG cohorts.
- **Job to be done**: Convert a scanned or photographed paper ECG strip into a verified, physical-unit digital waveform (`mV` vs `ms`) and obtain trustworthy cardiac intervals—or an explicit quality-gate rejection when paper skew, shadow, or lead collision makes interval measurement unsafe.
- **Core success action**: Select a paper ECG strip (or upload a scan/photo) $\rightarrow$ Run Grid-Calibrated Viterbi Digitization $\rightarrow$ Inspect the sub-millimeter cyan trace overlay on the paper scan and export the calibrated CSV/WFDB waveform + verified interval report.
- **What the user should never have to guess**:
  1. Whether the extracted digital waveform actually matches the black ink on the paper (shown directly via the toggleable sub-millimeter cyan registration overlay and residual strip).
  2. What physical scale was used (`mm/s`, `mm/mV`, detected `px/mm` grid pitch, and rotation skew angle in degrees).
  3. Whether the reported `QTc` / `QRS` intervals are safe to trust or withheld due to low **Grid & Trace Quality Index (GTQI < 65)**.

## 2. Core flow

| # | Step | User action | System feedback | Next step is obvious? |
|---|---|---|---|---|
| 1 | Load Paper ECG Strip | Click one of the preset PhysioNet paper ECG strips (Clean, Skewed $+4.2^\circ$, Shadowed, Faded Thermal, or Severe Artifact Collision) or upload a custom PNG/JPG ECG scan | Displays the high-resolution thermal paper image on the registration canvas with detected grid pitch (`px/mm`), skew angle (`°`), and paper speed/gain parameters (`25 mm/s`, `10 mm/mV`) | Yes — Primary CTA `"Run Calibrated Digitization"` is highlighted directly in the workbench header/control bar |
| 2 | Calibrate & Digitize | Click `"Run Calibrated Digitization"` (or switch estimator between **Viterbi DP Tracker**, **Morphological Centroid**, and **Naive Column-Argmax**) | Within 100ms (with visible stage progress), deskews the scan, overlays the recovered cyan digital trace (`mV`) on the original ink, renders the synchronized digital oscilloscope chart (`mV` vs `ms`) with P-QRS-T fiducial markers, and displays the **GTQI Gate Verdict** (`PASS` or `WITHHELD`) | Yes — Overlay opacity/loupe toggles, clinical interval cards (`HR`, `RR`, `QRS`, `QT`, `QTc`), and export buttons appear immediately |
| 3 | Verify & Export / Compare | Hover the **Calibration Caliper Loupe** across QRS/T waves to verify sub-millimeter alignment, compare against ground-truth reference SNR/RMSE (when available), and click `"Export Calibrated CSV"` or `"Export WFDB JSON"` | Downloads the calibrated time-series (`time_ms`, `voltage_mv`, `method`, `gtqi_score`) and confirms export completion with a toast/status banner | Yes — User can switch to another distortion tier or inspect the full Held-Out Evaluation Benchmark tab |

Target: **$\le 3$ steps** and **$\le 30$ seconds** from landing to the verified digital waveform and interval report.

## 3. Pages

| Page / View | Purpose | Primary action | Secondary actions |
|---|---|---|---|
| **1. Digitization Workbench (Default View)** | Calibrate a paper ECG image, visually verify trace registration on the thermal paper canvas, and inspect/export GTQI-gated clinical intervals | **Run Calibrated Digitization** on the active paper ECG strip | Switch preset PhysioNet distortion tier; Upload custom PNG/JPG; Toggle Overlay / Residual heatmap; Switch algorithm (`Viterbi DP` vs `Centroid` vs `Argmax`); Override paper speed (`25`/`50 mm/s`) or gain (`5`/`10`/`20 mm/mV`); Export Calibrated CSV / JSON |
| **2. Held-Out Benchmark & Error Analysis** | Inspect reproducible held-out evaluation across PhysioNet subjects (`PTB-XL` / `MIT-BIH`), comparing SNR (dB), RMSE ($\mu\text{V}$), Pearson $r$, Interval MAE (ms with 95% CIs), and the Accuracy–Availability Gating Curve | **Filter / Inspect Held-Out Benchmark by Distortion Tier & GTQI Gate Threshold** | Adjust live GTQI gate threshold slider (`0–95`) to observe real-time Accuracy–Availability trade-off (Coverage % vs QT/QRS MAE in ms); Inspect failure cases & ablation table; Download full benchmark JSON |
| **3. Methodology, Clinical Safety & Attribution** | Document the mathematical pipeline, explicit failure modes, "Who benefits and who could be harmed", limitations, and PhysioNet / tool attribution | **Run Interactive Calibration Self-Check** (verifies local/API signal pipeline determinism on a reference pulse) | Copy reproducible CLI evaluation command (`python3 scripts/run_evaluation.py`); Read full clinical disclaimer & attribution links |

One primary action per view. Navigation between the three views uses a clean top instrument bar with zero nested drawers or hidden menus.

## 4. Required states

For every view and interactive component:

- [x] **Empty / first visit**: Shows a clear 3-step clinical instrument banner explaining how to select a PhysioNet paper strip or upload a scan, with a one-click `"Load Default PTB-XL Strip"` button and an empty-state state switcher for preview/testing.
- [x] **Loading**: Visible step-by-step signal pipeline indicator (`1. Spectral Grid Pitch` $\rightarrow$ `2. Chromatic Grid Suppression` $\rightarrow$ `3. Viterbi Path Tracking` $\rightarrow$ `4. P-QRS-T Fiducial Gate`), no dead UI.
- [x] **Success (GTQI PASS $\ge 65$)**: Confirms grid calibration (`px/mm`, skew angle), overlays cyan digital trace on paper scan, highlights R-peaks/QRS/T-end markers, and displays verified intervals (`HR` in BPM, `RR`/`QRS`/`QT`/`QTc` in ms) with green instrument badge.
- [x] **Withheld / Safety Gate Triggered (GTQI $< 65$)**: Displays amber/crimson clinical safety banner explaining *why* intervals are withheld (e.g., `"GTQI 42/100 — Severe lead collision / ink dropout detected between 1.4s and 2.1s. Clinical intervals (QRS/QT/QTc) withheld to prevent false prolongation alert"`), while still allowing raw visual inspection of the trace.
- [x] **Error**: Says what happened (e.g., API/processing failure or corrupted image buffer) and provides a one-click `"Retry with Local DSP Fallback"` or `"Reset to Reference Strip"` recovery action.
- [x] **Invalid input**: Points to the exact field or file issue (e.g., unsupported non-image file format, zero-dimension image, or invalid manual calibration scale outside `5–100 mm/s`) with inline validation message.
- [x] **Mobile 390px layout**: Stacked instrument panels, full-width touch-friendly canvas with pinch/scroll pan, 44px+ buttons, and zero horizontal page overflow.

## 5. Design tokens

- **Font family and scale**:
  - UI & Clinical Headings: `'IBM Plex Sans'`, `-apple-system, BlinkMacSystemFont, sans-serif` (`24px/700` view title, `16px/600` panel header, `14px/400` body, `12px/500` clinical labels)
  - Waveform & Numerical Telemetry: `'IBM Plex Mono'`, `'JetBrains Mono', monospace` (`22px/700` primary telemetry readout, `13px/500` tabular benchmark cells, `11px/500` axis & caliper ticks, `font-variant-numeric: tabular-nums`)
- **Spacing scale**: `4px`, `8px`, `12px`, `16px`, `24px`, `32px` (high-density diagnostic workstation grid, `12px–16px` panel padding)
- **Colors**:
  - Background Primary (Workstation Chassis): `#F6F4EE` (Warm Archival Paper Ivory)
  - Background Surface / Instrument Panel: `#FFFFFF` (Pure Clinical Surface)
  - Oscilloscope / Registration Viewport Well: `#0D1518` (Deep Diagnostic Cathode Slate)
  - ECG Thermal Grid Accent: `#D96B52` at `18%` opacity (Authentic 1mm/5mm ECG Thermal Red-Orange)
  - Primary Text: `#11181C` (High-Contrast Carbon Ink)
  - Muted / Secondary Text: `#4F5D65` (Slate Lead)
  - Primary Accent / Calibrated Trace: `#007A78` on light surfaces / `#00E5D1` (Sub-Millimeter Cyan Overlay) on dark registration canvas
  - Baseline Comparator Trace: `#F59E0B` (Amber Reference / Baseline)
  - Gate Pass / Verified: `#15803D` (Clinical Green `#DCFCE7` pill background)
  - Gate Warning / Withheld: `#B45309` (Amber Caution `#FEF3C7` pill background)
  - Danger / Artifact Residual: `#BE123C` (Crimson Alert `#FFE4E6` pill background)
- **Radius and borders**: Crisp instrument geometry — `4px` radius on controls/badges, `6px` radius on panels, `1px solid #D6D3C9` structural hairlines (no blurry heavy drop shadows or rounded pill cards).
- **Button and input height**: Minimum `44px` height on all interactive buttons, strip selectors, and inputs for WCAG / mobile touch compliance.
- **Icon style and stroke**: Clean inline SVG technical vector icons (`1.75px` stroke, square/butt caps matching ECG calibration pulse symbols `1 mV`).

## 6. References

| Reference (URL or screenshot) | What to borrow | What not to copy |
|---|---|---|
| **Schiller SEMA / GE MUSE Cardiology Workstation** (`https://www.schiller.ch/`) | Synchronized split view: original strip on top, calibrated digital rhythm waveform with `P-QRS-T` caliper markers directly below, and tabular interval strip on the right | Legacy Windows 95 chrome, proprietary icons, or multi-level hospital EHR menus |
| **Ahus-AIM / Open-ECG-Digitizer** (`https://github.com/Ahus-AIM/Open-ECG-Digitizer`) | Concept of grid pitch recovery and explicit lead signal extraction from skewed paper scans | CLI-only workflow, lack of visual registration overlay, non-deterministic inference behavior |
| **CARDION** (`https://devpost.com/software/cardion-contactless-heart-rate-measured-honestly`) | Honest scientific reporting: reliability gating (`PASS` vs `WITHHELD`), side-by-side classical vs advanced estimator comparison, and explicit accuracy–availability trade-off curves | Webcam face bounding box layout or dark-mode-only consumer styling |

## 7. Mobile

- **390px layout**: Single-column vertical instrument stack:
  1. Compact sticky top header with `"Run Calibrated Digitization"` CTA (`44px` height).
  2. Horizontal scrollable strip selector pills (touch target `44px` high).
  3. Dual-layer Paper Registration Canvas + Digital Oscilloscope stacked vertically (`width: 100%`, responsive internal DPI scaling).
  4. 2-column grid for Clinical Interval Readouts (`HR`, `RR`, `QRS`, `QT`, `QTc`, `GTQI`).
- **Primary action reachable without horizontal scroll**: Yes (`document.documentElement.scrollWidth <= 390`).
- **What is collapsed or hidden**: Secondary calibration math details and raw CSV preview collapse into an expandable `<details>` accordion on `<768px` viewports.
- **Keyboard behavior**: Numerical scale inputs use `inputmode="decimal"`, all preset strips and algorithm tabs are keyboard-focusable with visible `2px solid #007A78` focus rings.

## 8. Visual direction

- **Three adjectives**: **Calibrated, Tactile-Clinical, High-Precision**.
- **Product archetype**: **Diagnostic Instrument & Signal Registration Workbench (`editor / canvas`)**.
- **Palette and why it fits the domain**: Combines **Archival Thermal Paper Ivory (`#F6F4EE`)** and **Thermal Millimeter Grid Terracotta (`#D96B52`)** with a high-contrast **Cathode Oscilloscope Slate (`#0D1518`)** waveform registration viewport and **Sub-Millimeter Cyan (`#00E5D1` / `#007A78`)** verified trace overlay. This directly mirrors real cardiology paper-to-digital workflows and makes the alignment between black ink on thermal paper and the recovered cyan digital signal unmistakable.
- **Type pairing (max 2 families)**: `IBM Plex Sans` for crisp clinical labels and `IBM Plex Mono` (`tabular-nums`) for every millisecond, microvolt, dB, and BPM measurement.
- **Density**: **High-density clinical instrument** — structured `1px` hairline grid divides the paper registration viewport, synchronized millivolt oscilloscope, GTQI quality gate breakdown, and interval calipers without wasted decorative hero space.
- **Signature element (one thing this product owns)**: **The Dual-Layer Sub-Millimeter Paper-to-Waveform Registration Canvas with Synchronized Crosshair Caliper & Residual Error Strip** — hovering anywhere on the paper ECG image moves a synchronized time/voltage caliper (`t = 1,240 ms`, `V = +0.84 mV`, `|ΔV| = 18 µV`) across both the thermal paper scan and the reconstructed digital waveform below it, showing Naive Argmax spikes vs. Viterbi DP path tracking in real time.
- **Motion rules**: Zero decorative animations. Only functional transitions: instant crosshair tracking (`0ms`), smooth overlay opacity blending (`120ms`), and step-indicator progress during digitization.
- **Rejected clichés**: No purple/blue gradients, no glassmorphism, no 3-column marketing feature cards, no generic SaaS sidebar KPI dashboard, no emoji icons, no abstract AI blobs.

**Generic test:** Could this first screen be dropped into any other SaaS product without looking out of place? **No** — the entire first screen is a calibrated `25 mm/s`, `10 mm/mV` ECG thermal-grid registration workbench with a `1 mV` calibration pulse, synchronized paper-ink-to-cyan-trace overlay, P-QRS-T fiducial calipers, and a GTQI reliability gate.

## 9. UX acceptance

- [x] A first-time user can explain the product's purpose within 5 seconds
- [x] The core task is reachable from the landing page without reading docs
- [x] Every action produces visible feedback within 100ms, or a loading state
- [x] Every error says what happened and what to do next
- [x] Empty states are actionable, not blank
- [x] No dead ends; no unlabeled icon-only buttons
- [x] Desktop and mobile screenshots reviewed side by side
- [x] The flow still works after connecting the real backend
