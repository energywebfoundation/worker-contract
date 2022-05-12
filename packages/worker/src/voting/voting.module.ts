import { Module } from '@nestjs/common';
import type { BlockchainConfig } from './types';
import { VotingFacade } from './voting.facade';
import { VotingService } from './voting.service';

@Module({})
export class VotingModule {
  public static register(config: BlockchainConfig) {
    return {
      module: VotingModule,
      providers: [
        VotingFacade,
        {
          provide: VotingService,
          useValue: new VotingService({...config}),
        },
      ],
      exports: [VotingFacade],
    };
  }
}
