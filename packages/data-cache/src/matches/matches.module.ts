import { Module } from '@nestjs/common';
import { MatchesFacade } from './matches.facade';
import { LeftoverConsumptionInMemoryRepository } from './repository/leftover-consumption-inmemory.repository';
import { LeftoverConsumptionPostgresRepository } from './repository/leftover-consumption-postgres.repository';
import { LeftoverGenerationInMemoryRepository } from './repository/leftover-generation-inmemory.repository';
import { LeftoverGenerationPostgresRepository } from './repository/leftover-generation-postgres.repository';
import { MatchInMemoryRepository } from './repository/match-inmemory.repository';
import { MatchPostgresRepository } from './repository/match-postgres.repository';
import { LeftoverConsumptionRepository, LeftoverGenerationRepository, MatchRepository } from './repository/types';

@Module({
  imports: [],
  exports: [
    MatchesFacade,
  ],
  providers: [
    { provide: MatchRepository, useClass: MatchPostgresRepository },
    { provide: LeftoverGenerationRepository, useClass: LeftoverGenerationPostgresRepository },
    { provide: LeftoverConsumptionRepository, useClass: LeftoverConsumptionPostgresRepository },
    MatchesFacade,
  ],
})
export class MatchesModule {}

@Module({
  imports: [],
  exports: [
    MatchesFacade,
  ],
  providers: [
    { provide: MatchRepository, useClass: MatchInMemoryRepository },
    { provide: LeftoverGenerationRepository, useClass: LeftoverGenerationInMemoryRepository },
    { provide: LeftoverConsumptionRepository, useClass: LeftoverConsumptionInMemoryRepository },
    MatchesFacade,
  ],
})
export class MatchesModuleForUnitTests {}
