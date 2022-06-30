import { Injectable } from '@nestjs/common';
import type { MatchingInput } from '../../types';
import type { MatchingDataFacade } from '../matching-data.facade';
import { MatchingDataMockService } from './matching-data-mock.service';

@Injectable()
export class MatchingDataMockFacade implements MatchingDataFacade {
  constructor(private matchingDataService: MatchingDataMockService) {}

  public async withMatchingInput<T>(
    cb: (input: MatchingInput | null) => Promise<T>,
  ): Promise<T> {
    return await cb(await this.matchingDataService.getInput());
  }
}
