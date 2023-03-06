import { Injectable } from '@nestjs/common';
import type { VotingManager } from './types';
import { contracts } from '@energyweb/worker';

@Injectable()
export class VotingManagerBlockchain implements VotingManager {
  constructor(
    private votingContract: contracts.VotingFacet,
  ) { }

  public async getConsensusResultHash(inputHash: string): Promise<string | null> {

    const resultHashes = await this.votingContract.getWinningMatches(inputHash);

    const [hash] = resultHashes.filter(h => Number(h) !== 0)

    return hash ?? null

  }

  public async wasConsensusReached(inputHash: string): Promise<boolean> {
    const hashes = await this.votingContract.getWinningMatches(inputHash);

    return hashes.length > 0;
  }
}
