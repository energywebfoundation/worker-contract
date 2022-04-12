import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { OverseerModule } from '../src/overseer.module';
import { exampleConfig } from '../src/example/example';

describe('Overseer (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [OverseerModule.register(exampleConfig)],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });


});
