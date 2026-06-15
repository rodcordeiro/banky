import { Injectable } from '@nestjs/common';
import { FeedbackEntity } from '../entities/feedback.entity';
import {
  AUTO_REVIEW_DECISION_STATUS_MAP,
  AUTO_REVIEW_INTENT_RULES,
  AUTO_REVIEW_SUPPORTED_INTENTS,
  AutoReviewContext,
  AutoReviewDecision,
  AutoReviewEntityReference,
  AutoReviewField,
  AutoReviewFieldScores,
  AutoReviewMode,
  AutoReviewReason,
  AutoReviewReasonSeverity,
  AutoReviewResult,
  AutoReviewRuleCode,
  AutoReviewSuggestedCorrections,
  FeedbackStatus,
} from '../interfaces';

const DEFAULT_REVIEW_VERSION = 'auto-review-v1';
const DEFAULT_MODE = AutoReviewMode.shadow;
const AUTO_REVIEW_SCORE_MATCH = 1;
const AUTO_REVIEW_SCORE_PARTIAL_MATCH = 0.5;
const AUTO_REVIEW_SCORE_BLOCKER = 0;

@Injectable()
export class FeedbackAutoReviewService {
  evaluate(
    feedback: FeedbackEntity,
    context: AutoReviewContext = {},
  ): AutoReviewResult {
    const mode = context.mode ?? DEFAULT_MODE;
    const reviewVersion = context.reviewVersion ?? DEFAULT_REVIEW_VERSION;
    const evaluatedAt = (context.evaluatedAt ?? new Date()).toISOString();
    const reasons: AutoReviewReason[] = [];
    const fieldScores: AutoReviewFieldScores = {};
    const rawIntent =
      feedback.correctedIntent?.trim() ?? feedback.predictedIntent?.trim();
    const suggestedCorrections = this.extractSuggestedCorrections(feedback);

    if (!rawIntent) {
      reasons.push(
        this.buildReason(
          AutoReviewRuleCode.missingIntent,
          'Intent nao informado.',
          AutoReviewReasonSeverity.blocker,
          'intent',
        ),
      );
      return this.buildResult({
        decision: AutoReviewDecision.reject,
        mode,
        reviewVersion,
        evaluatedAt,
        reasons,
        fieldScores,
        suggestedCorrections,
      });
    }

    const normalizedIntent = this.normalizeComparable(rawIntent);

    if (
      !AUTO_REVIEW_SUPPORTED_INTENTS.includes(
        normalizedIntent as 'create' | 'transfer',
      )
    ) {
      reasons.push(
        this.buildReason(
          AutoReviewRuleCode.unknownIntent,
          `Intent '${rawIntent}' nao suportado.`,
          AutoReviewReasonSeverity.blocker,
          'intent',
        ),
      );
      return this.buildResult({
        decision: AutoReviewDecision.reject,
        mode,
        reviewVersion,
        evaluatedAt,
        reasons,
        fieldScores,
        suggestedCorrections,
      });
    }

    const supportedIntent = normalizedIntent as 'create' | 'transfer';
    const rule = AUTO_REVIEW_INTENT_RULES[supportedIntent];
    const fields = this.resolveFields(feedback);

    this.scoreIntent(fieldScores, supportedIntent);
    this.scoreRequiredFields(fields, rule.requiredFields, fieldScores, reasons);
    this.scoreValue(fields, fieldScores, reasons);
    this.scoreDate(fields, fieldScores, reasons);

    const ownerAccounts = context.ownerAccounts ?? [];
    const ownerCategories = context.ownerCategories ?? [];

    if (supportedIntent === 'create') {
      this.scoreEntityField(
        'account',
        fields.account,
        ownerAccounts,
        fieldScores,
        reasons,
      );
      this.scoreEntityField(
        'category',
        fields.category,
        ownerCategories,
        fieldScores,
        reasons,
      );
    }

    if (supportedIntent === 'transfer') {
      this.scoreEntityField(
        'originAccount',
        fields.originAccount,
        ownerAccounts,
        fieldScores,
        reasons,
      );
      this.scoreEntityField(
        'destinyAccount',
        fields.destinyAccount,
        ownerAccounts,
        fieldScores,
        reasons,
      );
      this.scoreTransferAccounts(fields, fieldScores, reasons);
    }

    const decision = this.decide(reasons, suggestedCorrections);
    const score = this.calculateScore(fieldScores);

    return this.buildResult({
      decision,
      mode,
      reviewVersion,
      evaluatedAt,
      reasons,
      fieldScores,
      suggestedCorrections,
      score,
    });
  }

