import type { MatchingInput } from '../types';

export abstract class MatchingDataFacade {
  public abstract withMatchingInput<T>(
    cb: (input: MatchingInput | null) => Promise<T>
  ): Promise<T>;
}
