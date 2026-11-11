# Stage 4 Demo Video & Technical Presentation Report — TraceGate

## 1. Rendered Video & Presentation Artifacts

- **Final Master Demo Video (`1080p30` H.264 + AAC with Voiceover, Captions & Sidechain BGM)**:
  - Path: `evidence/stage-4-demo/demo.mp4`
  - Resolution & Frame Rate: `1920 × 1080` @ `30 fps` (`H.264` `yuv420p`, `AAC` `160 kbps` audio)
  - Duration: **`88.00 seconds`** (`2,640 frames`, exceeding the Hackathon rule's `>= 60 seconds` minimum and showing the working application starting at `t = 11.75s`, well within the first 60 seconds)
  - File Size: `12.4 MB`
- **Live Playwright Product Walkthrough Clips**:
  - `evidence/stage-4-demo/footage/live_workbench_demo.mp4` (`28.57s`, live calibration, algorithm comparison & CSV export on `https://ai-for-medicine.vercel.app/`)
  - `evidence/stage-4-demo/footage/live_safety_gate_demo.mp4` (`25.80s`, `Tier 5` `GTQI 41/100` safety gate withhold & `120-strip` benchmark explorer)
- **Editable Vector SVG Slides & `1920×1080` PNG Renders**:
  - `evidence/stage-4-demo/slides/slide-01-problem-flow.svg` & `.png` — 4-node bottleneck flowchart + competitive comparison matrix (`ECG-Digitiser #22`, `Open-ECG-Digitizer #48`, `ecg-image-kit #18` vs. `TraceGate`)
  - `evidence/stage-4-demo/slides/slide-02-viterbi-architecture.svg` & `.png` — 4-stage mathematical signal recovery architecture (Spectral Grid Pitch, Chromatic Red-Grid Suppression, Huber-Regularized Viterbi DP, and `GTQI` Safety Gate)
  - `evidence/stage-4-demo/slides/slide-03-heldout-benchmark.svg` & `.png` — 120-strip held-out evaluation bar chart, `GTQI` Accuracy–Availability table, and 16-case external PhysioNet `MIT-BIH` findings
  - `evidence/stage-4-demo/slides/slide-04-gtqi-safety-gate.svg` & `.png` — Clinical safety gate decision boundary (`GTQI ≥ 65` vs. `< 65`), ethical scope ("Who benefits, and who could be harmed"), limitations, and next-month roadmap
- **Data-Driven Remotion Storyboard & Fact Validation Spec**:
  - `project/facts.json` (`4 verified facts` with evidence links, `1 blocked unverified claim` for FDA clearance)
  - `planning/script.md`
  - `planning/storyboard.json`

---

## 2. 7-Scene Choreography & Visual Storytelling Breakdown

| Scene # | Scene ID | Time Range | Visual Type | Key Visual Elements & Timed Animations | Backed by Stage 3.5 Evidence |
|---|---|---|---|---|---|
| **01** | `opening` | `0.0s – 11.75s` | `opening_title` | Custom `TraceGate` calibration reticle SVG (`1 mV` square pulse to cyan `P-QRS-T` lock) + 3 metric badges (`18.16dB SNR`, `2.9ms QT MAE`, `GTQI ≥ 65`) | `evidence/stage-3.5-validation/benchmark_results.json` |
| **02** | `live_demo_workbench` | `11.75s – 25.45s` | `real_footage_with_annotations` | Real Playwright capture of `TraceGate` on `PTB-XL #01492 (+4.2° skew)` with spring zoom (`1.38×`) into the sub-mm cyan overlay vs. orange Naive Argmax spikes (`27.7 dB` vs. `8.75 dB`) and `250 Hz` CSV export | `evidence/stage-3-qa/screens/S2-core-digitization-e2e-digitized-tier2-desktop.png` |
| **03** | `problem_bottleneck` | `25.45s – 39.12s` | `problem_flow` | Animated 4-node bottleneck diagram (`Thermal Paper Skew/Shadow` $\rightarrow$ `Broken Open Repos #22/#48` $\rightarrow$ `Naive Argmax 81.3ms QT Error` $\rightarrow$ `TraceGate 2.9ms QT MAE`) | `evidence/stage-1-research.md`, `evidence/stage-2-build.md` |
| **04** | `signal_architecture` | `39.12s – 51.42s` | `exploded_view` | 4-layer isometric exploded architecture (`Stage 1: R-G Autocorrelation & Radon Deskew`, `Stage 2: 25×35 Shadow Filter`, `Stage 3: Huber Viterbi DP`, `Stage 4: GTQI ≥ 65 Gate`) | `src/tracegate/pipeline.py` |
| **05** | `live_demo_safety_gate` | `51.42s – 63.48s` | `real_footage_with_annotations` | Real Playwright capture of `Tier 5 (PTB-XL #09204)` showing `GTQI 41/100 (< 65)`, red `ARTIFACT COLLISION` box on oscilloscope, and all 6 interval cards locked to `WITHHELD` | `evidence/stage-3-qa/screens/S3-safety-gate-withheld-withheld-gate-desktop.png` |
| **06** | `heldout_validation` | `63.48s – 78.16s` | `technical_validation` | Animated horizontal benchmark bars comparing `TraceGate` (`18.16 dB`, `2.9 ms QT MAE`, `14.69 dB Real MIT-BIH`) vs. baselines (`11.54 dB`, `25.7 ms`, `6.05 dB`) alongside 4 explicit limitation cards | `evidence/stage-3.5-validation/validation-report.md` |
| **07** | `closing` | `78.16s – 88.00s` | `closing_summary` | Reproducibility summary (`Seed=42`, `Pytest 6/6`, `Playwright 14/14`), public repo link, and live web workbench link | `README.md` |

---

## 3. Frame-by-Frame Visual Quality Inspection (`evidence/stage-4-demo/frames/`)

We extracted 7 full-resolution `1920×1080` PNG frames from `evidence/stage-4-demo/demo.mp4` using `ffmpeg` and inspected every frame with `read`:
- `evidence/stage-4-demo/frames/frame_05s.png` (Scene 01 `opening` @ `5.0s`) — Crisp title hierarchy, calibration reticle highlight callout, and synchronized subtitle bar.
- `evidence/stage-4-demo/frames/frame_18s.png` (Scene 02 `live_demo_workbench` @ `18.0s`) — Spring zoom into the thermal paper scan with cyan overlay, step sequence tracker (`STEP 02 ACTIVE`), and zero label overlap.
- `evidence/stage-4-demo/frames/frame_32s.png` (Scene 03 `problem_bottleneck` @ `32.0s`) — 4-node flow diagram with animated red bottleneck edges and green optimized edge.
- `evidence/stage-4-demo/frames/frame_45s.png` (Scene 04 `signal_architecture` @ `45.0s`) — 4-layer isometric exploded view highlighting `Stage 3 · Global Viterbi DP Tracker`.
- `evidence/stage-4-demo/frames/frame_57s.png` (Scene 05 `live_demo_safety_gate` @ `57.0s`) — Zoom into the crimson `ARTIFACT COLLISION — INTERVALS WITHHELD` region and `WITHHELD` cards.
- `evidence/stage-4-demo/frames/frame_70s.png` (Scene 06 `heldout_validation` @ `70.0s`) — Empirical benchmark bars (`18.2dB`, `2.9ms`, `14.7dB` vs. baselines) paired with 4 explicit scope boundary cards on the right.
- `evidence/stage-4-demo/frames/frame_82s.png` (Scene 07 `closing` @ `82.0s`) — Clean closing summary with public GitHub and live demo URLs.
