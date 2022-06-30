import { Inject, Injectable } from '@nestjs/common';
import type { MatchingResultReceiver} from './types';
import { MATCHING_RESULT_RECEIVERS } from './types';
import type { MatchingResultFacade } from '../matching-result.facade';
import { PinoLogger } from 'nestjs-pino';
import deepClone from 'deep-clone';
import type { MatchingInput, MatchingResult } from '../../types';

@Injectable()
export class MatchingResultReceiversFacade implements MatchingResultFacade {
  private logger = new PinoLogger({ renameContext: MatchingResultReceiversFacade.name});

  constructor(
    @Inject(MATCHING_RESULT_RECEIVERS)
    private receivers: MatchingResultReceiver[],
  ) {}

  public async receiveMatchingResult(
    result: MatchingResult,
    input: MatchingInput,
  ) {
    this.logger.info('Receiving matching results.');

    for (const receiver of this.receivers) {
      // Clone result so receiver doesn't modify it accidentaly for another receiver
      const clonedResult = deepClone(result);

      await receiver(clonedResult, input);
    }
    this.logger.info('Receiving of matching results complete.');
  }
}
