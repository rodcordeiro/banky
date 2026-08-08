import {
  BaseClassifier,
  TrainingSample,
} from '@/common/classifiers/base.classifier';
import { PaginationService } from '@/core/paginate/paginate.service';
import { AccountsEntity } from '@/modules/accounts/entities/accounts.entity';
import { CategoriesEntity } from '@/modules/categories/entities/categories.entity';
import { AccountsClassifier } from '@/modules/nlp/classifiers/account.classifier';
import { CategoryClassifier } from '@/modules/nlp/classifiers/category.classifier';
import {
  IntentClassifier,
  Intents,
} from '@/modules/nlp/classifiers/intent.classifier';
import { ValueClassifier } from '@/modules/nlp/classifiers/value.classifier';
import { FeedbackAutoReviewService } from '@/modules/nlp/services/feedback-auto-review.service';
import { FeedbackAutoReviewEffectiveAliasService } from '@/modules/nlp/services/feedback-auto-review-effective-alias.service';
import {
  ACCOUNT_ALIASES,
  CATEGORY_ALIASES,
  resolveAliasMatch,
} from '@/modules/nlp/utils/alias.rules';
import { TransactionsService } from '@/modules/transactions/services/transactions.service';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { pt } from 'chrono-node';
import {
  FindManyOptions,
  FindOptionsWhere,
  Not,
  Repository,
  MoreThan,
} from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { SearchFeedbackDto } from '../dtos/search.dto';
import { FeedbackAutoReviewEntity } from '../entities/feedback-auto-review.entity';
import { FeedbackEntity } from '../entities/feedback.entity';
import {
  AUTO_REVIEW_REASON_CATALOG,
  AutoReviewDecision,
  AutoReviewContext,
  AutoReviewReason,
  AutoReviewReasonCode,
  AutoReviewResult,
  AutoReviewEntityReference,
  AutoReviewMode,
  FeedbackStatus,
} from '../interfaces';

@Injectable()
export class NlpService {
  private intentProcessor: IntentClassifier;
  private accountProcessor: AccountsClassifier;
  private categoriesProcessor: CategoryClassifier;
  private valueProcessor: ValueClassifier;

  constructor(
    @Inject('FEEDBACK_REPOSITORY')
    private readonly _repository: Repository<FeedbackEntity>,

    @Inject('ACCOUNTS_REPOSITORY')
    private readonly _accountRepository: Repository<AccountsEntity>,

    @Inject('CATEGORIES_REPOSITORY')
    private readonly _categoryRepository: Repository<CategoriesEntity>,

    @Inject('FEEDBACK_AUTO_REVIEW_REPOSITORY')
    private readonly _feedbackAutoReviewRepository: Repository<FeedbackAutoReviewEntity>,

    private readonly _paginateService: PaginationService,
    private readonly _transactionsService: TransactionsService,
    private readonly _feedbackAutoReviewService: FeedbackAutoReviewService,
    private readonly _effectiveAliasService: FeedbackAutoReviewEffectiveAliasService,
  ) {
    this.intentProcessor = new IntentClassifier();
    this.accountProcessor = new AccountsClassifier();
    this.categoriesProcessor = new CategoryClassifier();
    this.valueProcessor = new ValueClassifier();
  }

  resetClassifiers(): void {
    this.intentProcessor = new IntentClassifier();
    this.accountProcessor = new AccountsClassifier();
    this.categoriesProcessor = new CategoryClassifier();
    this.valueProcessor = new ValueClassifier();
  }

  private cleanAccountChunk(value: string | undefined): string | undefined {
    if (!value) return undefined;
    const normalized = value.trim().split(' ').filter(Boolean).join(' ');
    const [first, ...rest] = normalized.split(' ');

    if (['o', 'a', 'os', 'as'].includes(first?.toLowerCase())) {
      return rest.join(' ') || undefined;
    }

    return normalized || undefined;
  }

  private hasWordBoundary(
    text: string,
    index: number,
    length: number,
  ): boolean {
    const before = index === 0 ? ' ' : text[index - 1];
    const after = index + length >= text.length ? ' ' : text[index + length];

    return !this.isWordChar(before) && !this.isWordChar(after);
  }

  private isWordChar(char: string): boolean {
    return /[a-z0-9_]/i.test(char);
  }

