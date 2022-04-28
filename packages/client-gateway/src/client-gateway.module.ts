import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { DDHubFacade } from './ddhub/DDHub.facade';
import { DDHubService } from './ddhub/DDHub.service';
import { HealtcheckController } from './healthcheck.controller';
import { ReadingsController } from './readings/reading.controller';

@Module({
  imports: [
    LoggerModule.forRoot()
  ],
  controllers: [ReadingsController, HealtcheckController],
  providers: [DDHubFacade, DDHubService],
})
export class ClientGatewayModule {}
