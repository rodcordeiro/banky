import { enc, SHA256, AES } from 'crypto-js';
import { Authenticate } from '@/common/interfaces/authenticated.interface';

export const EncryptUtils = {
  encrypt: (data: Authenticate.IAuthToken, token: string): string => {
    const key = SHA256(token).toString();
    const payload = AES.encrypt(JSON.stringify(data), key).toString();
    return payload;
  },

  decrypt: (
    data: string,
    token: string,
  ): Authenticate.IAuthenticatedUser['user'] => {
    const key = SHA256(token).toString();
    const payload = AES.decrypt(data, key).toString(enc.Utf8);
    return JSON.parse(payload);
  },
};
