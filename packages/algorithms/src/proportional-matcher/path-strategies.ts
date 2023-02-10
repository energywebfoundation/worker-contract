import { values } from 'lodash';
import { groupBy } from './helpers';
import type { PathPredicate } from './path-predicates';
import type { EntityConsumption, EntityGeneration, MatchPath, PathStrategy } from './types';

/**
 * Builds paths depending on energy priority.
 * Each consumer has different priority for given energy type.
 * For every consumers for given priority level find all generators,
 * that are of given energy type
 * and create paths between consumers and generators.
 */
export const energyPriorityPathStrategy =
  (currentPriority: number): PathStrategy => ({
    name: `Energy priority (level: ${currentPriority})`,
    execute: (payload): MatchPath[] => {
      const generationsByEnergy = groupBy(values(payload.generations), 'energyType');

      return values(payload.consumptions).flatMap(c => {
        const energyTypes = c.energyPriorities
          .filter(p => p.priority === currentPriority)
          .map(p => p.energyType);

        const generations = energyTypes.map(type => {
          // Required type of generation may not be present in generations
          return generationsByEnergy[type] ?? [];
        }).flat();

        return generations.map(g => ({
          consumptionId: c.id,
          generationId: g.id,
        }));
      });
    },
  });

/**
 * The same strategy as energyPriorityPathStrategy but predicates that filter out some paths from the result.
 */
export const energyPriorityWithPredicatePathStrategy =
  (currentPriority: number, predicate: PathPredicate): PathStrategy => ({
    name: `Energy priority (level: ${currentPriority}, predicate: ${predicate.name})`,
    execute: (payload): MatchPath[] => {
      const allPaths = energyPriorityPathStrategy(currentPriority).execute(payload);

      return allPaths.filter(path => {
        const consumption = payload.consumptions[path.consumptionId];
        const generation = payload.generations[path.generationId];

        return predicate.execute(consumption, generation);
      });
    },
  });

/**
 * Builds paths for all possible combinations
 */
export const cartesianPathStrategy =
  (): PathStrategy => ({
    name: 'Cartesian product',
    execute: (payload): MatchPath[] => {
      const consumptions = values(payload.consumptions);
      const generations = values(payload.generations);

      return consumptions.flatMap(c => generations.map(g => ({
        consumptionId: c.id,
        generationId: g.id,
      })));
    },
  });


/**
 * Builds paths for consumptions and generations in the same site.
 */
export const sitePathStrategy =
  (): PathStrategy => ({
    name: 'Site',
    execute: (payload): MatchPath[] => {
      const generationsBySite = groupBy(values(payload.generations), 'siteId');

      return values(payload.consumptions).flatMap(c => {
        const generationsInSite = generationsBySite[c.siteId] ?? [];

        return generationsInSite.map(g => ({
          consumptionId: c.id,
          generationId: g.id,
        }));
      });
    },
  });


/**
 * Builds paths for consumptions and generations in the same region.
 */
export const regionPathStrategy =
  (): PathStrategy => ({
    name: 'Region',
    execute: (payload): MatchPath[] => {
      const generationsByRegion = groupBy(values(payload.generations), 'regionId');

      return values(payload.consumptions).flatMap(c => {
        if (!c.shouldMatchByRegion) {
          return [];
        }

        const generationsInRegion = generationsByRegion[c.regionId] ?? [];

        return generationsInRegion.map(g => ({
          consumptionId: c.id,
          generationId: g.id,
        }));
      });
    },
  });

