import type { MerkleTree as MT, contracts } from '@energyweb/worker';
import { merkleTree } from '@energyweb/worker';
import type { DynamicModule } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { InputInMemoryModule, InputModule } from '../input/input.module';
import { MatchingFacade } from './matching.facade';
import { MatchingService } from './matching/matching.service';
import { MatchingTransformerService } from './matching/matching-transformer.service';
import { MerkleTree } from './merkleTree.service';
import { getMatchingResultKafkaSender } from './receivers/matching-result-kafka.receiver';
import { matchingResultVotingContractSender } from './receivers/matching-result-voting-contract.receiver';
import { MATCHING_RECEIVERS_TOKEN } from './types';
import { MatchingResultService } from './matching/matching-result.service';
import { BatteryService } from './battery/battery.service';
import { VotingManager } from './voting-manager/types';
import { VotingManagerInMemory } from './voting-manager/voting-manager-inmemory.service';
import { VotingManagerBlockchain } from './voting-manager/voting-manager-blockchain.service';
import { MatchingResultRepository } from './matching/matching-result-sqlite.repository';
import { ExternalResultModule, ExternalResultModuleInMemory } from '../results/external-results.module';

interface RegisterOptions {
  votingContract: contracts.VotingFacet
  merkleTree: MT,
}

@Module({})
export class MatchingModule {
  static register(options: RegisterOptions): DynamicModule {
    return {
      module: MatchingModule,
      imports: [InputModule, ExternalResultModule],
      providers: [
        MatchingFacade,
        MatchingService,
        MatchingTransformerService,
        MatchingResultService,
        BatteryService,
        MatchingResultRepository,
        {
          provide: MerkleTree,
          useFactory: () => new MerkleTree(options.merkleTree),
        },
        {
          provide: MATCHING_RECEIVERS_TOKEN,
          useFactory: async () => {
            const kafkaSender = await getMatchingResultKafkaSender();
            return [
              kafkaSender,
              matchingResultVotingContractSender(options.votingContract),
            ];
          },
        },
        {
          provide: VotingManager,
          useFactory: () => new VotingManagerBlockchain(options.votingContract),
        },
      ],
      exports: [MatchingFacade],
    };
  }
}

@Module({
  imports: [InputInMemoryModule, ExternalResultModuleInMemory],
  providers: [
    MatchingFacade,
    MatchingService,
    MatchingTransformerService,
    MatchingResultService,
    BatteryService,
    MatchingResultRepository,
    {
      provide: MerkleTree,
      useFactory: () => new MerkleTree(merkleTree),
    },
    {
      provide: MATCHING_RECEIVERS_TOKEN,
      useFactory: () => [],
    },
    {
      provide: VotingManager,
      useClass: VotingManagerInMemory,
    },
  ],
  exports: [MatchingFacade],
})
export class MatchingInMemoryModule {}
