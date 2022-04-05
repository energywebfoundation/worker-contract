import { Module } from '@nestjs/common';
import { MatchingDataMockService } from './matching-data-mock.service';
import { MatchingDataFacade } from '../matching-data.facade';
import { MatchingDataMockFacade } from './matching-data.facade';
import { MatchingDataMockController } from './matching-data-mock.controller';

@Module({})
export class MatchingDataMockAdapterModule {
  public static register() {
    return {
      module: MatchingDataMockAdapterModule,
      imports: [],
      exports: [MatchingDataFacade],
      controllers: [MatchingDataMockController],
      providers: [
        {
          provide: MatchingDataFacade,
          useClass: MatchingDataMockFacade,
        },
        MatchingDataMockService,
      ],
    };
  }
}