  isApproved(decision: AutoReviewDecision): boolean {
    return (
      AUTO_REVIEW_DECISION_STATUS_MAP[decision] === FeedbackStatus.validated
    );
  }

  private resolveFields(
    feedback: FeedbackEntity,
  ): Record<AutoReviewField, string | number | undefined> {
    return {
      intent:
        feedback.correctedIntent?.trim() ?? feedback.predictedIntent?.trim(),
      account:
        feedback.correctedAccount?.trim() ?? feedback.predictedAccount?.trim(),
      originAccount:
        feedback.correctedOriginAccount?.trim() ??
        feedback.predictedOriginAccount?.trim(),
      destinyAccount:
        feedback.correctedDestinyAccount?.trim() ??
        feedback.predictedDestinyAccount?.trim(),
      category:
        feedback.correctedCategory?.trim() ??
        feedback.predictedCategory?.trim(),
      value: feedback.correctedValue ?? feedback.predictedValue,
      date: feedback.correctedDate?.trim() ?? feedback.predictedDate?.trim(),
    };
  }

  private extractSuggestedCorrections(
    feedback: FeedbackEntity,
  ): AutoReviewSuggestedCorrections | undefined {
    const suggestedCorrections: AutoReviewSuggestedCorrections = {};

    this.pushSuggestedCorrection(
      suggestedCorrections,
      'intent',
      feedback.correctedIntent,
      feedback.predictedIntent,
    );
    this.pushSuggestedCorrection(
      suggestedCorrections,
      'account',
      feedback.correctedAccount,
      feedback.predictedAccount,
    );
    this.pushSuggestedCorrection(
      suggestedCorrections,
      'originAccount',
      feedback.correctedOriginAccount,
      feedback.predictedOriginAccount,
    );
    this.pushSuggestedCorrection(
      suggestedCorrections,
      'destinyAccount',
      feedback.correctedDestinyAccount,
      feedback.predictedDestinyAccount,
    );
    this.pushSuggestedCorrection(
      suggestedCorrections,
      'category',
      feedback.correctedCategory,
      feedback.predictedCategory,
    );
    this.pushSuggestedCorrection(
      suggestedCorrections,
      'value',
      feedback.correctedValue,
      feedback.predictedValue,
    );
    this.pushSuggestedCorrection(
      suggestedCorrections,
      'date',
      feedback.correctedDate,
      feedback.predictedDate,
    );

    return Object.keys(suggestedCorrections).length
      ? suggestedCorrections
      : undefined;
  }

  private scoreIntent(
    fieldScores: AutoReviewFieldScores,
    intent: 'create' | 'transfer',
  ): void {
    fieldScores.intent = intent
      ? AUTO_REVIEW_SCORE_MATCH
      : AUTO_REVIEW_SCORE_BLOCKER;
  }

