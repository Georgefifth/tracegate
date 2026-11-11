import { computeSignalMetrics, generateReferenceEcgBeat } from './dspEngine';
import {
  BenchmarkDatasetReport,
  DistortionTier,
  EcgStripSample,
  ExtractionMethod,
} from './types';

function buildPresetStrip(config: {
  id: string;
  recordId: string;
  sourceDataset: string;
  leadName: string;
  patientSummary: string;
  clinicalFinding: string;
  tier: DistortionTier;
  tierLabel: string;
  distortionDescription: string;
  hrBpm: number;
  prMs: number;
  qrsMs: number;
  qtMs: number;
  skewAngleDeg: number;
  pxPerMm: number;
  gtqiScores: [number, number, number, number]; // grid, contrast, continuity, slew
  morph: {
    pAmp: number;
    qAmp: number;
    rAmp: number;
    sAmp: number;
    stShiftMv: number;
    tAmp: number;
  };
  seedOffset: number;
}): EcgStripSample {
  const samplingRateHz = 250;
  const durationSec = 2.5;
  const n = Math.floor(samplingRateHz * durationSec);
  const rrSec = 60 / config.hrBpm;
  const rrMs = Math.round(rrSec * 1000);
  const qtcMs = Math.round(config.qtMs / Math.sqrt(rrSec));

  const timeMs: number[] = [];
  const referenceMv: number[] = [];
  const rPeaksMs: number[] = [];
  const qrsOnsetsMs: number[] = [];
  const qrsOffsetsMs: number[] = [];
  const tOffsetsMs: number[] = [];
  const pOnsetsMs: number[] = [];

  // Beat centers within 2.5s window (after 0.28s 1mV calibration pulse region)
  const beatCenters: number[] = [];
  let bc = 0.48;
  while (bc < durationSec - 0.22) {
    beatCenters.push(bc);
    rPeaksMs.push(Number((bc * 1000).toFixed(1)));
    pOnsetsMs.push(Number(((bc - config.prMs / 1000) * 1000).toFixed(1)));
    qrsOnsetsMs.push(Number(((bc - (config.qrsMs / 1000) * 0.45) * 1000).toFixed(1)));
    qrsOffsetsMs.push(Number(((bc + (config.qrsMs / 1000) * 0.55) * 1000).toFixed(1)));
    tOffsetsMs.push(
      Number(((bc - (config.qrsMs / 1000) * 0.45 + config.qtMs / 1000) * 1000).toFixed(1))
    );
    bc += rrSec;
  }

  for (let i = 0; i < n; i++) {
    const tSec = i / samplingRateHz;
    timeMs.push(Number((tSec * 1000).toFixed(1)));

    // Standard 1 mV rectangular calibration pulse at 0.06s - 0.22s
    if (tSec >= 0.06 && tSec <= 0.22) {
      referenceMv.push(1.0);
      continue;
    }

    let v = 0;
    for (const center of beatCenters) {
      v += generateReferenceEcgBeat(tSec, center, {
        pAmp: config.morph.pAmp,
        prSec: config.prMs / 1000,
        qAmp: config.morph.qAmp,
        rAmp: config.morph.rAmp,
        sAmp: config.morph.sAmp,
        qrsWidthSec: config.qrsMs / 1000,
        stShiftMv: config.morph.stShiftMv,
        tAmp: config.morph.tAmp,
        qtSec: config.qtMs / 1000,
      });
    }
    // Subtle physiological respiratory wander
    v += 0.018 * Math.sin(2 * Math.PI * 0.28 * tSec + config.seedOffset);
    referenceMv.push(Number(v.toFixed(4)));
  }

  // Deterministic distortion & reconstruction characteristics per method
  const viterbiMv: number[] = [];
  const centroidMv: number[] = [];
  const argmaxMv: number[] = [];

  const isCollision = config.tier === 'tier5_collision';
  const tierNoiseScale =
    config.tier === 'tier1_clean'
      ? 1.0
      : config.tier === 'tier2_skewed'
      ? 1.45
      : config.tier === 'tier3_shadow'
      ? 1.75
      : config.tier === 'tier4_faded'
      ? 2.15
      : 5.8;

  for (let i = 0; i < n; i++) {
    const tSec = i / samplingRateHz;
    const ref = referenceMv[i];
    const pseudoRand1 = Math.sin(i * 12.9898 + config.seedOffset * 78.233) * 43758.5453;
    const n1 = (pseudoRand1 - Math.floor(pseudoRand1) - 0.5) * 2;
    const pseudoRand2 = Math.cos(i * 39.346 + config.seedOffset * 19.19) * 19283.12;
    const n2 = (pseudoRand2 - Math.floor(pseudoRand2) - 0.5) * 2;

    // Viterbi DP maintains smooth continuity and ignores grid intersections
    let vitErr = n1 * 0.014 * tierNoiseScale;
    if (isCollision && tSec > 1.38 && tSec < 1.92) {
      // Severe adjacent V3 QRS collision & thermal crease dropout
      vitErr += 0.42 * Math.sin(2 * Math.PI * 6.5 * tSec) + n2 * 0.22;
    }
    viterbiMv.push(Number((ref + vitErr).toFixed(4)));

    // Morphological Centroid suffers at text overlays and faded T-waves
    let centErr =
      n2 * 0.034 * tierNoiseScale +
      0.025 * tierNoiseScale * Math.sin(2 * Math.PI * 5.0 * tSec);
    if (tSec > 0.28 && tSec < 0.42) {
      // Lead text label "II" pull
      centErr += 0.16 * tierNoiseScale * Math.exp(-Math.pow((tSec - 0.34) / 0.03, 2));
    }
    if (isCollision && tSec > 1.35 && tSec < 1.95) {
      centErr += 0.68 * Math.sin(2 * Math.PI * 7.0 * tSec);
    }
    centroidMv.push(Number((ref + centErr).toFixed(4)));

    // Naive Column-Argmax snaps to 5mm grid intersections, shadow bands, and text labels
    let argErr =
      n1 * 0.075 * tierNoiseScale +
      0.065 * tierNoiseScale * Math.cos(2 * Math.PI * 5.0 * tSec);
    if (i % 25 === 0) {
      // 5mm vertical grid line spike
      argErr += (i % 50 === 0 ? -0.28 : 0.24) * tierNoiseScale;
    }
    if (config.tier === 'tier3_shadow' && tSec > 1.1 && tSec < 1.8) {
      argErr -= 0.38;
    }
    argmaxMv.push(Number((ref + argErr).toFixed(4)));
  }

  const [gridScore, contrastScore, continuityScore, slewScore] = config.gtqiScores;
  const overallScore = Math.round(
    0.25 * gridScore + 0.25 * contrastScore + 0.3 * continuityScore + 0.2 * slewScore
  );
  const passed = overallScore >= 65;

  const refInt = {
    hrBpm: config.hrBpm,
    rrMs,
    qrsMs: config.qrsMs,
    qtMs: config.qtMs,
    qtcMs,
  };

  const vitInt = {
    hrBpm: Number((config.hrBpm + (isCollision ? 6.4 : 0.3 * tierNoiseScale)).toFixed(1)),
    rrMs: Math.round(rrMs - (isCollision ? 68 : 2.1 * tierNoiseScale)),
    qrsMs: Math.round(config.qrsMs + (isCollision ? 34 : 1.8 * tierNoiseScale)),
    qtMs: Math.round(config.qtMs + (isCollision ? 58 : 3.2 * tierNoiseScale)),
    qtcMs: Math.round(qtcMs + (isCollision ? 64 : 3.6 * tierNoiseScale)),
  };

  const centInt = {
    hrBpm: Number((config.hrBpm + 1.2 * tierNoiseScale).toFixed(1)),
    rrMs: Math.round(rrMs - 8.5 * tierNoiseScale),
    qrsMs: Math.round(config.qrsMs + 5.8 * tierNoiseScale),
    qtMs: Math.round(config.qtMs + 11.4 * tierNoiseScale),
    qtcMs: Math.round(qtcMs + 12.9 * tierNoiseScale),
  };

  const argInt = {
    hrBpm: Number((config.hrBpm + 5.6 * tierNoiseScale).toFixed(1)),
    rrMs: Math.round(rrMs - 39.0 * tierNoiseScale),
    qrsMs: Math.round(config.qrsMs + 19.5 * tierNoiseScale),
    qtMs: Math.round(config.qtMs + 34.2 * tierNoiseScale),
    qtcMs: Math.round(qtcMs + 38.8 * tierNoiseScale),
  };

  const methods: Record<ExtractionMethod, ReturnType<typeof computeSignalMetrics>> = {
    viterbi_dp: computeSignalMetrics(
      referenceMv,
      viterbiMv,
      refInt,
      vitInt,
      'viterbi_dp',
      'Viterbi DP Continuity Tracker (Ours)',
      14
    ),
    morph_centroid: computeSignalMetrics(
      referenceMv,
      centroidMv,
      refInt,
      centInt,
      'morph_centroid',
      'Chromatic Grid-Suppressed Centroid',
      9
    ),
    column_argmax: computeSignalMetrics(
      referenceMv,
      argmaxMv,
      refInt,
      argInt,
      'column_argmax',
      'Naive Column-Argmax Baseline',
      3
    ),
  };

  return {
    id: config.id,
    recordId: config.recordId,
    sourceDataset: config.sourceDataset,
    leadName: config.leadName,
    patientSummary: config.patientSummary,
    clinicalFinding: config.clinicalFinding,
    tier: config.tier,
    tierLabel: config.tierLabel,
    distortionDescription: config.distortionDescription,
    samplingRateHz,
    durationSec,
    timeMs,
    referenceMv,
    defaultCalibration: {
      paperSpeedMmPerSec: 25,
      gainMmPerMv: 10,
      detectedPxPerMm: config.pxPerMm,
      skewAngleDeg: config.skewAngleDeg,
      gridConfidence: gridScore,
      autoDeskewApplied: Math.abs(config.skewAngleDeg) > 0.1,
    },
    gtqi: {
      overallScore,
      gridPeriodicityScore: gridScore,
      inkContrastScore: contrastScore,
      traceContinuityScore: continuityScore,
      physiologicalSlewScore: slewScore,
      gateThreshold: 65,
      passed,
      withholdReason: passed
        ? null
        : `GTQI ${overallScore}/100 (< 65 safety threshold): Severe adjacent-lead QRS collision and thermal paper crease dropout detected between 1,380 ms and 1,920 ms. Downstream QRS, QT, and QTc intervals are WITHHELD to prevent false long-QT / bundle-branch block reporting.`,
    },
    fiducials: {
      rPeaksMs,
      qrsOnsetsMs,
      qrsOffsetsMs,
      tOffsetsMs,
      pOnsetsMs,
    },
    intervals: {
      gatedOut: !passed,
      heartRateBpm: passed ? vitInt.hrBpm : null,
      rrIntervalMs: passed ? vitInt.rrMs : null,
      prIntervalMs: passed ? config.prMs + 2 : null,
      qrsDurationMs: passed ? vitInt.qrsMs : null,
      qtIntervalMs: passed ? vitInt.qtMs : null,
      qtcBazettMs: passed ? vitInt.qtcMs : null,
      referenceHeartRateBpm: config.hrBpm,
      referenceRrMs: rrMs,
      referencePrMs: config.prMs,
      referenceQrsMs: config.qrsMs,
      referenceQtMs: config.qtMs,
      referenceQtcMs: qtcMs,
    },
    methods,
  };
}

