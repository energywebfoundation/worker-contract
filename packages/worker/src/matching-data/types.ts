import type { MatchingInput } from '../types';

export type MatchCallback = (input: MatchingInput) => Promise<void>;
