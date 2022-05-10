import { Injectable } from '@nestjs/common';
import { TransactionService } from '../transaction/types';
import type { MatchingResult } from '../types';
import { LeftoverConsumptionRepository, LeftoverGenerationRepository, MatchRepository } from './repository/types';

@Injectable()
export class MatchesFacade {
  constructor(
    private matchRepository: MatchRepository,
    private leftoverConsumptionRepository: LeftoverConsumptionRepository,
    private leftoverGenerationRepository: LeftoverGenerationRepository,
    private transactionService: TransactionService,
  ) {}

  public async saveMatchingResult(matchResult: MatchingResult): Promise<void> {
    await this.transactionService.withTransaction(async tx => {
      await this.matchRepository.save(matchResult.matches, tx);
      await this.leftoverConsumptionRepository.save(matchResult.leftoverConsumption, tx);
      await this.leftoverGenerationRepository.save(matchResult.leftoverGeneration, tx);
    });
  }

  public async getAllResults(): Promise<MatchingResult> {
    return {
      leftoverConsumption: await this.leftoverConsumptionRepository.find(),
      leftoverGeneration: await this.leftoverGenerationRepository.find(),
      matches: await this.matchRepository.find(),
    };
  }
}
