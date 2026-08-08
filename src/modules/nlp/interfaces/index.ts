export enum FeedbackStatus {
  pending = 'pending',
  validated = 'validated',
  corrected = 'corrected',
}

export enum AutoReviewDecision {
  approve = 'approve',
  correct = 'correct',
  manualReview = 'manual_review',
  reject = 'reject',
}

export enum AutoReviewMode {
  shadow = 'shadow',
  assistive = 'assistive',
  automatic = 'automatic',
}

export enum AutoReviewReasonSeverity {
  info = 'info',
  warning = 'warning',
  blocker = 'blocker',
}

export type AutoReviewReasonScope = AutoReviewField | 'overall';

export enum AutoReviewReasonCode {
  allFieldsValid = 'all_fields_valid',
  correctionsSuggested = 'corrections_suggested',
  aliasCorrectionSuggested = 'alias_correction_suggested',
  valueAboveLimit = 'value_above_limit',
  lowConfidence = 'low_confidence',
  humanCorrectionPresent = 'human_correction_present',
}

export type AutoReviewField =
  | 'intent'
  | 'account'
  | 'originAccount'
  | 'destinyAccount'
  | 'category'
  | 'value'
  | 'date';

export interface AutoReviewReason {
  code: string;
  message: string;
  severity: AutoReviewReasonSeverity;
  field?: AutoReviewReasonScope;
}

export interface AutoReviewReasonDefinition {
  code: AutoReviewReasonCode | AutoReviewRuleCode;
  category: 'informative' | 'invalidating';
  severity: AutoReviewReasonSeverity;
  message: string;
  field?: AutoReviewReasonScope;
}

export type AutoReviewFieldScores = Partial<Record<AutoReviewField, number>>;

export interface AutoReviewSuggestedCorrections {
  intent?: string;
  account?: string;
  originAccount?: string;
  destinyAccount?: string;
  category?: string;
  value?: number;
  date?: string;
}

export interface AutoReviewResult {
  decision: AutoReviewDecision;
  mode: AutoReviewMode;
  score: number;
  fieldScores: AutoReviewFieldScores;
  reasons: AutoReviewReason[];
  suggestedCorrections?: AutoReviewSuggestedCorrections;
  reviewVersion: string;
  evaluatedAt: string;
}

export type AutoReviewReportSortBy = 'createdAt' | 'score' | 'divergence';

export interface AutoReviewReportFilters {
  page?: number;
  limit?: number;
  mode?: AutoReviewMode;
  decision?: AutoReviewDecision;
  minScore?: number;
  maxScore?: number;
  from?: string;
  to?: string;
  divergence?: boolean;
  sortBy?: AutoReviewReportSortBy;
  order?: 'ASC' | 'DESC';
}

export interface AutoReviewReportItem {
  feedbackId: string;
  originalText: string;
  decision: AutoReviewDecision;
  mode: AutoReviewMode;
  score: number;
  reasons: AutoReviewReason[];
  humanStatus: FeedbackStatus;
  shadowStatus: FeedbackStatus;
  divergent: boolean;
  reviewVersion: string;
  evaluatedAt: string;
  createdAt: string;
}

export interface AutoReviewReportResult {
  items: AutoReviewReportItem[];
  meta: {
    currentPage: number;
    itemCount: number;
    itemsPerPage: number;
    totalItems: number;
    totalPages?: number;
    hasNext: boolean;
  };
}

export interface AutoReviewRevaluationResult {
  startedAt: string;
  finishedAt: string;
  reviewVersion: string;
  mode: AutoReviewMode;
  batchSize: number;
  candidates: number;
  evaluated: number;
  skipped: number;
  errors: number;
  errorFeedbackIds: string[];
}

export type AutoReviewAliasSuggestionField = 'account' | 'category';

export interface AutoReviewAliasSuggestionItem {
  field: AutoReviewAliasSuggestionField;
  pattern: string;
  predicted: string;
  corrected: string;
  count: number;
  lastSeenAt: string;
  examples: string[];
  conflict: boolean;
  meetsMinimumVolume: boolean;
  alreadyPromoted: boolean;
  alreadyRejected: boolean;
  candidateVersion: string;
}

export interface AutoReviewAliasSuggestionResult {
  generatedAt: string;
  minVolume: number;
  items: AutoReviewAliasSuggestionItem[];
  runtimeEffective: false;
}

export type AutoReviewLearningField =
  | 'intent'
  | 'account'
  | 'originAccount'
  | 'destinyAccount'
  | 'category'
  | 'value'
  | 'date';

export interface AutoReviewLearningFieldMetric {
  field: AutoReviewLearningField;
  total: number;
  matches: number;
  divergences: number;
  correctedLabels: number;
  accuracy: number;
}

export interface AutoReviewLearningDatasetSummary {
  version: string;
  totalReviewedFeedbacks: number;
  humanReviewedFeedbacks: number;
  autoAppliedFeedbacks: number;
  trainingEligibleFeedbacks: number;
  sampleCounts: Record<AutoReviewLearningField, number>;
}

export interface AutoReviewLearningDivergenceExample {
  feedbackId: string;
  field: AutoReviewLearningField;
  originalText: string;
  predicted?: string | number;
  corrected?: string | number;
  status: FeedbackStatus;
}

export interface AutoReviewCategoryConfusionItem {
  predicted: string;
  corrected: string;
  count: number;
  examples: string[];
}

