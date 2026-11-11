# Stage 2 Evidence — Competitive Analysis, UX Contract, Build & Deployment (`TraceGate`)

## 1. Competitor Comparison & Verifiable Sources

We evaluated four direct open-source and commercial ECG paper-digitization and clinical workstation products:

| Product / Repository | Type & Pricing | Core Capabilities | Verified Strengths (What They Do Well) | Verified Limitations & User Friction (With Evidence) | How `TraceGate` Improves Upon It |
|---|---|---|---|---|---|
| **1. `Ahus-AIM/Open-ECG-Digitizer`**<br>https://github.com/Ahus-AIM/Open-ECG-Digitizer | Open-Source Python CLI / PyTorch (CC-BY-SA 4.0) | 12-lead paper ECG perspective estimation and U-Net lead extraction | High accuracy when GPU weights are configured on clean Norwegian hospital scans | • **Non-deterministic outputs**: [Issue #48](https://github.com/Ahus-AIM/Open-ECG-Digitizer/issues/48) documents different reconstructed signals on repeated runs of the exact same image.<br>• **Missing frictionless CSV export & visual overlay**: [Issue #41](https://github.com/Ahus-AIM/Open-ECG-Digitizer/issues/41) & [Issue #38](https://github.com/Ahus-AIM/Open-ECG-Digitizer/issues/38). | `TraceGate` is 100% deterministic (verified by `test_determinism_on_repeated_inference`), runs on CPU & in-browser without GPU weights, overlays the cyan trace directly on the paper scan, and exports calibrated `mV/ms` CSV + WFDB JSON in one click. |
| **2. `felixkrones/ECG-Digitiser`** (PhysioNet 2024 Winner)<br>https://github.com/felixkrones/ECG-Digitiser | Open-Source Python (`nnUNet` + Hough Transform) | Combines Hough grid rotation correction with deep `nnUNet` segmentation | Strong Hough-transform deskewing concept | • **Broken model weight downloads**: [Issues #15, #16, #17, #19, #21, #22](https://github.com/felixkrones/ECG-Digitiser/issues/22) confirm users cannot download the pretrained checkpoints because Git LFS quota is exceeded.<br>• No interactive UI or downstream `QTc`/`QRS` safety gate. | Replaces inaccessible multi-GB `nnUNet` LFS checkpoints with a self-contained chromatic red-grid suppressor + Viterbi dynamic-programming path tracker that runs in `<15 ms` per strip on CPU. |
| **3. `alphanumericslab/ecg-image-kit`**<br>https://github.com/alphanumericslab/ecg-image-kit | Open-Source Python / C++ Toolkit | Synthetic paper ECG distortion generator (wrinkles, shadows, thermal grid) | Industry-standard synthetic degradation taxonomy (used by PhysioNet 2024 Challenge) | • **Digitizer missing from repo**: [Issue #18](https://github.com/alphanumericslab/ecg-image-kit/issues/18) (*"where to find the digitizer script and models mentioned in your paper?"*).<br>• **Security CVEs in dependencies**: [Issue #22](https://github.com/alphanumericslab/ecg-image-kit/issues/22). | Adopts the 5-tier physical distortion taxonomy for held-out evaluation while shipping the complete interactive digitization, sub-mm registration overlay, and GTQI gating workbench. |
| **4. `PMcardio` by Powerful Medical**<br>https://www.powerfulmedical.com/pmcardio/ | Commercial Mobile SaaS ($39–$99/mo) | Smartphone ECG photo classification for OMI / arrhythmias | Fast mobile capture UX for emergency clinicians | • Closed-source black-box classification: does not export calibrated millivolt time-series (`CSV`/`WFDB`) for research or show sub-millimeter trace reconstruction residuals. | Provides transparent sub-millimeter visual trace registration, explicit `GTQI` withhold gating, and open `CSV`/`WFDB` waveform export at $0 cost. |

---

## 2. Prioritized Workflow & UX Problems Identified & Resolved

During Stage 2.2 & Stage 2.4.1 (Frontend-first visual inspection on 1440px desktop and 390px mobile), we identified and resolved the following issues ranked by clinical and user impact:

