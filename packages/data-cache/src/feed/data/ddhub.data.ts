import { Injectable } from '@nestjs/common';
import { MatchingResult } from '../../types';
import { DataSource } from './types';

@Injectable()
export class DDHubDataSource implements DataSource {
  constructor(
    
  ) {}

  async getMatchesByRootHash(): Promise<MatchingResult> {
    return {
      leftoverConsumption: [],
      leftoverGeneration: [],
      matches: [],
    };
  }
}
