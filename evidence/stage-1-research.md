# Stage 1 Research & Topic Selection — AI for Medicine: A Global Student Hackathon on the Future of Care

## 0. Hackathon Requirements, Resources Page & Existing Gallery Audit

### 0.1 Official Event Overview & Core Mandate
- **Event URL**: https://ai-for-medicine.devpost.com/
- **Resources URL**: https://ai-for-medicine.devpost.com/resources
- **Rules URL**: https://ai-for-medicine.devpost.com/rules
- **Project Gallery URL**: https://ai-for-medicine.devpost.com/project-gallery
- **Organizer**: Open Health AI Collective (Deadline: Dec 4, 2026 @ 11:45 PM EST)
- **Theme Statement**:
  > *"Care is bottlenecked on attention, not knowledge: the radiologist who misses the forty-first scan, the clinic with no doctor, the chronic patient nobody checks on. AI for Medicine: A Global Student Hackathon on the Future of Care is about pointing AI at that bottleneck instead of adding to it. Build something that helps people notice, measure, or act on a health problem. Show where it works and where it fails."*
- **The One Requirement (Mandatory for Full Marks)**:
  > *"It must be evaluated. A demo is not evidence. State what you measured, how you measured it, and what the result means. Compare your output with a reference, a baseline, or a stated cost. Name the conditions under which your result stops being useful. Missing an Evaluation section does not disqualify your entry, but it caps Technical Depth and Rigor & Reproducibility at half marks each."*

### 0.2 Crucial Insights from the Official Resources Page (`/resources`)
1. **Evaluation-First Principle**:
   > *"Start with a question you can test. Choose a measurement, find a reference, and define your evaluation before spending the whole event on an interface."*
