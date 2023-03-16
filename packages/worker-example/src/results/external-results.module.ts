import { Module } from '@nestjs/common';
import { CommunicationService } from '../communication.service';
import { ExternalResultFacade } from './external-results.facade';
import { ExternalResultRepository } from './external-results.repository';
import { ExternalResultInMemorySource } from './results-inmemory.source';
import { ResultSource } from './types';

@Module({
  providers: [
    ExternalResultFacade,
    ExternalResultRepository,
    {
      provide: ResultSource,
      useClass: CommunicationService,
    },
  ],
  exports: [ExternalResultFacade],
})
export class ExternalResultModule {}

@Module({
  providers: [
    ExternalResultFacade,
    ExternalResultRepository,
    {
      provide: ResultSource,
      useClass: ExternalResultInMemorySource,
    },
  ],
  exports: [ExternalResultFacade],
})
export class ExternalResultModuleInMemory {}
