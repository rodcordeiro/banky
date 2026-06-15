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
  field?: AutoReviewField;
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

export interface AutoReviewThresholds {
  approve: number;
  correct: number;
  manualReview: number;
}

export interface AutoReviewEntityReference {
  name: string;
}

export interface AutoReviewContext {
  mode?: AutoReviewMode;
  reviewVersion?: string;
  evaluatedAt?: Date;
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
