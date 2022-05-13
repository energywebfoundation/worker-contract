import type { MatchingInput, SerializedMerkleTree, MatchingOutput } from '../../matching/types';

export abstract class VotingService {
  abstract vote(matchingInput: MatchingInput, matchingResult: {merkleTree: SerializedMerkleTree, matchingResult: MatchingOutput}): Promise<void>;
}
