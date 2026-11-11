"""TraceGate Python signal-processing and paper-ECG digitization package."""

from .pipeline import (
    compute_gtqi,
    delineate_fiducials_and_intervals,
    digitize_paper_ecg_array,
    estimate_grid_pitch_and_skew,
    evaluate_waveform_metrics,
    extract_column_argmax,
    extract_morph_centroid,
    extract_viterbi_dp,
    generate_physiological_ecg_strip,
    render_paper_ecg_image,
)

__all__ = [
    "compute_gtqi",
    "delineate_fiducials_and_intervals",
    "digitize_paper_ecg_array",
    "estimate_grid_pitch_and_skew",
    "evaluate_waveform_metrics",
    "extract_column_argmax",
    "extract_morph_centroid",
    "extract_viterbi_dp",
    "generate_physiological_ecg_strip",
    "render_paper_ecg_image",
]
