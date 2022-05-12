import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MatchingModule, MatchingDataInMemoryAdapterModule, MatchingResultReceiversAdapterModule, matchingResultLogger } from '@energyweb/greenproof-worker';
import { produceData } from './data-producer';
import { matchingAlgorithm } from './algorithm';

@Module({
  imports: [
    MatchingModule.register({
      dependendencies: [
        MatchingDataInMemoryAdapterModule.register(produceData()),
        MatchingResultReceiversAdapterModule.register({
          receivers: [
            matchingResultLogger,
          ],
        }),
      ],
      matchingAlgorithm,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
