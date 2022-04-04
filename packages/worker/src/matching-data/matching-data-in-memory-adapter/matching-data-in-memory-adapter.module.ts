import { Module } from '@nestjs/common';
import { MatchingDataService } from '../matching-data.service';
import { MatchingDataInMemoryService } from './matching-data-in-memory.service';
import { MatchingDataFacade } from './matching-data.facade';
import type { InputData } from './matching-data-in-memory.service';

@Module({})
export class MatchingDataInMemoryAdapterModule {
  public static register(input: InputData) {
    return {
      module: MatchingDataInMemoryAdapterModule,
      imports: [],
      exports: [
        MatchingDataFacade,
      ],
      controllers: [],
      providers: [
        MatchingDataFacade,
        {
          provide: MatchingDataService,
          useValue: new MatchingDataInMemoryService(input),
        },
      ],
    };
  }
}
