import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { PinoLogger } from 'nestjs-pino';
import type { Preferences, Reading, ReadingQuery } from '../types';

interface ReadingMessage extends Reading {
  id: string;
}

@Injectable()
export class MatchingDataDDHubService {
  private logger = new PinoLogger({renameContext: MatchingDataDDHubService.name});

  constructor() {}

  public async getPreferences(): Promise<Preferences> {
    this.logger.info('Getting matching preferences from DDHub.');

    const { data } = await axios.request({
      method: 'get',
      baseURL: process.env.DDHUB_URL,
      url: 'message',
      params: {
        clientID: process.env.BLOCKCHAIN_ADDRESS,
        topicName: 'preferences',
      },
    });

    this.logger.info(`Matching preferences received: ${data}`);
    return data ? data : { groupPriority: [] };
  }

  public async getConsumptions(query: ReadingQuery): Promise<Reading[]> {
    this.logger.info(`Getting consumptions from DDHub for query: ${JSON.stringify(query)}`);

    const readings = await this.getReadings(query, 'consumption');

    this.logger.info(`Received ${readings.length} consumptions from DDHub`);
    return readings;
  }

  public async getGenerations(query: ReadingQuery): Promise<Reading[]> {
    this.logger.info(`Getting generations from DDHub for query: ${JSON.stringify(query)}`);

    const readings = await this.getReadings(query, 'generation');

    this.logger.info(`Received ${readings.length} generations from DDHub`);
    return readings;
  }

  public async processData(query: ReadingQuery, match: Function) {
    const consumptions = await this.getConsumptionsMessages(query);
    const generations = await this.getGenerationsMessages(query);
    const preferences = await this.getPreferences();

    await match(consumptions, generations, preferences);

    const uniqueConsumptionMessageIds = [...new Set(consumptions.map(reading => reading.id))];
    const uniqueGenerationMessageIds = [...new Set(consumptions.map(reading => reading.id))];

    await this.acknowledge(uniqueConsumptionMessageIds, 'consumption');
    await this.acknowledge(uniqueGenerationMessageIds, 'generation');

  }

  private async getReadings(query: ReadingQuery, topic: 'consumption' | 'generation'): Promise<Reading[]> {
    const { data } = await axios.request({
      method: 'get',
      baseURL: process.env.DDHUB_URL,
      url: 'message',
      params: {
        clientID: process.env.BLOCKCHAIN_ADDRESS,
        topicName: topic,
        // NOTE: disregarding to / from for now
      },
    });
    return data.messages;
  }

  public async getConsumptionsMessages(query: ReadingQuery): Promise<ReadingMessage[]> {
    this.logger.info(`Getting consumptions from DDHub for query: ${JSON.stringify(query)}`);

    const readings = await this.getReadingsMessages(query, 'consumption');

    this.logger.info(`Received ${readings.length} consumptions from DDHub`);
    return readings;
  }

  public async getGenerationsMessages(query: ReadingQuery): Promise<ReadingMessage[]> {
    this.logger.info(`Getting generations from DDHub for query: ${JSON.stringify(query)}`);

    const readings = await this.getReadingsMessages(query, 'generation');

    this.logger.info(`Received ${readings.length} generations from DDHub`);
    return readings;
  }

  private async getReadingsMessages(query: ReadingQuery, topic: 'consumption' | 'generation'): Promise<ReadingMessage[]> {
    const { data } = await axios.request({
      method: 'get',
      baseURL: process.env.DDHUB_URL,
      url: 'message',
      params: {
        clientID: process.env.BLOCKCHAIN_ADDRESS,
        topicName: topic,
        // NOTE: disregarding to / from for now
      },
    });
    return data.messages;
  }

  private async acknowledge(messageIds: string[], topic: string): Promise<void> {
    this.logger.info(`Acknowledging retrieval of following messages to DDHub: ${messageIds}`);

    await Promise.all(messageIds.map(async (messageId) => {
      try {
        await axios.request({
          method: 'post',
          baseURL: process.env.DDHUB_URL,
          url: 'message/ack',
          data: {
            clientId: process.env.BLOCKCHAIN_ADDRESS,
            topicName: topic,
            messageId,
          },
        });
        this.logger.info(`Message acknowledged: ${messageId}`);

      } catch (error: any) {
        this.logger.info(`Error occured when acknowledging message: ${messageId}. Error: ${error}`);
      }
    }));
  }
}