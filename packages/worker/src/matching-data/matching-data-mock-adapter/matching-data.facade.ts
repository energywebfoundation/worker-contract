import { Injectable } from '@nestjs/common';
import type { Reading, Preferences, ReadingQuery, MatchCallback } from '../types';
import type { MatchingDataFacade } from '../matching-data.facade';
import { MatchingDataMockService } from './matching-data-mock.service';

@Injectable()
export class MatchingDataMockFacade implements MatchingDataFacade {
  constructor(private matchingDataService: MatchingDataMockService) {}

  public async getPreferences(): Promise<Preferences> {
    return await this.matchingDataService.getPreferences();
  }

  public async getConsumptions(query: ReadingQuery): Promise<Reading[]> {
    return await this.matchingDataService.getConsumptions(query);
  }

  public async getGenerations(query: ReadingQuery): Promise<Reading[]> {
    return await this.matchingDataService.getGenerations(query);
  }

  public async processData(query: ReadingQuery, match: MatchCallback): Promise<void> {
    return await this.matchingDataService.processData(query, match);
  }
}
