import { randomUUID } from 'crypto';
import type { FileUploadDTO } from '../../src/api/file/dto/fileUpload.dto';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import type { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

describe('FILE', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('should upload file', async () => {
    const fileName = randomUUID();

    const result = {
      name: 'jade',
      generatorId: randomUUID(),
    };

    const fileRequest: FileUploadDTO = {
      file: result,
      fileName,
    };

    await request(app.getHttpServer())
      .post('/file')
      .send(fileRequest)
      .set('Content-Type', 'application/json')
      .expect(201);

    const {
      body: { file },
    } = await request(app.getHttpServer())
      .get(`/file/${fileName}`)
      .set('Accept', 'application/json')
      .expect(200);

    expect(file).toEqual(result);
  });
});
