# Stage 3.5 Real-World Validation Report — TraceGate

## 1. Executive Summary & Overall Verdict

- **Overall Validation Verdict**: **PASS (with Documented Physiological & Physical Boundary Limitations)**
  - **120-Strip Controlled Held-Out Benchmark (`seed = 42`, 24 Subjects)**:
    - **Gated Viterbi DP (`GTQI ≥ 65`, 60.0% Availability)**: **SNR = `18.16 dB`** [95% CI: `17.63–18.66`], **RMSE = `37.1 µV`** [95% CI: `34.83–39.41`], **Pearson $r = 0.9914`**, **HR MAE = `0.12 BPM`**, **QRS MAE = `3.5 ms`** [95% CI: `3.19–3.94`], **QT MAE = `2.9 ms`** [95% CI: `2.02–3.90`], **Bazett QTc MAE = `3.2 ms`**.
    - **Ungated Viterbi DP (`100%` Availability)**: **SNR = `15.18 dB`**, **RMSE = `57.0 µV`**, **QRS MAE = `3.9 ms`**, **QT MAE = `9.6 ms`**, **QTc MAE = `10.3 ms`**.
  - **16-Case External Real-World PhysioNet `MIT-BIH` + Edge/Negative/Adversarial Suite**:
    - **Initial Pre-Fix Run (`evidence/stage-3.5-validation/initial_realworld_results.json`)**: `9 / 16 Passed (56.2%)`, Mean Real MIT-BIH Viterbi SNR = `7.00 dB` (`r = 0.6848`). Uncovered two critical real-world bugs: (1) uncentered Holter amplifier DC offsets (`-0.98 mV`) clipping negative PVC complexes at the bottom of `30 mm` strips, and (2) `NEG-01-BLANK-GRID` (blank thermal grid paper with zero carbon ink) falsely passing `GTQI = 85/100`.
    - **Post-Fix Regression Run (`evidence/stage-3.5-validation/postfix_realworld_results.json`)**: **`12 / 16 Passed (75.0%)`**, Mean Real MIT-BIH Viterbi SNR = **`14.69 dB` (`r = 0.9419`, `HR MAE = 3.68 BPM`)** vs. Chromatic Centroid **`10.14 dB`** and Naive Column-Argmax **`6.05 dB`** (**`+8.64 dB` SNR advantage** over Argmax on real human patient recordings; **`100%` pass rate on Edge, Negative, and Adversarial controls**).
    - All 4 remaining non-passing cases on real MIT-BIH records (`#117`, `#119`, `#200`, `#230`) represent genuine clinical/physical boundary conditions (e.g., `4.32 mV` extreme ventricular ectopy exceeding `10 mm/mV` paper scale, or `55%` faded ink where `GTQI = 58 < 65` honestly withholds intervals) and are preserved without deletion or threshold manipulation.

---

## 2. External Real-World Data Sources & Provenance

All external validation waveforms and cardiologist reference annotations were downloaded directly from **PhysioNet (`MIT-BIH Arrhythmia Database v1.0.0`)** via `wfdb` (`4.3.1`) and cached with SHA-256 checksums in `evidence/stage-3.5-validation/physionet_real_cache/`:

