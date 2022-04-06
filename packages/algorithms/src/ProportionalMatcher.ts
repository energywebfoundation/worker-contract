import { BigNumber } from '@ethersproject/bignumber';
import { cloneDeep } from 'lodash';

export namespace ProportionalMatcher {
  export interface Entity {
    id: string;
    volume: BigNumber;
  }

  export interface Params<S extends Entity, T extends Entity> {
    sources: S[];
    targets: T[];
    targetWeights: {
      targetId: string;
      sourceId: string;
      weight: number;
    }[];
  }

  interface Match<S extends Entity, T extends Entity> {
    source: Ent<S>;
    target: Ent<T>;
    volume: BigNumber;
  }

  export interface ResultMatch<S extends Entity, T extends Entity> {
    source: S;
    target: T;
    volume: BigNumber;
  }

  export interface Result<S extends Entity, T extends Entity> {
      matches: ResultMatch<S, T>[];
      roundMatches: ResultMatch<S, T>[][];
      leftoverSources: S[];
      leftoverTargets: T[];
  }

  export const proportionalMatcher = <S extends Entity, T extends Entity>(
    originalData: Params<S, T>
  ): Result<S, T> => {
    const targets = originalData.targets.map((target) => {
      return new Ent(target);
    });

    const sources = originalData.sources.map((source) => {
      return new Ent(source);
    })

    const routes = originalData.targetWeights.map((targetWeight) => {
      /** @TODO handle not found targets or sources */
      /** @TODO handle multiple matching targets and sources */
      return new Route(
        targets.find(t => t.id === targetWeight.targetId)!,
        sources.find(s => s.id === targetWeight.sourceId)!,
        targetWeight.weight,
      );
    });

    const roundMatches = [] as Match<S, T>[][];

    while (routes.some(r => r.hasPossibleMatch())) {
      roundMatches.push(match(routes));
    }

    const mappedMatches = roundMatches.map(round => round.map((match) => {
      return {
        volume: match.volume,
        source: match.source.entity,
        target: match.target.entity,
      }
    }));

    return {
      roundMatches: mappedMatches,
      matches: mappedMatches.flat(),
      leftoverSources: sources.filter(s => s.volume.gt(0)).map(s => s.entity),
      leftoverTargets: targets.filter(t => t.volume.gt(0)).map(t => t.entity),
    };
  }

  const match = <S extends Entity, T extends Entity>(routes: Route<S, T>[]) => {
    /** @TODO assign in order of weights */
    const matches = routes.map(route => {
      const matchResult = route.match();

      matchResult.source.reduceVolume(matchResult.volume);
      matchResult.target.reduceVolume(matchResult.volume);

      return matchResult;
    });

    return matches.filter(m => m.volume.gt(0));
  }

  class Ent<P extends Entity> {
    public readonly entity: P;

    constructor (entity: P) {
      this.entity = cloneDeep(entity);
    }
    
    public get id() {
      return this.entity.id;
    }

    public get volume() {
      return this.entity.volume;
    }

    public reduceVolume(volume: BigNumber) {
      this.entity.volume = this.entity.volume.sub(volume);
    }
  }

  class Route<S extends Entity, T extends Entity> {
    constructor (
      private target: Ent<T>,
      private source: Ent<S>,
      private weight: number,
    ) {}

    public match(): Match<S, T> {
      return {
        volume: bigNumberMin(BigNumber.from(this.weight), this.target.volume, this.source.volume),
        source: this.source,
        target: this.target,
      }
    }

    public hasPossibleMatch(): boolean {
      return this.target.volume.gt(0) && this.source.volume.gt(0);
    }
  }

  const bigNumberMin = (...nums: BigNumber[]): BigNumber => {
    return nums.reduce((min, n) => n.lt(min) ? n : min, nums[0])
  }
}