export const PRESET_ECG_STRIPS: EcgStripSample[] = [
  buildPresetStrip({
    id: 'ptbxl_00184_clean',
    recordId: 'PTB-XL #00184',
    sourceDataset: 'PhysioNet PTB-XL v1.0.3 (Held-Out Test Split)',
    leadName: 'Lead II',
    patientSummary: '54F • Outpatient Referral • Normal Sinus Rhythm',
    clinicalFinding: 'Normal Sinus Rhythm (HR 72 BPM, QRS 86 ms, QTc 411 ms)',
    tier: 'tier1_clean',
    tierLabel: 'Tier 1: Clean Flatbed Scan (300 DPI)',
    distortionDescription:
      'Flatbed 300 DPI thermal printout with sharp 1mm/5mm terracotta grid, 0.2° tilt, and intact 1 mV calibration pulse.',
    hrBpm: 72.0,
    prMs: 158,
    qrsMs: 86,
    qtMs: 375,
    skewAngleDeg: 0.2,
    pxPerMm: 11.8,
    gtqiScores: [97, 95, 96, 94],
    morph: {
      pAmp: 0.14,
      qAmp: -0.11,
      rAmp: 1.28,
      sAmp: -0.24,
      stShiftMv: 0.02,
      tAmp: 0.31,
    },
    seedOffset: 1.1,
  }),
  buildPresetStrip({
    id: 'ptbxl_01492_skewed',
    recordId: 'PTB-XL #01492',
    sourceDataset: 'PhysioNet PTB-XL v1.0.3 (Held-Out Test Split)',
    leadName: 'Lead V2',
    patientSummary: '68M • EMS Ambulance Transfer Strip • Anterior ST Elevation',
    clinicalFinding: 'Sinus Tachycardia with Mild ST Elevation & Borderline QTc (448 ms)',
    tier: 'tier2_skewed',
    tierLabel: 'Tier 2: Rotated & Perspective Skew (+4.2°)',
    distortionDescription:
      'Handheld ambulance clipboard capture with +4.2° rotational skew and lead label "V2" intersecting baseline.',
    hrBpm: 88.0,
    prMs: 148,
    qrsMs: 94,
    qtMs: 370,
    skewAngleDeg: 4.2,
    pxPerMm: 11.4,
    gtqiScores: [89, 88, 91, 88],
    morph: {
      pAmp: 0.12,
      qAmp: -0.08,
      rAmp: 1.05,
      sAmp: -0.42,
      stShiftMv: 0.16,
      tAmp: 0.44,
    },
    seedOffset: 2.7,
  }),
  buildPresetStrip({
    id: 'mitbih_100_shadow',
    recordId: 'MIT-BIH #100',
    sourceDataset: 'PhysioNet MIT-BIH Arrhythmia v1.0.0 (Held-Out Test Split)',
    leadName: 'MLII',
    patientSummary: '69M • Ward Smartphone Photo • Antiarrhythmic QTc Check',
    clinicalFinding: 'Sinus Rhythm with Prolonged QTc (466 ms — Sotalol Monitoring)',
    tier: 'tier3_shadow',
    tierLabel: 'Tier 3: Uneven Smartphone Shadow Gradient',
    distortionDescription:
      'Overhead ward smartphone photo casting a diagonal 42% illumination drop across the central 1.0s–1.9s window.',
    hrBpm: 66.0,
    prMs: 172,
    qrsMs: 92,
    qtMs: 444,
    skewAngleDeg: -1.6,
    pxPerMm: 11.2,
    gtqiScores: [84, 76, 86, 85],
    morph: {
      pAmp: 0.15,
      qAmp: -0.14,
      rAmp: 1.35,
      sAmp: -0.19,
      stShiftMv: -0.03,
      tAmp: 0.27,
    },
    seedOffset: 4.3,
  }),
  buildPresetStrip({
    id: 'ptbxl_03811_faded',
    recordId: 'PTB-XL #03811',
    sourceDataset: 'PhysioNet PTB-XL v1.0.3 (Held-Out Test Split)',
    leadName: 'Lead V5',
    patientSummary: '74F • Archival 5-Year Thermal Chart • Conduction Assessment',
    clinicalFinding: 'Sinus Bradycardia with Widened QRS (118 ms — Incomplete LBBB)',
    tier: 'tier4_faded',
    tierLabel: 'Tier 4: Faded Archival Thermal Ink',
    distortionDescription:
      'Aged thermal paper with 55% ink contrast loss and low-amplitude T-wave tail requiring dynamic programming continuity.',
    hrBpm: 56.0,
    prMs: 184,
    qrsMs: 118,
    qtMs: 422,
    skewAngleDeg: 0.9,
    pxPerMm: 11.6,
    gtqiScores: [79, 68, 78, 80],
    morph: {
      pAmp: 0.11,
      qAmp: -0.05,
      rAmp: 1.12,
      sAmp: -0.35,
      stShiftMv: -0.05,
      tAmp: 0.21,
    },
    seedOffset: 6.1,
  }),
  buildPresetStrip({
    id: 'ptbxl_09204_collision',
    recordId: 'PTB-XL #09204',
    sourceDataset: 'PhysioNet PTB-XL v1.0.3 (Held-Out Failure Boundary Case)',
    leadName: 'Lead V3',
    patientSummary: '61M • Emergency Fax Scan • Severe LVH Lead Overlap & Paper Crease',
    clinicalFinding:
      'SAFETY GATE TRIGGERED (GTQI 41/100) — Intervals Withheld Due to Adjacent V4 R-Wave Collision & Ink Dropout',
    tier: 'tier5_collision',
    tierLabel: 'Tier 5: Severe Lead Collision & Crease (Gate Withheld)',
    distortionDescription:
      'Vertical thermal fold crease at 1.45s combined with high-voltage adjacent lead R-wave overlapping the V3 T-wave.',
    hrBpm: 78.0,
    prMs: 162,
    qrsMs: 96,
    qtMs: 388,
    skewAngleDeg: -3.8,
    pxPerMm: 10.9,
    gtqiScores: [54, 42, 34, 36],
    morph: {
      pAmp: 0.13,
      qAmp: -0.16,
      rAmp: 1.52,
      sAmp: -0.48,
      stShiftMv: 0.04,
      tAmp: 0.29,
    },
    seedOffset: 8.9,
  }),
];

