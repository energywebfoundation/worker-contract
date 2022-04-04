import { Module } from '@nestjs/common';
import { MatchingDataInMemoryService } from './matching-data-in-memory.service';
import { MatchingDataInMemoryFacade } from './matching-data.facade';
import type { InputData } from './matching-data-in-memory.service';
import { MatchingDataFacade } from '../matching-data.facade';

@Module({})
export class MatchingDataInMemoryAdapterModule {
  public static register(input: InputData) {
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
