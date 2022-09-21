export class TopicNotConfiguredError extends Error {
  constructor(topicName: string) {
    super(`Topic: ${topicName} is not configured within message broker.`);
  }
}
