import dateUtils, {
  AddHour,
  addDays,
  compareDates,
  convertDate,
  formatDate,
  isInRange,
} from './date.utils';

const asDate = (value: number | Date): Date => {
  expect(value).toBeInstanceOf(Date);
  return value as Date;
};

describe('date utils', () => {
  it('formats ISO date as pt-BR date', () => {
    expect(formatDate('2026-06-12T15:00:00.000Z')).toBe('12/06/2026');
  });

  it('adds days without mutating the original Date instance', () => {
    const original = new Date('2026-06-12T00:00:00.000Z');
    const result = addDays(original, 5);

    expect(result.toISOString()).toBe('2026-06-17T00:00:00.000Z');
    expect(original.toISOString()).toBe('2026-06-12T00:00:00.000Z');
  });

  it('supports negative day additions', () => {
    expect(addDays('2026-06-12T00:00:00.000Z', -2).toISOString()).toBe(
      '2026-06-10T00:00:00.000Z',
    );
  });

  it('converts supported date inputs to Date instances', () => {
    const date = new Date('2026-06-12T00:00:00.000Z');

    expect(convertDate(date)).toBe(date);
    expect(asDate(convertDate([2026, 5, 12])).toISOString()).toBe(
      new Date(2026, 5, 12).toISOString(),
    );
    expect(asDate(convertDate(Date.UTC(2026, 5, 12))).toISOString()).toBe(
      '2026-06-12T00:00:00.000Z',
    );
    expect(asDate(convertDate('2026-06-12T00:00:00.000Z')).toISOString()).toBe(
      '2026-06-12T00:00:00.000Z',
    );
    expect(
      asDate(convertDate({ year: 2026, month: 5, date: 12 })).toISOString(),
    ).toBe(new Date(2026, 5, 12).toISOString());
  });

  it('returns NaN when date input type is unsupported', () => {
    expect(Number.isNaN(convertDate(true))).toBe(true);
  });

  it('compares dates returning -1, 0, 1 or NaN', () => {
    expect(compareDates('2026-06-11', '2026-06-12')).toBe(-1);
    expect(compareDates('2026-06-12', '2026-06-12')).toBe(0);
    expect(compareDates('2026-06-13', '2026-06-12')).toBe(1);
    expect(Number.isNaN(compareDates('invalid-date', '2026-06-12'))).toBe(true);
  });

  it('checks if dates are inside inclusive ranges', () => {
    expect(isInRange('2026-06-12', '2026-06-01', '2026-06-30')).toBe(true);
    expect(isInRange('2026-06-01', '2026-06-01', '2026-06-30')).toBe(true);
    expect(isInRange('2026-07-01', '2026-06-01', '2026-06-30')).toBe(false);
    expect(
      Number.isNaN(isInRange('invalid-date', '2026-06-01', '2026-06-30')),
    ).toBe(true);
  });

  it('adds hours mutating the provided Date and returning timestamp', () => {
    const date = new Date('2026-06-12T10:00:00.000Z');
    const timestamp = AddHour(date, 2);

    expect(timestamp).toBe(date.getTime());
    expect(date.toISOString()).toBe('2026-06-12T12:00:00.000Z');
  });

  it('exports default aliases for utility functions', () => {
    expect(dateUtils.convert).toBe(convertDate);
    expect(dateUtils.compare).toBe(compareDates);
    expect(dateUtils.inRange).toBe(isInRange);
    expect(dateUtils.add).toBe(addDays);
    expect(dateUtils.format).toBe(formatDate);
    expect(dateUtils.hour).toBe(AddHour);
  });
});
