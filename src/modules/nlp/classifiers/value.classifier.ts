import { BaseClassifier } from '@/common/classifiers/base.classifier';

type ValueCandidate = {
  raw: string;
  normalized: string;
  index: number;
  numeric: number;
};

export class ValueClassifier extends BaseClassifier {
  constructor() {
    super('value.model');
  }

  extract(text: string): number | null {
    if (!text) return null;

    const sanitized = this.maskNoise(text);
    const candidates = this.collectCandidates(sanitized);
    if (candidates.length === 0) return null;

    const valueAfterVerb = this.extractFromFinancialVerb(sanitized);
    if (valueAfterVerb !== null) return valueAfterVerb;

    const ranked = [...candidates].sort((a, b) => {
      const scoreA = this.scoreCandidate(a, sanitized);
      const scoreB = this.scoreCandidate(b, sanitized);

      if (scoreA !== scoreB) return scoreB - scoreA;
      if (a.numeric !== b.numeric) return b.numeric - a.numeric;
      return b.index - a.index;
    });

    return ranked[0]?.numeric ?? null;
  }

  private normalize(n: string): string {
    const hasComma = n.includes(',');
    const hasDot = n.includes('.');

    if (hasComma && hasDot) {
      return n.replace(/\./g, '').replace(',', '.');
    }

    if (hasComma && !hasDot) {
      return n.replace(',', '.');
    }

    if (!hasComma && hasDot) {
      const first = n.indexOf('.');
      const last = n.lastIndexOf('.');

      if (first === last) return n;

      return n.replace(/\./g, '');
    }

    return n;
  }

  private maskNoise(text: string): string {
    return text
      .replace(/\b\d{1,2}[/-](?:\d{1,2}|[a-z]{3,9})(?:[/-]\d{2,4})?\b/gi, ' ')
      .replace(/\bparcela\s+\d+\s*\/\s*\d+\b/gi, ' ')
      .replace(/\*{2}\s*\d+(?:[.,]\d+)?/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private collectCandidates(text: string): ValueCandidate[] {
    const regex = /\b(?:\d{1,3}(?:[.,]\d{3})+|\d+)(?:[.,]\d+)?\b/g;
    const matches = text.matchAll(regex);
    const candidates: ValueCandidate[] = [];

    for (const match of matches) {
      const raw = match[0];
      const normalized = this.normalize(raw);
      const numeric = parseFloat(normalized);
      if (!Number.isFinite(numeric)) continue;

      candidates.push({
        raw,
        normalized,
        numeric,
        index: match.index ?? -1,
      });
    }

    return candidates;
  }

  private extractFromFinancialVerb(text: string): number | null {
    const match = text.match(
      /\b(recebi|ganhei|paguei|gastei|transferi|enviei|depositei|coloquei|usei)\s+(?:r\$\s*)?((?:\d{1,3}(?:[.,]\d{3})+|\d+)(?:[.,]\d+)?)\b/i,
    );
    if (!match) return null;

    const n = parseFloat(this.normalize(match[2]));
    return Number.isFinite(n) ? n : null;
  }

  private scoreCandidate(candidate: ValueCandidate, text: string): number {
    const lower = text.toLowerCase();
    const start = Math.max(0, candidate.index - 20);
    const end = Math.min(
      lower.length,
      candidate.index + candidate.raw.length + 20,
    );
    const window = lower.slice(start, end);
    const after = lower.slice(
      candidate.index + candidate.raw.length,
      candidate.index + candidate.raw.length + 16,
    );
    let score = 0;

    if (candidate.raw.includes('.') || candidate.raw.includes(',')) score += 3;
    if (/(r\$|rs|reais)/.test(window)) score += 3;
    if (/^\s*(reais|rs)\b/.test(after)) score += 2;
    if (candidate.numeric >= 1000) score += 2;
    if (candidate.numeric > 31) score += 1;

    if (
      candidate.numeric <= 31 &&
      !candidate.raw.includes('.') &&
      !candidate.raw.includes(',')
    ) {
      score -= 3;
    }

    return score;
  }

  async classify(text: string): Promise<number | null> {
    const extracted = this.extract(text);
    if (extracted !== null) {
      return extracted;
    }

    const label = await super.classify(text);

    if (!label) return null;
    const parsed = parseFloat(label.toString().replace(',', '.'));
    if (isNaN(parsed)) return null;

    return parsed;
  }
}
