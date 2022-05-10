import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { DataStorageFacade } from './data-storage/dataStorage.facade';
import { DDHubService } from './data-storage/ddhub/DDHub.service';
import { HealtcheckController } from './api/healthcheck.controller';
import { ReadingsController } from './api/reading/reading.controller';
import { config } from 'dotenv';
import { join } from 'path';
import { DataStorageService } from './data-storage/dataStorage.service';

config({ path: join(__dirname, '..', '.env') });

@Module({
  imports: [
    LoggerModule.forRoot(),
  ],
  controllers: [ReadingsController, HealtcheckController],
  providers: [
    DataStorageFacade,
    {
      provide: DataStorageService,
      useClass: DDHubService,
    },
  ],
})
export class ClientGatewayModule {}
