import { NestFactory } from '@nestjs/core';
import { Module, ValidationPipe } from '@nestjs/common';
import { ApiModule } from './api/api.module';
import { join } from 'path';
import { config } from 'dotenv';
import { SlonikModule } from './database';

config({ path: join(__dirname, '..', '.env') });

@Module({
  imports: [
    ApiModule,
    SlonikModule.forRoot({
      connectionUri: process.env.DATABASE_URL,
    }),
  ],
})
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe());

  await app.listen(3000);
}

bootstrap();
