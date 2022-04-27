import { Injectable } from '@nestjs/common';
import type { MatchingResult } from '../../types';
import type { DataSource } from './types';

@Injectable()
export class DDHubDataSource implements DataSource {
  constructor(

  ) {}

  async getMatchesByRootHash(): Promise<MatchingResult> {
    return {
      leftoverConsumption: [
        {
          consumerId: 'c1',
          consumerMetadata: {},
          timestamp: new Date(),
          volume: 1,
        },
      ],
      leftoverGeneration: [
        {
          generatorId: 'g1',
          generatorMetadata: {},
          timestamp: new Date(),
          volume: 1,
        },
      ],
      matches: [
        {
          generatorId: 'g1',
          consumerId: 'c1',
          generatorMetadata: {},
          consumerMetadata: {},
          timestamp: new Date(),
          volume: 1,
        },
      ],
    };
  }
}
