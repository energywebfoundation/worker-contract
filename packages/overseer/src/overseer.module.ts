import { Global, Module } from '@nestjs/common';
import { OverseerService } from './overseer.service';
import type { OverseerConfig } from './types';
import { LoggerModule } from 'nestjs-pino';
import { OverseerController } from './overseer.controller';
import { OverseerFacade } from './overseer.facade';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Global()
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
          useFactory: (eventEmitter: EventEmitter2) => {
            return new OverseerService(params.blockchainConfig, params.getLastHandledBlockNumber, params.saveLastHandledBlockNumber, eventEmitter);
          },
          inject: [EventEmitter2],
        },
        OverseerFacade,
      ],
      exports: [OverseerFacade],
    };
  }
}
