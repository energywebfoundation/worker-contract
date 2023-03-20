import { Module } from '@nestjs/common';
import { CommunicationService } from '../communication.service';
import { InputInMemorySource } from './input-inmemory.source';
import { InputRepository } from './input-sqlite.repository';
import { InputFacade } from './input.facade';
import { InputSource } from './types';

@Module({
  exports: [InputFacade],
  providers: [
    InputFacade,
    InputRepository,
    {
      provide: InputSource,
      useClass: CommunicationService,
    },
  ],
})
export class InputModule {}

@Module({
  exports: [InputFacade],
  providers: [
    InputFacade,
    InputRepository,
    {
      provide: InputSource,
      useClass: InputInMemorySource,
    },
  ],
})
export class InputInMemoryModule {}
