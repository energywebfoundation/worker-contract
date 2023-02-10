import { random, times } from 'lodash';
import type { EntityConsumption, EntityGeneration } from '../src/proportional-matcher/types';
import { ProportionalMatcher } from '../src/ProportionalMatcher';

describe.skip('ProportionalMatcher', () => {
  describe('performance', () => {
    it('1k x 1k', () => {
      const consumptions = times(5_000, () => consumptionForPriority(
        Math.random().toString(),
        random(1, 100000),
        { solar: 1 },
      ));
      const generations = times(5_000, () => generationForPriority(
        Math.random().toString(),
        random(1, 10000),
        'solar',
      ));

      const label = 'Time took to match 1k consumptions and 1k generations';
      console.time(label);

      const result = ProportionalMatcher.match({
        consumptions,
        generations,
      });

      console.timeEnd(label);
    });
  });
});

const consumptionForPriority = (id: string, volume: number, priorities: Record<string, number>): EntityConsumption => ({
  id,
  volume,
  energyPriorities: Object.entries(priorities).map(([energyType, priority]) => ({
    energyType,
    priority,
  })),
  siteId: 's1',
  regionId: 'r1',
  countryId: 'c1',
  shouldMatchByRegion: true,
  shouldMatchByCountry: true,
  shouldMatchByOtherCountries: true,
});

const generationForPriority = (id: string, volume: number, energyType: string): EntityGeneration => ({
  id,
  volume,
  energyType,
  siteId: 's1',
  regionId: 'r1',
  countryId: 'c1',
});
