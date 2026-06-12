import { TrainingSample } from '@/common/classifiers/base.classifier';
import { PaginationService } from '@/core/paginate/paginate.service';
import { AccountsClassifier } from '@/modules/nlp/classifiers/account.classifier';
import { CategoryClassifier } from '@/modules/nlp/classifiers/category.classifier';
import {
  IntentClassifier,
  Intents,
} from '@/modules/nlp/classifiers/intent.classifier';
import { ValueClassifier } from '@/modules/nlp/classifiers/value.classifier';
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
import { SearchFeedbackDto } from '../dtos/search.dto';
import { FeedbackEntity } from '../entities/feedback.entity';
import { FeedbackStatus } from '../interfaces';

@Injectable()
export class NlpService {
  private intentProcessor: IntentClassifier;
  private accountProcessor: AccountsClassifier;
  private categoriesProcessor: CategoryClassifier;
  private valueProcessor: ValueClassifier;

  constructor(
    @Inject('FEEDBACK_REPOSITORY')
    private readonly _repository: Repository<FeedbackEntity>,

    private readonly _paginateService: PaginationService,
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
    return value
      .trim()
      .replace(/^(o|a|os|as)\s+/i, '')
      .replace(/\s+/g, ' ');
  }

  private extractTransferOrigin(cleaned: string): string | undefined {
    const paired = cleaned.match(
      /\b(?:do|de|na conta)\s+(.+?)\s+(?:para|pra|pro)\s+/i,
    );
    if (paired?.[1]) return this.cleanAccountChunk(paired[1]);

    const byDoDe = cleaned.match(/\b(?:do|de)\s+(.+?)(?:,|$)/i);
    if (byDoDe?.[1]) return this.cleanAccountChunk(byDoDe[1]);

    const byConta = cleaned.match(/\bna conta\s+(.+?)(?:,|$)/i);
    if (byConta?.[1]) return this.cleanAccountChunk(byConta[1]);

    return undefined;
  }

  private extractTransferDestiny(cleaned: string): string | undefined {
    const match = cleaned.match(
      /\b(?:para|pra|pro)\s+(.+?)(?:(?:\s+dia\b)|(?:\s+\d{1,2}[/-]\d{1,2})|,|$)/i,
    );
    if (!match?.[1]) return undefined;
    return this.cleanAccountChunk(match[1]);
  }

  async extractEntities(text: string) {
    const result = {
      originalText: text,
    } as FeedbackEntity;
    const cleaned = text.toLowerCase();

    result.predictedIntent = await this.intentProcessor.classify(cleaned);

    if (result.predictedIntent === Intents.TRANSFER) {
      const originText = this.extractTransferOrigin(cleaned);
      const destText = this.extractTransferDestiny(cleaned);

      if (originText) {
        result.predictedOriginAccount = (await this.accountProcessor.classify(
          originText,
        )) as string;
      }

      if (destText) {
        result.predictedDestinyAccount = (await this.accountProcessor.classify(
          destText,
        )) as string;
      }

      if (!result.predictedOriginAccount) {
        result.predictedOriginAccount = (await this.accountProcessor.classify(
          text,
        )) as string;
      }

      if (!result.predictedDestinyAccount && originText) {
        result.predictedDestinyAccount = (await this.accountProcessor.classify(
          text.replace(originText, ''),
        )) as string;
      }
    } else {
      result.predictedAccount = (await this.accountProcessor.classify(
        text,
      )) as string;

      result.predictedCategory = (await this.categoriesProcessor.classify(
        text,
      )) as string;
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
    const parsed = await this.extractEntities(text);
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
  async Review(payload: Partial<FeedbackEntity>) {
    const existing = await this._repository.findOne({
      where: { id: payload.id },
    });

    if (!existing) {
      throw new NotFoundException('Feedback nao encontrado para aprovacao.');
    }

    if (!Object.values(FeedbackStatus).includes(payload.status)) {
      throw new BadRequestException('Status inválido');
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
      throw new BadRequestException('Campos para correção não enviados');
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
}
