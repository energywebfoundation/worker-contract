import type { MatchingResultReceiver } from './types';

export const matchingResultLogger: MatchingResultReceiver = async (result) => {
  console.log(JSON.stringify(result, null, 2));
};