  private findMarker(
    text: string,
    markers: string[],
    startAt: number = 0,
  ): { marker: string; index: number } | undefined {
    let best: { marker: string; index: number } | undefined;

    for (const marker of markers) {
      let index = text.indexOf(marker, startAt);
      const boundaryLength = marker.trimEnd().length;

      while (index >= 0) {
        if (this.hasWordBoundary(text, index, boundaryLength)) {
          if (!best || index < best.index) {
            best = { marker, index };
          }
          break;
        }

        index = text.indexOf(marker, index + marker.length);
      }
    }

    return best;
  }

  private findFirstDelimiterIndex(
    text: string,
    delimiters: string[],
    startAt: number,
  ): number {
    let end = text.length;

    for (const delimiter of delimiters) {
      const index = text.indexOf(delimiter, startAt);
      if (index >= 0 && index < end) {
        end = index;
      }
    }

    const commaIndex = text.indexOf(',', startAt);
    if (commaIndex >= 0 && commaIndex < end) {
      end = commaIndex;
    }

    return end;
  }

  private extractChunkAfterMarker(
    text: string,
    markers: string[],
    delimiters: string[],
  ): string | undefined {
    const marker = this.findMarker(text, markers);
    if (!marker) return undefined;

    const chunkStart = marker.index + marker.marker.length;
    const chunkEnd = this.findFirstDelimiterIndex(text, delimiters, chunkStart);

    return this.cleanAccountChunk(text.slice(chunkStart, chunkEnd));
  }

  private extractTransferOrigin(cleaned: string): string | undefined {
    const paired = this.extractChunkAfterMarker(
      cleaned,
      ['do ', 'de ', 'na conta '],
      [' para ', ' pra ', ' pro '],
    );
    if (paired) return paired;

    return this.extractChunkAfterMarker(
      cleaned,
      ['do ', 'de ', 'na conta '],
      [],
    );
  }

  private extractTransferDestiny(cleaned: string): string | undefined {
    return this.extractChunkAfterMarker(
      cleaned,
      ['para ', 'pra ', 'pro '],
      [' dia '],
    );
  }

