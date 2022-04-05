import { Inject, Injectable } from '@nestjs/common';
import type { MatchingResult, MatchingResultReceiver} from './types';
import { MATCHING_RESULT_RECEIVERS } from './types';

@Injectable()
export class MatchingResultFacade {
  constructor(
    @Inject(MATCHING_RESULT_RECEIVERS)
    private receivers: MatchingResultReceiver[],
  ) {}

  public async receiveMatchingResult(
    result: MatchingResult,
  ) {
    for (const receiver of this.receivers) {
      // Clone result so receiver doesn't modify it accidentaly for another receiver
      const clonedResult = JSON.parse(JSON.stringify(result));

      await receiver(clonedResult);
    }
  }
}
