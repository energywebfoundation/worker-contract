import { appConfig } from './config/app-config';
import type { OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import type { InputDTO, MatchingResult } from 'types';
import type { InputSource } from './input/types';
import type { ResultSource } from './results/types';
import { map, Observable } from 'rxjs';
import type { Consumer, EachBatchPayload } from 'kafkajs';
import { Kafka } from 'kafkajs';
import { from as toAsyncIterator } from 'ix/asynciterable';

@Injectable()
export class CommunicationService implements InputSource, ResultSource, OnApplicationBootstrap, OnApplicationShutdown {
  private logger = new PinoLogger({ renameContext: CommunicationService.name });
  private inputConsumer: Consumer;
  private resultsConsumer: Consumer;

  constructor() {
    const kafka = new Kafka({
      brokers: [appConfig.messagingConfig.url],
    });
    this.inputConsumer = kafka.consumer({ groupId: appConfig.workerConfig.workerBlockchainAddress + 'input' });
    this.resultsConsumer = kafka.consumer({ groupId: appConfig.workerConfig.workerBlockchainAddress + 'result' });
  }

  async onApplicationBootstrap() {
    await Promise.all([
      this.inputConsumer.connect(),
      this.resultsConsumer.connect(),
    ]);

    await Promise.all([
      this.inputConsumer.subscribe({ topic: appConfig.messagingConfig.inputTopicName, fromBeginning: true }),
      this.resultsConsumer.subscribe({ topic: appConfig.messagingConfig.matchingResultTopicName, fromBeginning: true }),
    ]);
  }

  async onApplicationShutdown() {
    await Promise.all([
      this.inputConsumer.disconnect(),
      this.resultsConsumer.disconnect(),
    ]);
  }

  public async* getInputMessages(): AsyncGenerator<InputDTO[]> {
    const inputStream = await this.createKafkaStream<InputDTO>(this.inputConsumer);
    for await (const inputs of toAsyncIterator(inputStream)) {
      this.logger.info(`[INPUT] Received ${inputs.length} messages.`);
      yield inputs;
    }
  }

  public async* getNewResults(): AsyncGenerator<MatchingResult[]> {
    const resultsStream = await this.createKafkaStream<MatchingResult>(this.resultsConsumer);
    for await (const results of toAsyncIterator(resultsStream)) {
      this.logger.info(`[RESULT] Received ${results.length} messages.`);
      yield results;
    }
  }

  private async createKafkaStream<T>(consumer: Consumer) {
    const batches$ = new Observable<EachBatchPayload>((subscriber) => {
      consumer.run({
        eachBatchAutoResolve: true,
        eachBatch: async (batch) => {
          subscriber.next(batch);
          if (subscriber.closed) {
            await consumer.disconnect();
          }
        },
      });
      return async () => {
        await consumer.disconnect();
      };
    });
    const messageStream = batches$.pipe(
      map(({ batch: { messages } }) =>
        messages.reduce((acc, msg) => {
          const msgContent = msg.value?.toString();
          if (!msgContent) return acc;
          try {
            const parsed = JSON.parse(msgContent) as T;
            acc.push(parsed);
          } catch {}
          return acc;
        }, [] as T[]),
      ),
    );
    return messageStream;
  }
}
