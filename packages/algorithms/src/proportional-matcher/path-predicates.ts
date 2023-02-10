import type { EntityConsumption, EntityGeneration } from './types';

/**
 * Various predicates for building matching logic
 * You can combine them with `and` and `or` functions
 */

export interface PathPredicate {
  name: string;
  execute: (consumption: EntityConsumption, generation: EntityGeneration) => boolean;
}

export const and = (...predicates: PathPredicate[]): PathPredicate => ({
  name: `and(${predicates.map(p => p.name).join(', ')})`,
  execute: (c, g) => predicates.every(p => p.execute(c, g)),
});

export const or = (...predicates: PathPredicate[]): PathPredicate => ({
  name: `or(${predicates.map(p => p.name).join(', ')})`,
  execute: (c, g) => predicates.some(p => p.execute(c, g)),
});

export const sameRegionPredicate: PathPredicate = {
  name: 'sameRegion',
  execute: (c, g) => c.shouldMatchByRegion && c.regionId === g.regionId,
};

export const anyRegionPredicate: PathPredicate = {
  name: 'anyRegion',
  execute: (c, g) => c.shouldMatchByRegion,
};

export const noRegionPredicate: PathPredicate = {
  name: 'noRegion',
  execute: (c, g) => !c.shouldMatchByRegion,
};

export const sameCountryPredicate: PathPredicate = {
  name: 'sameCountry',
  execute: (c, g) => c.shouldMatchByCountry && c.countryId === g.countryId,
};

export const otherCountryPredicate: PathPredicate = {
  name: 'otherCountry',
  execute: (c, g) => c.shouldMatchByOtherCountries && c.countryId !== g.countryId,
};

