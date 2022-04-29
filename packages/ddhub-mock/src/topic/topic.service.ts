import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DateTime } from 'luxon';
import { TopicMessage } from './topic.types';

@Injectable()
export class TopicService {
  db: Map<string, Map<string, TopicMessage[]>> = new Map();

  async createTopic({
    clientIds,
    topicName,
  }: {
    topicName: string;
    clientIds: string[];
  }) {
    this.db.set(topicName, new Map());
    const topic = this.db.get(topicName);
    for (const clientId of clientIds) {
      topic.set(clientId, []);
    }
    this.db.set(topicName, topic);
  }

  async deleteTopic({ topicName }: { topicName: string }) {
    this.db.delete(topicName);
  }

  async getTopics() {
    return Array.from(this.db.keys());
  }

  async sendMessage({
    message,
    topicName,
  }: {
    message: TopicMessage;
    topicName: string;
  }) {
    const topic = this.db.get(topicName);
    const createdAt = DateTime.now().setZone('UTC').toISO();
    for (const [client, messages] of topic.entries()) {
      const newMessages = [
        ...messages,
        { ...message, id: randomUUID(), createdAt },
      ];
      topic.set(client, newMessages);
    }
    this.db.set(topicName, topic);
  }

  async getMessages({
    clientID,
    topicName,
    from,
    to,
  }: {
    clientID: string;
    topicName: string;
    to?: string;
    from?: string;
  }) {
    const messages = this.db.get(topicName)?.get(clientID);
    if (!messages) {
      return [];
    }
    if (!from && !to) {
      return messages;
    }
    return messages.filter(({ createdAt }) => {
      const createdDate = DateTime.fromISO(createdAt);
      const fromDate = DateTime.fromISO(from);
      const toDate = DateTime.fromISO(to);

      if (from && !to) {
        return createdDate >= fromDate;
      }
      if (!from && to) {
        return createdDate <= toDate;
      }

      return createdDate >= fromDate && createdDate <= toDate;
    });
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
    const topic = this.db.get(topicName);
    const messages = topic.get(clientId);
    const newMessages = messages.filter((m) => m.id !== messageId);
    topic.set(clientId, newMessages);
    this.db.set(topicName, topic);
  }
}
