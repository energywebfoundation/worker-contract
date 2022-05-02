import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ClientGatewayModule } from '../src/client-gateway.module';
import { startMockDDHub, stopMockDDHub } from './mocks/ddHub-mock.service';

const apiKey = 'apikey';
process.env.API_KEY = apiKey;
process.env.DDHUB_URL = 'http://localhost:3000';

const readings = [
  {
    deviceId: 'ASDF',
    volume: 100,
    timestamp: '2022-04-28T12:00:00.000Z',
    did: 'did:ethr:0xb9c5714089478a327f09197987f16f9e5d936e8a',
  },
];

describe('ReadingsContoller (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ClientGatewayModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    startMockDDHub();
  });

  afterEach(async () => {
    stopMockDDHub();
  });

  describe('Consumptions', () => {
    const consumptionsAPI = '/readings/consumptions';

    it('should send consumption when provided with api_key', async () => {
      await request(app.getHttpServer()).post('/readings/consumptions').set('api-key', apiKey).send(readings).expect(201);
    });

    it('should return Frobidden(403) when requested without api_key', async () => {
      await request(app.getHttpServer())
        .post(consumptionsAPI)
        .send(readings)
        .expect(403);
    });

    it('should return Frobidden(403) when requested with wrong api_key', async () => {
      await request(app.getHttpServer())
        .post(consumptionsAPI)
        .send(readings)
        .expect(403);
    });
  });

  describe('Generations', () => {
    const generationsAPI = '/readings/generations';

    it('should send consumption when provided with api_key', async () => {
      await request(app.getHttpServer()).post('/readings/consumptions').set('api-key', apiKey).send(readings).expect(201);
    });

    it('should return Frobidden(403) when requested without api_key', async () => {
      await request(app.getHttpServer())
        .post(generationsAPI)
        .send(readings)
        .expect(403);
    });

    it('should return Frobidden(403) when requested with wrong api_key', async () => {
      await request(app.getHttpServer())
        .post(generationsAPI)
        .send(readings)
        .expect(403);
    });
  });
});
