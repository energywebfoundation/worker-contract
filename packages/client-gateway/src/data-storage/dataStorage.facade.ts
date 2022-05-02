import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import type { Reading } from '../data-storage/types';
import { DataStorageService } from './dataStorage.service';

@Injectable()
export class DataStorageFacade {
  private logger = new PinoLogger({renameContext: DataStorageFacade.name});

  constructor(private dataStorageService: DataStorageService) {}

  async sendConsumptions(readings: Reading[]): Promise<void> {
    this.logger.info(`Sending ${readings.length} consumptions to data storage.`);

    await this.dataStorageService.sendConsumptions(readings);

    this.logger.info(`${readings.length} consumptions sent to data storage.`);

  }

  async sendGenerations(readings: Reading[]): Promise<void> {
    this.logger.info(`Sending ${readings.length} generations to data storage.`);

    await this.dataStorageService.sendGenerations(readings);

    this.logger.info(`${readings.length} generations sent to data storage.`);
  }
}
