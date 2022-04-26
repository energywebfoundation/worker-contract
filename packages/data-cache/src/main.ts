import { NestFactory } from '@nestjs/core';
import { Module, ValidationPipe } from '@nestjs/common';
import { ApiModule } from './api/api.module';

@Module({
  imports: [ApiModule]
})
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe());

  await app.listen(3000);
}

bootstrap();
