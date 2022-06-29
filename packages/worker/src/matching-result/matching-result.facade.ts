import type { MatchingInput, MatchingResult } from '../types';

export abstract class MatchingResultFacade {
  public abstract receiveMatchingResult(
    result: MatchingResult,
    input: MatchingInput
  ): Promise<void>;
}
