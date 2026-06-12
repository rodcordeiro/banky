import { EncryptUtils } from './encrypt.util';

describe('EncryptUtils', () => {
  const token = 'secret-token';
  const payload = {
    id: '1c48d2bf-2d52-4764-98df-d81be158b01b',
    username: 'rodcordeiro',
  };

  it('encrypts and decrypts an auth payload with the same token', () => {
    const encrypted = EncryptUtils.encrypt(payload, token);

    expect(encrypted).not.toContain(payload.id);
    expect(encrypted).not.toContain(payload.username);
    expect(EncryptUtils.decrypt(encrypted, token)).toEqual(payload);
  });

  it('generates different cipher text for repeated encryptions', () => {
    const first = EncryptUtils.encrypt(payload, token);
    const second = EncryptUtils.encrypt(payload, token);

    expect(first).not.toBe(second);
    expect(EncryptUtils.decrypt(first, token)).toEqual(payload);
    expect(EncryptUtils.decrypt(second, token)).toEqual(payload);
  });

  it('throws when decrypting with a different token', () => {
    const encrypted = EncryptUtils.encrypt(payload, token);

    expect(() => EncryptUtils.decrypt(encrypted, 'wrong-token')).toThrow();
  });
});
