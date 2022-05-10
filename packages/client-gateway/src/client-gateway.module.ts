import { DynamicModule, Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { ConfigModule } from '@nestjs/config'
import * as Joi from 'joi';
import { DataStorageFacade } from './data-storage/dataStorage.facade';
import { DDHubService } from './data-storage/ddhub/DDHub.service';
import { HealtcheckController } from './api/healthcheck.controller';
import { ReadingsController } from './api/reading/reading.controller';
import { config } from 'dotenv';
import { join } from 'path';
import { DataStorageService } from './data-storage/dataStorage.service';
import { ClientGatewayConfiguration } from './main';
import configuration from './configuration/configuration';

config({ path: join(__dirname, '..', '.env') });

@Module({})
export class ClientGatewayModule {
  static register(config?: ClientGatewayConfiguration): DynamicModule {
    return {
      module: ClientGatewayModule,
      imports: [
        LoggerModule.forRoot(),
        ConfigModule.forRoot({
          load: [configuration(config)],
          validationSchema: Joi.object({
            CLIENT_GATEWAY_PORT: Joi.number(),
            API_KEY: Joi.string(),
            DDHUB_URL: Joi.string()
          })
        })
      ],
      controllers: [ReadingsController, HealtcheckController],
      providers: [
        DataStorageFacade,
        {
          provide: DataStorageService,
          useClass: DDHubService,
        },
      ],
    }
  }
}
