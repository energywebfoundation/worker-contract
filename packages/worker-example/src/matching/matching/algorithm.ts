import { ProportionalMatcher } from 'algorithms';
import type { AlgorithmInput, AlgorithmOutput } from '../types';

export const algorithm = (data: AlgorithmInput): AlgorithmOutput => {
  const { consumptions, batteryCharges, batteryDischarges, preferences, generations } = data;

  /** Build composite ids for battery generations */
  const batteryEnergies = batteryDischarges.flatMap(b => {
    return b.generations.map(g => ({
      assetId: compositeId({ batteryId: b.assetId, generationId: g.assetId }),
      regionId: b.regionId,
      siteId: b.siteId,
      countryId: b.countryId,
      energyType: g.energyType,
      volume: g.volume,
    }));
  });

  const input = {
    consumptions: [
      ...consumptions,
      ...batteryCharges,
    ].map(c => {
      const consumerPreferences = preferences[c.assetId];

      return {
        id: c.assetId,
        regionId: c.regionId,
        countryId: c.countryId,
        siteId: c.siteId,
        volume: c.volume,
        energyPriorities: Object.entries(consumerPreferences.energySourcePriority)
          .map(([energyType, priority]) => ({ energyType, priority })),
        shouldMatchByRegion: consumerPreferences.matchRegionally,
        shouldMatchByCountry: consumerPreferences.matchNationally,
        shouldMatchByOtherCountries: consumerPreferences.matchInternationally,
      };
    }),
    generations: [
      ...generations,
      ...batteryEnergies,
    ].map(g => ({
      id: g.assetId,
      energyType: g.energyType,
      regionId: g.regionId,
      countryId: g.countryId,
      siteId: g.siteId,
      volume: g.volume,
    })),
  };

  const matchingResult = ProportionalMatcher.match(input);

  const batteryChargesIds = batteryCharges.map(b => b.assetId);

  /**
   * Deconstruct composite ids but to original IDs.
   */
  return {
    matchingResult: {
      matches: matchingResult.matches.map(m => {
        return {
          ...m,
          generationId: isCompositeId(m.generationId) ? generationId(m.generationId)! : m.generationId,
          throughBatteryId: isCompositeId(m.generationId) ? batteryId(m.generationId)! : null,
        };
      }),
      leftoverConsumptions: matchingResult.leftoverConsumptions,
      leftoverGenerations: matchingResult.leftoverGenerations.map(g => {
        return {
          ...g,
          id: isCompositeId(g.id) ? generationId(g.id)! : g.id,
          throughBatteryId: isCompositeId(g.id) ? batteryId(g.id)! : null,
        };
      }),
      strategyResults: matchingResult.strategyResults,
    },
    batteryMatchedCharges: matchingResult.matches.filter(
      (m) => batteryChargesIds.includes(m.consumptionId),
    ).map(m => ({
      batteryId: m.consumptionId,
      generationId: m.generationId,
      volume: m.volume,
    })),
    batteryMatchedDischarges: matchingResult.matches.filter(
      // Only discharges have composite id
      (m) => isCompositeId(m.generationId),
    ).map(m => ({
      batteryId: batteryId(m.generationId)!,
      generationId: generationId(m.generationId)!,
      consumptionId: m.consumptionId,
      volume: m.volume,
    })),
    batteryLeftoverDischarges: matchingResult.leftoverGenerations.filter(
      (l) => isCompositeId(l.id),
    ).map(l => ({
      batteryId: batteryId(l.id)!,
      generationId: generationId(l.id)!,
      volume: l.volume,
    })),
  };
};

/**
 * The idea behind composite id is to store battery id and generation id
 * in one field for matching purposes.
 */

const separator = '_,-,_';

export const compositeId = (p: { batteryId: string, generationId: string }) =>
  `${p.batteryId}${separator}${p.generationId}`;

export const isCompositeId = (compositeId: string) => Boolean(compositeId.match(separator));

export const generationId = (compositeId: string): string | undefined => {
  return isCompositeId(compositeId) ? compositeId.split(separator)[1] : undefined;
};

export const batteryId = (compositeId: string): string | undefined => {
  return isCompositeId(compositeId) ? compositeId.split(separator)[0] : undefined;
};