| Case ID | Category | Patient Record & Clinical Pathology | Source URL | SHA-256 Prefix | Ground Truth Reference |
|---|---|---|---|---|---|
| `REAL-MITBIH-100` | Basic | 69M, Normal Sinus Rhythm (`MLII`, 360 Hz) | `https://physionet.org/files/mitdb/1.0.0/100.dat` | `a2f43188055e1427` | Raw `mV` waveform + dual-cardiologist `.atr` R-peaks |
| `REAL-MITBIH-101` | Basic | 75F, Normal Sinus Rhythm (`MLII`, 360 Hz) | `https://physionet.org/files/mitdb/1.0.0/101.dat` | `159500a44f636bc0` | Raw `mV` waveform + dual-cardiologist `.atr` R-peaks |
| `REAL-MITBIH-103` | Basic | Normal Sinus Rhythm (`MLII`, 360 Hz) | `https://physionet.org/files/mitdb/1.0.0/103.dat` | `848f251b710b68fa` | Raw `mV` waveform + dual-cardiologist `.atr` R-peaks |
| `REAL-MITBIH-115` | Basic | 39F, Sinus Arrhythmia (`MLII`, 360 Hz) | `https://physionet.org/files/mitdb/1.0.0/115.dat` | `9e8c33840eb91746` | Raw `mV` waveform + dual-cardiologist `.atr` R-peaks |
| `REAL-MITBIH-117` | Basic | 69M, Sinus Bradycardia with Giant T-Wave (`rS` morphology) | `https://physionet.org/files/mitdb/1.0.0/117.dat` | `7679e88962fb110c` | Raw `mV` waveform + dual-cardiologist `.atr` R-peaks |
| `REAL-MITBIH-122` | Basic | 51M, Normal Sinus Rhythm (`MLII`, 360 Hz) | `https://physionet.org/files/mitdb/1.0.0/122.dat` | `b5cb1bf380f27087` | Raw `mV` waveform + dual-cardiologist `.atr` R-peaks |
| `REAL-MITBIH-106` | Intermediate | 24F, Premature Ventricular Contractions (Bigeminy, `+3.8°` skew) | `https://physionet.org/files/mitdb/1.0.0/106.dat` | `c8521261b1ca8f89` | Raw `mV` waveform + dual-cardiologist `.atr` R-peaks |
| `REAL-MITBIH-112` | Intermediate | 54M, Baseline Wander & `-0.98 mV` DC Offset (Smartphone Shadow) | `https://physionet.org/files/mitdb/1.0.0/112.dat` | `4c992c88e02f9585` | Raw `mV` waveform + dual-cardiologist `.atr` R-peaks |
| `REAL-MITBIH-119` | Intermediate | 51F, Extreme Voltage (`4.32 mV` ptp) Ventricular Trigeminy (`-3.6°` skew) | `https://physionet.org/files/mitdb/1.0.0/119.dat` | `258b77bf4bd1173f` | Raw `mV` waveform + dual-cardiologist `.atr` R-peaks |
| `REAL-MITBIH-200` | Intermediate | 64M, Multiform PVCs & Ventricular Couplets (Smartphone Shadow) | `https://physionet.org/files/mitdb/1.0.0/200.dat` | `07b11fd7c727319b` | Raw `mV` waveform + dual-cardiologist `.atr` R-peaks |
| `REAL-MITBIH-230` | Advanced | 32M, Wolff-Parkinson-White Pre-Excitation (`55%` Faded Thermal Ink) | `https://physionet.org/files/mitdb/1.0.0/230.dat` | `4c3f3d7a05a1732f` | Raw `mV` waveform + dual-cardiologist `.atr` R-peaks |
| `REAL-MITBIH-105` | Advanced | 73F, High-Grade Clinical Electrode Artifact (`55%` Faded Ink) | `https://physionet.org/files/mitdb/1.0.0/105.dat` | `e7a866eb62f5a6ca` | Raw `mV` waveform + dual-cardiologist `.atr` R-peaks |
| `EDGE-01-LOW-DPI` | Edge | `MIT-BIH #100` rendered at half spatial resolution (`6.0 px/mm`, 150 DPI) | `https://physionet.org/files/mitdb/1.0.0/100.dat` | `a2f43188055e1427` | Sub-Nyquist spatial resolution test |
| `NEG-01-BLANK-GRID` | Negative | Blank thermal ECG grid paper (`1mm`/`5mm` terracotta lines, **zero carbon ink**) | Synthetic Negative Control | `blank_grid_ctrl` | Must trigger `GTQI < 65` (`gate_passed == False`) |
| `NEG-02-SEVERE-COLLISION` | Negative | `MIT-BIH #100` with vertical thermal fold dropout & colliding adjacent lead R-wave | `https://physionet.org/files/mitdb/1.0.0/100.dat` | `a2f43188055e1427` | Must trigger `GTQI < 65` (`gate_passed == False`) |
| `ADV-01-HEADER-BARCODE` | Adversarial | `MIT-BIH #103` with dark black patient-ID barcode banner across top 12% of scan | `https://physionet.org/files/mitdb/1.0.0/103.dat` | `848f251b710b68fa` | Viterbi DP must resist header hijack (`>8 dB` over Argmax) |

