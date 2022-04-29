import { Injectable } from '@nestjs/common';
import type { MatchingResult } from '../../types';
import type { DataSource } from './types';

@Injectable()
export class DDHubDataSource implements DataSource {
  constructor() {}

  async getMatchesByRootHash(): Promise<MatchingResult> {
    return {
      leftoverConsumption: [],
      leftoverGeneration: [],
      matches: [],
    };
  }
}
