# Devpost Submission Fields — TraceGate

## 1. Project name

```text
TraceGate: Calibrated Paper-ECG Digitizer, Measured Honestly
```

## 2. Elevator pitch (186 characters, limit <= 200)

```text
Calibrated paper-ECG digitizer (25 mm/s, 10 mm/mV) with sub-mm cyan overlay verification, Viterbi path tracking, GTQI interval safety gating, and reproducible PhysioNet evaluation.
```

## 3. Thumbnail

Upload file: `submission/assets/thumbnail.png` (`1200 × 800`, 3:2 ratio, `121 KB`, custom-generated PNG).

## 4. About the project (Copy & Paste Markdown below directly into Devpost)

```md
## Inspiration

Across emergency medical services (EMS), rural primary-care clinics, inter-hospital referrals, and archival cardiovascular cohorts, billions of electrocardiograms (ECGs) exist only as thermal paper printouts, fax PDFs, or smartphone photos. While digital waveform algorithms require calibrated millivolt time-series (`mV` vs. `ms`), clinicians reviewing paper referral strips still rely on manual calipers or unverified header text.

When we audited existing open-source paper-ECG digitizers, we found concrete reproducibility and clinical safety barriers:
- `felixkrones/ECG-Digitiser` (PhysioNet 2024 Challenge Winner) cannot be run out-of-the-box by external users because its Git LFS weight quota is exhausted (GitHub Issues `#15` through `#22`) and requires heavy GPU `nnUNet` checkpoints.
- `Ahus-AIM/Open-ECG-Digitizer` produces non-deterministic signals on repeated runs of the exact same image (GitHub Issue `#48`).
- `alphanumericslab/ecg-image-kit` ships synthetic distortion generators without an end-to-end digitizer or interval safety gate (GitHub Issue `#18`).

Most importantly, a convincing number on screen is not enough: if a smartphone shadow, thermal crease, or adjacent high-voltage lead collision corrupts the extracted waveform, a naive tool will silently output a fabricated `QTc` or `QRS` duration. **TraceGate** was built to make paper-to-digital calibration, visual trace registration, failure boundaries, and held-out evaluation transparent.

## What it does

**TraceGate** is an open-source, CPU-native paper-ECG digitization workbench and reproducible evaluation toolkit. It accepts scanned or photographed thermal ECG strips (`PNG`/`JPG`) or built-in held-out PhysioNet test strips across 5 graded degradation tiers:

1. **Physical Grid Calibration & Deskew (`25 mm/s`, `10 mm/mV`)**: Detects the `1 mm` (`40 ms`, `0.1 mV`) and `5 mm` (`200 ms`, `0.5 mV`) terracotta thermal grid spacing (`px/mm`) via red-minus-green spectral autocorrelation and deskews planar rotation (`+/- 5 deg`).
2. **Sub-Millimeter Visual Registration Overlay**: Projects the reconstructed digital waveform (in glowing cyan) directly back onto the original thermal paper image alongside a synchronized digital cathode oscilloscope (`mV` vs. `ms`) and microvolt residual bar (`|dV|` in `uV`), so a clinician can visually verify that the digital trace matches the carbon ink before trusting any interval.
3. **Side-by-Side Estimator Comparison**: Compares three 2D-to-1D extraction pipelines on every strip: (a) `Naive Column-Argmax Darkness Baseline`, (b) `Chromatic Grid-Suppressed Morphological Centroid`, and (c) our `Global Viterbi Dynamic-Programming Continuity Tracker`.
4. **Grid & Trace Quality Index (`GTQI`, 0–100) Safety Gate**: Combines grid periodicity, raw ink-to-paper contrast, Viterbi continuity, and physiological slew consistency. When `GTQI < 65` (such as severe adjacent-lead QRS overlap, thermal paper fold dropout, or a blank grid scan), TraceGate **withholds clinical intervals (`HR`, `RR`, `PR`, `QRS`, `QT`, `Bazett QTc`)** and highlights the corrupted window on the oscilloscope.
5. **Calibrated Waveform Export**: Exports verified time-series in physical units (`time_ms`, `reconstructed_mv`, `reference_mv`, `residual_uv`) as `CSV` or `WFDB`-compatible `JSON`.

## How we built it

