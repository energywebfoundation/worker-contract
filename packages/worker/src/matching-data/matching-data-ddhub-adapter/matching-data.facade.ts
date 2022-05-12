import { Injectable } from '@nestjs/common';
import type { MatchingDataFacade } from '../matching-data.facade';
import type { Preferences, Reading, ReadingQuery } from '../types';
import { MatchingDataDDHubService } from './matching-data-ddhub.service';

@Injectable()
export class MatchingDataDDHubFacade implements MatchingDataFacade {
  constructor(private readonly dataService: MatchingDataDDHubService) {}

  public async getPreferences(): Promise<Preferences> {
    return await this.dataService.getPreferences();
  }

  public async getConsumptions(query: ReadingQuery): Promise<Reading[]> {
    return await this.dataService.getConsumptions(query);
  }

  public async getGenerations(query: ReadingQuery): Promise<Reading[]> {
    return await this.dataService.getGenerations(query);
  }

  public async processData(query: ReadingQuery, match: Function): Promise<void> {
    await this.dataService.processData(query, match);
  }
}
