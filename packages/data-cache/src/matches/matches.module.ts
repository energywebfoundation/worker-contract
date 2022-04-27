import { Module } from '@nestjs/common';
import { MatchesFacade } from './matches.facade';
import { LeftoverConsumptionPostgresRepository } from './repository/leftover-consumption-postgres.repository';
import { LeftoverGenerationPostgresRepository } from './repository/leftover-generation-postgres.repository';
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
