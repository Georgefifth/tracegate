# Stage 5 Evidence — Devpost Submission Package (`TraceGate`)

## 1. Submission Package Contents (`submission/`)

- **Fields Document**: `submission/fields.md` (single final copy-paste version for every Devpost field, formatted with Devpost-safe backtick formulas and containing all mandatory `AI for Medicine` Hackathon sections: `Evaluation`, `Who benefits, and who could be harmed`, `Limitations`, `What we would do with another month`, and `Attribution and AI disclosure`).
- **Human Checklist**: `submission/checklist.md` (step-by-step instructions + pre-verified quality checklist).
- **Assets Directory (`submission/assets/`)**:

| Asset File | Role | Format | Dimensions | Aspect Ratio | File Size (Limit `< 5 MB` Images) | Caption Length (Limit `<= 150`) |
|---|---|---|---:|---|---:|---:|
| `submission/assets/thumbnail.png` | Project Thumbnail (Custom Generated) | PNG | `1200 × 800` | `3:2` | `121 KB` | N/A |
| `submission/assets/01-workbench-verified-pass.png` | Gallery #1: Clean Strip & Cyan Overlay | PNG | `1500 × 1000` | `3:2` | `208 KB` | `118 chars` |
| `submission/assets/02-skewed-ems-strip-comparison.png` | Gallery #2: Skewed EMS Strip Comparison | PNG | `1500 × 1000` | `3:2` | `216 KB` | `124 chars` |
| `submission/assets/03-safety-gate-withheld.png` | Gallery #3: Tier 5 GTQI Safety Gate Withhold | PNG | `1500 × 1000` | `3:2` | `259 KB` | `125 chars` |
| `submission/assets/04-heldout-benchmark-120-strips.png` | Gallery #4: 120-Strip Held-Out Benchmark | PNG | `1500 × 1000` | `3:2` | `178 KB` | `122 chars` |
| `submission/assets/05-signal-pipeline-architecture.png` | Gallery #5: 4-Stage Mathematical Pipeline | PNG | `1200 × 800` | `3:2` | `142 KB` | `116 chars` |
| `submission/assets/06-clinical-safety-and-ethics.png` | Gallery #6: Safety Boundary & Ethics | PNG | `1200 × 800` | `3:2` | `128 KB` | `114 chars` |
| `submission/assets/demo.mp4` | Master Demo Video (`88.00s`, `30 fps`) | MP4 (H.264/AAC) | `1920 × 1080` | `16:9` | `12.4 MB` | N/A |

---

## 2. Claim-to-Evidence Traceability Matrix

Every numerical claim in `submission/fields.md` and `README.md` is directly backed by saved, reproducible evaluation artifacts:

| Claim in Submission Text | Exact Value | Backing Evidence File & Reproduction Command |
|---|---|---|
| Held-out cohort size & split | `120 strips` across `24 held-out subjects` (`5 tiers × 24`), `seed = 42` | `evidence/stage-3.5-validation/benchmark_results.json` (`python3 scripts/run_evaluation.py`) |
| Gated Viterbi DP (`GTQI >= 65`) Waveform Fidelity | `18.16 dB SNR` [95% CI: `17.63–18.66`], `37.1 µV RMSE` [95% CI: `34.83–39.41`], `r = 0.9914` at `60.0%` availability (`72/120` strips) | `evidence/stage-3.5-validation/benchmark_results.json` |
| Gated Viterbi DP Clinical Interval Error | `QT MAE = 2.9 ms` [95% CI: `2.02–3.90`], `QRS MAE = 3.5 ms` [95% CI: `3.19–3.94`], `HR MAE = 0.12 BPM`, `QTc MAE = 3.2 ms` | `evidence/stage-3.5-validation/benchmark_results.json` |
| Ungated Viterbi DP (`100%` coverage) | `15.18 dB SNR`, `57.0 µV RMSE`, `QRS MAE = 3.9 ms`, `QT MAE = 9.6 ms`, `QTc MAE = 10.3 ms` | `evidence/stage-3.5-validation/benchmark_results.json` |
| Baselines (`Chromatic Centroid` & `Naive Column-Argmax`) | Centroid: `11.37 dB SNR`, `13.2 ms QT MAE`; Argmax: `11.54 dB SNR`, `25.7 ms QT MAE` (`81.3 ms QT MAE` on Tier 4 faded ink) | `evidence/stage-3.5-validation/benchmark_results.json` |
| Honest Tier 1 Baseline Comparison | On Tier 1 clean 300 DPI scans, Argmax achieves `20.56 dB` vs. Viterbi `19.14 dB` | `evidence/stage-3.5-validation/benchmark_results.json` (`tierBreakdown[0]`) |
| External Real-World PhysioNet `MIT-BIH` Validation | `14.69 dB` mean Viterbi SNR (`r = 0.9419`) across 12 real human records vs. `6.05 dB` Argmax (`+8.64 dB` gain); `100%` pass on negative controls (`NEG-01` blank grid `GTQI = 38`, `NEG-02` collision `GTQI = 41`) | `evidence/stage-3.5-validation/postfix_realworld_results.json` & `validation-report.md` (`python3 scripts/run_realworld_validation.py --phase postfix`) |
| Automated Test & QA Verification | `6/6 pytest` passed; `14/14 Playwright` scenarios passed on desktop (`1440×900`) and mobile (`390×844`) | `tests/test_pipeline.py`, `evidence/stage-3-qa/report.md` |

---

## 3. Public Link Accessibility Verification

All three public links in `submission/fields.md` were verified live:
1. `https://georgefifth.github.io/tracegate/` — `HTTP 200 OK`
2. `https://ai-for-medicine.vercel.app/` — `HTTP 200 OK`
3. `https://github.com/Georgefifth/tracegate` — `HTTP 200 OK`
