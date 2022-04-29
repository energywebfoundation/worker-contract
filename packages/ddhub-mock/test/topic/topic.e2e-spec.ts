import { randomInt, randomUUID } from 'crypto';
import { CreateTopicDTO } from '../../src/api/topic/dto/createTopic.dto';
import { SendMessageDTO } from '../../src/api/topic/dto/sendMessage.dto';
import { GetMessagesDTO } from '../../src/api/topic/dto/getMessages.dto';
import { DateTime } from 'luxon';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import * as request from 'supertest';

const client1 = randomUUID();
const client2 = randomUUID();

const generationTopic = 'generation';
const consumptionTopic = 'consumption';

const topicRequest1: CreateTopicDTO = {
  clientIds: [client1, client2],
  topicName: generationTopic,
};
const topicRequest2: CreateTopicDTO = {
  clientIds: [client1, client2],
  topicName: consumptionTopic,
};
describe('TOPIC', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await Promise.all([
      request(app.getHttpServer()).delete(`/topic/${generationTopic}`),
      request(app.getHttpServer()).delete(`/topic/${consumptionTopic}`),
    ]);
  });

  it('should create and get topics', async () => {
    await Promise.all([
      request(app.getHttpServer())
        .post('/topic')
        .send(topicRequest1)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .expect(201),

      request(app.getHttpServer())
        .post('/topic')
        .send(topicRequest2)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .expect(201),
    ]);
    const {
      body: { topics },
    } = await request(app.getHttpServer())
      .get('/topic')
      .set('Accept', 'application/json')
      .expect(200);

    expect(topics).toContain(generationTopic);
    expect(topics).toContain(consumptionTopic);
  });

  it('should post and read messages', async () => {
    await Promise.all([
      request(app.getHttpServer())
        .post('/topic')
        .send(topicRequest1)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .expect(201),

      request(app.getHttpServer())
        .post('/topic')
        .send(topicRequest2)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .expect(201),
    ]);
    const message = {
      generatorId: randomUUID(),
      volume: randomInt(1000),
    };
    const sendMessageRequest: SendMessageDTO = {
      message,
      topicName: generationTopic,
    };
    await request(app.getHttpServer())
      .post('/message')
      .send(sendMessageRequest)
      .expect(201);
    const getMessagesRequest: GetMessagesDTO = {
      clientID: client1,
      topicName: generationTopic,
      to: DateTime.now().toISO(),
    };
    const {
      body: { messages },
    } = await request(app.getHttpServer())
      .get('/message')
      .query(getMessagesRequest)
      .set('Accept', 'application/json')
      .expect(200);

    expect(messages[0]).toMatchObject(message);
  });
});
