import { AccountsEntity } from '@/modules/accounts/entities/accounts.entity';
import { CategoriesEntity } from '@/modules/categories/entities/categories.entity';
import { AccountsClassifier } from '@/modules/nlp/classifiers/account.classifier';
import { CategoryClassifier } from '@/modules/nlp/classifiers/category.classifier';
import { IntentClassifier } from '@/modules/nlp/classifiers/intent.classifier';
import { ValueClassifier } from '@/modules/nlp/classifiers/value.classifier';
import { intentSamples } from '@/modules/nlp/classifiers/samples/intent.samples';
import { valueSamples } from '@/modules/nlp/classifiers/samples/value.samples';
import { NlpService } from '@/modules/nlp/services/nlp.service';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Repository } from 'typeorm';

/**
 * **Uncategorized**
 * List all transactions that received the inbound categories and are pending categorization
 */
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

  @Cron('0/30 * * * * *', { waitForCompletion: true })
  // @Cron('0 0 0 * * *', { waitForCompletion: true })
  async train() {
    this._logger.verbose('Starting training service');

    const intentClassifier = new IntentClassifier();
    const accountsClassifier = new AccountsClassifier();
    const categoriesClassifier = new CategoryClassifier();
    const valuesClassifier = new ValueClassifier();

    await intentClassifier.train(intentSamples);
    await valuesClassifier.train(valueSamples);

    const accounts = await this._accountRepository.find();
    await accountsClassifier.train(
      accounts.map(i => ({ text: i.name, label: i.name })),
    );
    const categories = await this._categoryRepository.find();
    await categoriesClassifier.train(
      categories.map(i => ({ text: i.name, label: i.name })),
    );

    //   const categories = await this._nlpService.loadCategoryDictionaries();
    //   await categoriesClassifier.train(
    //     categories.map(i => ({ text: i.name, label: i.name })),
    //   );

    await this._nlpService.trainClassifiers(
      true,
      '1c48d2bf-2d52-4764-98df-d81be158b01b',
    );

    const tests = [
      // 'Paguei 1251 de aluguel no santander',
      // 'Transferi 50 do santander pro mercado pago',
      'Caiu o pagamento de 3500 hoje no nubank digo',
      '43.40 do booster de Magic na Nubank yah crédito dia 09/10',
      'Recebi 4470 de salario liquido no dia 01/10/25 no santander',
      // 'Na conta Mercado Pago, dia 29/11, 53.9 do yt premium',
      // 'Na conta Mercado Pago, dia 17/11, 552.74 do empréstimo',
      // 'Na conta nubank digo, dia 15/11, 180 da parcela 2/10 do pc',
      // 'Na conta Nubank Digo, dia 15/11, transferi 606.64 para o Mercado Pago',
      // 'Na conta santander, dia 13/10, transferi 30 para o nubank yah',
      // 'Na conta Mercado Pago, dia 03/11, 8 na Martins Fontes',
      // 'Na conta Mercado Pago, dia 31/10, 30 com carona para o raizes',
      // 'Na conta Mercado Pago, dia 09/11, 186.8 com lanches',
      // 'Na conta Mercado Pago, dia 03/11, 12 com Energético',
      // 'Na conta Mercado Pago, dia 31/10, 93 com o pé de aroeira',
      // 'Na conta Mercado Pago, dia 31/10, 30 com carona para o raízes',
      // 'Na conta Mercado Pago, dia 03/11, 8 na Martins Fontes',
      // 'Na conta Mercado Pago, dia 30/10, 20.93 no mercadinho',
      // 'Na conta Mercado Pago, dia 28/10, 47.53 no mercado',
      // 'Na conta Mercado Pago, dia 29/10, 53.9 do yt premium',
      // 'Na conta Mercado Pago, dia 13/10, 30 de recarga do Bilhete único',
      // 'Na conta Mercado Pago, dia 12/10, 41.71 no mercado',
      // 'Na conta Mercado Pago, dia 16/10, 155.92 de parcela empréstimo',
      // 'Na conta Mercado Pago, dia 29/09, 53.9 do yt premium',
      // 'Na conta Mercado Pago, dia 09/10, 229.9 na martins fontes',
      // 'Na conta Nubank digo, dia 14/11, 54.01 no mercadinnho',
      // 'Na conta Nubank digo, dia 14/11, 55.98 de uber para yah ir trabalhar',
      // 'Na conta Mercado Pago, dia 29/08, 53.9 do youtube premium',
      // 'Na conta Mercado Pago, dia 12/11, transferi 18 para o Nubank Digo',
      // 'Na conta Nubank digo, dia 12/11, 38.45 na padaria',
      // 'Na conta Nubank nick, dia 12/11, transferi 47 para o Nubank Digo',
      // 'Na conta Nubank digo, dia 13/11, 12.96 na padaria',
      // 'Na conta Crédito digo, dia 11/11, 191.54 do assaí',
      // 'Na conta Nubank digo, dia 13/11, 26.9 de almoço',
      // 'Na conta Nubank digo, dia 09/11, 60 de troca da bateria dos relógios',
      // 'Na conta Mercado Pago, dia 09/11, transferi 60 para o Nubank Digo',
      // 'Na conta santander, dia 14/11, transferi 2900 para o Nubank Digo',
      // 'Na conta santander, dia 14/11, 120.39 de  Mercado',
      // 'Na conta santander, dia 14/11, 3697 de  Salário',
      // 'Na conta santander, dia 14/11, 14.99 de  Farmácia',
      // 'Na conta santander, dia 10/11, 30 de recarga bilhete único',
      // 'Na conta santander, dia 11/11, transferi 70 para o Nubank nick',
      // 'Na conta nubank digo, dia 15/11, 180 da parcela 2/10 do pc',
      // 'Na conta Mercado Pago, dia 29/11, 53.9 do yt premium',
      // 'Na conta Mercado Pago, dia 17/11, 552.74 do empréstimo',
      // 'Na conta Nubank Digo, dia 15/11, transferi 50 para o c6',
      // 'Na conta santander, dia 23/11, 355 do empréstimo',
      // 'Na conta Nubank Digo, dia 15/11, transferi 606.64 para o Mercado Pago',
      // 'Na conta Nubank digo, dia 15/11, 415.95 do empréstimo',
      // 'Na conta Mercado Pago, dia 17/11, 552.74 do empréstimo',
      // 'Na conta nubank digo, dia 15/11, 180 da parcela 2/10 do pc',
      // 'Na conta Mercado Pago, dia 29/11, 53.9 do yt premium',
      // 'Na conta Nubank Digo, dia 15/11, transferi 50 para o c6',
      // 'Na conta Nubank digo, dia 15/11, 415.95 do empréstimo',
      // 'Na conta santander, dia 23/11, 355 do empréstimo',
      // 'Na conta Nubank Digo, dia 15/11, transferi 606.64 para o Mercado Pago',
      // 'Na conta Mercado Pago, dia 09/11, 186.8 com lanches',
      // 'Na conta Mercado Pago, dia 03/11, 12 com Energético',
      // 'Na conta Mercado Pago, dia 03/11, 8 na Martins Fontes',
      // 'Na conta Mercado Pago, dia 31/10, 30 com carona para o raízes',
      // 'Na conta Mercado Pago, dia 31/10, 93 com o pé de aroeira',
      // 'Na conta Mercado Pago, dia 29/10, 53.9 do yt premium',
      // 'Na conta Mercado Pago, dia 28/10, 47.53 no mercado',
      // 'Na conta Mercado Pago, dia 30/10, 20.93 no mercadinho',
      // 'Na conta Mercado Pago, dia 12/10, 41.71 no mercado',
      // 'Na conta Mercado Pago, dia 16/10, 155.92 de parcela empréstimo',
      // 'Na conta Mercado Pago, dia 09/10, 229.9 na martins fontes',
      // 'Na conta Mercado Pago, dia 13/10, 30 de recarga do Bilhete único',
      // 'Na conta Mercado Pago, dia 29/08, 53.9 do youtube premium',
      // 'Na conta Mercado Pago, dia 29/09, 53.9 do yt premium',
      // 'Na conta Nubank digo, dia 14/11, 54.01 no mercadinnho',
      // 'Na conta Nubank digo, dia 14/11, 55.98 de uber para yah ir trabalhar',
      // 'Na conta Nubank digo, dia 13/11, 12.96 na padaria',
      // 'Na conta Nubank digo, dia 13/11, 26.9 de almoço',
      // 'Na conta Nubank nick, dia 12/11, transferi 47 para o Nubank Digo',
      // 'Na conta Nubank digo, dia 12/11, 38.45 na padaria',
      // 'Na conta Nubank digo, dia 09/11, 60 de troca da bateria dos relógios',
      // 'Na conta Crédito digo, dia 11/11, 191.54 do assaí',
      // 'Na conta Mercado Pago, dia 12/11, transferi 18 para o Nubank Digo',
      // 'Na conta Mercado Pago, dia 09/11, transferi 60 para o Nubank Digo',
      // 'Na conta santander, dia 14/11, transferi 2900 para o Nubank Digo',
      // 'Na conta santander, dia 14/11, 120.39 de  Mercado',
      // 'Na conta santander, dia 14/11, 3697 de  Salário',
      // 'Na conta santander, dia 14/11, 14.99 de  Farmácia',
      // 'Na conta santander, dia 11/11, transferi 70 para o Nubank nick',
      // 'Na conta santander, dia 10/11, 30 de recarga bilhete único',
      // 'Na conta santander, dia 08/11, transferi 212.8 para o mercado',
      // 'Na conta santander, dia 07/11, 40 de tarifa do banco (taxa bancaria)',
      // 'Na conta nubank yah, dia 06/11, 263.68 de Luz',
      // 'Na conta santander, dia 08/11, 115.9 de Mercado',
      // 'Na conta nubank yah, dia 06/11, 140.84 de agua',
      // 'Na conta nubank yah, dia 05/11, 4183.36 de cartao de credito',
      // 'Na conta nubank yah, dia 06/11, 330 da formatura da colly',
      // 'Na conta Nubank yah, dia 08/11, transferi 180 para o nubank digo',
      // 'Na conta santander, dia 08/11, 115.9 de Mercado',
      // '13.69 de lanche no Smartbreak no Nubank digo 4/11',
      // '17.88 de café no Smartbreak no Nubank digo 4/11',
      // '44.9 do livro de ervas no Nubank digo 3/nov',
      // '13.69 de lanche no Smartbreak no Nubank digo 4/11',
      // '17.88 de café no Smartbreak no Nubank digo 4/11',
      // '4.95 de uber no Nubank digo 26/10',
      // '35.56 de almoço no Nubank digo 20/10',
      // '13.69 de lanche no Smartbreak no Nubank digo 4/11',
      // '20, Recarga Bilhete Único, no santander 27/10',
      // '38.35, Mercadinho, no santander 26/10',
      // '354.62 de Parcela de Empréstimo no santander 23/10',
      // '67.00 de presente para a yah no santander 20/10',
    ];

    for (const t of tests) {
      console.log({
        ...(await this._nlpService.extractEntities(t)),
      });
    }
  }

  @Cron('0 0 * * * *', { waitForCompletion: true })
  // @Cron('0 * * * * *', { waitForCompletion: true })
  async retrain() {
    this._logger.verbose('Starting retraining service');
    await this._nlpService.trainClassifiers(
      true,
      '1c48d2bf-2d52-4764-98df-d81be158b01b',
    );
  }
}
