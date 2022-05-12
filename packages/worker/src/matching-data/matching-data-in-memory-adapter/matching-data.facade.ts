import { Injectable, NotImplementedException } from '@nestjs/common';
import type { Reading, Preferences, ReadingQuery } from '../types';
import type { MatchingDataFacade } from '../matching-data.facade';
import { MatchingDataInMemoryService } from './matching-data-in-memory.service';

@Injectable()
export class MatchingDataInMemoryFacade implements MatchingDataFacade {
  constructor(private matchingDataService: MatchingDataInMemoryService) {}

  public async getPreferences(): Promise<Preferences> {
    return await this.matchingDataService.getPreferences();
  }

  public async getConsumptions(query: ReadingQuery): Promise<Reading[]> {
    return await this.matchingDataService.getConsumptions(query);
  }

  public async getGenerations(query: ReadingQuery): Promise<Reading[]> {
    return await this.matchingDataService.getGenerations(query);
  }

  public async processData(query: ReadingQuery, match: Function): Promise<void> {
    return await this.matchingDataService.processData(query, match);
  }
}
