export interface MatchingResult {
  timestamp: Date;
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
