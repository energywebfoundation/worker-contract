import { Module } from '@nestjs/common';
import { OverseerController } from './example/example.controller';
import { OverseerService } from './overseer.service';
import type { OverseerConfig } from './types';
import { LoggerModule } from 'nestjs-pino';

@Module({})
export class OverseerModule {


  public static register(params: OverseerConfig) {
    return {
      module: OverseerModule,
      imports: [
        LoggerModule.forRoot(),
      ],
      controllers: [
        OverseerController,
      ],
      providers: [
        {
          provide: OverseerService,
          useValue: new OverseerService(params.blockchainConfig, params.listeners, params.getLastHandledBlockNumber),
        },
      ],
    };
  }
}
