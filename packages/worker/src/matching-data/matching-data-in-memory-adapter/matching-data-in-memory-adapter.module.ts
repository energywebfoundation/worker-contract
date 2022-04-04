import { Module } from '@nestjs/common';
import { MatchingDataInMemoryService } from './matching-data-in-memory.service';
import { MatchingDataInMemoryFacade } from './matching-data.facade';
import type { InputData } from './matching-data-in-memory.service';
import { MatchingDataFacade } from '../matching-data.facade';

@Module({})
export class MatchingDataInMemoryAdapterModule {
  public static register(input: InputData) {

    const matchingDataService = new MatchingDataInMemoryService(input);

    return {
      module: MatchingDataInMemoryAdapterModule,
      imports: [],
      exports: [MatchingDataFacade],
      controllers: [],
      providers: [
        {
          provide: MatchingDataFacade,
          useValue: new MatchingDataInMemoryFacade(matchingDataService),
        },
        {
          provide: MatchingDataInMemoryService,
          useValue: matchingDataService,
        },
      ],
    };
  }
}