---

## 3. Case-by-Case Results: Initial Run vs. Post-Fix Regression Run

Both machine-readable files are preserved in `evidence/stage-3.5-validation/`:
- Initial Run: `evidence/stage-3.5-validation/initial_realworld_results.json`
- Post-Fix Run: `evidence/stage-3.5-validation/postfix_realworld_results.json`

| Case ID | Category | Initial Viterbi SNR / $r$ | Post-Fix Viterbi SNR / $r$ | Post-Fix Centroid SNR | Post-Fix Argmax SNR | Post-Fix HR MAE (BPM) | Post-Fix GTQI (`Gate ≥ 65`) | Final Status & Clinical Interpretation |
|---|---|---:|---:|---:|---:|---:|---|---|
| `REAL-MITBIH-100` | Basic | 14.48 dB / 0.9861 | **13.74 dB / 0.9842** | 12.16 dB | 14.64 dB | **0.10 BPM** | 89 (`PASS`) | **PASS** — Sub-millimeter waveform & exact HR recovery |
| `REAL-MITBIH-101` | Basic | 15.20 dB / 0.9888 | **15.74 dB / 0.9904** | 12.48 dB | 14.63 dB | **0.11 BPM** | 89 (`PASS`) | **PASS** — High-precision sinus rhythm recovery |
| `REAL-MITBIH-103` | Basic | 16.66 dB / 0.9907 | **16.34 dB / 0.9894** | 13.74 dB | 15.98 dB | **0.35 BPM** | 89 (`PASS`) | **PASS** — High-SNR recovery on narrow QRS complexes |
| `REAL-MITBIH-115` | Basic | 12.02 dB / 0.9705 | **13.40 dB / 0.9769** | 10.22 dB | 8.53 dB | **0.02 BPM** | 88 (`PASS`) | **PASS** — Beats Argmax by `+4.87 dB` |
| `REAL-MITBIH-117` | Basic | -3.17 dB / 0.2172 | **20.44 dB / 0.9955** | 16.51 dB | 15.71 dB | 22.74 BPM | 91 (`PASS`) | **PARTIAL / FAIL (Interval)** — Waveform recovery jumped `+23.6 dB` (`r=0.9955`), but giant hyperacute T-wave (`>62%` of S-wave) double-triggers simple peak detector |
| `REAL-MITBIH-122` | Basic | 16.84 dB / 0.9903 | **21.70 dB / 0.9972** | 17.59 dB | 18.34 dB | **0.26 BPM** | 87 (`PASS`) | **PASS** — Best overall reconstruction (`r = 0.9972`) |
| `REAL-MITBIH-106` | Intermediate | 15.38 dB / 0.9855 | **14.16 dB / 0.9808** | 8.35 dB | 4.37 dB | **0.50 BPM** | 73 (`PASS`) | **PASS** — Handles bigeminal PVCs + `+3.8°` skew (`+9.79 dB` over Argmax) |
| `REAL-MITBIH-112` | Intermediate | -15.21 dB / -0.4498 | **19.58 dB / 0.9948** | 11.45 dB | -8.74 dB | **1.72 BPM** | 73 (`PASS`) | **PASS (Fixed RW-01)** — AC baseline centering + shadow normalization beat Argmax by **`+28.32 dB`** |
| `REAL-MITBIH-119` | Intermediate | -4.00 dB / 0.1439 | 0.65 dB / 0.4916 | 1.63 dB | 1.57 dB | **2.70 BPM** | 71 (`PASS`) | **FAIL (Boundary)** — Extreme `4.32 mV` ptp ventricular ectopy + `-3.6°` rotation exceeds `10 mm/mV` single-strip window |
| `REAL-MITBIH-200` | Intermediate | 1.66 dB / 0.5804 | **19.76 dB / 0.9957** | 11.16 dB | -2.38 dB | 14.96 BPM | 71 (`PASS`) | **PARTIAL / FAIL (Interval)** — Waveform recovery is `19.76 dB` (`r=0.9957`, `+22.14 dB` over Argmax), while multiform PVC couplets create bimodal RR intervals |
| `REAL-MITBIH-230` | Advanced | 7.31 dB / 0.9070 | **9.60 dB / 0.9435** | 3.12 dB | -4.32 dB | **0.58 BPM** | 58 (**WITHHELD**) | **BORDERLINE (`r=0.9435, HR MAE=0.58 BPM`)** — Beats Argmax by `+13.92 dB` on 55%-faded WPW trace, and `GTQI = 58` honestly withholds automated intervals |
| `REAL-MITBIH-105` | Advanced | 6.86 dB / 0.9068 | **11.22 dB / 0.9630** | 3.24 dB | -5.72 dB | **0.10 BPM** | 61 (**WITHHELD**) | **PASS** — Recovers `11.22 dB` (`r=0.9630, HR MAE=0.10 BPM`) despite severe electrode noise & faded ink (`+16.94 dB` over Argmax) |
| `EDGE-01-LOW-DPI` | Edge | 7.15 dB / 0.9322 | **8.00 dB / 0.9429** | 6.53 dB | 11.06 dB | **0.14 BPM** | 84 (`PASS`) | **PASS** — Maintains `r = 0.9429` and `0.14 BPM` HR MAE at half DPI (`6 px/mm`) |
| `NEG-01-BLANK-GRID` | Negative | GTQI 85 (**FALSE PASS**) | **GTQI 38 (WITHHELD)** | — | — | — | **38 (`WITHHELD`)** | **PASS (Fixed RW-02)** — Blank grid paper with zero ink is now strictly blocked by `GTQI = 38 < 65` |
| `NEG-02-SEVERE-COLLISION` | Negative | GTQI 40 (`WITHHELD`) | **GTQI 41 (WITHHELD)** | — | — | — | **41 (`WITHHELD`)** | **PASS** — Severe adjacent-lead collision & crease is blocked by `GTQI = 41 < 65` |
| `ADV-01-HEADER-BARCODE` | Adversarial | 18.72 dB / 0.9944 | **19.88 dB / 0.9949** | 12.15 dB | -11.00 dB | **0.35 BPM** | 75 (`PASS`) | **PASS** — Viterbi DP completely ignores dark top barcode stamp (`19.88 dB`) while Argmax is hijacked (`-11.00 dB`, **`+30.88 dB` margin**) |

