export interface AliasRule {
  patterns: string[];
  target: string;
}

export interface AliasMatch {
  target: string;
  pattern: string;
}

export const ACCOUNT_ALIASES: AliasRule[] = [
  {
    patterns: ['nubank yah credito', 'credito yah'],
    target: 'Crédito yah',
  },
  {
    patterns: ['nubank digo credito', 'credito digo'],
    target: 'Crédito digo',
  },
];

export const CATEGORY_ALIASES: AliasRule[] = [
  {
    patterns: ['youtube premium', 'yt premium', 'prime video', 'hbo'],
    target: 'Serviços de streaming',
  },
  { patterns: ['internet'], target: 'Serviço de Internet' },
  { patterns: ['farmacia'], target: 'Farmácia' },
  { patterns: ['bilhete unico', 'recarga bu'], target: 'Bilhete único' },
  {
    patterns: ['tarifa do banco', 'taxa bancaria'],
    target: 'Taxa de serviço',
  },
  { patterns: ['aluguel'], target: 'Aluguel' },
  { patterns: [' luz'], target: 'Luz' },
  { patterns: ['agua'], target: 'Água e esgoto' },
  { patterns: ['almoco'], target: 'Almoço' },
  { patterns: ['smartbreak'], target: 'Smartbreak' },
  {
    patterns: ['mercadinho', 'padaria'],
    target: 'mercearia e açougue (dia-a-dia)',
  },
  {
    patterns: ['troca da bateria', 'bateria dos relogios'],
    target: 'Variado',
  },
  {
    patterns: ['parcela emprestimo', 'parcela de emprestimo'],
    target: 'Parcela de Empréstimo',
  },
];

export function normalizeAliasText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s*.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function resolveAliasMatch<T extends { name: string }>(
  text: string,
  candidates: T[],
  aliases: AliasRule[],
): AliasMatch | undefined {
  const normalizedText = normalizeAliasText(text);

  for (const alias of aliases) {
    if (!alias.patterns.some(pattern => normalizedText.includes(pattern))) {
      continue;
    }

    const normalizedTarget = normalizeAliasText(alias.target);
    const match = candidates.find(
      candidate => normalizeAliasText(candidate.name) === normalizedTarget,
    );

    if (match) {
      return {
        target: match.name,
        pattern: alias.patterns[0],
      };
    }
  }

  return undefined;
}
