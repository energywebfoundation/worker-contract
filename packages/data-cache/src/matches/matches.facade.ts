import { Injectable } from '@nestjs/common';
import { MatchingResult } from '../types';
import { LeftoverConsumptionRepository, LeftoverGenerationRepository, MatchRepository } from './repository/types';

@Injectable()
export class MatchesFacade {
  constructor(
    private matchRepository: MatchRepository,
    private leftoverConsumptionRepository: LeftoverConsumptionRepository,
    private leftoverGenerationRepository: LeftoverGenerationRepository,
  ) {}

  public async saveMatchingResult(matchResult: MatchingResult): Promise<void> {
    await this.matchRepository.save(matchResult.matches);
    await this.leftoverConsumptionRepository.save(matchResult.leftoverConsumption);
    await this.leftoverGenerationRepository.save(matchResult.leftoverGeneration);
  }
}
