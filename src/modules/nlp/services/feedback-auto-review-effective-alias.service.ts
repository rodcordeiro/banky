import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import {
  EffectiveAliasRuntimeStatus,
  FeedbackAutoReviewEffectiveAliasEntity,
} from '../entities/feedback-auto-review-effective-alias.entity';
import { FeedbackAutoReviewPromotionCandidateEntity } from '../entities/feedback-auto-review-promotion-candidate.entity';
import {
  ACCOUNT_ALIASES,
  AliasRule,
  CATEGORY_ALIASES,
  normalizeAliasText,
} from '../utils/alias.rules';

export type EffectiveAliasDeactivationKind = 'immediate' | 'pause' | 'expire';

export interface EffectiveAliasReportItem {
  id: string;
  owner: string;
  field: string;
  pattern: string;
  canonicalValue: string;
  runtimeStatus: EffectiveAliasRuntimeStatus;
  candidateVersion: string;
  previousVersion?: string | null;
  activatedBy: string;
  activatedAt: string;
  deactivatedBy?: string | null;
  deactivatedAt?: string | null;
  deactivationKind?: string | null;
  runtimeEffective: boolean;
}

export interface EffectiveAliasReportResult {
  generatedAt: string;
  items: EffectiveAliasReportItem[];
  staticFallbackActive: true;
}

@Injectable()
export class FeedbackAutoReviewEffectiveAliasService {
  constructor(
    @Inject('FEEDBACK_AUTO_REVIEW_EFFECTIVE_ALIAS_REPOSITORY')
    private readonly _repository: Repository<FeedbackAutoReviewEffectiveAliasEntity>,
  ) {}

  /**
   * Regras ativas do owner + fallback estático (DB tem precedência por pattern).
   */
  async resolveAliasRules(
    owner: string,
    field: 'account' | 'category',
  ): Promise<AliasRule[]> {
    const active = await this._repository.find({
      where: {
        owner,
        field,
        runtimeStatus: EffectiveAliasRuntimeStatus.active,
      },
    });

    const fromDb: AliasRule[] = active.map(item => ({
      patterns: [item.pattern],
      target: item.canonicalValue,
    }));

    const staticRules =
      field === 'account' ? ACCOUNT_ALIASES : CATEGORY_ALIASES;
    const dbPatterns = new Set(
      fromDb.flatMap(rule => rule.patterns.map(normalizeAliasText)),
    );

    const fromStatic = staticRules
      .map(rule => ({
        patterns: rule.patterns.filter(
          pattern => !dbPatterns.has(normalizeAliasText(pattern)),
        ),
        target: rule.target,
      }))
      .filter(rule => rule.patterns.length > 0);

    return [...fromDb, ...fromStatic];
  }

  async listReport(owner: string): Promise<EffectiveAliasReportResult> {
    const rows = await this._repository.find({
      where: { owner },
      order: { activatedAt: 'DESC' },
    });

    return {
      generatedAt: new Date().toISOString(),
      staticFallbackActive: true,
      items: rows.map(row => ({
        id: row.id,
        owner: row.owner,
        field: row.field,
        pattern: row.pattern,
        canonicalValue: row.canonicalValue,
        runtimeStatus: row.runtimeStatus,
        candidateVersion: row.candidateVersion,
        previousVersion: row.previousVersion,
        activatedBy: row.activatedBy,
        activatedAt: row.activatedAt,
        deactivatedBy: row.deactivatedBy,
        deactivatedAt: row.deactivatedAt,
        deactivationKind: row.deactivationKind,
        runtimeEffective:
          row.runtimeStatus === EffectiveAliasRuntimeStatus.active,
      })),
    };
  }

  async hasActiveRuntime(
    owner: string,
    candidateVersion?: string,
  ): Promise<boolean> {
    const where = candidateVersion
      ? {
          owner,
          candidateVersion,
          runtimeStatus: EffectiveAliasRuntimeStatus.active,
        }
      : { owner, runtimeStatus: EffectiveAliasRuntimeStatus.active };

    const count = await this._repository.count({ where });
    return count > 0;
  }

