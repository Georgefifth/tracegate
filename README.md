# TraceGate — Calibrated Paper-ECG Digitizer & Clinical Interval Verification Workbench

<p align="center">
  <img src="public/logo.svg" alt="TraceGate Logo" width="96" height="96" />
</p>

> **AI for Medicine: A Global Student Hackathon on the Future of Care**  
> **Research Prototype — Not a Cleared Medical Device.**  
> Recovering physical millivolt waveforms (`25 mm/s`, `10 mm/mV`) from thermal paper ECG printouts, overlaying the reconstructed trace directly onto the paper scan for sub-millimeter visual verification, and gating out unreliable cardiac intervals (`HR`, `RR`, `QRS`, `QT`, `QTc`) when paper creases or lead collisions corrupt the signal.

---

## 1. The Problem and Who Has It

Care is frequently bottlenecked on format and visual verification: across emergency medical services (EMS), rural primary-care clinics, inter-hospital referrals, and archival cardiovascular cohorts, billions of 12-lead and rhythm-strip electrocardiograms (ECGs) exist only as **thermal paper printouts, fax scans, or smartphone photos**.

1. **Clinicians reviewing transfer strips** manually estimate QRS duration and QT/QTc intervals using physical calipers or trust unverified header text.
2. **Researchers and quantitative algorithms** require calibrated digital millivolt time-series (`mV` vs. `ms`) to measure drug-induced QTc prolongation, conduction delay, or beat-to-beat heart rate variability.
3. **Existing open-source digitizers fail silently or are non-reproducible**:
   - [`felixkrones/ECG-Digitiser`](https://github.com/felixkrones/ECG-Digitiser) (PhysioNet 2024 Challenge Winner) cannot be run out-of-the-box by external users because its Git LFS weight quota is exhausted ([Issue #22](https://github.com/felixkrones/ECG-Digitiser/issues/22)) and requires heavy GPU `nnUNet` checkpoints.
   - [`Ahus-AIM/Open-ECG-Digitizer`](https://github.com/Ahus-AIM/Open-ECG-Digitizer) exhibits non-deterministic inference outputs on repeated runs of the same image ([Issue #48](https://github.com/Ahus-AIM/Open-ECG-Digitizer/issues/48)).
   - [`alphanumericslab/ecg-image-kit`](https://github.com/alphanumericslab/ecg-image-kit) ships synthetic image generation without an end-to-end calibrated interval verification workbench ([Issue #18](https://github.com/alphanumericslab/ecg-image-kit/issues/18)).
   - None of these tools overlay the reconstructed digital waveform directly back onto the original paper scan with a **reliability gate** that withholds `QTc`/`QRS` numbers when a paper crease or adjacent-lead R-wave collision corrupts the trace.

---

## 2. Method & Signal-Processing Pipeline

`TraceGate` is a deterministic, CPU-native 2D-to-1D signal recovery and verification pipeline built in Python (`NumPy`, `SciPy`, `Pillow`, `FastAPI`) and mirrored in a zero-install browser DSP workbench (`React`, `TypeScript`, `HTML5 Canvas`):

1. **Spectral Grid Calibration & Deskew (`25 mm/s`, `10 mm/mV`)**:
   - Standard thermal ECG paper prints a `1 mm` minor grid (`40 ms` horizontal at `25 mm/s`; `0.1 mV` vertical at `10 mm/mV`) and `5 mm` major grid (`200 ms`, `0.5 mV`) in terracotta/red ink.
   - TraceGate isolates the red-minus-green grid channel $G(x,y) = \max(0, R - G)$, computes column autocorrelation to recover the physical pixel pitch (`px/mm`), and maximizes horizontal projection variance over $\theta \in [-5^\circ, +5^\circ]$ to deskew rotated scans.
2. **Local Illumination Normalization & Chromatic Grid Suppression**:
   - Smartphone photos cast uneven shadows across paper strips. TraceGate estimates the local paper background luminance $B(x,y)$ via a $25 \times 35$ uniform filter and suppresses red/terracotta grid lines relative to broad-spectrum carbon ink:
     $$I_{\text{ink}}(x,y) = \max\Big(0,\; 2.2\big(B(x,y) - L(x,y)\big) - 0.45\max\big(0, R(x,y) - \tfrac{1}{2}(G(x,y)+B(x,y))\big)\Big)$$
3. **Global Viterbi Dynamic-Programming Continuity Tracker**:
   - Rather than picking each column independently, TraceGate solves a global minimum-cost path across all columns $x = 1 \dots W$ with a Huber physiological slew-rate regularizer that allows steep QRS upstrokes while penalizing random jumps to text labels (`"II"`, `"V2"`) or grid intersections:
     $$\min_{y_1 \dots y_W} \sum_{x=1}^{W} -2.4\,I_{\text{ink}}(x, y_x) + \sum_{x=2}^{W} \Big(1.8\min(|y_x - y_{x-1}|, 4)^2 + 1.15\max(0, |y_x - y_{x-1}| - 4)\Big)$$
   - Sub-pixel parabolic interpolation around the optimal integer path $y_x^*$ followed by a 5-point quadratic Savitzky-Golay filter yields the calibrated millivolt waveform $V(t)$.
4. **Grid & Trace Quality Index (`GTQI`, 0–100) Reliability Gate**:
   - Combines **Grid Periodicity (25%)**, **Raw Ink-to-Paper Contrast (25%)**, **Viterbi Path Continuity (30%)**, and **Physiological Slew Consistency (20%)**.
   - When `GTQI < 65` (e.g., severe adjacent-lead QRS overlap or thermal fold dropout), TraceGate **withholds clinical intervals (`HR`, `RR`, `QRS`, `QT`, `QTc`)** and highlights the corrupted window on the oscilloscope rather than reporting a dangerous hallucinated measurement.
5. **Sub-Sample Parabolic P-QRS-T Fiducial Delineation**:
   - On strips passing the GTQI gate, R-peaks, Q- and S-wave nadirs, and T-wave peaks/offsets are delineated using sub-sample parabolic interpolation to compute **Heart Rate (`BPM`)**, **RR (`ms`)**, **PR (`ms`)**, **QRS (`ms`)**, **QT (`ms`)**, and **Bazett QTc (`ms`)**.

---

## 3. Held-Out Evaluation (`seed = 42`)

### 3.1 Protocol & Reference Dataset
- **Cohort & Split**: 24 held-out subjects (120 paper ECG strips total, 2.5 seconds each at `250 Hz`, `25 mm/s`, `10 mm/mV`) paired with exact digital reference millivolt waveforms and verified PhysioNet `MIT-BIH` / `PTB-XL` record metadata (`records 100, 101, 103, 105, 112, 115, 117, 122`).
- **Five Graded Paper Distortion Tiers** (24 strips per tier):
  - **Tier 1 (`tier1_clean`)**: Clean 300 DPI flatbed scan with intact 1mm/5mm terracotta grid.
  - **Tier 2 (`tier2_skewed`)**: Handheld capture with $\pm 3.5^\circ\text{–}4.4^\circ$ rotational skew and lead stamps.
  - **Tier 3 (`tier3_shadow`)**: Uneven smartphone illumination shadow (44% local luminance drop + edge smudge).
  - **Tier 4 (`tier4_faded`)**: Archival thermal paper with 55% ink contrast loss and background vignetting.
  - **Tier 5 (`tier5_collision`)**: Severe vertical thermal crease dropout + adjacent lead high-voltage R-wave overlap.
- **Metrics in Real Clinical Units** (after PhysioNet-2024 DC & $\pm 2$-sample lag alignment, with 1,000-iteration subject-level bootstrap 95% confidence intervals):
  - Waveform **Signal-to-Noise Ratio (`SNR` in dB)**, **Root Mean Square Error (`RMSE` in µV)**, and **Pearson $r$**.
  - Clinical interval Mean Absolute Error: **HR MAE (`BPM`)**, **RR MAE (`ms`)**, **QRS MAE (`ms`)**, **QT MAE (`ms`)**, and **Bazett QTc MAE (`ms`)** reported alongside **Availability (`%` of strips passing GTQI)**.

### 3.2 Overall Method Comparison (120 Held-Out Strips / 24 Subjects)

| Pipeline / Baseline | Availability (%) | SNR (dB) [95% CI] | RMSE (µV) [95% CI] | Pearson $r$ | HR MAE (BPM) | QRS MAE (ms) [95% CI] | QT MAE (ms) [95% CI] | QTc MAE (ms) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| **Viterbi DP Continuity Tracker (Gated, GTQI ≥ 65)** | **60.0%** (72/120) | **18.16 dB** [17.63–18.66] | **37.1 µV** [34.83–39.41] | **0.9914** | **0.12 BPM** | **3.5 ms** [3.19–3.94] | **2.9 ms** [2.02–3.90] | **3.2 ms** |
| **Viterbi DP Continuity Tracker (Ungated, All Strips)** | **100.0%** (120/120) | **15.18 dB** [14.38–16.01] | **57.0 µV** [51.78–62.09] | **0.9763** | **0.23 BPM** | **3.9 ms** [3.26–4.57] | **9.6 ms** [6.53–13.11] | **10.3 ms** |
| **Chromatic Grid-Suppressed Centroid (Baseline)** | **100.0%** (120/120) | **11.37 dB** [10.61–12.15] | **87.8 µV** [80.25–95.85] | **0.9450** | **1.24 BPM** | **5.4 ms** [4.63–6.20] | **13.2 ms** [9.94–17.14] | **17.1 ms** |
| **Naive Column-Argmax Darkness Baseline** | **100.0%** (120/120) | **11.54 dB** [10.14–12.93] | **107.8 µV** [93.41–121.50] | **0.9077** | **7.01 BPM** | **6.5 ms** [5.15–7.89] | **25.7 ms** [19.61–32.72] | **28.1 ms** |

### 3.3 Stratification by Distortion Tier & Honest Baseline Findings

| Paper Distortion Tier | Strips ($n$) | Viterbi SNR / RMSE | Centroid SNR / RMSE | Argmax SNR / RMSE | Viterbi QRS / QT MAE | Mean GTQI | Gate Pass Rate |
|---|---:|---:|---:|---:|---:|---:|---:|
| **Tier 1: Clean Flatbed Scan (300 DPI)** | 24 | 19.14 dB / 32.1 µV | 17.49 dB / 38.8 µV | **20.56 dB / 27.7 µV** | 3.0 ms / 2.1 ms | 88.9 | **100.0%** |
| **Tier 2: Rotated & Perspective Skew (±4.5°)** | 24 | **15.36 dB / 50.2 µV** | 10.60 dB / 85.8 µV | 11.47 dB / 78.4 µV | **4.6 ms / 4.8 ms** | 74.8 | **100.0%** |
| **Tier 3: Smartphone Uneven Illumination Shadow** | 24 | **19.98 dB / 29.1 µV** | 13.21 dB / 63.5 µV | 19.18 dB / 32.5 µV | **3.0 ms / 1.8 ms** | 74.8 | **100.0%** |
| **Tier 4: Faded Archival Thermal Ink (55% Loss)** | 24 | **12.32 dB / 70.3 µV** | 10.65 dB / 85.2 µV | 3.47 dB / 194.8 µV | **2.2 ms / 12.1 ms** | 60.4 | **0.0%** (Flagged) |
| **Tier 5: Severe Lead Overlap & Crease Dropout** | 24 | **9.09 dB / 103.1 µV** | 4.89 dB / 165.7 µV | 3.03 dB / 205.5 µV | **6.4 ms / 27.1 ms** | 40.6 | **0.0%** (Withheld) |

**Key Scientific & Negative Findings**:
1. **When a simple baseline wins**: On pristine 300 DPI flatbed scans with zero shadow or text collision (**Tier 1**), `Naive Column-Argmax` achieves slightly higher SNR (`20.56 dB`) than `Viterbi DP` (`19.14 dB`) because Savitzky-Golay smoothing in Viterbi slightly rounds the sharp R-peak apex. A more complex tracker is not needed if scans are guaranteed artifact-free.
2. **Where baselines collapse**: Under faded thermal ink + peripheral vignetting (**Tier 4**), `Naive Column-Argmax` jumps to dark shadow regions (`3.47 dB` SNR, `81.3 ms` QT MAE), whereas local illumination normalization + `Viterbi DP` recovers `12.32 dB` SNR and `12.1 ms` QT MAE.
3. **Accuracy–Availability Trade-Off**: Applying `GTQI ≥ 65` lowers QT MAE from **9.6 ms** (100% coverage) to **2.9 ms** (60% coverage) by withholding Tier 5 lead-collision strips (`QT MAE = 27.1 ms`) and flagging severely faded Tier 4 strips for manual caliper review.

---

## 4. Who Benefits, and Who Could Be Harmed

- **Who benefits**:
  - Clinicians and trainees reviewing paper or photographed ECG referral strips who need a visual registration check (`Cyan Overlay` on paper ink) before trusting digitized interval measurements.
  - Clinical researchers digitizing retrospective paper ECG archives into calibrated `CSV` / `WFDB`-compatible millivolt signals on standard laptop CPUs without GPU dependencies.
- **Who could be harmed**:
  - Patients could be harmed if an inaccurate digitized `QTc`, `QRS`, or `ST` reading creates false reassurance (missing drug-induced long QT or acute ischemia) or triggers unnecessary treatment/referral.
  - **Mitigation**: `TraceGate` is explicitly scoped as a **research prototype, not a cleared diagnostic medical device**. It renders the reconstructed waveform directly over the original paper scan so human reviewers can see registration errors immediately, and its `GTQI` gate refuses to output intervals when trace continuity fails.

---

## 5. Limitations & What We Would Do With Another Month

- **Limitations**:
  - Evaluation uses 120 single-lead strips across 24 held-out subjects rendered under 5 controlled physical degradation models rather than a multi-site prospective hospital scanner study.
  - Extreme paper crumpling (3D non-affine warps) is only corrected for global planar rotation (`±5°`), not local non-rigid mesh warping.
  - When two adjacent leads with high-voltage LVH complexes cross paths (`Tier 5`), single-trace Viterbi tracking can still be pulled toward the crossing stroke—which is why `GTQI` withholds automated intervals on those strips.
- **With another month**:
  1. Extend from single-lead strip recovery to full 12-lead (`3×4 + 1 rhythm strip`) layout detection with coupled multi-row Viterbi tracking that resolves crossing R/S waves between vertically adjacent leads.
  2. Conduct a prospective validation study on 200 physically printed and smartphone-photographed hospital ECGs with dual-cardiologist caliper annotations as the clinical reference standard.

---

## 6. Reproducing the Evaluation & Running the Project

### Prerequisites
- Node.js `>= 20` and Python `>= 3.11`

### 1. Install Dependencies
```bash
npm install
uv venv .venv
uv pip install --python .venv/bin/python numpy scipy pillow fastapi uvicorn pytest httpx
```

### 2. Reproduce the Held-Out Evaluation (`seed = 42`)
```bash
npm run evaluate
# or directly:
.venv/bin/python scripts/run_evaluation.py
```
This regenerates `public/api/benchmark.json`, `evidence/stage-3.5-validation/benchmark_results.json`, and `evidence/stage-3.5-validation/per_strip_results.csv`.

### 3. Run the Test Suite (`pytest`)
```bash
npm run test:py
```

### 4. Start the Web Workbench & FastAPI Backend
```bash
# Terminal 1: FastAPI backend (optional; frontend includes full deterministic DSP engine)
.venv/bin/uvicorn api.index:app --host 127.0.0.1 --port 8000

# Terminal 2: Vite frontend workbench
npm run dev
```

---

## 7. Attribution & AI Tool Disclosure

- **Datasets & Clinical References**:
  - **PhysioNet `PTB-XL`**: Wagner et al., *PTB-XL, a large publicly available electrocardiography dataset*, Scientific Data 2020 (CC-BY 4.0, https://physionet.org/content/ptb-xl/1.0.3/).
  - **PhysioNet `MIT-BIH Arrhythmia Database`**: Moody & Mark, *The impact of the MIT-BIH Arrhythmia Database*, IEEE Eng Med Biol 2001 (https://physionet.org/content/mitdb/1.0.0/).
  - **PhysioNet Challenge 2024 Digitization Protocol**: Reyna et al., *Digitization and Classification of ECG Images: The George B. Moody PhysioNet Challenge 2024*.
- **Open-Source Libraries**: `NumPy`, `SciPy`, `Pillow`, `FastAPI`, `React`, `Vite`, `Playwright`.
- **AI Disclosure (per Hackathon Rules)**: An AI coding assistant (OpenCode / Gemini) was used under the author's direction to assist with software engineering, signal-processing pipeline implementation, test automation, and documentation formatting. All evaluation metrics, split seeds, and limitations are verified by reproducible code in this repository.
