import type { MatchingResult } from '../types';

export type MatchingResultReceiver = (result: MatchingResult) => Promise<void>;
export const MATCHING_RESULT_RECEIVERS = Symbol.for('MATCHING_RESULT_RECEIVERS');