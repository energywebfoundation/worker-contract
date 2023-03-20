import { GenerationDTO } from './input-schema.dto';

export interface BatteryState {
  lastSoC: number;
  chargedWith: Record<string, GenerationDTO>;
}

export interface BatteryStore {
  states: Record<string, BatteryState>;
  proof: string;
  leaf: string;
}

export interface MatchingResultMatch {
  consumptionId: string;
  generationId: string;
  throughBatteryId: string | null;
  volume: number;
  // Amount of carbon saved by consumer by using green energy
  carbonDisplacement: number; // [g]
  proof: string;
  leaf: string;
  timestamp: Date;
}

export interface MatchingConsumptionLeftover {
  consumptionId: string;
  volume: number;
  carbonUsage: number; // [g]
  gridRenewable: number; // [Wh]
  proof: string;
  leaf: string;
  timestamp: Date;
}

export interface MatchingGenerationLeftover {
  generationId: string;
  throughBatteryId: string | null;
  volume: number;
  proof: string;
  leaf: string;
  timestamp: Date;
}

export interface MatchingResultGeneration {
  generationId: string;
  volume: number;
  timestamp: Date;
  proof: string;
  leaf: string;
}

export interface MatchingResult {
  resultData: {
    matches: MatchingResultMatch[],
    leftoverConsumptions: MatchingConsumptionLeftover[];
    leftoverGenerations: MatchingGenerationLeftover[];
  };
  inputHash: string;
  /** Used during token issuance */
  inputData: {
    generations: MatchingResultGeneration[];
    batteryDischarges: MatchingResultGeneration[];
  };
  batteryStore: BatteryStore;
  timestamp: Date;
  resultHash: string;
}
