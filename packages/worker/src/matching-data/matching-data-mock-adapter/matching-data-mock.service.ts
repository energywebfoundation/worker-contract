import { Injectable } from '@nestjs/common';
import type { Preferences, Reading, ReadingQuery } from '../types';

@Injectable()
export class MatchingDataMockService {
  private consumptions: Reading[] = [];
  private generations: Reading[] = [];
  private preferences: Preferences;

  constructor() {}

  public async getPreferences(): Promise<Preferences> {
    return this.preferences;
  }

  public async getConsumptions(query: ReadingQuery): Promise<Reading[]> {
    return await this.getReadings(query, this.consumptions);
  }

  public async storeConsumptions(readings: Reading[]): Promise<void> {
    this.consumptions.push(...readings);
  }

  public async getGenerations(query: ReadingQuery): Promise<Reading[]> {
    return await this.getReadings(query, this.generations);
  }

  public async storeGenerations(readings: Reading[]): Promise<void> {
    this.generations.push(...readings);
  }

  private async getReadings(
    query: ReadingQuery,
    dataset: Reading[],
  ): Promise<Reading[]> {
    const readingWithinLowerBound = (reading: Reading): boolean => {
      if (!query.from) {
        return true;
      }
      return reading.timestamp >= query.from ? true : false;
    };

    const readingWithinUpperBound = (reading: Reading): boolean => {
      if (!query.to) {
        return true;
      }
      return reading.timestamp <= query.to ? true : false;
    };

    const correctDevice = (reading: Reading) => {
      if (!query.deviceIds) {
        return true;
      }
      return query.deviceIds.includes(reading.deviceId);
    };

    return dataset.filter(
      (reading) =>
        correctDevice(reading) &&
        readingWithinLowerBound(reading) &&
        readingWithinUpperBound(reading),
    );
  }
}