  private scoreRequiredFields(
    fields: Record<AutoReviewField, string | number | undefined>,
    requiredFields: AutoReviewField[],
    fieldScores: AutoReviewFieldScores,
    reasons: AutoReviewReason[],
  ): void {
    for (const field of requiredFields) {
      if (field === 'intent' || field === 'value' || field === 'date') continue;

      const value = fields[field];
      const valid = this.hasValue(value);
      fieldScores[field] = valid
        ? AUTO_REVIEW_SCORE_MATCH
        : AUTO_REVIEW_SCORE_BLOCKER;

      if (valid) continue;

      reasons.push(
        this.buildReason(
          this.missingRuleForField(field),
          `Campo '${field}' nao informado.`,
          AutoReviewReasonSeverity.blocker,
          field,
        ),
      );
    }
  }

  private scoreValue(
    fields: Record<AutoReviewField, string | number | undefined>,
    fieldScores: AutoReviewFieldScores,
    reasons: AutoReviewReason[],
  ): void {
    const value = fields.value;
    const numericValue = typeof value === 'number' ? value : Number(value);
    const valid = Number.isFinite(numericValue) && numericValue > 0;
    fieldScores.value = valid
      ? AUTO_REVIEW_SCORE_MATCH
      : AUTO_REVIEW_SCORE_BLOCKER;

    if (valid) return;

    reasons.push(
      this.buildReason(
        AutoReviewRuleCode.invalidValue,
        'Valor invalido ou nao informado.',
        AutoReviewReasonSeverity.blocker,
        'value',
      ),
    );
  }

  private scoreDate(
    fields: Record<AutoReviewField, string | number | undefined>,
    fieldScores: AutoReviewFieldScores,
    reasons: AutoReviewReason[],
  ): void {
    const date = fields.date;
    const parsed = date ? new Date(String(date)) : undefined;
    const valid = !!parsed && !Number.isNaN(parsed.getTime());
    fieldScores.date = valid
      ? AUTO_REVIEW_SCORE_MATCH
      : AUTO_REVIEW_SCORE_BLOCKER;

    if (valid) return;

    reasons.push(
      this.buildReason(
        AutoReviewRuleCode.invalidDate,
        'Data invalida ou nao informada.',
        AutoReviewReasonSeverity.blocker,
        'date',
      ),
    );
  }

  private scoreEntityField(
    field: 'account' | 'originAccount' | 'destinyAccount' | 'category',
    value: string | number | undefined,
    references: AutoReviewEntityReference[],
    fieldScores: AutoReviewFieldScores,
    reasons: AutoReviewReason[],
  ): void {
    if (!this.hasValue(value)) {
      return;
    }

    const normalizedValue = this.normalizeComparable(String(value));
    const match = references.some(
      reference => this.normalizeComparable(reference.name) === normalizedValue,
    );

    fieldScores[field] = match
      ? AUTO_REVIEW_SCORE_MATCH
      : AUTO_REVIEW_SCORE_PARTIAL_MATCH;

    if (match) return;

    reasons.push(
      this.buildReason(
        AutoReviewRuleCode.entityNotFound,
        `Entidade '${value}' nao encontrada para o owner.`,
        AutoReviewReasonSeverity.warning,
        field,
      ),
    );
  }

  private scoreTransferAccounts(
    fields: Record<AutoReviewField, string | number | undefined>,
    fieldScores: AutoReviewFieldScores,
    reasons: AutoReviewReason[],
  ): void {
    const origin = fields.originAccount;
    const destiny = fields.destinyAccount;

    if (!this.hasValue(origin) || !this.hasValue(destiny)) {
      return;
    }

    const same =
      this.normalizeComparable(String(origin)) ===
      this.normalizeComparable(String(destiny));

    fieldScores.originAccount =
      fieldScores.originAccount ?? AUTO_REVIEW_SCORE_MATCH;
    fieldScores.destinyAccount =
      fieldScores.destinyAccount ?? AUTO_REVIEW_SCORE_MATCH;

    if (!same) return;

    reasons.push(
      this.buildReason(
        AutoReviewRuleCode.sameTransferAccounts,
        'Contas de origem e destino sao iguais.',
        AutoReviewReasonSeverity.blocker,
        'originAccount',
      ),
    );
  }

