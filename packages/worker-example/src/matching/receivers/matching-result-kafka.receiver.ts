import type { MatchingResultReceiver } from '../types';
import { Kafka } from 'kafkajs';
import { appConfig } from '../../config/app-config';

export const getMatchingResultKafkaSender = async (): Promise<MatchingResultReceiver> => {
  const kafka = new Kafka({ brokers: [appConfig.messagingConfig.url] });
  const producer = kafka.producer();
  await producer.connect();
  return async (result) => {
    console.log(`Sending result to ddhub results topic: ${result.result.resultHash}`);
    await producer.send({ topic: appConfig.messagingConfig.matchingResultTopicName, messages: [
      {
        value: JSON.stringify(result.result),
      },
    ] });
    console.log(`Result (hash: ${result.result.resultHash}) sent.`);
  };
};