The mathematical pipeline is implemented deterministically in Python (`src/tracegate/pipeline.py` using `NumPy`, `SciPy`, `Pillow`, `wfdb`, and `FastAPI`) and mirrored in a zero-install browser DSP engine (`src/dspEngine.ts` in `React` + `TypeScript` + `HTML5 Canvas`):

- **Stage 1 — Spectral Grid Pitch & AC Baseline Centering**: Isolates the terracotta grid channel `G(x,y) = max(0, R - G)`, finds the autocorrelation lag peak for `px/mm`, maximizes horizontal projection variance over `theta in [-5 deg, +5 deg]` for deskewing, and applies `0.05 Hz`-equivalent median baseline centering (`42 mm` vertical range, `+/- 2.1 mV`).
- **Stage 2 — Local Illumination Normalization & Chromatic Grid Suppression**: Estimates background illumination `B(x,y)` via a `25 x 35` uniform filter to remove smartphone shadows and suppresses red grid lines relative to broadband carbon ink:
  `I_ink(x,y) = max(0, 2.2 * (B(x,y) - L(x,y)) - 0.45 * max(0, R(x,y) - 0.5 * (G(x,y) + B(x,y))))`
- **Stage 3 — Huber-Regularized Global Viterbi Dynamic Programming**: Solves the global path across all columns `x = 1..W`:
  `min sum_x [-2.4 * I_ink(x, y_x)] + sum_x [1.8 * min(|y_x - y_{x-1}|, 4)^2 + 1.15 * max(0, |y_x - y_{x-1}| - 4)]`
  The Huber transition penalty applies quadratic smoothing to small baseline jitter while switching to linear cost during steep `R-wave` upstrokes (`35-45 px/col`), followed by sub-pixel parabolic refinement and 5-point Savitzky-Golay smoothing.
- **Stage 4 — Parabolic P-QRS-T Delineation & `GTQI` Gate**: Detects `R-peaks`, `Q/S` nadirs, and `T-wave` peaks/offsets with sub-sample parabolic interpolation and locks interval output when `GTQI < 65` or minimum ink checks (`mean_ink >= 14.0`, `ptp_mv >= 0.15 mV`) fail.

## Evaluation

We evaluated TraceGate using two reproducible protocols (`seed = 42`):
1. **120-Strip Controlled Held-Out Benchmark (`scripts/run_evaluation.py`)**: 24 held-out subjects rendered across 5 graded physical distortion tiers (`Tier 1: Clean 300 DPI Scan`, `Tier 2: Rotated & Perspective Skew +/-4.5 deg`, `Tier 3: Smartphone Uneven Illumination Shadow`, `Tier 4: Faded Archival Thermal Ink 55% Loss`, `Tier 5: Severe Lead Overlap & Crease Dropout`). Metrics are reported after PhysioNet-2024 DC and `+/-2`-sample lag alignment with 1,000-iteration subject-level bootstrap 95% confidence intervals.
2. **16-Case External Real-World PhysioNet `MIT-BIH` & Adversarial Validation Suite (`scripts/run_realworld_validation.py`)**: 12 real human patient ECG recordings (`MIT-BIH #100, #101, #103, #105, #106, #112, #115, #117, #119, #122, #200, #230`, 360 Hz `MLII` waveforms + dual-cardiologist `.atr` annotations streamed via `wfdb`) plus 4 Edge, Negative, and Adversarial controls.

### 1. Held-Out Method Comparison (120 Strips / 24 Test Subjects)

- **Viterbi DP Continuity Tracker (Gated, `GTQI >= 65`)**:
  - Availability: `60.0%` (`72 / 120` eligible strips)
  - Waveform SNR: `18.16 dB` (95% CI: `17.63–18.66 dB`)
  - Waveform RMSE: `37.1 uV` (95% CI: `34.83–39.41 uV`), Pearson `r = 0.9914`
  - Heart Rate MAE: `0.12 BPM` (`RR MAE = 1.4 ms`)
  - QRS Duration MAE: `3.5 ms` (95% CI: `3.19–3.94 ms`)
  - QT Interval MAE: `2.9 ms` (95% CI: `2.02–3.90 ms`), Bazett QTc MAE: `3.2 ms`