export interface AutoReviewShadowVersionComparison {
  reviewVersion: string;
  total: number;
  matches: number;
  divergences: number;
  agreementRate: number;
}

export interface AutoReviewPromotionEvidence {
  datasetVersion: string;
  reviewVersions: string[];
  sampleSize: number;
  humanReviewedSampleSize: number;
  agreementRate: number;
  falsePositiveRate: number;
  criteriaApplied: AutoReviewPromotionCriteria;
  rollbackRequired: boolean;
  reasons: string[];
}

export interface AutoReviewLearningLoopResult {
  generatedAt: string;
  dataset: AutoReviewLearningDatasetSummary;
  fieldMetrics: AutoReviewLearningFieldMetric[];
  categoryConfusions: AutoReviewCategoryConfusionItem[];
  divergenceExamples: AutoReviewLearningDivergenceExample[];
  shadowVersionComparisons: AutoReviewShadowVersionComparison[];
  inspectionReady: boolean;
  promotionEvidence: AutoReviewPromotionEvidence;
  promotionReadiness: {
    eligible: boolean;
    reasons: string[];
  };
}

export type AutoReviewLearningReassessmentBlocker =
  | 'conflict'
  | 'below_min_volume'
  | 'already_rejected'
  | 'already_promoted'
  | 'no_suggestion'
  | 'other';

export type AutoReviewLearningReassessmentRecommendationCode =
  | 'do_not_increase_autonomy'
  | 'reduce_scope'
  | 'collect_labels'
  | 'inspect_aliases'
  | 'observe'
  | 'await_alias_runtime';

export interface AutoReviewLearningCoverageBucket {
  key: string;
  count: number;
  share: number;
}

export interface AutoReviewLearningSourceQuality {
  samples: number;
  agreementRate: number | null;
  applied?: number;
}

export interface AutoReviewLearningRecurringDivergence {
  field: string;
  pattern: string;
  predicted: string;
  corrected: string;
  count: number;
  blocker: AutoReviewLearningReassessmentBlocker;
  isFailure: boolean;
}

export interface AutoReviewLearningBeforeAfterWindow {
  agreementRate: number;
  divergenceRate: number;
  sampleSize: number;
}

export interface AutoReviewLearningReassessmentRecommendation {
  code: AutoReviewLearningReassessmentRecommendationCode;
  priority: number;
  rationale: string;
}

/**
 * Relatorio Marco 5 (AUTO-028): reavalia o learning loop sem aumentar autonomia.
 */
export interface AutoReviewLearningReassessmentResult {
  generatedAt: string;
  filters: {
    from?: string;
    to?: string;
    baselineFrom?: string;
    baselineTo?: string;
  };
  dataset: {
    version: string;
    criteria: {
      excludePending: boolean;
      excludeAutoAppliedFromTraining: boolean;
      includeStatuses: string[];
    };
    volume: {
      humanReviewed: number;
      trainingEligible: number;
      autoApplied: number;
    };
    recency: {
      newestAt: string | null;
      oldestAt: string | null;
      medianAgeDays: number | null;
    };
    representativeness: {
      byIntent: AutoReviewLearningCoverageBucket[];
      byCategory: AutoReviewLearningCoverageBucket[];
      byAccount: AutoReviewLearningCoverageBucket[];
      byValueBand: AutoReviewLearningCoverageBucket[];
    };
  };
  qualityBySource: {
    humanReviewed: AutoReviewLearningSourceQuality;
    shadow: AutoReviewLearningSourceQuality;
    assistive: AutoReviewLearningSourceQuality;
    automaticLimited: AutoReviewLearningSourceQuality;
  };
  coverage: {
    byIntent: AutoReviewLearningCoverageBucket[];
    byCategory: AutoReviewLearningCoverageBucket[];
    byAccount: AutoReviewLearningCoverageBucket[];
    byValueBand: AutoReviewLearningCoverageBucket[];
  };
  promotionVsLearning: {
    aliasSuggestionVolume: number;
    promoteCount: number;
    candidatesCreated: number;
    validatedLearning: boolean;
    note: string;
  };
  recurringDivergencesWithoutCandidate: AutoReviewLearningRecurringDivergence[];
  beforeAfter: {
    status: 'comparable' | 'insufficientHistory';
    before: AutoReviewLearningBeforeAfterWindow;
    after: AutoReviewLearningBeforeAfterWindow;
    deltas: {
      agreementRate: number;
      divergenceRate: number;
    };
  };
  gapsAndBiases: {
    lowSampleSegments: string[];
    dominantSegments: string[];
    lowConfidenceFields: string[];
    labelGaps: string[];
  };
  signals: {
    inspectionReady: boolean;
    promotionEvidence: AutoReviewPromotionEvidence;
    promotionReadiness: {
      eligible: boolean;
      reasons: string[];
    };
    aliasEffectivePromotionEligible: boolean;
    aliasEffectivePromotionBlockers: string[];
  };
  recommendations: AutoReviewLearningReassessmentRecommendation[];
  runtimeEffective: false;
}

export type AutoReviewValueBand = 'within_limit' | 'above_limit' | 'unknown';

export interface AutoReviewQualityMetricsFilters {
  from?: string;
  to?: string;
  valueApprovalLimit?: number;
}

export interface AutoReviewQualityDecisionCount {
  decision: AutoReviewDecision;
  total: number;
}

