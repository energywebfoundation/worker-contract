import { Module } from '@nestjs/common';
import { OverseerController } from './example/example.controller';
import { OverseerService } from './overseer.service';
import { OverseerConfig } from './types';

@Module({})
export class OverseerModule {
  public static register(params: OverseerConfig) {
    return {
      module: OverseerModule,
      imports: [],
      controllers: [
        OverseerController,
      ],
      providers: [
        {
          provide: OverseerService,
          useValue: new OverseerService(params.blockchainConfig, params.listeners, params.getLastHandledBlockNumber)},
      ],
    }
  }
}