| Priority | Problem Identified | Why It Matters | Concrete Fix Implemented | Verification Proof |
|---|---|---|---|---|
| **P0 (Critical Clinical Safety)** | Un-gated digitizers output corrupted `QTc` and `QRS` numbers when adjacent leads collide or a paper fold erases ink (Tier 5), risking false long-QT or bundle-branch block alerts. | Hackathon mandate: *"Show where it works and where it fails... Name the conditions under which your result stops being useful."* | Implemented the **Grid & Trace Quality Index (`GTQI`, 0–100)** combining grid periodicity, raw ink contrast, Viterbi continuity, and physiological slew. When `GTQI < 65`, intervals are automatically replaced with `WITHHELD` and the artifact window is highlighted in crimson on the oscilloscope. | Verified in `tests/test_pipeline.py::test_tier5_collision_triggers_gtqi_safety_gate` and `evidence/stage-2-build/frontend/desktop-1440-workbench-withheld.png`. |
| **P0 (Signal Fidelity)** | Initial 20 mm strip height clipped high-amplitude R-peaks (`>1.0 mV`) and quadratic Viterbi transition cost over-penalized steep QRS upstrokes (`SNR = 1.66 dB`). | Clipped R-peaks corrupt R-peak amplitude and QRS onset/offset delineation. | Expanded vertical strip geometry to standard `30 mm` (`-1.1 mV` to `+1.9 mV`) and replaced pure quadratic transition penalty with a **Huber physiological slew regularizer** + sub-sample parabolic Q/R/S/T interpolation. | Held-out gated Viterbi SNR improved from `1.66 dB` to **`18.16 dB`** (`RMSE 37.1 µV`, `Pearson r = 0.9914`, `QRS MAE = 3.5 ms`, `QT MAE = 2.9 ms`). |
| **P1 (Clinical Typography Bug)** | CSS `text-transform: uppercase` on `.clinical-table th` rendered `RMSE (µV)` as `RMSE (MV)` (MegaVolts/milliVolts instead of microVolts). | Caught during Stage 2.4.1 visual screenshot review (`desktop-1440-workbench-pass.png`). Unit ambiguity in cardiology is unacceptable. | Removed `text-transform: uppercase` from `.clinical-table th` in `src/index.css` so `µV`, `ms`, `dB`, and `BPM` preserve exact SI/clinical case. | Verified in updated `desktop-1440-workbench-pass.png` and `desktop-1440-benchmark.png`. |
| **P1 (Control Truncation)** | Equal 4-column grid (`repeat(4, 1fr)`) truncated `"Viterbi DP Tracker (Ours • 31.41 dB)"` in the Extraction Pipeline selector while leaving excess whitespace in 2-digit speed/gain inputs. | Caught during Stage 2.4.1 visual inspection. Users should never have to guess which algorithm is active. | Re-proportioned `.calibration-controls-grid` to `1.72fr 0.72fr 0.72fr 1.08fr` and shortened slider label to `Safety Gate (65/100)`. | Verified in updated `desktop-1440-workbench-pass.png`. |
| **P1 (Zero-Error Static/API Dual Mode)** | Hardcoded Vite proxy to `127.0.0.1:8000` caused browser console `500` errors when running in static preview (`vite preview`) without `uvicorn`. | Caught by `scripts/verify_frontend_ux.mjs`. Any console error breaks production hygiene. | Generated static `/api/health.json` and `/api/benchmark.json` via `scripts/run_evaluation.py` alongside FastAPI `api/index.py` routes and relative `./` paths. | `Console errors: 0 Page errors: 0` across local preview, Vercel, and GitHub Pages. |

---

## 3. Before vs. After Optimization Metrics

