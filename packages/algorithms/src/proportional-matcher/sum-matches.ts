import type { Match } from './types';

/**
 * Sums up matches, that have equal consumption id and generation id
 */
export const sumMatches = (matches: Match[]): Match[] => {
  const matchesMap: Record<string, Record<string, number>> = {};

  // Sum matches
  matches.forEach(match => {
    matchesMap[match.consumptionId] ||= {};
    matchesMap[match.consumptionId][match.generationId] ||= 0;

    matchesMap[match.consumptionId][match.generationId] += match.volume;
  });

  // Unwind matches map
  return Object.entries(matchesMap)
    .flatMap(([consumptionId, consumptionMatchMap]) => {
      return Object.entries(consumptionMatchMap)
        .map(([generationId, volume]) => ({
          generationId,
          consumptionId,
          volume,
        }));
    });
};
