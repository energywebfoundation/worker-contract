import { Module } from '@nestjs/common';
import { MatchingDataFacade } from '../matching-data.facade';
import { MatchingDataDDHubService } from './matching-data-ddhub.service';
import { MatchingDataDDHubFacade } from './matching-data.facade';

@Module({})
export class MatchingDataDDHubAdapterModule {
  public static register() {
    return {
      module: MatchingDataDDHubAdapterModule,
      imports: [],
      exports: [MatchingDataFacade],
      controllers: [],
      providers: [
        {
          provide: MatchingDataFacade,
          useClass: MatchingDataDDHubFacade,
        },
        MatchingDataDDHubService,
      ],
    };
  }
}
