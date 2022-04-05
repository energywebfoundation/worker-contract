import {createHmac} from 'crypto';

export const HASHING_FUNCTION = 'SHA512';

export const hash = (thingToHash: string, key: string): string => {
  const hmac = createHmac(HASHING_FUNCTION, key);
  hmac.update(thingToHash);
  return hmac.digest('hex');
};