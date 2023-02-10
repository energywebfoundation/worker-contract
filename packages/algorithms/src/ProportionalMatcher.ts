import { cloneDeep, identity, last, orderBy, uniq, values } from 'lodash';
import { cartesianPathStrategy, energyPriorityWithPredicatePathStrategy, sitePathStrategy } from './proportional-matcher/path-strategies';
import { filterRecord, groupByUnique, loopUntil } from './proportional-matcher/helpers';
import { matchRound } from './proportional-matcher/match-round';
import { sumMatches } from './proportional-matcher/sum-matches';
import type { EntityConsumption, EntityGeneration, Match, PathStrategy } from './proportional-matcher/types';
import { anyRegionPredicate, noRegionPredicate, or, otherCountryPredicate, sameCountryPredicate, sameRegionPredicate } from './proportional-matcher/path-predicates';

export namespace ProportionalMatcher {
  export interface Input {
    consumptions: EntityConsumption[];
    generations: EntityGeneration[];
  }

  export interface StrategyResult {
    strategyName: string;
    matches: Match[];
  }

  export interface Result {
    matches: Match[];
    leftoverConsumptions: EntityConsumption[];
    leftoverGenerations: EntityGeneration[];
    strategyResults: StrategyResult[];
  }

  /**
   * Creates matches for generations and consumptions.
   * Each consumer is matched with generators using strategies.
   * Strategy determines only which consumer is matched with each generator.
   * Algorithm goes over all strategies in order, therefore first strategy (e.g. match by the same siteId)
   * has highest priority, and last strategy (e.g. match everything with everything) has lowest priority.
   *
   * The value (the match) computed during executing strategy depends on the consumer volume, and volumes
   * of the generators the consumer is connected to (via strategy). The bigger the generator volume,
   * the greater (proportional) **ask** is created for this generator.
   * Then each generator goes through all asks it received, and proportionally to the ask volume
   * it produces final match.
   */
  export const match = (input: Input): Result => {
    validateInput(input);

    const inputClone = cloneDeep(input);
    const groupedConsumptions = groupByUnique(inputClone.consumptions, 'id');
    const groupedGenerations = groupByUnique(inputClone.generations, 'id');

    const allPriorityLevels = inputClone.consumptions.flatMap(c => c.energyPriorities.map(p => p.priority));
    const sortedPriorityLevels = orderBy(uniq(allPriorityLevels), [identity], ['desc']);

    const pathStrategies = [
      sitePathStrategy(),
      ...sortedPriorityLevels.map(
        p => energyPriorityWithPredicatePathStrategy(p, sameRegionPredicate),
      ),
      ...sortedPriorityLevels.map(
        p => energyPriorityWithPredicatePathStrategy(p, sameCountryPredicate),
      ),
      ...sortedPriorityLevels.map(
        p => energyPriorityWithPredicatePathStrategy(p, otherCountryPredicate),
      ),
    ];

    const initialConditions = {
      leftoverConsumptions: groupedConsumptions,
      leftoverGenerations: groupedGenerations,
      matches: [] as Match[],
      strategyResults: [] as StrategyResult[],
    };

    // Go over all strategies and collect the results from them.
    // Leftovers from previous strategy are used as input for next strategy.
    const results = pathStrategies.reduce((result, pathStrategy) => {
      const strategyResult = loopUntil(() => executeStrategy({
        groupedConsumptions: result.leftoverConsumptions,
        groupedGenerations: result.leftoverGenerations,
        pathStrategy,
      }), ({ matches }) => {
        // Repeat strategy until it provides no more matches
        return matches.length === 0;
      });

      const newMatches = strategyResult.map(r => r.matches).flat();

      return {
        matches: result.matches.concat(newMatches),
        leftoverConsumptions: last(strategyResult)?.leftoverConsumptions ?? result.leftoverConsumptions,
        leftoverGenerations: last(strategyResult)?.leftoverGenerations ?? result.leftoverGenerations,
        strategyResults: result.strategyResults.concat({
          matches: sumMatches(newMatches),
          strategyName: pathStrategy.name,
        }),
      } as typeof initialConditions;
    }, initialConditions);

    return {
      matches: sumMatches(results.matches),
      leftoverConsumptions: values(results.leftoverConsumptions),
      leftoverGenerations: values(results.leftoverGenerations),
      strategyResults: results.strategyResults,
    };
  };

  /**
   * 1. Filter entities (so we don't use volumes smaller or equal to 0) - they may come from previous rounds theoretically, this is additional sanity check
   * 2. Create paths using given strategy
   * 3. Sum matches and return filtered results
   */
  const executeStrategy = (p: {
    groupedConsumptions: Record<string, EntityConsumption>,
    groupedGenerations: Record<string, EntityGeneration>,
    pathStrategy: PathStrategy,
  }) => {
    const filteredConsumptions = filterRecord(p.groupedConsumptions, c => c.volume > 0);
    const filteredGenerations = filterRecord(p.groupedGenerations, c => c.volume > 0);

    const paths = p.pathStrategy.execute({
      consumptions: filteredConsumptions,
      generations: filteredGenerations,
    });

    const { matches } = matchRound({
      consumptions: filteredConsumptions,
      generations: filteredGenerations,
      paths,
    });

    const summedMatches = sumMatches(matches);

    // Reduce volume in original consumptions and generations
    summedMatches.forEach(match => {
      filteredConsumptions[match.consumptionId].volume -= match.volume;
      filteredGenerations[match.generationId].volume -= match.volume;
    });

    return {
      matches: summedMatches,
      leftoverConsumptions: filterRecord(filteredConsumptions, c => c.volume > 0),
      leftoverGenerations: filterRecord(filteredGenerations, c => c.volume > 0),
    };
  };

  const validateInput = (input: Input): void => {
    const errors: string[] = [];

    const nonIntegerConsumptions = input.consumptions.filter(c => !Number.isInteger(c.volume));
    const nonIntegerGenerations = input.generations.filter(c => !Number.isInteger(c.volume));

    if (nonIntegerConsumptions.length > 0) {
      errors.push('Consumptions are not integers: ' + nonIntegerConsumptions.map(c => c.id).join(', '));
    }

    if (nonIntegerGenerations.length > 0) {
      errors.push('Generations are not integers: ' + nonIntegerGenerations.map(c => c.id).join(', '));
    }

    if (errors.length > 0) {
      throw new Error('Cannot perform matching due to errors: ' + errors.join(';'));
    }
  };
}
