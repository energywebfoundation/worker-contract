import { NestFactory } from '@nestjs/core';
import { exampleConfig } from './example/example';
import { OverseerModule } from './overseer.module';

async function bootstrap() {
  const app = await NestFactory.create(OverseerModule.register(exampleConfig));
  await app.listen(3000);
}
bootstrap();
