import { ENV_VARIABLES } from '@/common/config/env.config';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Not, Repository } from 'typeorm';
import { FeedbackEntity } from '../entities/feedback.entity';
import { FeedbackAutoReviewPromotionCandidateEntity } from '../entities/feedback-auto-review-promotion-candidate.entity';
import { normalizeAliasText } from '../utils/alias.rules';
import {
  AutoReviewAliasSuggestionField,
  AutoReviewAliasSuggestionItem,
  AutoReviewAliasSuggestionResult,
  AutoReviewPromotionCandidate,
  AutoReviewPromotionCandidateOrigin,
  AutoReviewPromotionCandidateType,
  AutoReviewPromotionStatus,
  FeedbackStatus,
} from '../interfaces';
import { FeedbackAutoReviewPromotionService } from './feedback-auto-review-promotion.service';

const DEFAULT_MIN_VOLUME = 2;
const MAX_EXAMPLES = 3;
const CRON_CREATED_BY = 'alias-suggestion-cron';
const PROD_PROMOTE_CRON = '0 15 2 * * *';
const DEV_PROMOTE_CRON = '0 0 */1 * * *';

export type AliasSuggestionPromoteBatchOutcome =
  | 'promoted'
  | 'skipped'
  | 'error';

export interface AliasSuggestionPromoteBatchItem {
  owner: string;
  candidateVersion: string;
  outcome: AliasSuggestionPromoteBatchOutcome;
  reason?: string;
}

export interface AliasSuggestionPromoteBatchResult {
  generatedAt: string;
  minVolume: number;
  ownersProcessed: number;
  promoted: number;
  skipped: number;
  errors: number;
  items: AliasSuggestionPromoteBatchItem[];
  runtimeEffective: false;
}

type DivergenceRecord = {
  field: AutoReviewAliasSuggestionField;
  pattern: string;
  predicted: string;
  corrected: string;
  originalText: string;
  updatedAt: string;
};

@Injectable()
export class FeedbackAutoReviewAliasSuggestionService {
  private readonly _logger = new Logger(
    FeedbackAutoReviewAliasSuggestionService.name,
  );

  constructor(
    @Inject('FEEDBACK_REPOSITORY')
    private readonly _feedbackRepository: Repository<FeedbackEntity>,
    @Inject('FEEDBACK_AUTO_REVIEW_PROMOTION_CANDIDATE_REPOSITORY')
    private readonly _candidateRepository: Repository<FeedbackAutoReviewPromotionCandidateEntity>,
    private readonly _promotionService: FeedbackAutoReviewPromotionService,
  ) {}

  /**
   * Cron: promove sugestões elegíveis → candidatos (fila). Não aprova nem ativa runtime.
   */
  @Cron(
    ENV_VARIABLES.NODE_ENV === 'production'
      ? PROD_PROMOTE_CRON
      : DEV_PROMOTE_CRON,
    { waitForCompletion: true },
  )
  async processEligibleAliasSuggestionPromotions(): Promise<number> {
    const result = await this.promoteEligibleAliasSuggestions();
    this._logger.log(
      `Alias suggestion cron finished promoted=${result.promoted} skipped=${result.skipped} errors=${result.errors} owners=${result.ownersProcessed}`,
    );
    return result.promoted;
  }

  /**
   * Lista sugestoes de alias a partir de divergencias humanas (somente leitura).
   */
  async buildAliasSuggestions(
    owner: string,
    minVolume = DEFAULT_MIN_VOLUME,
  ): Promise<AutoReviewAliasSuggestionResult> {
    const resolvedMinVolume =
      Number.isFinite(minVolume) && minVolume > 0
        ? Math.floor(minVolume)
        : DEFAULT_MIN_VOLUME;

    const reviewed = await this._feedbackRepository.find({
      where: {
        owner,
        status: Not(FeedbackStatus.pending),
      },
      order: {
        updatedAt: 'DESC',
      },
    });

    const candidates = await this._candidateRepository.find({
      where: { owner },
    });
    const rejectedVersions = new Set(
      candidates
        .filter(item => item.status === AutoReviewPromotionStatus.rejected)
        .map(item => item.candidateVersion),
    );
    const promotedVersions = new Set(
      candidates
        .filter(item =>
          [
            AutoReviewPromotionStatus.candidate,
            AutoReviewPromotionStatus.shadowValidated,
            AutoReviewPromotionStatus.approved,
            AutoReviewPromotionStatus.active,
          ].includes(item.status),
        )
        .map(item => item.candidateVersion),
    );

    const divergences = this.collectDivergences(reviewed);
    const conflictPatterns = this.findConflictPatterns(divergences);
    const grouped = new Map<string, AutoReviewAliasSuggestionItem>();

    for (const divergence of divergences) {
      const candidateVersion = this.buildCandidateVersion(divergence);
      const key = candidateVersion;
      const current = grouped.get(key);
      const conflict = conflictPatterns.has(
        `${divergence.field}:${divergence.pattern}`,
      );

      if (!current) {
        grouped.set(key, {
          field: divergence.field,
          pattern: divergence.pattern,
          predicted: divergence.predicted,
          corrected: divergence.corrected,
          count: 1,
          lastSeenAt: divergence.updatedAt,
          examples: [divergence.originalText],
          conflict,
          meetsMinimumVolume: false,
          alreadyPromoted: promotedVersions.has(candidateVersion),
          alreadyRejected: rejectedVersions.has(candidateVersion),
          candidateVersion,
        });
        continue;
      }

      current.count += 1;
      if (divergence.updatedAt > current.lastSeenAt) {
        current.lastSeenAt = divergence.updatedAt;
      }
      if (current.examples.length < MAX_EXAMPLES) {
        current.examples.push(divergence.originalText);
      }
      current.conflict = current.conflict || conflict;
    }

    const items = [...grouped.values()]
      .map(item => ({
        ...item,
        meetsMinimumVolume: item.count >= resolvedMinVolume,
      }))
      .sort((left, right) => right.count - left.count);

    return {
      generatedAt: new Date().toISOString(),
      minVolume: resolvedMinVolume,
      items,
      runtimeEffective: false,
    };
  }

