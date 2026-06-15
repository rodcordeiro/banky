import { StringUtils } from './string.util';

describe('StringUtils', () => {
  describe('IsNotEmpty', () => {
    it.each([undefined, null, 'undefined', 'null', '', '   ', '\n\t'])(
      'returns false for empty-like value: %p',
      value => {
        expect(StringUtils.IsNotEmpty(value as string)).toBe(false);
      },
    );

    it.each(['a', '  a  ', '0', 'false'])(
      'returns true for non-empty value: %p',
      value => {
        expect(StringUtils.IsNotEmpty(value)).toBe(true);
      },
    );
  });

  describe('IsUUID', () => {
    it('returns true for valid UUID values', () => {
      expect(StringUtils.IsUUID('1c48d2bf-2d52-4764-98df-d81be158b01b')).toBe(
        true,
      );
    });

    it.each([
      '',
      'not-a-uuid',
      '1c48d2bf',
      'zzzzzzzz-2d52-4764-98df-d81be158b01b',
    ])('returns false for invalid UUID value: %p', value => {
      expect(StringUtils.IsUUID(value)).toBe(false);
    });
  });
});
