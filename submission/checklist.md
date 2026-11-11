# Human Submission Checklist — TraceGate (`AI for Medicine` Hackathon)

> Per `AGENTS.md` Rule 2, the AI agent never registers accounts, logs into Devpost, fills online forms, or clicks Submit. Follow the steps below to complete the submission in `< 5 minutes`.

## Step-by-Step Submission Procedure

1. **Upload the Demo Video (`submission/assets/demo.mp4`)**:
   - Upload `/home/yap/Hack/ai-for-medicine/submission/assets/demo.mp4` (`1920×1080`, `30 fps`, `88.0 seconds`, `12.4 MB`) to **YouTube** (Public or Unlisted) or **Vimeo**.
   - Copy the video URL.
2. **Open the Devpost Submission Form**:
   - Navigate to `https://ai-for-medicine.devpost.com/` and open your project submission draft.
3. **Copy & Paste Fields from `submission/fields.md`**:
   - **Project Name**: Copy Section 1 (`TraceGate: Calibrated Paper-ECG Digitizer, Measured Honestly`).
   - **Elevator Pitch**: Copy Section 2 (`186` characters, within the `200`-character limit).
   - **Thumbnail**: Upload `submission/assets/thumbnail.png` (`1200×800`, 3:2 ratio, `121 KB`).
   - **About the Project**: Copy the entire Markdown block inside Section 4 (`## Inspiration` through `## Attribution and AI disclosure`).
   - **Built With**: Paste the tags from Section 5 (`python`, `scipy`, `numpy`, `wfdb`, `pillow`, `fastapi`, `react`, `typescript`, `vite`, `html5-canvas`, `playwright`, `physionet`).
   - **"Try it out" Links**: Add the 3 verified public URLs from Section 6:
     - `https://georgefifth.github.io/tracegate/`
     - `https://ai-for-medicine.vercel.app/`
     - `https://github.com/Georgefifth/tracegate`
   - **Image Gallery**: Upload the 6 PNG files in `submission/assets/01-*.png` through `06-*.png` and paste their matching `< 150` character captions from Section 7.
   - **Video Link**: Paste your YouTube/Vimeo link from Step 1.
4. **Verify & Click Submit**:
   - Preview the rendered Devpost page to confirm headings, code-formatted formulas, gallery images, and video embed display properly, then click **Submit**.

---

## Pre-Submission Verification Checklist (All Verified by Agent)

- [x] **Project Name**: Clear, relevant, and matches repository/demo (`TraceGate: Calibrated Paper-ECG Digitizer, Measured Honestly`).
- [x] **Elevator Pitch**: `186 / 200` characters (`<= 200` character limit verified).
- [x] **Thumbnail (`submission/assets/thumbnail.png`)**: Dedicated generated artwork (not cropped from screenshot), `1200 × 800` (3:2 ratio), `121 KB` (`< 5 MB`).
- [x] **About the Project (`submission/fields.md`)**:
  - [x] Includes problem statement and who has it (`## Inspiration` & `## What it does`).
  - [x] Includes method explanation (`## How we built it`) using backtick-wrapped plain-text formulas (safe for Devpost Markdown).
  - [x] Includes mandatory **`## Evaluation`** section with held-out metric (`SNR` in dB, `RMSE` in µV, `HR` in BPM, `QRS`/`QT`/`QTc` in ms), 95% bootstrap CIs, baseline comparisons (`Viterbi DP` vs. `Centroid` vs. `Column-Argmax`), and accuracy–availability coverage (`60.0%` vs. `100.0%`).
  - [x] Includes mandatory **`## Who benefits, and who could be harmed`** section.
  - [x] Includes mandatory **`## Limitations`** section (including honest negative findings on Tier 1 and boundary failures on `MIT-BIH #119`).
  - [x] Includes mandatory **`## What we would do with another month`** section.
  - [x] Includes mandatory **`## Attribution and AI disclosure`** section.
  - [x] Every numerical claim matches Stage 3.5 verified results (`evidence/stage-3.5-validation/validation-report.md`).
- [x] **Public Links Verified Accessible (`HTTP 200`)**:
  - [x] `https://georgefifth.github.io/tracegate/` (`HTTP 200`)
  - [x] `https://ai-for-medicine.vercel.app/` (`HTTP 200`)
  - [x] `https://github.com/Georgefifth/tracegate` (`HTTP 200`, public repository with `README.md` and reproduction instructions, zero secrets).
- [x] **Gallery Images (`submission/assets/01..06-*.png`)**: All 6 images are `PNG`, exact `3:2` aspect ratio (`1500×1000` or `1200×800`), `128 KB – 259 KB` (`< 5 MB`), with captions `114 – 125` characters (`<= 150` chars).
- [x] **Demo Video (`submission/assets/demo.mp4`)**: `1920 × 1080`, `30 fps`, `88.00 seconds` (`>= 60 seconds` rule requirement), visibly showing the project working within the first 60 seconds (`t = 11.75s`).
