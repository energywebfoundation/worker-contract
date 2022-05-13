import type { ModuleMetadata } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { MatchingFacade } from './matching.facade';
import { MATCHING_ALGO } from './types';
import type { MatchingAlgorithm } from './types';

@Module({})
export class MatchingModule {
  public static register(options: {
    dependendencies: ModuleMetadata['imports'],
    matchingAlgorithm: MatchingAlgorithm
  }) {
    return {
      module: MatchingModule,
      imports: options.dependendencies,
      providers: [
        MatchingFacade,
        {
          provide: MATCHING_ALGO,
          useValue: options.matchingAlgorithm,
        },
      ],
      exports: [MatchingFacade],
    };
  }
}
