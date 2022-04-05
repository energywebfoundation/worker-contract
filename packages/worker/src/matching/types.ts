import type { Reading, Preferences } from '../matching-data/types';

export const MATCHING_ALGO = Symbol.for('MATCHING_ALGO');

export interface MatchingInput {
  consumptions: Reading[];
  generations: Reading[];
  preferences: Preferences;
}

export interface Match {
  consumerId: string;
  generatorId: string;
  volume: string;
}

export interface LeftoverConsumption {
  id: string;
  volume: string;
}

export interface ExcessGeneration {
  id: string;
  volume: string;
}

export interface MatchingOutput {
  matches: Match[];
  leftoverConsumptions: LeftoverConsumption[];
  excessGenerations: ExcessGeneration[];
}

export type MatchingAlgorithm = (input: MatchingInput) => MatchingOutput;