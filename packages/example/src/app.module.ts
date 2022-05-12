import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MatchingModule, MatchingResultReceiversAdapterModule, matchingResultLogger, MatchingDataDDHubAdapterModule, matchingResultDDHubSender, VotingModule } from 'greenproof-worker';
import { matchingAlgorithm } from './algorithm';
import { ScheduleModule } from '@nestjs/schedule';
const { join } = require('path');
const { config } = require('dotenv');

config({ path: join(__dirname, '..', '.env') });

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MatchingModule.register({
      dependendencies: [
        VotingModule.register({
          rpcHost: process.env.RPC_HOST!,
          contractAddress: process.env.CONTRACT_ADDRESS!,
          workerPrivateKey: process.env.WORKER_PRIVATE_KEY!,
        }),
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
