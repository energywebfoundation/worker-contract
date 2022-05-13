import { NestFactory } from '@nestjs/core';
import { exampleConfig } from './example/example';
import { OverseerModule } from './overseer.module';
import { Logger } from 'nestjs-pino';
import type { OverseerConfig } from './types';

export async function bootstrap(config?: OverseerConfig) {
  const app = await NestFactory.create(OverseerModule.register(config || exampleConfig));
  app.useLogger(app.get(Logger));
  await app.listen(3000);
}
bootstrap();
