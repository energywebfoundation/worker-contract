import type { LeftoverConsumption, LeftoverGeneration, Match } from '../../types';

export abstract class MatchRepository {
  abstract save(matches: Match[], tx: any | null): Promise<void>;
  abstract find(): Promise<Match[]>;
}

export abstract class LeftoverConsumptionRepository {
  abstract save(consumptions: LeftoverConsumption[], tx: any | null): Promise<void>;
  abstract find(): Promise<LeftoverConsumption[]>;
}

export abstract class LeftoverGenerationRepository {
  abstract save(generations: LeftoverGeneration[], tx: any | null): Promise<void>;
  abstract find(): Promise<LeftoverGeneration[]>;
}