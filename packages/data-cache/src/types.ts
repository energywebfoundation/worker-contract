export type LeftoverConsumption = {
  consumerId: string,
  volume: number,
  timestamp: Date,
  consumerMetadata: any,
};

export type LeftoverGeneration = {
  generatorId: string,
  volume: number,
  timestamp: Date,
  generatorMetadata: any,
};

export type Match = {
  consumerId: string,
  generatorId: string,
  volume: number,
  timestamp: Date,
  consumerMetadata: any,
  generatorMetadata: any,
};

export type MatchingResult = {
  matches: Match[];
  leftoverConsumption: LeftoverConsumption[];
  leftoverGeneration: LeftoverGeneration[];
};
