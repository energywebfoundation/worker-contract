import { Module } from '@nestjs/common';
import { MatchingDataInMemoryService } from './adapters/matching-data-in-memory.service';
import { MatchingDataFacade } from './matching-data.facade';
import { MatchingDataService } from './matching-data.service';

@Module({
  imports: [],
  exports: [
    MatchingDataFacade
  ],
  controllers: [],
  providers: [
    MatchingDataFacade,
    {
      provide: MatchingDataService,
      useClass: MatchingDataInMemoryService
    }
  ],
})
export class MatchingDataModule {}
