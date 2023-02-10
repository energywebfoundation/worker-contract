import { mapValues, values, zipWith, orderBy } from 'lodash';
import { distributeVolume } from './distribute';
import type { Entity, Match, MatchRoundInput } from './types';

interface Result {
  matches: Match[];
}

/**
 * Single round matching
 *
 * Via paths Consumer knows which Generator it will take energy from.
 *
 * Asks
 * For each Generator Consumer will create an ask for an energy.
 * An ask volume is proportional to the amount of energy the generator
 * relatively to other generators he is going to create asks for.
 *
 * Matches
 * Each generator saves ask for it, and from that creates matches.
 * The match volume is proportional to the amount of the ask
 * relatively to other asks amounts.
 *
 * @example
 * all consumers have paths to all generators
 * ConsumerA: 24
 * ConsumerB: 12
 * GeneratorA: 10
 * GeneratorB: 20
 *
 * Ask 1: ConsumerA-GeneratorA, volume: 8 (24 * (10/30))
 * Ask 2: ConsumerA-GeneratorB, volume: 16 (24 * (20/30))
 * Ask 3: ConsumerB-GeneratorA, volume: 4 (12 * (10/30))
 * Ask 4: ConsumerB-GeneratorB, volume: 8 (12 * (20/30))
 *
 * Match 1: ConsumerA-GeneratorA, volume: 10 * (8/12)
 * Match 2: ConsumerA-GeneratorB, volume: 20 * (16/24)
 * Match 3: ConsumerB-GeneratorA, volume: 10 * (4/12)
 * Match 4: ConsumerB-GeneratorB, volume: 20 * (8/24)
 */
export const matchRound = (input: MatchRoundInput): Result => {
  const consumers = mapValues(input.consumptions, c => new Consumer(c));
  const generators = mapValues(input.generations, g => new Generator(g));

  input.paths.forEach(path => {
    const consumer = consumers[path.consumptionId];
    const generator = generators[path.generationId];

    if (consumer && generator) {
      consumer.addGenerator(generator);
    }
  });

  values(consumers).forEach(c => c.createAsks());

  const matches = values(generators).flatMap(c => c.getMatches());

  return {
    matches,
  };
};

interface GeneratorAsk {
  consumer: Consumer;
  volume: number;
}

class Generator {
  private asks: GeneratorAsk[] = [];

  constructor(private entity: Entity) {}

  public get volume() { return this.entity.volume; }

  public addAsk(ask: GeneratorAsk) {
    this.asks.push(ask);
  }

  public getMatches(): Match[] {
    // Sort asks, because then distributeVolume provides better results (see function comment)
    const sortedAsks = orderBy(this.asks, [g => g.volume], ['desc']);
    const asksVolumes = sortedAsks.map(a => a.volume);
    const distributedVolume = distributeVolume(this.entity.volume, asksVolumes, true);

    return zipWith(sortedAsks, distributedVolume, (ask, volume) => ({
      consumptionId: ask.consumer.id,
      generationId: this.entity.id,
      volume,
    }));
  }
}

class Consumer {
  private generators: Generator[] = [];

  constructor(
    private entity: Entity,
  ) {}

  public get id() { return this.entity.id; }

  public addGenerator(generator: Generator) {
    this.generators.push(generator);
  }

  public createAsks() {
    // Sort generators, because then distributeVolume provides better results (see function comment)
    const sortedGenerators = orderBy(this.generators, [g => g.volume], ['desc']);
    const generatorVolumes = sortedGenerators.map(g => g.volume);
    const distributedVolume = distributeVolume(this.entity.volume, generatorVolumes, false);

    const generatorsWithVolume = zipWith(sortedGenerators, distributedVolume, (generator, volume) => ({
      generator,
      volume,
    }));

    generatorsWithVolume.forEach(g => {
      // with 0 asks we generate matches with a volume = NaN
      if (g.volume > 0) {
        g.generator.addAsk({
          consumer: this,
          volume: g.volume,
        });
      }
    });
  }
}
