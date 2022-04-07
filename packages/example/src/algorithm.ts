import { BigNumber } from '@ethersproject/bignumber';
import { SpreadMatcher } from 'greenproof-algorithms';
import type { MatchingAlgorithm } from 'greenproof-worker';

export const matchingAlgorithm: MatchingAlgorithm = (input) => {
  const result = SpreadMatcher.spreadMatcher({
    entityGroups: [
      input.consumptions.map(c => ({ id: c.deviceId, volume: BigNumber.from(c.volume) })),
      input.generations.map(g => ({ id: g.deviceId, volume: BigNumber.from(g.volume) })),
    ],
    groupPriority: input.preferences.groupPriority,
  });

  return {
    matches: result.matches.map(match => ({
      consumerId: match.entities[0].id,
      generatorId: match.entities[1].id,
      volume: match.volume.toNumber(),
    })),
    leftoverConsumptions: result.leftoverEntities[0].map(e => ({
      id: e.id,
      volume: e.volume.toNumber(),
    })),
    excessGenerations: result.leftoverEntities[1].map(e => ({
      id: e.id,
      volume: e.volume.toNumber(),
    })),
  };
};