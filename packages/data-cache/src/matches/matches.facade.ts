import { Injectable } from '@nestjs/common';
import type { MatchingResult } from '../types';
import { LeftoverConsumptionRepository, LeftoverGenerationRepository, MatchRepository } from './repository/types';

@Injectable()
export class MatchesFacade {
  constructor(
    private matchRepository: MatchRepository,
    private leftoverConsumptionRepository: LeftoverConsumptionRepository,
    private leftoverGenerationRepository: LeftoverGenerationRepository,
  ) {}

  public async saveMatchingResult(matchResult: MatchingResult): Promise<void> {
    /** @TODO add transaction */
    await this.matchRepository.save(matchResult.matches);
    await this.leftoverConsumptionRepository.save(matchResult.leftoverConsumption);
    await this.leftoverGenerationRepository.save(matchResult.leftoverGeneration);
  }

  public async getAllResults(): Promise<MatchingResult> {
    return {
      leftoverConsumption: await this.leftoverConsumptionRepository.find(),
      leftoverGeneration: await this.leftoverGenerationRepository.find(),
      matches: await this.matchRepository.find(),
    };
  }
}
