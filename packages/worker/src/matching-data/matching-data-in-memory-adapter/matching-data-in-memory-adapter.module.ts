import { Module } from '@nestjs/common';
import { MatchingDataService } from '../matching-data.service';
import { MatchingDataInMemoryService } from './matching-data-in-memory.service';
import { MatchingDataFacade } from './matching-data.facade';

@Module({
  imports: [],
  exports: [
    MatchingDataFacade,
  ],
  controllers: [],
  providers: [
    MatchingDataFacade,
    {
      provide: MatchingDataService,
      useClass: MatchingDataInMemoryService,
    },
  ],
})
export class MatchingDataInMemoryAdapterModule {}