- **Viterbi DP Continuity Tracker (Ungated, `100.0%` All 120 Strips)**:
  - Waveform SNR: `15.18 dB` (95% CI: `14.38–16.01 dB`), RMSE: `57.0 uV`, Pearson `r = 0.9763`
  - QRS Duration MAE: `3.9 ms` (95% CI: `3.26–4.57 ms`)
  - QT Interval MAE: `9.6 ms` (95% CI: `6.53–13.11 ms`), Bazett QTc MAE: `10.3 ms`
- **Chromatic Grid-Suppressed Centroid Baseline (`100.0%` Coverage)**:
  - Waveform SNR: `11.37 dB` (95% CI: `10.61–12.15 dB`), RMSE: `87.8 uV`, Pearson `r = 0.9450`
  - HR MAE: `1.24 BPM`, QRS MAE: `5.4 ms`, QT MAE: `13.2 ms`, QTc MAE: `17.1 ms`
- **Naive Column-Argmax Darkness Baseline (`100.0%` Coverage)**:
  - Waveform SNR: `11.54 dB` (95% CI: `10.14–12.93 dB`), RMSE: `107.8 uV`, Pearson `r = 0.9077`
  - HR MAE: `7.01 BPM`, QRS MAE: `6.5 ms`, QT MAE: `25.7 ms`, QTc MAE: `28.1 ms`

### 2. Stratification by Distortion Tier & Honest Baseline Findings

- **Tier 1 (Clean 300 DPI Flatbed Scan, `n=24`)**: Viterbi `19.14 dB` (`32.1 uV`, `QT MAE 2.1 ms`) vs. Naive Argmax `20.56 dB` (`27.7 uV`, `QT MAE 2.3 ms`). *Honest negative result*: on pristine, unshadowed flatbed scans, simple column-argmax slightly edges Savitzky-Golay-smoothed Viterbi DP because smoothing slightly rounds the noiseless R-peak apex.
- **Tier 2 (Rotated & Skewed `+/-4.5 deg`, `n=24`)**: Viterbi `15.36 dB` (`QT MAE 4.8 ms`) vs. Argmax `11.47 dB` (`QT MAE 13.4 ms`).
- **Tier 3 (Smartphone Uneven Illumination Shadow, `n=24`)**: Viterbi `19.98 dB` (`QT MAE 1.8 ms`) vs. Centroid `13.21 dB` (`QT MAE 12.8 ms`).
- **Tier 4 (Faded Archival Thermal Ink `55%` Loss, `n=24`)**: Viterbi `12.32 dB` (`QT MAE 12.1 ms`) vs. Argmax `3.47 dB` (`194.8 uV`, `QT MAE 81.3 ms`).
- **Tier 5 (Severe Lead Overlap & Crease Dropout, `n=24`)**: Viterbi `9.09 dB` (`QT MAE 27.1 ms`), Mean `GTQI = 40.6 / 100` (`0.0%` pass rate at `GTQI >= 65` — intervals withheld).

### 3. External Real-World PhysioNet `MIT-BIH` Validation (`n=16` Cases)

Across the 12 real human patient `MIT-BIH` recordings, TraceGate achieved a mean SNR of **`14.69 dB` (`r = 0.9419`)**, outperforming Chromatic Centroid (`10.14 dB`) and Naive Column-Argmax (`6.05 dB`, a **`+8.64 dB` improvement**). On `MIT-BIH #112` (smartphone shadow + `-0.98 mV` Holter DC offset), Viterbi achieved `19.58 dB` (`r = 0.9948`) while Argmax collapsed to `-8.74 dB`. On `ADV-01` (adversarial top barcode stamp), Viterbi achieved `19.88 dB` vs. Argmax `-11.00 dB` (`+30.88 dB` margin). Both negative controls (`NEG-01` blank grid paper at `GTQI = 38/100` and `NEG-02` severe lead collision at `GTQI = 41/100`) were strictly withheld.

## Challenges we ran into

