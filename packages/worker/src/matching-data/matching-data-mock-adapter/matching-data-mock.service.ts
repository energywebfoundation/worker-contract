import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import type { Preferences, Reading, ReadingQuery } from '../types';

@Injectable()
export class MatchingDataMockService {
  private consumptions: Reading[] = [];
  private generations: Reading[] = [];
  private preferences!: Preferences;
  private logger = new PinoLogger({renameContext: MatchingDataMockService.name});

  constructor() {}

  public async getPreferences(): Promise<Preferences> {
    return this.preferences;
  }

  public async getConsumptions(query: ReadingQuery): Promise<Reading[]> {
    this.logger.info('Getting consumptions', query);

    const consumptions = await this.getReadings(query, this.consumptions);
    this.logger.info(`Found ${consumptions.length} consumptions`, query);

    return consumptions;
  }

  public async storeConsumptions(readings: Reading[]): Promise<void> {
    this.consumptions.push(...readings);
    this.logger.info(`Stored ${readings.length} new consumptions.`);
  }

  public async getGenerations(query: ReadingQuery): Promise<Reading[]> {
    this.logger.info('Getting generations', query);

    const generations = await this.getReadings(query, this.generations);
    this.logger.info(`Found ${generations.length} generations`, query);

    return generations;
  }

  public async storeGenerations(readings: Reading[]): Promise<void> {
    this.generations.push(...readings);
  }

  public async processData(query: ReadingQuery, match: Function): Promise<void> {
    const consumptions = this.getConsumptions(query);
    const generations = this.getGenerations(query);
    const preferences = this.getPreferences();

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
