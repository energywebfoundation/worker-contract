import { Injectable } from '@nestjs/common';
import type { VotingManager } from './types';
import { contracts } from '@energyweb/greenproof-worker';

@Injectable()
export class VotingManagerBlockchain implements VotingManager {
  constructor(
    private votingContract: contracts.VotingFacet,
  ) { }

  public async getConsensusResultHash(inputHash: string): Promise<string | null> {

    const resultHash = await this.votingContract.getWinningMatch(inputHash);

    return Number(resultHash) === 0 ? null : resultHash;
  }

  public async wasConsensusReached(inputHash: string): Promise<boolean> {
    const hash = await this.votingContract.getWinningMatch(inputHash);

    return Number(hash) !== 0;
  }
}