export interface AutoReviewQualityModeCount {
  mode: AutoReviewMode;
  total: number;
  applied: number;
  byDecision: AutoReviewQualityDecisionCount[];
}

export interface AutoReviewQualityIntentMetrics {
  intent: string;
  shadowVolume: number;
  humanReviewedWithShadow: number;
  agreementCount: number;
  agreementRate: number;
  potentialFalsePositives: number;
  potentialFalsePositiveRate: number;
}

export interface AutoReviewQualityFieldScoreMetric {
  field: AutoReviewLearningField;
  samples: number;
  averageScore: number;
  lowScoreCount: number;
}

export interface AutoReviewQualityValueBandMetrics {
  band: AutoReviewValueBand;
  shadowVolume: number;
  humanReviewedWithShadow: number;
  agreementCount: number;
  agreementRate: number;
  potentialFalsePositives: number;
  potentialFalsePositiveRate: number;
}

export interface AutoReviewQualityGuardrailBlock {
  code: string;
  severity: AutoReviewReasonSeverity;
  count: number;
}

export interface AutoReviewQualityMetricsSummary {
  shadowVolume: number;
  humanReviewedWithShadow: number;
  pendingWithShadow: number;
  autoApplied: number;
  agreementCount: number;
  agreementRate: number;
  potentialFalsePositives: number;
  potentialFalsePositiveRate: number;
  guardrailBlocks: number;
}

export interface AutoReviewQualityMetricsResult {
  generatedAt: string;
  filters: {
    from?: string;
    to?: string;
    valueApprovalLimit: number;
  };
  summary: AutoReviewQualityMetricsSummary;
  byMode: AutoReviewQualityModeCount[];
  byDecision: AutoReviewQualityDecisionCount[];
  byIntent: AutoReviewQualityIntentMetrics[];
  byField: AutoReviewQualityFieldScoreMetric[];
  byValueBand: AutoReviewQualityValueBandMetrics[];
  guardrailBlocksByCode: AutoReviewQualityGuardrailBlock[];
  aliasInspectionReadiness: {
    eligible: boolean;
    reasons: string[];
  };
}

export enum AutoReviewPromotionCandidateType {
  alias = 'alias',
  rule = 'rule',
  threshold = 'threshold',
  model = 'model',
  operationalPolicy = 'operational_policy',
}

export enum AutoReviewPromotionStatus {
  candidate = 'candidate',
  shadowValidated = 'shadow_validated',
  approved = 'approved',
  rejected = 'rejected',
  active = 'active',
  rolledBack = 'rolled_back',
}

export enum AutoReviewPromotionCandidateOrigin {
  humanDivergence = 'human_divergence',
  shadowComparison = 'shadow_comparison',
  metricRegression = 'metric_regression',
  aliasSuggestion = 'alias_suggestion',
  trainingRun = 'training_run',
  manualAdjustment = 'manual_adjustment',
}

export interface AutoReviewPromotionCriteria {
  minShadowSamples: number;
  minAgreementRate: number;
  maxFalsePositiveRate: number;
  maxRegressionRate: number;
  requiresApprover: boolean;
  allowsAutoPromotion: boolean;
}

export interface AutoReviewPromotionPolicy {
  candidateTypes: AutoReviewPromotionCandidateType[];
  statuses: AutoReviewPromotionStatus[];
  evidenceRequirements: string[];
  automaticBlockers: string[];
  criteriaByType: Record<
    AutoReviewPromotionCandidateType,
    AutoReviewPromotionCriteria
  >;
}

/** Versão viva da política Marco 2; AUTO-029 propõe, não promove versão. */
export const AUTO_REVIEW_PROMOTION_POLICY_VERSION = 'v1';

export type AutoReviewPromotionPolicySegmentKind = 'intent' | 'value_band';

export type AutoReviewPromotionPolicySegmentVerdict =
  | 'meets_current'
  | 'near_current'
  | 'below_current'
  | 'excluded_human_exception'
  | 'insufficient_sample';

export type AutoReviewPromotionPolicyRecommendationCode =
  | 'keep_global_criteria'
  | 'do_not_enable_auto_promotion'
  | 'observe_segment_transfer'
  | 'keep_create_restrictive'
  | 'exclude_above_limit_from_quality'
  | 'await_alias_runtime'
  | 'retain_shadow_evidence';

export interface AutoReviewPromotionPolicyObservedSegment {
  kind: AutoReviewPromotionPolicySegmentKind;
  key: string;
  sampleSize: number;
  agreementRate: number;
  falsePositiveRate: number;
  vsCurrent: AutoReviewPromotionPolicySegmentVerdict;
  meetsMinSamples: boolean;
  meetsAgreement: boolean;
  meetsFalsePositive: boolean;
  suggestion: string;
}

export interface AutoReviewPromotionPolicyObservedBucket {
  sampleSize: number;
  agreementRate: number;
  falsePositiveRate: number;
  eligible: boolean;
  blockers: string[];
}

export interface AutoReviewPromotionPolicyHumanException {
  code: string;
  segmentKind: AutoReviewPromotionPolicySegmentKind;
  segmentKey: string;
  reason: string;
}

export interface AutoReviewPromotionPolicyProposedSegment {
  kind: AutoReviewPromotionPolicySegmentKind;
  key: string;
  action: 'observe' | 'keep_restrictive' | 'exclude' | 'document_only';
  proposedCriteria?: Partial<AutoReviewPromotionCriteria>;
  rationale: string;
}

