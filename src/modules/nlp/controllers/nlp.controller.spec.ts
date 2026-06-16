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
  };
  const learningService = {
    buildLearningLoopReport: jest.fn(),
  };

  let controller: NlpController;

  beforeEach(() => {
    controller = new NlpController(
      service as never,
      shadowService as never,
      learningService as never,
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
});
