import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MatchingModule, MatchingResultReceiversAdapterModule, matchingResultLogger, MatchingDataDDHubAdapterModule, matchingResultDDHubSender } from 'greenproof-worker';
import { matchingAlgorithm } from './algorithm';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MatchingModule.register({
      dependendencies: [
        MatchingDataDDHubAdapterModule.register(),
        MatchingResultReceiversAdapterModule.register({
          receivers: [
            matchingResultLogger,
            matchingResultDDHubSender,
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
