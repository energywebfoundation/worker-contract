import { Injectable } from '@nestjs/common';
import type { MatchingInput, SerializedMerkleTree, MatchingOutput } from '../../matching/types';
import type { VotingService } from './voting.service';

@Injectable()
export class VotingServiceForTests implements VotingService {
  constructor() {}

  public async vote(matchingInput: MatchingInput, matchingResult: {merkleTree: SerializedMerkleTree, matchingResult: MatchingOutput}) {
  }
}
