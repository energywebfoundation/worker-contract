import { distributeVolume } from '@energyweb/greenproof-algorithms';
import { orderBy, values, zipWith } from 'lodash';
import type { BatteryDTO, BatteryState, GenerationDTO, InputDTO } from 'types';
import type { AlgorithmInput, AlgorithmOutput } from '../types';

/** This is abstracted away to a class, because this way it can be initialized once and worked on */
export class BatteryManager {
  private batteryStates: Record<string, BatteryState>;
  private previousBatteryStates: Record<string, BatteryState>;

  static fromInput(previousStore: Record<string, BatteryState> | null, input: InputDTO): BatteryManager {
    const currentStore = input.batteries.reduce((store, b) => ({
      ...store,
      [b.assetId]: {
        // Only batteries from the current input carry over to current store
        // This means, that if the battery is disconnected
        // and the state is missing
        // the battery state will be reset
        chargedWith: (previousStore && previousStore[b.assetId]) ? previousStore[b.assetId].chargedWith : {},
        lastSoC: b.soc,
      },
    }), {} as Record<string, BatteryState>);

    return new BatteryManager(currentStore, previousStore);
  }

  public getBatteryStates(): Record<string, BatteryState> {
    return this.batteryStates;
  }

  public getBatteryGenerations(battery: BatteryDTO): GenerationDTO[] {
    const generations = orderBy(
      values(this.batteryStates[battery.assetId]?.chargedWith ?? {}),
      g => g.volume,
      'desc',
    );

    const distributedVolume = distributeVolume(battery.volume, generations.map(g => g.volume), true);
    const generationsWithDistributedVolume = zipWith(generations, distributedVolume, (g, volume: number) => ({
      ...g,
      volume,
    }));

    return generationsWithDistributedVolume;
  }

  public updateBatteryState(input: AlgorithmInput, result: AlgorithmOutput): void {
    const batteryChargesMap = input.batteryCharges
      .reduce((record, battery) => ({
        ...record,
        [battery.assetId]: battery.volume,
      }), {} as Record<string, number>);

    result.batteryMatchedCharges.forEach((c) => {
      this.chargeBattery({
        batteryId: c.batteryId,
        volume: this.adjustToLoss(c.volume, c.batteryId, batteryChargesMap[c.batteryId]),
        generation: input.generations.find((g) => g.assetId === c.generationId)!,
      });
    });

    [
      ...result.batteryMatchedDischarges,
      ...result.batteryLeftoverDischarges,
    ].forEach((c) => {
      this.dischargeBattery({
        batteryId: c.batteryId,
        generationId: c.generationId,
        volume: c.volume,
      });
    });
  }

  /**
   * We need to know how much volume was really charged (using previous SoC and current SoC)
   * and compare it with volume charged according to reading.
   *
   * e.g. if battery was charged from 100Wh to 120Wh, but reading was 30, then the ratio is 2/3
   * so we will multiply each charge by 2/3.
   */
  private adjustToLoss(greenVolume: number, batteryId: string, overallVolumeCharged: number): number {
    const previous = this.previousBatteryStates[batteryId]?.lastSoC;

    if (previous === undefined) {
      return greenVolume;
    }

    const current = this.batteryStates[batteryId].lastSoC;
    const chargedRatio = (current - previous) / overallVolumeCharged;

    if (chargedRatio <= 0) {
      // If current and previous battery SoC are equal (or current < previous), then
      // something went wrong with input data. Log it probably or something,
      // and don't charge battery at all.
      return 0;
    }

    return greenVolume * chargedRatio;
  }

  private dischargeBattery(params: DischargeBatteryParams): void {
    const generations = this.batteryStates[params.batteryId].chargedWith;
    const generationToDischarge = generations[params.generationId];

    generationToDischarge.volume -= params.volume;

    if (generationToDischarge.volume === 0) {
      delete generations[params.generationId];
    }
  }

  private chargeBattery({ batteryId, generation, volume }: ChargeBatteryParams): void {
    const existing = this.batteryStates[batteryId].chargedWith[generation.assetId];

    if (existing) {
      existing.volume += volume;
    } else {
      this.batteryStates[batteryId].chargedWith[generation.assetId] = {
        ...generation,
        volume,
      };
    }
  }

  private constructor(
    batteryStore: Record<string, BatteryState>,
    previousBatteryStore: Record<string, BatteryState> | null,
  ) {
    this.batteryStates = batteryStore;
    this.previousBatteryStates = previousBatteryStore ?? {};
  }
}

interface DischargeBatteryParams {
  batteryId: string;
  generationId: string;
  volume: number;
}

interface ChargeBatteryParams {
  batteryId: string;
  volume: number;
  generation: GenerationDTO;
}
