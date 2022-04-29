import { Inject, Injectable } from '@nestjs/common';
import type { MatchingResultReceiver} from './types';
import { MATCHING_RESULT_RECEIVERS } from './types';
import type { MatchingResultFacade } from '../matching-result.facade';
import type { MatchingResult } from '../types';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class MatchingResultReceiversFacade implements MatchingResultFacade {
  private logger = new PinoLogger({ renameContext: MatchingResultReceiversFacade.name});
  constructor(
    @Inject(MATCHING_RESULT_RECEIVERS)
    private receivers: MatchingResultReceiver[],
  ) {}

  public async receiveMatchingResult(
    result: MatchingResult,
  ) {
    this.logger.info('Receiving matching results.');

    for (const receiver of this.receivers) {
      // Clone result so receiver doesn't modify it accidentaly for another receiver
      const clonedResult = JSON.parse(JSON.stringify(result));

      await receiver(clonedResult);
    }
    this.logger.info('Receiving of matching results complete.');
  }
}
