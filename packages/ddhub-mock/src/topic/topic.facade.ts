import { Injectable } from '@nestjs/common';
import { TopicService } from './topic.service';

@Injectable()
export class TopicFacade {
  constructor(private topicService: TopicService) {}

  async createTopic({
    clientIds,
    topicName,
  }: {
    topicName: string;
    clientIds: string[];
  }) {
    this.topicService.createTopic({ clientIds, topicName });
  }

  async deleteTopic({ topicName }: { topicName: string }) {
    this.topicService.deleteTopic({ topicName });
  }

  async getTopics() {
    return this.topicService.getTopics();
  }

  async sendMessage({
    message,
    topicName,
  }: {
    message: any;
    topicName: string;
  }) {
    this.topicService.sendMessage({ message, topicName });
  }

  async getMessages({
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

  async ackMessage({
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
