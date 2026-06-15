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
  maxAutoApprovalValue: 100,
};

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
