import { BayesClassifier, PorterStemmerPt } from 'natural';
import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface TrainingSample {
  text: string;
  label: string;
}

export interface ModelBackup {
  exists: boolean;
  content?: Buffer;
}

export class BaseClassifier {
  public classifier: BayesClassifier | null = null;
  private readonly logger = new Logger(BaseClassifier.name);
  private model: string;

  constructor(model: string) {
    this.model = model;
  }

  public getModelPath(): string {
    return path.join(
      'src/modules/nlp/classifiers/models',
      `${this.model}.json`,
    );
  }

  async backupModel(): Promise<ModelBackup> {
    const modelPath = this.getModelPath();
    if (!fs.existsSync(modelPath)) return { exists: false };
    return {
      exists: true,
      content: await fs.promises.readFile(modelPath),
    };
  }

  async restoreModel(backup: ModelBackup): Promise<void> {
    const modelPath = this.getModelPath();
    this.classifier = null;

    if (!backup.exists) {
      if (fs.existsSync(modelPath)) {
        await fs.promises.unlink(modelPath);
      }
      return;
    }

    await fs.promises.mkdir(path.dirname(modelPath), { recursive: true });
    await fs.promises.writeFile(modelPath, backup.content!);
  }

  reset(): void {
    this.classifier = null;
  }

  async init(): Promise<BayesClassifier> {
    if (this.classifier) return this.classifier;
    const modelPath = this.getModelPath();
    if (fs.existsSync(modelPath)) {
      return new Promise((resolve, reject) => {
        BayesClassifier.load(modelPath, PorterStemmerPt, (err, classifier) => {
          if (err) return reject(err);
          this.classifier = classifier ?? null;
          resolve(classifier!);
        });
      });
    } else {
      this.classifier = new BayesClassifier(PorterStemmerPt);
      return this.classifier;
    }
  }

  preprocess(text: string): string {
    const normalized = text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s*.]/g, ' ');

    return this.normalizeLexicalVariants(normalized)
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeLexicalVariants(text: string): string {
    return text
      .replace(/\bmercadinnho\b/g, 'mercadinho')
      .replace(/\bmercadinnh[oa]\b/g, 'mercadinho')
      .replace(/\bmercadinhoo\b/g, 'mercadinho')
      .replace(/\btaxa bancaria\b/g, 'taxa de servico')
      .replace(/\bbu\b/g, 'bilhete unico')
      .replace(/\bsmart break\b/g, 'smartbreak')
      .replace(/\bpra\b/g, 'para')
      .replace(/\bpro\b/g, 'para');
  }

  async classify(text: string): Promise<string | number | null> {
    if (!this.classifier) await this.init();
    return this.classifier!.classify(this.preprocess(text));
  }

  async train(
    samples?: TrainingSample[],
    options?: { reset?: boolean },
  ): Promise<void> {
    const classifier = options?.reset
      ? new BayesClassifier(PorterStemmerPt)
      : await this.init();

    this.classifier = classifier;

    for (const sample of samples ?? []) {
      if (!sample.text || !sample.label) continue;
      classifier.addDocument(this.preprocess(sample.text), sample.label);
    }

    classifier.train();
    await this.save();
  }

  async retrain(newSamples: TrainingSample[]): Promise<void> {
    this.logger.verbose(`Retraining model '${this.model}' with feedback.`);
    const classifier = await this.init();

    for (const sample of newSamples) {
      classifier.addDocument(this.preprocess(sample.text), sample.label);
    }

    classifier.train();
    await this.save();
    this.logger.verbose(`Retraining finished for model '${this.model}'.`);
  }

  private save(): Promise<void> {
    const modelPath = this.getModelPath();
    return new Promise((resolve, reject) => {
      this.classifier!.save(modelPath, err => {
        if (err) reject(err);
        this.logger.verbose(`Model '${this.model}' saved.`);
        resolve();
      });
    });
  }
}