  /**
   * Cria candidato de promocao tipo alias a partir de uma sugestao (sem runtime).
   */
  async promoteAliasSuggestion(
    owner: string,
    createdBy: string,
    payload: {
      field: AutoReviewAliasSuggestionField;
      pattern: string;
      predicted: string;
      corrected: string;
      minVolume?: number;
    },
  ): Promise<FeedbackAutoReviewPromotionCandidateEntity> {
    const report = await this.buildAliasSuggestions(owner, payload.minVolume);
    const suggestion = report.items.find(
      item =>
        item.field === payload.field &&
        item.pattern === normalizeAliasText(payload.pattern) &&
        normalizeAliasText(item.predicted) ===
          normalizeAliasText(payload.predicted) &&
        normalizeAliasText(item.corrected) ===
          normalizeAliasText(payload.corrected),
    );

    if (!suggestion) {
      throw new BadRequestException(
        'Sugestao de alias nao encontrada para o owner.',
      );
    }

    if (suggestion.conflict) {
      throw new BadRequestException(
        'Sugestao com conflito textual nao pode virar candidato.',
      );
    }

    if (!suggestion.meetsMinimumVolume) {
      throw new BadRequestException(
        'Sugestao abaixo do volume minimo configurado.',
      );
    }

    if (suggestion.alreadyRejected) {
      throw new BadRequestException('Sugestao ja foi rejeitada anteriormente.');
    }

    const candidate: AutoReviewPromotionCandidate = {
      type: AutoReviewPromotionCandidateType.alias,
      status: AutoReviewPromotionStatus.candidate,
      origin: AutoReviewPromotionCandidateOrigin.aliasSuggestion,
      candidateVersion: suggestion.candidateVersion,
      baseReviewVersion: 'auto-review-shadow-v1',
      evidence: {
        sampleSize: suggestion.count,
        shadowAgreementRate: 0,
        falsePositiveRate: 0,
        falseNegativeRate: 0,
        regressionRate: 0,
        fieldMetrics: [],
        fieldDivergences: {
          [suggestion.field]: suggestion.count,
        },
        examples: suggestion.examples.map(originalText => ({
          originalText,
          predicted: suggestion.predicted,
          corrected: suggestion.corrected,
          field: suggestion.field,
        })),
      },
      expectedImpact: {
        affectedFields: [suggestion.field],
        operationalSummary: `Alias sugerido: padrao '${suggestion.pattern}' de '${suggestion.predicted}' para '${suggestion.corrected}'.`,
      },
      knownRisk: {
        level: 'medium',
        reasons: [
          'Candidato ainda nao e efetivo no runtime do avaliador (AUTO-034).',
        ],
      },
      rollbackPlan: {
        strategy:
          'Manter ciclo rolled_back sem alterar alias.rules.ts/runtime.',
        previousVersion: 'alias.rules.ts-static',
        validation: 'Confirmar runtimeEffective=false apos rollback de ciclo.',
      },
      createdBy,
      createdAt: new Date().toISOString(),
      notes: `pattern=${suggestion.pattern}; predicted=${suggestion.predicted}; corrected=${suggestion.corrected}`,
    };

    return this._promotionService.storeCandidate(owner, candidate);
  }

