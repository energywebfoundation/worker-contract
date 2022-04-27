import { NestFactory } from '@nestjs/core';
import { Module, ValidationPipe } from '@nestjs/common';
import { ApiModule } from './api/api.module';
import { join } from 'path';
import { config } from 'dotenv';
import { SlonikModule } from './database';
import { getConnectionOptions } from './database/database.utils';

config({ path: join(__dirname, '..', '.env') });

@Module({
  imports: [
    ApiModule,
    SlonikModule.forRoot({
      connectionUri: getConnectionOptions().uri,
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
