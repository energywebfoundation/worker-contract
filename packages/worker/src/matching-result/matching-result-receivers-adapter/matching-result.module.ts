import { Module } from '@nestjs/common';
import { MatchingResultReceiversFacade } from './matching-result-receivers.facade';
import { MatchingResultFacade } from '../matching-result.facade';
import type { MatchingResultReceiver} from './types';
import { MATCHING_RESULT_RECEIVERS } from './types';

interface MatchingResultModuleParams {
  receivers: MatchingResultReceiver[]
}

@Module({})
export class MatchingResultReceiversAdapterModule {
  static register(params: MatchingResultModuleParams) {
    return {
      module: MatchingResultReceiversAdapterModule,
      exports: [
        MatchingResultFacade,
      ],
      providers: [
        {
          provide: MATCHING_RESULT_RECEIVERS,
          useValue: params.receivers,
        },
        {
          provide: MatchingResultFacade,
          useClass: MatchingResultReceiversFacade,
        },
      ],
    };
  }
}