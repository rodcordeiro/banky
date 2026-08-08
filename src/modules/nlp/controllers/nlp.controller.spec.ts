import { FeedbackStatus } from '../interfaces';
import { NlpController } from './nlp.controller';

describe('NlpController', () => {
  const owner = 'user-id';
  const req = { user: { id: owner } } as AuthenticatedRequest;
  const service = {
    parse: jest.fn(),
    getClassifierModels: jest.fn(),
    findAll: jest.fn(),
    Review: jest.fn(),
    trainClassifiers: jest.fn(),
    createTransactionFromFeedback: jest.fn(),
  };
  const shadowService = {
    buildOperationalReport: jest.fn(),
    revaluatePendingBatch: jest.fn(),
  };
  const learningService = {
    buildLearningLoopReport: jest.fn(),
  };
  const learningReassessmentService = {
    buildReassessment: jest.fn(),
  };
  const promotionPolicyReassessmentService = {
    buildReassessment: jest.fn(),
  };
  const qualityService = {
    buildQualityMetrics: jest.fn(),
  };
  const aliasSuggestionService = {
    buildAliasSuggestions: jest.fn(),
    promoteAliasSuggestion: jest.fn(),
  };
  const promotionService = {
    listCandidates: jest.fn(),
    listCandidatesEnriched: jest.fn(),
    getCandidate: jest.fn(),
    getCandidateEnriched: jest.fn(),
    buildPromotionHistory: jest.fn(),
    approveCandidate: jest.fn(),
    rejectCandidate: jest.fn(),
    applyCandidate: jest.fn(),
    rollbackCandidate: jest.fn(),
  };
  const comparativeReplayService = {
    buildComparativeReplay: jest.fn(),
  };
  const effectiveAliasService = {
    listReport: jest.fn(),
  };

  let controller: NlpController;

  beforeEach(() => {
    controller = new NlpController(
      service as never,
      shadowService as never,
      learningService as never,
      learningReassessmentService as never,
      promotionPolicyReassessmentService as never,
      qualityService as never,
      promotionService as never,
      comparativeReplayService as never,
      effectiveAliasService as never,
      aliasSuggestionService as never,
    );
    jest.clearAllMocks();
  });

  it('processes text using authenticated owner', async () => {
    const payload = { text: 'Caiu pagamento no nubank digo' };
    const parsed = { id: 'feedback-id', originalText: payload.text, owner };
    service.parse.mockResolvedValue(parsed);

    await expect(controller.process(req, payload)).resolves.toBe(parsed);

    expect(service.parse).toHaveBeenCalledWith(payload.text, owner);
  });

  it('returns classifier models', async () => {
    const models = {
      intent: { exists: true, file: 'intent.model.json', model: {} },
    };
    service.getClassifierModels.mockResolvedValue(models);

    await expect(controller.models()).resolves.toBe(models);

    expect(service.getClassifierModels).toHaveBeenCalledWith();
  });

  it('lists feedback scoped by authenticated owner and query filters', async () => {
    const query = {
      page: 2,
      limit: 20,
      status: FeedbackStatus.pending,
    };
    const page = { data: [], meta: { page: 2 } };
    service.findAll.mockResolvedValue(page);

    await expect(controller.index(req, query)).resolves.toBe(page);

    expect(service.findAll).toHaveBeenCalledWith(owner, query);
  });

  it('reviews feedback merging body, route id and authenticated owner', async () => {
    const payload = {
      status: FeedbackStatus.corrected,
      correctedAccount: 'nubank digo',
    };
    const reviewed = { id: 'feedback-id', ...payload, owner };
    service.Review.mockResolvedValue(reviewed);

    await expect(controller.aprove(req, payload, 'feedback-id')).resolves.toBe(
      reviewed,
    );

    expect(service.Review).toHaveBeenCalledWith({
      ...payload,
      id: 'feedback-id',
      owner,
    });
  });

  it('starts full classifier training for authenticated owner', async () => {
    service.trainClassifiers.mockResolvedValue(undefined);

    await expect(
      controller.train(req, { fullTraining: true }),
    ).resolves.toBeUndefined();

    expect(service.trainClassifiers).toHaveBeenCalledWith(true, owner);
  });

  it('starts incremental classifier training when query is empty', async () => {
    service.trainClassifiers.mockResolvedValue(undefined);

    await expect(controller.train(req, {})).resolves.toBeUndefined();

    expect(service.trainClassifiers).toHaveBeenCalledWith(undefined, owner);
  });

  it('creates transaction from feedback using route id and authenticated owner', async () => {
    const transaction = { id: 'transaction-id' };
    service.createTransactionFromFeedback.mockResolvedValue(transaction);

    await expect(
      controller.createTransactionFromFeedback(req, 'feedback-id'),
    ).resolves.toBe(transaction);

    expect(service.createTransactionFromFeedback).toHaveBeenCalledWith(
      'feedback-id',
      owner,
    );
  });

  it('returns the operational auto review report for the authenticated owner', async () => {
    const query = {
      page: 1,
      limit: 10,
      sortBy: 'score' as const,
      order: 'DESC' as const,
    };
    const report = { items: [], meta: { currentPage: 1 } };
    shadowService.buildOperationalReport.mockResolvedValue(report);

    await expect(controller.autoReviewReport(req, query)).resolves.toBe(report);

    expect(shadowService.buildOperationalReport).toHaveBeenCalledWith(
      owner,
      query,
    );
  });

  it('returns the supervised learning loop report for the authenticated owner', async () => {
    const report = {
      dataset: { totalReviewedFeedbacks: 1 },
      fieldMetrics: [],
    };
    learningService.buildLearningLoopReport.mockResolvedValue(report);

    await expect(
      controller.autoReviewLearningLoop(req, { maxExamples: 5 }),
    ).resolves.toBe(report);

    expect(learningService.buildLearningLoopReport).toHaveBeenCalledWith(
      owner,
      5,
    );
  });

  it('returns promotion policy reassessment for the authenticated owner', async () => {
    const query = { from: '2026-08-01T00:00:00.000Z' };
    const report = {
      policyVersion: 'v1',
      applied: false,
      runtimeEffective: false,
    };
    promotionPolicyReassessmentService.buildReassessment.mockResolvedValue(
      report,
    );

    await expect(
      controller.autoReviewPromotionPolicyReassessment(req, query),
    ).resolves.toBe(report);

    expect(
      promotionPolicyReassessmentService.buildReassessment,
    ).toHaveBeenCalledWith(owner, query);
  });

  it('returns quality metrics for the authenticated owner', async () => {
    const query = { from: '2026-08-01T00:00:00.000Z' };
    const report = { summary: { shadowVolume: 3 } };
    qualityService.buildQualityMetrics.mockResolvedValue(report);

    await expect(controller.autoReviewQualityMetrics(req, query)).resolves.toBe(
      report,
    );

    expect(qualityService.buildQualityMetrics).toHaveBeenCalledWith(
      owner,
      query,
    );
  });

  it('runs shadow revaluation scoped by authenticated owner', async () => {
    const payload = { reviewVersion: 'auto-review-shadow-v2', batchSize: 10 };
    const result = { evaluated: 2, skipped: 1, errors: 0 };
    shadowService.revaluatePendingBatch.mockResolvedValue(result);

    await expect(controller.autoReviewRevaluate(req, payload)).resolves.toBe(
      result,
    );

    expect(shadowService.revaluatePendingBatch).toHaveBeenCalledWith({
      ...payload,
      owner,
    });
  });

  it('returns alias suggestions for the authenticated owner', async () => {
    const report = { items: [], runtimeEffective: false };
    aliasSuggestionService.buildAliasSuggestions.mockResolvedValue(report);

    await expect(
      controller.autoReviewAliasSuggestions(req, { minVolume: 3 }),
    ).resolves.toBe(report);

    expect(aliasSuggestionService.buildAliasSuggestions).toHaveBeenCalledWith(
      owner,
      3,
    );
  });

  it('lists promotion candidates scoped by authenticated owner', async () => {
    const candidates = [
      {
        candidate: { candidateVersion: 'alias-v1' },
        qualityPreview: { approverSummary: 'resumo' },
        runtimeEffective: false,
      },
    ];
    promotionService.listCandidatesEnriched.mockResolvedValue(candidates);

    await expect(
      controller.autoReviewPromotionCandidates(req, {
        status: 'candidate' as never,
      }),
    ).resolves.toBe(candidates);

    expect(promotionService.listCandidatesEnriched).toHaveBeenCalledWith(
      owner,
      'candidate',
    );
  });

  it('returns enriched promotion candidate detail for the authenticated owner', async () => {
    const detail = {
      candidate: { candidateVersion: 'alias-v1' },
      qualitySignals: { approverSummary: { text: 'ficha' } },
      runtimeEffective: false,
    };
    promotionService.getCandidateEnriched.mockResolvedValue(detail);

    await expect(
      controller.autoReviewPromotionCandidate(req, 'alias-v1'),
    ).resolves.toBe(detail);

    expect(promotionService.getCandidateEnriched).toHaveBeenCalledWith(
      owner,
      'alias-v1',
    );
  });

  it('returns comparative replay for a promotion candidate', async () => {
    const query = { recentDays: 30 };
    const report = {
      runtimeEffective: false,
      recommendation: { action: 'reduce_scope' },
    };
    comparativeReplayService.buildComparativeReplay.mockResolvedValue(report);

    await expect(
      controller.autoReviewComparativeReplay(req, 'alias-v1', query),
    ).resolves.toBe(report);

    expect(
      comparativeReplayService.buildComparativeReplay,
    ).toHaveBeenCalledWith(owner, 'alias-v1', query);
  });

  it('returns dedicated promotion history for the authenticated owner', async () => {
    const history = { runtimeEffective: false, items: [] };
    promotionService.buildPromotionHistory.mockResolvedValue(history);

    await expect(
      controller.autoReviewPromotionHistory(req, {
        candidateVersion: 'alias-v1',
      }),
    ).resolves.toBe(history);

    expect(promotionService.buildPromotionHistory).toHaveBeenCalledWith(
      owner,
      'alias-v1',
    );
  });

  it('approves a promotion candidate using authenticated owner as approver', async () => {
    const approved = { candidateVersion: 'alias-v1', status: 'approved' };
    promotionService.approveCandidate.mockResolvedValue(approved);

    await expect(
      controller.approveAutoReviewPromotionCandidate(req, 'alias-v1', {
        notes: 'ok',
      }),
    ).resolves.toBe(approved);

    expect(promotionService.approveCandidate).toHaveBeenCalledWith(
      owner,
      'alias-v1',
      owner,
      'ok',
      {
        reasonCode: undefined,
        decisionVsRecommendation: undefined,
        exceptionalReason: undefined,
      },
    );
  });

  it('rolls back an active promotion candidate using authenticated owner', async () => {
    const rolledBack = {
      candidateVersion: 'alias-v1',
      status: 'rolled_back',
    };
    promotionService.rollbackCandidate.mockResolvedValue(rolledBack);

    await expect(
      controller.rollbackAutoReviewPromotionCandidate(req, 'alias-v1', {
        reason: 'regression detected',
        notes: 'disabled before runtime integration',
      }),
    ).resolves.toBe(rolledBack);

    expect(promotionService.rollbackCandidate).toHaveBeenCalledWith(
      owner,
      'alias-v1',
      owner,
      'regression detected',
      'disabled before runtime integration',
      'immediate',
    );
  });
});
