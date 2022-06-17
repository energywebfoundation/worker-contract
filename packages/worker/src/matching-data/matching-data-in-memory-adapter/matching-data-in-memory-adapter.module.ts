import { Module } from '@nestjs/common';
import { MatchingDataInMemoryService } from './matching-data-in-memory.service';
import { MatchingDataInMemoryFacade } from './matching-data.facade';
import { MatchingDataFacade } from '../matching-data.facade';
import type { MatchingInput } from '../types';

@Module({})
export class MatchingDataInMemoryAdapterModule {
  public static register(input: MatchingInput) {
    return {
      module: MatchingDataInMemoryAdapterModule,
      imports: [],
      exports: [MatchingDataFacade],
      controllers: [],
      providers: [
        {
          provide: MatchingDataFacade,
          useClass: MatchingDataInMemoryFacade,
        },
        {
          provide: MatchingDataInMemoryService,
          useValue: new MatchingDataInMemoryService(input),
        },
      ],
    };
  }
}
