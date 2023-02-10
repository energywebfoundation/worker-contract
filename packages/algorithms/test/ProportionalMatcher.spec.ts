import type { EntityConsumption, EntityGeneration } from '../src/proportional-matcher/types';
import { ProportionalMatcher } from '../src/ProportionalMatcher';

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

const consumptionForSite = (id: string, volume: number, siteId: string): EntityConsumption => ({
  id,
  volume,
  energyPriorities: [{ energyType: 'pv', priority: 1 }],
  siteId,
  regionId: 'r1',
  countryId: 'c1',
  shouldMatchByRegion: true,
  shouldMatchByCountry: true,
  shouldMatchByOtherCountries: true,
});

const generationForSite = (id: string, volume: number, siteId: string): EntityGeneration => ({
  id,
  volume,
  energyType: 'pv',
  siteId,
  regionId: 'r1',
  countryId: 'c1',
});

const consumptionForRegion = (id: string, volume: number, regionId: string, siteId: string): EntityConsumption => ({
  id,
  volume,
  energyPriorities: [{ energyType: 'pv', priority: 1 }],
  siteId,
  regionId,
  countryId: 'c1',
  shouldMatchByRegion: true,
  shouldMatchByCountry: true,
  shouldMatchByOtherCountries: true,
});

const consumptionForCountry = (id: string, volume: number, siteId: string, countryId: string): EntityConsumption => ({
  id,
  volume,
  energyPriorities: [{ energyType: 'pv', priority: 1 }],
  siteId,
  regionId: 'r1',
  countryId,
  shouldMatchByRegion: false,
  shouldMatchByCountry: true,
  shouldMatchByOtherCountries: true,
});

const generationForRegion = (id: string, volume: number, regionId: string, siteId: string): EntityGeneration => ({
  id,
  volume,
  energyType: 'pv',
  siteId,
  regionId,
  countryId: 'c1',
});

const generationForCountry = (id: string, volume: number, siteId: string, countryId: string): EntityGeneration => ({
  id,
  volume,
  energyType: 'pv',
  siteId,
  regionId: 'r1',
  countryId,
});

const match = (consumptionId: string, generationId: string, volume: number) => ({
  consumptionId,
  generationId,
  volume,
});

