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
}

export interface EntityGeneration extends Entity {
  energyType: EnergyType;
}

export interface EntityConsumption extends Entity {
  energyPriorities: { energyType: EnergyType, priority: number }[];
  shouldMatchByRegion: boolean;
}