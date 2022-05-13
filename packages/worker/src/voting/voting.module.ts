import { Module } from '@nestjs/common';
import type { BlockchainConfig} from './types';
import { VotingService } from './voting-service/voting.service';
import { VotingFacade } from './voting.facade';
import { BlockchainVotingService } from './voting-service/blockchain-voting.service';

@Module({})
export class VotingModule {
  public static register(config: BlockchainConfig) {
    return {
      module: VotingModule,
      providers: [
        VotingFacade,
        {
          provide: VotingService,
          useValue: new BlockchainVotingService({...config}),
        },
      ],
      exports: [VotingFacade],
    };
  }
}
