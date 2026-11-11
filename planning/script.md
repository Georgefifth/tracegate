# TraceGate — Technical Presentation & Demo Narration Script

- **Scene 1 (`opening`)**: TraceGate recovers calibrated 'millivolt ECG waveforms' from paper scans at 18.16dB SNR and 2.9ms QT error.
- **Scene 2 (`live_demo_workbench`)**: Our live workbench calibrates the '25mm/s grid', overlays the cyan trace at 27.7dB SNR, and exports calibrated CSV data.
- **Scene 3 (`problem_bottleneck`)**: Existing digitizers fail from broken LFS weights or 'shadow hijacking', where column argmax drops to 3.47dB SNR on faded scans.
- **Scene 4 (`signal_architecture`)**: TraceGate combines 'spectral grid deskewing', shadow normalization, and a Huber 'Viterbi tracker' with parabolic P-QRS-T fiducial delineation.
- **Scene 5 (`live_demo_safety_gate`)**: When adjacent leads collide, our 'GTQI safety gate' scores 41 out of 100 and withholds QTc intervals to prevent false alarms.
- **Scene 6 (`heldout_validation`)**: Across 120 held-out strips and 12 real 'MIT-BIH' records, gated Viterbi achieves 2.9ms QT MAE while stating explicit clinical boundaries.
- **Scene 7 (`closing`)**: TraceGate delivers reproducible 'paper-to-digital ECG' recovery with open code and held-out clinical evaluation.
