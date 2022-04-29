import { Injectable } from '@nestjs/common';
import { TopicService } from './topic.service';

@Injectable()
export class TopicFacade {
  constructor(private topicService: TopicService) {}

  createTopic({
    clientIds,
    topicName,
  }: {
    topicName: string;
    clientIds: string[];
  }) {
    this.topicService.createTopic({ clientIds, topicName });
  }

  deleteTopic({ topicName }: { topicName: string }) {
    this.topicService.deleteTopic({ topicName });
  }

  getTopics() {
    return this.topicService.getTopics();
  }

  sendMessage({
    message,
    topicName,
  }: {
    message: any;
    topicName: string;
  }) {
    this.topicService.sendMessage({ message, topicName });
  }

  getMessages({
    clientID,
    topicName,
    from,
    to,
  }: {
    clientID: string;
    topicName: string;
    from?: string;
    to?: string;
  }) {
    return this.topicService.getMessages({ clientID, topicName, to, from });
  }

  ackMessage({
    clientId,
    messageId,
    topicName,
  }: {
    clientId: string;
    messageId: string;
    topicName: string;
  }) {
    this.topicService.ackMessage({ clientId, messageId, topicName });
  }
}
