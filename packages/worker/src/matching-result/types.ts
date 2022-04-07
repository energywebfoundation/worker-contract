export interface MatchingResult {
  tree: {
    rootHash: string;
    leaves: string[];
  },
  data: {
    matches: { consumerId: string; generatorId: string; volume: number }[];
    leftoverConsumptions: { id: string; volume: number }[];
    excessGenerations: { id: string; volume: number }[];
  }
}

export type MatchingResultReceiver = (result: MatchingResult) => Promise<void>;
export const MATCHING_RESULT_RECEIVERS = Symbol.for('MATCHING_RESULT_RECEIVERS');