### 3.1 User Workflow Efficiency
- **Existing Open-Source CLI Workflow (`Open-ECG-Digitizer` / `ECG-Digitiser`)**:
  - Steps: Clone repo $\rightarrow$ Install CUDA/PyTorch/`nnUNet` $\rightarrow$ Download multi-GB Git LFS weights (currently broken on `ECG-Digitiser` Issue #22) $\rightarrow$ Run CLI script $\rightarrow$ Write custom Python script to plot CSV over original image $\rightarrow$ Run separate fiducial detector (`>6` manual steps, `>20 minutes` setup).
- **`TraceGate` Workbench Workflow**:
  - Steps: Open public URL $\rightarrow$ Select strip or upload scan $\rightarrow$ Click `"Run Calibrated Digitization"` $\rightarrow$ Inspect sub-millimeter cyan overlay & export calibrated CSV/WFDB JSON (**3 steps, `<15 seconds` end-to-end**, zero installation).

### 3.2 Signal Reconstruction & Interval Accuracy (120 Held-Out Strips / 24 Subjects, `seed = 42`)
- **Naive Column-Argmax Baseline**: `SNR = 11.54 dB [10.14–12.93]`, `RMSE = 107.8 µV`, `HR MAE = 7.01 BPM`, `QRS MAE = 6.5 ms`, `QT MAE = 25.7 ms`, `QTc MAE = 28.1 ms`.
- **Chromatic Grid-Suppressed Centroid Baseline**: `SNR = 11.37 dB [10.61–12.15]`, `RMSE = 87.8 µV`, `HR MAE = 1.24 BPM`, `QRS MAE = 5.4 ms`, `QT MAE = 13.2 ms`, `QTc MAE = 17.1 ms`.
- **TraceGate Viterbi DP Continuity Tracker (Ungated, 100% Coverage)**: `SNR = 15.18 dB [14.38–16.01]`, `RMSE = 57.0 µV`, `HR MAE = 0.23 BPM`, `QRS MAE = 3.9 ms`, `QT MAE = 9.6 ms`, `QTc MAE = 10.3 ms`.
- **TraceGate Viterbi DP + GTQI Safety Gate (`GTQI ≥ 65`, 60.0% Coverage)**: `SNR = 18.16 dB [17.63–18.66]`, `RMSE = 37.1 µV`, `Pearson r = 0.9914`, `HR MAE = 0.12 BPM`, `QRS MAE = 3.5 ms [3.19–3.94]`, `QT MAE = 2.9 ms [2.02–3.90]`, `QTc MAE = 3.2 ms`.

---

## 4. Build, Test & Frontend Screenshot Evidence

- **UX Contract**: `design/UX.md`
- **Desktop (1440×900) & Mobile (390×844) Screenshots**:
  - `evidence/stage-2-build/frontend/desktop-1440-workbench-pass.png`
  - `evidence/stage-2-build/frontend/desktop-1440-workbench-withheld.png`
  - `evidence/stage-2-build/frontend/desktop-1440-invalid-input.png`
  - `evidence/stage-2-build/frontend/desktop-1440-empty-state.png`
  - `evidence/stage-2-build/frontend/desktop-1440-benchmark.png`
  - `evidence/stage-2-build/frontend/desktop-1440-methodology.png`
  - `evidence/stage-2-build/frontend/mobile-390-workbench.png` (`scrollWidth: 390 <= clientWidth: 390`)
  - `evidence/stage-2-build/deployed-production-1440.png`
- **Automated Test Suite (`pytest`)**: `5 passed in 1.33s` (`tests/test_pipeline.py`)
- **Production Build (`tsc -b && vite build`)**: Built cleanly in `349ms` with zero TypeScript or bundler errors.

---

## 5. Unresolved Limitations

1. **Single-Lead Strip Scope**: The current pipeline calibrates and tracks single-lead rhythm strips (`2.5s` windows) rather than automatically segmenting a full 12-lead (`3×4`) multi-row page layout.
2. **Severe Multi-Lead Collisions (`Tier 5`)**: When a neighboring lead's high-voltage R-wave physically crosses the target trace, single-path Viterbi tracking can be deflected (`QT MAE = 27.1 ms`). Rather than hiding this limitation, `TraceGate` detects the continuity anomaly (`mean GTQI = 40.6/100`) and withholds automated interval reporting (`0% pass rate at GTQI ≥ 65`).
3. **Planar vs. Non-Rigid 3D Paper Warping**: Deskewing corrects planar rotation (`±5°`), not severe 3D crumpled paper geometry.

---

## 6. Repository & Live Deployment Links (Verified HTTP 200 in Playwright)

- **GitHub Repository (Public, Zero Secrets Verified)**: https://github.com/Georgefifth/tracegate
- **Primary Deployment URL (GitHub Pages — Verified HTTP 200)**: https://georgefifth.github.io/tracegate/
- **Secondary Deployment URL (Vercel Production — Verified HTTP 200)**: https://ai-for-medicine.vercel.app/
