import type { LeftoverConsumption, LeftoverGeneration, Match } from '../../types';

export abstract class MatchRepository {
  abstract save(matches: Match[]): Promise<void>;
}

export abstract class LeftoverConsumptionRepository {
  abstract save(consumptions: LeftoverConsumption[]): Promise<void>;
}

export abstract class LeftoverGenerationRepository {
  abstract save(generations: LeftoverGeneration[]): Promise<void>;
}