import { Body, Controller, Post } from '@nestjs/common';
import type { Reading } from '../types';
import { MatchingDataMockService } from './matching-data-mock.service';

@Controller('matching-data')
export class MatchingDataMockController {
  constructor(private readonly matchingDataService: MatchingDataMockService) {}

  @Post('/consumptions')
  public async storeConsumptions(
    @Body() readings: Reading[],
  ): Promise<void> {
    const consumptions = readings.map(reading => ({
      deviceId: reading.deviceId,
      timestamp: new Date(reading.timestamp),
      volume: reading.volume,
    }));
    await this.matchingDataService.storeConsumptions(consumptions);
  }

  @Post('/generations')
  public async storeGenerations(
    @Body() readings: Reading[],
  ): Promise<void> {
    const generations = readings.map(reading => ({
      deviceId: reading.deviceId,
      timestamp: new Date(reading.timestamp),
      volume: reading.volume,
    }));
    await this.matchingDataService.storeGenerations(generations);
  }
}
