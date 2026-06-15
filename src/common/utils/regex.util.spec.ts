import { RegexHelper } from './regex.util';

describe('RegexHelper', () => {
  describe('password', () => {
    it.each(['Abcdef1#', 'Banky 123A', 'StrongPass1!'])(
      'matches strong password: %p',
      value => {
        expect(RegexHelper.password.test(value)).toBe(true);
      },
    );

    it.each(['abcdef1#', 'ABCDEF1#', 'Abcdefgh#', 'Abcdef12', 'Ab1#'])(
      'does not match weak password: %p',
      value => {
        expect(RegexHelper.password.test(value)).toBe(false);
      },
    );
  });

  describe('uuid', () => {
    beforeEach(() => {
      RegexHelper.uuid.lastIndex = 0;
    });

    it('matches UUID values regardless of case', () => {
      expect(
        RegexHelper.uuid.test('1C48D2BF-2D52-4764-98DF-D81BE158B01B'),
      ).toBe(true);
    });

    it.each(['not-a-uuid', '1c48d2bf', 'zzzzzzzz-2d52-4764-98df-d81be158b01b'])(
      'does not match invalid UUID value: %p',
      value => {
        RegexHelper.uuid.lastIndex = 0;
        expect(RegexHelper.uuid.test(value)).toBe(false);
      },
    );
  });
});
