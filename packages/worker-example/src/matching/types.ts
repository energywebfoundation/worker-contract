import type { BatteryDTO, BatteryStore, ConsumptionDTO, GenerationDTO, InputDTO, MatchingResult, PreferenceDTO } from 'types';
import type { ProportionalMatcher } from 'algorithms';

export const MATCHING_RECEIVERS_TOKEN = Symbol.for('MATCHING_RECEIVERS_TOKEN');

export type MatchingResultReceiver = (p: {
  result: MatchingResult,
  input: InputDTO,
}) => Promise<void>;

export interface AlgorithmInput {
  timestamp: Date;
  consumptions: ConsumptionDTO[];
  generations: GenerationDTO[];
  batteryCharges: BatteryDTO[];
  batteryDischarges: (BatteryDTO & { generations: GenerationDTO[] })[];
  preferences: Record<string, PreferenceDTO>;
}

export interface AlgorithmOutput {
  matchingResult: {
    matches: {
      consumptionId: string;
      generationId: string;
      throughBatteryId: string | null;
      volume: number;
    }[];
    leftoverConsumptions: ProportionalMatcher.Result['leftoverConsumptions'];
    leftoverGenerations: {
      id: string;
      throughBatteryId: string | null;
      volume: number;
    }[];
    strategyResults: ProportionalMatcher.StrategyResult[];
  };
  batteryMatchedCharges: {
    batteryId: string;
    generationId: string;
    volume: number;
  }[];
  batteryMatchedDischarges: {
    batteryId: string;
    generationId: string;
    consumptionId: string;
    volume: number;
  }[];
  batteryLeftoverDischarges: {
    batteryId: string;
    generationId: string;
    volume: number;
  }[];
}