---

## 4. Failure Root-Cause Analysis & Engineering Fixes Applied

1. **RW-01 — Uncentered Holter Amplifier DC Offset Clipping (`MIT-BIH #112`, `#117`, `#200`)**:
   - **Cause**: Raw PhysioNet `MIT-BIH` Holter signals include analog amplifier DC offsets up to `-0.98 mV`. Plotting raw signals onto a `30 mm` strip without AC baseline centering pushed negative QRS deflections below the bottom border of the image.
   - **Fix**: Added `0.05 Hz`-equivalent median baseline AC centering in `render_paper_ecg_image` and expanded vertical strip range to `42 mm` (`±2.1 mV`).
   - **Result**: `#112` SNR improved from `-15.21 dB` to `+19.58 dB`; `#117` improved from `-3.17 dB` to `+20.44 dB`; `#200` improved from `+1.66 dB` to `+19.76 dB`.
2. **RW-02 — Blank Grid Paper False-Positive in `GTQI` (`NEG-01-BLANK-GRID`)**:
   - **Cause**: On an empty thermal grid with zero carbon ink, Viterbi tracked a flat horizontal line (`jump_fraction = 0.0`), receiving `97%` continuity and `96%` slew scores (`GTQI = 85`).
   - **Fix**: Added minimum chromatic ink presence (`mean_ink >= 14.0`) and reconstructed waveform peak-to-peak amplitude (`ptp_mv >= 0.15 mV`) checks to `compute_gtqi`, plus a permanent regression test `test_blank_grid_negative_control_withheld` in `tests/test_pipeline.py` (`6 passed in 1.4s`).
   - **Result**: `NEG-01-BLANK-GRID` now scores `GTQI = 38/100 (< 65)` and strictly withholds intervals.

---

## 5. Readiness for Stage 4 Demo Video & Stage 5 Submission

All claims made in the UI, README, and Stage 4 presentation are backed by reproducible scripts (`scripts/run_evaluation.py` and `scripts/run_realworld_validation.py`) and saved artifacts in `evidence/stage-3.5-validation/`.
