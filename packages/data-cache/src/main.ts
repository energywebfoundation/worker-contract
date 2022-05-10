import { NestFactory } from '@nestjs/core';
import type { DynamicModule} from '@nestjs/common';
import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import * as Joi from 'joi';
import { ApiModule } from './api/api.module';
import { config } from 'dotenv';
import { SlonikModule } from './database';
import { getConnectionOptions } from './database/database.utils';
import configuration from './configuration/configuration';

config({ path: join(__dirname, '..', '.env') });

export type DataCacheConfiguration = {
  databaseUrl: string;
  port: number;
}

@Module({})
class AppModule {
  static register(config?: DataCacheConfiguration): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ApiModule,
        SlonikModule.forRoot({
          connectionUri: getConnectionOptions(config).uri,
        }),
        ConfigModule.forRoot({
          load: [configuration(config)],
          validationSchema: Joi.object({
            DATABASE_URL: Joi.string(),
            PORT: Joi.number(),
          }),
        }),
      ],
    };
  }
}

export async function bootstrap(config?: DataCacheConfiguration) {
  const app = await NestFactory.create(AppModule.register(config));

  app.useGlobalPipes(new ValidationPipe());

  await app.listen(3000);
}

bootstrap();
