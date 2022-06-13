import { NestFactory } from '@nestjs/core';
import { OverseerModule } from './overseer.module';
import { Logger } from 'nestjs-pino';
import type { OverseerConfig } from './types';

export async function start(config: OverseerConfig, port: number) {
  const app = await NestFactory.create(OverseerModule.register(config));
  app.useLogger(app.get(Logger));
  await app.listen(port);
  console.log(`Overseer listening on port ${port}.`);
}

export * from './types';
