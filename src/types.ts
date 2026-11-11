export type ExtractionMethod = 'viterbi_dp' | 'morph_centroid' | 'column_argmax';

export type DistortionTier =
  | 'tier1_clean'
  | 'tier2_skewed'
  | 'tier3_shadow'
  | 'tier4_faded'
  | 'tier5_collision';

export type WorkbenchStatus =
  | 'empty'
  | 'loading'
  | 'success'
  | 'withheld'
  | 'invalid_input'
  | 'error';

export interface GridCalibration {
  paperSpeedMmPerSec: number; // standard 25 or 50 mm/s
  gainMmPerMv: number; // standard 5, 10, or 20 mm/mV
  detectedPxPerMm: number;
  skewAngleDeg: number;
  gridConfidence: number; // 0-100
  autoDeskewApplied: boolean;
}

export interface GtqiBreakdown {
  overallScore: number; // 0-100
  gridPeriodicityScore: number; // 0-100
  inkContrastScore: number; // 0-100
  traceContinuityScore: number; // 0-100
  physiologicalSlewScore: number; // 0-100
  gateThreshold: number; // default 65
  passed: boolean;
  withholdReason: string | null;
}

export interface FiducialMarkers {
  rPeaksMs: number[];
  qrsOnsetsMs: number[];
  qrsOffsetsMs: number[];
  tOffsetsMs: number[];
  pOnsetsMs: number[];
}

export interface ClinicalIntervals {
  gatedOut: boolean;
  heartRateBpm: number | null;
  rrIntervalMs: number | null;
  prIntervalMs: number | null;
  qrsDurationMs: number | null;
  qtIntervalMs: number | null;
  qtcBazettMs: number | null;
  referenceHeartRateBpm?: number;
  referenceRrMs?: number;
  referencePrMs?: number;
  referenceQrsMs?: number;
  referenceQtMs?: number;
  referenceQtcMs?: number;
}

export interface MethodReconstructionMetrics {
  method: ExtractionMethod;
  label: string;
  snrDb: number;
  rmseUv: number;
  pearsonR: number;
  hrMaeBpm: number;
  rrMaeMs: number;
  qrsMaeMs: number;
  qtMaeMs: number;
  qtcMaeMs: number;
  runtimeMs: number;
  reconstructedMv: number[];
}

export interface EcgStripSample {
  id: string;
  recordId: string;
  sourceDataset: string;
  leadName: string;
  patientSummary: string;
  clinicalFinding: string;
  tier: DistortionTier;
  tierLabel: string;
  distortionDescription: string;
  samplingRateHz: number;
  durationSec: number;
  timeMs: number[];
  referenceMv: number[];
  defaultCalibration: GridCalibration;
  gtqi: GtqiBreakdown;
  fiducials: FiducialMarkers;
  intervals: ClinicalIntervals;
  methods: Record<ExtractionMethod, MethodReconstructionMetrics>;
}

export interface TierBenchmarkRow {
  tier: DistortionTier;
  tierLabel: string;
  nStrips: number;
  viterbiSnrDb: number;
  viterbiRmseUv: number;
  viterbiPearsonR: number;
  viterbiQrsMaeMs: number;
  viterbiQtMaeMs: number;
  centroidSnrDb: number;
  centroidRmseUv: number;
  centroidQtMaeMs: number;
  argmaxSnrDb: number;
  argmaxRmseUv: number;
  argmaxQtMaeMs: number;
  meanGtqi: number;
  passRatePct: number;
}

export interface MethodSummaryBenchmark {
  method: ExtractionMethod;
  methodName: string;
  snrDbMean: number;
  snrDbCi95: [number, number];
  rmseUvMean: number;
  rmseUvCi95: [number, number];
  pearsonRMean: number;
  hrMaeBpmMean: number;
  rrMaeMsMean: number;
  qrsMaeMsMean: number;
  qrsMaeMsCi95: [number, number];
  qtMaeMsMean: number;
  qtMaeMsCi95: [number, number];
  qtcMaeMsMean: number;
  availabilityPct: number;
}

export interface GateTradeoffPoint {
  threshold: number;
  availabilityPct: number;
  retainedStrips: number;
  totalStrips: number;
  snrDb: number;
  rmseUv: number;
  qrsMaeMs: number;
  qtMaeMs: number;
  qtcMaeMs: number;
}

export interface BenchmarkDatasetReport {
  datasetName: string;
  protocolVersion: string;
  seed: number;
  physionetVerifiedRecords?: string[];
  totalHeldOutSubjects: number;
  totalHeldOutStrips: number;
  samplingRateHz: number;
  defaultGateThreshold: number;
  methodComparison: MethodSummaryBenchmark[];
  ungatedVsGated: {
    ungatedViterbi: MethodSummaryBenchmark;
    gatedViterbi: MethodSummaryBenchmark;
  };
  tierBreakdown: TierBenchmarkRow[];
  gateTradeoffCurve: GateTradeoffPoint[];
}
