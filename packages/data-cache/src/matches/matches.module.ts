import { Module } from '@nestjs/common';
import { MatchesFacade } from './matches.facade';
import { LeftoverConsumptionRepository, LeftoverGenerationRepository, MatchRepository } from './repository/types';

const fakeRepository = { save: console.log }

@Module({
  imports: [],
  exports: [
    MatchesFacade
  ],
  providers: [
    { provide: MatchRepository, useValue: fakeRepository },
    { provide: LeftoverGenerationRepository, useValue: fakeRepository },
    { provide: LeftoverConsumptionRepository, useValue: fakeRepository },
    MatchesFacade,
  ]
})
export class MatchesModule {}
