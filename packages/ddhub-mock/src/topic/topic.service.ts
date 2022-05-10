import type { OnModuleInit } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { readFile } from 'fs/promises';
import { DateTime } from 'luxon';
import { join } from 'path';
import type { MockConfig, TopicMessage } from './topic.types';

@Injectable()
export class TopicService implements OnModuleInit {
  db: Map<string, Map<string, TopicMessage[]>> = new Map();
  logger = new Logger(TopicService.name)

  async onModuleInit() {
    const configFilePath = join(__dirname, '..', '..');
    try {
      const config = await readFile(join(configFilePath, 'mock-config.json'));
      const { topics } = JSON.parse(config.toString()) as MockConfig;
      for (const { name, clientIds } of topics) {
        this.createTopic({ topicName: name, clientIds });
        this.logger.debug(`Added topic: ${name} with clientIds: ${JSON.stringify(clientIds)}`);
      }
    } catch {
      this.logger.warn('No Mock config found');
    }
  }

  createTopic({
    clientIds,
    topicName,
  }: {
    topicName: string;
    clientIds: string[];
  }) {
    this.db.set(topicName, new Map());

    const topic = this.db.get(topicName)!;

    for (const clientId of clientIds) {
      topic.set(clientId, []);
    }

    this.db.set(topicName, topic);
  }

  deleteTopic({ topicName }: { topicName: string }) {
    this.db.delete(topicName);
  }

  getTopics() {
    return Array.from(this.db.keys());
  }

  sendMessage({
    message,
    topicName,
  }: {
    message: TopicMessage;
    topicName: string;
  }) {
    const topic = this.db.get(topicName);

    if (!topic) {
      throw new NotFoundException({ message: 'Topic not found' });
    }

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

  getMessages({
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
      if (!createdAt) {
        return false;
      }

      if (!from && !to) {
        return true;
      }

      const createdDate = DateTime.fromISO(createdAt);

      if (from && !to) {
        return createdDate >= DateTime.fromISO(from);
      }
      if (!from && to) {
        return createdDate <= DateTime.fromISO(to);
      }

      return createdDate >= DateTime.fromISO(from!) && createdDate <= DateTime.fromISO(to!);
    });
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
    const topic = this.db.get(topicName);

    if (!topic) {
      throw new NotFoundException();
    }
    const messages = topic.get(clientId);

    if (!messages) {
      throw new NotFoundException();
    }
    const newMessages = messages.filter((m) => m.id !== messageId);
    topic.set(clientId, newMessages);
    this.db.set(topicName, topic);
  }
}