  private decide(
    reasons: AutoReviewReason[],
    suggestedCorrections?: AutoReviewSuggestedCorrections,
  ): AutoReviewDecision {
    if (
      reasons.some(
        reason => reason.severity === AutoReviewReasonSeverity.blocker,
      )
    ) {
      return AutoReviewDecision.reject;
    }

    if (
      reasons.some(
        reason => reason.severity === AutoReviewReasonSeverity.warning,
      )
    ) {
      return AutoReviewDecision.manualReview;
    }

    if (suggestedCorrections && Object.keys(suggestedCorrections).length > 0) {
      return AutoReviewDecision.correct;
    }

    return AutoReviewDecision.approve;
  }

  private calculateScore(fieldScores: AutoReviewFieldScores): number {
    const values = Object.values(fieldScores).filter(
      value => typeof value === 'number',
    ) as number[];

    if (!values.length) {
      return 0;
    }

    return Number(
      (
        values.reduce((total, value) => total + value, 0) / values.length
      ).toFixed(4),
    );
  }

  private buildResult(params: {
    decision: AutoReviewDecision;
    mode: AutoReviewMode;
    reviewVersion: string;
    evaluatedAt: string;
    reasons: AutoReviewReason[];
    fieldScores: AutoReviewFieldScores;
    suggestedCorrections?: AutoReviewSuggestedCorrections;
    score?: number;
  }): AutoReviewResult {
    return {
      decision: params.decision,
      mode: params.mode,
      score: params.score ?? this.calculateScore(params.fieldScores),
      fieldScores: params.fieldScores,
      reasons: params.reasons,
      suggestedCorrections: params.suggestedCorrections,
      reviewVersion: params.reviewVersion,
      evaluatedAt: params.evaluatedAt,
    };
  }

  private hasValue(value: unknown): boolean {
    return value !== undefined && value !== null && String(value).trim() !== '';
  }

  private buildReason(
    code: AutoReviewRuleCode,
    message: string,
    severity: AutoReviewReasonSeverity,
    field?: AutoReviewField,
  ): AutoReviewReason {
    return { code, message, severity, field };
  }

  private missingRuleForField(
    field: Exclude<AutoReviewField, 'intent' | 'value' | 'date'>,
  ): AutoReviewRuleCode {
    switch (field) {
      case 'account':
        return AutoReviewRuleCode.missingAccount;
      case 'originAccount':
        return AutoReviewRuleCode.missingOriginAccount;
      case 'destinyAccount':
        return AutoReviewRuleCode.missingDestinyAccount;
      case 'category':
        return AutoReviewRuleCode.missingCategory;
    }
  }

  private normalizeComparable(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s*.]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  private pushSuggestedCorrection(
    suggestedCorrections: AutoReviewSuggestedCorrections,
    field: keyof AutoReviewSuggestedCorrections,
    correctedValue: string | number | undefined,
    predictedValue: string | number | undefined,
  ): void {
    if (!this.hasMeaningfulDifference(correctedValue, predictedValue)) {
      return;
    }

    if (typeof correctedValue === 'string') {
      suggestedCorrections[field] = correctedValue.trim() as never;
      return;
    }

    if (typeof correctedValue === 'number') {
      suggestedCorrections[field] = correctedValue as never;
    }
  }

  private hasMeaningfulDifference(
    correctedValue: string | number | undefined,
    predictedValue: string | number | undefined,
  ): boolean {
    if (!this.hasValue(correctedValue)) {
      return false;
    }

    if (!this.hasValue(predictedValue)) {
      return true;
    }

    if (
      typeof correctedValue === 'number' ||
      typeof predictedValue === 'number'
    ) {
      return Number(correctedValue) !== Number(predictedValue);
    }

    return (
      this.normalizeComparable(String(correctedValue)) !==
      this.normalizeComparable(String(predictedValue))
    );
  }
}
