import { NestFactory } from '@nestjs/core';
import { exampleConfig } from './example/example';
import { OverseerModule } from './overseer.module';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(OverseerModule.register(exampleConfig));
  app.useLogger(app.get(Logger));
  await app.listen(3000);
}
bootstrap();
