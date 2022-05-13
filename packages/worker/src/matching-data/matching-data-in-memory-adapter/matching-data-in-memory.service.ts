import { Injectable } from '@nestjs/common';
import type { Preferences, Reading, ReadingQuery, MatchCallback } from '../types';

export interface InputData {
  consumptions: Reading[];
  generations: Reading[];
  preferences: Preferences;
}

@Injectable()
export class MatchingDataInMemoryService {
  private consumptions: Reading[];
  private generations: Reading[];
  private preferences: Preferences;

  constructor(input: InputData) {
    this.consumptions = input.consumptions;
    this.generations = input.generations;
    this.preferences = input.preferences;
  }

  public async getPreferences(): Promise<Preferences> {
    return this.preferences;
  }

  public async getConsumptions(query: ReadingQuery): Promise<Reading[]> {
    return await this.getReadings(query, this.consumptions);
  }

  public async getGenerations(query: ReadingQuery): Promise<Reading[]> {
    return await this.getReadings(query, this.generations);
  }

  public async processData(query: ReadingQuery, match: MatchCallback): Promise<void> {
    const consumptions = await this.getConsumptions(query);
    const generations = await this.getGenerations(query);
    const preferences = await this.getPreferences();

    await match(consumptions, generations, preferences);
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
