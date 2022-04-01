import {createHmac} from 'crypto';

export const HASHING_FUNCTION = 'SHA512';

const MATCH_KEY = 'MATCH';
const EXCESS_GENERATION_KEY = 'EXCESS_GENERATION';
const LEFTOVER_CONSUMPTION_KEY = 'LEFTOVER_CONSUMPTION';

export const getMatchHash = (match: Record<string, unknown>) => hashObject(match, MATCH_KEY);
export const getGenerationHash = (leftover: Record<string, unknown>) => hashObject(leftover, EXCESS_GENERATION_KEY);
export const getConsumptionHash = (leftover: Record<string, unknown>) => hashObject(leftover, LEFTOVER_CONSUMPTION_KEY);

const hashObject = (object: Record<string, unknown>, key: string): string => {
  const hmac = createHmac(HASHING_FUNCTION, key);

  hmac.update(JSON.stringify(object));

  return hmac.digest('hex');
};