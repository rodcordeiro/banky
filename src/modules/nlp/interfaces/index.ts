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

export interface AutoReviewLearningLoopResult {
  generatedAt: string;
  dataset: AutoReviewLearningDatasetSummary;
  fieldMetrics: AutoReviewLearningFieldMetric[];
  categoryConfusions: AutoReviewCategoryConfusionItem[];
  divergenceExamples: AutoReviewLearningDivergenceExample[];
  shadowVersionComparisons: AutoReviewShadowVersionComparison[];
  promotionReadiness: {
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
