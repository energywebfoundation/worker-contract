export type MatchingAlgorithm = (input: MatchingInput) => MatchingOutput;

export interface MatchingOutput {
  matches: unknown[];
  leftoverConsumptions: unknown[];
  leftoverGenerations: unknown[];
}

export interface MatchingInput {
  timestamp: Date;
}

export interface MatchingResult {
  timestamp: Date;
  tree: {
    rootHash: string;
    leaves: string[];
  },
  data: MatchingOutput;
}

export interface FullMatchingResult {
  matchingResult: MatchingResult;
  rootHash: string;
  leaves: string[];
}

export interface SerializedMerkleTree {
  rootHash: string;
  leaves: string[];
}