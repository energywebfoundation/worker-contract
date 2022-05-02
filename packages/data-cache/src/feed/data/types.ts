import { MatchingResult } from '../../types';

export abstract class DataSource {
  abstract getMatchesByRootHash(matchRootHash: string): Promise<MatchingResult>;
}
