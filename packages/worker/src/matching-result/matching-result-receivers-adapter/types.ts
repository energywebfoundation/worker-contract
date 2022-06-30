import type { MatchingInput, MatchingResult } from '../../types';

export type MatchingResultReceiver = (result: MatchingResult, input: MatchingInput) => Promise<void>;
export const MATCHING_RESULT_RECEIVERS = Symbol.for('MATCHING_RESULT_RECEIVERS');