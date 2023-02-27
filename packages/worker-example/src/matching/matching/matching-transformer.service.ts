import type {
  BatteryState,
  BatteryStore,
  CarbonIntensities,
  CountryId,
  GridRenewablePercentages,
  InputDTO,
  MatchingResult,
} from 'types';
import type { BatteryManager } from '../battery/battery-manager';
import type { AlgorithmInput, AlgorithmOutput } from '../types';
import { Injectable } from '@nestjs/common';
import { MerkleTree } from '../merkleTree.service';
import { groupBy } from 'lodash';

@Injectable()
export class MatchingTransformerService {
  constructor(private merkleTree: MerkleTree) {}

  computeCarbon(
    carbonIntensities: Record<CountryId, CarbonIntensities>,
    params: {
      countryId: string
      regionId: string
      siteId: string
      volume: number
    },
  ): number {
    const countryIntensity = carbonIntensities[params.countryId];

    if (!countryIntensity) {
      return 0;
    }

    const siteIntensity = countryIntensity.sites
      ? countryIntensity.sites[params.siteId]
      : null;
    const regionIntensity = countryIntensity.regions
      ? countryIntensity.regions[params.regionId]
      : null;

    // Use site, then region is not available, then country which is guaranteed
    const intensity =
      siteIntensity ?? regionIntensity ?? countryIntensity.carbonIntensity;
    return Math.ceil(params.volume * intensity);
  }

  toAlgorithmInput = (
    input: InputDTO,
    batteryManager: BatteryManager,
  ): AlgorithmInput => {
    return {
      timestamp: input.timestamp.end,
      consumptions: input.consumptions,
      generations: input.generations,
      batteryCharges: input.batteries.filter((b) => b.volume >= 0),
      batteryDischarges: input.batteries
        .filter((b) => b.volume < 0)
        .map((b) => {
          const battery = {
            ...b,
            volume: Math.abs(b.volume),
          };

          return {
            ...battery,
            generations: batteryManager.getBatteryGenerations(battery),
          };
        }),
      preferences: input.preferences,
    };
  };

  toMatchingResult = (
    matchingData: AlgorithmInput,
    algorithmResult: AlgorithmOutput,
    carbonIntensities: Record<CountryId, CarbonIntensities>,
    gridRenewablePercentages: Record<CountryId, GridRenewablePercentages>,
    batteryStates: Record<string, BatteryState>,
    inputHash: string,
  ): MatchingResult => {
    const { matchingResult } = algorithmResult;

    const groupedConsumptions = groupBy(
      [...matchingData.consumptions, ...matchingData.batteryCharges],
      (c) => c.assetId,
    );

    const mappedMatches = matchingResult.matches.map((m) => {
      return {
        consumptionId: m.consumptionId,
        generationId: m.generationId,
        throughBatteryId: m.throughBatteryId,
        volume: m.volume,
        timestamp: matchingData.timestamp,
        carbonDisplacement: this.computeCarbon(carbonIntensities, {
          ...groupedConsumptions[m.consumptionId][0],
          volume: m.volume,
        }),
      };
    });

    const mappedLeftoverConsumptions = matchingResult.leftoverConsumptions.map(
      ({ id, volume, countryId, siteId, regionId }) => {
        return {
          consumptionId: id,
          volume,
          timestamp: matchingData.timestamp,
          carbonUsage: (() => {
            const countryIntensity = carbonIntensities[countryId];
            
            if (!countryIntensity) {
              return 0;
            }

            const siteIntensity = countryIntensity.sites
              ? countryIntensity.sites[siteId]
              : null;
            const regionIntensity = countryIntensity.regions
              ? countryIntensity.regions[regionId]
              : null;

            // Use site, then region is not available, then country which is guaranteed
            const intensity =
              siteIntensity ??
              regionIntensity ??
              countryIntensity.carbonIntensity;
            return Math.ceil(volume * intensity);
          })(),
          gridRenewable: (() => {
            const countryRenewable = gridRenewablePercentages[countryId];
            if (!countryRenewable) {
              return 0;
            }

            const siteRenewable = countryRenewable.sites
              ? countryRenewable.sites[siteId]
              : null;
            const regionRenewable = countryRenewable.regions
              ? countryRenewable.regions[regionId]
              : null;

            const renewable =
              siteRenewable ??
              regionRenewable ??
              countryRenewable.renewablePercentage;

            return Math.ceil(volume * renewable);
          })(),
        };
      },
    );

    const mappedLeftoverGenerations = matchingResult.leftoverGenerations.map(
      ({ id, throughBatteryId, volume }) => {
        return {
          generationId: id,
          throughBatteryId,
          timestamp: matchingData.timestamp,
          volume,
        };
      },
    );

    const mappedInputGenerations = matchingData.generations.map(g => ({
      generationId: g.assetId,
      volume: g.volume,
      timestamp: matchingData.timestamp,
    }));

    const mappedBatteryDischarges = matchingData.batteryDischarges.map(g => ({
      generationId: g.assetId,
      volume: g.volume,
      timestamp: matchingData.timestamp,
    }));

    const {
      batteryStore: bs,
      leftoverConsumptions,
      leftoverGenerations,
      inputBatteryDischarges,
      inputGenerations,
      matches,
      rootHash,
    } = this.merkleTree.createTree(
      {
        matches: mappedMatches,
        leftoverConsumptions: mappedLeftoverConsumptions,
        leftoverGenerations: mappedLeftoverGenerations,
      },
      {
        generations: mappedInputGenerations,
        batteryDischarges: mappedBatteryDischarges,
      },
      batteryStates,
    );

    return {
      timestamp: matchingData.timestamp,
      resultHash: rootHash,
      batteryStore: {
        leaf: bs.leaf,
        proof: bs.proof,
        states: batteryStates,
      },
      resultData: {
        matches,
        leftoverConsumptions,
        leftoverGenerations,
      },
      inputData: {
        generations: inputGenerations,
        batteryDischarges: inputBatteryDischarges,
      },
      inputHash,
    };
  };
}
