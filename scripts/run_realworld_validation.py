#!/usr/bin/env python3
"""
Stage 3.5 Real-World Validation Runner for TraceGate.
Downloads real human ECG waveforms & cardiologist R-peak annotations from PhysioNet
(MIT-BIH Arrhythmia Database v1.0.0) and evaluates TraceGate alongside baselines
across Basic, Intermediate, Advanced, Edge, Negative, and Adversarial cases.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
import time
from pathlib import Path
from typing import Any, Dict, List

import numpy as np
import wfdb
from scipy import signal

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from tracegate.pipeline import (
    digitize_paper_ecg_array,
    render_paper_ecg_image,
)

CACHE_DIR = ROOT / "evidence" / "stage-3.5-validation" / "physionet_real_cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

MITBIH_RECORDS = [
    ("100", "Normal Sinus Rhythm (69M, MLII)", "Basic", "tier1_clean", 0.0),
    ("101", "Normal Sinus Rhythm (75F, MLII)", "Basic", "tier1_clean", 0.0),
    ("103", "Normal Sinus Rhythm (MLII)", "Basic", "tier1_clean", 0.0),
    ("115", "Sinus Arrhythmia (39F, MLII)", "Basic", "tier1_clean", 0.0),
    ("117", "Normal Sinus Bradycardia (69M, MLII)", "Basic", "tier1_clean", 0.0),
    ("122", "Normal Sinus Rhythm (51M, MLII)", "Basic", "tier1_clean", 0.0),
    ("106", "Premature Ventricular Contractions / Bigeminy (24F)", "Intermediate", "tier2_skewed", 3.8),
    ("112", "Sinus Rhythm with Baseline Wander & ST Shift (54M)", "Intermediate", "tier3_shadow", -1.8),
    ("119", "Ventricular Ectopy / Trigeminy (51F)", "Intermediate", "tier2_skewed", -3.6),
    ("200", "Multiform PVCs & Ventricular Couplets (64M)", "Intermediate", "tier3_shadow", 2.2),
    ("230", "Wolff-Parkinson-White Pre-Excitation (32M)", "Advanced", "tier4_faded", 1.5),
    ("105", "High-Grade Clinical Electrode Artifact & Noise (73F)", "Advanced", "tier4_faded", -2.5),
]


def load_real_mitbih_segment(record_id: str, start_sec: float = 5.0, duration_sec: float = 2.5) -> Dict[str, Any]:
    """Download or load cached real PhysioNet MIT-BIH 360 Hz human ECG and resample to 250 Hz."""
    npz_path = CACHE_DIR / f"mitbih_{record_id}_{int(start_sec)}s.npz"
    if not npz_path.exists():
        fs_orig = 360
        s_from = int(round(start_sec * fs_orig))
        s_to = s_from + int(round(duration_sec * fs_orig))
        rec = wfdb.rdrecord(record_id, sampfrom=s_from, sampto=s_to, pn_dir="mitdb")
        ann = wfdb.rdann(record_id, "atr", sampfrom=s_from, sampto=s_to, pn_dir="mitdb")
        raw_mv = rec.p_signal[:, 0].astype(np.float64)
        # Convert annotation sample indices (relative to s_from) to milliseconds
        r_peaks_ms = np.array(
            [((int(s) - s_from) / float(fs_orig)) * 1000.0 for s in ann.sample if s >= s_from],
            dtype=np.float64,
        )
        np.savez(
            npz_path,
            raw_mv=raw_mv,
            r_peaks_ms=r_peaks_ms,
            fs_orig=fs_orig,
            sig_name=rec.sig_name[0],
        )

    data = np.load(npz_path)
    raw_mv = data["raw_mv"]
    r_peaks_ms = data["r_peaks_ms"]
    fs_target = 250
    n_target = int(round(duration_sec * fs_target))
    resampled_mv = signal.resample(raw_mv, n_target)

    # Filter R-peaks within [260ms, 2350ms] (same active window used by delineator)
    valid_r = [float(r) for r in r_peaks_ms if 260.0 <= float(r) <= 2350.0]
    if len(valid_r) >= 2:
        rr_ms = float(np.median(np.diff(valid_r)))
        hr_bpm = 60000.0 / max(250.0, rr_ms)
    else:
        rr_ms = 800.0
        hr_bpm = 75.0

    sha256 = hashlib.sha256(npz_path.read_bytes()).hexdigest()[:16]
    return {
        "record_id": f"MIT-BIH #{record_id}",
        "source_url": f"https://physionet.org/files/mitdb/1.0.0/{record_id}.dat",
        "sha256_prefix": sha256,
        "reference_mv": resampled_mv,
        "expert_r_peaks_ms": valid_r,
        "true_intervals": {
            "hr_bpm": round(hr_bpm, 2),
            "rr_ms": round(rr_ms, 1),
            "pr_ms": 160.0,
            "qrs_ms": 92.0,
            "qt_ms": 384.0,
            "qtc_ms": round(384.0 / math.sqrt(max(0.3, rr_ms / 1000.0)), 1),
        },
    }


def run_validation_suite(phase: str = "initial") -> Dict[str, Any]:
    cases: List[Dict[str, Any]] = []

    # 1. Evaluate 12 Real PhysioNet MIT-BIH Human Patient Cases (Basic, Intermediate, Advanced)
    for rec_id, desc, category, tier, skew in MITBIH_RECORDS:
        seg = load_real_mitbih_segment(rec_id, start_sec=5.0, duration_sec=2.5)
        rgb, meta = render_paper_ecg_image(
            seg["reference_mv"],
            tier=tier,
            fs_hz=250,
            px_per_mm=12.0,
            skew_deg=skew,
            lead_label="MLII",
            seed=int(rec_id),
        )
        t0 = time.perf_counter()
        res = digitize_paper_ecg_array(
            rgb, seg["reference_mv"], seg["true_intervals"], meta, gate_threshold=65
        )
        elapsed_ms = round((time.perf_counter() - t0) * 1000.0, 1)

        vit = res["methods"]["viterbi_dp"]
        cent = res["methods"]["morph_centroid"]
        arg = res["methods"]["column_argmax"]

        passed_criteria = (
            vit["snrDb"] >= 10.0 and vit["pearsonR"] >= 0.94 and vit["hrMaeBpm"] <= 5.0
        )
        cases.append(
            {
                "case_id": f"REAL-MITBIH-{rec_id}",
                "category": category,
                "record_id": seg["record_id"],
                "source_url": seg["source_url"],
                "sha256": seg["sha256_prefix"],
                "description": desc,
                "tier": tier,
                "skew_deg": skew,
                "expected_outcome": "Accurate waveform recovery (SNR >= 10 dB, r >= 0.94, HR MAE <= 5 BPM vs cardiologist annotations)",
                "gtqi_score": res["gtqi"]["overallScore"],
                "gate_passed": res["gtqi"]["passed"],
                "viterbi_snr_db": vit["snrDb"],
                "viterbi_rmse_uv": vit["rmseUv"],
                "viterbi_pearson_r": vit["pearsonR"],
                "viterbi_hr_mae_bpm": vit["hrMaeBpm"],
                "viterbi_rr_mae_ms": vit["rrMaeMs"],
                "centroid_snr_db": cent["snrDb"],
                "argmax_snr_db": arg["snrDb"],
                "runtime_ms": elapsed_ms,
                "passed_validation": bool(passed_criteria),
            }
        )

    # 2. Edge Cases (Low DPI, Low-Voltage Micro-QRS)
    seg_100 = load_real_mitbih_segment("100", start_sec=5.0, duration_sec=2.5)
    # EDGE-01: Low-resolution 150 DPI scan (6 px/mm instead of 12 px/mm)
    rgb_lowdpi, meta_lowdpi = render_paper_ecg_image(
        seg_100["reference_mv"], tier="tier1_clean", px_per_mm=6.0, seed=701
    )
    res_lowdpi = digitize_paper_ecg_array(
        rgb_lowdpi, seg_100["reference_mv"], seg_100["true_intervals"], meta_lowdpi
    )
    cases.append(
        {
            "case_id": "EDGE-01-LOW-DPI",
            "category": "Edge",
            "record_id": "MIT-BIH #100 (Half-Resolution 6 px/mm)",
            "source_url": seg_100["source_url"],
            "sha256": seg_100["sha256_prefix"],
            "description": "Low-resolution 150 DPI paper scan (375x180 px)",
            "tier": "tier1_clean",
            "skew_deg": 0.0,
            "expected_outcome": "Graceful waveform recovery with Pearson r >= 0.92 despite half spatial resolution",
            "gtqi_score": res_lowdpi["gtqi"]["overallScore"],
            "gate_passed": res_lowdpi["gtqi"]["passed"],
            "viterbi_snr_db": res_lowdpi["methods"]["viterbi_dp"]["snrDb"],
            "viterbi_rmse_uv": res_lowdpi["methods"]["viterbi_dp"]["rmseUv"],
            "viterbi_pearson_r": res_lowdpi["methods"]["viterbi_dp"]["pearsonR"],
            "viterbi_hr_mae_bpm": res_lowdpi["methods"]["viterbi_dp"]["hrMaeBpm"],
            "viterbi_rr_mae_ms": res_lowdpi["methods"]["viterbi_dp"]["rrMaeMs"],
            "centroid_snr_db": res_lowdpi["methods"]["morph_centroid"]["snrDb"],
            "argmax_snr_db": res_lowdpi["methods"]["column_argmax"]["snrDb"],
            "runtime_ms": res_lowdpi["methods"]["viterbi_dp"]["runtimeMs"],
            "passed_validation": bool(res_lowdpi["methods"]["viterbi_dp"]["pearsonR"] >= 0.92),
        }
    )

    # 3. Negative Cases (Must Trigger GTQI < 65 Withhold Gate!)
    # NEG-01: Blank ECG thermal grid paper with ZERO ink trace
    zero_mv = np.zeros_like(seg_100["reference_mv"])
    rgb_blank, meta_blank = render_paper_ecg_image(zero_mv, tier="tier1_clean", seed=801)
    # Overwrite ink line by rendering pure thermal grid without ink
    rgb_blank[:, :, :] = 246
    for x in range(0, rgb_blank.shape[1], 12):
        rgb_blank[:, x, :] = [217, 107, 82]
    for y in range(0, rgb_blank.shape[0], 12):
        rgb_blank[y, :, :] = [217, 107, 82]
    res_blank = digitize_paper_ecg_array(
        rgb_blank, seg_100["reference_mv"], seg_100["true_intervals"], meta_blank, gate_threshold=65
    )
    cases.append(
        {
            "case_id": "NEG-01-BLANK-GRID",
            "category": "Negative",
            "record_id": "BLANK-THERMAL-GRID",
            "source_url": "Synthetic Negative Control (Empty Thermal Grid Paper)",
            "sha256": "blank_grid_ctrl",
            "description": "Blank thermal ECG grid paper with zero carbon ink waveform",
            "tier": "negative_blank",
            "skew_deg": 0.0,
            "expected_outcome": "MUST WITHHOLD intervals (GTQI < 65, gate_passed == False)",
            "gtqi_score": res_blank["gtqi"]["overallScore"],
            "gate_passed": res_blank["gtqi"]["passed"],
            "viterbi_snr_db": res_blank["methods"]["viterbi_dp"]["snrDb"],
            "viterbi_rmse_uv": res_blank["methods"]["viterbi_dp"]["rmseUv"],
            "viterbi_pearson_r": res_blank["methods"]["viterbi_dp"]["pearsonR"],
            "viterbi_hr_mae_bpm": res_blank["methods"]["viterbi_dp"]["hrMaeBpm"],
            "viterbi_rr_mae_ms": res_blank["methods"]["viterbi_dp"]["rrMaeMs"],
            "centroid_snr_db": res_blank["methods"]["morph_centroid"]["snrDb"],
            "argmax_snr_db": res_blank["methods"]["column_argmax"]["snrDb"],
            "runtime_ms": res_blank["methods"]["viterbi_dp"]["runtimeMs"],
            "passed_validation": bool(res_blank["gtqi"]["passed"] is False),
        }
    )

    # NEG-02: Severe Multi-Lead Collision & Crease Dropout on Real MIT-BIH #100
    rgb_coll, meta_coll = render_paper_ecg_image(
        seg_100["reference_mv"], tier="tier5_collision", seed=802
    )
    res_coll = digitize_paper_ecg_array(
        rgb_coll, seg_100["reference_mv"], seg_100["true_intervals"], meta_coll, gate_threshold=65
    )
    cases.append(
        {
            "case_id": "NEG-02-SEVERE-COLLISION",
            "category": "Negative",
            "record_id": "MIT-BIH #100 (Tier 5 Collision)",
            "source_url": seg_100["source_url"],
            "sha256": seg_100["sha256_prefix"],
            "description": "Real MIT-BIH #100 corrupted by vertical crease dropout & adjacent lead R-wave overlap",
            "tier": "tier5_collision",
            "skew_deg": 0.0,
            "expected_outcome": "MUST WITHHOLD intervals (GTQI < 65, gate_passed == False)",
            "gtqi_score": res_coll["gtqi"]["overallScore"],
            "gate_passed": res_coll["gtqi"]["passed"],
            "viterbi_snr_db": res_coll["methods"]["viterbi_dp"]["snrDb"],
            "viterbi_rmse_uv": res_coll["methods"]["viterbi_dp"]["rmseUv"],
            "viterbi_pearson_r": res_coll["methods"]["viterbi_dp"]["pearsonR"],
            "viterbi_hr_mae_bpm": res_coll["methods"]["viterbi_dp"]["hrMaeBpm"],
            "viterbi_rr_mae_ms": res_coll["methods"]["viterbi_dp"]["rrMaeMs"],
            "centroid_snr_db": res_coll["methods"]["morph_centroid"]["snrDb"],
            "argmax_snr_db": res_coll["methods"]["column_argmax"]["snrDb"],
            "runtime_ms": res_coll["methods"]["viterbi_dp"]["runtimeMs"],
            "passed_validation": bool(res_coll["gtqi"]["passed"] is False),
        }
    )

    # 4. Adversarial Case: Heavy Black Barcode / Stamp Header Above Real MIT-BIH #103
    seg_103 = load_real_mitbih_segment("103", start_sec=5.0, duration_sec=2.5)
    rgb_adv, meta_adv = render_paper_ecg_image(
        seg_103["reference_mv"], tier="tier3_shadow", seed=901
    )
    # Add dark adversarial barcode/text blocks in top 12% of image
    rgb_adv[18:32, 120:620, :] = 12
    res_adv = digitize_paper_ecg_array(
        rgb_adv, seg_103["reference_mv"], seg_103["true_intervals"], meta_adv, gate_threshold=65
    )
    vit_adv = res_adv["methods"]["viterbi_dp"]
    arg_adv = res_adv["methods"]["column_argmax"]
    cases.append(
        {
            "case_id": "ADV-01-HEADER-BARCODE",
            "category": "Adversarial",
            "record_id": "MIT-BIH #103 + Adversarial Top Barcode Stamp",
            "source_url": seg_103["source_url"],
            "sha256": seg_103["sha256_prefix"],
            "description": "Dark patient-ID barcode banner across top of strip designed to hijack column-argmax",
            "tier": "adversarial_barcode",
            "skew_deg": 0.0,
            "expected_outcome": "Viterbi DP must resist header hijack and beat Column-Argmax by > 8 dB SNR",
            "gtqi_score": res_adv["gtqi"]["overallScore"],
            "gate_passed": res_adv["gtqi"]["passed"],
            "viterbi_snr_db": vit_adv["snrDb"],
            "viterbi_rmse_uv": vit_adv["rmseUv"],
            "viterbi_pearson_r": vit_adv["pearsonR"],
            "viterbi_hr_mae_bpm": vit_adv["hrMaeBpm"],
            "viterbi_rr_mae_ms": vit_adv["rrMaeMs"],
            "centroid_snr_db": res_adv["methods"]["morph_centroid"]["snrDb"],
            "argmax_snr_db": arg_adv["snrDb"],
            "runtime_ms": vit_adv["runtimeMs"],
            "passed_validation": bool(vit_adv["snrDb"] > arg_adv["snrDb"] + 8.0 and vit_adv["pearsonR"] >= 0.94),
        }
    )

    n_total = len(cases)
    n_pass = sum(1 for c in cases if c["passed_validation"])
    real_cases = [c for c in cases if c["case_id"].startswith("REAL-MITBIH-")]

    summary = {
        "phase": phase,
        "total_cases": n_total,
        "passed_cases": n_pass,
        "failed_cases": n_total - n_pass,
        "pass_rate_pct": round((n_pass / float(n_total)) * 100.0, 1),
        "real_mitbih_mean_viterbi_snr_db": round(
            float(np.mean([c["viterbi_snr_db"] for c in real_cases])), 2
        ),
        "real_mitbih_mean_viterbi_pearson_r": round(
            float(np.mean([c["viterbi_pearson_r"] for c in real_cases])), 4
        ),
        "real_mitbih_mean_viterbi_hr_mae_bpm": round(
            float(np.mean([c["viterbi_hr_mae_bpm"] for c in real_cases])), 2
        ),
        "real_mitbih_mean_centroid_snr_db": round(
            float(np.mean([c["centroid_snr_db"] for c in real_cases])), 2
        ),
        "real_mitbih_mean_argmax_snr_db": round(
            float(np.mean([c["argmax_snr_db"] for c in real_cases])), 2
        ),
        "cases": cases,
    }

    out_file = (
        ROOT
        / "evidence"
        / "stage-3.5-validation"
        / f"{phase}_realworld_results.json"
    )
    out_file.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--phase", default="initial", choices=["initial", "postfix"])
    args = parser.parse_args()
    rep = run_validation_suite(phase=args.phase)
    print(
        f"=== Stage 3.5 Real-World Validation ({args.phase}) ===\n"
        f"Total: {rep['total_cases']} | Passed: {rep['passed_cases']} | Failed: {rep['failed_cases']} ({rep['pass_rate_pct']}%)\n"
        f"Real MIT-BIH Mean SNR: Viterbi={rep['real_mitbih_mean_viterbi_snr_db']} dB (r={rep['real_mitbih_mean_viterbi_pearson_r']}, HR MAE={rep['real_mitbih_mean_viterbi_hr_mae_bpm']} BPM) "
        f"vs Centroid={rep['real_mitbih_mean_centroid_snr_db']} dB vs Argmax={rep['real_mitbih_mean_argmax_snr_db']} dB"
    )
    for c in rep["cases"]:
        status = "PASS" if c["passed_validation"] else "FAIL"
        print(
            f" [{status}] {c['case_id']} ({c['category']}): "
            f"Viterbi SNR={c['viterbi_snr_db']} dB, r={c['viterbi_pearson_r']}, "
            f"HR MAE={c['viterbi_hr_mae_bpm']} BPM, GTQI={c['gtqi_score']} (gate={c['gate_passed']}) | Argmax SNR={c['argmax_snr_db']} dB"
        )
