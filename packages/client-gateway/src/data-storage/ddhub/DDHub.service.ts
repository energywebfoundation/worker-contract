import { Injectable, InternalServerErrorException } from '@nestjs/common';
import type { Reading } from '../types';
import type { DataStorageService } from '../dataStorage.service';
import axios from 'axios';
import { PinoLogger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config'

@Injectable()
export class DDHubService implements DataStorageService {
  private logger = new PinoLogger({renameContext: DDHubService.name});

  constructor(private configService: ConfigService){}

  async sendConsumptions(readings: Reading[]): Promise<void> {
    const topic = 'consumptions';

    this.logger.info({msg: 'Sending consumptions to DDHub', topic, url: `${this.configService.get<string>('DDHUB_URL')}/message`});

    await this.sendMessageRequest(readings, topic);

    this.logger.info('Consumptions sent.');
  }

  async sendGenerations(readings: Reading[]): Promise<void> {
    const topic = 'generations';

    this.logger.info('Sending generations to DDHub', {topic}, {url: `${this.configService.get<string>('DDHUB_URL')}/message`});

    await this.sendMessageRequest(readings, topic);

    this.logger.info('Generations sent.');
  }

  private async sendMessageRequest(readings: Reading[], topic: string): Promise<void> {
    try {
      await axios.request({
        method: 'post',
        baseURL: this.configService.get<string>('DDHUB_URL'),
        url: 'message',
        data: {
          message: readings,
          topicName: topic,
        },
      });
    } catch (e:any) {
      const errorMessage = {
        statusCode: e.code,
        status: e.response.status,
        message: `Error when sending data to DDHub: ${e.response.data.message}`,
      };

      throw new InternalServerErrorException(errorMessage);
    }
  }
}