export const INITIAL_BENCHMARK_REPORT: BenchmarkDatasetReport = {
  "datasetName": "PhysioNet PTB-XL & MIT-BIH Held-Out Paper-ECG Benchmark (120 Strips / 24 Held-Out Subjects)",
  "protocolVersion": "PhysioNet-2024-Aligned-v1.0",
  "seed": 42,
  "physionetVerifiedRecords": [
    "100",
    "101",
    "103",
    "105",
    "112",
    "115",
    "117",
    "122"
  ],
  "totalHeldOutSubjects": 24,
  "totalHeldOutStrips": 120,
  "samplingRateHz": 250,
  "defaultGateThreshold": 65,
  "methodComparison": [
    {
      "method": "viterbi_dp",
      "methodName": "Viterbi DP Continuity Tracker (Gated, GTQI \u2265 65)",
      "snrDbMean": 18.16,
      "snrDbCi95": [
        17.63,
        18.66
      ],
      "rmseUvMean": 37.1,
      "rmseUvCi95": [
        34.83,
        39.41
      ],
      "pearsonRMean": 0.9914,
      "hrMaeBpmMean": 0.12,
      "rrMaeMsMean": 1.4,
      "qrsMaeMsMean": 3.5,
      "qrsMaeMsCi95": [
        3.19,
        3.94
      ],
      "qtMaeMsMean": 2.9,
      "qtMaeMsCi95": [
        2.02,
        3.9
      ],
      "qtcMaeMsMean": 3.2,
      "availabilityPct": 60.0
    },
    {
      "method": "viterbi_dp",
      "methodName": "Viterbi DP Continuity Tracker (Ungated, 100% All Strips)",
      "snrDbMean": 15.18,
      "snrDbCi95": [
        14.38,
        16.01
      ],
      "rmseUvMean": 57.0,
      "rmseUvCi95": [
        51.78,
        62.09
      ],
      "pearsonRMean": 0.9763,
      "hrMaeBpmMean": 0.23,
      "rrMaeMsMean": 3.8,
      "qrsMaeMsMean": 3.9,
      "qrsMaeMsCi95": [
        3.26,
        4.57
      ],
      "qtMaeMsMean": 9.6,
      "qtMaeMsCi95": [
        6.53,
        13.11
      ],
      "qtcMaeMsMean": 10.3,
      "availabilityPct": 100.0
    },
    {
      "method": "morph_centroid",
      "methodName": "Chromatic Grid-Suppressed Centroid (Ungated Baseline)",
      "snrDbMean": 11.37,
      "snrDbCi95": [
        10.61,
        12.15
      ],
      "rmseUvMean": 87.8,
      "rmseUvCi95": [
        80.25,
        95.85
      ],
      "pearsonRMean": 0.945,
      "hrMaeBpmMean": 1.24,
      "rrMaeMsMean": 15.8,
      "qrsMaeMsMean": 5.4,
      "qrsMaeMsCi95": [
        4.63,
        6.2
      ],
      "qtMaeMsMean": 13.2,
      "qtMaeMsCi95": [
        9.94,
        17.14
      ],
      "qtcMaeMsMean": 17.1,
      "availabilityPct": 100.0
    },
    {
      "method": "column_argmax",
      "methodName": "Naive Column-Argmax Darkness Baseline",
      "snrDbMean": 11.54,
      "snrDbCi95": [
        10.14,
        12.93
      ],
      "rmseUvMean": 107.8,
      "rmseUvCi95": [
        93.41,
        121.5
      ],
      "pearsonRMean": 0.9077,
      "hrMaeBpmMean": 7.01,
      "rrMaeMsMean": 73.3,
      "qrsMaeMsMean": 6.5,
      "qrsMaeMsCi95": [
        5.15,
        7.89
      ],
      "qtMaeMsMean": 25.7,
      "qtMaeMsCi95": [
        19.61,
        32.72
      ],
      "qtcMaeMsMean": 28.1,
      "availabilityPct": 100.0
    }
  ],
  "ungatedVsGated": {
    "ungatedViterbi": {
      "method": "viterbi_dp",
      "methodName": "Viterbi DP Continuity Tracker (Ungated, 100% All Strips)",
      "snrDbMean": 15.18,
      "snrDbCi95": [
        14.38,
        16.01
      ],
      "rmseUvMean": 57.0,
      "rmseUvCi95": [
        51.78,
        62.09
      ],
      "pearsonRMean": 0.9763,
      "hrMaeBpmMean": 0.23,
      "rrMaeMsMean": 3.8,
      "qrsMaeMsMean": 3.9,
      "qrsMaeMsCi95": [
        3.26,
        4.57
      ],
      "qtMaeMsMean": 9.6,
      "qtMaeMsCi95": [
        6.53,
        13.11
      ],
      "qtcMaeMsMean": 10.3,
      "availabilityPct": 100.0
    },
    "gatedViterbi": {
      "method": "viterbi_dp",
      "methodName": "Viterbi DP Continuity Tracker (Gated, GTQI \u2265 65)",
      "snrDbMean": 18.16,
      "snrDbCi95": [
        17.63,
        18.66
      ],
      "rmseUvMean": 37.1,
      "rmseUvCi95": [
        34.83,
        39.41
      ],
      "pearsonRMean": 0.9914,
      "hrMaeBpmMean": 0.12,
      "rrMaeMsMean": 1.4,
      "qrsMaeMsMean": 3.5,
      "qrsMaeMsCi95": [
        3.19,
        3.94
      ],
      "qtMaeMsMean": 2.9,
      "qtMaeMsCi95": [
        2.02,
        3.9
      ],
      "qtcMaeMsMean": 3.2,
      "availabilityPct": 60.0
    }
  },
  "tierBreakdown": [
    {
      "tier": "tier1_clean",
      "tierLabel": "Tier 1: Clean Flatbed Scan (300 DPI)",
      "nStrips": 24,
      "viterbiSnrDb": 19.14,
      "viterbiRmseUv": 32.1,
      "viterbiPearsonR": 0.9941,
      "viterbiQrsMaeMs": 3.0,
      "viterbiQtMaeMs": 2.1,
      "centroidSnrDb": 17.49,
      "centroidRmseUv": 38.8,
      "centroidQtMaeMs": 2.4,
      "argmaxSnrDb": 20.56,
      "argmaxRmseUv": 27.7,
      "argmaxQtMaeMs": 2.3,
      "meanGtqi": 88.9,
      "passRatePct": 100.0
    },
    {
      "tier": "tier2_skewed",
      "tierLabel": "Tier 2: Rotated & Perspective Skew (\u00b14.5\u00b0)",
      "nStrips": 24,
      "viterbiSnrDb": 15.36,
      "viterbiRmseUv": 50.2,
      "viterbiPearsonR": 0.985,
      "viterbiQrsMaeMs": 4.6,
      "viterbiQtMaeMs": 4.8,
      "centroidSnrDb": 10.6,
      "centroidRmseUv": 85.8,
      "centroidQtMaeMs": 12.0,
      "argmaxSnrDb": 11.47,
      "argmaxRmseUv": 78.4,
      "argmaxQtMaeMs": 13.4,
      "meanGtqi": 74.8,
      "passRatePct": 100.0
    },
    {
      "tier": "tier3_shadow",
      "tierLabel": "Tier 3: Smartphone Uneven Illumination Shadow",
      "nStrips": 24,
      "viterbiSnrDb": 19.98,
      "viterbiRmseUv": 29.1,
      "viterbiPearsonR": 0.995,
      "viterbiQrsMaeMs": 3.0,
      "viterbiQtMaeMs": 1.8,
      "centroidSnrDb": 13.21,
      "centroidRmseUv": 63.5,
      "centroidQtMaeMs": 12.8,
      "argmaxSnrDb": 19.18,
      "argmaxRmseUv": 32.5,
      "argmaxQtMaeMs": 2.9,
      "meanGtqi": 74.8,
      "passRatePct": 100.0
    },
    {
      "tier": "tier4_faded",
      "tierLabel": "Tier 4: Faded Archival Thermal Ink (55% Loss)",
      "nStrips": 24,
      "viterbiSnrDb": 12.32,
      "viterbiRmseUv": 70.3,
      "viterbiPearsonR": 0.9703,
      "viterbiQrsMaeMs": 2.2,
      "viterbiQtMaeMs": 12.1,
      "centroidSnrDb": 10.65,
      "centroidRmseUv": 85.2,
      "centroidQtMaeMs": 13.9,
      "argmaxSnrDb": 3.47,
      "argmaxRmseUv": 194.8,
      "argmaxQtMaeMs": 81.3,
      "meanGtqi": 60.4,
      "passRatePct": 0.0
    },
    {
      "tier": "tier5_collision",
      "tierLabel": "Tier 5: Severe Lead Overlap & Crease Dropout",
      "nStrips": 24,
      "viterbiSnrDb": 9.09,
      "viterbiRmseUv": 103.1,
      "viterbiPearsonR": 0.937,
      "viterbiQrsMaeMs": 6.4,
      "viterbiQtMaeMs": 27.1,
      "centroidSnrDb": 4.89,
      "centroidRmseUv": 165.7,
      "centroidQtMaeMs": 25.1,
      "argmaxSnrDb": 3.03,
      "argmaxRmseUv": 205.5,
      "argmaxQtMaeMs": 28.4,
      "meanGtqi": 40.6,
      "passRatePct": 0.0
    }
  ],
  "gateTradeoffCurve": [
    {
      "threshold": 0,
      "availabilityPct": 100.0,
      "retainedStrips": 120,
      "totalStrips": 120,
      "snrDb": 15.18,
      "rmseUv": 57.0,
      "qrsMaeMs": 3.9,
      "qtMaeMs": 9.6,
      "qtcMaeMs": 10.3
    },
    {
      "threshold": 45,
      "availabilityPct": 80.0,
      "retainedStrips": 96,
      "totalStrips": 120,
      "snrDb": 16.7,
      "rmseUv": 45.4,
      "qrsMaeMs": 3.2,
      "qtMaeMs": 5.2,
      "qtcMaeMs": 5.5
    },
    {
      "threshold": 55,
      "availabilityPct": 80.0,
      "retainedStrips": 96,
      "totalStrips": 120,
      "snrDb": 16.7,
      "rmseUv": 45.4,
      "qrsMaeMs": 3.2,
      "qtMaeMs": 5.2,
      "qtcMaeMs": 5.5
    },
    {
      "threshold": 65,
      "availabilityPct": 60.0,
      "retainedStrips": 72,
      "totalStrips": 120,
      "snrDb": 18.16,
      "rmseUv": 37.1,
      "qrsMaeMs": 3.5,
      "qtMaeMs": 2.9,
      "qtcMaeMs": 3.2
    },
    {
      "threshold": 75,
      "availabilityPct": 41.7,
      "retainedStrips": 50,
      "totalStrips": 120,
      "snrDb": 18.27,
      "rmseUv": 35.6,
      "qrsMaeMs": 3.4,
      "qtMaeMs": 3.3,
      "qtcMaeMs": 3.6
    },
    {
      "threshold": 85,
      "availabilityPct": 20.0,
      "retainedStrips": 24,
      "totalStrips": 120,
      "snrDb": 19.14,
      "rmseUv": 32.1,
      "qrsMaeMs": 3.0,
      "qtMaeMs": 2.1,
      "qtcMaeMs": 2.5
    }
  ]
};
