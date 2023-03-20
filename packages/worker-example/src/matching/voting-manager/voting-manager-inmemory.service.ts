import { Injectable } from '@nestjs/common';
import type { VotingManager } from './types';

@Injectable()
export class VotingManagerInMemory implements VotingManager {
  public async getConsensusResultHash(inputHash: string): Promise<string | null> {
    return null;
  }

  public async wasConsensusReached(inputHash: string): Promise<boolean> {
    return false;
  }
}
