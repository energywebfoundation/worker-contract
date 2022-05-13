import { Injectable } from '@nestjs/common';
import type { MatchingInput, SerializedMerkleTree, MatchingOutput } from '../matching/types';
import { VotingService } from './voting-service/voting.service';

@Injectable()
export class VotingFacade {
  constructor(private votingService: VotingService) {}

  public async vote(matchingInput: MatchingInput, matchingResult: {merkleTree: SerializedMerkleTree, matchingResult: MatchingOutput}) {
    await this.votingService.vote(matchingInput, matchingResult);
  }
}
