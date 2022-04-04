import type { MatchingDataService } from '../matching-data.service';
import type { Reading, Preferences, ReadingQuery } from '../types';

export class MatchingDataFacade {
  constructor(private matchingDataService: MatchingDataService) {}

  public async getPreferences(): Promise<Preferences> {
    return await this.matchingDataService.getPreferences();
  }

  public async getConsumptions(query: ReadingQuery): Promise<Reading[]> {
    return await this.matchingDataService.getConsumptions(query);
  }

  public async getGenerations(query: ReadingQuery): Promise<Reading[]> {
    return await this.matchingDataService.getGenerations(query);
  }
}