export interface AutoReviewPromotionPolicyRecommendation {
  code: AutoReviewPromotionPolicyRecommendationCode;
  message: string;
}

/**
 * Relatório AUTO-029: reavalia critérios com evidência real sem aplicar política.
 */
export interface AutoReviewPromotionPolicyReassessmentResult {
  generatedAt: string;
  policyVersion: string;
  proposalVersion: string;
  runtimeEffective: false;
  applied: false;
  filters: {
    from?: string;
    to?: string;
    valueApprovalLimit: number;
  };
  referenceCandidateType: AutoReviewPromotionCandidateType;
  observed: {
    globalRaw: AutoReviewPromotionPolicyObservedBucket;
    /** Elegibilidade operacional: exclui faixa above_limit (exceção humana). */
    globalForEligibility: AutoReviewPromotionPolicyObservedBucket;
    byIntent: AutoReviewPromotionPolicyObservedSegment[];
    byValueBand: AutoReviewPromotionPolicyObservedSegment[];
  };
  currentCriteria: AutoReviewPromotionCriteria;
  automaticBlockers: string[];
  proposedCriteria: {
    scope: 'segment';
    allowsAutoPromotion: false;
    keepGlobalCriteria: true;
    bySegment: AutoReviewPromotionPolicyProposedSegment[];
  };
  humanExceptions: AutoReviewPromotionPolicyHumanException[];
  evidenceRetention: {
    keepShadowHistory: true;
    keepPromotionCandidates: true;
    note: string;
  };
  recommendations: AutoReviewPromotionPolicyRecommendation[];
}

export interface AutoReviewPromotionCandidateExample {
  feedbackId?: string;
  originalText: string;
  predicted?: string | number;
  corrected?: string | number;
  field?: AutoReviewLearningField;
}

export interface AutoReviewPromotionCandidateEvidence {
  sampleSize: number;
  shadowAgreementRate: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  regressionRate: number;
  fieldMetrics: AutoReviewLearningFieldMetric[];
  fieldDivergences: Partial<Record<AutoReviewLearningField, number>>;
  examples: AutoReviewPromotionCandidateExample[];
}

export interface AutoReviewPromotionCandidateImpact {
  expectedManualReviewReduction?: number;
  affectedFields: AutoReviewLearningField[];
  affectedIntents?: AutoReviewIntent[];
  affectedOwners?: string[];
  operationalSummary: string;
}

export interface AutoReviewPromotionCandidateRisk {
  level: 'low' | 'medium' | 'high';
  reasons: string[];
  financialImpact?: string;
}

export interface AutoReviewPromotionRollbackPlan {
  strategy: string;
  previousVersion: string;
  validation: string;
}

export type AutoReviewPromotionHistoryEventType =
  | 'created'
  | 'approved'
  | 'rejected'
  | 'applied'
  | 'rolled_back';

export type AutoReviewRollbackKind = 'immediate' | 'pause' | 'expire';

/** Recomendação de workflow (AUTO-031/032) — não executa promoção. */
export type AutoReviewComparativeReplayAction =
  | 'promote'
  | 'observe'
  | 'reject'
  | 'reduce_scope';

export interface AutoReviewPromotionHistoryEvent {
  candidateVersion: string;
  candidateType: AutoReviewPromotionCandidateType;
  cycleStatus: AutoReviewPromotionStatus;
  event: AutoReviewPromotionHistoryEventType;
  at: string;
  by: string;
  reason?: string;
  /** true só quando há alias runtime ativo ligado ao evento/candidato. */
  runtimeEffective: boolean;
  rollbackKind?: AutoReviewRollbackKind | string;
  notes?: string;
}

export interface AutoReviewPromotionHistoryResult {
  generatedAt: string;
  runtimeEffective: boolean;
  items: AutoReviewPromotionHistoryEvent[];
}

export interface AutoReviewPromotionCandidate {
  type: AutoReviewPromotionCandidateType;
  status: AutoReviewPromotionStatus;
  origin: AutoReviewPromotionCandidateOrigin;
  candidateVersion: string;
  baseReviewVersion: string;
  evidence: AutoReviewPromotionCandidateEvidence;
  expectedImpact: AutoReviewPromotionCandidateImpact;
  knownRisk: AutoReviewPromotionCandidateRisk;
  rollbackPlan: AutoReviewPromotionRollbackPlan;
  createdBy: string;
  approvedBy?: string;
  rejectedBy?: string;
  appliedBy?: string;
  rolledBackBy?: string;
  createdAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  appliedAt?: string;
  rolledBackAt?: string;
  rollbackReason?: string;
  notes?: string;
}

/** Confiança por segmento na ficha do aprovador (AUTO-030). */
export type AutoReviewPromotionSegmentConfidence =
  | 'high'
  | 'medium'
  | 'low'
  | 'unknown';

export interface AutoReviewPromotionCandidateCoverageSignal {
  sampleSize: number;
  minSamplesRequired: number;
  minSamplesMet: boolean;
  shadowAgreementRate: number;
  falsePositiveRate: number;
  eligibleSampleSize?: number;
  excludedHumanExceptions: string[];
}

