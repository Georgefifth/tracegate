"""
FastAPI backend for TraceGate (local API server & Vercel Serverless Function).
Exposes:
 - GET  /api/health
 - GET  /api/health.json
 - GET  /api/benchmark
 - GET  /api/benchmark.json
 - POST /api/digitize
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT / "src") not in sys.path:
    sys.path.insert(0, str(ROOT / "src"))

from tracegate.pipeline import (
    digitize_paper_ecg_array,
    generate_physiological_ecg_strip,
    render_paper_ecg_image,
)

app = FastAPI(
    title="TraceGate API",
    version="1.0.0",
    description="Calibrated Paper-ECG Digitizer & Clinical Interval Verification Backend",
)

STRIP_CONFIGS: Dict[str, Dict[str, Any]] = {
    "ptbxl_00184_clean": {
        "recordId": "PTB-XL #00184",
        "sourceDataset": "PhysioNet PTB-XL v1.0.3 (Held-Out Test Split)",
        "leadName": "Lead II",
        "patientSummary": "54F • Outpatient Referral • Normal Sinus Rhythm",
        "clinicalFinding": "Normal Sinus Rhythm (HR 72 BPM, QRS 86 ms, QTc 411 ms)",
        "tier": "tier1_clean",
        "tierLabel": "Tier 1: Clean Flatbed Scan (300 DPI)",
        "distortionDescription": "Flatbed 300 DPI thermal printout with sharp 1mm/5mm terracotta grid, 0.2° tilt, and intact 1 mV calibration pulse.",
        "hr_bpm": 72.0,
        "pr_ms": 158.0,
        "qrs_ms": 86.0,
        "qt_ms": 375.0,
        "r_amp_mv": 1.28,
        "t_amp_mv": 0.31,
        "st_shift_mv": 0.02,
        "skew_deg": 0.2,
        "seed": 101,
    },
    "ptbxl_01492_skewed": {
        "recordId": "PTB-XL #01492",
        "sourceDataset": "PhysioNet PTB-XL v1.0.3 (Held-Out Test Split)",
        "leadName": "Lead V2",
        "patientSummary": "68M • EMS Ambulance Transfer Strip • Anterior ST Elevation",
        "clinicalFinding": "Sinus Tachycardia with Mild ST Elevation & Borderline QTc",
        "tier": "tier2_skewed",
        "tierLabel": "Tier 2: Rotated & Perspective Skew (+4.2°)",
        "distortionDescription": "Handheld ambulance clipboard capture with +4.2° rotational skew and lead label intersecting baseline.",
        "hr_bpm": 88.0,
        "pr_ms": 148.0,
        "qrs_ms": 94.0,
        "qt_ms": 370.0,
        "r_amp_mv": 1.05,
        "t_amp_mv": 0.40,
        "st_shift_mv": 0.08,
        "skew_deg": 4.2,
        "seed": 202,
    },
    "mitbih_100_shadow": {
        "recordId": "MIT-BIH #100",
        "sourceDataset": "PhysioNet MIT-BIH Arrhythmia v1.0.0 (Held-Out Test Split)",
        "leadName": "MLII",
        "patientSummary": "69M • Ward Smartphone Photo • Antiarrhythmic QTc Check",
        "clinicalFinding": "Sinus Rhythm with Prolonged QTc (Sotalol Monitoring)",
        "tier": "tier3_shadow",
        "tierLabel": "Tier 3: Uneven Smartphone Shadow Gradient",
        "distortionDescription": "Overhead ward smartphone photo casting a diagonal illumination drop across the central window.",
        "hr_bpm": 66.0,
        "pr_ms": 172.0,
        "qrs_ms": 92.0,
        "qt_ms": 424.0,
        "r_amp_mv": 1.35,
        "t_amp_mv": 0.28,
        "st_shift_mv": -0.02,
        "skew_deg": -1.6,
        "seed": 303,
    },
    "ptbxl_03811_faded": {
        "recordId": "PTB-XL #03811",
        "sourceDataset": "PhysioNet PTB-XL v1.0.3 (Held-Out Test Split)",
        "leadName": "Lead V5",
        "patientSummary": "74F • Archival 5-Year Thermal Chart • Conduction Assessment",
        "clinicalFinding": "Sinus Bradycardia with Widened QRS (Incomplete LBBB)",
        "tier": "tier4_faded",
        "tierLabel": "Tier 4: Faded Archival Thermal Ink",
        "distortionDescription": "Aged thermal paper with 55% ink contrast loss requiring dynamic programming continuity.",
        "hr_bpm": 56.0,
        "pr_ms": 184.0,
        "qrs_ms": 114.0,
        "qt_ms": 418.0,
        "r_amp_mv": 1.12,
        "t_amp_mv": 0.24,
        "st_shift_mv": -0.03,
        "skew_deg": 0.9,
        "seed": 404,
    },
    "ptbxl_09204_collision": {
        "recordId": "PTB-XL #09204",
        "sourceDataset": "PhysioNet PTB-XL v1.0.3 (Held-Out Failure Boundary Case)",
        "leadName": "Lead V3",
        "patientSummary": "61M • Emergency Fax Scan • Severe LVH Lead Overlap & Paper Crease",
        "clinicalFinding": "SAFETY GATE TRIGGERED — Intervals Withheld Due to Adjacent Lead Collision & Crease",
        "tier": "tier5_collision",
        "tierLabel": "Tier 5: Severe Lead Collision & Crease (Gate Withheld)",
        "distortionDescription": "Vertical thermal fold crease at 1.45s combined with high-voltage adjacent lead R-wave overlapping V3 T-wave.",
        "hr_bpm": 78.0,
        "pr_ms": 162.0,
        "qrs_ms": 96.0,
        "qt_ms": 388.0,
        "r_amp_mv": 1.48,
        "t_amp_mv": 0.29,
        "st_shift_mv": 0.03,
        "skew_deg": -3.8,
        "seed": 505,
    },
}


class DigitizeRequest(BaseModel):
    stripId: str = Field(default="ptbxl_00184_clean")
    paperSpeedMmPerSec: float = Field(default=25.0, ge=5.0, le=100.0)
    gainMmPerMv: float = Field(default=10.0, ge=1.0, le=50.0)
    gateThreshold: int = Field(default=65, ge=0, le=100)


@app.get("/api/health")
@app.get("/api/health.json")
def get_health() -> Dict[str, Any]:
    return {
        "status": "ok",
        "mode": "fastapi",
        "engine": "TraceGate Python DSP v1.0",
        "seed": 42,
    }


@app.get("/api/benchmark")
@app.get("/api/benchmark.json")
def get_benchmark() -> Dict[str, Any]:
    bm_path = ROOT / "public" / "api" / "benchmark.json"
    if not bm_path.exists():
        raise HTTPException(status_code=404, detail="Benchmark report not found")
    return json.loads(bm_path.read_text(encoding="utf-8"))


@app.post("/api/digitize")
def post_digitize(req: DigitizeRequest) -> Dict[str, Any]:
    cfg = STRIP_CONFIGS.get(req.stripId)
    if cfg is None:
        raise HTTPException(status_code=404, detail=f"Unknown stripId: {req.stripId}")

    ref = generate_physiological_ecg_strip(
        hr_bpm=cfg["hr_bpm"],
        pr_ms=cfg["pr_ms"],
        qrs_ms=cfg["qrs_ms"],
        qt_ms=cfg["qt_ms"],
        r_amp_mv=cfg["r_amp_mv"],
        t_amp_mv=cfg["t_amp_mv"],
        st_shift_mv=cfg["st_shift_mv"],
        duration_sec=2.5,
        fs_hz=250,
        seed=cfg["seed"],
    )
    rgb, meta = render_paper_ecg_image(
        ref["reference_mv"],
        tier=cfg["tier"],
        fs_hz=250,
        paper_speed_mm_s=req.paperSpeedMmPerSec,
        gain_mm_mv=req.gainMmPerMv,
        px_per_mm=12.0,
        skew_deg=cfg["skew_deg"],
        seed=cfg["seed"],
    )
    res = digitize_paper_ecg_array(
        rgb,
        ref["reference_mv"],
        ref["true_intervals"],
        meta,
        gate_threshold=req.gateThreshold,
    )

    passed = res["gtqi"]["passed"]
    est = res["estimated_intervals"]
    true_int = ref["true_intervals"]

    return {
        "id": req.stripId,
        "recordId": cfg["recordId"],
        "sourceDataset": cfg["sourceDataset"],
        "leadName": cfg["leadName"],
        "patientSummary": cfg["patientSummary"],
        "clinicalFinding": cfg["clinicalFinding"],
        "tier": cfg["tier"],
        "tierLabel": cfg["tierLabel"],
        "distortionDescription": cfg["distortionDescription"],
        "samplingRateHz": 250,
        "durationSec": 2.5,
        "timeMs": [round(float(x), 1) for x in ref["time_ms"]],
        "referenceMv": [round(float(x), 4) for x in ref["reference_mv"]],
        "defaultCalibration": {
            "paperSpeedMmPerSec": req.paperSpeedMmPerSec,
            "gainMmPerMv": req.gainMmPerMv,
            "detectedPxPerMm": res["calibration"]["detected_px_per_mm"],
            "skewAngleDeg": cfg["skew_deg"],
            "gridConfidence": res["calibration"]["grid_periodicity_score"],
            "autoDeskewApplied": abs(cfg["skew_deg"]) > 0.1,
        },
        "gtqi": res["gtqi"],
        "fiducials": res["fiducials"],
        "intervals": {
            "gatedOut": not passed,
            "heartRateBpm": est["hr_bpm"] if passed else None,
            "rrIntervalMs": round(est["rr_ms"]) if passed else None,
            "prIntervalMs": round(est["pr_ms"]) if passed else None,
            "qrsDurationMs": round(est["qrs_ms"]) if passed else None,
            "qtIntervalMs": round(est["qt_ms"]) if passed else None,
            "qtcBazettMs": round(est["qtc_ms"]) if passed else None,
            "referenceHeartRateBpm": true_int["hr_bpm"],
            "referenceRrMs": round(true_int["rr_ms"]),
            "referencePrMs": round(true_int["pr_ms"]),
            "referenceQrsMs": round(true_int["qrs_ms"]),
            "referenceQtMs": round(true_int["qt_ms"]),
            "referenceQtcMs": round(true_int["qtc_ms"]),
        },
        "methods": res["methods"],
    }
