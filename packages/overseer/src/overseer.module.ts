import { Module } from '@nestjs/common';
import { OverseerService } from './overseer.service';
import type { OverseerConfig } from './types';
import { LoggerModule } from 'nestjs-pino';
import { OverseerController } from './overseer.controller';

@Module({})
export class OverseerModule {


  public static register(params: OverseerConfig) {
    return {
      module: OverseerModule,
      imports: [
        LoggerModule.forRoot(),
      ],
      controllers: [OverseerController],
      providers: [
        {
          provide: OverseerService,
          useValue: new OverseerService(params.blockchainConfig, params.listeners, params.getLastHandledBlockNumber, params.saveLastHandledBlockNumber),
        },
      ],
    };
  }
}
