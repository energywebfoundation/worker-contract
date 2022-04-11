import { NestFactory } from '@nestjs/core';
import { OverseerModule } from './overseer.module';

async function bootstrap() {
  const app = await NestFactory.create(OverseerModule);
  await app.listen(3000);
}
bootstrap();
