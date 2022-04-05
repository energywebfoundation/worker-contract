import { Module } from '@nestjs/common';
import { MatchingFacade } from './matching.facade';
import { MATCHING_ALGO } from './types';
import type { MatchingAlgorithm} from './types';

@Module({})
export class MatchingModule {
  public static register(options: {
    dependendencies: Function[]
    matchingAlgorithm: MatchingAlgorithm
  }) {
    return {
      module: MatchingModule,
      imports: options.dependendencies,
      provide: [
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
