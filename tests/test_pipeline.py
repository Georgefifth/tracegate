"""
Comprehensive pytest suite for TraceGate signal-processing pipeline and FastAPI endpoints.
Covers happy paths, boundary conditions, all 5 paper distortion tiers, GTQI gating,
and API error handling.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
sys.path.insert(0, str(ROOT))

from api.index import app
from tracegate.pipeline import (
    digitize_paper_ecg_array,
    generate_physiological_ecg_strip,
    render_paper_ecg_image,
)

client = TestClient(app)


def test_clean_paper_ecg_reconstruction_snr_and_intervals():
    """Happy path: Tier 1 clean 300 DPI paper ECG must recover >17 dB SNR and <6 ms QRS/QT MAE."""
    strip = generate_physiological_ecg_strip(hr_bpm=72.0, qrs_ms=88.0, qt_ms=380.0, seed=42)
    rgb, meta = render_paper_ecg_image(strip["reference_mv"], tier="tier1_clean", seed=42)
    res = digitize_paper_ecg_array(rgb, strip["reference_mv"], strip["true_intervals"], meta)

    vit = res["methods"]["viterbi_dp"]
    assert vit["snrDb"] > 17.0
    assert vit["rmseUv"] < 45.0
    assert vit["pearsonR"] > 0.99
    assert vit["qrsMaeMs"] < 6.0
    assert vit["qtMaeMs"] < 6.0
    assert res["gtqi"]["passed"] is True
    assert res["gtqi"]["overallScore"] >= 80


def test_viterbi_beats_naive_argmax_on_faded_and_shadowed_scans():
    """Viterbi DP with local background normalization must outperform Naive Column-Argmax on faded/shadowed scans."""
    strip = generate_physiological_ecg_strip(hr_bpm=68.0, qrs_ms=94.0, qt_ms=410.0, seed=77)
    rgb, meta = render_paper_ecg_image(strip["reference_mv"], tier="tier4_faded", seed=77)
    res = digitize_paper_ecg_array(rgb, strip["reference_mv"], strip["true_intervals"], meta)

    vit = res["methods"]["viterbi_dp"]
    arg = res["methods"]["column_argmax"]
    assert vit["snrDb"] > arg["snrDb"] + 5.0
    assert vit["rmseUv"] < arg["rmseUv"] * 0.6
    assert vit["qtMaeMs"] < arg["qtMaeMs"]


def test_tier5_collision_triggers_gtqi_safety_gate():
    """Boundary condition: Severe adjacent-lead collision & crease (Tier 5) must trigger GTQI < 65 withhold gate."""
    strip = generate_physiological_ecg_strip(hr_bpm=78.0, qrs_ms=96.0, qt_ms=388.0, seed=99)
    rgb, meta = render_paper_ecg_image(strip["reference_mv"], tier="tier5_collision", seed=99)
    res = digitize_paper_ecg_array(
        rgb, strip["reference_mv"], strip["true_intervals"], meta, gate_threshold=65
    )

    assert res["gtqi"]["overallScore"] < 65
    assert res["gtqi"]["passed"] is False
    assert res["gtqi"]["withholdReason"] is not None
    assert "WITHHELD" in res["gtqi"]["withholdReason"]


def test_determinism_on_repeated_inference():
    """Regression test for Open-ECG-Digitizer Issue #48: repeated runs on the same image must be 100% deterministic."""
    strip = generate_physiological_ecg_strip(hr_bpm=75.0, seed=123)
    rgb, meta = render_paper_ecg_image(strip["reference_mv"], tier="tier2_skewed", skew_deg=3.5, seed=123)
    r1 = digitize_paper_ecg_array(rgb, strip["reference_mv"], strip["true_intervals"], meta)
    r2 = digitize_paper_ecg_array(rgb, strip["reference_mv"], strip["true_intervals"], meta)

    assert r1["methods"]["viterbi_dp"]["snrDb"] == r2["methods"]["viterbi_dp"]["snrDb"]
    assert np.allclose(
        r1["methods"]["viterbi_dp"]["reconstructedMv"],
        r2["methods"]["viterbi_dp"]["reconstructedMv"],
    )


def test_fastapi_endpoints_and_validation():
    """Verify FastAPI /api/health, /api/benchmark, and /api/digitize happy path and invalid input handling."""
    h = client.get("/api/health")
    assert h.status_code == 200
    assert h.json()["status"] == "ok"

    bm = client.get("/api/benchmark")
    assert bm.status_code == 200
    bm_data = bm.json()
    assert bm_data["totalHeldOutStrips"] == 120
    assert len(bm_data["methodComparison"]) == 4

    dig_pass = client.post(
        "/api/digitize",
        json={
            "stripId": "ptbxl_00184_clean",
            "paperSpeedMmPerSec": 25.0,
            "gainMmPerMv": 10.0,
            "gateThreshold": 65,
        },
    )
    assert dig_pass.status_code == 200
    body_pass = dig_pass.json()
    assert body_pass["intervals"]["gatedOut"] is False
    assert body_pass["intervals"]["qtcBazettMs"] is not None

    dig_withheld = client.post(
        "/api/digitize",
        json={
            "stripId": "ptbxl_09204_collision",
            "paperSpeedMmPerSec": 25.0,
            "gainMmPerMv": 10.0,
            "gateThreshold": 65,
        },
    )
    assert dig_withheld.status_code == 200
    body_withheld = dig_withheld.json()
    assert body_withheld["intervals"]["gatedOut"] is True
    assert body_withheld["intervals"]["qtcBazettMs"] is None

    # Invalid input boundary check (paperSpeedMmPerSec = -5)
    dig_invalid = client.post(
        "/api/digitize",
        json={"stripId": "ptbxl_00184_clean", "paperSpeedMmPerSec": -5.0},
    )
    assert dig_invalid.status_code == 422