export interface AutoReviewPromotionCandidateSegmentSignal {
  kind: AutoReviewPromotionPolicySegmentKind;
  key: string;
  sampleSize: number;
  agreementRate: number;
  falsePositiveRate: number;
  verdict: AutoReviewPromotionPolicySegmentVerdict;
  confidence: AutoReviewPromotionSegmentConfidence;
}

export interface AutoReviewPromotionCandidateOperationalCostSignal {
  expectedReviewReductionRate?: number;
  expectedRejectionRate?: number;
  expectedRollbackVolume?: number;
  basis: 'estimate' | 'unavailable';
}

export interface AutoReviewPromotionCandidateTemporalSignal {
  asOf: string;
  createdAt?: string;
  stalenessDays?: number;
  /** Drift real fica para AUTO-031; P0 só carimba unknown/false. */
  driftFlag: false | 'unknown';
}

export interface AutoReviewPromotionCandidateConflictItem {
  candidateVersion: string;
  status: AutoReviewPromotionStatus;
  reason?: string;
}

export interface AutoReviewPromotionCandidateConflictsSignal {
  activeSameScope: AutoReviewPromotionCandidateConflictItem[];
  rejectedSameScope: AutoReviewPromotionCandidateConflictItem[];
}

export interface AutoReviewPromotionCandidateApproverSummary {
  text: string;
  highlights: string[];
}

/**
 * Sinais de qualidade da ficha do candidato (AUTO-030) — leitura, sem mudar approve.
 */
export interface AutoReviewPromotionCandidateQualitySignals {
  coverage: AutoReviewPromotionCandidateCoverageSignal;
  bySegment: AutoReviewPromotionCandidateSegmentSignal[];
  operationalCost: AutoReviewPromotionCandidateOperationalCostSignal;
  temporal: AutoReviewPromotionCandidateTemporalSignal;
  conflicts: AutoReviewPromotionCandidateConflictsSignal;
  approverSummary: AutoReviewPromotionCandidateApproverSummary;
}

export interface AutoReviewPromotionCandidateQualityPreview {
  approverSummary: string;
  hasConflicts: boolean;
  minSamplesMet: boolean;
  sampleSize: number;
  worstSegmentVerdict?: AutoReviewPromotionPolicySegmentVerdict;
  workflowRecommendation?: AutoReviewComparativeReplayAction;
  riskLevel?: 'low' | 'medium' | 'high';
}

export interface AutoReviewPromotionCandidateWorkflow {
  recommendation: AutoReviewComparativeReplayAction;
  recommendationRationale: string;
  approvedExpiresAt?: string | null;
  expiredUnapplied?: boolean;
  observationNote?: string;
}

export interface AutoReviewPromotionCandidateListItem {
  candidate: FeedbackAutoReviewPromotionCandidateSnapshot;
  qualityPreview: AutoReviewPromotionCandidateQualityPreview;
  runtimeEffective: boolean;
}

export interface AutoReviewPromotionCandidateDetail {
  candidate: FeedbackAutoReviewPromotionCandidateSnapshot;
  qualitySignals: AutoReviewPromotionCandidateQualitySignals;
  workflow: AutoReviewPromotionCandidateWorkflow;
  runtimeEffective: boolean;
}

/** Snapshot JSON-serializável do candidato persistido (sem enrichment). */
export interface FeedbackAutoReviewPromotionCandidateSnapshot {
  id?: string;
  owner: string;
  type: AutoReviewPromotionCandidateType;
  status: AutoReviewPromotionStatus;
  origin: AutoReviewPromotionCandidateOrigin;
  candidateVersion: string;
  baseReviewVersion: string;
  evidence: AutoReviewPromotionCandidateEvidence;
  expectedImpact: AutoReviewPromotionCandidateImpact;
  knownRisk: AutoReviewPromotionCandidateRisk;
  rollbackPlan: AutoReviewPromotionRollbackPlan;
  createdBy: string;
  approvedBy?: string | null;
  rejectedBy?: string | null;
  appliedBy?: string | null;
  rolledBackBy?: string | null;
  createdAt: string;
  updatedAt?: string;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  appliedAt?: string | null;
  rolledBackAt?: string | null;
  rollbackReason?: string | null;
  notes?: string | null;
}

export enum AutoReviewPromotionReplayRecommendation {
  promote = 'promote',
  collectMoreShadow = 'collect_more_shadow',
  reject = 'reject',
}

export interface AutoReviewPromotionReplayResult {
  candidateVersion: string;
  baseReviewVersion: string;
  type: AutoReviewPromotionCandidateType;
  sampleSize: number;
  minShadowSamples: number;
  agreementRate: number;
  minAgreementRate: number;
  falsePositiveRate: number;
  maxFalsePositiveRate: number;
  falseNegativeRate: number;
  regressionRate: number;
  maxRegressionRate: number;
  fieldDivergences: Partial<Record<AutoReviewLearningField, number>>;
  eligible: boolean;
  blockers: string[];
  recommendation: AutoReviewPromotionReplayRecommendation;
}

export interface AutoReviewComparativeReplaySampleBucket {
  sampleSize: number;
  agreementRate: number;
  falsePositiveRate: number;
}

export interface AutoReviewComparativeReplaySampleSplit {
  mode: 'temporal' | 'stub';
  older: AutoReviewComparativeReplaySampleBucket | null;
  recent: AutoReviewComparativeReplaySampleBucket | null;
  note: string;
}

export interface AutoReviewComparativeReplayDrift {
  flag: true | false | 'unknown';
  summary: string;
  note: string;
}

