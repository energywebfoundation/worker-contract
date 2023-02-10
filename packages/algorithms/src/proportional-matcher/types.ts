type EnergyType = string;

export interface Match {
  consumptionId: string;
  generationId: string;
  volume: number;
}

export interface Entity {
  id: string;
  volume: number;
  siteId: string;
  regionId: string;
  countryId: string;
}

export interface EntityGeneration extends Entity {
  energyType: EnergyType;
}

export interface EntityConsumption extends Entity {
  energyPriorities: { energyType: EnergyType, priority: number }[];
  shouldMatchByRegion: boolean;
  shouldMatchByCountry: boolean;
  shouldMatchByOtherCountries: boolean;
}

export interface MatchPath {
  consumptionId: string;
  generationId: string;
}

export interface MatchRoundInput {
  consumptions: Record<string, Entity>;
  generations: Record<string, Entity>;
  paths: MatchPath[];
}

export interface MatchData {
  consumptions: EntityConsumption[];
  generations: EntityGeneration[];
}

interface PathBuilderPayload {
  consumptions: Record<string, EntityConsumption>;
  generations: Record<string, EntityGeneration>;
}

export interface PathStrategy {
  name: string;
  execute: (p: PathBuilderPayload) => MatchPath[];
}