1. **Quadratic Transition Penalty Clipping Steep R-Waves**: In our initial prototype, a pure quadratic Viterbi transition penalty (`lambda * dy^2`) penalized steep QRS upstrokes (`35 px/column`) more than the carbon ink reward, clipping R-peaks at `+0.59 mV` (`SNR = 1.66 dB`). Replacing quadratic cost above `4 px/col` with a linear Huber slew penalty immediately restored full R-wave amplitude (`SNR = 18.16 dB`).
2. **Real-World Holter DC Offset & Blank-Grid False Positives**: In our initial Stage 3.5 run on external `MIT-BIH` records (`#112`, `#117`), raw analog Holter signals had a `-0.98 mV` DC baseline offset that pushed traces below the bottom of a `30 mm` paper strip (`SNR = -15.21 dB`), and a blank thermal grid (`NEG-01`) scored `GTQI = 85` because a flat row-0 path had zero jumps. Adding `0.05 Hz`-equivalent AC baseline centering (`42 mm` strip height) and minimum chromatic ink / peak-to-peak amplitude checks (`mean_ink >= 14`, `ptp_mv >= 0.15 mV`) resolved both failure modes.

## Accomplishments that we're proud of

- Bringing a **zero-install web workbench**, **deterministic Python + TypeScript signal processing**, **sub-millimeter paper-to-waveform overlay verification**, and **saved held-out + real-world PhysioNet evaluation artifacts** into a single reproducible release.
- Making **withheld readings (`GTQI < 65`)** and **negative baseline findings** (where simple Argmax wins on Tier 1 clean scans) first-class parts of the interface and evaluation report.

## What we learned

- Reliability gating creates an explicit **accuracy–availability trade-off**: at `GTQI >= 65`, QT interval MAE drops from `9.6 ms` (`100%` availability) to `2.9 ms` (`60%` availability) by refusing Tier 5 lead-collision strips and flagging severely faded Tier 4 traces for manual review. Lower error must always be reported alongside coverage.
- Classical signal processing (chromatic background filtering + Huber-regularized dynamic programming) runs in `<15 ms` per strip on a laptop CPU with zero GPU checkpoints while providing interpretable failure diagnostics.

## Who benefits, and who could be harmed

- **Who benefits**: Clinicians and trainees reviewing paper or photographed referral ECG strips who need visual overlay confirmation before trusting interval measurements, and clinical researchers digitizing archival paper ECG cohorts into open `CSV`/`WFDB` format without expensive hardware or GPU clusters.
- **Who could be harmed**: Patients could be harmed if an inaccurate digitized `QTc`, `QRS`, or `ST` reading creates false reassurance (missing drug-induced long QT or acute ischemia) or triggers unnecessary clinical intervention. **TraceGate is a research prototype, not a cleared diagnostic medical device.** Clinicians must visually inspect the cyan registration overlay on the original paper scan before acting on any measurement.

## Limitations

1. **Single-Lead Strip Scope**: Evaluation covers single-lead `2.5s` rhythm strips (`25 mm/s`, `10 mm/mV`) rather than automatic multi-row `3x4` 12-lead page layout segmentation.
2. **Extreme High-Voltage Ventricular Ectopy (`MIT-BIH #119`)**: When peak-to-peak QRS-T voltage exceeds `4.2 mV` (`+2.84 mV` to `-1.48 mV`) at standard `10 mm/mV` gain under rotational skew, the apex exceeds the single-strip vertical window (`SNR = 0.65 dB`); such strips require half-gain (`5 mm/mV`) printing.
3. **Bimodal / Giant T-Wave Morphologies (`MIT-BIH #117`, `#200`)**: While waveform recovery on `MIT-BIH #117` (`20.44 dB`, `r = 0.9955`) and `#200` (`19.76 dB`, `r = 0.9957`) is highly accurate, giant hyperacute T-waves (`#117`) or alternating multiform PVC couplets (`#200`) can cause simple threshold peak detectors to double-count beats, underscoring why visual waveform verification is mandatory.
4. **Planar vs. Non-Rigid 3D Warping**: Deskewing corrects planar rotation (`+/-5 deg`), not severe 3D crumpled paper geometry.

## What we would do with another month (What's next for TraceGate)

1. **Coupled Multi-Lead 12-Lead Page Tracking**: Extend the Viterbi dynamic-programming tracker to jointly track all 4 stacked rows of a standard 12-lead ECG page so crossing R- and S-waves between vertically adjacent leads (`V2`/`V3`/`V4`) can be separated rather than gated out.
2. **Prospective Clinical Reference Study**: Print 200 de-identified 12-lead hospital ECGs across three thermal printer models, photograph them under standardized and uncontrolled ward lighting with smartphone cameras, and benchmark interval recovery against dual-cardiologist caliper annotations without modifying model hyperparameters.

## Attribution and AI disclosure