export interface AutoReviewComparativeReplaySegment {
  kind: AutoReviewPromotionPolicySegmentKind;
  key: string;
  sampleSize: number;
  current: {
    agreementRate: number;
    falsePositiveRate: number;
    verdict: AutoReviewPromotionPolicySegmentVerdict;
  };
  /** Métricas do próprio candidato por segmento; null quando ainda não há replay segmentado. */
  candidate: {
    agreementRate: number | null;
    falsePositiveRate: number | null;
    evidenceAvailable: boolean;
  };
  delta: {
    agreementRate: number | null;
    falsePositiveRate: number | null;
  };
  hiddenRegression: boolean;
  note: string;
}

export interface AutoReviewComparativeReplayValueBandFp {
  key: string;
  rate: number;
  delta: number | null;
  note: string;
}

export interface AutoReviewComparativeReplayRecommendation {
  action: AutoReviewComparativeReplayAction;
  rationale: string;
  blockers: string[];
}

export interface AutoReviewComparativeReplayRejectedReprocess {
  eligibleForReprocess: boolean | null;
  reason: string;
}

/**
 * Relatório AUTO-031: crash-test shadow/candidato por segmento (somente leitura).
 */
export interface AutoReviewComparativeReplayResult {
  generatedAt: string;
  candidateVersion: string;
  baseReviewVersion: string;
  type: AutoReviewPromotionCandidateType;
  status: AutoReviewPromotionStatus;
  runtimeEffective: false;
  sampleSplit: AutoReviewComparativeReplaySampleSplit;
  drift: AutoReviewComparativeReplayDrift;
  global: {
    gates: AutoReviewPromotionReplayResult;
    current: AutoReviewComparativeReplaySampleBucket;
    candidate: AutoReviewComparativeReplaySampleBucket;
    deltas: {
      agreementRate: number;
      falsePositiveRate: number;
    };
  };
  bySegment: AutoReviewComparativeReplaySegment[];
  falsePositivesByValueBand: AutoReviewComparativeReplayValueBandFp[];
  operationalGain: {
    expectedManualReviewReductionRate?: number;
    basis: 'estimate' | 'unavailable';
  };
  recommendation: AutoReviewComparativeReplayRecommendation;
  rejectedReprocess: AutoReviewComparativeReplayRejectedReprocess;
}

export interface AutoReviewThresholds {
  approve: number;
  correct: number;
  manualReview: number;
  maxAutoApprovalValue: number;
}

export interface AutoReviewEntityReference {
  name: string;
}

export interface AutoReviewContext {
  mode?: AutoReviewMode;
  reviewVersion?: string;
  evaluatedAt?: Date;
  valueApprovalLimit?: number;
  ownerAccounts?: AutoReviewEntityReference[];
  ownerCategories?: AutoReviewEntityReference[];
  /** Alias rules resolvidas (DB ativos + fallback estático). */
  accountAliases?: Array<{ patterns: string[]; target: string }>;
  categoryAliases?: Array<{ patterns: string[]; target: string }>;
}

export const AUTO_REVIEW_DECISION_STATUS_MAP: Record<
  AutoReviewDecision,
  FeedbackStatus
> = {
  [AutoReviewDecision.approve]: FeedbackStatus.validated,
  [AutoReviewDecision.correct]: FeedbackStatus.corrected,
  [AutoReviewDecision.manualReview]: FeedbackStatus.pending,
  [AutoReviewDecision.reject]: FeedbackStatus.pending,
};

export const AUTO_REVIEW_THRESHOLDS: AutoReviewThresholds = {
  approve: 0.95,
  correct: 0.85,
  manualReview: 0.7,
  maxAutoApprovalValue: 5000,
};

export const AUTO_REVIEW_PROMOTION_POLICY: AutoReviewPromotionPolicy = {
  candidateTypes: [
    AutoReviewPromotionCandidateType.alias,
    AutoReviewPromotionCandidateType.rule,
    AutoReviewPromotionCandidateType.threshold,
    AutoReviewPromotionCandidateType.model,
    AutoReviewPromotionCandidateType.operationalPolicy,
  ],
  statuses: [
    AutoReviewPromotionStatus.candidate,
    AutoReviewPromotionStatus.shadowValidated,
    AutoReviewPromotionStatus.approved,
    AutoReviewPromotionStatus.rejected,
    AutoReviewPromotionStatus.active,
    AutoReviewPromotionStatus.rolledBack,
  ],
  evidenceRequirements: [
    'candidateVersion',
    'baseReviewVersion',
    'sampleSize',
    'fieldMetrics',
    'falsePositiveRate',
    'falseNegativeRate',
    'fieldDivergences',
    'operationalImpact',
    'rollbackPlan',
  ],
  automaticBlockers: [
    'missing_shadow_comparison',
    'missing_rollback_plan',
    'missing_approver',
    'false_positive_regression',
    'financial_risk_regression',
    'critical_field_regression',
  ],
  criteriaByType: {
    [AutoReviewPromotionCandidateType.alias]: {
      minShadowSamples: 20,
      minAgreementRate: 0.98,
      maxFalsePositiveRate: 0,
      maxRegressionRate: 0,
      requiresApprover: true,
      allowsAutoPromotion: false,
    },
    [AutoReviewPromotionCandidateType.rule]: {
      minShadowSamples: 50,
      minAgreementRate: 0.98,
      maxFalsePositiveRate: 0,
      maxRegressionRate: 0,
      requiresApprover: true,
      allowsAutoPromotion: false,
    },
    [AutoReviewPromotionCandidateType.threshold]: {
      minShadowSamples: 100,
      minAgreementRate: 0.99,
      maxFalsePositiveRate: 0,
      maxRegressionRate: 0,
      requiresApprover: true,
      allowsAutoPromotion: false,
    },
    [AutoReviewPromotionCandidateType.model]: {
      minShadowSamples: 200,
      minAgreementRate: 0.99,
      maxFalsePositiveRate: 0,
      maxRegressionRate: 0,
      requiresApprover: true,
      allowsAutoPromotion: false,
    },
    [AutoReviewPromotionCandidateType.operationalPolicy]: {
      minShadowSamples: 100,
      minAgreementRate: 0.99,
      maxFalsePositiveRate: 0,
      maxRegressionRate: 0,
      requiresApprover: true,
      allowsAutoPromotion: false,
    },
  },
};

