import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { FeedbackAutoReviewPromotionCandidateEntity } from '../entities/feedback-auto-review-promotion-candidate.entity';
import {
  AutoReviewPromotionCandidate,
  AutoReviewPromotionStatus,
  buildAutoReviewPromotionReplayResult,
} from '../interfaces';

@Injectable()
export class FeedbackAutoReviewPromotionService {
  constructor(
    @Inject('FEEDBACK_AUTO_REVIEW_PROMOTION_CANDIDATE_REPOSITORY')
    private readonly _candidateRepository: Repository<FeedbackAutoReviewPromotionCandidateEntity>,
  ) {}

  async storeCandidate(
    owner: string,
    candidate: AutoReviewPromotionCandidate,
  ): Promise<FeedbackAutoReviewPromotionCandidateEntity> {
    const existing = await this._candidateRepository.findOne({
      where: {
        owner,
        candidateVersion: candidate.candidateVersion,
      },
    });

    const payload = {
      owner,
      type: candidate.type,
      status: candidate.status,
      origin: candidate.origin,
      candidateVersion: candidate.candidateVersion,
      baseReviewVersion: candidate.baseReviewVersion,
      evidence: candidate.evidence,
      expectedImpact: candidate.expectedImpact,
      knownRisk: candidate.knownRisk,
      rollbackPlan: candidate.rollbackPlan,
      createdBy: candidate.createdBy,
      approvedBy: candidate.approvedBy ?? null,
      rejectedBy: candidate.rejectedBy ?? null,
      appliedBy: candidate.appliedBy ?? null,
      rolledBackBy: candidate.rolledBackBy ?? null,
      approvedAt: candidate.approvedAt ?? null,
      rejectedAt: candidate.rejectedAt ?? null,
      appliedAt: candidate.appliedAt ?? null,
      rolledBackAt: candidate.rolledBackAt ?? null,
      rollbackReason: candidate.rollbackReason ?? null,
      notes: candidate.notes ?? null,
    };

    const entity = existing
      ? this._candidateRepository.merge(existing, payload)
      : this._candidateRepository.create(payload);

    return this._candidateRepository.save(entity);
  }

