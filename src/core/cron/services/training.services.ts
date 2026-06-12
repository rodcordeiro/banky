import {
  BaseClassifier,
  ModelBackup,
} from '@/common/classifiers/base.classifier';
import { AccountsEntity } from '@/modules/accounts/entities/accounts.entity';
import { CategoriesEntity } from '@/modules/categories/entities/categories.entity';
import { AccountsClassifier } from '@/modules/nlp/classifiers/account.classifier';
import { CategoryClassifier } from '@/modules/nlp/classifiers/category.classifier';
import { IntentClassifier } from '@/modules/nlp/classifiers/intent.classifier';
import { intentSamples } from '@/modules/nlp/classifiers/samples/intent.samples';
import { valueSamples } from '@/modules/nlp/classifiers/samples/value.samples';
import { ValueClassifier } from '@/modules/nlp/classifiers/value.classifier';
import { NlpService } from '@/modules/nlp/services/nlp.service';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Repository } from 'typeorm';

type EvaluationField =
  | 'predictedIntent'
  | 'predictedAccount'
  | 'predictedOriginAccount'
  | 'predictedDestinyAccount'
  | 'predictedCategory'
  | 'predictedValue';

interface EvaluationCase {
  text: string;
  expected: Partial<Record<EvaluationField, string | number>>;
}

interface EvaluationResult {
  passed: number;
  total: number;
  score: number;
  failures: string[];
}

const DEFAULT_OWNER = '1c48d2bf-2d52-4764-98df-d81be158b01b';

const EVALUATION_CASES: EvaluationCase[] = [
  {
    text: 'Caiu o pagamento de 3500 hoje no nubank digo',
    expected: {
      predictedIntent: 'create',
      predictedAccount: 'nubank digo',
      predictedCategory: 'Salário',
      predictedValue: 3500,
    },
  },
  {
    text: '43.40 do booster de Magic na Nubank yah crédito dia 09/10',
    expected: {
      predictedIntent: 'create',
      predictedAccount: 'Nubank yah',
      predictedCategory: 'Magic',
      predictedValue: 43.4,
    },
  },
  {
    text: 'Na conta santander, dia 13/10, transferi 30 para o nubank yah',
    expected: {
      predictedIntent: 'transfer',
      predictedOriginAccount: 'santander',
      predictedDestinyAccount: 'nubank yah',
      predictedValue: 30,
    },
  },
  {
    text: 'Na conta santander, dia 14/11, transferi 2900 para o Nubank Digo',
    expected: {
      predictedIntent: 'transfer',
      predictedOriginAccount: 'santander',
      predictedDestinyAccount: 'nubank digo',
      predictedValue: 2900,
    },
  },
];

@Injectable()
export class TrainingService {
  private readonly _logger = new Logger(TrainingService.name);

  constructor(
    @Inject('ACCOUNTS_REPOSITORY')
    private readonly _accountRepository: Repository<AccountsEntity>,
    @Inject('CATEGORIES_REPOSITORY')
    private readonly _categoryRepository: Repository<CategoriesEntity>,
    private readonly _nlpService: NlpService,
  ) {
    this._logger.log('TrainingService Initialized');
  }

  @Cron('0 * * * * *', { waitForCompletion: true })
  async train() {
    this._logger.verbose('Starting training service');

    const classifiers = this.createModelClassifiers();
    const backups = await this.backupModels(classifiers);
    const before = await this.evaluateModels();

    try {
      await this.trainCandidate(classifiers);
      this._nlpService.resetClassifiers();

      await this._nlpService.trainClassifiers(true, DEFAULT_OWNER);
      this._nlpService.resetClassifiers();

      const after = await this.evaluateModels();

      this.logEvaluation('before', before);
      this.logEvaluation('after', after);

      if (after.score < before.score) {
        await this.restoreModels(classifiers, backups);
        this._nlpService.resetClassifiers();
        this._logger.error(
          `Training rejected: evaluation score regressed from ${before.score.toFixed(
            4,
          )} to ${after.score.toFixed(4)}.`,
        );
        return;
      }

      if (after.score === before.score) {
        this._logger.warn(
          `Training promoted without measurable gain: score stayed at ${after.score.toFixed(
            4,
          )}.`,
        );
        return;
      }

      this._logger.log(
        `Training promoted: evaluation score improved from ${before.score.toFixed(
          4,
        )} to ${after.score.toFixed(4)}.`,
      );
    } catch (error) {
      await this.restoreModels(classifiers, backups);
      this._nlpService.resetClassifiers();
      throw error;
    }
  }

  private createModelClassifiers(): BaseClassifier[] {
    return [
      new IntentClassifier(),
      new AccountsClassifier(),
      new CategoryClassifier(),
      new ValueClassifier(),
    ];
  }

  private async trainCandidate(classifiers: BaseClassifier[]): Promise<void> {
    const [intentClassifier, accountsClassifier, categoriesClassifier, value] =
      classifiers;

    await intentClassifier.train(intentSamples, { reset: true });
    await value.train(valueSamples, { reset: true });

    const accounts = await this._accountRepository.find();
    await accountsClassifier.train(
      accounts.map(i => ({ text: i.name, label: i.name })),
      { reset: true },
    );

    const categories = await this._categoryRepository.find();
    await categoriesClassifier.train(
      categories.map(i => ({ text: i.name, label: i.name })),
      { reset: true },
    );
  }

  private async backupModels(
    classifiers: BaseClassifier[],
  ): Promise<ModelBackup[]> {
    return Promise.all(classifiers.map(classifier => classifier.backupModel()));
  }

  private async restoreModels(
    classifiers: BaseClassifier[],
    backups: ModelBackup[],
  ): Promise<void> {
    await Promise.all(
      classifiers.map((classifier, index) =>
        classifier.restoreModel(backups[index]),
      ),
    );
  }

  private async evaluateModels(): Promise<EvaluationResult> {
    const failures: string[] = [];
    let passed = 0;
    let total = 0;

    for (const evaluationCase of EVALUATION_CASES) {
      const actual = (await this._nlpService.extractEntities(
        evaluationCase.text,
      )) as unknown as Record<string, unknown>;

      for (const [field, expected] of Object.entries(evaluationCase.expected)) {
        total += 1;
        const actualValue = actual[field];

        if (this.matchesExpected(actualValue, expected)) {
          passed += 1;
          continue;
        }

        failures.push(
          `${evaluationCase.text} | ${field}: expected=${expected}, actual=${actualValue}`,
        );
      }
    }

    return {
      passed,
      total,
      score: total ? passed / total : 0,
      failures,
    };
  }

  private matchesExpected(actual: unknown, expected: unknown): boolean {
    if (typeof expected === 'number') {
      const actualNumber =
        typeof actual === 'number' ? actual : Number.parseFloat(String(actual));
      return (
        Number.isFinite(actualNumber) &&
        Math.abs(actualNumber - expected) < 0.01
      );
    }

    return this.normalizeText(actual) === this.normalizeText(expected);
  }

  private normalizeText(value: unknown): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private logEvaluation(label: string, result: EvaluationResult): void {
    this._logger.log(
      `Evaluation ${label}: ${result.passed}/${result.total} (${(
        result.score * 100
      ).toFixed(2)}%).`,
    );

    for (const failure of result.failures.slice(0, 10)) {
      this._logger.warn(`Evaluation ${label} failure: ${failure}`);
    }
  }
}
