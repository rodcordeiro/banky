import {
  AUTO_REVIEW_GLOBAL_BLOCKERS,
  AUTO_REVIEW_PROMOTION_POLICY,
  AUTO_REVIEW_REASON_CATALOG,
  AUTO_REVIEW_INTENT_RULES,
  AUTO_REVIEW_DECISION_STATUS_MAP,
  AUTO_REVIEW_THRESHOLDS,
  AutoReviewDecision,
  AutoReviewPromotionCandidate,
  AutoReviewPromotionCandidateOrigin,
  AutoReviewPromotionCandidateType,
  AutoReviewPromotionReplayRecommendation,
  AutoReviewPromotionStatus,
  AutoReviewReasonCode,
  AutoReviewReasonSeverity,
  AutoReviewRuleCode,
  FeedbackStatus,
  buildAutoReviewPromotionReplayResult,
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

  it('defines a conservative promotion policy for every learning candidate type', () => {
    expect(AUTO_REVIEW_PROMOTION_POLICY.candidateTypes).toEqual([
      AutoReviewPromotionCandidateType.alias,
      AutoReviewPromotionCandidateType.rule,
      AutoReviewPromotionCandidateType.threshold,
      AutoReviewPromotionCandidateType.model,
      AutoReviewPromotionCandidateType.operationalPolicy,
    ]);
    expect(AUTO_REVIEW_PROMOTION_POLICY.statuses).toEqual([
      AutoReviewPromotionStatus.candidate,
      AutoReviewPromotionStatus.shadowValidated,
      AutoReviewPromotionStatus.approved,
      AutoReviewPromotionStatus.rejected,
      AutoReviewPromotionStatus.active,
      AutoReviewPromotionStatus.rolledBack,
    ]);
    expect(AUTO_REVIEW_PROMOTION_POLICY.evidenceRequirements).toEqual(
      expect.arrayContaining([
        'candidateVersion',
        'baseReviewVersion',
        'sampleSize',
        'fieldMetrics',
        'falsePositiveRate',
        'falseNegativeRate',
        'fieldDivergences',
        'operationalImpact',
        'rollbackPlan',
      ]),
    );
    expect(AUTO_REVIEW_PROMOTION_POLICY.automaticBlockers).toEqual(
      expect.arrayContaining([
        'missing_shadow_comparison',
        'missing_rollback_plan',
        'missing_approver',
        'false_positive_regression',
        'financial_risk_regression',
        'critical_field_regression',
      ]),
    );

    for (const candidateType of AUTO_REVIEW_PROMOTION_POLICY.candidateTypes) {
      expect(
        AUTO_REVIEW_PROMOTION_POLICY.criteriaByType[candidateType],
      ).toMatchObject({
        maxFalsePositiveRate: 0,
        maxRegressionRate: 0,
        requiresApprover: true,
        allowsAutoPromotion: false,
      });
    }
  });

  it('defines the common promotion candidate model for a learning candidate', () => {
    const candidate: AutoReviewPromotionCandidate = {
      type: AutoReviewPromotionCandidateType.alias,
      status: AutoReviewPromotionStatus.candidate,
      origin: AutoReviewPromotionCandidateOrigin.humanDivergence,
      candidateVersion: 'alias-candidate-v1',
      baseReviewVersion: 'auto-review-shadow-v1',
      evidence: {
        sampleSize: 20,
        shadowAgreementRate: 0.98,
        falsePositiveRate: 0,
        falseNegativeRate: 0.02,
        regressionRate: 0,
        fieldMetrics: [
          {
            field: 'category',
            total: 20,
            matches: 20,
            divergences: 0,
            correctedLabels: 20,
            accuracy: 1,
          },
        ],
        fieldDivergences: {
          category: 0,
        },
        examples: [
          {
            feedbackId: 'feedback-1',
            originalText: 'paguei yt premium no nubank',
            predicted: 'Mercado',
            corrected: 'Servicos de streaming',
            field: 'category',
          },
        ],
      },
      expectedImpact: {
        expectedManualReviewReduction: 0.15,
        affectedFields: ['category'],
        affectedIntents: ['create'],
        operationalSummary:
          'Reduz revisao manual recorrente para alias de streaming.',
      },
      knownRisk: {
        level: 'low',
        reasons: ['Alias restrito a padrao textual especifico.'],
      },
      rollbackPlan: {
        strategy: 'Desativar candidato e reprocessar amostra em shadow.',
        previousVersion: 'auto-review-shadow-v1',
        validation: 'Confirmar que divergencias retornam ao baseline anterior.',
      },
      createdBy: 'learning-loop',
      approvedBy: 'operator-id',
      createdAt: '2026-06-17T00:00:00.000Z',
      approvedAt: '2026-06-17T01:00:00.000Z',
      notes: 'Candidato gerado a partir de divergencias humanas recorrentes.',
    };

    expect(candidate).toMatchObject({
      type: AutoReviewPromotionCandidateType.alias,
      status: AutoReviewPromotionStatus.candidate,
      origin: AutoReviewPromotionCandidateOrigin.humanDivergence,
      candidateVersion: 'alias-candidate-v1',
      baseReviewVersion: 'auto-review-shadow-v1',
      createdBy: 'learning-loop',
      approvedBy: 'operator-id',
    });
    expect(candidate.evidence.examples[0]).toMatchObject({
      feedbackId: 'feedback-1',
      field: 'category',
    });
    expect(candidate.rollbackPlan).toMatchObject({
      previousVersion: 'auto-review-shadow-v1',
    });
  });

  it('builds a replay comparison result for an eligible promotion candidate', () => {
    const candidate: AutoReviewPromotionCandidate = {
      type: AutoReviewPromotionCandidateType.alias,
      status: AutoReviewPromotionStatus.candidate,
      origin: AutoReviewPromotionCandidateOrigin.humanDivergence,
      candidateVersion: 'alias-candidate-v1',
      baseReviewVersion: 'auto-review-shadow-v1',
      evidence: {
        sampleSize: 20,
        shadowAgreementRate: 0.98,
        falsePositiveRate: 0,
        falseNegativeRate: 0.01,
        regressionRate: 0,
        fieldMetrics: [],
        fieldDivergences: {
          category: 0,
        },
        examples: [],
      },
      expectedImpact: {
        affectedFields: ['category'],
        operationalSummary: 'Reduz revisao manual para alias recorrente.',
      },
      knownRisk: {
        level: 'low',
        reasons: [],
      },
      rollbackPlan: {
        strategy: 'Desativar alias candidato.',
        previousVersion: 'auto-review-shadow-v1',
        validation: 'Reprocessar amostra em shadow.',
      },
      createdBy: 'learning-loop',
      createdAt: '2026-06-17T00:00:00.000Z',
    };

    expect(buildAutoReviewPromotionReplayResult(candidate)).toEqual({
      candidateVersion: 'alias-candidate-v1',
      baseReviewVersion: 'auto-review-shadow-v1',
      type: AutoReviewPromotionCandidateType.alias,
      sampleSize: 20,
      minShadowSamples: 20,
      agreementRate: 0.98,
      minAgreementRate: 0.98,
      falsePositiveRate: 0,
      maxFalsePositiveRate: 0,
      falseNegativeRate: 0.01,
      regressionRate: 0,
      maxRegressionRate: 0,
      fieldDivergences: {
        category: 0,
      },
      eligible: true,
      blockers: [],
      recommendation: AutoReviewPromotionReplayRecommendation.promote,
    });
  });

  it('blocks replay promotion when the candidate has false positives or regressions', () => {
    const candidate: AutoReviewPromotionCandidate = {
      type: AutoReviewPromotionCandidateType.rule,
      status: AutoReviewPromotionStatus.candidate,
      origin: AutoReviewPromotionCandidateOrigin.shadowComparison,
      candidateVersion: 'rule-candidate-v1',
      baseReviewVersion: 'auto-review-shadow-v1',
      evidence: {
        sampleSize: 50,
        shadowAgreementRate: 0.99,
        falsePositiveRate: 0.01,
        falseNegativeRate: 0,
        regressionRate: 0.02,
        fieldMetrics: [],
        fieldDivergences: {
          value: 1,
        },
        examples: [],
      },
      expectedImpact: {
        affectedFields: ['value'],
        operationalSummary: 'Ajusta regra de valor.',
      },
      knownRisk: {
        level: 'high',
        reasons: ['Regressao em campo financeiro critico.'],
        financialImpact: 'Pode aprovar valor incorreto.',
      },
      rollbackPlan: {
        strategy: 'Reverter regra candidata.',
        previousVersion: 'auto-review-shadow-v1',
        validation: 'Comparar divergencias com baseline.',
      },
      createdBy: 'learning-loop',
      createdAt: '2026-06-17T00:00:00.000Z',
    };

    expect(buildAutoReviewPromotionReplayResult(candidate)).toMatchObject({
      eligible: false,
      blockers: ['false_positive_regression', 'candidate_regression'],
      recommendation: AutoReviewPromotionReplayRecommendation.reject,
      fieldDivergences: {
        value: 1,
      },
    });
  });
});