  private extractCreateAccount(text: string): string | undefined {
    const fromConta = this.extractChunkAfterMarker(
      text,
      ['na conta '],
      [' dia '],
    );
    if (fromConta) return fromConta;

    return this.extractChunkAfterMarker(
      text,
      ['com o ', 'com a ', 'com ', 'pelo ', 'pela ', 'no ', 'na '],
      [' dia '],
    );
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

  private findComparableEntity<T extends { name: string }>(
    text: string,
    candidates: T[],
    options?: { bidirectional?: boolean },
  ): T | undefined {
    const normalizedText = this.normalizeComparable(text);

    return (
      candidates.find(
        candidate =>
          this.normalizeComparable(candidate.name) === normalizedText,
      ) ??
      candidates.find(candidate => {
        const normalizedCandidate = this.normalizeComparable(candidate.name);
        return options?.bidirectional
          ? normalizedText.includes(normalizedCandidate) ||
              normalizedCandidate.includes(normalizedText)
          : normalizedText.includes(normalizedCandidate);
      })
    );
  }

  private async findAccountByText(
    text: string,
    owner?: string,
  ): Promise<string | undefined> {
    const normalizedText = this.normalizeComparable(text);
    const accounts = await this._accountRepository.find({
      where: owner
        ? ({
            owner: { id: owner },
          } as unknown as FindOptionsWhere<AccountsEntity>)
        : undefined,
    });

    const aliasRules = owner
      ? await this._effectiveAliasService.resolveAliasRules(owner, 'account')
      : ACCOUNT_ALIASES;
    const aliasMatch = resolveAliasMatch(normalizedText, accounts, aliasRules);
    if (aliasMatch) return aliasMatch.target;

    return this.findComparableEntity(normalizedText, accounts, {
      bidirectional: true,
    })?.name;
  }

  private async listOwnerAccounts(owner: string): Promise<AccountsEntity[]> {
    return this._accountRepository.find({
      where: {
        owner: { id: owner },
      } as unknown as FindOptionsWhere<AccountsEntity>,
    });
  }

  private async listOwnerCategories(
    owner: string,
  ): Promise<CategoriesEntity[]> {
    return this._categoryRepository.find({
      where: {
        owner: { id: owner },
      } as unknown as FindOptionsWhere<CategoriesEntity>,
    });
  }

  private findAccountEntity(
    text: string | undefined,
    accounts: AccountsEntity[],
  ): AccountsEntity | null {
    if (!text) return null;

    return (
      this.findComparableEntity(text, accounts, { bidirectional: true }) ?? null
    );
  }

  private async findAccountEntityByText(
    text: string | undefined,
    owner: string,
  ): Promise<AccountsEntity | null> {
    if (!text) return null;

    return this.findAccountEntity(text, await this.listOwnerAccounts(owner));
  }

  private async classifyAccountText(
    text: string,
    owner?: string,
  ): Promise<string | undefined> {
    const directMatch = await this.findAccountByText(text, owner);
    if (directMatch) return directMatch;

    return (await this.accountProcessor.classify(text)) as string | undefined;
  }

  private async classifyCreateAccount(
    text: string,
    owner?: string,
  ): Promise<string | undefined> {
    const accountChunk = this.extractCreateAccount(text);
    return this.classifyAccountText(accountChunk ?? text, owner);
  }

  private async resolveKnownCategory(
    text: string,
    owner?: string,
  ): Promise<string | undefined> {
    const normalized = this.normalizeComparable(text);
    const categories = await this._categoryRepository.find({
      where: owner
        ? ({
            owner: { id: owner },
          } as unknown as FindOptionsWhere<CategoriesEntity>)
        : undefined,
    });

    const aliasRules = owner
      ? await this._effectiveAliasService.resolveAliasRules(owner, 'category')
      : CATEGORY_ALIASES;
    const aliasMatch = resolveAliasMatch(normalized, categories, aliasRules);
    if (aliasMatch) return aliasMatch.target;

    if (/\b(?:de|do|da|no|na)\s+mercado\b/.test(normalized)) {
      const market = categories.find(
        category => this.normalizeComparable(category.name) === 'mercado',
      );
      if (market) return market.name;
    }

    return this.findComparableEntity(normalized, categories)?.name;
  }

  private findCategoryEntity(
    text: string | undefined,
    categories: CategoriesEntity[],
  ): CategoriesEntity | null {
    if (!text) return null;

    return this.findComparableEntity(text, categories) ?? null;
  }

  private async findCategoryEntityByText(
    text: string | undefined,
    owner: string,
  ): Promise<CategoriesEntity | null> {
    if (!text) return null;

    return this.findCategoryEntity(text, await this.listOwnerCategories(owner));
  }

  private async classifyCategory(
    text: string,
    owner?: string,
  ): Promise<string | undefined> {
    const knownCategory = await this.resolveKnownCategory(text, owner);
    if (knownCategory) return knownCategory;

    return (await this.categoriesProcessor.classify(text)) as
      | string
      | undefined;
  }

  async extractEntities(text: string, owner?: string) {
    const result = {
      originalText: text,
    } as FeedbackEntity;
    const cleaned = text.toLowerCase();

    result.predictedIntent = await this.intentProcessor.classify(cleaned);

    if (result.predictedIntent === Intents.TRANSFER) {
      const originText = this.extractTransferOrigin(cleaned);
      const destText = this.extractTransferDestiny(cleaned);

      if (originText) {
        result.predictedOriginAccount = (await this.classifyAccountText(
          originText,
          owner,
        )) as string;
      }

      if (destText) {
        result.predictedDestinyAccount = (await this.classifyAccountText(
          destText,
          owner,
        )) as string;
      }

      if (!result.predictedOriginAccount) {
        result.predictedOriginAccount = (await this.classifyAccountText(
          text,
          owner,
        )) as string;
      }

      if (!result.predictedDestinyAccount && originText) {
        result.predictedDestinyAccount = (await this.classifyAccountText(
          text.replace(originText, ''),
          owner,
        )) as string;
      }
    } else {
      result.predictedAccount = await this.classifyCreateAccount(text, owner);

      result.predictedCategory = await this.classifyCategory(text, owner);
    }

    result.predictedValue = (await this.valueProcessor.classify(
      text,
    )) as number;

    const dateParsed = pt.parseDate(text);
    if (dateParsed) {
      result.predictedDate = dateParsed.toISOString();
    } else {
      result.predictedDate = new Date().toISOString();
    }
    return result;
  }

  async parse(text: string, owner?: string) {
    const parsed = await this.extractEntities(text, owner);
    const feedback = await this._repository.save({
      ...parsed,
      owner: owner?.trim(),
    });
    return feedback;
  }

  async findAll(owner: string, queries: SearchFeedbackDto) {
    const { page, limit, ...filters } = queries;

    if (filters.lastUpdated) {
      filters['updatedAt'] = MoreThan(new Date(filters.lastUpdated));
    }

    return this._paginateService.paginate(
      this._repository,
      {
        limit: queries.limit ?? 10,
        page: queries.page ?? 1,
      },
      {
        where: { ...filters, owner } as FindOptionsWhere<FeedbackEntity>,
        order: {
          createdAt: 'DESC',
        },
      } as unknown as FindManyOptions<FeedbackEntity>,
    );
  }

  async getClassifierModels() {
    const classifiers: Record<string, BaseClassifier> = {
      intent: this.intentProcessor,
      account: this.accountProcessor,
      category: this.categoriesProcessor,
      value: this.valueProcessor,
    };

    const entries = await Promise.all(
      Object.entries(classifiers).map(async ([name, classifier]) => {
        return [name, await this.readClassifierModel(classifier)];
      }),
    );

    return Object.fromEntries(entries);
  }

  async createTransactionFromFeedback(id: string, owner: string) {
    const feedback = await this._repository.findOne({
      where: {
        id,
        owner,
      },
    });

    if (!feedback) {
      throw new NotFoundException('Feedback nao encontrado.');
    }

    const intent = feedback.correctedIntent ?? feedback.predictedIntent;
    const value = Number(feedback.correctedValue ?? feedback.predictedValue);
    const date = feedback.correctedDate ?? feedback.predictedDate;

    if (!Number.isFinite(value)) {
      throw new BadRequestException('Valor do feedback invalido.');
    }

    if (intent === Intents.TRANSFER) {
      const accounts = await this.listOwnerAccounts(owner);
      const originAccount = this.findAccountEntity(
        feedback.correctedOriginAccount ?? feedback.predictedOriginAccount,
        accounts,
      );
      const destinyAccount = this.findAccountEntity(
        feedback.correctedDestinyAccount ?? feedback.predictedDestinyAccount,
        accounts,
      );

      if (!originAccount || !destinyAccount) {
        throw new BadRequestException(
          'Contas de origem ou destino nao encontradas para o feedback.',
        );
      }

      await this._transactionsService.createTransfer({
        description: feedback.originalText,
        origin: originAccount.id,
        destiny: destinyAccount.id,
        value,
        date,
        owner,
      });

      return {
        type: Intents.TRANSFER,
        feedbackId: feedback.id,
      };
    }

    const [accounts, categories] = await Promise.all([
      this.listOwnerAccounts(owner),
      this.listOwnerCategories(owner),
    ]);
    const account = this.findAccountEntity(
      feedback.correctedAccount ?? feedback.predictedAccount,
      accounts,
    );
    const category = this.findCategoryEntity(
      feedback.correctedCategory ?? feedback.predictedCategory,
      categories,
    );

    if (!account || !category) {
      throw new BadRequestException(
        'Conta ou categoria nao encontrada para o feedback.',
      );
    }

    return this._transactionsService.store({
      description: feedback.originalText,
      account: account.id,
      category: category.id,
      value,
      date,
      owner,
    });
  }

  async evaluateFeedbackAutoReview(
    feedback: FeedbackEntity,
    owner: string,
    context: Partial<AutoReviewContext> = {
      valueApprovalLimit: 5000,
    },
  ): Promise<AutoReviewResult> {
    const [ownerAccounts, ownerCategories, accountAliases, categoryAliases] =
      await Promise.all([
        this.listOwnerAccounts(owner),
        this.listOwnerCategories(owner),
        this._effectiveAliasService.resolveAliasRules(owner, 'account'),
        this._effectiveAliasService.resolveAliasRules(owner, 'category'),
      ]);

    return this._feedbackAutoReviewService.evaluate(feedback, {
      ...context,
      mode: AutoReviewMode.assistive,
      ownerAccounts: this.toEntityReferences(ownerAccounts),
      ownerCategories: this.toEntityReferences(ownerCategories),
      accountAliases,
      categoryAliases,
    });
  }

  async applyAutoReviewCorrection(
    feedback: FeedbackEntity,
    evaluation: AutoReviewResult,
  ): Promise<FeedbackEntity> {
    if (evaluation.decision !== AutoReviewDecision.correct) {
      throw new BadRequestException(
        'Somente decisao correct pode ser autocorrigida.',
      );
    }

    if (evaluation.mode !== AutoReviewMode.automatic) {
      throw new BadRequestException(
        'Somente avaliacao automatica pode ser autocorrigida.',
      );
    }

    if (feedback.status !== FeedbackStatus.pending) {
      return feedback;
    }

    if (this.hasHumanCorrection(feedback)) {
      await this.persistBlockedAutoReview(feedback, evaluation);
      throw new BadRequestException(
        'Feedback com correcao humana nao pode ser autocorrigido.',
      );
    }

    if (!evaluation.suggestedCorrections) {
      throw new BadRequestException(
        'Avaliacao sem correcao sugerida nao pode ser autocorrigida.',
      );
    }

    const existingHistory = await this._feedbackAutoReviewRepository.findOne({
      where: {
        feedbackId: feedback.id,
        mode: evaluation.mode,
        reviewVersion: evaluation.reviewVersion,
      },
    });

    if (existingHistory?.applied) {
      return feedback;
    }

    const corrected = this._repository.create({
      ...feedback,
      ...this.toCorrectedFeedbackFields(evaluation.suggestedCorrections),
      status: FeedbackStatus.corrected,
    });
    const savedFeedback = await this._repository.save(corrected);

    const historyPayload = {
      feedbackId: feedback.id,
      owner: feedback.owner,
      mode: evaluation.mode,
      decision: evaluation.decision,
      score: evaluation.score,
      fieldScores: evaluation.fieldScores,
      reasons: evaluation.reasons,
      suggestedCorrections: evaluation.suggestedCorrections,
      reviewVersion: evaluation.reviewVersion,
      evaluatedAt: evaluation.evaluatedAt,
      applied: true,
      appliedAt: new Date().toISOString(),
    };
    const history = existingHistory
      ? this._feedbackAutoReviewRepository.merge(
          existingHistory,
          historyPayload,
        )
      : this._feedbackAutoReviewRepository.create(historyPayload);

    await this._feedbackAutoReviewRepository.save(history);

    return savedFeedback;
  }

  /**
   * Persiste tentativa de apply bloqueada (applied=false) sem alterar o feedback.
   */
  async persistBlockedAutoReview(
    feedback: FeedbackEntity,
    evaluation: AutoReviewResult,
  ): Promise<FeedbackAutoReviewEntity> {
    const blockReason = {
      ...AUTO_REVIEW_REASON_CATALOG[
        AutoReviewReasonCode.humanCorrectionPresent
      ],
    };
    const existingHistory = await this._feedbackAutoReviewRepository.findOne({
      where: {
        feedbackId: feedback.id,
        mode: evaluation.mode,
        reviewVersion: evaluation.reviewVersion,
      },
    });

    if (existingHistory?.applied) {
      return existingHistory;
    }

    const reasons = this.mergeBlockReasons(
      existingHistory?.reasons ?? evaluation.reasons ?? [],
      blockReason,
    );

    const historyPayload = {
      feedbackId: feedback.id,
      owner: feedback.owner,
      mode: evaluation.mode,
      decision: evaluation.decision,
      score: evaluation.score,
      fieldScores: evaluation.fieldScores,
      reasons,
      suggestedCorrections: evaluation.suggestedCorrections ?? null,
      reviewVersion: evaluation.reviewVersion,
      evaluatedAt: evaluation.evaluatedAt,
      applied: false,
      appliedAt: null,
    };

    const history = existingHistory
      ? this._feedbackAutoReviewRepository.merge(
          existingHistory,
          historyPayload,
        )
      : this._feedbackAutoReviewRepository.create(historyPayload);

    return this._feedbackAutoReviewRepository.save(history);
  }

  async Review(payload: Partial<FeedbackEntity>) {
    const existing = await this._repository.findOne({
      where: { id: payload.id },
    });

    if (!existing) {
      throw new NotFoundException('Feedback nao encontrado para aprovacao.');
    }

    if (!Object.values(FeedbackStatus).includes(payload.status)) {
      throw new BadRequestException('Status invÃ¡lido');
    }

    if (
      !(
        !!payload.correctedAccount ||
        !!payload.correctedCategory ||
        !!payload.correctedDate ||
        !!payload.correctedDestinyAccount ||
        !!payload.correctedDestinyAccount ||
        !!payload.correctedIntent ||
        !!payload.correctedOriginAccount ||
        !!payload.correctedValue
      ) &&
      payload.status === FeedbackStatus.corrected
    ) {
      throw new BadRequestException('Campos para correÃ§Ã£o nÃ£o enviados');
    }

    const feedback = this._repository.create({
      ...existing,
      ...payload,
    });

    return await this._repository.save(feedback);
  }

  async trainClassifiers(fullTraining: boolean = false, owner: string) {
    const filter: FindOptionsWhere<FeedbackEntity> = {
      owner,
      status: Not(FeedbackStatus.pending),
    };
    if (!fullTraining) {
      filter.usedForTraining = false;
    }

    const feeds = await this._repository.find({
      where: filter,
    });

    if (!feeds.length) return;

    const intents: TrainingSample[] = [];
    const categories: TrainingSample[] = [];
    const accounts: TrainingSample[] = [];
    const origin: TrainingSample[] = [];
    const destiny: TrainingSample[] = [];
    const values: TrainingSample[] = [];

    for (const feed of feeds) {
      const intentSample = this.mapFieldSample(
        feed,
        'predictedIntent',
        'correctedIntent',
      );
      if (!intentSample) continue;

      intents.push(intentSample);

      if (intentSample.label === Intents.CREATE) {
        const accountSample = await this.mapFieldSample(
          feed,
          'predictedAccount',
          'correctedAccount',
        );
        if (accountSample) accounts.push(accountSample);

        const categorySample = await this.mapFieldSample(
          feed,
          'predictedCategory',
          'correctedCategory',
        );
        if (categorySample) categories.push(categorySample);
      }

      if (intentSample.label === Intents.TRANSFER) {
        const originSample = await this.mapFieldSample(
          feed,
          'predictedOriginAccount',
          'correctedOriginAccount',
        );
        if (originSample) origin.push(originSample);

        const destinySample = await this.mapFieldSample(
          feed,
          'predictedDestinyAccount',
          'correctedDestinyAccount',
        );
        if (destinySample) destiny.push(destinySample);
      }

      const valueSample = await this.mapFieldSample(
        feed,
        'predictedValue',
        'correctedValue',
      );
      if (valueSample) values.push(valueSample);

      if (!fullTraining) {
        feed.usedForTraining = true;
        feed.updatedAt = new Date().toISOString();
      }
    }

    const accountSamples = [...accounts, ...origin, ...destiny];

    if (intents.length) await this.intentProcessor.train(intents);
    if (accountSamples.length)
      await this.accountProcessor.train(accountSamples);
    if (categories.length) await this.categoriesProcessor.train(categories);
    if (values.length) await this.valueProcessor.train(values);

    if (!fullTraining) {
      await this._repository.save(feeds);
    }
  }

  private mapFieldSample(
    feedback: FeedbackEntity,
    field: keyof FeedbackEntity,
    correctedField: keyof FeedbackEntity,
  ): TrainingSample | null {
    const value = feedback[correctedField] ?? feedback[field];

    if (!value) return null;

    return {
      text: feedback.originalText,
      label: value.toString(),
    };
  }

  private async readClassifierModel(classifier: BaseClassifier) {
    const modelPath = classifier.getModelPath();

    if (!fs.existsSync(modelPath)) {
      return {
        exists: false,
        file: path.basename(modelPath),
        updatedAt: null,
        size: 0,
        model: null,
      };
    }

    const [stats, content] = await Promise.all([
      fs.promises.stat(modelPath),
      fs.promises.readFile(modelPath, 'utf8'),
    ]);

    return {
      exists: true,
      file: path.basename(modelPath),
      updatedAt: stats.mtime.toISOString(),
      size: stats.size,
      model: JSON.parse(content),
    };
  }

  private toEntityReferences<T extends { name: string }>(
    entities: T[],
  ): AutoReviewEntityReference[] {
    return entities.map(({ name }) => ({ name }));
  }

  private hasHumanCorrection(feedback: FeedbackEntity): boolean {
    return [
      feedback.correctedIntent,
      feedback.correctedAccount,
      feedback.correctedCategory,
      feedback.correctedOriginAccount,
      feedback.correctedDestinyAccount,
      feedback.correctedValue,
      feedback.correctedDate,
    ].some(value => value !== undefined && value !== null && value !== '');
  }

  private mergeBlockReasons(
    current: AutoReviewReason[],
    blockReason: AutoReviewReason,
  ): AutoReviewReason[] {
    if (current.some(reason => reason.code === blockReason.code)) {
      return current;
    }

    return [...current, blockReason];
  }

  private toCorrectedFeedbackFields(
    suggestedCorrections: AutoReviewResult['suggestedCorrections'],
  ): Partial<FeedbackEntity> {
    return {
      correctedIntent: suggestedCorrections?.intent,
      correctedAccount: suggestedCorrections?.account,
      correctedCategory: suggestedCorrections?.category,
      correctedOriginAccount: suggestedCorrections?.originAccount,
      correctedDestinyAccount: suggestedCorrections?.destinyAccount,
      correctedValue: suggestedCorrections?.value,
      correctedDate: suggestedCorrections?.date,
    };
  }
}
