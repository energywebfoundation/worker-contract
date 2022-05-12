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
  volume: number;
}

export interface LeftoverConsumption {
  id: string;
  volume: number;
}

export interface ExcessGeneration {
  id: string;
  volume: number;
}

export interface MatchingOutput {
  matches: Match[];
  leftoverConsumptions: LeftoverConsumption[];
  excessGenerations: ExcessGeneration[];
}

export interface FullMatchingResult {
  matchingResult: MatchingOutput;
  rootHash: string;
  leaves: string[];
}

export type MatchingAlgorithm = (input: MatchingInput) => MatchingOutput;

export interface SerializedMerkleTree {
  rootHash: string;
  leaves: string[];
}