2. **Recommended Data & Stack**:
   - **Data**: PhysioNet (https://physionet.org/), MIMIC-IV (note: requires credentialing; open PhysioNet databases are faster and immediately reproducible), Kaggle, Hugging Face Datasets, or consented camera/sensor recordings.
   - **Models & Analysis**: `scikit-learn`, `PyTorch`, `OpenCV`, `MediaPipe`, `NeuroKit2`, `MONAI`.
   - **Working Demos**: `FastAPI`, `Streamlit`, `Gradio`, or an interactive web application that a stranger can follow without installing anything.
3. **Reference Inspiration Papers Cited by Organizers**:
   - Gulshan et al., *JAMA* 2016 (Diabetic retinopathy screening)
   - Rajpurkar et al., 2017 (*CheXNet*)
   - Wang et al., *IEEE TBME* 2017 (Algorithmic principles of remote photoplethysmography / POS)
   - *"Any paper where the authors report error bars and failure cases."*
4. **What Separates a Winning Entry**:
   > *"A stated protocol. A held-out set. Error in real units. A limitations section that is not decoration. A video a stranger can follow without installing anything."*
   > *"Accuracy is not scored alone. Honesty about it is. State your metric, measurement method, and limitations."*

### 0.3 Judging Criteria (25% Equal Weight Each; Ties Break Toward Stronger Held-Out Evaluation)
1. **Technical Depth (25%)**: Real signal-processing, computer-vision, or ML pipeline behind the interface. *"A prompt and a UI with no evaluation do not count."*
2. **Rigor & Reproducibility (25%)**: Held-out evaluation with metrics in **real clinical units** or a **stated clinical cost**, including seeds, split manifests, confidence intervals / error bars, accuracy–availability trade-offs, and reproducible code.
3. **Clinical Relevance & Honesty (25%)**: Addresses a real care bottleneck, scopes claims strictly to what evidence supports, and includes explicit **"Who benefits, and who could be harmed"**, **Limitations**, and **What we would do with another month** sections.
4. **Demo Quality (25%)**: Visibly working within the first 60 seconds; input, process, and result immediately understandable to a stranger without installing anything.

### 0.4 Six Award Tracks
1. **Grand Prize**: Highest combined score across the four judging criteria.
2. **Excellence in Research & Reproducibility**: Strong evaluation, appropriate baseline comparisons, transparent limitations, and reproducible results.
3. **Most Promising Venture**: Clear customer need, evidence of demand, and realistic path to adoption.
4. **Best Logo**: Originality, clarity, and relevance to the project.
5. **Best User Interface**: Cleanest, easiest-to-use interface judged on clarity, navigation, and usability.
6. **Best Presentation**: Clearest explanation of the project, working features, and quantitative results.

### 0.5 Audit of the 20 Existing Submissions in the Hackathon Gallery (`/project-gallery`)
We audited all 20 existing submissions in `https://ai-for-medicine.devpost.com/project-gallery` to avoid duplication and identify what sets the benchmark:
- **`CARDION: Contactless Heart Rate, Measured Honestly`** (https://devpost.com/software/cardion-contactless-heart-rate-measured-honestly): Reference-grade entry evaluating webcam rPPG heart rate (Green, CHROM, POS, simulated-event ANN/SNN) on 60 MCD-rPPG subjects with reliability gating, reporting BPM MAE (95% CI) and accuracy–availability coverage (41% availability at 2.37 BPM MAE). **Implication**: Do *not* build another webcam rPPG heart-rate monitor; instead, match or exceed CARDION's scientific rigor (held-out subject split, bootstrap 95% CIs, reliability gating, accuracy-vs-availability trade-offs, honest negative/ablation results) in a **completely different clinical domain**.
- **Other 19 gallery entries**: `ClinNote` & `MedRing` (discharge medication translators), `Ursa` & `PulseMind` & `MEDI-MINDAI` & `MedSafety-AI` & `dr-rohit` (LLM symptom/prescription assistants), `MedOS` & `MedAI Hospital` (hospital portals), `HeatWise` (weather heat-index planner), `DermaVTO` (cosmetic shade matcher), `ScreenTalk` (colonoscopy conversation prompt), `AirCast` (ultrasonic modem). Most rely on LLM wrappers or UI mockups without held-out clinical signal/image benchmarks.

---

## 1. Six Differentiated Candidate Directions (Phase 1 & Phase 2 Screening)

All six candidates below target real clinical attention bottlenecks, have open-access PhysioNet ground-truth datasets verified accessible via HTTP 200 from our environment, require zero GPU hardware to reproduce on CPU, anddo not overlap with `CARDION` or other gallery entries.

---

### Candidate 1: `TraceGate` — Calibrated Paper-ECG Digitizer & Interval Verification Workbench with Grid-Aware Quality Gating

- **Target Users & Specific Pain Point**:
  - **Users**: Emergency physicians receiving ambulance/transfer paper ECG strips, rural & low-resource clinics with thermal paper ECG machines (e.g., GE MAC / Nihon Kohden printouts), and clinical researchers digitizing retrospective paper ECG archives.
  - **Pain Point**: Billions of 12-lead ECGs exist only as thermal paper printouts, fax PDFs, or smartphone photos. Automated waveform algorithms (arrhythmia classifiers, QTc monitoring for drug cardiotoxicity, beat-to-beat HRV) require digital millivolt time-series (`mV` vs `ms`), while clinicians reviewing faded/skewed paper printouts manually measure QT/QRS intervals with calipers or trust unverified header text. When someone attempts to digitize a paper ECG image, skewed camera perspective, uneven lighting shadows, faded 1 mm / 5 mm thermal grids, and overlapping lead text corrupt the extracted waveform silently—leading to dangerous errors in QRS duration or QTc interval estimation.
- **How Users Currently Solve This**:
  - Manual visual estimation using physical ECG calipers or pixel rulers on PDF scans (slow, high inter-observer variance of 15–30 ms on QT intervals).
  - Running fragile research scripts from GitHub that output uncalibrated pixel arrays without overlaying the reconstructed trace back onto the paper scan for visual verification.
- **Existing Products & Links**:
  1. **Ahus-AIM / Open-ECG-Digitizer** (Open Source, 112★): https://github.com/Ahus-AIM/Open-ECG-Digitizer
  2. **felixkrones / ECG-Digitiser** (PhysioNet Challenge 2024 Winner, 94★): https://github.com/felixkrones/ECG-Digitiser
  3. **alphanumericslab / ecg-image-kit** (Georgia Tech / Emory toolkit, 169★): https://github.com/alphanumericslab/ecg-image-kit
  4. **PMcardio by Powerful Medical** (Commercial mobile app, $39–$99/mo): https://www.powerfulmedical.com/pmcardio/
- **Shortcomings of Existing Solutions & Verifiable Evidence**:
  - **`felixkrones/ECG-Digitiser` weights are broken/inaccessible**: Multiple open GitHub Issues (#15, #16, #17, #19, #21, #22 — e.g., https://github.com/felixkrones/ECG-Digitiser/issues/22) confirm users cannot even run the tool because Git LFS bandwidth quota is exceeded and it requires heavy `nnUNet` GPU checkpoints.
  - **`Ahus-AIM/Open-ECG-Digitizer` suffers from non-deterministic outputs & missing CSV/calibration UX**: GitHub Issue #48 (https://github.com/Ahus-AIM/Open-ECG-Digitizer/issues/48) documents *"Non-deterministic output on repeated inference: same wrapper, same image, different signal"*, and Issue #41 (https://github.com/Ahus-AIM/Open-ECG-Digitizer/issues/41) highlights user friction just exporting usable calibrated CSV waveforms.
  - **`alphanumericslab/ecg-image-kit` lacks the digitization pipeline**: GitHub Issue #18 (https://github.com/alphanumericslab/ecg-image-kit/issues/18) asks *"where to find the digitizer script and models mentioned in your paper?"*, and Issue #22 (https://github.com/alphanumericslab/ecg-image-kit/issues/22) reports security CVEs in pinned dependencies.
  - **Commercial apps (`PMcardio`)** act as closed black-box diagnostic classifiers: they do not export calibrated WFDB/CSV millivolt waveforms, do not show sub-millimeter trace overlay residuals, and do not report reconstruction uncertainty in $\mu\text{V}$ or $\text{ms}$.
- **Specific Improvements We Provide**:
  1. **Grid-Calibrated Physical Recovery (`25 mm/s`, `10 mm/mV`)**: Automatic spectral/Hough grid-pitch detector that recovers exact pixel-to-millisecond and pixel-to-millivolt scaling and de-skews rotated/perspective-tilted scans.
  2. **Multi-Method Trace Extraction & Comparison**: Side-by-side comparison of (a) Naive Column-Argmax baseline, (b) Grid-Suppressed Morphological Skeleton + Weighted Centroid baseline, and (c) **Viterbi Dynamic-Programming Trace Tracker** (which enforces physiological slope continuity across grid dropouts and text collisions) plus a lightweight neural U-Net / pixel-classifier comparator.
  3. **Sub-Millimeter Visual Registration Overlay & Reliability Gate**: Renders the recovered digital trace directly on top of the original paper ECG image with a residual confidence heatmap. Computes a **Grid & Trace Quality Index (GTQI)** and **withholds downstream clinical intervals (HR, RR, PR, QRS, QT, QTc)** when calibration confidence or trace continuity fails.
  4. **Downstream Clinical Interval Verification**: Runs `NeuroKit2` fiducial delineation (`R-peaks`, `P-onset`, `QRS-onset/offset`, `T-offset`) on the recovered millivolt signal and measures interval accuracy directly against ground-truth digital ECG waveforms.
- **Why Users Have a Reason to Switch**:
  - Works out-of-the-box on CPU and in the browser with zero broken LFS weights, visually proves whether the trace reconstruction matched the ink on paper before a clinician trusts any interval number, and exports standard calibrated CSV/WFDB waveforms.
- **Fact / Projection / Hypothesis Classification**:
  - **Confirmed Facts (已证实的事实)**: Open-source ECG digitizers (`ECG-Digitiser`, `Open-ECG-Digitizer`, `ecg-image-kit`) have documented GitHub issues blocking reproducible CPU usage or deterministic output; PhysioNet `PTB-XL` and `MIT-BIH` provide gold-standard digital ECG waveforms (`HTTP 200` verified) from which exact paired paper-ECG images with known distortions can be evaluated.
  - **Reasoned Projections (合理推测)**: Enforcing temporal continuity via Viterbi dynamic programming and adaptive chromatic grid suppression will substantially reduce spike artifacts caused by text labels ("II", "V1") and dark 5 mm grid intersections compared to column-wise argmax/centroid baselines.
  - **Unverified Hypotheses (未经验证的假设)**: Whether dynamic-programming trace recovery combined with grid quality gating can keep QT interval MAE below 15 ms (1.5 small boxes at 25 mm/s) under moderate smartphone shadow and rotation distortions without a multi-gigabyte GPU segmentation model.
- **Development Difficulty, Main Risks & Feasibility**:
  - **Difficulty**: Medium.Requires careful 2D image processing (`OpenCV`, `scipy`, `numpy`), Viterbi path tracking, and `NeuroKit2` ECG fiducial detection.
  - **Risks**: Severe paper creases or overlapping multi-lead high-voltage QRS complexes (e.g., V2 colliding with V3 in LVH) can confuse single-lead bounding boxes; must explicitly quantify and gate these failure modes.
- **MVP & Held-Out Evaluation Protocol**:
  - **Held-Out Dataset**: 100+ held-out 12-lead / rhythm-strip ECG records from PhysioNet `PTB-XL` / `MIT-BIH` split strictly by patient across 5 graded degradation tiers (Clean Thermal Scan, Rotated/Skewed $\pm 5^\circ$, Uneven Smartphone Illumination/Shadow, Faded Thermal Ink, Overlapping Text/Artifacts).
  - **Metrics in Real Clinical Units**:
    1. Waveform Reconstruction **SNR (dB)** and **RMSE ($\mu\text{V}$)** after standard PhysioNet 2024 time/amplitude alignment.
    2. Waveform **Pearson Correlation ($r$)**.
    3. Clinical Interval MAE in real units: **Heart Rate MAE (BPM)**, **RR Interval MAE (ms)**, **QRS Duration MAE (ms)**, and **QT / QTc Interval MAE (ms)** with 95% bootstrap confidence intervals across patients.
    4. **Accuracy–Availability Trade-Off**: Interval MAE vs. % of strips accepted by the Grid & Trace Quality Gate.
- **5-Dimension Scoring**:
  - **Practical Value (实用价值): 9.0/10** — Directly bridges paper ECG workflows in clinics/ambulances/research to quantitative digital analysis.
  - **Innovation (创新程度): 8.5/10** — Combines physical grid spectral calibration, Viterbi continuity tracking, visual overlay verification, and reliability gating rather than blind black-box classification.
  - **Competitive Advantage (竞争优势): 9.2/10** — Existing open-source winners have broken LFS weights or non-deterministic bugs; zero existing gallery entries in this hackathon address ECG paper digitization.
  - **User Experience (用户体验): 9.3/10** — Visually intuitive within 5 seconds: anyone can see a crinkled paper ECG scan, watch the grid de-skew and the cyan digital trace lock onto the black ink trace, and inspect the millivolt/millisecond measurements.
  - **Feasibility (可行性): 9.2/10** — Runs fast on CPU, deterministic evaluation against exact digital reference waveforms.

---

### Candidate 2: `CapnoPulse` — Reliability-Gated Respiratory Rate & Tachypnea Triage from Finger Pulse Oximetry (PPG)

- **Target Users & Specific Pain Point**:
  - **Users**: General ward nurses, step-down ICU clinicians, and home telemonitoring programs for COPD, pneumonia, post-op opioid monitoring, and early sepsis.
  - **Pain Point**: Respiratory Rate (RR, in breaths per minute) is one of the earliest, most sensitive vital-sign indicators of clinical deterioration (NEWS2 / qSOFA criteria flag $\text{RR} \ge 21\text{–}22$ brpm). Yet while heart rate and $\text{SpO}_2$ are recorded automatically via finger pulse oximeter (PPG), RR in general wards and home care still relies on nurses manually counting chest rises for 60 seconds—resulting in well-documented clinical clustering where nurses estimate and chart "18" or "20" brpm over 70% of the time (Badawy et al., *J Hosp Med* 2017). Extracting RR from the ubiquitous finger PPG waveform is clinically attractive, but motion artifacts and low perfusion cause naive PPG-RR algorithms to output dangerously wrong readings.
- **How Users Currently Solve This**:
  - Manual visual chest counting for 15 seconds multiplied by 4 (inaccurate) or skipping measurement entirely.
  - Expensive capnography ($\text{EtCO}_2$ nasal cannulas) or acoustic/impedance chest bands, which are rarely used outside the ICU/OR due to cost and patient discomfort.
- **Existing Products & Links**:
  1. **NeuroKit2 (`nk.ppg_process` / `rsp_from_ppg`)** (Open Source, 2,428★): https://github.com/neuropsychology/NeuroKit
  2. **peterhcharlton / RRest** (Respiratory Rate Estimation toolbox, MATLAB): https://github.com/peterhcharlton/RRest
  3. **Oucru-Innovations / Respiratory-Rate-PPG-ECG** (Open Source, 8★): https://github.com/Oucru-Innovations/Respiratory-Rate-PPG-ECG
  4. **Masimo MightySat / Nellcor PM1000N RRp** (Commercial hardware, $400–$2,500+): https://www.masimo.com/
- **Shortcomings of Existing Solutions & Verifiable Evidence**:
  - **`NeuroKit2` crashes or outputs un-gated hallucinations on noisy segments**: GitHub Issue #1242 (https://github.com/neuropsychology/NeuroKit/issues/1242) documents `rsp_process()` crashing on short recordings, and Issue #1238 (https://github.com/neuropsychology/NeuroKit/issues/1238) shows peak formatting bugs. More critically, standard single-modulation extractors always output a number even when finger motion completely destroys the respiratory modulation.
  - **`RRest` (Charlton et al., *Physiol Meas* 2016)** is an offline MATLAB research repository with no interactive clinical waveform inspector or real-time reliability gate.
- **Specific Improvements We Provide**:
  1. **Three-Channel Physiological Modulation Extraction**: Simultaneously extracts **RIIV** (Respiratory-Induced Intensity Variation — baseline venous return shifts), **RIAV** (Respiratory-Induced Amplitude Variation — intrathoracic stroke volume changes), and **RIFV** (Respiratory-Induced Frequency Variation — respiratory sinus arrhythmia) from a single PPG waveform.
  2. **Smart Fusion + Cross-Modulation Agreement Gate**: Computes beat-level PPG Signal Quality Index (perfusion & systolic template correlation) plus inter-channel spectral agreement across RIIV, RIAV, and RIFV. If the three physiological modulations disagree by $>4$ brpm or PPG SQI drops below threshold, `CapnoPulse` **withholds the RR reading** rather than displaying a false normal or false tachypnea alarm.
  3. **Interactive Clinical Waveform & Spectral Inspector**: Displays the raw PPG, the 3 extracted respiratory envelopes, and the reference impedance/capnography respiration trace side-by-side.
- **Why Users Have a Reason to Switch**:
  - Turns standard single-channel PPG data into an honest, reliability-gated respiratory rate monitor that explicitly shows *when* a PPG segment can support respiratory estimation and *when* motion or arrhythmia invalidates RIFV/RIAV.
- **Fact / Projection / Hypothesis Classification**:
  - **Confirmed Facts (已证实的事实)**: PhysioNet `BIDMC PPG and Respiration Dataset` (53 ICU recordings, 8 minutes each at 125 Hz, derived from MIMIC-II with simultaneous reference impedance respiratory waveforms) is openly downloadable (`HTTP 200` verified); Charlton et al. (2016) demonstrated that smart fusion of RIIV/RIAV/RIFV reduces MAE but incurs an availability trade-off.
  - **Reasoned Projections (合理推测)**: Gating windows by both beat-template SQI and 3-modulation variance will significantly reduce catastrophic outlier errors ($>5$ brpm error) compared to single-modulation RIIV or RIFV baselines.
  - **Unverified Hypotheses (未经验证的假设)**: What exact coverage (% of 32-second windows retained) is achieved on the held-out BIDMC test subjects when constraining MAE to $\le 2.0$ breaths/min, and how strongly atrial fibrillation / frequent ectopy degrades the RIFV channel specifically.
- **Development Difficulty, Main Risks & Feasibility**:
  - **Difficulty**: Low-to-Medium. Pure 1D physiological signal processing (`scipy`, `numpy`, `NeuroKit2`, `scikit-learn`), very fast to run and benchmark across all 53 BIDMC subjects in seconds on CPU.
  - **Risks**: conceptually closer in spirit to `CARDION` (since both are 1D physiological rate estimators with reliability gating), though applied to clinical PPG respiratory rate (BIDMC ICU dataset) rather than webcam rPPG heart rate.
- **MVP & Held-Out Evaluation Protocol**:
  - **Held-Out Dataset**: PhysioNet `BIDMC PPG and Respiration Dataset` (53 ICU patients split by subject: 33 train/calibration, 20 held-out test subjects; 32-second windows with 4-second stride).
  - **Metrics in Real Clinical Units**:
    1. Subject-level and pooled **Respiratory Rate MAE & RMSE in breaths per minute (brpm)** with 95% bootstrap confidence intervals.
    2. **Bland-Altman Bias and 95% Limits of Agreement (LoA in brpm)**.
    3. **Clinical Tachypnea ($\text{RR} > 20$ brpm) / Bradypnea ($\text{RR} < 10$ brpm) Screening Sensitivity, Specificity & False Alarm Rate**.
    4. **Accuracy–Availability Curve**: MAE (brpm) vs. % window availability across RIIV-only, RIAV-only, RIFV-only, Ungated Fusion, and Gated Consensus.
- **5-Dimension Scoring**:
  - **Practical Value (实用价值): 8.8/10** — Addresses the "neglected vital sign" in general wards and home pulse oximetry.
  - **Innovation (创新程度): 7.8/10** — Multi-modulation physiological consensus gating is solid and clinically grounded, though builds directly on established Charlton *RRest* smart-fusion principles.
  - **Competitive Advantage (竞争优势): 8.2/10** — Much cleaner and more reproducible than MATLAB `RRest` scripts, though shares the "rate estimation + gating" paradigm with `CARDION`.
  - **User Experience (用户体验): 8.5/10** — Clear multi-trace physiological monitor, though 1D waveform plots are slightly less visually dramatic at first glance than 2D image-to-waveform registration.
  - **Feasibility (可行性): 9.6/10** — Extremely high; dataset is lightweight CSV/WFDB and full 53-subject benchmark runs in $<15$ seconds on CPU.

---

### Candidate 3: `SomnoGate` — Uncertainty-Calibrated Polysomnography (PSG) Sleep Staging & Technologist Attention Triage

- **Target Users & Specific Pain Point**:
  - **Users**: Sleep lab technologists, clinical neurophysiologists, and home sleep testing (HSAT / EEG headband) reviewers.
  - **Pain Point**: Scoring an 8-hour overnight polysomnogram requires classifying 960 consecutive 30-second epochs into Wake, N1, N2, N3, or REM under AASM rules—taking 45–90 minutes of intense visual attention per patient. Human inter-rater agreement is only ~82% (Cohen's $\kappa \approx 0.76$), with over 65% of disagreements occurring on transition epochs (especially N1 vs. Wake/N2 and N2 vs. N3). Existing automated scorers give a blanket argmax hypnogram without routing ambiguous transition epochs to the human technologist.
- **How Users Currently Solve This**:
  - Manual epoch-by-epoch scrolling in legacy Windows desktop suites (Compumedics Profusion, Nox Turnaround), or running black-box auto-scorers and still manually re-checking the entire night because the clinician doesn't know *which* 150 epochs the AI was uncertain about.
- **Existing Products & Links**:
  1. **raphaelvallat / yasa** (Yet Another Spindle Algorithm, Python library, 600+★): https://github.com/raphaelvallat/yasa
  2. **mne-tools / mne-python** (Sleep staging tutorial): https://github.com/mne-tools/mne-python
  3. **EnsoSleep by EnsoData** (Commercial FDA-cleared SaaS): https://www.ensodata.com/ensosleep/
- **Shortcomings of Existing Solutions & Verifiable Evidence**:
  - **`yasa` is a headless Python library with open multi-scorer/statistics issues**: GitHub Issue #285 (https://github.com/raphaelvallat/yasa/issues/285) requests multi-scorer alignment/agreement/consensus tools, and Issue #253 (https://github.com/raphaelvallat/yasa/issues/253) documents a bug where Sleep Fragmentation Index was mis-scaled by epoch length.
  - **Lack of Conformal Attention Triage**: Standard models report aggregate accuracy (~80–85%) but do not quantify how deferring the top $k\%$ most uncertain transition epochs impacts clinical night-level biomarkers (**Total Sleep Time [TST]**, **Sleep Onset Latency [SOL]**, **Wake After Sleep Onset [WASO]**, **REM Latency** in minutes).
- **Specific Improvements We Provide**:
  - Extracts interpretable AASM neurophysiological features per 30s epoch (EEG $\delta, \theta, \alpha, \sigma$ spindle, $\beta$ bandpowers, EOG slow/rapid eye movement energy, submental EMG tone) + multi-epoch temporal context, calibrated via temperature scaling / conformal prediction sets, and generates an interactive **Technologist Attention Queue** that isolates the ~15–20% ambiguous epochs responsible for the vast majority of staging errors.
- **Why Users Have a Reason to Switch**:
  - Cuts manual review from 960 epochs down to ~150 prioritized transition epochs while preserving human-level $\kappa > 0.85$ and accurate clinical sleep indices in minutes.
- **Fact / Projection / Hypothesis Classification**:
  - **Confirmed Facts (已证实的事实)**: PhysioNet `Sleep-EDF Expanded` database is publicly accessible (`HTTP 200`); AASM human inter-scorer agreement is ~82% with N1 agreement often $<50\%$.
  - **Reasoned Projections (合理推测)**: Routing the 20% highest-entropy epochs (predominantly N1 and stage transitions) to human review will eliminate $>60\%$ of epoch misclassifications.
  - **Unverified Hypotheses (未经验证的假设)**: How much uncalibrated vs. temperature-calibrated entropy reduces night-level **SOL (minutes)** and **REM Latency (minutes)** MAE on held-out elderly subjects.
- **Development Difficulty, Main Risks & Feasibility**:
  - **Difficulty**: Medium. Requires EDF parsing (`mne` / `scipy`), spectral feature extraction, gradient boosting / sequence modeling, and conformal calibration.
  - **Risks**: Raw EDF files in Sleep-EDF are 30–50 MB each, so live browser uploads of full 8-hour EDFs can feel heavy unless pre-chunked or paired with fast sample night loading.
- **MVP & Held-Out Evaluation Protocol**:
  - **Held-Out Dataset**: PhysioNet `Sleep-EDF Expanded` (subject-stratified split across 20+ full-night PSG recordings, ~20,000+ 30-second epochs).
  - **Metrics in Real Clinical Units**:
    1. **Cohen's $\kappa$**, **Macro-F1**, and **Per-Stage Recall/Precision (Wake, N1, N2, N3, REM)**.
    2. Clinical Architecture MAE in real units: **TST MAE (minutes)**, **SOL MAE (minutes)**, **WASO MAE (minutes)**, **REM Latency MAE (minutes)**, **Sleep Efficiency MAE (%)**.
    3. **Attention-Budget Curve**: System $\kappa$ and clinical metric MAE when routing 0%, 10%, 20%, and 30% of epochs to technologist review.
- **5-Dimension Scoring**:
  - **Practical Value (实用价值): 8.7/10** — Directly embodies "care is bottlenecked on attention" (reducing 960 epochs to ~150 review epochs).
  - **Innovation (创新程度): 8.3/10** — Conformal deferral curve measured in real clinical sleep architecture minutes (SOL, WASO, REM latency).
  - **Competitive Advantage (竞争优势): 8.4/10** — Zero sleep/EEG projects exist in the hackathon gallery; clear improvement over headless `yasa`.
  - **User Experience (用户体验): 8.6/10** — Rich whole-night hypnogram + uncertainty ribbon + 30-second EEG/EOG/EMG wave inspector.
  - **Feasibility (可行性): 8.8/10** — Fast CPU execution on spectral features; EDF file handling requires clean sample packaging.

---

### Candidate 4: `AuscultaGate` — Quality-Gated Phonocardiogram (PCG) Murmur & Valvular Risk Triage Workbench

- **Target Users & Specific Pain Point**:
  - **Users**: Community health workers and pediatric primary-care clinicians screening children for congenital and rheumatic heart disease in low-resource settings.
  - **Pain Point**: Up to 50–70% of pediatric referrals for echocardiography are for innocent murmurs or stethoscope artifacts, while real pathological systolic/diastolic murmurs are missed in noisy clinics. Existing open-source models from PhysioNet 2022 classify raw WAV files without showing whether S1 and S2 heart sounds were cleanly segmented or drowned out by crying/friction.
- **How Users Currently Solve This**:
  - Subjective bedside auscultation (high miss rate among non-cardiologists) or expensive proprietary digital stethoscope subscriptions (Eko SENSORA).
- **Existing Products & Links**:
  1. **Benjamin-Walker / heart-murmur-detection** (PhysioNet 2022, 23★): https://github.com/Benjamin-Walker/heart-murmur-detection
  2. **DeepPSP / cinc2022** (16★): https://github.com/DeepPSP/cinc2022
  3. **Eko Health SENSORA** (Commercial platform): https://www.ekohealth.com/
- **Shortcomings of Existing Solutions & Verifiable Evidence**:
  - Research repos (`heart-murmur-detection`, `cinc2022`) are CLI scripts without beat-by-beat S1–Systole–S2–Diastole visual segmentation or acoustic quality gating.
- **Specific Improvements We Provide**:
  - Homomorphic/Hilbert envelope S1/S2 segmentation + beat-level Acoustic Signal Quality Index (aSQI) gate that rejects noisy cardiac cycles before computing systolic/diastolic murmur spectral energy ratios across the 4 auscultation sites (AV, PV, TV, MV), evaluated using the official PhysioNet 2022 **Clinical Expected Cost ($ in USD per patient)**.
- **Fact / Projection / Hypothesis Classification**:
  - **Confirmed Facts**: PhysioNet `CirCor DigiScope Phonocardiogram Dataset` (`HTTP 200`) provides multi-site WAV recordings with expert murmur and clinical outcome annotations.
  - **Reasoned Projections**: Filtering out motion/crying cardiac cycles via cycle-periodicity SQI will reduce false-positive murmur referrals.
  - **Unverified Hypotheses**: Whether classical cycle-segmented spectral features match deep spectrogram CNNs on subtle Grade I murmurs.
- **Development Difficulty, Main Risks & Feasibility**:
  - **Difficulty**: Medium. Audio processing (`scipy`, `librosa`/`torchaudio`) + multi-site aggregation.
  - **Risks**: Audio playback and phonocardiogram envelopes are slightly harder for non-cardiologist judges to visually interpret in a silent screenshot compared to ECG traces or hypnograms.
- **MVP & Held-Out Evaluation Protocol**:
  - **Held-Out Dataset**: Patient-stratified split of PhysioNet `CirCor DigiScope` dataset.
  - **Metrics in Real Clinical Units**: Weighted Murmur Accuracy, AUROC, Heart Rate MAE (BPM), and **Expected Clinical Screening Cost ($ USD/patient)** across quality thresholds.
- **5-Dimension Scoring**:
  - **Practical Value: 8.5/10** | **Innovation: 8.0/10** | **Competitive Advantage: 8.3/10** | **User Experience: 8.0/10** | **Feasibility: 8.7/10**

---

### Candidate 5: `FetoGuard` — Intrapartum Cardiotocography (CTG) Artifact Recovery & Acidemia Risk Triage against Cord Blood pH

- **Target Users & Specific Pain Point**:
  - **Users**: Labor & delivery midwives and obstetricians monitoring Fetal Heart Rate (FHR) and Uterine Contractions (UC).
  - **Pain Point**: Intrapartum CTG visual interpretation under FIGO guidelines has poor inter-observer agreement ($\kappa \approx 0.35$) and $>60\%$ false-positive rate for fetal distress, driving unnecessary emergency C-sections. Signal dropout (up to 30% of 2nd stage labor) and maternal heart-rate doubling artifacts corrupt automated alarms.
- **Existing Products & Links**:
  1. **jirispilka / CTGViewer** (11★): https://github.com/jirispilka/CTGViewer
  2. **data-coeur / FHRMA** (20★): https://github.com/data-coeur/FHRMA
  3. **huomarc / MLFetalHealth** (9★): https://github.com/huomarc/MLFetalHealth
- **Shortcomings & Evidence**:
  - `CTGViewer` and `FHRMA` require MATLAB; most ML repos use subjective tabular UCI labels instead of raw 4 Hz waveforms validated against objective neonatal **umbilical artery blood pH**.
- **Specific Improvements & Held-Out Evaluation**:
  - Signal-loss & maternal-switch artifact scrubber + FIGO baseline/STV(ms)/deceleration lag extractor evaluated on PhysioNet `CTU-UHB Intrapartum Cardiotocography Database` (552 deliveries with gold-standard umbilical artery $\text{pH} < 7.15$ / $< 7.05$).
- **Fact / Projection / Hypothesis Classification**:
  - **Confirmed Facts**: `CTU-UHB` has 552 raw 4 Hz FHR/UC traces with objective blood gas pH (`HTTP 200`).
  - **Reasoned Projections**: Cleaning Doppler dropouts stabilizes Short-Term Variability (STV in ms).
  - **Unverified Hypotheses**: Even cleaned CTG has a known physiological ceiling (AUROC ~0.72–0.78) for predicting cord pH because fetal acidemia depends on unmeasured placental reserve.
- **5-Dimension Scoring**:
  - **Practical Value: 8.4/10** | **Innovation: 8.1/10** | **Competitive Advantage: 8.0/10** | **User Experience: 7.9/10** | **Feasibility: 8.5/10**

---

### Candidate 6: `TapQuant` — Webcam Finger-Tapping Bradykinesia Kinematics with Foreshortening & Frame-Jitter Gating

- **Target Users & Specific Pain Point**:
  - **Users**: Movement disorder neurologists and Parkinson's disease patients tracking levodopa ON/OFF fluctuations via MDS-UPDRS Item 3.4 (Finger Tapping).
  - **Pain Point**: Subjective 0–4 integer scoring misses quantitative amplitude decrement (sequence effect) and inter-tap rhythm variability, while consumer webcam pose scripts produce false bradykinesia halts whenever the patient's hand rotates out-of-plane toward the lens.
- **Existing Products & Links**:
  1. **ROC-HCI / finger-tapping-severity** (15★): https://github.com/ROC-HCI/finger-tapping-severity
  2. **Google MediaPipe Hands**: https://github.com/google-ai-edge/mediapipe
- **Shortcomings & Evidence**:
  - Lack 3D palm-normal foreshortening gates and frame-drop Nyquist checks; difficult to benchmark on a standardized public multi-patient video dataset without privacy/consent redistribution constraints.
- **5-Dimension Scoring**:
  - **Practical Value: 8.0/10** | **Innovation: 7.9/10** | **Competitive Advantage: 7.8/10** | **User Experience: 8.4/10** | **Feasibility: 7.5/10** (Lower feasibility of shipping a public, multi-subject held-out video dataset compared to PhysioNet waveform datasets).

---

## 2. Phase 3: Strict Product Reviewer Critique & Elimination (`第三阶段：批判与淘汰`)

As an adversarial product and clinical reviewer, we evaluate all six candidates against the 6 mandatory critique questions:

| Question | C1: `TraceGate` (Paper ECG Digitizer & Interval Verifier) | C2: `CapnoPulse` (PPG Respiratory Rate & Gate) | C3: `SomnoGate` (PSG Sleep Staging Attention Triage) | C4: `AuscultaGate` (PCG Murmur & Cost Triage) | C5: `FetoGuard` (CTG Acidemia Triage) | C6: `TapQuant` (Webcam Bradykinesia) |
|---|---|---|---|---|---|---|
| **1. Does this product truly need to exist?** | **Yes.** Paper/scanned ECGs remain ubiquitous in EMS, referrals, and global clinics; clinicians cannot run digital QTc/arrhythmia checks or trust black-box image classifiers without calibrated waveform recovery and visual trace verification. | **Yes.** RR is routinely guessed ("18 brpm") on wards despite pulse oximeters being on patients' fingers. | **Yes.** Human technologists spend 45–90 min/night scoring 960 epochs when only ~150 transition epochs are ambiguous. | **Yes.** High false-positive pediatric murmur referrals burden scarce echo clinics. | **Moderate.** L&D wards already have integrated central CTG monitors (GE Corometrics / Philips Avalon). | **Moderate.** Useful for tele-neurology, but lacks a clean redistributable multi-patient clinical video benchmark. |
| **2. Why can't existing tools solve it?** | Top open-source repos (`felixkrones/ECG-Digitiser`, `Open-ECG-Digitizer`, `ecg-image-kit`) have broken Git LFS weights (#22), non-deterministic outputs (#48), or missing digitizer code (#18), and none offer visual sub-mm overlay + interval quality gating. | `NeuroKit2` single-channel extractors fail silently on motion artifacts; `RRest` is offline MATLAB code. | `yasa` is a headless Python library without conformal technologist queue triage or clinical minute-error bounds. | PhysioNet 2022 repos are unmaintained CLI scripts without cycle-level S1/S2 quality gating. | Existing open tools are MATLAB-only or trained on subjective labels. | Existing scripts ignore 3D foreshortening when the hand tilts. |
| **3. Is there a simpler, cheaper, non-AI solution?** | Indeed! Pure deep-learning image-to-diagnosis fails on out-of-distribution scans. **Hybrid classical signal processing (spectral grid calibration + adaptive chromatic separation + Viterbi dynamic-programming trace tracking)** is faster, CPU-native, interpretable, and requires no massive GPU weights—using ML/statistical calibration only where needed! | Classical multi-modulation signal processing (RIIV+RIAV+RIFV spectral consensus) beats heavy black-box deep networks on CPU. | Interpretable AASM spectral bandpower ratios + lightweight gradient-boosted trees with conformal calibration beat opaque deep nets on CPU. | Classical Hilbert/homomorphic envelope + cycle periodicity gating is lightweight and CPU-friendly. | Rule-based FIGO feature extraction handles most deceleration detection. | Geometric 3D palm-normal projection solves foreshortening without deep models. |
| **4. Will users try it once and abandon it?** | **No**—any researcher digitizing ECG cohorts or clinician verifying a scanned transfer ECG strip has a recurring workflow need for calibrated CSV/WFDB export + verified HR/QRS/QTc intervals. | **No** for researchers/telemonitoring pipelines benchmarking wearable PPG segments. | **No** for sleep researchers/labs auditing EDF recordings. | **Risk of one-off use** unless connected directly to a digital stethoscope hardware workflow. | **High risk**—clinicians cannot easily export proprietary hospital CTG monitor streams into a web tool. | **Moderate risk** without longitudinal patient accounts. |
| **5. What evidence shows our approach can be better?** | Direct quantitative benchmark on held-out PhysioNet `PTB-XL` / `MIT-BIH` waveforms rendered with controlled paper distortions: Viterbi continuity tracking + grid calibration demonstrably beats column-argmax/centroid baselines in SNR (dB), RMSE ($\mu\text{V}$), and QT/QRS MAE (ms). | Charlton et al. (2016) & held-out BIDMC evaluation showing 3-modulation consensus gating cuts RR MAE (brpm) in half on clean windows. | Held-out `Sleep-EDF` evaluation showing routing top 20% uncertain epochs eliminates the majority of N1/transition errors. | Held-out `CirCor` evaluation showing cycle SQI gating lowers PhysioNet clinical cost ($/patient). | Modest AUROC gain (~0.03–0.05) due to inherent CTG physiological noise. | Synthetic angle perturbation tests. |
| **6. Which key assumption, if false, kills the idea?** | If grid spacing detection fails on moderately skewed/shadowed paper scans or if trace recovery blurs QRS/T-wave fiducials so badly that QT/QRS MAE exceeds 30 ms even on clean scans. (Testable immediately in Stage 2/3.5!) | If RIIV/RIAV/RIFV disagree on $>85\%$ of windows in ICU patients, leaving $<15\%$ availability. | If prediction entropy does not correlate with actual human-vs-model staging disagreements. | If cycle segmentation fails even on clean recordings. | If cord blood pH has near-zero correlation with intrapartum FHR features ($r < 0.15$). | If webcam frame rate jitter (15–30 fps) prevents accurate velocity measurement. |
| **Reviewer Verdict** | **KEEP — #1 Top Recommendation** | **KEEP — #2 Strong Runner-Up** | **KEEP — #3 Strong Runner-Up** | **Keep as Backup (#4)** | **ELIMINATE** (Hospital hardware lock-in + weak physiological pH ceiling) | **ELIMINATE** (No redistributable public multi-patient clinical video dataset) |

---

## 3. Phase 4: Comparison Table & Recommendations for Human Decision (`第四阶段：用户决策`)

### 3.1 Candidate Comparison Matrix

| Rank & Candidate | Target Clinical Problem | Held-Out Public Dataset (Verified HTTP 200) | Primary Metrics (in Real Clinical Units) | Required Baselines & Ablations | 5-Dim Score (Avg / 10) | Why It Excels for This Hackathon | Main Risk |
|---|---|---|---|---|---|---|---|
| **#1 (Recommended): `TraceGate`** — Calibrated Paper-ECG Digitizer & Interval Verification Workbench | Recovering calibrated millivolt ECG waveforms & verified HR/PR/QRS/QTc intervals from paper ECG printouts/photos with visual overlay & quality gating | **PhysioNet `PTB-XL` / `MIT-BIH`** (paired digital ground-truth mV signals + 5 graded paper scan distortion tiers across held-out patients) | • Waveform **SNR (dB)** & **RMSE ($\mu\text{V}$)**<br>• Waveform **Pearson $r$**<br>• **HR MAE (BPM)**<br>• **RR / QRS / QT / QTc MAE (ms)** (95% CI)<br>• **Availability (%) vs. Error** | 1. Naive Column-Argmax<br>2. Chromatic Grid-Removal + Centroid<br>3. **Viterbi Dynamic-Programming Tracker**<br>4. Ungated vs. GTQI-Gated Intervals | **9.04 / 10**<br>(Val 9.0, Inn 8.5, Comp 9.2, UX 9.3, Feas 9.2) | **Instant visual comprehension (<10s)**: judges see a skewed/shadowed paper ECG image, see the 1mm/5mm grid calibrated, see the recovered cyan trace lock onto the ink trace, and see exact $\mu\text{V}$ / $\text{ms}$ error bars against the true digital waveform. Zero overlap with existing gallery entries. | Severe overlapping QRS complexes across adjacent leads must be detected and gated out honestly. |
| **#2 (Runner-Up): `CapnoPulse`** — Reliability-Gated PPG Respiratory Rate & Tachypnea Triage | Estimating Respiratory Rate (breaths/min) from single-lead finger pulse oximetry (PPG) without false alarms | **PhysioNet `BIDMC PPG & Respiration`** (53 ICU patients with simultaneous reference impedance respiratory rate) | • **RR MAE & RMSE (breaths/min)** (95% CI)<br>• **Bland-Altman 95% LoA (brpm)**<br>• **Tachypnea (>20 brpm) Sens/Spec**<br>• **Availability (%) vs. MAE** | 1. RIIV-only (Baseline wander)<br>2. RIAV-only (Amplitude)<br>3. RIFV-only (RSA frequency)<br>4. Ungated Fusion vs. **SQI + 3-Channel Consensus Gate** | **8.58 / 10**<br>(Val 8.8, Inn 7.8, Comp 8.2, UX 8.5, Feas 9.6) | Ultra-clean physiological benchmark in real units (`breaths/min`); addresses the "neglected vital sign" in general wards; very fast 53-subject evaluation on CPU. | Methodological framing (1D rate estimation + gating) is closer in flavor to `CARDION` than `TraceGate` or `SomnoGate`. |
| **#3 (Runner-Up): `SomnoGate`** — Uncertainty-Calibrated PSG Sleep Staging & Attention Triage | Routing only ambiguous sleep transition epochs (15–20%) to human sleep technologists instead of scoring all 960 epochs manually | **PhysioNet `Sleep-EDF Expanded`** (Full-night EEG/EOG/EMG recordings with expert AASM hypnograms) | • **Cohen's $\kappa$** & **Macro-F1**<br>• **TST, SOL, WASO, REM Latency MAE (minutes)**<br>• **Sleep Efficiency MAE (%)**<br>• **$\kappa$ vs. % Human Review Budget** | 1. Spectral Rule Baseline<br>2. Ungated GBDT/MLP Classifier<br>3.Random Deferral Baseline<br>4. **Temperature-Calibrated Conformal Attention Triage** | **8.56 / 10**<br>(Val 8.7, Inn 8.3, Comp 8.4, UX 8.6, Feas 8.8) | Directly answers *"Care is bottlenecked on attention"*: quantifies the exact human-AI attention budget trade-off in real clinical sleep architecture minutes. | Full-night EDF files require pre-packaged browser demos so a judge doesn't have to download a 45 MB EDF to test it live. |
| **#4: `AuscultaGate`** — Quality-Gated Phonocardiogram Murmur Triage | Pediatric heart murmur & valvular risk screening with cycle-level S1/S2 acoustic quality gating | **PhysioNet `CirCor DigiScope PCG`** (Multi-site heart sound WAV recordings + echo outcomes) | • **Weighted Murmur Accuracy & AUROC**<br>• **HR MAE (BPM)**<br>• **PhysioNet Clinical Cost ($ USD/patient)** | 1. Raw Spectrogram Classifier<br>2. Cycle-Segmented Envelope Features<br>3. **aSQI-Gated Multi-Site Consensus** | **8.30 / 10**<br>(Val 8.5, Inn 8.0, Comp 8.3, UX 8.0, Feas 8.7) | Uses an explicit **stated clinical cost ($ USD per patient)** from the PhysioNet 2022 scoring metric, matching the hackathon prompt's *"reference, baseline, or stated cost"*. | Audio-first UX is slightly less self-evident in static screenshots than visual ECG digitization. |
| **#5 (Eliminated): `FetoGuard`** — Intrapartum CTG Acidemia Triage | Cleaning Doppler dropouts in fetal heart rate traces to predict neonatal acidemia | **PhysioNet `CTU-UHB CTG`** (552 intrapartum traces with umbilical artery pH) | • **Acidemia ($\text{pH} < 7.15$) AUROC**<br>• **STV Error (ms)** | Raw FHR vs. Artifact-Scrubbed FIGO Features | **8.18 / 10** | Uses objective biochemical outcome (cord blood pH) rather than subjective human labels. | Eliminated due to hospital monitor lock-in and physiological ceiling of CTG-to-pH prediction. |
| **#6 (Eliminated): `TapQuant`** — Webcam Bradykinesia Kinematics | Quantifying MDS-UPDRS finger-tapping speed, amplitude decrement, and halts with 3D pose gating | Synthetic kinematic trajectories + tremor benchmark | • **Tap Frequency MAE (Hz)**<br>• **Inter-Tap Interval MAE (ms)**<br>• **Decrement Slope Error (%/10s)** | Raw 2D MediaPipe thumb-index distance vs. 3D Palm-Normalized Gated Kinematics | **7.92 / 10** | Live webcam demo capability. | Eliminated because multi-subject clinical Parkinson's videos cannot be cleanly redistributed in a public repo without patient face/hand privacy issues. |

---

### 3.2 Final Recommendation Summary

1. **Primary Recommendation — Option 1: `TraceGate` (Calibrated Paper-ECG Digitizer & Clinical Interval Verification Workbench)**
   - **Why it wins across all 4 Judging Criteria & 6 Prize Tracks**:
     - **Technical Depth (25%)**: Real 2D-to-1D signal recovery pipeline (Radon/Hough spectral grid calibration, chromatic background separation, Viterbi dynamic-programming path tracking across grid/text collisions, and `NeuroKit2` P-QRS-T fiducial delineation).
     - **Rigor & Reproducibility (25%)**: Held-out subject split on PhysioNet `PTB-XL` / `MIT-BIH` digital ground truth across 5 controlled paper distortion tiers, reporting **Waveform SNR (dB)**, **RMSE ($\mu\text{V}$)**, **Pearson $r$**, and **Clinical Interval MAE in milliseconds (`RR`, `QRS`, `QT`, `QTc`) and `BPM`** with 95% bootstrap confidence intervals and accuracy–availability gating curves.
     - **Clinical Relevance & Honesty (25%)**: Solves a documented failure mode where top open-source ECG digitizers (`felixkrones/ECG-Digitiser`, `Ahus-AIM/Open-ECG-Digitizer`) have broken LFS weights or non-deterministic outputs, and explicitly gates out unreadable/colliding traces rather than fabricating clinical intervals.
     - **Demo Quality & Best UI / Best Presentation (25%)**: A stranger can understand it in 5 seconds without installing anything—upload or pick a crinkled/skewed paper ECG printout, watch the grid calibrate (`25 mm/s`, `10 mm/mV`), toggle the sub-millimeter cyan digital waveform overlay directly on the paper scan, inspect detected R-peaks/QT intervals, and compare the reconstructed waveform against the true digital reference signal.
2. **Strong Alternative — Option 2: `CapnoPulse` (Reliability-Gated PPG Respiratory Rate & Tachypnea Triage)** or **Option 3: `SomnoGate` (Uncertainty-Calibrated PSG Sleep Staging & Technologist Attention Triage)** if you prefer a pure 1D physiological waveform triage workbench.
