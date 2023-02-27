import { Module } from '@nestjs/common';
import type {
  MerkleTree,
} from '@energyweb/greenproof-worker';
import { AppService } from './app.service';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { MatchingModule } from './matching/matching.module';
import { DatabaseKyselyModule } from './kysely/db.module';
import { InputModule } from './input/input.module';
import { ExternalResultModule } from './results/external-results.module';
import type { contracts } from '@energyweb/greenproof-worker';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({})
export class AppModule {
  static register({
    votingContract,
    merkleTree,
  }: {
    merkleTree: MerkleTree
    votingContract: contracts.VotingFacet
  }) {
    return {
      module: AppModule,
      imports: [
        LoggerModule.forRoot(),
        ScheduleModule.forRoot(),
        MatchingModule.register({
          votingContract,
          merkleTree,
        }),
        InputModule,
        ExternalResultModule,
        DatabaseKyselyModule.forRoot(),
        EventEmitterModule.forRoot(),
      ],
      providers: [AppService],
    };
  }
}
