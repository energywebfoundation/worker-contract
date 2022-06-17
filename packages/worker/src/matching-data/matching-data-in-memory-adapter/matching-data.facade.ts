import { Injectable } from '@nestjs/common';
import type { MatchingInput } from '../types';
import type { MatchingDataFacade } from '../matching-data.facade';
import { MatchingDataInMemoryService } from './matching-data-in-memory.service';

@Injectable()
export class MatchingDataInMemoryFacade implements MatchingDataFacade {
  constructor(private matchingDataService: MatchingDataInMemoryService) {}

  public async withMatchingInput<T>(
    cb: (input: MatchingInput | null) => Promise<T>,
  ): Promise<T> {
    return await cb(await this.matchingDataService.getInput());
  }
}