export function buildAutoReviewPromotionReplayResult(
  candidate: AutoReviewPromotionCandidate,
  policy = AUTO_REVIEW_PROMOTION_POLICY,
): AutoReviewPromotionReplayResult {
  const criteria = policy.criteriaByType[candidate.type];
  const blockers: string[] = [];

  if (candidate.evidence.sampleSize < criteria.minShadowSamples) {
    blockers.push('insufficient_shadow_samples');
  }

  if (candidate.evidence.shadowAgreementRate < criteria.minAgreementRate) {
    blockers.push('insufficient_agreement_rate');
  }

  if (candidate.evidence.falsePositiveRate > criteria.maxFalsePositiveRate) {
    blockers.push('false_positive_regression');
  }

  if (candidate.evidence.regressionRate > criteria.maxRegressionRate) {
    blockers.push('candidate_regression');
  }

  if (
    !candidate.rollbackPlan.strategy ||
    !candidate.rollbackPlan.previousVersion ||
    !candidate.rollbackPlan.validation
  ) {
    blockers.push('missing_rollback_plan');
  }

  const onlyNeedsMoreShadow = blockers.every(blocker =>
    ['insufficient_shadow_samples', 'insufficient_agreement_rate'].includes(
      blocker,
    ),
  );

  return {
    candidateVersion: candidate.candidateVersion,
    baseReviewVersion: candidate.baseReviewVersion,
    type: candidate.type,
    sampleSize: candidate.evidence.sampleSize,
    minShadowSamples: criteria.minShadowSamples,
    agreementRate: candidate.evidence.shadowAgreementRate,
    minAgreementRate: criteria.minAgreementRate,
    falsePositiveRate: candidate.evidence.falsePositiveRate,
    maxFalsePositiveRate: criteria.maxFalsePositiveRate,
    falseNegativeRate: candidate.evidence.falseNegativeRate,
    regressionRate: candidate.evidence.regressionRate,
    maxRegressionRate: criteria.maxRegressionRate,
    fieldDivergences: candidate.evidence.fieldDivergences,
    eligible: blockers.length === 0,
    blockers,
    recommendation:
      blockers.length === 0
        ? AutoReviewPromotionReplayRecommendation.promote
        : onlyNeedsMoreShadow
          ? AutoReviewPromotionReplayRecommendation.collectMoreShadow
          : AutoReviewPromotionReplayRecommendation.reject,
  };
}

export type AutoReviewIntent = 'create' | 'transfer';

export enum AutoReviewRuleCode {
  missingIntent = 'missing_intent',
  unknownIntent = 'unknown_intent',
  missingAccount = 'missing_account',
  missingOriginAccount = 'missing_origin_account',
  missingDestinyAccount = 'missing_destiny_account',
  missingCategory = 'missing_category',
  invalidValue = 'invalid_value',
  invalidDate = 'invalid_date',
  sameTransferAccounts = 'same_transfer_accounts',
  entityNotFound = 'entity_not_found',
}

export interface AutoReviewIntentRule {
  intent: AutoReviewIntent;
  requiredFields: AutoReviewField[];
  entityFields: AutoReviewField[];
  blockerRules: AutoReviewRuleCode[];
}

export const AUTO_REVIEW_SUPPORTED_INTENTS: AutoReviewIntent[] = [
  'create',
  'transfer',
];

export const AUTO_REVIEW_GLOBAL_BLOCKERS: AutoReviewRuleCode[] = [
  AutoReviewRuleCode.missingIntent,
  AutoReviewRuleCode.unknownIntent,
  AutoReviewRuleCode.invalidValue,
  AutoReviewRuleCode.invalidDate,
  AutoReviewRuleCode.entityNotFound,
];

export const AUTO_REVIEW_INTENT_RULES: Record<
  AutoReviewIntent,
  AutoReviewIntentRule
> = {
  create: {
    intent: 'create',
    requiredFields: ['intent', 'account', 'category', 'value', 'date'],
    entityFields: ['account', 'category'],
    blockerRules: [
      AutoReviewRuleCode.missingAccount,
      AutoReviewRuleCode.missingCategory,
      AutoReviewRuleCode.invalidValue,
      AutoReviewRuleCode.invalidDate,
      AutoReviewRuleCode.entityNotFound,
    ],
  },
  transfer: {
    intent: 'transfer',
    requiredFields: [
      'intent',
      'originAccount',
      'destinyAccount',
      'value',
      'date',
    ],
    entityFields: ['originAccount', 'destinyAccount'],
    blockerRules: [
      AutoReviewRuleCode.missingOriginAccount,
      AutoReviewRuleCode.missingDestinyAccount,
      AutoReviewRuleCode.sameTransferAccounts,
      AutoReviewRuleCode.invalidValue,
      AutoReviewRuleCode.invalidDate,
      AutoReviewRuleCode.entityNotFound,
    ],
  },
};