  /**
   * Ativa alias runtime a partir de candidato alias aprovado/aplicado.
   */
  async activateFromCandidate(
    owner: string,
    candidate: FeedbackAutoReviewPromotionCandidateEntity,
    activatedBy: string,
  ): Promise<FeedbackAutoReviewEffectiveAliasEntity> {
    const parsed = this.parseCandidateAlias(candidate);
    const conflict = await this._repository.findOne({
      where: {
        owner,
        field: parsed.field,
        pattern: parsed.pattern,
        runtimeStatus: EffectiveAliasRuntimeStatus.active,
      },
    });

    if (
      conflict &&
      conflict.candidateVersion !== candidate.candidateVersion &&
      normalizeAliasText(conflict.canonicalValue) !==
        normalizeAliasText(parsed.canonicalValue)
    ) {
      throw new BadRequestException(
        `Conflito de alias runtime ativo (${conflict.candidateVersion}) para o mesmo padrao/campo.`,
      );
    }

    const existing = await this._repository.findOne({
      where: {
        owner,
        field: parsed.field,
        pattern: parsed.pattern,
        canonicalValue: parsed.canonicalValue,
      },
    });

    const now = new Date().toISOString();
    if (existing) {
      existing.runtimeStatus = EffectiveAliasRuntimeStatus.active;
      existing.candidateVersion = candidate.candidateVersion;
      existing.previousVersion =
        existing.previousVersion ?? candidate.rollbackPlan?.previousVersion;
      existing.activatedBy = activatedBy;
      existing.activatedAt = now;
      existing.deactivatedBy = null;
      existing.deactivatedAt = null;
      existing.deactivationKind = null;
      existing.notes = candidate.notes ?? existing.notes;
      return this._repository.save(existing);
    }

    const entity = this._repository.create({
      owner,
      field: parsed.field,
      pattern: parsed.pattern,
      canonicalValue: parsed.canonicalValue,
      runtimeStatus: EffectiveAliasRuntimeStatus.active,
      candidateVersion: candidate.candidateVersion,
      previousVersion: candidate.rollbackPlan?.previousVersion ?? null,
      activatedBy,
      activatedAt: now,
      notes: candidate.notes ?? null,
    });

    return this._repository.save(entity);
  }

  async deactivateByCandidateVersion(
    owner: string,
    candidateVersion: string,
    deactivatedBy: string,
    kind: EffectiveAliasDeactivationKind,
  ): Promise<number> {
    const actives = await this._repository.find({
      where: {
        owner,
        candidateVersion,
        runtimeStatus: EffectiveAliasRuntimeStatus.active,
      },
    });

    if (actives.length === 0) {
      return 0;
    }

    const now = new Date().toISOString();
    const status =
      kind === 'pause'
        ? EffectiveAliasRuntimeStatus.paused
        : EffectiveAliasRuntimeStatus.inactive;

    for (const row of actives) {
      row.runtimeStatus = status;
      row.deactivatedBy = deactivatedBy;
      row.deactivatedAt = now;
      row.deactivationKind = kind;
    }

    await this._repository.save(actives);
    return actives.length;
  }

  parseCandidateAlias(candidate: FeedbackAutoReviewPromotionCandidateEntity): {
    field: string;
    pattern: string;
    canonicalValue: string;
  } {
    const field =
      candidate.expectedImpact?.affectedFields?.[0] ??
      candidate.evidence?.examples?.[0]?.field;
    const example = candidate.evidence?.examples?.[0];
    const notes = candidate.notes ?? '';
    const patternFromNotes = /pattern=([^;]+)/.exec(notes)?.[1]?.trim();
    const correctedFromNotes = /corrected=([^;]+)/.exec(notes)?.[1]?.trim();

    const pattern = normalizeAliasText(
      patternFromNotes ??
        (typeof example?.originalText === 'string'
          ? example.originalText
          : '') ??
        '',
    );
    const canonicalValue =
      correctedFromNotes ??
      (example?.corrected != null ? String(example.corrected) : '');

    if (!field || !pattern || !canonicalValue) {
      throw new BadRequestException(
        'Candidato alias sem field/pattern/canonicalValue para ativacao runtime.',
      );
    }

    return {
      field: String(field),
      pattern,
      canonicalValue: String(canonicalValue).trim(),
    };
  }
}
