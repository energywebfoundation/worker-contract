import { Module } from '@nestjs/common';
import { MatchingResultFacade } from './matching-result.facade';
import type { MatchingResultReceiver} from './types';
import { MATCHING_RESULT_RECEIVERS } from './types';

interface MatchingResultModuleParams {
  receivers: MatchingResultReceiver[]
}

@Module({})
export class MatchingResultModule {
  static register(params: MatchingResultModuleParams) {
    return {
      module: MatchingResultModule,
      exports: [
        MatchingResultFacade,
      ],
      providers: [
        {
          provide: MATCHING_RESULT_RECEIVERS,
          useValue: params.receivers,
        },
        MatchingResultFacade,
      ],
    };
  }
}