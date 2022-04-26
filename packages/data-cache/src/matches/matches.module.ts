import { Module } from '@nestjs/common';
import { LeftoverConsumptionRepository, LeftoverGenerationRepository, MatchRepository } from './repository/types';

@Module({
  imports: [],
  exports: [],
  providers: [
    { provide: MatchRepository, useValue: {} },
    { provide: LeftoverGenerationRepository, useValue: {} },
    { provide: LeftoverConsumptionRepository, useValue: {} },
  ]
})
export class MatchesModule {}