- **Datasets & Reference Protocols**:
  - PhysioNet `MIT-BIH Arrhythmia Database` v1.0.0: Moody & Mark, *IEEE Eng Med Biol* 2001 (`https://physionet.org/content/mitdb/1.0.0/`, ODC-By v1.0).
  - PhysioNet `PTB-XL` Dataset v1.0.3: Wagner et al., *Scientific Data* 2020 (`https://physionet.org/content/ptb-xl/1.0.3/`, CC-BY 4.0).
  - PhysioNet Challenge 2024 ECG Image Digitization Protocol: Reyna et al., *Computing in Cardiology* 2024.
- **Libraries**: `NumPy`, `SciPy`, `Pillow`, `wfdb`, `FastAPI`, `React`, `TypeScript`, `Vite`, `Playwright`.
- **AI Disclosure**: An AI coding assistant (OpenCode / Gemini) was used under the entrant's direction for software implementation, signal-processing experiment scripts, test automation, and documentation drafting. All evaluation metrics, split seeds (`seed = 42`), and failure analyses are generated by reproducible code in the public repository.
```

## 5. Built with (Tags)

```text
python, scipy, numpy, wfdb, pillow, fastapi, react, typescript, vite, html5-canvas, playwright, physionet
```

## 6. "Try it out" links

- **Live Web Application (GitHub Pages)**: `https://georgefifth.github.io/tracegate/`
- **Live Web Application (Vercel Production)**: `https://ai-for-medicine.vercel.app/`
- **Public GitHub Repository**: `https://github.com/Georgefifth/tracegate`

## 7. Image gallery (`submission/assets/` — All 3:2 Aspect Ratio, `< 5 MB` PNGs)

Upload in the following order with the exact caption (`<= 150` characters each):

1. **File**: `submission/assets/01-workbench-verified-pass.png` (`1500 × 1000`, 3:2, `208 KB`)
   - **Caption** (118 chars):
     ```text
     TraceGate Workbench on PTB-XL #00184: sub-mm cyan overlay on thermal paper, digital oscilloscope, and GTQI 96/100 pass
     ```
2. **File**: `submission/assets/02-skewed-ems-strip-comparison.png` (`1500 × 1000`, 3:2, `216 KB`)
   - **Caption** (124 chars):
     ```text
     EMS strip PTB-XL #01492 (+4.2 deg skew): Viterbi DP (27.7 dB SNR) suppresses 5mm grid spikes vs Naive Argmax (8.75 dB)
     ```
3. **File**: `submission/assets/03-safety-gate-withheld.png` (`1500 × 1000`, 3:2, `259 KB`)
   - **Caption** (125 chars):
     ```text
     Tier 5 Lead Collision (PTB-XL #09204): GTQI 41/100 (< 65) locks all 6 interval cards to WITHHELD and boxes collision region
     ```
4. **File**: `submission/assets/04-heldout-benchmark-120-strips.png` (`1500 × 1000`, 3:2, `178 KB`)
   - **Caption** (122 chars):
     ```text
     Held-Out Benchmark Explorer (120 strips, 24 subjects, seed=42): 18.16 dB SNR, 2.9 ms QT MAE, and interactive GTQI slider
     ```
5. **File**: `submission/assets/05-signal-pipeline-architecture.png` (`1200 × 800`, 3:2, `142 KB`)
   - **Caption** (116 chars):
     ```text
     Four-stage deterministic signal recovery pipeline: spectral grid deskew, shadow filter, Huber Viterbi DP, and GTQI
     ```
6. **File**: `submission/assets/06-clinical-safety-and-ethics.png` (`1200 × 800`, 3:2, `128 KB`)
   - **Caption** (114 chars):
     ```text
     Clinical safety boundary (GTQI >= 65 vs < 65), ethical harm analysis, limitations, and real MIT-BIH validation
     ```

## 8. Video Demo

- **Local Rendered Master Video File (`1080p30`, `88.00s`, `12.4 MB`)**: `submission/assets/demo.mp4` (also at `evidence/stage-4-demo/demo.mp4`)
- **Video Hosting Note (`TODO(human)`)**: Devpost requires uploading the video to YouTube or Vimeo and pasting the video URL into the Devpost "Video Demo Link" field. Upload `submission/assets/demo.mp4` to YouTube (Unlisted or Public) or Vimeo and paste that link into Devpost.