export const AUTO_REVIEW_REASON_CATALOG: Record<
  AutoReviewReasonCode | AutoReviewRuleCode,
  AutoReviewReasonDefinition
> = {
  [AutoReviewReasonCode.allFieldsValid]: {
    code: AutoReviewReasonCode.allFieldsValid,
    category: 'informative',
    severity: AutoReviewReasonSeverity.info,
    message: 'Feedback aprovado sem divergencias relevantes.',
    field: 'overall',
  },
  [AutoReviewReasonCode.correctionsSuggested]: {
    code: AutoReviewReasonCode.correctionsSuggested,
    category: 'informative',
    severity: AutoReviewReasonSeverity.info,
    message: 'Feedback corrigido com sugestoes validas.',
    field: 'overall',
  },
  [AutoReviewReasonCode.aliasCorrectionSuggested]: {
    code: AutoReviewReasonCode.aliasCorrectionSuggested,
    category: 'informative',
    severity: AutoReviewReasonSeverity.info,
    message: 'Alias conhecido sugere correcao segura.',
    field: 'overall',
  },
  [AutoReviewReasonCode.valueAboveLimit]: {
    code: AutoReviewReasonCode.valueAboveLimit,
    category: 'invalidating',
    severity: AutoReviewReasonSeverity.warning,
    message: 'Valor acima do limite conservador para aprovacao automatica.',
    field: 'value',
  },
  [AutoReviewReasonCode.lowConfidence]: {
    code: AutoReviewReasonCode.lowConfidence,
    category: 'informative',
    severity: AutoReviewReasonSeverity.info,
    message: 'Score abaixo do limiar minimo para aprovacao automatica.',
    field: 'overall',
  },
  [AutoReviewReasonCode.humanCorrectionPresent]: {
    code: AutoReviewReasonCode.humanCorrectionPresent,
    category: 'invalidating',
    severity: AutoReviewReasonSeverity.warning,
    message:
      'Aplicacao bloqueada porque ja existe correcao humana no feedback.',
    field: 'overall',
  },
  [AutoReviewRuleCode.missingIntent]: {
    code: AutoReviewRuleCode.missingIntent,
    category: 'invalidating',
    severity: AutoReviewReasonSeverity.blocker,
    message: 'Intent nao informado.',
    field: 'intent',
  },
  [AutoReviewRuleCode.unknownIntent]: {
    code: AutoReviewRuleCode.unknownIntent,
    category: 'invalidating',
    severity: AutoReviewReasonSeverity.blocker,
    message: 'Intent nao suportado.',
    field: 'intent',
  },
  [AutoReviewRuleCode.missingAccount]: {
    code: AutoReviewRuleCode.missingAccount,
    category: 'invalidating',
    severity: AutoReviewReasonSeverity.blocker,
    message: 'Campo account nao informado.',
    field: 'account',
  },
  [AutoReviewRuleCode.missingOriginAccount]: {
    code: AutoReviewRuleCode.missingOriginAccount,
    category: 'invalidating',
    severity: AutoReviewReasonSeverity.blocker,
    message: 'Campo originAccount nao informado.',
    field: 'originAccount',
  },
  [AutoReviewRuleCode.missingDestinyAccount]: {
    code: AutoReviewRuleCode.missingDestinyAccount,
    category: 'invalidating',
    severity: AutoReviewReasonSeverity.blocker,
    message: 'Campo destinyAccount nao informado.',
    field: 'destinyAccount',
  },
  [AutoReviewRuleCode.missingCategory]: {
    code: AutoReviewRuleCode.missingCategory,
    category: 'invalidating',
    severity: AutoReviewReasonSeverity.blocker,
    message: 'Campo category nao informado.',
    field: 'category',
  },
  [AutoReviewRuleCode.invalidValue]: {
    code: AutoReviewRuleCode.invalidValue,
    category: 'invalidating',
    severity: AutoReviewReasonSeverity.blocker,
    message: 'Valor invalido ou nao informado.',
    field: 'value',
  },
  [AutoReviewRuleCode.invalidDate]: {
    code: AutoReviewRuleCode.invalidDate,
    category: 'invalidating',
    severity: AutoReviewReasonSeverity.blocker,
    message: 'Data invalida ou nao informada.',
    field: 'date',
  },
  [AutoReviewRuleCode.sameTransferAccounts]: {
    code: AutoReviewRuleCode.sameTransferAccounts,
    category: 'invalidating',
    severity: AutoReviewReasonSeverity.blocker,
    message: 'Contas de origem e destino sao iguais.',
    field: 'originAccount',
  },
  [AutoReviewRuleCode.entityNotFound]: {
    code: AutoReviewRuleCode.entityNotFound,
    category: 'invalidating',
    severity: AutoReviewReasonSeverity.warning,
    message: 'Entidade nao encontrada para o owner.',
    field: 'overall',
  },
};
