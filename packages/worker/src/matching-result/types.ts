export interface MatchingResult {
  tree: {
    rootHash: string;
    leaves: string[];
  },
  data: {
    matches: { consumerId: string; generatorId: string; volume: string }[];
    leftoverConsumptions: { id: string; volume: string }[];
    excessGenerations: { id: string; volume: string }[];
  }
}

export type MatchingResultReceiver = (result: MatchingResult) => Promise<void>;
export const MATCHING_RESULT_RECEIVERS = Symbol.for('MATCHING_RESULT_RECEIVERS');