  /**
   * Promove em lote sugestões elegíveis para candidatos (idempotente; sem approve/apply).
   */
  async promoteEligibleAliasSuggestions(options?: {
    owner?: string;
    minVolume?: number;
    createdBy?: string;
  }): Promise<AliasSuggestionPromoteBatchResult> {
    const minVolume = options?.minVolume ?? DEFAULT_MIN_VOLUME;
    const createdBy = options?.createdBy?.trim() || CRON_CREATED_BY;
    const owners = options?.owner
      ? [options.owner]
      : await this.listOwnersWithReviewedFeedback();

    const items: AliasSuggestionPromoteBatchItem[] = [];
    let promoted = 0;
    let skipped = 0;
    let errors = 0;

    for (const owner of owners) {
      const report = await this.buildAliasSuggestions(owner, minVolume);
      const rolledBackVersions = await this.listRolledBackVersions(owner);

      for (const suggestion of report.items) {
        if (!suggestion.meetsMinimumVolume) {
          skipped += 1;
          items.push({
            owner,
            candidateVersion: suggestion.candidateVersion,
            outcome: 'skipped',
            reason: 'below_min_volume',
          });
          continue;
        }

        if (suggestion.conflict) {
          skipped += 1;
          items.push({
            owner,
            candidateVersion: suggestion.candidateVersion,
            outcome: 'skipped',
            reason: 'conflict',
          });
          continue;
        }

        if (suggestion.alreadyRejected) {
          skipped += 1;
          items.push({
            owner,
            candidateVersion: suggestion.candidateVersion,
            outcome: 'skipped',
            reason: 'already_rejected',
          });
          continue;
        }

        if (suggestion.alreadyPromoted) {
          skipped += 1;
          items.push({
            owner,
            candidateVersion: suggestion.candidateVersion,
            outcome: 'skipped',
            reason: 'already_promoted',
          });
          continue;
        }

        if (rolledBackVersions.has(suggestion.candidateVersion)) {
          skipped += 1;
          items.push({
            owner,
            candidateVersion: suggestion.candidateVersion,
            outcome: 'skipped',
            reason: 'already_rolled_back',
          });
          continue;
        }

        try {
          await this.promoteAliasSuggestion(owner, createdBy, {
            field: suggestion.field,
            pattern: suggestion.pattern,
            predicted: suggestion.predicted,
            corrected: suggestion.corrected,
            minVolume,
          });
          promoted += 1;
          items.push({
            owner,
            candidateVersion: suggestion.candidateVersion,
            outcome: 'promoted',
          });
        } catch (error) {
          errors += 1;
          items.push({
            owner,
            candidateVersion: suggestion.candidateVersion,
            outcome: 'error',
            reason:
              error instanceof Error ? error.message : 'unknown_promote_error',
          });
        }
      }
    }

    return {
      generatedAt: new Date().toISOString(),
      minVolume,
      ownersProcessed: owners.length,
      promoted,
      skipped,
      errors,
      items,
      runtimeEffective: false,
    };
  }

  private async listOwnersWithReviewedFeedback(): Promise<string[]> {
    const rows = await this._feedbackRepository
      .createQueryBuilder('feedback')
      .select('DISTINCT feedback.owner', 'owner')
      .where('feedback.status != :pending', {
        pending: FeedbackStatus.pending,
      })
      .getRawMany<{ owner: string }>();

    return rows
      .map(row => row.owner)
      .filter((owner): owner is string => !!owner?.trim());
  }

  private async listRolledBackVersions(owner: string): Promise<Set<string>> {
    const rolledBack = await this._candidateRepository.find({
      where: {
        owner,
        status: AutoReviewPromotionStatus.rolledBack,
      },
      select: ['candidateVersion'],
    });

    return new Set(rolledBack.map(item => item.candidateVersion));
  }

  private collectDivergences(feedbacks: FeedbackEntity[]): DivergenceRecord[] {
    const divergences: DivergenceRecord[] = [];

    for (const feedback of feedbacks) {
      this.pushDivergence(
        divergences,
        'account',
        feedback.predictedAccount,
        feedback.correctedAccount,
        feedback,
      );
      this.pushDivergence(
        divergences,
        'category',
        feedback.predictedCategory,
        feedback.correctedCategory,
        feedback,
      );
    }

    return divergences;
  }

  private pushDivergence(
    target: DivergenceRecord[],
    field: AutoReviewAliasSuggestionField,
    predicted: string | undefined,
    corrected: string | undefined,
    feedback: FeedbackEntity,
  ): void {
    if (!corrected?.trim()) {
      return;
    }

    if (
      predicted &&
      normalizeAliasText(predicted) === normalizeAliasText(corrected)
    ) {
      return;
    }

    target.push({
      field,
      pattern: normalizeAliasText(feedback.originalText),
      predicted: predicted?.trim() || '',
      corrected: corrected.trim(),
      originalText: feedback.originalText,
      updatedAt: feedback.updatedAt,
    });
  }

  private findConflictPatterns(divergences: DivergenceRecord[]): Set<string> {
    const byPattern = new Map<string, Set<string>>();

    for (const divergence of divergences) {
      const key = `${divergence.field}:${divergence.pattern}`;
      const corrected = byPattern.get(key) ?? new Set<string>();
      corrected.add(normalizeAliasText(divergence.corrected));
      byPattern.set(key, corrected);
    }

    return new Set(
      [...byPattern.entries()]
        .filter(([, corrected]) => corrected.size > 1)
        .map(([key]) => key),
    );
  }

  private buildCandidateVersion(divergence: DivergenceRecord): string {
    const slug = [
      divergence.field,
      divergence.pattern.slice(0, 40),
      normalizeAliasText(divergence.predicted).slice(0, 20),
      normalizeAliasText(divergence.corrected).slice(0, 20),
    ]
      .join('-')
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return `alias-suggest-${slug}`.slice(0, 64);
  }
}
