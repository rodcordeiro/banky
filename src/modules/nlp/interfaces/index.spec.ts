import {
  AUTO_REVIEW_GLOBAL_BLOCKERS,
  AUTO_REVIEW_REASON_CATALOG,
  AUTO_REVIEW_INTENT_RULES,
  AUTO_REVIEW_DECISION_STATUS_MAP,
  AUTO_REVIEW_THRESHOLDS,
  AutoReviewDecision,
  AutoReviewReasonCode,
  AutoReviewReasonSeverity,
  AutoReviewRuleCode,
  FeedbackStatus,
} from '.';

describe('NLP auto review interfaces', () => {
  it('maps auto review decisions to the resulting feedback status', () => {
    expect(AUTO_REVIEW_DECISION_STATUS_MAP).toEqual({
      [AutoReviewDecision.approve]: FeedbackStatus.validated,
      [AutoReviewDecision.correct]: FeedbackStatus.corrected,
      [AutoReviewDecision.manualReview]: FeedbackStatus.pending,
      [AutoReviewDecision.reject]: FeedbackStatus.pending,
    });
  });

  it('defines required deterministic fields for create feedback', () => {
    expect(AUTO_REVIEW_INTENT_RULES.create).toEqual({
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
    });
  });

  it('defines required deterministic fields for transfer feedback', () => {
    expect(AUTO_REVIEW_INTENT_RULES.transfer).toEqual({
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
    });
  });

  it('defines global blockers for unknown intent, invalid value, invalid date and missing entities', () => {
    expect(AUTO_REVIEW_GLOBAL_BLOCKERS).toEqual([
      AutoReviewRuleCode.missingIntent,
      AutoReviewRuleCode.unknownIntent,
      AutoReviewRuleCode.invalidValue,
      AutoReviewRuleCode.invalidDate,
      AutoReviewRuleCode.entityNotFound,
    ]);
  });

  it('defines the initial score thresholds used by auto review decisions', () => {
    expect(AUTO_REVIEW_THRESHOLDS).toEqual({
      approve: 0.95,
      correct: 0.85,
      manualReview: 0.7,
      maxAutoApprovalValue: 100,
    });
  });

  it('defines the reason catalog with informative and invalidating reasons', () => {
    expect(
      AUTO_REVIEW_REASON_CATALOG[AutoReviewReasonCode.allFieldsValid],
    ).toMatchObject({
      category: 'informative',
      severity: AutoReviewReasonSeverity.info,
      field: 'overall',
    });
    expect(
      AUTO_REVIEW_REASON_CATALOG[AutoReviewReasonCode.aliasCorrectionSuggested],
    ).toMatchObject({
      category: 'informative',
      severity: AutoReviewReasonSeverity.info,
      field: 'overall',
    });
    expect(
      AUTO_REVIEW_REASON_CATALOG[AutoReviewReasonCode.valueAboveLimit],
    ).toMatchObject({
      category: 'invalidating',
      severity: AutoReviewReasonSeverity.warning,
      field: 'value',
    });
    expect(
      AUTO_REVIEW_REASON_CATALOG[AutoReviewRuleCode.invalidValue],
    ).toMatchObject({
      category: 'invalidating',
      severity: AutoReviewReasonSeverity.blocker,
      field: 'value',
    });
  });
});
