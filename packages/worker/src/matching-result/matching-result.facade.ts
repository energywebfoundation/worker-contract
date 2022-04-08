import type { MatchingResult } from './types';

export abstract class MatchingResultFacade {
  public abstract receiveMatchingResult(result: MatchingResult): Promise<void>;
}