  async listCandidates(
    owner: string,
    status?: AutoReviewPromotionStatus,
  ): Promise<FeedbackAutoReviewPromotionCandidateEntity[]> {
    return this._candidateRepository.find({
      where: {
        owner,
        ...(status ? { status } : {}),
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findCandidate(
    owner: string,
    candidateVersion: string,
  ): Promise<FeedbackAutoReviewPromotionCandidateEntity | null> {
    return this._candidateRepository.findOne({
      where: {
        owner,
        candidateVersion,
      },
    });
  }

  async getCandidate(
    owner: string,
    candidateVersion: string,
  ): Promise<FeedbackAutoReviewPromotionCandidateEntity> {
    return this.findRequiredCandidate(owner, candidateVersion);
  }

  async approveCandidate(
    owner: string,
    candidateVersion: string,
    approvedBy: string,
    notes?: string,
  ): Promise<FeedbackAutoReviewPromotionCandidateEntity> {
    const candidate = await this.findRequiredCandidate(owner, candidateVersion);

    if (
      ![
        AutoReviewPromotionStatus.candidate,
        AutoReviewPromotionStatus.shadowValidated,
      ].includes(candidate.status)
    ) {
      throw new BadRequestException('Candidato nao esta em estado aprovavel.');
    }

    const replay = buildAutoReviewPromotionReplayResult(
      this.toPromotionCandidate(candidate),
    );

    if (!replay.eligible) {
      throw new BadRequestException(
        `Candidato nao atende criterios de promocao: ${replay.blockers.join(', ')}`,
      );
    }

    candidate.status = AutoReviewPromotionStatus.approved;
    candidate.approvedBy = approvedBy;
    candidate.approvedAt = new Date().toISOString();
    candidate.notes = this.mergeNotes(candidate.notes, notes);

    return this._candidateRepository.save(candidate);
  }

  async rejectCandidate(
    owner: string,
    candidateVersion: string,
    rejectedBy: string,
    notes?: string,
  ): Promise<FeedbackAutoReviewPromotionCandidateEntity> {
    const candidate = await this.findRequiredCandidate(owner, candidateVersion);

    if (
      [
        AutoReviewPromotionStatus.active,
        AutoReviewPromotionStatus.rolledBack,
      ].includes(candidate.status)
    ) {
      throw new BadRequestException(
        'Candidato ativo ou revertido nao pode ser rejeitado.',
      );
    }

    candidate.status = AutoReviewPromotionStatus.rejected;
    candidate.rejectedBy = rejectedBy;
    candidate.rejectedAt = new Date().toISOString();
    candidate.notes = this.mergeNotes(candidate.notes, notes);

    return this._candidateRepository.save(candidate);
  }

  async applyCandidate(
    owner: string,
    candidateVersion: string,
    appliedBy: string,
    notes?: string,
  ): Promise<FeedbackAutoReviewPromotionCandidateEntity> {
    const candidate = await this.findRequiredCandidate(owner, candidateVersion);

    if (candidate.status === AutoReviewPromotionStatus.active) {
      return candidate;
    }

    if (candidate.status !== AutoReviewPromotionStatus.approved) {
      throw new BadRequestException(
        'Somente candidato aprovado pode ser aplicado.',
      );
    }

    candidate.status = AutoReviewPromotionStatus.active;
    candidate.appliedBy = appliedBy;
    candidate.appliedAt = new Date().toISOString();
    candidate.notes = this.mergeNotes(candidate.notes, notes);

    return this._candidateRepository.save(candidate);
  }

  async rollbackCandidate(
    owner: string,
    candidateVersion: string,
    rolledBackBy: string,
    reason: string,
    notes?: string,
  ): Promise<FeedbackAutoReviewPromotionCandidateEntity> {
    const candidate = await this.findRequiredCandidate(owner, candidateVersion);

    if (!reason?.trim()) {
      throw new BadRequestException('Motivo do rollback e obrigatorio.');
    }

    if (candidate.status === AutoReviewPromotionStatus.rolledBack) {
      return candidate;
    }

    if (candidate.status !== AutoReviewPromotionStatus.active) {
      throw new BadRequestException(
        'Somente candidato ativo pode ser revertido.',
      );
    }

    candidate.status = AutoReviewPromotionStatus.rolledBack;
    candidate.rolledBackBy = rolledBackBy;
    candidate.rolledBackAt = new Date().toISOString();
    candidate.rollbackReason = reason.trim();
    candidate.notes = this.mergeNotes(candidate.notes, notes);

    return this._candidateRepository.save(candidate);
  }

  private async findRequiredCandidate(
    owner: string,
    candidateVersion: string,
  ): Promise<FeedbackAutoReviewPromotionCandidateEntity> {
    const candidate = await this.findCandidate(owner, candidateVersion);

    if (!candidate) {
      throw new NotFoundException('Candidato de promocao nao encontrado.');
    }

    return candidate;
  }

  private toPromotionCandidate(
    entity: FeedbackAutoReviewPromotionCandidateEntity,
  ): AutoReviewPromotionCandidate {
    return {
      type: entity.type,
      status: entity.status,
      origin: entity.origin,
      candidateVersion: entity.candidateVersion,
      baseReviewVersion: entity.baseReviewVersion,
      evidence: entity.evidence,
      expectedImpact: entity.expectedImpact,
      knownRisk: entity.knownRisk,
      rollbackPlan: entity.rollbackPlan,
      createdBy: entity.createdBy,
      approvedBy: entity.approvedBy ?? undefined,
      rejectedBy: entity.rejectedBy ?? undefined,
      appliedBy: entity.appliedBy ?? undefined,
      rolledBackBy: entity.rolledBackBy ?? undefined,
      createdAt: entity.createdAt,
      approvedAt: entity.approvedAt ?? undefined,
      rejectedAt: entity.rejectedAt ?? undefined,
      appliedAt: entity.appliedAt ?? undefined,
      rolledBackAt: entity.rolledBackAt ?? undefined,
      rollbackReason: entity.rollbackReason ?? undefined,
      notes: entity.notes ?? undefined,
    };
  }

  private mergeNotes(current?: string | null, next?: string): string | null {
    if (!next) {
      return current ?? null;
    }

    if (!current) {
      return next;
    }

    return `${current}\n${next}`;
  }
}