describe('ProportionalMatcher', () => {
  describe('Empty inputs', () => {
    it('should handle empty input', () => {
      const input: ProportionalMatcher.Input = {
        consumptions: [],
        generations: [],
      };
      const result = ProportionalMatcher.match(input);

      expect(result.matches).toEqual([]);
      expect(result.leftoverConsumptions).toEqual([]);
      expect(result.leftoverGenerations).toEqual([]);
    });

    it('should handle empty consumptions', () => {
      const input: ProportionalMatcher.Input = {
        consumptions: [],
        generations: [
          generationForPriority('g1', 24, 'pv'),
        ],
      };
      const result = ProportionalMatcher.match(input);

      expect(result.matches).toEqual([]);
      expect(result.leftoverConsumptions).toEqual([]);
      expect(result.leftoverGenerations).toEqual(input.generations);
    });

    it('should handle empty generations', () => {
      const input: ProportionalMatcher.Input = {
        consumptions: [
          consumptionForPriority('c1', 24, { pv: 1 }),
        ],
        generations: [
        ],
      };
      const result = ProportionalMatcher.match(input);

      expect(result.matches).toEqual([]);
      expect(result.leftoverConsumptions).toEqual(input.consumptions);
      expect(result.leftoverGenerations).toEqual([]);
    });
  });

  describe('Matches', () => {
    describe('Basic matching smoke test (single priority level)', () => {
      describe('No leftovers', () => {
        it('should match 1-1', () => {
          const input: ProportionalMatcher.Input = {
            consumptions: [
              consumptionForPriority('c1', 24, { pv: 1 }),
            ],
            generations: [
              generationForPriority('g1', 24, 'pv'),
            ],
          };
          const result = ProportionalMatcher.match(input);

          expect(result.matches).toEqual([
            match('c1', 'g1', 24),
          ]);
          expect(result.leftoverConsumptions).toEqual([]);
          expect(result.leftoverGenerations).toEqual([]);
        });

        it('should match 1-2', () => {
          const input: ProportionalMatcher.Input = {
            consumptions: [
              consumptionForPriority('c1', 36, { pv: 1 }),
            ],
            generations: [
              generationForPriority('g1', 24, 'pv'),
              generationForPriority('g2', 12, 'pv'),
            ],
          };
          const result = ProportionalMatcher.match(input);

          expect(result.matches).toEqual([
            match('c1', 'g1', 24),
            match('c1', 'g2', 12),
          ]);
          expect(result.leftoverConsumptions).toEqual([]);
          expect(result.leftoverGenerations).toEqual([]);
        });

        it('should match 2-1', () => {
          const input: ProportionalMatcher.Input = {
            consumptions: [
              consumptionForPriority('c1', 12, { pv: 1 }),
              consumptionForPriority('c2', 12, { pv: 1 }),
            ],
            generations: [
              generationForPriority('g1', 24, 'pv'),
            ],
          };
          const result = ProportionalMatcher.match(input);

          expect(result.matches).toEqual([
            match('c1', 'g1', 12),
            match('c2', 'g1', 12),
          ]);
          expect(result.leftoverConsumptions).toEqual([]);
          expect(result.leftoverGenerations).toEqual([]);
        });

        it('should match 2-2', () => {
          const input: ProportionalMatcher.Input = {
            consumptions: [
              consumptionForPriority('c1', 12, { pv: 1 }),
              consumptionForPriority('c2', 12, { pv: 1 }),
            ],
            generations: [
              generationForPriority('g1', 12, 'pv'),
              generationForPriority('g2', 12, 'pv'),
            ],
          };
          const result = ProportionalMatcher.match(input);

          expect(result.matches).toEqual([
            match('c1', 'g1', 6),
            match('c1', 'g2', 6),
            match('c2', 'g1', 6),
            match('c2', 'g2', 6),
          ]);
          expect(result.leftoverConsumptions).toEqual([]);
          expect(result.leftoverGenerations).toEqual([]);
        });
      });

      describe('With leftovers', () => {
        it('Consumption leftover', () => {
          const input: ProportionalMatcher.Input = {
            consumptions: [
              consumptionForPriority('c1', 24, { pv: 1 }),
            ],
            generations: [
              generationForPriority('g1', 12, 'pv'),
            ],
          };
          const result = ProportionalMatcher.match(input);

          expect(result.matches).toEqual([
            match('c1', 'g1', 12),
          ]);
          expect(result.leftoverConsumptions).toEqual([
            consumptionForPriority('c1', 12, { pv: 1 }),
          ]);
          expect(result.leftoverGenerations).toEqual([]);
        });

        it('Generation leftover', () => {
          const input: ProportionalMatcher.Input = {
            consumptions: [
              consumptionForPriority('c1', 12, { pv: 1 }),
            ],
            generations: [
              generationForPriority('g1', 24, 'pv'),
            ],
          };
          const result = ProportionalMatcher.match(input);

          expect(result.matches).toEqual([
            match('c1', 'g1', 12),
          ]);
          expect(result.leftoverConsumptions).toEqual([]);
          expect(result.leftoverGenerations).toEqual([
            generationForPriority('g1', 12, 'pv'),
          ]);
        });

        it.each<[ProportionalMatcher.Input, ProportionalMatcher.Result]>([
          [{
            consumptions: [
              consumptionForPriority('c1', 10, { pv: 1 }),
            ],
            generations: [
              generationForPriority('g1', 100000, 'pv'),
              generationForPriority('g2', 10, 'pv'),
            ],
          }, {
            matches: [
              match('c1', 'g1', 10),
            ],
            leftoverConsumptions: [],
            leftoverGenerations: [
              generationForPriority('g1', 99990, 'pv'),
              generationForPriority('g2', 10, 'pv'),
            ],
            strategyResults: [],
          }],
          [{
            consumptions: [
              consumptionForPriority('c1', 100, { pv: 1 }),
            ],
            generations: [
              generationForPriority('g1', 10, 'pv'),
              generationForPriority('g2', 5000000, 'pv'),
              generationForPriority('g3', 7000000, 'pv'),
              generationForPriority('g4', 20, 'pv'),
            ],
          }, {
            matches: [
              match('c1', 'g2', 41),
              match('c1', 'g3', 59),
            ],
            leftoverConsumptions: [],
            leftoverGenerations: [
              generationForPriority('g1', 10, 'pv'),
              generationForPriority('g2', 4999959, 'pv'),
              generationForPriority('g3', 6999941, 'pv'),
              generationForPriority('g4', 20, 'pv'),
            ],
            strategyResults: [],
          }],
        ])('should match results correctly with big differences in generations\' volumes', (input, expectedResults) => {
          const result = ProportionalMatcher.match(input);

          expect(result).toHaveProperty('matches', expectedResults.matches);
          expect(result).toHaveProperty('leftoverConsumptions', expectedResults.leftoverConsumptions);
          expect(result).toHaveProperty('leftoverGenerations', expectedResults.leftoverGenerations);
        });
      });
    });

    it('should go over all priorities', () => {
      const input: ProportionalMatcher.Input = {
        consumptions: [
          consumptionForPriority('c1', 36, { pv: 3, wind: 2, gas: 1 }),
        ],
        generations: [
          generationForPriority('g1', 12, 'pv'),
          generationForPriority('g2', 12, 'wind'),
          generationForPriority('g3', 12, 'gas'),
        ],
      };
      const result = ProportionalMatcher.match(input);

      expect(result.matches).toEqual([
        match('c1', 'g1', 12),
        match('c1', 'g2', 12),
        match('c1', 'g3', 12),
      ]);
      expect(result.leftoverConsumptions).toEqual([]);
      expect(result.leftoverGenerations).toEqual([]);
    });

    it('should match leftover consumptions with any generator type', () => {
      const input: ProportionalMatcher.Input = {
        consumptions: [
          consumptionForPriority('c1', 24, { pv: 1 }),
        ],
        generations: [
          generationForPriority('g1', 12, 'pv'),
          generationForPriority('g2', 12, 'wind'),
        ],
      };
      const result = ProportionalMatcher.match(input);

      expect(result.matches).toEqual([
        match('c1', 'g1', 12),
        match('c1', 'g2', 12),
      ]);
      expect(result.leftoverConsumptions).toEqual([]);
      expect(result.leftoverGenerations).toEqual([]);
    });

    it('should match by site first', () => {
      const input: ProportionalMatcher.Input = {
        consumptions: [
          consumptionForSite('c1', 36, 's1'),
        ],
        generations: [
          generationForSite('g1', 24, 's1'),
          generationForSite('g2', 36, 's2'),
        ],
      };
      const result = ProportionalMatcher.match(input);

      expect(result.matches).toEqual([
        match('c1', 'g1', 24),
        match('c1', 'g2', 12),
      ]);
      expect(result.leftoverConsumptions).toEqual([]);
      expect(result.leftoverGenerations).toEqual([
        generationForSite('g2', 24, 's2'),
      ]);
    });

    it('should match by region first', () => {
      const input: ProportionalMatcher.Input = {
        consumptions: [
          consumptionForRegion('c1', 36, 'r1', 's1'),
        ],
        generations: [
          generationForRegion('g1', 24, 'r1', 's2'),
          generationForRegion('g2', 36, 'r2', 's3'),
        ],
      };
      const result = ProportionalMatcher.match(input);

      expect(result.matches).toEqual([
        match('c1', 'g1', 24),
        match('c1', 'g2', 12),
      ]);
      expect(result.leftoverConsumptions).toEqual([]);
      expect(result.leftoverGenerations).toEqual([
        generationForRegion('g2', 24, 'r2', 's3'),
      ]);
    });

    it('should match by country (nationally and internationally)', () => {
      const input: ProportionalMatcher.Input = {
        consumptions: [
          consumptionForCountry('c1', 48, 's1', 'country1'),
        ],
        generations: [
          generationForCountry('g1', 36, 's2', 'country1'),
          generationForCountry('g2', 36, 's3', 'country2'),
        ],
      };
      const result = ProportionalMatcher.match(input);

      expect(result.matches).toEqual([
        match('c1', 'g1', 36),
        match('c1', 'g2', 12),
      ]);
      expect(result.leftoverGenerations).toEqual([
        generationForCountry('g2', 24, 's3', 'country2'),
      ]);
    });

    it('should distribute fractions', () => {
      const input: ProportionalMatcher.Input = {
        consumptions: [
          consumptionForPriority('c1', 10, { pv: 1 }),
          consumptionForPriority('c2', 10, { pv: 1 }),
          consumptionForPriority('c3', 10, { pv: 1 }),
        ],
        generations: [
          generationForPriority('g1', 20, 'pv'),
        ],
      };
      const result = ProportionalMatcher.match(input);

      expect(result.matches).toEqual([
        match('c1', 'g1', 7),
        match('c2', 'g1', 7),
        match('c3', 'g1', 6),
      ]);
      expect(result.leftoverConsumptions).toEqual([
        consumptionForPriority('c1', 3, { pv: 1 }),
        consumptionForPriority('c2', 3, { pv: 1 }),
        consumptionForPriority('c3', 4, { pv: 1 }),
      ]);
      expect(result.leftoverGenerations).toEqual([]);
    });

    describe('Input validation', () => {
      it('should validate non-integer consumptions', () => {
        const input: ProportionalMatcher.Input = {
          consumptions: [consumptionForSite('1', 1.01, 's1')],
          generations: [],
        };

        expect(() => ProportionalMatcher.match(input)).toThrow();
      });

      it('should validate non-integer generations', () => {
        const input: ProportionalMatcher.Input = {
          consumptions: [],
          generations: [generationForSite('1', 1.01, 's1')],
        };

        expect(() => ProportionalMatcher.match(input)).toThrow();
      });
    });
  });
});
